'use client';

import { ROLE_LABELS } from '@/types';
import type { User } from '@/types';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

interface HeaderProps {
  title: string;
  user: User;
}

export default function Header({ title, user }: HeaderProps) {
  const { colorMode, setColorMode } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="lg:ml-0 ml-12">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 break-words">{title}</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}
            className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={colorMode === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {colorMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
<div className="hidden sm:flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.firstName[0]}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-700 dark:text-gray-200">
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
