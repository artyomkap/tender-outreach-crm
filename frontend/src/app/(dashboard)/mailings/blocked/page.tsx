'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { autosendingApi } from '@/lib/autosending-api';
import { AutosendingBlockedPhone } from '@/types';
import {
  ShieldBan,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function MailingBlockedPage() {
  const { user } = useAuth();
  const [phones, setPhones] = useState<AutosendingBlockedPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addPhones, setAddPhones] = useState('');

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

  const fetchBlocked = useCallback(async () => {
    if (!initApi()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await autosendingApi.get<{ blockedPhones: AutosendingBlockedPhone[] }>('/blocked-phone');
      setPhones(data.blockedPhones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [initApi]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleAdd = async () => {
    if (!addPhones.trim()) return;
    setSaving(true);
    try {
      const phoneList = addPhones
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      await autosendingApi.post('/blocked-phone', { phones: phoneList });
      setShowAdd(false);
      setAddPhones('');
      fetchBlocked();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка добавления');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    setActionLoading(uuid);
    try {
      await autosendingApi.delete(`/blocked-phone/${uuid}`);
      fetchBlocked();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPhones = search
    ? phones.filter((p) => p.phone.includes(search))
    : phones;

  if (!user) return null;

  if (tokenMissing) {
    return (
      <>
        <Header title="Чёрный список" user={user} />
        <div className="p-6">
          <div className="card p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Токен не настроен</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Для работы с чёрным списком укажите Touch API Token в{' '}
              <Link href="/profile" className="text-primary-600 hover:underline">настройках профиля</Link>.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Чёрный список" user={user} />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по номеру..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>
          <button onClick={() => fetchBlocked()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Обновить
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Добавить номера
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
        ) : filteredPhones.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
            <ShieldBan size={48} className="mx-auto mb-4 opacity-30" />
            <p>{search ? 'Номера не найдены' : 'Чёрный список пуст'}</p>
          </div>
        ) : (
          <div className="card">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Всего: {filteredPhones.length}{search && ` (из ${phones.length})`}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-gray-800">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Номер телефона</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhones.map((p) => {
                    const isLoading = actionLoading === p.uuid;
                    return (
                      <tr key={p.uuid} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-mono">{p.phone}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(p.uuid)}
                            disabled={isLoading}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                            title="Удалить из чёрного списка"
                          >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Добавить в чёрный список</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Номера телефонов
              </label>
              <textarea
                value={addPhones}
                onChange={(e) => setAddPhones(e.target.value)}
                placeholder="Введите номера (каждый с новой строки, через запятую или точку с запятой)"
                className="input-field w-full h-40 resize-y"
              />
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Отмена</button>
              <button
                onClick={handleAdd}
                disabled={saving || !addPhones.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
