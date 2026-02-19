'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { SearchQueryRecord, PaginatedResponse } from '@/types';
import { History, ChevronLeft, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatQueryParams(params: Record<string, unknown>): string {
  const parts: string[] = [];
  if (params.objectInfo) parts.push(`"${params.objectInfo}"`);
  if (params.stage) parts.push(`Этап: ${params.stage}`);
  if (params.region) parts.push(`Регион: ${params.region}`);
  if (params.priceGe) parts.push(`Цена от: ${params.priceGe}`);
  if (params.priceLe) parts.push(`Цена до: ${params.priceLe}`);
  if (params.publishedAfter) parts.push(`После: ${params.publishedAfter}`);
  if (params.publishedBefore) parts.push(`До: ${params.publishedBefore}`);
  return parts.length > 0 ? parts.join(', ') : 'Пустой запрос';
}

export default function SearchQueriesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SearchQueryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<SearchQueryRecord>>(
        `/purchases/search-queries?page=${page}&limit=${limit}`,
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
      <Header title="История поисковых запросов" user={user} />
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
            <History size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Поисковых запросов пока нет</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Выполните поиск закупок, и запросы появятся здесь
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {data.map((query) => (
                <div key={query.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Search size={14} className="text-primary-500 shrink-0" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatQueryParams(query.queryParams)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(query.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                        {query.resultsCount} результатов
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Всего: {total}
                </p>
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
