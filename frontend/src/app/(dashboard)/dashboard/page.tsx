'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Role, ROLE_LABELS, User } from '@/types';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  byRole: Record<string, number>;
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function AdminDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>('/users/stats')
      .then(setStats)
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Всего пользователей"
          value={stats?.totalUsers || 0}
          icon={<Users size={24} className="text-primary-600" />}
          color="bg-primary-50"
        />
        <StatCard
          title="Активные"
          value={stats?.activeUsers || 0}
          icon={<UserCheck size={24} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Ролей в системе"
          value={Object.keys(stats?.byRole || {}).length}
          icon={<ShieldCheck size={24} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Система"
          value="Активна"
          icon={<Activity size={24} className="text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {stats?.byRole && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Пользователи по ролям</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byRole).map(([role, count]) => (
              <div key={role} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {ROLE_LABELS[role as Role] || role}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function UserDashboard({ user }: { user: User }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Добро пожаловать!</h3>
        <p className="text-gray-600">
          {user.firstName} {user.lastName}, вы вошли как{' '}
          <span className="font-medium text-primary-600">
            {ROLE_LABELS[user.role]}
          </span>
          .
        </p>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Роль</span>
            <span className="font-medium">{ROLE_LABELS[user.role]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Статус</span>
            <span className="inline-flex items-center gap-1 font-medium text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Активен
            </span>
          </div>
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
        {isAdmin ? <AdminDashboard user={user} /> : <UserDashboard user={user} />}
      </div>
    </>
  );
}
