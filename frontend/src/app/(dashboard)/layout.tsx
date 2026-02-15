'use client';

import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/sidebar';
import { Role } from '@/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role as Role,
        }}
        onLogout={logout}
      />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
