'use client';

import { ROLE_LABELS } from '@/types';
import type { User } from '@/types';
import { Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  user: User;
}

export default function Header({ title, user }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="lg:ml-0 ml-12">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.firstName[0]}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-700">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-400 text-xs">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
