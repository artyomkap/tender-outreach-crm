'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { ROLE_LABELS } from '@/types';
import { api } from '@/lib/api';
import { Save } from 'lucide-react';
import ThemedCard from '@/components/themed/card';
import ThemedInput from '@/components/themed/input';
import ThemedButton from '@/components/themed/button';

export default function ProfilePage() {
  const { user, refetch } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [urlForm, setUrlForm] = useState({
    parserDocsUrl: '',
    proxyUrl: '',
  });
  const [aiForm, setAiForm] = useState({
    aiUrl: '',
    aiPrompt: '',
    searchApiUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [savingUrls, setSavingUrls] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [message, setMessage] = useState('');
  const [urlMessage, setUrlMessage] = useState('');
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
      setUrlForm({
        parserDocsUrl: user.settings?.parserDocsUrl || '',
        proxyUrl: user.settings?.proxyUrl || '',
      });
      setAiForm({
        aiUrl: user.settings?.aiUrl || '',
        aiPrompt: user.settings?.aiPrompt || '',
        searchApiUrl: user.settings?.searchApiUrl || '',
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.patch(`/users/${user.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      await refetch();
      setMessage('Профиль обновлён');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Профиль" user={user} />
      <div className="p-6 max-w-2xl space-y-6">
        <ThemedCard>
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user.firstName[0]}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                {message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя</label>
                <ThemedInput
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Фамилия</label>
                <ThemedInput
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
              <ThemedInput
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+7 999 123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <ThemedInput
                type="email"
                value={user.email}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Роль</label>
              <ThemedInput
                type="text"
                value={ROLE_LABELS[user.role]}
                disabled
              />
            </div>

            <ThemedButton
              type="submit"
              disabled={saving}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </ThemedButton>
          </form>
        </ThemedCard>

        <ThemedCard>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Настройки парсинга документов
          </h4>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSavingUrls(true);
              setUrlMessage('');
              try {
                await api.patch(`/users/${user.id}`, {
                  settings: {
                    ...user.settings,
                    parserDocsUrl: urlForm.parserDocsUrl || undefined,
                    proxyUrl: urlForm.proxyUrl || undefined,
                  },
                });
                await refetch();
                setUrlMessage('Настройки сохранены');
              } catch (err) {
                setUrlMessage(err instanceof Error ? err.message : 'Ошибка сохранения');
              } finally {
                setSavingUrls(false);
              }
            }}
            className="space-y-4"
          >
            {urlMessage && (
              <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                {urlMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parser Docs URL
              </label>
              <ThemedInput
                type="url"
                value={urlForm.parserDocsUrl}
                onChange={(e) => setUrlForm((p) => ({ ...p, parserDocsUrl: e.target.value }))}
                placeholder="https://parser.example.com/parse?url="
              />
              <p className="text-xs text-gray-400 mt-1">
                URL сервиса парсинга документов. Закодированная ссылка будет добавлена в конец.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proxy URL
              </label>
              <ThemedInput
                type="url"
                value={urlForm.proxyUrl}
                onChange={(e) => setUrlForm((p) => ({ ...p, proxyUrl: e.target.value }))}
                placeholder="https://proxy.example.com/fetch?url="
              />
              <p className="text-xs text-gray-400 mt-1">
                URL прокси-сервера. Прямая ссылка на документ будет закодирована и добавлена в конец.
              </p>
            </div>

            <ThemedButton
              type="submit"
              disabled={savingUrls}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Save size={18} />
              {savingUrls ? 'Сохранение...' : 'Сохранить настройки'}
            </ThemedButton>
          </form>
        </ThemedCard>

        <ThemedCard>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Настройки AI
          </h4>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSavingAi(true);
              setAiMessage('');
              try {
                await api.patch(`/users/${user.id}`, {
                  settings: {
                    ...user.settings,
                    aiUrl: aiForm.aiUrl || undefined,
                    aiPrompt: aiForm.aiPrompt || undefined,
                    searchApiUrl: aiForm.searchApiUrl || undefined,
                  },
                });
                await refetch();
                setAiMessage('Настройки сохранены');
              } catch (err) {
                setAiMessage(err instanceof Error ? err.message : 'Ошибка сохранения');
              } finally {
                setSavingAi(false);
              }
            }}
            className="space-y-4"
          >
            {aiMessage && (
              <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                {aiMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI URL
              </label>
              <ThemedInput
                type="url"
                value={aiForm.aiUrl}
                onChange={(e) => setAiForm((p) => ({ ...p, aiUrl: e.target.value }))}
                placeholder="https://ai.example.com/api/chat"
              />
              <p className="text-xs text-gray-400 mt-1">
                URL AI-сервиса. На этот адрес будет отправлен POST-запрос с данными закупки.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI промпт
              </label>
              <textarea
                value={aiForm.aiPrompt}
                onChange={(e) => setAiForm((p) => ({ ...p, aiPrompt: e.target.value }))}
                placeholder="Проанализируй закупку и верни JSON с полями search, subject, body..."
                rows={5}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Промпт будет отправлен вместе с названием закупки и текстами сохранённых документов.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search API URL
              </label>
              <ThemedInput
                type="url"
                value={aiForm.searchApiUrl}
                onChange={(e) => setAiForm((p) => ({ ...p, searchApiUrl: e.target.value }))}
                placeholder="https://example.com/search/api.php?q="
              />
              <p className="text-xs text-gray-400 mt-1">
                URL поискового API. Поисковый запрос будет закодирован и добавлен в конец.
              </p>
            </div>

            <ThemedButton
              type="submit"
              disabled={savingAi}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Save size={18} />
              {savingAi ? 'Сохранение...' : 'Сохранить настройки'}
            </ThemedButton>
          </form>
        </ThemedCard>
      </div>
    </>
  );
}
