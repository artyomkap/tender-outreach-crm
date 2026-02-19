const http = require('http');
const net = require('net');
const dns = require('dns');
const { Client } = require('ssh2');

const PORT = process.env.PORT || 3999;

// Test target — hardcoded for diagnostics, remove after testing
const TARGET = {
  host: '178.250.158.71',
  port: 22,
  username: 'root',
  password: '62X!c@e3kv8QAsk',
};

function timestamp() {
  return new Date().toISOString();
}

// Step 1: DNS resolution
function diagDns(host) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const log = [];
    log.push(`[${timestamp()}] DNS: resolving ${host}...`);

    // If it's already an IP, skip
    if (net.isIP(host)) {
      log.push(`[${timestamp()}] DNS: ${host} is already an IP address, skipping DNS`);
      resolve({ ok: true, ip: host, ms: 0, log });
      return;
    }

    dns.resolve4(host, (err, addresses) => {
      const ms = Date.now() - t0;
      if (err) {
        log.push(`[${timestamp()}] DNS FAILED (${ms}ms): ${err.code} — ${err.message}`);
        resolve({ ok: false, error: err.message, ms, log });
      } else {
        log.push(`[${timestamp()}] DNS OK (${ms}ms): ${addresses.join(', ')}`);
        resolve({ ok: true, ip: addresses[0], ms, log });
      }
    });
  });
}

// Step 2: Raw TCP connection
function diagTcp(host, port, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const log = [];
    log.push(`[${timestamp()}] TCP: connecting to ${host}:${port} (timeout ${timeoutMs}ms)...`);

    const socket = new net.Socket();
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const ms = Date.now() - t0;
      log.push(`[${timestamp()}] TCP CONNECTED (${ms}ms)`);

      // Try to read the SSH banner
      socket.once('data', (data) => {
        const banner = data.toString().trim();
        log.push(`[${timestamp()}] TCP: received banner: "${banner}"`);
        finish({ ok: true, ms, banner, log });
      });

      // If no data within 3s, still OK
      setTimeout(() => {
        log.push(`[${timestamp()}] TCP: no banner received within 3s`);
        finish({ ok: true, ms, banner: null, log });
      }, 3000);
    });

    socket.on('timeout', () => {
      const ms = Date.now() - t0;
      log.push(`[${timestamp()}] TCP TIMEOUT (${ms}ms) — firewall likely dropping packets`);
      finish({ ok: false, error: 'timeout', ms, log });
    });

    socket.on('error', (err) => {
      const ms = Date.now() - t0;
      log.push(`[${timestamp()}] TCP ERROR (${ms}ms): ${err.code} — ${err.message}`);
      finish({ ok: false, error: err.message, ms, log });
    });

    socket.connect(port, host);
  });
}

// Step 3: SSH handshake + auth via ssh2
function diagSsh(config, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const log = [];
    const conn = new Client();

    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try { conn.end(); } catch (_) {}
      resolve(result);
    };

    const timer = setTimeout(() => {
      log.push(`[${timestamp()}] SSH: overall timeout (${timeoutMs}ms) reached`);
      finish({ ok: false, error: 'overall timeout', ms: Date.now() - t0, log });
    }, timeoutMs);

    log.push(`[${timestamp()}] SSH: starting connection to ${config.host}:${config.port} as ${config.username}`);
    log.push(`[${timestamp()}] SSH: auth method: password`);
    log.push(`[${timestamp()}] SSH: readyTimeout: ${config.readyTimeout}ms`);

    conn.on('handshake', (info) => {
      const ms = Date.now() - t0;
      log.push(`[${timestamp()}] SSH HANDSHAKE OK (${ms}ms)`);
      log.push(`[${timestamp()}] SSH: kex: ${info.kex}`);
      log.push(`[${timestamp()}] SSH: serverHostKey: ${info.serverHostKey}`);
      log.push(`[${timestamp()}] SSH: cs cipher: ${info.cs?.cipher}`);
      log.push(`[${timestamp()}] SSH: sc cipher: ${info.sc?.cipher}`);
    });

    conn.on('ready', () => {
      const ms = Date.now() - t0;
      log.push(`[${timestamp()}] SSH READY — fully authenticated (${ms}ms)`);

      // Run a quick command to prove it works
      conn.exec('echo "hello from $(hostname)" && uname -a', (err, stream) => {
        if (err) {
          log.push(`[${timestamp()}] SSH exec error: ${err.message}`);
          clearTimeout(timer);
          finish({ ok: true, authenticated: true, ms, execError: err.message, log });
          return;
        }
        let stdout = '';
        stream.on('data', (d) => { stdout += d.toString(); });
        stream.on('close', () => {
          log.push(`[${timestamp()}] SSH exec output: ${stdout.trim()}`);
          clearTimeout(timer);
          finish({ ok: true, authenticated: true, ms, exec: stdout.trim(), log });
        });
      });
    });

    conn.on('error', (err) => {
      const ms = Date.now() - t0;
      log.push(`[${timestamp()}] SSH ERROR (${ms}ms): ${err.message}`);
      if (err.level) log.push(`[${timestamp()}] SSH error level: ${err.level}`);
      clearTimeout(timer);
      finish({ ok: false, error: err.message, level: err.level, ms, log });
    });

    conn.on('close', () => {
      log.push(`[${timestamp()}] SSH: connection closed`);
    });

    conn.on('keyboard-interactive', (name, instructions, lang, prompts, finishAuth) => {
      log.push(`[${timestamp()}] SSH: keyboard-interactive requested (name: "${name}")`);
      // Try sending password
      finishAuth([config.password]);
    });

    // Enable debug logging
    conn.on('tcp connection', () => {
      log.push(`[${timestamp()}] SSH: underlying TCP connected`);
    });

    try {
      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 10000,
        // Try all auth methods
        tryKeyboard: true,
        // Debug callback for detailed protocol logging
        debug: (msg) => {
          // Only log interesting messages (filter out noise)
          if (msg.includes('handshake') ||
              msg.includes('Handshake') ||
              msg.includes('AUTH') ||
              msg.includes('auth') ||
              msg.includes('KEX') ||
              msg.includes('kex') ||
              msg.includes('error') ||
              msg.includes('Error') ||
              msg.includes('banner') ||
              msg.includes('Banner') ||
              msg.includes('connect') ||
              msg.includes('Connect') ||
              msg.includes('cipher') ||
              msg.includes('timeout') ||
              msg.includes('Timeout') ||
              msg.includes('Algorithm')) {
            log.push(`[${timestamp()}] SSH debug: ${msg}`);
          }
        },
      });
    } catch (err) {
      log.push(`[${timestamp()}] SSH connect() threw: ${err.message}`);
      clearTimeout(timer);
      finish({ ok: false, error: err.message, ms: Date.now() - t0, log });
    }
  });
}

// Full diagnostic run
async function runDiagnostics() {
  const allLogs = [];
  const results = {};

  allLogs.push(`========== SSH DIAGNOSTICS ==========`);
  allLogs.push(`Target: ${TARGET.host}:${TARGET.port}`);
  allLogs.push(`User: ${TARGET.username}`);
  allLogs.push(`Started: ${timestamp()}`);
  allLogs.push(`Node: ${process.version}`);
  allLogs.push(`Platform: ${process.platform} ${process.arch}`);
  allLogs.push(``);

  // 1. DNS
  allLogs.push(`--- Step 1: DNS Resolution ---`);
  const dnsResult = await diagDns(TARGET.host);
  results.dns = { ok: dnsResult.ok, ms: dnsResult.ms, ip: dnsResult.ip, error: dnsResult.error };
  allLogs.push(...dnsResult.log);
  allLogs.push(``);

  // 2. TCP
  allLogs.push(`--- Step 2: TCP Connection ---`);
  const tcpResult = await diagTcp(TARGET.host, TARGET.port);
  results.tcp = { ok: tcpResult.ok, ms: tcpResult.ms, banner: tcpResult.banner, error: tcpResult.error };
  allLogs.push(...tcpResult.log);
  allLogs.push(``);

  if (!tcpResult.ok) {
    allLogs.push(`--- STOPPING: TCP failed, SSH won't work ---`);
    allLogs.push(`Diagnosis: The TCP connection to ${TARGET.host}:${TARGET.port} failed.`);
    allLogs.push(`This means the server is unreachable from this network (Railway).`);
    allLogs.push(`Possible causes:`);
    allLogs.push(`  1. Firewall on the VPS is blocking Railway's IP`);
    allLogs.push(`  2. Port 22 is not open`);
    allLogs.push(`  3. The VPS is down`);
    allLogs.push(`  4. Railway's outbound network can't reach this IP`);
    return { results, log: allLogs.join('\n') };
  }

  // 3. SSH
  allLogs.push(`--- Step 3: SSH Handshake + Auth ---`);
  const sshResult = await diagSsh(TARGET);
  results.ssh = {
    ok: sshResult.ok,
    authenticated: sshResult.authenticated,
    ms: sshResult.ms,
    exec: sshResult.exec,
    error: sshResult.error,
    level: sshResult.level,
  };
  allLogs.push(...sshResult.log);
  allLogs.push(``);

  // Summary
  allLogs.push(`--- Summary ---`);
  allLogs.push(`DNS: ${dnsResult.ok ? 'OK' : 'FAILED'} (${dnsResult.ms}ms)`);
  allLogs.push(`TCP: ${tcpResult.ok ? 'OK' : 'FAILED'} (${tcpResult.ms}ms)${tcpResult.banner ? ` banner: "${tcpResult.banner}"` : ''}`);
  allLogs.push(`SSH: ${sshResult.ok ? 'OK' : 'FAILED'} (${sshResult.ms}ms)${sshResult.authenticated ? ' — authenticated' : ''}`);
  if (sshResult.exec) allLogs.push(`Exec: ${sshResult.exec}`);
  if (sshResult.error) allLogs.push(`Error: ${sshResult.error}`);

  return { results, log: allLogs.join('\n') };
}

// HTTP server
const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/diag') {
    console.log(`[${timestamp()}] Running diagnostics...`);
    try {
      const { results, log } = await runDiagnostics();
      console.log(log);

      // Return as plain text for easy reading in browser
      const wantJson = (req.headers.accept || '').includes('application/json');
      if (wantJson) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results, log }, null, 2));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(log);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Diagnostic error: ${err.message}\n${err.stack}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('SSH Diagnostics — open / or /diag to run');
  }
});

server.listen(PORT, () => {
  console.log(`SSH diagnostics server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}/ to run diagnostics`);
});
