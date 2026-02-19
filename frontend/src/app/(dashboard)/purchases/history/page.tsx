'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { UserPurchaseHistory, PaginatedResponse } from '@/types';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return '—';
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${formatted} ${currency || '₽'}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PurchaseHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<UserPurchaseHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<UserPurchaseHistory>>(
        `/purchases/history?page=${page}&limit=${limit}`,
      );
      setHistory(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!user) return null;

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header title="История просмотров" user={user} />
      <div className="p-6">
        <Link
          href="/purchases"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Назад к поиску
        </Link>

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Всего просмотров:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>
          </p>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Номер закупки
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Описание
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Поисковый запрос
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Цена
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Дата просмотра
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Clock size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-gray-400">История просмотров пуста</p>
                      <Link
                        href="/purchases"
                        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
                      >
                        <Search size={14} />
                        Перейти к поиску
                      </Link>
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/purchases/${item.purchase.purchaseNumber}`}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium transition-colors"
                        >
                          {item.purchase.purchaseNumber}
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-700 dark:text-gray-300 truncate max-w-xs">
                          {item.purchase.objectInfo || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {item.searchQuery ? (
                          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 text-xs">
                            <Search size={12} />
                            {item.searchQuery}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatPrice(item.purchase.maxPrice, item.purchase.currencyCode)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                        {formatDateTime(item.foundAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Страница {page} из {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary !py-2 !px-3 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary !py-2 !px-3 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
