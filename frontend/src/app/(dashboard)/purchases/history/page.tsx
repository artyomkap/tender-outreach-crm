'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { UserPurchaseHistory, PaginatedResponse } from '@/types';
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return '—';
  return `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)} ${currency || '₽'}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface Group {
  key: string;       // searchQuery string or '__null__'
  label: string;
  items: UserPurchaseHistory[];
  lastDate: string;
}

export default function PurchaseHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<UserPurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<UserPurchaseHistory>>(
        '/purchases/history?page=1&limit=500',
      );
      setHistory(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const item of history) {
      const key = item.searchQuery ?? '__null__';
      const label = item.searchQuery || 'Без поискового запроса';
      if (!map.has(key)) {
        map.set(key, { key, label, items: [], lastDate: item.foundAt });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [history]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDeleteGroup = async (key: string, label: string | null) => {
    if (!confirm(`Удалить всю историю по запросу "${label || 'Без поискового запроса'}"?`)) return;
    setDeletingGroup(key);
    try {
      const q = key === '__null__' ? '' : encodeURIComponent(key);
      await api.delete(`/purchases/history/by-query${q ? `?q=${q}` : ''}`);
      setHistory((prev) => prev.filter((item) => (item.searchQuery ?? '__null__') !== key));
    } catch {
      // ignore
    } finally {
      setDeletingGroup(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.delete(`/purchases/history/${id}`);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  return (
    <>
      <Header title="История просмотров" user={user} />
      <div className="p-6">
        <Link
          href="/purchases"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Назад к поиску
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : history.length === 0 ? (
          <div className="card text-center py-12">
            <Clock size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">История просмотров пуста</p>
            <Link href="/purchases" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2">
              <Search size={14} /> Перейти к поиску
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.key);
              return (
                <div key={group.key} className="card p-0 overflow-hidden">
                  {/* Group header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0">
                      <Search size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {group.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {group.items.length} {group.items.length === 1 ? 'просмотр' : group.items.length < 5 ? 'просмотра' : 'просмотров'} · Последний: {formatDate(group.lastDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteGroup(group.key, group.key === '__null__' ? null : group.label)}
                        disabled={deletingGroup === group.key}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                        title="Очистить группу"
                      >
                        {deletingGroup === group.key ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        Очистить
                      </button>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    )}
                  </div>

                  {/* Group items */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/purchases/${item.purchase.purchaseNumber}`}
                                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium transition-colors"
                              >
                                {item.purchase.purchaseNumber}
                                <ExternalLink size={11} />
                              </Link>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                              {item.purchase.objectInfo || '—'}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0">
                            {formatPrice(item.purchase.maxPrice, item.purchase.currencyCode)}
                          </p>
                          <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                            {formatDateTime(item.foundAt)}
                          </p>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
