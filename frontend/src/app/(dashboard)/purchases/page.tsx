'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Purchase, SearchResponse } from '@/types';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  FolderSearch,
  X,
  Star,
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

const CACHE_KEY = 'purchases_last_search';

interface SearchCache {
  paramsString: string;
  results: Purchase[];
  pipelineCounts: Record<string, any>;
}

function loadCache(): SearchCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(cache: SearchCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

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

function PurchasesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialized = useRef(false);

  const [results, setResults] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, any>>({});
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    objectInfo: searchParams.get('objectInfo') || '',
    region: searchParams.get('region') || '',
    stage: searchParams.get('stage') || '',
    publishedAfter: searchParams.get('publishedAfter') || '',
    publishedBefore: searchParams.get('publishedBefore') || '',
    priceGe: searchParams.get('priceGe') || '',
    priceLe: searchParams.get('priceLe') || '',
    limit: searchParams.get('limit') || '20',
  });

  // Restore from cache or auto-search on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const cache = loadCache();
    if (cache && cache.results.length > 0) {
      const cachedParams = new URLSearchParams(cache.paramsString);
      setForm({
        objectInfo: cachedParams.get('objectInfo') || '',
        region: cachedParams.get('region') || '',
        stage: cachedParams.get('stage') || '',
        publishedAfter: cachedParams.get('publishedAfter') || '',
        publishedBefore: cachedParams.get('publishedBefore') || '',
        priceGe: cachedParams.get('priceGe') || '',
        priceLe: cachedParams.get('priceLe') || '',
        limit: cachedParams.get('limit') || '20',
      });
      setResults(cache.results);
      setPipelineCounts(cache.pipelineCounts || {});
      setSearched(true);
      if (!searchParams.toString()) {
        router.replace(`/purchases?${cache.paramsString}`);
      }
      return;
    }

    if (searchParams.get('objectInfo')) {
      doSearch(form);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = useCallback(async (f: typeof form) => {
    setLoading(true);
    setError('');
    setSearched(true);

    const params = new URLSearchParams();
    if (f.objectInfo.trim()) params.set('objectInfo', f.objectInfo.trim());
    params.set('limit', f.limit);
    params.set('skip', '0');
    if (f.stage) params.set('stage', f.stage);
    if (f.region) params.set('region', f.region);
    if (f.publishedAfter) params.set('publishedAfter', f.publishedAfter);
    if (f.publishedBefore) params.set('publishedBefore', f.publishedBefore);
    if (f.priceGe) params.set('priceGe', f.priceGe);
    if (f.priceLe) params.set('priceLe', f.priceLe);

    try {
      const data = await api.get<SearchResponse>(`/purchases/search?${params.toString()}`);
      setResults(data.results);

      let counts: Record<string, any> = {};
      if (data.results.length > 0) {
        const ids = data.results.map((p) => p.id).join(',');
        counts = await api.get<Record<string, any>>(`/purchases/pipeline-counts?ids=${ids}`).catch(() => ({}));
        setPipelineCounts(counts);
      } else {
        setPipelineCounts({});
      }

      // Save to cache
      const urlParamsStr = new URLSearchParams();
      if (f.objectInfo.trim()) urlParamsStr.set('objectInfo', f.objectInfo.trim());
      if (f.limit !== '20') urlParamsStr.set('limit', f.limit);
      if (f.stage) urlParamsStr.set('stage', f.stage);
      if (f.region) urlParamsStr.set('region', f.region);
      if (f.publishedAfter) urlParamsStr.set('publishedAfter', f.publishedAfter);
      if (f.publishedBefore) urlParamsStr.set('publishedBefore', f.publishedBefore);
      if (f.priceGe) urlParamsStr.set('priceGe', f.priceGe);
      if (f.priceLe) urlParamsStr.set('priceLe', f.priceLe);
      saveCache({ paramsString: urlParamsStr.toString(), results: data.results, pipelineCounts: counts });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      clearCache();

      const urlParams = new URLSearchParams();
      if (form.objectInfo.trim()) urlParams.set('objectInfo', form.objectInfo.trim());
      if (form.limit !== '20') urlParams.set('limit', form.limit);
      if (form.stage) urlParams.set('stage', form.stage);
      if (form.region) urlParams.set('region', form.region);
      if (form.publishedAfter) urlParams.set('publishedAfter', form.publishedAfter);
      if (form.publishedBefore) urlParams.set('publishedBefore', form.publishedBefore);
      if (form.priceGe) urlParams.set('priceGe', form.priceGe);
      if (form.priceLe) urlParams.set('priceLe', form.priceLe);
      router.replace(`/purchases?${urlParams.toString()}`);

      await doSearch(form);
    },
    [form, router, doSearch],
  );

  const handleClear = useCallback(() => {
    clearCache();
    setResults([]);
    setSearched(false);
    setError('');
    setForm({ objectInfo: '', region: '', stage: '', publishedAfter: '', publishedBefore: '', priceGe: '', priceLe: '', limit: '20' });
    router.replace('/purchases');
  }, [router]);

  const refreshPipelineCounts = useCallback(() => {
    if (results.length > 0) {
      const ids = results.map((p) => p.id).join(',');
      api.get<Record<string, any>>(`/purchases/pipeline-counts?ids=${ids}`)
        .then((counts) => {
          setPipelineCounts(counts);
          const cache = loadCache();
          if (cache) saveCache({ ...cache, pipelineCounts: counts });
        })
        .catch(() => {});
    }
  }, [results]);

  const toggleFavorite = useCallback(async (purchaseId: string) => {
    try {
      const res = await api.post<{ isFavorite: boolean }>(`/purchases/favorites/${purchaseId}`, {});
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(purchaseId); else next.delete(purchaseId);
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const handleApprove = useCallback(async (purchaseId: string, data: { emails: string[]; subject: string; body: string }) => {
    try {
      await api.post(`/purchases/${purchaseId}/approve-to-outreach`, data);
      setApprovedIds((prev) => new Set(Array.from(prev).concat(purchaseId)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка создания кампании');
    }
  }, []);

  if (!user) return null;

  return (
    <>
      <Header title="Тендеры" user={user} />
      <div className="p-3 sm:p-6">
        {/* Search form */}
        <form onSubmit={handleSearch} className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mt-3 transition-colors"
          >
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Дополнительные фильтры
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Регион</label>
                <input type="number" min="0" value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value.replace('-', '') }))} className="input-field" placeholder="Все" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Этап</label>
                <select value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))} className="input-field">
                  <option value="">Все</option>
                  <option value="1">Подача заявок</option>
                  <option value="2">Работа комиссии</option>
                  <option value="3">Закупка завершена</option>
                  <option value="4">Закупка отменена</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Опубликовано после</label>
                <input type="date" value={form.publishedAfter} onChange={(e) => setForm((p) => ({ ...p, publishedAfter: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Опубликовано до</label>
                <input type="date" value={form.publishedBefore} onChange={(e) => setForm((p) => ({ ...p, publishedBefore: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цена от</label>
                <input type="number" min="0" value={form.priceGe} onChange={(e) => setForm((p) => ({ ...p, priceGe: e.target.value.replace('-', '') }))} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цена до</label>
                <input type="number" min="0" value={form.priceLe} onChange={(e) => setForm((p) => ({ ...p, priceLe: e.target.value.replace('-', '') }))} className="input-field" placeholder="10000000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Результатов</label>
                <select value={form.limit} onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))} className="input-field">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Results bar */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {searched && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Найдено: <span className="font-medium text-gray-700 dark:text-gray-300">{results.length}</span>
              </p>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={14} />
                Очистить поиск
              </button>
            </>
          )}
          <div className="flex items-center gap-4 ml-auto">
            <Link href="/purchases/found" className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              <FolderSearch size={16} />
              Найденные
            </Link>
          </div>
        </div>

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
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((purchase) => (
              <div key={purchase.id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <Link
                        href={`/purchases/${purchase.purchaseNumber}`}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm transition-colors break-all"
                      >
                        {purchase.purchaseNumber}
                      </Link>
                      {purchase.stage !== null && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          purchase.stage === 1 ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : purchase.stage === 3 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          : purchase.stage === 4 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {STAGE_LABELS[purchase.stage] || `Этап ${purchase.stage}`}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed line-clamp-3">
                      {purchase.objectInfo || 'Без описания'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {purchase.publishedAt && <span>Опубликовано: {formatDate(purchase.publishedAt)}</span>}
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
                  <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto sm:min-w-[150px]">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 text-left sm:text-right break-words">
                      {formatPrice(purchase.maxPrice, purchase.currencyCode)}
                    </p>
                      <div className="flex flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 sm:justify-end">
                      <MagicButtonCompact
                        purchaseId={purchase.id}
                        purchase={purchase}
                        onComplete={refreshPipelineCounts}
                        onApprove={(data) => handleApprove(purchase.id, data)}
                      />
                        <button
                          onClick={() => toggleFavorite(purchase.id)}
                          className={`p-1.5 rounded-md transition-colors ${favoritedIds.has(purchase.id) ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
                          title={favoritedIds.has(purchase.id) ? 'Убрать из избранного' : 'В избранное'}
                        >
                          <Star size={15} fill={favoritedIds.has(purchase.id) ? 'currentColor' : 'none'} />
                        </button>
                        <Link
                          href={`/purchases/${purchase.purchaseNumber}`}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-md transition-colors"
                        >
                        Открыть <ExternalLink size={12} />
                      </Link>
                    </div>
                    {approvedIds.has(purchase.id) && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Отправлено в рассылку
                      </span>
                    )}
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

export default function PurchasesPage() {
  return (
    <Suspense>
      <PurchasesContent />
    </Suspense>
  );
}
