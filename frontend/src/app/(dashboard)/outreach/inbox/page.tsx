'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { OutreachCampaignEmail } from '@/types';
import {
  MessageSquare,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  Send,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OutreachInboxPage() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<OutreachCampaignEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const limit = 20;

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ data: OutreachCampaignEmail[]; total: number }>(
        `/outreach/inbox?page=${page}&limit=${limit}`,
      );
      setEmails(data.data);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleCheckReplies = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await api.post<{ checked: number; newReplies: number; errors: string[] }>(
        '/outreach/inbox/check-replies',
      );
      if (result.newReplies > 0) {
        setCheckResult(`Найдено новых ответов: ${result.newReplies}`);
        fetchInbox();
      } else if (result.errors.length > 0 && result.checked === 0) {
        setCheckResult(result.errors[0]);
      } else {
        setCheckResult('Новых ответов не найдено');
      }
    } catch {
      setCheckResult('Ошибка при проверке почты');
    } finally {
      setChecking(false);
      setTimeout(() => setCheckResult(null), 5000);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (!user) return null;

  return (
    <>
      <Header title="Входящие ответы" user={user} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/outreach"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
          >
            <ArrowLeft size={16} /> Назад
          </Link>
          <div className="flex items-center gap-3">
            {checkResult && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{checkResult}</span>
            )}
            <button
              onClick={handleCheckReplies}
              disabled={checking}
              className="btn-secondary !py-1.5 !px-3 flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Проверяю...' : 'Проверить почту'}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Всего ответов: <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : emails.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Ответов пока нет</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Когда получатели ответят на ваши письма, ответы появятся здесь
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {emails.map((email) => (
                <div key={email.id} className="card">
                  <div
                    className="flex items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
                        <MessageSquare size={16} className="text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {email.toEmail}
                          </p>
                          {email.subject && (
                            <span className="text-xs text-gray-500 truncate">
                              Re: {email.subject}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> Ответ: {formatDateTime(email.repliedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Send size={10} /> Отправлено: {formatDateTime(email.sentAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expandedId === email.id ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    )}
                  </div>

                  {expandedId === email.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                      {/* Original message */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Ваше письмо:
                        </p>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          {email.subject && (
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {email.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {email.body}
                          </p>
                        </div>
                      </div>

                      {/* Reply */}
                      {email.replyText && (
                        <div>
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                            Ответ:
                          </p>
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                              {email.replyText}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Страница {page} из {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary !py-1.5 !px-3 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary !py-1.5 !px-3 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
