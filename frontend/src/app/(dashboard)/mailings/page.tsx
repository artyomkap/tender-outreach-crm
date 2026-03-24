'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { autosendingApi } from '@/lib/autosending-api';
import {
  AutosendingSendingProject,
  AutosendingProjectStatus,
  AutosendingAccount,
  AutosendingWorkingHours,
} from '@/types';
import {
  Radio,
  Plus,
  Trash2,
  Loader2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_MAP: Record<AutosendingProjectStatus, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'Пауза', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Завершена', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  canceled: { label: 'Отменена', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  delayed: { label: 'Отложена', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

const DEFAULT_WORKING_HOURS: AutosendingWorkingHours = {
  monday: { startTime: '09:00', endTime: '18:00' },
  tuesday: { startTime: '09:00', endTime: '18:00' },
  wednesday: { startTime: '09:00', endTime: '18:00' },
  thursday: { startTime: '09:00', endTime: '18:00' },
  friday: { startTime: '09:00', endTime: '18:00' },
  saturday: { startTime: '10:00', endTime: '15:00' },
  sunday: { startTime: '00:00', endTime: '00:00' },
};

export default function MailingsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<AutosendingSendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState<AutosendingProjectStatus | ''>('');

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<AutosendingAccount[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    text: '',
    minInterval: '60',
    maxInterval: '120',
    timezone: '3',
    accountUuids: [] as string[],
  });

  const initApi = useCallback(() => {
    const token = user?.settings?.touchApiToken;
    if (!token) {
      setTokenMissing(true);
      setLoading(false);
      return false;
    }
    autosendingApi.setUserToken(token);
    setTokenMissing(false);
    return true;
  }, [user?.settings?.touchApiToken]);

  const fetchProjects = useCallback(async () => {
    if (!initApi()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('skip', String(page * limit));
      if (searchName) params.set('name', searchName);
      if (filterStatus) params.set('statuses', filterStatus);

      const data = await autosendingApi.get<{ sendingProjects: AutosendingSendingProject[] }>(
        `/sending-project/search?${params.toString()}`
      );
      setProjects(data.sendingProjects || []);

      const countData = await autosendingApi.get<{ count: number }>('/sending-project/count');
      setTotal(countData.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [initApi, page, searchName, filterStatus]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.settings?.touchApiToken) return;
    try {
      const data = await autosendingApi.get<{ accounts: AutosendingAccount[] }>('/account');
      setAccounts(data.accounts || []);
    } catch { /* ignore */ }
  }, [user?.settings?.touchApiToken]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await autosendingApi.post('/sending-project', {
        name: createForm.name,
        text: createForm.text,
        minInterval: Number(createForm.minInterval),
        maxInterval: Number(createForm.maxInterval),
        status: 'paused' as AutosendingProjectStatus,
        workingHours: DEFAULT_WORKING_HOURS,
        timezone: Number(createForm.timezone),
        accountUuids: createForm.accountUuids,
      });
      setShowCreate(false);
      setCreateForm({ name: '', text: '', minInterval: '60', maxInterval: '120', timezone: '3', accountUuids: [] });
      fetchProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (uuid: string, action: 'start' | 'stop' | 'retry') => {
    setActionLoading(uuid);
    try {
      await autosendingApi.post(`/sending-project/${action}/${uuid}`);
      fetchProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Удалить рассылку?')) return;
    setActionLoading(uuid);
    try {
      await autosendingApi.delete(`/sending-project/${uuid}`);
      fetchProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;

  if (tokenMissing) {
    return (
      <>
        <Header title="Рассылки" user={user} />
        <div className="p-6">
          <div className="card p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Токен не настроен</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Для работы с рассылками укажите Touch API Token в{' '}
              <Link href="/profile" className="text-primary-600 hover:underline">настройках профиля</Link>.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Рассылки" user={user} />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchName}
              onChange={(e) => { setSearchName(e.target.value); setPage(0); }}
              className="input-field pl-9 w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as AutosendingProjectStatus | ''); setPage(0); }}
            className="input-field w-full sm:w-44"
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => fetchProjects()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Обновить
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Создать рассылку
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
            <Radio size={48} className="mx-auto mb-4 opacity-30" />
            <p>Рассылки не найдены</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Название</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Статус</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Получателей</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Интервал</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const st = STATUS_MAP[p.status] || { label: p.status, color: 'bg-gray-100 text-gray-600' };
                    const isLoading = actionLoading === p.uuid;
                    return (
                      <tr key={p.uuid} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <Link href={`/mailings/${p.uuid}`} className="text-primary-600 hover:underline font-medium">
                            {p.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{p.recipientCount ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{p.minInterval}–{p.maxInterval}с</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/mailings/${p.uuid}`} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Подробнее">
                              <Eye size={16} />
                            </Link>
                            {p.status === 'paused' && (
                              <button onClick={() => handleAction(p.uuid, 'start')} disabled={isLoading} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600" title="Запустить">
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                              </button>
                            )}
                            {p.status === 'active' && (
                              <button onClick={() => handleAction(p.uuid, 'stop')} disabled={isLoading} className="p-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600" title="Остановить">
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                              </button>
                            )}
                            {p.status === 'completed' && (
                              <button onClick={() => handleAction(p.uuid, 'retry')} disabled={isLoading} className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600" title="Повторить ошибки">
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                              </button>
                            )}
                            <button onClick={() => handleDelete(p.uuid)} disabled={isLoading} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Удалить">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {page * limit + 1}–{Math.min((page + 1) * limit, total)} из {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * limit >= total}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Новая рассылка</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Название рассылки"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Текст сообщения</label>
                <textarea
                  value={createForm.text}
                  onChange={(e) => setCreateForm((f) => ({ ...f, text: e.target.value }))}
                  className="input-field w-full h-32 resize-y"
                  placeholder="Текст сообщения для получателей..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Мин. интервал (с)</label>
                  <input
                    type="number"
                    value={createForm.minInterval}
                    onChange={(e) => setCreateForm((f) => ({ ...f, minInterval: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Макс. интервал (с)</label>
                  <input
                    type="number"
                    value={createForm.maxInterval}
                    onChange={(e) => setCreateForm((f) => ({ ...f, maxInterval: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Часовой пояс (UTC+)</label>
                <input
                  type="number"
                  value={createForm.timezone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Аккаунты</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                    {accounts.map((acc) => (
                      <label key={acc.uuid} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.accountUuids.includes(acc.uuid)}
                          onChange={(e) => {
                            setCreateForm((f) => ({
                              ...f,
                              accountUuids: e.target.checked
                                ? [...f.accountUuids, acc.uuid]
                                : f.accountUuids.filter((id) => id !== acc.uuid),
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{acc.source}</span> — {acc.login}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Отмена</button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.name || !createForm.text}
                className="btn-primary flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
