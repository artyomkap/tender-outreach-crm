'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { PurchaseAiResult, PaginatedResponse } from '@/types';
import {
  Mail,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';

export default function LettersPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PurchaseAiResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<PurchaseAiResult>>(
        `/purchases/ai-results?page=${page}&limit=${limit}`,
      );
      setData(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  if (!user) return null;

  return (
    <>
      <Header title="Подготовленные письма" user={user} />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/purchases"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Назад к поиску
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="card text-center py-12">
            <Mail size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Подготовленных писем пока нет</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Запустите AI-анализ (Prepare) для закупки
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {data.map((item) => (
                <div key={item.id} className="card">
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={16} className="text-blue-500 shrink-0" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.subject || 'Без темы'}
                        </p>
                      </div>
                      {item.purchase && (
                        <Link
                          href={`/purchases/${item.purchase.purchaseNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          {item.purchase.purchaseNumber}
                          <ExternalLink size={10} />
                        </Link>
                      )}
                      {item.searchTerm && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Search size={12} className="text-violet-400" />
                          <span className="text-xs text-gray-400">{item.searchTerm.term}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="shrink-0 text-gray-400">
                      {expandedId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {expandedId === item.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      {item.subject && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Тема</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{item.subject}</p>
                        </div>
                      )}

                      {item.body && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare size={12} className="text-emerald-500" />
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Содержание</p>
                          </div>
                          <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-sans leading-relaxed">
                            {item.body}
                          </pre>
                        </div>
                      )}

                      {item.searchTerm && (
                        <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Поисковый запрос</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{item.searchTerm.term}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Всего: {total}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary !py-1.5 !px-3 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
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
