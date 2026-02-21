'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { AiSearchTerm, PaginatedResponse, WebSearchResult } from '@/types';
import {
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

export default function SearchTermsPage() {
  const { user } = useAuth();
  const [terms, setTerms] = useState<AiSearchTerm[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, WebSearchResult[]>>({});
  const limit = 20;

  const fetchTerms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<AiSearchTerm>>(
        `/purchases/ai-search-terms?page=${page}&limit=${limit}`,
      );
      setTerms(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleSearch = useCallback(async (term: AiSearchTerm) => {
    setSearchingId(term.id);
    try {
      const results = await api.post<WebSearchResult[]>(`/purchases/web-search/${term.id}`, {});
      setSearchResults((prev) => ({ ...prev, [term.id]: results }));
      setExpandedId(term.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setSearchingId(null);
    }
  }, []);

  const loadResults = useCallback(async (termId: string) => {
    if (searchResults[termId]) {
      setExpandedId(expandedId === termId ? null : termId);
      return;
    }
    try {
      const results = await api.get<WebSearchResult[]>(`/purchases/web-search/${termId}/results`);
      setSearchResults((prev) => ({ ...prev, [termId]: results }));
      setExpandedId(termId);
    } catch {
      setExpandedId(expandedId === termId ? null : termId);
    }
  }, [searchResults, expandedId]);

  const totalPages = Math.ceil(total / limit);

  if (!user) return null;

  return (
    <>
      <Header title="Поисковые запросы AI" user={user} />
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
        ) : terms.length === 0 ? (
          <div className="card text-center py-12">
            <Search size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Поисковых запросов пока нет</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Запустите AI-анализ (Prepare) для закупки, чтобы получить поисковые запросы
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {terms.map((term) => (
                <div key={term.id} className="card">
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => loadResults(term.id)}
                    >
                      <Search size={18} className="text-violet-500 shrink-0" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {term.term}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSearch(term)}
                      disabled={searchingId === term.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors shrink-0 disabled:opacity-50"
                    >
                      {searchingId === term.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Globe size={14} />
                      )}
                      {searchingId === term.id ? 'Поиск...' : 'Искать'}
                    </button>
                  </div>

                  {/* Search results */}
                  {expandedId === term.id && searchResults[term.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      {searchResults[term.id].length === 0 ? (
                        <p className="text-sm text-gray-400">Результатов нет</p>
                      ) : (
                        searchResults[term.id].map((result) => (
                          <div
                            key={result.id}
                            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                          >
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                            >
                              {result.title || result.url}
                              <ExternalLink size={12} />
                            </a>
                            {result.snippet && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {result.snippet}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1 truncate">{result.url}</p>
                          </div>
                        ))
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
