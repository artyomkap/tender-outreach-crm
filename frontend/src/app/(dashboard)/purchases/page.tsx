'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Purchase, SearchResponse, PurchaseAiResult } from '@/types';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Clock,
  Star,
  History,
  FolderSearch,
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

export default function PurchasesPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, any>>({});

  const [form, setForm] = useState({
    objectInfo: '',
    region: '',
    stage: '',
    publishedAfter: '',
    publishedBefore: '',
    priceGe: '',
    priceLe: '',
    limit: '20',
  });

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      setLoading(true);
      setError('');
      setSearched(true);
      setDebugUrl('');

      try {
        const params = new URLSearchParams();
        if (form.objectInfo.trim()) params.set('objectInfo', form.objectInfo.trim());
        params.set('limit', form.limit);
        params.set('skip', '0');
        if (form.stage) params.set('stage', form.stage);
        if (form.region) params.set('region', form.region);
        if (form.publishedAfter) params.set('publishedAfter', form.publishedAfter);
        if (form.publishedBefore) params.set('publishedBefore', form.publishedBefore);
        if (form.priceGe) params.set('priceGe', form.priceGe);
        if (form.priceLe) params.set('priceLe', form.priceLe);

        const data = await api.get<SearchResponse>(`/purchases/search?${params.toString()}`);
        setResults(data.results);
        setDebugUrl(data.debugUrl);

        // Fetch pipeline counts for all results
        if (data.results.length > 0) {
          const ids = data.results.map((p) => p.id).join(',');
          api.get<Record<string, any>>(`/purchases/pipeline-counts?ids=${ids}`)
            .then(setPipelineCounts)
            .catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка поиска');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  const refreshPipelineCounts = useCallback(() => {
    if (results.length > 0) {
      const ids = results.map((p) => p.id).join(',');
      api.get<Record<string, any>>(`/purchases/pipeline-counts?ids=${ids}`)
        .then(setPipelineCounts)
        .catch(() => {});
    }
  }, [results]);

  const [preparingId, setPreparingId] = useState<string | null>(null);

  const handlePrepare = useCallback(async (purchaseId: string) => {
    if (preparingId) return;
    setPreparingId(purchaseId);
    try {
      await api.post<PurchaseAiResult>(`/purchases/${purchaseId}/prepare`, {});
      alert('AI-анализ завершён');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка AI-анализа');
    } finally {
      setPreparingId(null);
    }
  }, [preparingId]);

  const toggleFavorite = useCallback(async (purchaseId: string) => {
    try {
      const res = await api.post<{ isFavorite: boolean }>(`/purchases/favorites/${purchaseId}`, {});
      setFavorites((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) {
          next.add(purchaseId);
        } else {
          next.delete(purchaseId);
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  if (!user) return null;

  return (
    <>
      <Header title="Закупки" user={user} />
      <div className="p-6">
        {/* Search form */}
        <form onSubmit={handleSearch} className="card mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Поиск по наименованию закупки..."
                value={form.objectInfo}
                onChange={(e) => setForm((p) => ({ ...p, objectInfo: e.target.value }))}
                className="input-field !pl-10"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Поиск...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Найти
                </>
              )}
            </button>
          </div>

          {/* Toggle filters */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mt-3 transition-colors"
          >
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Дополнительные фильтры
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Регион
                </label>
                <input
                  type="number"
                  value={form.region}
                  onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                  className="input-field"
                  placeholder="Все"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Этап
                </label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Все</option>
                  <option value="1">Подача заявок</option>
                  <option value="2">Работа комиссии</option>
                  <option value="3">Закупка завершена</option>
                  <option value="4">Закупка отменена</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Опубликовано после
                </label>
                <input
                  type="date"
                  value={form.publishedAfter}
                  onChange={(e) => setForm((p) => ({ ...p, publishedAfter: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Опубликовано до
                </label>
                <input
                  type="date"
                  value={form.publishedBefore}
                  onChange={(e) => setForm((p) => ({ ...p, publishedBefore: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Цена от
                </label>
                <input
                  type="number"
                  value={form.priceGe}
                  onChange={(e) => setForm((p) => ({ ...p, priceGe: e.target.value }))}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Цена до
                </label>
                <input
                  type="number"
                  value={form.priceLe}
                  onChange={(e) => setForm((p) => ({ ...p, priceLe: e.target.value }))}
                  className="input-field"
                  placeholder="10000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Результатов
                </label>
                <select
                  value={form.limit}
                  onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))}
                  className="input-field"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Navigation links */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {searched && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Найдено: <span className="font-medium text-gray-700 dark:text-gray-300">{results.length}</span>
            </p>
          )}
          <div className="flex items-center gap-4 ml-auto">
            <Link
              href="/purchases/search-queries"
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <History size={16} />
              История запросов
            </Link>
            <Link
              href="/purchases/found"
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <FolderSearch size={16} />
              Найденные
            </Link>
            <Link
              href="/purchases/favorites"
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              <Star size={16} />
              Избранное
            </Link>
            <Link
              href="/purchases/history"
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <Clock size={16} />
              История просмотров
            </Link>
          </div>
        </div>

        {/* Debug URL */}
        {debugUrl && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Debug URL:</p>
            <a
              href={debugUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline break-all font-mono"
            >
              {debugUrl}
            </a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="card text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Закупки не найдены</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((purchase) => (
              <div key={purchase.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/purchases/${purchase.purchaseNumber}`}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm transition-colors"
                      >
                        {purchase.purchaseNumber}
                      </Link>
                      {purchase.stage !== null && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            purchase.stage === 1
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : purchase.stage === 3
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                : purchase.stage === 4
                                  ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {STAGE_LABELS[purchase.stage] || `Этап ${purchase.stage}`}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed line-clamp-3">
                      {purchase.objectInfo || 'Без описания'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {purchase.publishedAt && (
                        <span>Опубликовано: {formatDate(purchase.publishedAt)}</span>
                      )}
                      {purchase.purchaseType && <span>{purchase.purchaseType}</span>}
                      {purchase.customers && purchase.customers.length > 0 && (
                        <span className="truncate max-w-xs">{purchase.customers[0]}</span>
                      )}
                    </div>
                    {pipelineCounts[purchase.id] && (
                      <div className="mt-2">
                        <PipelineStatusBar
                          purchaseId={purchase.id}
                          savedDocsCount={pipelineCounts[purchase.id].savedDocsCount}
                          totalDocsCount={pipelineCounts[purchase.id].totalDocsCount}
                          aiResult={pipelineCounts[purchase.id].aiResult}
                          sitesCount={pipelineCounts[purchase.id].sitesCount}
                          emailsCount={pipelineCounts[purchase.id].emailsCount}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatPrice(purchase.maxPrice, purchase.currencyCode)}
                    </p>
                    <div className="flex items-center gap-2">
                      <MagicButtonCompact purchaseId={purchase.id} onComplete={refreshPipelineCounts} />
                      <button
                        onClick={() => handlePrepare(purchase.id)}
                        disabled={preparingId === purchase.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-50"
                        title="AI-анализ"
                      >
                        {preparingId === purchase.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        Prepare
                      </button>
                      <button
                        onClick={() => toggleFavorite(purchase.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          favorites.has(purchase.id)
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-gray-400 hover:text-amber-500'
                        }`}
                        title={favorites.has(purchase.id) ? 'Убрать из избранного' : 'В избранное'}
                      >
                        <Star size={18} fill={favorites.has(purchase.id) ? 'currentColor' : 'none'} />
                      </button>
                      <Link
                        href={`/purchases/${purchase.purchaseNumber}`}
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
        )}
      </div>
    </>
  );
}
