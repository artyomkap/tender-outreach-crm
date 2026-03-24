'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { autosendingApi } from '@/lib/autosending-api';
import {
  AutosendingSendingProject,
  AutosendingProjectStatus,
  AutosendingMessage,
  AutosendingRecipient,
  AutosendingImportResult,
} from '@/types';
import {
  ArrowLeft,
  Loader2,
  Play,
  Square,
  RefreshCw,
  Save,
  Upload,
  Send,
  Users,
  MessageSquare,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'settings' | 'recipients' | 'messages';

const STATUS_MAP: Record<AutosendingProjectStatus, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'Пауза', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Завершена', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  canceled: { label: 'Отменена', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  delayed: { label: 'Отложена', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

const MSG_STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  sent: { icon: <CheckCircle size={14} />, color: 'text-green-500' },
  delivered: { icon: <CheckCircle size={14} />, color: 'text-blue-500' },
  error: { icon: <XCircle size={14} />, color: 'text-red-500' },
  pending: { icon: <Clock size={14} />, color: 'text-gray-400' },
  scheduled: { icon: <Clock size={14} />, color: 'text-yellow-500' },
  canceled: { icon: <XCircle size={14} />, color: 'text-gray-400' },
};

export default function MailingDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<AutosendingSendingProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    minInterval: '',
    maxInterval: '',
    timezone: '',
    sendOnlyToExistingChats: false,
  });

  // Recipients
  const [recipients, setRecipients] = useState<AutosendingRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<AutosendingImportResult | null>(null);

  // Messages
  const [messages, setMessages] = useState<AutosendingMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgPage, setMsgPage] = useState(0);
  const [msgTotal, setMsgTotal] = useState(0);
  const msgLimit = 50;
  const [msgStatusFilter, setMsgStatusFilter] = useState('');

  // Test sending
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('');
  const [testSource, setTestSource] = useState('whatsapp');
  const [testSending, setTestSending] = useState(false);

  const initApi = useCallback(() => {
    const token = user?.settings?.touchApiToken;
    if (!token) return false;
    autosendingApi.setUserToken(token);
    return true;
  }, [user?.settings?.touchApiToken]);

  const fetchProject = useCallback(async () => {
    if (!initApi()) return;
    setLoading(true);
    try {
      const data = await autosendingApi.get<AutosendingSendingProject>(
        `/sending-project/${uuid}?includeAccounts=true`
      );
      setProject(data);
      setSettingsForm({
        minInterval: String(data.minInterval),
        maxInterval: String(data.maxInterval),
        timezone: String(data.timezone),
        sendOnlyToExistingChats: data.sendOnlyToExistingChats || false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [initApi, uuid]);

  const fetchRecipients = useCallback(async () => {
    if (!initApi()) return;
    setRecipientsLoading(true);
    try {
      const data = await autosendingApi.get<{ recipients: AutosendingRecipient[] }>(
        `/recipient/list/${uuid}`
      );
      setRecipients(data.recipients || []);
    } catch { /* ignore */ } finally {
      setRecipientsLoading(false);
    }
  }, [initApi, uuid]);

  const fetchMessages = useCallback(async () => {
    if (!initApi()) return;
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('sendingProjectUuid', uuid);
      params.set('limit', String(msgLimit));
      params.set('skip', String(msgPage * msgLimit));
      if (msgStatusFilter) params.set('messageStatuses', msgStatusFilter);

      const [listData, countData] = await Promise.all([
        autosendingApi.get<{ messages: AutosendingMessage[] }>(`/message/list?${params.toString()}`),
        autosendingApi.get<{ count: number }>(`/message/count?sendingProjectUuid=${uuid}${msgStatusFilter ? `&messageStatuses=${msgStatusFilter}` : ''}`),
      ]);
      setMessages(listData.messages || []);
      setMsgTotal(countData.count || 0);
    } catch { /* ignore */ } finally {
      setMessagesLoading(false);
    }
  }, [initApi, uuid, msgPage, msgStatusFilter]);

  useEffect(() => { fetchProject(); }, [fetchProject]);
  useEffect(() => { if (tab === 'recipients') fetchRecipients(); }, [tab, fetchRecipients]);
  useEffect(() => { if (tab === 'messages') fetchMessages(); }, [tab, fetchMessages]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await autosendingApi.patch(`/sending-project/${uuid}`, {
        minInterval: Number(settingsForm.minInterval),
        maxInterval: Number(settingsForm.maxInterval),
        timezone: Number(settingsForm.timezone),
        sendOnlyToExistingChats: settingsForm.sendOnlyToExistingChats,
      });
      fetchProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'retry') => {
    setActionLoading(true);
    try {
      await autosendingApi.post(`/sending-project/${action}/${uuid}`);
      fetchProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportText = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const result = await autosendingApi.post<AutosendingImportResult>('/recipient-import/text', {
        textData: importText,
      });
      setImportResult(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveRecipients = async () => {
    if (!importResult) return;
    setImporting(true);
    try {
      await autosendingApi.post(`/recipient/${uuid}`, {
        importUuid: importResult.importUuid,
      });
      setImportText('');
      setImportResult(null);
      fetchRecipients();
      fetchProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setImporting(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone || !testText) return;
    setTestSending(true);
    try {
      const accountToken = project?.accounts?.[0]?.token || '';
      const result = await autosendingApi.post<{ status: boolean; errorMessage?: string }>('/test-sending', {
        phone: testPhone,
        text: testText,
        source: testSource,
        accountToken,
      });
      if (result.status) {
        alert('Тестовое сообщение отправлено!');
      } else {
        alert('Ошибка: ' + (result.errorMessage || 'Неизвестная ошибка'));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setTestSending(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <>
        <Header title="Рассылка" user={user} />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <Header title="Рассылка" user={user} />
        <div className="p-6">
          <div className="card p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="text-gray-600 dark:text-gray-400">{error || 'Рассылка не найдена'}</p>
            <Link href="/mailings" className="btn-secondary mt-4 inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Назад
            </Link>
          </div>
        </div>
      </>
    );
  }

  const st = STATUS_MAP[project.status] || { label: project.status, color: '' };

  return (
    <>
      <Header title={project.name} user={user} />
      <div className="p-6">
        {/* Back + Status + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <Link href="/mailings" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex-1">{project.name}</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
          <div className="flex gap-2">
            {project.status === 'paused' && (
              <button onClick={() => handleAction('start')} disabled={actionLoading} className="btn-primary flex items-center gap-2 text-sm">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Запустить
              </button>
            )}
            {project.status === 'active' && (
              <button onClick={() => handleAction('stop')} disabled={actionLoading} className="btn-secondary flex items-center gap-2 text-sm">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />} Остановить
              </button>
            )}
            {(project.status === 'completed' || project.status === 'canceled') && (
              <button onClick={() => handleAction('retry')} disabled={actionLoading} className="btn-secondary flex items-center gap-2 text-sm">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Повторить ошибки
              </button>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Получателей</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.recipientCount ?? 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Интервал</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.minInterval}–{project.maxInterval}с</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Часовой пояс</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">UTC+{project.timezone}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Аккаунтов</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.accounts?.length ?? 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          {[
            { key: 'settings' as Tab, label: 'Настройки', icon: <Settings size={16} /> },
            { key: 'recipients' as Tab, label: 'Получатели', icon: <Users size={16} /> },
            { key: 'messages' as Tab, label: 'Сообщения', icon: <MessageSquare size={16} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="card p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Текст сообщения</h3>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {project.text}
              </div>
              {project.variables && <p className="text-xs text-blue-500 mt-1">Используются переменные</p>}
              {project.spintax && <p className="text-xs text-purple-500 mt-1">Используется спинтакс</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Мин. интервал (с)</label>
                <input
                  type="number"
                  value={settingsForm.minInterval}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, minInterval: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Макс. интервал (с)</label>
                <input
                  type="number"
                  value={settingsForm.maxInterval}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, maxInterval: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Часовой пояс (UTC+)</label>
                <input
                  type="number"
                  value={settingsForm.timezone}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="existingChats"
                  checked={settingsForm.sendOnlyToExistingChats}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, sendOnlyToExistingChats: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="existingChats" className="text-sm text-gray-700 dark:text-gray-300">
                  Только существующие чаты
                </label>
              </div>
            </div>

            <button onClick={handleSaveSettings} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Сохранить настройки
            </button>

            {/* Accounts */}
            {project.accounts && project.accounts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Привязанные аккаунты</h3>
                <div className="space-y-2">
                  {project.accounts.map((acc) => (
                    <div key={acc.uuid} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                      <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs capitalize">
                        {acc.source}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{acc.login}</span>
                      {acc.fromAlias && <span className="text-gray-400 text-xs">({acc.fromAlias})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Send */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Тестовая отправка</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Номер телефона"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="input-field"
                />
                <select
                  value={testSource}
                  onChange={(e) => setTestSource(e.target.value)}
                  className="input-field"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="sms">SMS</option>
                  <option value="vk">VK</option>
                </select>
                <button onClick={handleTestSend} disabled={testSending || !testPhone} className="btn-secondary flex items-center gap-2">
                  {testSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Отправить тест
                </button>
              </div>
              <textarea
                placeholder="Текст тестового сообщения (по умолчанию — текст рассылки)"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="input-field w-full mt-2 h-20 resize-y"
              />
            </div>
          </div>
        )}

        {/* Recipients Tab */}
        {tab === 'recipients' && (
          <div className="space-y-6">
            {/* Import */}
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Импорт получателей</h3>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Вставьте номера телефонов (каждый с новой строки)"
                className="input-field w-full h-32 resize-y mb-3"
              />
              <div className="flex items-center gap-3">
                <button onClick={handleImportText} disabled={importing || !importText.trim()} className="btn-secondary flex items-center gap-2">
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Проверить номера
                </button>
                {importResult && (
                  <>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Валидных: <b className="text-green-600">{importResult.validPhonesCount}</b>,
                      в блоке: <b className="text-red-500">{importResult.blockedPhonesCount}</b>,
                      всего: {importResult.allPhonesCount}
                    </span>
                    <button onClick={handleSaveRecipients} disabled={importing} className="btn-primary flex items-center gap-2 ml-auto">
                      {importing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Сохранить получателей
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Recipient List */}
            <div className="card">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Получатели ({recipients.length})
                </h3>
                <button onClick={fetchRecipients} className="text-gray-400 hover:text-gray-600">
                  <RefreshCw size={14} />
                </button>
              </div>
              {recipientsLoading ? (
                <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-primary-600" /></div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Нет получателей</div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Телефон</th>
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Статус</th>
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Приоритет</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r) => (
                        <tr key={r.uuid} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300 font-mono">{r.phone}</td>
                          <td className="py-2 px-4 text-gray-500 dark:text-gray-400 text-xs">{r.processingStatus || '—'}</td>
                          <td className="py-2 px-4 text-gray-500 dark:text-gray-400">{r.priority ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {tab === 'messages' && (
          <div className="card">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                Сообщения ({msgTotal})
              </h3>
              <select
                value={msgStatusFilter}
                onChange={(e) => { setMsgStatusFilter(e.target.value); setMsgPage(0); }}
                className="input-field text-sm w-full sm:w-40"
              >
                <option value="">Все статусы</option>
                <option value="pending">Ожидание</option>
                <option value="scheduled">Запланировано</option>
                <option value="sent">Отправлено</option>
                <option value="delivered">Доставлено</option>
                <option value="error">Ошибка</option>
                <option value="canceled">Отменено</option>
              </select>
              <button onClick={fetchMessages} className="text-gray-400 hover:text-gray-600">
                <RefreshCw size={14} />
              </button>
            </div>
            {messagesLoading ? (
              <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-primary-600" /></div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Нет сообщений</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Телефон</th>
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Статус</th>
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Канал</th>
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Текст</th>
                        <th className="text-left py-2 px-4 text-gray-500 dark:text-gray-400 font-medium">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((m) => {
                        const si = MSG_STATUS_ICONS[m.status] || { icon: <Clock size={14} />, color: 'text-gray-400' };
                        return (
                          <tr key={m.uuid} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-4 text-gray-700 dark:text-gray-300 font-mono text-xs">{m.to}</td>
                            <td className="py-2 px-4">
                              <span className={`flex items-center gap-1 text-xs ${si.color}`}>
                                {si.icon} {m.status}
                              </span>
                              {m.errorMessage && (
                                <p className="text-xs text-red-400 mt-0.5 truncate max-w-xs" title={m.errorMessage}>
                                  {m.errorMessage}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-4 text-xs text-gray-500 capitalize">{m.sendedSource || '—'}</td>
                            <td className="py-2 px-4 text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs">{m.text}</td>
                            <td className="py-2 px-4 text-xs text-gray-400">{m.finishedAt ? new Date(m.finishedAt).toLocaleString('ru-RU') : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {msgTotal > msgLimit && (
                  <div className="p-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500">
                      {msgPage * msgLimit + 1}–{Math.min((msgPage + 1) * msgLimit, msgTotal)} из {msgTotal}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setMsgPage((p) => Math.max(0, p - 1))} disabled={msgPage === 0} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
                        <ChevronLeft size={14} />
                      </button>
                      <button onClick={() => setMsgPage((p) => p + 1)} disabled={(msgPage + 1) * msgLimit >= msgTotal} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
