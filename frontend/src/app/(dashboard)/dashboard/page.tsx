'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Role, ROLE_LABELS } from '@/types';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  FolderSearch,
  Star,
  Sparkles,
  Globe2,
  Rocket,
  Mail,
  MailPlus,
  UsersRound,
  Zap,
  Send,
  Eye,
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react';

interface AdminDashboardData {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
    byRole: Record<string, number>;
  };
  purchases: {
    totalSearches: number;
    totalFound: number;
    totalFavorites: number;
    totalAiResults: number;
    totalEmails: number;
  };
  prozorro: {
    totalTenders: number;
    totalAiResults: number;
  };
  outreach: {
    totalEmailAccounts: number;
    activeEmailAccounts: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalLeads: number;
    totalEmailsSent: number;
    totalEmailsOpened: number;
    totalEmailsReplied: number;
    totalEmailsBounced: number;
    totalCampaignEmails: number;
  };
  recentUsers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    createdAt: string;
    isActive: boolean;
  }[];
}

interface UserDashboardData {
  purchases: {
    totalSearches: number;
    totalFound: number;
    totalFavorites: number;
    totalAiResults: number;
  };
  outreach: {
    emailAccounts: number;
    campaigns: number;
    activeCampaigns: number;
    leads: number;
    sentEmails: number;
    repliedEmails: number;
  };
  recentSearches: {
    id: string;
    queryParams: Record<string, unknown>;
    resultsCount: number;
    createdAt: string;
  }[];
}

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div className={`card flex items-center gap-4 ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {href && <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</h3>
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminDashboardData>('/dashboard/admin')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data) return null;

  const openRate =
    data.outreach.totalEmailsSent > 0
      ? ((data.outreach.totalEmailsOpened / data.outreach.totalEmailsSent) * 100).toFixed(1)
      : '0';
  const replyRate =
    data.outreach.totalEmailsSent > 0
      ? ((data.outreach.totalEmailsReplied / data.outreach.totalEmailsSent) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-8">
      {/* Users Section */}
      <div>
        <SectionTitle icon={<Users size={20} />}>Пользователи</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Всего"
            value={data.users.total}
            icon={<Users size={22} className="text-primary-600" />}
            color="bg-primary-50 dark:bg-primary-900/30"
            href="/admin/users"
          />
          <StatCard
            title="Активные"
            value={data.users.active}
            icon={<UserCheck size={22} className="text-green-600" />}
            color="bg-green-50 dark:bg-green-900/30"
            subtitle={`${data.users.total > 0 ? ((data.users.active / data.users.total) * 100).toFixed(0) : 0}% от всех`}
          />
          <StatCard
            title="Новые за неделю"
            value={data.users.newThisWeek}
            icon={<UserPlus size={22} className="text-blue-600" />}
            color="bg-blue-50 dark:bg-blue-900/30"
          />
          <StatCard
            title="Система"
            value="Активна"
            icon={<Activity size={22} className="text-orange-600" />}
            color="bg-orange-50 dark:bg-orange-900/30"
          />
        </div>
      </div>

      {/* Purchases Section */}
      <div>
        <SectionTitle icon={<ShoppingCart size={20} />}>Закупки</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Поисковые запросы"
            value={data.purchases.totalSearches}
            icon={<Search size={22} className="text-indigo-600" />}
            color="bg-indigo-50 dark:bg-indigo-900/30"
            href="/purchases/search-queries"
          />
          <StatCard
            title="Найденные закупки"
            value={data.purchases.totalFound}
            icon={<FolderSearch size={22} className="text-teal-600" />}
            color="bg-teal-50 dark:bg-teal-900/30"
            href="/purchases/found"
          />
          <StatCard
            title="В избранном"
            value={data.purchases.totalFavorites}
            icon={<Star size={22} className="text-yellow-600" />}
            color="bg-yellow-50 dark:bg-yellow-900/30"
            href="/purchases/favorites"
          />
          <StatCard
            title="AI-анализов"
            value={data.purchases.totalAiResults}
            icon={<Sparkles size={22} className="text-purple-600" />}
            color="bg-purple-50 dark:bg-purple-900/30"
          />
        </div>
      </div>

      {/* Prozorro + Outreach Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prozorro */}
        <div className="card">
          <SectionTitle icon={<Globe2 size={20} />}>Закупки Украина (Prozorro)</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.prozorro.totalTenders}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Тендеров</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.prozorro.totalAiResults}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-анализов</p>
            </div>
          </div>
          <Link
            href="/prozorro"
            className="mt-4 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Перейти к закупкам <ArrowRight size={14} />
          </Link>
        </div>

        {/* Outreach Summary */}
        <div className="card">
          <SectionTitle icon={<Rocket size={20} />}>Email Outreach</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-3">
              <MailPlus size={18} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Аккаунты</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {data.outreach.activeEmailAccounts}/{data.outreach.totalEmailAccounts}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Кампании</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {data.outreach.activeCampaigns}/{data.outreach.totalCampaigns}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UsersRound size={18} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Лиды</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{data.outreach.totalLeads}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Send size={18} className="text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Отправлено</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{data.outreach.totalEmailsSent}</p>
              </div>
            </div>
          </div>
          <Link
            href="/outreach/campaigns"
            className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Перейти к кампаниям <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Outreach Funnel */}
      {data.outreach.totalEmailsSent > 0 && (
        <div className="card">
          <SectionTitle icon={<TrendingUp size={20} />}>Воронка рассылок</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Send size={14} /> Отправлено
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.outreach.totalEmailsSent}</span>
              </div>
              <ProgressBar value={data.outreach.totalEmailsSent} max={data.outreach.totalEmailsSent} color="bg-blue-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Eye size={14} /> Открыто
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.outreach.totalEmailsOpened} ({openRate}%)
                </span>
              </div>
              <ProgressBar value={data.outreach.totalEmailsOpened} max={data.outreach.totalEmailsSent} color="bg-green-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <MessageCircle size={14} /> Ответы
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.outreach.totalEmailsReplied} ({replyRate}%)
                </span>
              </div>
              <ProgressBar value={data.outreach.totalEmailsReplied} max={data.outreach.totalEmailsSent} color="bg-purple-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Bounce
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.outreach.totalEmailsBounced}</span>
              </div>
              <ProgressBar value={data.outreach.totalEmailsBounced} max={data.outreach.totalEmailsSent} color="bg-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom row: Users by Role + Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="card">
          <SectionTitle icon={<Users size={20} />}>По ролям</SectionTitle>
          <div className="space-y-3">
            {Object.entries(data.users.byRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {ROLE_LABELS[role as Role] || role}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <ProgressBar value={count} max={data.users.total} color="bg-primary-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={<Clock size={20} />}>Новые пользователи</SectionTitle>
            <Link
              href="/admin/users"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              Все <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {u.firstName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex-shrink-0">
                  {ROLE_LABELS[u.role] || u.role}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserDashboardData>('/dashboard/my')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data || !user) return null;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-700 dark:from-primary-700 dark:to-primary-900 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Добро пожаловать, {user.firstName}!
            </h2>
            <p className="text-primary-100 mt-1">
              Роль: {ROLE_LABELS[user.role]} &bull; {user.email}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-1 text-primary-200">
            <Activity size={16} />
            <span className="text-sm">Активен</span>
          </div>
        </div>
      </div>

      {/* Purchases Stats */}
      <div>
        <SectionTitle icon={<ShoppingCart size={20} />}>Мои закупки</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Поисковые запросы"
            value={data.purchases.totalSearches}
            icon={<Search size={22} className="text-indigo-600" />}
            color="bg-indigo-50 dark:bg-indigo-900/30"
            href="/purchases/search-queries"
          />
          <StatCard
            title="Найденные"
            value={data.purchases.totalFound}
            icon={<FolderSearch size={22} className="text-teal-600" />}
            color="bg-teal-50 dark:bg-teal-900/30"
            href="/purchases/found"
          />
          <StatCard
            title="Избранное"
            value={data.purchases.totalFavorites}
            icon={<Star size={22} className="text-yellow-600" />}
            color="bg-yellow-50 dark:bg-yellow-900/30"
            href="/purchases/favorites"
          />
          <StatCard
            title="AI-анализов"
            value={data.purchases.totalAiResults}
            icon={<Sparkles size={22} className="text-purple-600" />}
            color="bg-purple-50 dark:bg-purple-900/30"
          />
        </div>
      </div>

      {/* Outreach Stats */}
      <div>
        <SectionTitle icon={<Rocket size={20} />}>Email Outreach</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            title="Кампании"
            value={data.outreach.campaigns}
            icon={<Zap size={22} className="text-orange-600" />}
            color="bg-orange-50 dark:bg-orange-900/30"
            subtitle={`${data.outreach.activeCampaigns} активных`}
            href="/outreach/campaigns"
          />
          <StatCard
            title="Лиды"
            value={data.outreach.leads}
            icon={<UsersRound size={22} className="text-green-600" />}
            color="bg-green-50 dark:bg-green-900/30"
            href="/outreach/leads"
          />
          <StatCard
            title="Отправлено писем"
            value={data.outreach.sentEmails}
            icon={<Send size={22} className="text-blue-600" />}
            color="bg-blue-50 dark:bg-blue-900/30"
            subtitle={`${data.outreach.repliedEmails} ответов`}
          />
        </div>
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <SectionTitle icon={<Zap size={20} />}>Быстрые действия</SectionTitle>
          <div className="grid grid-cols-1 gap-2">
            <Link
              href="/purchases"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ShoppingCart size={18} className="text-primary-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Поиск закупок</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
            <Link
              href="/outreach/campaigns"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Rocket size={18} className="text-orange-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Email кампании</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
            <Link
              href="/outreach/leads"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <UsersRound size={18} className="text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">База лидов</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
            <Link
              href="/prozorro"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Globe2 size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Закупки Украина</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Mail size={18} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Настройки SMTP/IMAP</span>
              <ArrowRight size={14} className="ml-auto text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Recent Searches */}
        <div className="card">
          <SectionTitle icon={<Clock size={20} />}>Последние поиски</SectionTitle>
          {data.recentSearches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Search size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Пока нет поисковых запросов</p>
              <Link
                href="/purchases"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Начать поиск <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentSearches.map((s) => {
                const params = s.queryParams as Record<string, string>;
                const label = params.searchString || params.query || JSON.stringify(params).slice(0, 60);
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <Search size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{label}</p>
                      <p className="text-xs text-gray-400">
                        {s.resultsCount} результатов &bull;{' '}
                        {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === Role.ADMIN || user.role === Role.DIRECTOR;

  return (
    <>
      <Header title="Дашборд" user={user} />
      <div className="p-6">
        {isAdmin ? <AdminDashboard /> : <UserDashboard />}
      </div>
    </>
  );
}
