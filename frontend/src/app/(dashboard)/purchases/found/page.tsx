'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { FoundPurchase, PaginatedResponse, PurchaseAiResult } from '@/types';
import {
  FolderSearch,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Star,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import MagicButtonCompact from '@/components/magic-button-compact';
import PipelineStatusBar from '@/components/pipeline-status';

const STAGE_LABELS: Record<number, string> = {
  1: 'Подача заявок',
  2: 'Работа комиссии',
  3: 'Закупка завершена',
  4: 'Закупка отменена',
};

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return '—';
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${formatted} ${currency || '₽'}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function FoundPurchasesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FoundPurchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<FoundPurchase>>(
        `/purchases/found?page=${page}&limit=${limit}`,
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

  const [preparingId, setPreparingId] = useState<string | null>(null);

  const handlePrepare = useCallback(async (purchaseId: string) => {
    if (preparingId) return;
    setPreparingId(purchaseId);
    try {
      await api.post<PurchaseAiResult>(`/purchases/${purchaseId}/prepare`, {});
      alert('AI-анализ завершён');
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка AI-анализа');
    } finally {
      setPreparingId(null);
    }
  }, [preparingId, fetchData]);

  const toggleFavorite = useCallback(async (purchaseId: string) => {
    try {
      const res = await api.post<{ isFavorite: boolean }>(`/purchases/favorites/${purchaseId}`, {});
      setData((prev) =>
        prev.map((item) =>
          item.purchaseId === purchaseId ? { ...item, isFavorite: res.isFavorite } : item,
        ),
      );
    } catch {
      // ignore
    }
  }, []);

  const totalPages = Math.ceil(total / limit);

  if (!user) return null;

  return (
    <>
      <Header title="Найденные закупки" user={user} />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/purchases"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Назад к поиску
          </Link>
          <Link
            href="/purchases/favorites"
            className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors ml-auto"
          >
            <Star size={16} />
            Избранное
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="card text-center py-12">
            <FolderSearch size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Найденных закупок пока нет</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Выполните поиск, и найденные закупки появятся здесь
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {data.map((item) => (
                <div key={item.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/purchases/${item.purchase.purchaseNumber}`}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm transition-colors"
                        >
                          {item.purchase.purchaseNumber}
                        </Link>
                        {item.purchase.stage !== null && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.purchase.stage === 1
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : item.purchase.stage === 3
                                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                  : item.purchase.stage === 4
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {STAGE_LABELS[item.purchase.stage] || `Этап ${item.purchase.stage}`}
                          </span>
                        )}
                        {item.isFavorite && (
                          <Star size={14} className="text-amber-500" fill="currentColor" />
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed line-clamp-2">
                        {item.purchase.objectInfo || 'Без описания'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Найдено: {formatDate(item.createdAt)}</span>
                        {item.purchase.publishedAt && (
                          <span>Опубликовано: {formatDate(item.purchase.publishedAt)}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <PipelineStatusBar
                          purchaseId={item.purchase.id}
                          savedDocsCount={item.savedDocsCount}
                          totalDocsCount={item.totalDocsCount}
                          aiResult={item.aiResult}
                          sitesCount={item.sitesCount}
                          emailsCount={item.emailsCount}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatPrice(item.purchase.maxPrice, item.purchase.currencyCode)}
                      </p>
                      <div className="flex items-center gap-2">
                        <MagicButtonCompact
                          purchaseId={item.purchase.id}
                          onComplete={fetchData}
                        />
                        <button
                          onClick={() => handlePrepare(item.purchase.id)}
                          disabled={preparingId === item.purchase.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-50"
                          title="AI-анализ"
                        >
                          {preparingId === item.purchase.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          Prepare
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.purchaseId)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.isFavorite
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-gray-400 hover:text-amber-500'
                          }`}
                          title={item.isFavorite ? 'Убрать из избранного' : 'В избранное'}
                        >
                          <Star size={18} fill={item.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <Link
                          href={`/purchases/${item.purchase.purchaseNumber}`}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
                        >
                          Подробнее <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
