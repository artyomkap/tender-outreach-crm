'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Purchase } from '@/types';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

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

  const [form, setForm] = useState({
    objectInfo: '',
    region: '52',
    stage: '1',
    publishedAfter: '',
    publishedBefore: '',
    priceGe: '',
    priceLe: '',
    limit: '20',
  });

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!form.objectInfo.trim()) return;

      setLoading(true);
      setError('');
      setSearched(true);

      try {
        const params = new URLSearchParams();
        params.set('objectInfo', form.objectInfo.trim());
        params.set('limit', form.limit);
        params.set('skip', '0');
        if (form.stage) params.set('stage', form.stage);
        if (form.region) params.set('region', form.region);
        if (form.publishedAfter) params.set('publishedAfter', form.publishedAfter);
        if (form.publishedBefore) params.set('publishedBefore', form.publishedBefore);
        if (form.priceGe) params.set('priceGe', form.priceGe);
        if (form.priceLe) params.set('priceLe', form.priceLe);

        const data = await api.get<Purchase[]>(`/purchases/search?${params.toString()}`);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка поиска');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

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
                required
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
                  placeholder="52"
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

        {/* History link */}
        <div className="flex items-center justify-between mb-4">
          {searched && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Найдено: <span className="font-medium text-gray-700 dark:text-gray-300">{results.length}</span>
            </p>
          )}
          <Link
            href="/purchases/history"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors ml-auto"
          >
            <Clock size={16} />
            История просмотров
          </Link>
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
                        № {purchase.purchaseNumber}
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
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatPrice(purchase.maxPrice, purchase.currencyCode)}
                    </p>
                    <Link
                      href={`/purchases/${purchase.purchaseNumber}`}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
                    >
                      Подробнее <ExternalLink size={12} />
                    </Link>
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
