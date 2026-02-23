'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

const SOURCES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'sms', label: 'SMS' },
  { value: 'telegram-bot', label: 'TG Bot' },
  { value: 'viber-bot', label: 'Viber Bot' },
  { value: 'vk', label: 'VK' },
  { value: 'max', label: 'MAX' },
];

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

export default function InstancesPage() {
  const { user } = useAuth();
  const [source, setSource] = useState('whatsapp');
  const [info, setInfo] = useState<TouchApiInfo | null>(null);
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

  // Image modal (QR or screenshot)
  const [imageModal, setImageModal] = useState<{
    login: string;
    title: string;
    url: string | null;
    loading: boolean;
  } | null>(null);

  const hasToken = !!user?.settings?.touchApiToken;

  const fetchInfo = useCallback(async () => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.get<TouchApiInfo>(`/touch-api/info?source=${encodeURIComponent(source)}`);
      if (data.status !== 'ok') {
        throw new Error('Ошибка получения данных от TouchAPI');
      }
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [hasToken, source]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

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
        // Switch view to the source we just added to
        if (addSource !== source) {
          setSource(addSource);
        } else {
          await fetchInfo();
        }
      } else {
        alert('Ошибка создания инстанса');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка создания инстанса');
    } finally {
      setAdding(false);
    }
  }, [adding, addSource, source, fetchInfo]);

  // --- Toggle State (on/off) ---
  const handleToggleState = useCallback(
    async (client: TouchApiClient) => {
      if (togglingLogin) return;
      const newState = !client.state;
      setTogglingLogin(client.login);
      try {
        await api.post('/touch-api/set-state', {
          login: client.login,
          state: newState,
          source,
        });

        if (newState) {
          // After starting, wait then fetch QR
          await new Promise((r) => setTimeout(r, 3000));
          setImageModal({ login: client.login, title: 'QR-код', url: null, loading: true });
          try {
            const data = await api.post<any>('/touch-api/get-qr', {
              login: client.login,
              source,
            });
            const qrUrl = await extractQrUrl(data);
            setImageModal({ login: client.login, title: 'QR-код', url: qrUrl, loading: false });
          } catch {
            setImageModal({ login: client.login, title: 'QR-код', url: null, loading: false });
          }
        }

        await fetchInfo();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Ошибка');
      } finally {
        setTogglingLogin(null);
      }
    },
    [togglingLogin, source, fetchInfo],
  );

  // --- Get QR ---
  const handleShowQr = useCallback(
    async (login: string) => {
      setImageModal({ login, title: 'QR-код', url: null, loading: true });
      try {
        const data = await api.post<any>('/touch-api/get-qr', { login, source });
        const qrUrl = await extractQrUrl(data);
        setImageModal({ login, title: 'QR-код', url: qrUrl, loading: false });
      } catch {
        setImageModal({ login, title: 'QR-код', url: null, loading: false });
      }
    },
    [source],
  );

  // --- Screenshot ---
  const handleShowScreenshot = useCallback(
    async (login: string) => {
      setImageModal({ login, title: 'Скриншот', url: null, loading: true });
      try {
        const data = await api.get<{ url: string }>(
          `/touch-api/screenshot?login=${encodeURIComponent(login)}&source=${encodeURIComponent(source)}`,
        );
        setImageModal({ login, title: 'Скриншот', url: data.url, loading: false });
      } catch {
        setImageModal({ login, title: 'Скриншот', url: null, loading: false });
      }
    },
    [source],
  );

  // --- Delete ---
  const handleDelete = useCallback(
    async (login: string) => {
      if (deletingLogin) return;
      setDeletingLogin(login);
      try {
        await api.post('/touch-api/delete-account', { login, source });
        setConfirmDelete(null);
        await fetchInfo();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Ошибка удаления');
      } finally {
        setDeletingLogin(null);
      }
    },
    [deletingLogin, source, fetchInfo],
  );

  // --- Reset ---
  const handleReset = useCallback(
    async (client: TouchApiClient) => {
      if (resettingLogin) return;
      setResettingLogin(client.login);
      setImageModal({ login: client.login, title: 'QR-код (сброс)', url: null, loading: true });
      try {
        const data = await api.post<any>('/touch-api/reset-account', {
          login: client.login,
          source,
        });
        const qrUrl = await extractQrUrl(data);
        setImageModal({
          login: client.login,
          title: 'QR-код (сброс)',
          url: qrUrl,
          loading: false,
        });
        await fetchInfo();
      } catch (err) {
        setImageModal(null);
        alert(err instanceof Error ? err.message : 'Ошибка сброса');
      } finally {
        setResettingLogin(null);
      }
    },
    [resettingLogin, source, fetchInfo],
  );

  if (!user) return null;

  const sourceLabel = SOURCES.find((s) => s.value === source)?.label || source;

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
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    source === s.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
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
                  onClick={fetchInfo}
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
                    {info?.summary && (
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          Всего:{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {info.summary.count ?? 0}
                          </span>
                        </span>
                        <span>
                          Активных:{' '}
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {info.summary.active ?? 0}
                          </span>
                        </span>
                        {info.summary.payment != null && (
                          <span>
                            Баланс:{' '}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {info.summary.payment.balance}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchInfo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <RefreshCw size={14} />
                      Обновить
                    </button>
                    <button
                      onClick={() => {
                        setAddSource(source);
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
                {!info || info.clients.length === 0 ? (
                  <div className="card text-center py-12">
                    <Smartphone size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Нет инстансов ({sourceLabel})
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Нажмите &quot;Add Instance&quot; чтобы создать
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {info.clients.map((client) => (
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
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate font-mono">
                                  {client.login}
                                </p>
                                {client.activated && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    Activated
                                  </span>
                                )}
                              </div>
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
                                  Добавлен:{' '}
                                  {new Date(client.addedTime).toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Screenshot (small icon, only online) */}
                            {client.state && (
                              <button
                                onClick={() => handleShowScreenshot(client.login)}
                                title="Скриншот"
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Monitor size={14} />
                              </button>
                            )}

                            {/* QR (only online) */}
                            {client.state && (
                              <button
                                onClick={() => handleShowQr(client.login)}
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
                    ))}
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
                Удалить инстанс?
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
                  onClick={() => handleDelete(confirmDelete)}
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
                  {imageModal.title}
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
                        handleShowQr(imageModal.login);
                      } else {
                        handleShowScreenshot(imageModal.login);
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
