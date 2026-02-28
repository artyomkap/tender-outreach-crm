'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { ProzorroTender, ProzorroSearchResponse } from '@/types';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Sparkles,
  Send,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'active.tendering', label: 'Прийом пропозицій' },
  { value: 'active.qualification', label: 'Кваліфікація' },
  { value: 'active.awarded', label: 'Визначение переможця' },
  { value: 'complete', label: 'Завершена' },
];

function formatPrice(amount: number | null, currency: string | null): string {
  if (amount === null) return '—';
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency || 'UAH'}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function statusBadge(status: string | null) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    'active.tendering': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Прийом пропозицій' },
    'active.qualification': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Кваліфікація' },
    'active.awarded': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Визначення переможця' },
    'complete': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Завершена' },
  };
  const s = map[status || ''] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: status || '—' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function ProzorroPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<ProzorroTender[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    query: '',
    status: '',
    limit: '20',
  });

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setLoading(true);
      setError('');
      setSearched(true);

      try {
        const params = new URLSearchParams();
        if (form.query.trim()) params.set('query', form.query.trim());
        if (form.status) params.set('status', form.status);
        params.set('limit', form.limit);

        const data = await api.get<ProzorroSearchResponse>(`/prozorro/search?${params.toString()}`);
        setResults(data.results);
        setScannedCount(data.scannedCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка поиска');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  const handlePrepare = useCallback(async (tenderId: string) => {
    if (preparingId) return;
    setPreparingId(tenderId);
    try {
      await api.post(`/prozorro/tender/${tenderId}/prepare`, {});
      alert('AI-анализ завершён');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка AI-анализа');
    } finally {
      setPreparingId(null);
    }
  }, [preparingId]);

  if (!user) return null;

  return (
    <>
      <Header title="Закупки Украина (Prozorro)" user={user} />
      <div className="p-6">
        {/* Search form */}
        <form onSubmit={handleSearch} className="card mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Пошук за назвою тендера..."
                value={form.query}
                onChange={(e) => setForm((p) => ({ ...p, query: e.target.value }))}
                className="input-field !pl-10"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Искать
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="btn-secondary flex items-center gap-1"
            >
              Фильтры
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="input-field"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Лимит</label>
                <select
                  value={form.limit}
                  onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))}
                  className="input-field"
                >
                  {['10', '20', '50'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Navigation */}
        <div className="flex gap-3 mb-4">
          <Link href="/prozorro/outreach" className="btn-secondary flex items-center gap-2 text-sm">
            <Send size={14} /> Воронка рассылки
          </Link>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {searched && !loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Найдено: {results.length} {scannedCount > 0 && `(просканировано ${scannedCount} тендеров)`}
          </div>
        )}

        <div className="space-y-3">
          {results.map((tender) => (
            <div key={tender.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/prozorro/${tender.prozorroId}`}
                      className="text-sm font-mono text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {tender.tenderNumber}
                    </Link>
                    {statusBadge(tender.status)}
                    {tender.procurementMethodType && (
                      <span className="text-xs text-gray-400">{tender.procurementMethodType}</span>
                    )}
                  </div>
                  <Link
                    href={`/prozorro/${tender.prozorroId}`}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2"
                  >
                    {tender.title}
                  </Link>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {tender.procuringEntityName && (
                      <span>Замовник: {tender.procuringEntityName}</span>
                    )}
                    {tender.tenderPeriodEnd && (
                      <span>До: {formatDate(tender.tenderPeriodEnd)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(tender.amount, tender.currency)}
                  </div>
                  <div className="flex gap-1">
                    <a
                      href={`https://prozorro.gov.ua/tender/${tender.tenderNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Prozorro
                    </a>
                    <button
                      onClick={() => handlePrepare(tender.id)}
                      disabled={preparingId === tender.id}
                      className="btn-primary !py-1 !px-2 text-xs flex items-center gap-1"
                    >
                      {preparingId === tender.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      AI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {searched && !loading && results.length === 0 && !error && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            Ничего не найдено
          </div>
        )}
      </div>
    </>
  );
}
