'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { TouchApiInfo, TouchApiClient } from '@/types';
import QRCode from 'qrcode';
import {
  Smartphone,
  Plus,
  Power,
  PowerOff,
  Loader2,
  RefreshCw,
  QrCode,
  X,
  AlertCircle,
  Trash2,
  RotateCcw,
  Monitor,
  Pencil,
  Check,
} from 'lucide-react';

const NAMES_KEY = 'instance-names';

function loadNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NAMES_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveName(login: string, name: string) {
  const names = loadNames();
  if (name.trim()) {
    names[login] = name.trim();
  } else {
    delete names[login];
  }
  localStorage.setItem(NAMES_KEY, JSON.stringify(names));
}

const SOURCES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'sms', label: 'SMS' },
  { value: 'telegram-bot', label: 'TG Bot' },
  { value: 'viber-bot', label: 'Viber Bot' },
  { value: 'vk', label: 'VK' },
  { value: 'max', label: 'MAX' },
];

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  telegram: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sms: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'telegram-bot': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'viber-bot': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  vk: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  max: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

interface ClientWithSource extends TouchApiClient {
  source: string;
}

async function extractQrUrl(data: any): Promise<string | null> {
  // Direct QR image (base64 or URL)
  const qr = data?.qr;
  if (qr && typeof qr === 'string') {
    if (qr.startsWith('http') || qr.startsWith('data:')) return qr;
    return `data:image/png;base64,${qr}`;
  }
  // Value string (e.g. WhatsApp) — generate QR code image from text
  const value = data?.value;
  if (value && typeof value === 'string') {
    try {
      return await QRCode.toDataURL(value, { width: 400, margin: 2 });
    } catch {
      return null;
    }
  }
  return null;
}

function formatAddedTime(addedTime: number | string | null | undefined): string {
  if (!addedTime) return '—';
  let ts = typeof addedTime === 'string' ? parseInt(addedTime, 10) : addedTime;
  if (isNaN(ts)) return '—';
  // If timestamp looks like seconds (< year ~2001 in ms), convert to ms
  if (ts > 0 && ts < 1e12) ts *= 1000;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}

export default function InstancesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [allClients, setAllClients] = useState<ClientWithSource[]>([]);
  const [summaries, setSummaries] = useState<Record<string, TouchApiInfo['summary']>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add instance
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSource, setAddSource] = useState('whatsapp');
  const [adding, setAdding] = useState(false);

  // Operations
  const [togglingLogin, setTogglingLogin] = useState<string | null>(null);
  const [deletingLogin, setDeletingLogin] = useState<string | null>(null);
  const [resettingLogin, setResettingLogin] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Instance names (localStorage)
  const [names, setNames] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setNames(loadNames());
  }, []);

  const handleSaveName = useCallback((login: string) => {
    saveName(login, editValue);
    setNames(loadNames());
    setEditingName(null);
  }, [editValue]);

  // Image modal (QR or screenshot)
  const [imageModal, setImageModal] = useState<{
    login: string;
    source: string;
    title: string;
    url: string | null;
    loading: boolean;
  } | null>(null);

  const hasToken = !!user?.settings?.touchApiToken;

  // Fetch a single source and update state
  const fetchSource = useCallback(
    async (src: string) => {
      try {
        const data = await api.get<TouchApiInfo>(
          `/touch-api/info?source=${encodeURIComponent(src)}`,
        );
        if (data.status === 'ok') {
          setAllClients((prev) => [
            ...prev.filter((c) => c.source !== src),
            ...data.clients.map((c) => ({ ...c, source: src })),
          ]);
          setSummaries((prev) => ({ ...prev, [src]: data.summary }));
        }
      } catch {
        // individual source failure is non-fatal
      }
    },
    [],
  );

  // Fetch all sources in parallel
  const fetchAll = useCallback(async () => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled(
        SOURCES.map((s) =>
          api.get<TouchApiInfo>(`/touch-api/info?source=${encodeURIComponent(s.value)}`),
        ),
      );

      const clients: ClientWithSource[] = [];
      const sums: Record<string, TouchApiInfo['summary']> = {};

      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.status === 'ok') {
          const src = SOURCES[i].value;
          sums[src] = result.value.summary;
          result.value.clients.forEach((c) => {
            clients.push({ ...c, source: src });
          });
        }
      });

      setAllClients(clients);
      setSummaries(sums);

      if (clients.length === 0 && results.every((r) => r.status === 'rejected')) {
        setError('Ошибка загрузки данных от TouchAPI');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [hasToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filtered clients based on active tab
  const filteredClients = useMemo(
    () =>
      activeTab === 'all'
        ? allClients
        : allClients.filter((c) => c.source === activeTab),
    [allClients, activeTab],
  );

  // Count per source for tab badges
  const countBySource = useMemo(() => {
    const counts: Record<string, number> = {};
    allClients.forEach((c) => {
      counts[c.source] = (counts[c.source] || 0) + 1;
    });
    return counts;
  }, [allClients]);

  // Summary for current view
  const currentSummary = useMemo(() => {
    if (activeTab !== 'all') return summaries[activeTab] || null;
    // Aggregate
    let active = 0;
    let count = 0;
    let hasPayment = false;
    let balance = 0;
    Object.values(summaries).forEach((s) => {
      active += s.active ?? 0;
      count += s.count ?? 0;
      if (s.payment != null) {
        hasPayment = true;
        balance += s.payment.balance;
      }
    });
    return { active, count, payment: hasPayment ? { mode: '', balance } : undefined };
  }, [summaries, activeTab]);

  // --- Add Instance ---
  const handleAdd = useCallback(async () => {
    if (adding) return;
    setAdding(true);
    try {
      const login = crypto.randomUUID();
      const res = await api.post<{ status: string }>('/touch-api/add-account', {
        login,
        source: addSource,
      });
      if (res.status === 'ok') {
        setAddModalOpen(false);
        await fetchSource(addSource);
      } else {
        alert('Ошибка создания инстанса');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка создания инстанса');
    } finally {
      setAdding(false);
    }
  }, [adding, addSource, fetchSource]);

  // --- Toggle State (on/off) ---
  const handleToggleState = useCallback(
    async (client: ClientWithSource) => {
      if (togglingLogin) return;
      const newState = !client.state;
      setTogglingLogin(client.login);
      try {
        await api.post('/touch-api/set-state', {
          login: client.login,
          state: newState,
          source: client.source,
        });

        if (newState) {
          // After starting, wait then fetch QR
          await new Promise((r) => setTimeout(r, 3000));
          setImageModal({ login: client.login, source: client.source, title: 'QR-код', url: null, loading: true });
          try {
            const data = await api.post<any>('/touch-api/get-qr', {
              login: client.login,
              source: client.source,
            });
            const qrUrl = await extractQrUrl(data);
            setImageModal({ login: client.login, source: client.source, title: 'QR-код', url: qrUrl, loading: false });
          } catch {
            setImageModal({ login: client.login, source: client.source, title: 'QR-код', url: null, loading: false });
          }
        }

        await fetchSource(client.source);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Ошибка');
      } finally {
        setTogglingLogin(null);
      }
    },
    [togglingLogin, fetchSource],
  );

  // --- Get QR ---
  const handleShowQr = useCallback(
    async (login: string, clientSource: string) => {
      setImageModal({ login, source: clientSource, title: 'QR-код', url: null, loading: true });
      try {
        const data = await api.post<any>('/touch-api/get-qr', { login, source: clientSource });
        const qrUrl = await extractQrUrl(data);
        setImageModal({ login, source: clientSource, title: 'QR-код', url: qrUrl, loading: false });
      } catch {
        setImageModal({ login, source: clientSource, title: 'QR-код', url: null, loading: false });
      }
    },
    [],
  );

  // --- Screenshot ---
  const handleShowScreenshot = useCallback(
    async (login: string, clientSource: string) => {
      setImageModal({ login, source: clientSource, title: 'Скриншот', url: null, loading: true });
      try {
        const data = await api.get<{ url: string }>(
          `/touch-api/screenshot?login=${encodeURIComponent(login)}&source=${encodeURIComponent(clientSource)}`,
        );
        setImageModal({ login, source: clientSource, title: 'Скриншот', url: data.url, loading: false });
      } catch {
        setImageModal({ login, source: clientSource, title: 'Скриншот', url: null, loading: false });
      }
    },
    [],
  );

  // --- Delete ---
  const handleDelete = useCallback(
    async (login: string, clientSource: string) => {
      if (deletingLogin) return;
      setDeletingLogin(login);
      try {
        await api.post('/touch-api/delete-account', { login, source: clientSource });
        setConfirmDelete(null);
        await fetchSource(clientSource);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Ошибка удаления');
      } finally {
        setDeletingLogin(null);
      }
    },
    [deletingLogin, fetchSource],
  );

  // --- Reset ---
  const handleReset = useCallback(
    async (client: ClientWithSource) => {
      if (resettingLogin) return;
      setResettingLogin(client.login);
      setImageModal({ login: client.login, source: client.source, title: 'QR-код (сброс)', url: null, loading: true });
      try {
        const data = await api.post<any>('/touch-api/reset-account', {
          login: client.login,
          source: client.source,
        });
        const qrUrl = await extractQrUrl(data);
        setImageModal({
          login: client.login,
          source: client.source,
          title: 'QR-код (сброс)',
          url: qrUrl,
          loading: false,
        });
        await fetchSource(client.source);
      } catch (err) {
        setImageModal(null);
        alert(err instanceof Error ? err.message : 'Ошибка сброса');
      } finally {
        setResettingLogin(null);
      }
    },
    [resettingLogin, fetchSource],
  );

  if (!user) return null;

  // Find source for delete confirmation
  const confirmDeleteClient = confirmDelete
    ? allClients.find((c) => c.login === confirmDelete)
    : null;

  return (
    <>
      <Header title="Инстансы" user={user} />
      <div className="p-6">
        {!hasToken ? (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-amber-400 mb-4" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              TouchAPI Token не настроен
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Перейдите в{' '}
              <a
                href="/profile"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Профиль
              </a>{' '}
              и добавьте TouchAPI Token
            </p>
          </div>
        ) : (
          <>
            {/* Source Tabs */}
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === 'all'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All{allClients.length > 0 && ` (${allClients.length})`}
              </button>
              {SOURCES.map((s) => {
                const cnt = countBySource[s.value] || 0;
                return (
                  <button
                    key={s.value}
                    onClick={() => setActiveTab(s.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === s.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s.label}{cnt > 0 && ` (${cnt})`}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-primary-600" />
              </div>
            ) : error ? (
              <div className="card text-center py-12">
                <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={fetchAll}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  <RefreshCw size={14} />
                  Повторить
                </button>
              </div>
            ) : (
              <>
                {/* Summary + Actions */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {currentSummary && (
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          Всего:{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {currentSummary.count ?? 0}
                          </span>
                        </span>
                        <span>
                          Активных:{' '}
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {currentSummary.active ?? 0}
                          </span>
                        </span>
                        {currentSummary.payment != null && (
                          <span>
                            Баланс:{' '}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {currentSummary.payment.balance}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <RefreshCw size={14} />
                      Обновить
                    </button>
                    <button
                      onClick={() => {
                        setAddSource(activeTab !== 'all' ? activeTab : 'whatsapp');
                        setAddModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus size={14} />
                      Add Instance
                    </button>
                  </div>
                </div>

                {/* Instances list */}
                {filteredClients.length === 0 ? (
                  <div className="card text-center py-12">
                    <Smartphone size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Нет инстансов
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Нажмите &quot;Add Instance&quot; чтобы создать
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClients.map((client) => {
                      const srcLabel = SOURCES.find((s) => s.value === client.source)?.label || client.source;
                      const srcColor = SOURCE_COLORS[client.source] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                      return (
                        <div key={client._id} className="card hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              {/* Status indicator */}
                              <div
                                className={`w-3 h-3 rounded-full shrink-0 ${
                                  client.state
                                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${srcColor}`}>
                                    {srcLabel}
                                  </span>
                                  {editingName === client.login ? (
                                    <form
                                      className="flex items-center gap-1 flex-1 min-w-0"
                                      onSubmit={(e) => { e.preventDefault(); handleSaveName(client.login); }}
                                    >
                                      <input
                                        autoFocus
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => handleSaveName(client.login)}
                                        placeholder="Название инстанса"
                                        className="flex-1 min-w-0 px-2 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                                      />
                                      <button type="submit" className="p-0.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                                        <Check size={14} />
                                      </button>
                                    </form>
                                  ) : (
                                    <>
                                      {names[client.login] ? (
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                          {names[client.login]}
                                        </p>
                                      ) : (
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate font-mono">
                                          {client.login}
                                        </p>
                                      )}
                                      <button
                                        onClick={() => { setEditingName(client.login); setEditValue(names[client.login] || ''); }}
                                        title="Переименовать"
                                        className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    </>
                                  )}
                                  {client.activated && editingName !== client.login && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      Activated
                                    </span>
                                  )}
                                </div>
                                {names[client.login] && editingName !== client.login && (
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                                    {client.login}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span>
                                    Статус:{' '}
                                    <span
                                      className={
                                        client.state
                                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                          : ''
                                      }
                                    >
                                      {client.state ? 'Online' : 'Offline'}
                                    </span>
                                  </span>
                                  {client.step && (
                                    <span>
                                      Step:{' '}
                                      {typeof client.step === 'string'
                                        ? client.step
                                        : client.step.message || client.step.value}
                                    </span>
                                  )}
                                  <span>
                                    Добавлен: {formatAddedTime(client.addedTime)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Screenshot (small icon, only online) */}
                              {client.state && (
                                <button
                                  onClick={() => handleShowScreenshot(client.login, client.source)}
                                  title="Скриншот"
                                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Monitor size={14} />
                                </button>
                              )}

                              {/* QR (only online) */}
                              {client.state && (
                                <button
                                  onClick={() => handleShowQr(client.login, client.source)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  <QrCode size={12} />
                                  QR
                                </button>
                              )}

                              {/* Reset */}
                              <button
                                onClick={() => handleReset(client)}
                                disabled={resettingLogin === client.login}
                                title="Сброс"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                              >
                                {resettingLogin === client.login ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <RotateCcw size={12} />
                                )}
                                Reset
                              </button>

                              {/* Toggle on/off */}
                              <button
                                onClick={() => handleToggleState(client)}
                                disabled={togglingLogin === client.login}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                  client.state
                                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50'
                                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                }`}
                              >
                                {togglingLogin === client.login ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : client.state ? (
                                  <PowerOff size={12} />
                                ) : (
                                  <Power size={12} />
                                )}
                                {client.state ? 'Выкл' : 'Вкл'}
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setConfirmDelete(client.login)}
                                title="Удалить"
                                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Add Instance Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Новый инстанс
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Source
                </label>
                <select
                  value={addSource}
                  onChange={(e) => setAddSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !deletingLogin && setConfirmDelete(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Удалить инстанс{names[confirmDelete] ? ` «${names[confirmDelete]}»` : ''}?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-3 break-all">
                {confirmDelete}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                Инстанс будет остановлен и удалён. Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={!!deletingLogin}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete, confirmDeleteClient?.source || (activeTab !== 'all' ? activeTab : 'whatsapp'))}
                  disabled={!!deletingLogin}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingLogin ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal (QR / Screenshot) */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setImageModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {imageModal.title}{names[imageModal.login] ? ` — ${names[imageModal.login]}` : ''}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  {imageModal.login}
                </p>
              </div>
              <button
                onClick={() => setImageModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {imageModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-primary-600" />
                </div>
              ) : imageModal.url ? (
                <img
                  src={imageModal.url}
                  alt={imageModal.title}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="text-center py-8">
                  <AlertCircle
                    size={32}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Недоступно. Попробуйте позже.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                {!imageModal.loading && (
                  <button
                    onClick={() => {
                      if (imageModal.title.includes('QR')) {
                        handleShowQr(imageModal.login, imageModal.source);
                      } else {
                        handleShowScreenshot(imageModal.login, imageModal.source);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <RefreshCw size={14} />
                    Обновить
                  </button>
                )}
                <button
                  onClick={() => setImageModal(null)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
