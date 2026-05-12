import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { EmailMessage } from './entities/email-message.entity';
import { OutreachEmailAccount } from '../outreach/entities/email-account.entity';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

interface SmtpSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  emailFrom?: string;
  smtpRelayUrl?: string;
}

interface ImapSettings {
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  imapSecure?: boolean;
}

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly emailStreams = new Map<string, Subject<{ from: string; subject: string }>>();

  constructor(
    @InjectRepository(EmailMessage)
    private readonly emailMessageRepository: Repository<EmailMessage>,
    @InjectRepository(OutreachEmailAccount)
    private readonly emailAccountRepository: Repository<OutreachEmailAccount>,
  ) {}

  getOrCreateStream(userId: string) {
    if (!this.emailStreams.has(userId)) {
      this.emailStreams.set(userId, new Subject());
    }
    return this.emailStreams.get(userId)!;
  }

  // --- Send email via SMTP (direct or relay) ---

  async sendEmail(
    userId: string,
    settings: SmtpSettings,
    to: string,
    subject: string,
    body: string,
    purchaseId?: string,
    inReplyTo?: string,
  ): Promise<EmailMessage> {
    const { smtpHost, smtpUser, smtpPass, smtpRelayUrl } = settings;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new BadRequestException(
        'Настройте SMTP в профиле (host, user, password)',
      );
    }

    // Choose path: relay URL or direct SMTP
    const messageId = smtpRelayUrl
      ? await this.sendViaRelay(settings, to, subject, body, inReplyTo)
      : await this.sendDirectSmtp(settings, to, subject, body, inReplyTo);

    const message = this.emailMessageRepository.create({
      userId,
      direction: 'sent',
      contactEmail: to.toLowerCase(),
      subject,
      bodyText: body,
      messageId: messageId || null,
      inReplyTo: inReplyTo || null,
      purchaseId: purchaseId || null,
      isRead: true,
      emailDate: new Date(),
    });

    return this.emailMessageRepository.save(message);
  }

  // --- Direct SMTP sending with port fallback ---

  private async sendDirectSmtp(
    settings: SmtpSettings,
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string,
  ): Promise<string | null> {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom } =
      settings;

    // Resolve hostname to IPv4 (Railway has no IPv6)
    let resolvedHost = smtpHost!;
    try {
      const { address } = await dns.promises.lookup(smtpHost!, { family: 4 });
      resolvedHost = address;
      this.logger.log(`SMTP resolved ${smtpHost} -> ${address}`);
    } catch {
      this.logger.warn(`SMTP DNS resolve failed for ${smtpHost}, using as-is`);
    }

    const from = emailFrom || smtpUser;
    const mailOptions = {
      from,
      to,
      subject,
      text: body,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    };

    // Build list of port/secure combos to try
    const primaryPort = smtpPort || (smtpSecure ? 465 : 587);
    const primarySecure = smtpSecure ?? (primaryPort === 465);
    const attempts: Array<{ port: number; secure: boolean }> = [
      { port: primaryPort, secure: primarySecure },
    ];
    if (primaryPort === 587) attempts.push({ port: 465, secure: true });
    else if (primaryPort === 465) attempts.push({ port: 587, secure: false });
    if (primaryPort !== 25) attempts.push({ port: 25, secure: false });

    let lastError: any;
    for (const { port, secure } of attempts) {
      this.logger.log(`SMTP trying ${resolvedHost}:${port} secure=${secure}`);
      const transporter = nodemailer.createTransport({
        host: resolvedHost,
        port,
        secure,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false, servername: smtpHost },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      try {
        const info = await transporter.sendMail(mailOptions);
        this.logger.log(`SMTP sent via port ${port}, messageId=${info.messageId}`);
        return info.messageId || null;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`SMTP port ${port} failed: ${error.message}`);
      }
    }

    this.logger.error(`SMTP all attempts failed for ${smtpHost}`);
    throw new BadRequestException(`Ошибка отправки: ${lastError?.message}`);
  }

  // --- Send via external relay (PHP script on VPS) ---

  private async sendViaRelay(
    settings: SmtpSettings,
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string,
  ): Promise<string | null> {
    const { smtpRelayUrl, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom } =
      settings;

    this.logger.log(`Sending via relay: ${smtpRelayUrl}`);

    const payload = {
      smtpHost,
      smtpPort: smtpPort || (smtpSecure ? 465 : 587),
      smtpUser,
      smtpPass,
      smtpSecure: !!smtpSecure,
      emailFrom: emailFrom || smtpUser,
      to,
      subject,
      body,
      ...(inReplyTo ? { inReplyTo } : {}),
    };

    try {
      const response = await fetch(smtpRelayUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Relay-Secret': process.env.SMTP_RELAY_SECRET || '',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const errMsg = result.error || `Relay returned ${response.status}`;
        this.logger.error(`Relay error: ${errMsg}`);
        throw new BadRequestException(`Ошибка relay: ${errMsg}`);
      }

      this.logger.log(`Relay sent, messageId=${result.messageId}`);
      return result.messageId || null;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Relay request failed: ${error.message}`);
      throw new BadRequestException(`Relay недоступен: ${error.message}`);
    }
  }

  // --- Fetch inbox via IMAP (using simple fetch approach) ---

  async fetchInbox(
    userId: string,
    settings: ImapSettings & SmtpSettings,
    accountId?: string,
  ): Promise<{ fetched: number }> {
    let imapHost = settings.imapHost;
    let imapPort = settings.imapPort;
    let imapUser = settings.imapUser;
    let imapPass = settings.imapPass;
    let imapSecure = settings.imapSecure;

    if (accountId) {
      const account = await this.emailAccountRepository.findOne({
        where: { id: accountId, userId },
      });
      if (!account) throw new BadRequestException('Аккаунт не найден');
      imapHost = account.imapHost ?? imapHost;
      imapPort = account.imapPort ?? imapPort;
      imapUser = account.imapUser ?? imapUser;
      imapPass = account.imapPass ?? imapPass;
    }

    if (!imapHost || !imapUser || !imapPass) {
      throw new BadRequestException(
        'Настройте IMAP в профиле (host, user, password)',
      );
    }

    // Use nodemailer's built-in IMAP support is not available,
    // so we use a simple fetch-based approach with the IMAP protocol
    // For now, use a basic TCP connection approach
    const { ImapFlow } = await this.loadImapFlow();
    const simpleParser = await this.loadSimpleParser();

    const client = new ImapFlow({
      host: imapHost!,
      port: imapPort || (imapSecure ? 993 : 143),
      secure: imapSecure ?? true,
      auth: { user: imapUser!, pass: imapPass! },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    let fetched = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Get last 50 messages
        const totalMessages = client.mailbox?.exists || 0;
        if (totalMessages === 0) return { fetched: 0 };

        const startSeq = Math.max(1, totalMessages - 49);

        for await (const msg of client.fetch(`${startSeq}:*`, {
          envelope: true,
          source: true,
        })) {
          const envelope = msg.envelope;
          if (!envelope) continue;

          const messageId = envelope.messageId || null;

          // Check if already stored
          if (messageId) {
            const existing = await this.emailMessageRepository.findOne({
              where: { userId, messageId },
            });
            if (existing) {
              let needsSave = false;
              // Backfill emailDate for old records
              if (!existing.emailDate) {
                existing.emailDate = envelope.date || new Date();
                needsSave = true;
              }
              // Re-parse old messages that have no bodyHtml
              if (existing.bodyHtml === null && msg.source) {
                try {
                  const parsed = await simpleParser(msg.source);
                  existing.bodyText = parsed.text || existing.bodyText;
                  existing.bodyHtml = parsed.html || null;
                  if (!existing.emailDate && parsed.date) existing.emailDate = parsed.date;
                  needsSave = true;
                } catch {
                  // ignore re-parse errors
                }
              }
              if (needsSave) await this.emailMessageRepository.save(existing);
              continue;
            }
          }

          const fromAddr =
            envelope.from?.[0]?.address?.toLowerCase() || 'unknown';
          const subject = envelope.subject || '';

          // Parse the full MIME source to extract text and HTML bodies
          let bodyText = '';
          let bodyHtml: string | null = null;
          let emailDate: Date = envelope.date || new Date();

          if (msg.source) {
            try {
              const parsed = await simpleParser(msg.source);
              bodyText = parsed.text || '';
              bodyHtml = parsed.html || null;
              if (parsed.date) emailDate = parsed.date;
            } catch (parseErr: any) {
              this.logger.warn(`Failed to parse email MIME: ${parseErr.message}`);
              bodyText = msg.source.toString('utf-8');
            }
          }

          const emailMsg = this.emailMessageRepository.create({
            userId,
            direction: 'received',
            contactEmail: fromAddr,
            subject,
            bodyText,
            bodyHtml,
            messageId,
            inReplyTo: envelope.inReplyTo || null,
            isRead: false,
            emailDate,
            accountId: accountId || null,
          });

          await this.emailMessageRepository.save(emailMsg);
          fetched++;

          const stream = this.emailStreams.get(userId);
          if (stream) stream.next({ from: fromAddr, subject });
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error: any) {
      this.logger.error(`IMAP fetch failed: ${error.message}`);
      throw new BadRequestException(`Ошибка получения почты: ${error.message}`);
    }

    return { fetched };
  }

  private async loadImapFlow(): Promise<any> {
    try {
      return await import('imapflow');
    } catch {
      throw new BadRequestException(
        'IMAP модуль не установлен. Установите: npm install imapflow',
      );
    }
  }

  private async loadSimpleParser(): Promise<(source: any) => Promise<any>> {
    try {
      const { simpleParser } = await import('mailparser');
      return simpleParser;
    } catch {
      throw new BadRequestException(
        'mailparser модуль не установлен. Установите: npm install mailparser',
      );
    }
  }

  // --- Get threads (conversations grouped by contact_email) ---

  async getThreads(
    userId: string,
    page: number = 1,
    limit: number = 20,
    accountId?: string,
  ): Promise<{ data: any[]; total: number }> {
    // Get unique contact emails with latest message info
    const qb = this.emailMessageRepository
      .createQueryBuilder('m')
      .select('m.contact_email', 'contactEmail')
      .addSelect('COUNT(*)', 'messageCount')
      .addSelect('MAX(COALESCE(m.email_date, m.created_at))', 'lastMessageAt')
      .addSelect(
        'SUM(CASE WHEN m.direction = \'received\' AND m.is_read = false THEN 1 ELSE 0 END)',
        'unreadCount',
      )
      .where('m.user_id = :userId', { userId });

    if (accountId) qb.andWhere('m.account_id = :accountId', { accountId });

    const raw = await qb
      .groupBy('m.contact_email')
      .orderBy('MAX(COALESCE(m.email_date, m.created_at))', 'DESC')
      .getRawMany();

    const total = raw.length;
    const skip = (page - 1) * limit;
    const paged = raw.slice(skip, skip + limit);

    // Enrich with latest message preview
    const threads = [];
    for (const row of paged) {
      const msgQb = this.emailMessageRepository
        .createQueryBuilder('m')
        .where('m.user_id = :userId AND m.contact_email = :email', { userId, email: row.contactEmail });
      if (accountId) msgQb.andWhere('m.account_id = :accountId', { accountId });
      const lastMsg = await msgQb.orderBy('COALESCE(m.email_date, m.created_at)', 'DESC').getOne();

      threads.push({
        contactEmail: row.contactEmail,
        messageCount: parseInt(row.messageCount, 10),
        unreadCount: parseInt(row.unreadCount, 10),
        lastMessageAt: row.lastMessageAt,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              direction: lastMsg.direction,
              subject: lastMsg.subject,
              preview: lastMsg.bodyText.substring(0, 120),
            }
          : null,
      });
    }

    return { data: threads, total };
  }

  // --- Get messages for a specific thread ---

  async getThread(
    userId: string,
    contactEmail: string,
    accountId?: string,
  ): Promise<EmailMessage[]> {
    const where: any = { userId, contactEmail, direction: 'received', isRead: false };
    if (accountId) where.accountId = accountId;
    await this.emailMessageRepository.update(where, { isRead: true });

    const findWhere: any = { userId, contactEmail };
    if (accountId) findWhere.accountId = accountId;
    return this.emailMessageRepository.find({
      where: findWhere,
      order: { emailDate: 'ASC', createdAt: 'ASC' },
    });
  }
}
