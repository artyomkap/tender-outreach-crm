'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { autosendingApi } from '@/lib/autosending-api';
import { AutosendingAccount, AutosendingSource } from '@/types';
import {
  Contact,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

const SOURCE_LABELS: Record<AutosendingSource, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  sms: 'SMS',
  max: 'MAX',
  vk: 'VK',
};

const SOURCE_COLORS: Record<AutosendingSource, string> = {
  whatsapp: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  telegram: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sms: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  max: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  vk: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

export default function MailingAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AutosendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    source: 'whatsapp' as AutosendingSource,
    login: '',
    token: '',
    fromAlias: '',
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

  const fetchAccounts = useCallback(async () => {
    if (!initApi()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await autosendingApi.get<{ accounts: AutosendingAccount[] }>('/account');
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [initApi]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await autosendingApi.post('/account', {
        source: createForm.source,
        login: createForm.login,
        token: createForm.token,
        fromAlias: createForm.fromAlias || undefined,
      });
      setShowCreate(false);
      setCreateForm({ source: 'whatsapp', login: '', token: '', fromAlias: '' });
      fetchAccounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Удалить аккаунт?')) return;
    setActionLoading(uuid);
    try {
      await autosendingApi.delete(`/account/${uuid}`);
      fetchAccounts();
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
        <Header title="Аккаунты рассылок" user={user} />
        <div className="p-6">
          <div className="card p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Токен не настроен</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Для работы с аккаунтами рассылок укажите Touch API Token в{' '}
              <Link href="/profile" className="text-primary-600 hover:underline">настройках профиля</Link>.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Аккаунты рассылок" user={user} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => fetchAccounts()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Обновить
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Добавить аккаунт
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
        ) : accounts.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
            <Contact size={48} className="mx-auto mb-4 opacity-30" />
            <p>Аккаунты не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const sourceColor = SOURCE_COLORS[acc.source] || 'bg-gray-100 text-gray-600';
              const isLoading = actionLoading === acc.uuid;
              return (
                <div key={acc.uuid} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor}`}>
                      {SOURCE_LABELS[acc.source] || acc.source}
                    </span>
                    <button
                      onClick={() => handleDelete(acc.uuid)}
                      disabled={isLoading}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                      title="Удалить"
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{acc.login}</p>
                  {acc.fromAlias && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Псевдоним: {acc.fromAlias}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono truncate" title={acc.token}>
                    {acc.token.slice(0, 20)}...
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Новый аккаунт</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Источник</label>
                <select
                  value={createForm.source}
                  onChange={(e) => setCreateForm((f) => ({ ...f, source: e.target.value as AutosendingSource }))}
                  className="input-field w-full"
                >
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Логин</label>
                <input
                  type="text"
                  value={createForm.login}
                  onChange={(e) => setCreateForm((f) => ({ ...f, login: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Логин аккаунта"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Токен</label>
                <input
                  type="text"
                  value={createForm.token}
                  onChange={(e) => setCreateForm((f) => ({ ...f, token: e.target.value }))}
                  className="input-field w-full"
                  placeholder="API токен аккаунта"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Псевдоним (необязательно)</label>
                <input
                  type="text"
                  value={createForm.fromAlias}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fromAlias: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Имя отправителя"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Отмена</button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.login || !createForm.token}
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
