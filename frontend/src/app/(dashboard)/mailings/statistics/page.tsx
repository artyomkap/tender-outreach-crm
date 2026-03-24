'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { autosendingApi } from '@/lib/autosending-api';
import {
  AutosendingProjectStatistics,
  AutosendingTotalStatistics,
} from '@/types';
import {
  BarChart2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Send,
  Users,
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function MailingStatisticsPage() {
  const { user } = useAuth();
  const [projectStats, setProjectStats] = useState<AutosendingProjectStatistics[]>([]);
  const [totalStats, setTotalStats] = useState<AutosendingTotalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  const initApi = useCallback(() => {
    const token = user?.settings?.touchApiToken;
    if (!token) {
      setTokenMissing(true);
      setLoading(false);
      return false;
    }
    autosendingApi.setUserToken(token);
    setTokenMissing(false);
    return true;
  }, [user?.settings?.touchApiToken]);

  const fetchStats = useCallback(async () => {
    if (!initApi()) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, totalData] = await Promise.all([
        autosendingApi.get<{ statistics: AutosendingProjectStatistics[] }>('/statistics'),
        autosendingApi.get<AutosendingTotalStatistics>('/statistics/total'),
      ]);
      setProjectStats(statsData.statistics || []);
      setTotalStats(totalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [initApi]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!user) return null;

  if (tokenMissing) {
    return (
      <>
        <Header title="Статистика рассылок" user={user} />
        <div className="p-6">
          <div className="card p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Токен не настроен</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Для работы со статистикой укажите Touch API Token в{' '}
              <Link href="/profile" className="text-primary-600 hover:underline">настройках профиля</Link>.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Статистика рассылок" user={user} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => fetchStats()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Обновить
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {/* Total Stats */}
            {totalStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <Radio size={20} className="text-primary-600" />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Рассылок</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.sendingProjects}</p>
                </div>
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Получателей</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.recipients}</p>
                </div>
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Send size={20} className="text-green-600" />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Отправлено</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.sendedMessages}</p>
                </div>
              </div>
            )}

            {/* Per-project stats */}
            {projectStats.length === 0 ? (
              <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
                <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
                <p>Нет данных для отображения</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">По рассылкам</h3>
                {projectStats.map((ps) => {
                  const s = ps.statistics;
                  const total = s.total || 0;
                  const sentPercent = total > 0 ? Math.round(((s.sent || 0) + (s.delivered || 0) + (s.read || 0)) / total * 100) : 0;
                  const errorPercent = total > 0 ? Math.round((s.error || 0) / total * 100) : 0;

                  return (
                    <div key={ps.uuid} className="card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                        <Link href={`/mailings/${ps.uuid}`} className="text-sm font-medium text-primary-600 hover:underline flex-1">
                          {ps.name}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {new Date(ps.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {total > 0 && (
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-3 overflow-hidden flex">
                          {(s.read || 0) > 0 && (
                            <div className="bg-blue-500 h-full" style={{ width: `${(s.read! / total) * 100}%` }} />
                          )}
                          {(s.delivered || 0) > 0 && (
                            <div className="bg-green-500 h-full" style={{ width: `${(s.delivered! / total) * 100}%` }} />
                          )}
                          {(s.sent || 0) > 0 && (
                            <div className="bg-emerald-400 h-full" style={{ width: `${(s.sent! / total) * 100}%` }} />
                          )}
                          {(s.error || 0) > 0 && (
                            <div className="bg-red-500 h-full" style={{ width: `${(s.error! / total) * 100}%` }} />
                          )}
                          {(s.canceled || 0) > 0 && (
                            <div className="bg-gray-400 h-full" style={{ width: `${(s.canceled! / total) * 100}%` }} />
                          )}
                          {(s.pending || 0) + (s.scheduled || 0) > 0 && (
                            <div className="bg-yellow-300 h-full" style={{ width: `${((s.pending || 0) + (s.scheduled || 0)) / total * 100}%` }} />
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                            <Clock size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Ожидание</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.pending || 0}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-yellow-500 mb-0.5">
                            <Clock size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Заплан.</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.scheduled || 0}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                            <CheckCircle size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Отпр.</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.sent || 0}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5">
                            <CheckCircle size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Достав.</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.delivered || 0}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                            <MessageSquare size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Прочит.</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.read || 0}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-red-500 mb-0.5">
                            <XCircle size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Ошибки</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.error || 0}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                            <XCircle size={12} />
                          </div>
                          <p className="text-xs text-gray-500">Отмен.</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.canceled || 0}</p>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-3 text-xs text-gray-400">
                        <span>Всего: {total}</span>
                        <span>Успешно: {sentPercent}%</span>
                        {errorPercent > 0 && <span className="text-red-400">Ошибки: {errorPercent}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
