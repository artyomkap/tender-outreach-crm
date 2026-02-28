'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { ProzorroOutreachItem, ProzorroPreparedLetter } from '@/types';
import {
  Search,
  Loader2,
  Globe,
  Mail,
  Send,
  Ban,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  X,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function ProzorroOutreachPage() {
  const { user } = useAuth();
  const [outreach, setOutreach] = useState<ProzorroOutreachItem[]>([]);
  const [letters, setLetters] = useState<ProzorroPreparedLetter[]>([]);
  const [blacklist, setBlacklist] = useState<{ id: string; email: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pipeline' | 'letters' | 'blacklist'>('pipeline');

  // Action states
  const [searchingQuery, setSearchingQuery] = useState<string | null>(null);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sentEmails, setSentEmails] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, l, b] = await Promise.all([
        api.get<ProzorroOutreachItem[]>('/prozorro/outreach'),
        api.get<ProzorroPreparedLetter[]>('/prozorro/letters'),
        api.get<any[]>('/prozorro/blacklist'),
      ]);
      setOutreach(o);
      setLetters(l);
      setBlacklist(b);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWebSearch = useCallback(async (searchQuery: string) => {
    setSearchingQuery(searchQuery);
    try {
      await api.post('/prozorro/web-search', { searchQuery });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSearchingQuery(null);
    }
  }, [fetchData]);

  const handleParseEmails = useCallback(async (webResultId: string) => {
    setParsingId(webResultId);
    try {
      await api.post(`/prozorro/web-results/${webResultId}/parse-emails`, {});
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setParsingId(null);
    }
  }, [fetchData]);

  const handleSendEmail = useCallback(async (to: string, subject: string, body: string) => {
    const key = `${to}:${subject}`;
    setSendingKey(key);
    try {
      await api.post('/emails/send', { to, subject, body });
      setSentEmails((prev) => new Set(prev).add(key));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSendingKey(null);
    }
  }, []);

  const handleBanEmail = useCallback(async (email: string) => {
    try {
      await api.post('/prozorro/blacklist', { email });
      await fetchData();
    } catch {
      // ignore
    }
  }, [fetchData]);

  const handleUnban = useCallback(async (email: string) => {
    try {
      await api.delete(`/prozorro/blacklist/${encodeURIComponent(email)}`);
      await fetchData();
    } catch {
      // ignore
    }
  }, [fetchData]);

  if (!user) return null;

  return (
    <>
      <Header title="Воронка рассылки (Prozorro)" user={user} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/prozorro" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <ArrowLeft size={14} /> К поиску
          </Link>
          <button onClick={fetchData} className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1">
            <RefreshCw size={12} /> Обновить
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'pipeline' as const, label: 'Воронка', count: outreach.length },
            { key: 'letters' as const, label: 'Письма', count: letters.length },
            { key: 'blacklist' as const, label: 'Чёрный список', count: blacklist.length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Pipeline tab */}
            {tab === 'pipeline' && (
              <div className="space-y-6">
                {outreach.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                    Нет данных. Запустите AI-анализ на странице тендера.
                  </p>
                )}

                {outreach.map((item) => (
                  <div key={item.id} className="card">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {item.tender && (
                          <Link
                            href={`/prozorro/${item.tender.prozorroId}`}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-mono"
                          >
                            {item.tender.tenderNumber}
                          </Link>
                        )}
                        {item.tender && (
                          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-1">{item.tender.title}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="btn-secondary !py-1 !px-2 text-xs"
                      >
                        {expandedId === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {/* Search query */}
                    {item.searchQuery && (
                      <div className="flex items-center gap-2 mb-3">
                        <Search size={14} className="text-gray-400 flex-shrink-0" />
                        <code className="text-sm flex-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded truncate">
                          {item.searchQuery}
                        </code>
                        <button
                          onClick={() => handleWebSearch(item.searchQuery!)}
                          disabled={searchingQuery === item.searchQuery}
                          className="btn-primary !py-1 !px-2 text-xs flex items-center gap-1"
                        >
                          {searchingQuery === item.searchQuery ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Globe size={12} />
                          )}
                          Искать
                        </button>
                      </div>
                    )}

                    {/* Expanded: subject, body, web results, emails */}
                    {expandedId === item.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        {item.subject && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Тема:</label>
                            <p className="text-sm mt-0.5">{item.subject}</p>
                          </div>
                        )}
                        {item.body && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Текст:</label>
                            <pre className="text-xs mt-0.5 bg-gray-50 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap max-h-40 overflow-auto">
                              {item.body}
                            </pre>
                          </div>
                        )}

                        {/* Web results */}
                        {item.webResults.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Сайты ({item.webResults.length}):
                            </label>
                            <div className="space-y-2 mt-1">
                              {item.webResults.map((wr) => (
                                <div key={wr.id} className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                                  <div className="flex items-center gap-2">
                                    {wr.favicon && (
                                      <img src={wr.favicon} alt="" className="w-4 h-4" />
                                    )}
                                    <a
                                      href={wr.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline truncate flex-1"
                                    >
                                      {wr.title || wr.url}
                                    </a>
                                    <button
                                      onClick={() => handleParseEmails(wr.id)}
                                      disabled={parsingId === wr.id}
                                      className="btn-secondary !py-0.5 !px-1.5 text-xs flex items-center gap-1"
                                    >
                                      {parsingId === wr.id ? (
                                        <Loader2 size={10} className="animate-spin" />
                                      ) : (
                                        <Mail size={10} />
                                      )}
                                      Email
                                    </button>
                                  </div>
                                  {wr.parsedEmails.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {wr.parsedEmails.map((email) => (
                                        <span
                                          key={email}
                                          className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5"
                                        >
                                          {email}
                                          <button
                                            onClick={() => handleBanEmail(email)}
                                            className="text-red-400 hover:text-red-600"
                                            title="В чёрный список"
                                          >
                                            <Ban size={10} />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* All emails */}
                        {item.emails.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Все email ({item.emails.length}):
                            </label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.emails.map((e) => (
                                <span key={e} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded px-2 py-0.5">
                                  {e}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Letters tab */}
            {tab === 'letters' && (
              <div className="space-y-4">
                {letters.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                    Нет готовых писем. Нужно: AI-анализ + поиск сайтов + парсинг email.
                  </p>
                )}

                {letters.map((letter, li) => (
                  <div key={li} className="card">
                    {letter.tender && (
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/prozorro/${letter.tender.id}`}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-mono"
                        >
                          {letter.tender.tenderNumber}
                        </Link>
                        <span className="text-xs text-gray-500 truncate">{letter.tender.title}</span>
                      </div>
                    )}
                    <div className="mb-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Тема:</label>
                      <p className="text-sm font-medium">{letter.subject}</p>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Текст:</label>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap max-h-32 overflow-auto mt-0.5">
                        {letter.body}
                      </pre>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Получатели ({letter.emails.length}):
                      </label>
                      <div className="space-y-1 mt-1">
                        {letter.emails.map((email) => {
                          const key = `${email}:${letter.subject}`;
                          const isSent = sentEmails.has(key);
                          const isSending = sendingKey === key;

                          return (
                            <div key={email} className="flex items-center gap-2">
                              <span className="text-sm flex-1">{email}</span>
                              <button
                                onClick={() => handleSendEmail(email, letter.subject, letter.body)}
                                disabled={isSending || isSent}
                                className={`!py-0.5 !px-2 text-xs flex items-center gap-1 ${
                                  isSent ? 'btn-secondary text-green-600' : 'btn-primary'
                                }`}
                              >
                                {isSending ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : isSent ? (
                                  <Check size={10} />
                                ) : (
                                  <Send size={10} />
                                )}
                                {isSent ? 'Отправлено' : 'Отправить'}
                              </button>
                              <button
                                onClick={() => handleBanEmail(email)}
                                className="text-red-400 hover:text-red-600"
                                title="В чёрный список"
                              >
                                <Ban size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Blacklist tab */}
            {tab === 'blacklist' && (
              <div>
                {blacklist.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                    Чёрный список пуст
                  </p>
                )}
                <div className="space-y-1">
                  {blacklist.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 py-1.5 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <span className="text-sm flex-1">{entry.email}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      <button
                        onClick={() => handleUnban(entry.email)}
                        className="text-red-400 hover:text-red-600"
                        title="Удалить из ЧС"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
