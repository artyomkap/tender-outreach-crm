'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Role, ROLE_LABELS } from '@/types';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  ShieldCheck,
  BarChart3,
  Package,
  Megaphone,
  HeadphonesIcon,
  HeartHandshake,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  History,
  FolderSearch,
  Star,
  Clock,
  Sparkles,
  Search,
  Mail,
  AtSign,
  Smartphone,
  Ban,
  Inbox,
  Send,
  MessageCircle,
  Globe2,
  Zap,
  MailPlus,
  UsersRound,
  Megaphone as MegaphoneIcon,
  Rocket,
  Key,
  Coins,
  Radio,
  ContactRound,
  ShieldBan,
  BarChart2,
} from 'lucide-react';
import { useState } from 'react';
import SshSidebarSection from './ssh-sidebar-section';
import ThemeSwitcher from './theme-switcher';
import type { UserSettings } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
  children?: NavItem[];
}

const ALL_ROLES = [Role.ADMIN, Role.DIRECTOR, Role.MANAGER, Role.SUPPORT, Role.SELLER, Role.MARKETER, Role.CLIENT, Role.PARTNER];

const navItems: NavItem[] = [
  {
    label: 'Дашборд',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
    roles: ALL_ROLES,
  },
  {
    label: 'Закупки',
    href: '/purchases',
    icon: <ShoppingCart size={20} />,
    roles: ALL_ROLES,
    children: [
      {
        label: 'История запросов',
        href: '/purchases/search-queries',
        icon: <History size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Найденные',
        href: '/purchases/found',
        icon: <FolderSearch size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Избранное',
        href: '/purchases/favorites',
        icon: <Star size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'История просмотров',
        href: '/purchases/history',
        icon: <Clock size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Поисковые запросы',
        href: '/purchases/search-terms',
        icon: <Search size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Email-адреса',
        href: '/purchases/emails',
        icon: <AtSign size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Подготовленные письма',
        href: '/purchases/letters',
        icon: <Mail size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Чёрный список',
        href: '/purchases/blacklist',
        icon: <Ban size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Почта',
        href: '/purchases/mail',
        icon: <Inbox size={16} />,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: 'Закупки Украина',
    href: '/prozorro',
    icon: <Globe2 size={20} />,
    roles: ALL_ROLES,
    children: [
      {
        label: 'Воронка рассылки',
        href: '/prozorro/outreach',
        icon: <Send size={16} />,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: 'Email Outreach',
    href: '/outreach',
    icon: <Rocket size={20} />,
    roles: ALL_ROLES,
    children: [
      {
        label: 'Почтовые аккаунты',
        href: '/outreach/accounts',
        icon: <MailPlus size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'База лидов',
        href: '/outreach/leads',
        icon: <UsersRound size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Кампании',
        href: '/outreach/campaigns',
        icon: <Zap size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Входящие',
        href: '/outreach/inbox',
        icon: <Inbox size={16} />,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: 'Рассылки',
    href: '/mailings',
    icon: <Radio size={20} />,
    roles: ALL_ROLES,
    children: [
      {
        label: 'Аккаунты',
        href: '/mailings/accounts',
        icon: <ContactRound size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Чёрный список',
        href: '/mailings/blocked',
        icon: <ShieldBan size={16} />,
        roles: ALL_ROLES,
      },
      {
        label: 'Статистика',
        href: '/mailings/statistics',
        icon: <BarChart2 size={16} />,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: 'Instances',
    href: '/instances',
    icon: <Smartphone size={20} />,
    roles: ALL_ROLES,
  },
  {
    label: 'Мессенджер',
    href: '/messenger',
    icon: <MessageCircle size={20} />,
    roles: ALL_ROLES,
  },
  {
    label: 'Криптосделки',
    href: '/crypto-deals',
    icon: <Coins size={20} />,
    roles: ALL_ROLES,
  },
  {
    label: 'API',
    href: '/api',
    icon: <Key size={20} />,
    roles: ALL_ROLES,
  },
  {
    label: 'Пользователи',
    href: '/admin/users',
    icon: <Users size={20} />,
    roles: [Role.ADMIN, Role.DIRECTOR],
  },
  {
    label: 'Профиль',
    href: '/profile',
    icon: <UserCircle size={20} />,
    roles: ALL_ROLES,
  },
];

interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  onLogout: () => void;
  onSettingsChange?: (settings: UserSettings) => void;
}

function getRoleIcon(role: Role) {
  const map: Partial<Record<Role, React.ReactNode>> = {
    [Role.ADMIN]: <ShieldCheck size={14} />,
    [Role.DIRECTOR]: <BarChart3 size={14} />,
    [Role.MANAGER]: <Settings size={14} />,
    [Role.SELLER]: <Package size={14} />,
    [Role.MARKETER]: <Megaphone size={14} />,
    [Role.SUPPORT]: <HeadphonesIcon size={14} />,
    [Role.PARTNER]: <HeartHandshake size={14} />,
    [Role.CLIENT]: <UserCircle size={14} />,
  };
  return map[role] || <UserCircle size={14} />;
}

export default function Sidebar({ user, onLogout, onSettingsChange }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-lg font-bold text-white">Панель управления</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const isChildActive = item.children?.some((c) => pathname === c.href) ?? false;
          const isExpanded = isActive || isChildActive || pathname.startsWith(item.href + '/');
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
              {item.children && isExpanded && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children
                    .filter((c) => c.roles.includes(user.role))
                    .map((child) => {
                      const isChildItemActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={clsx(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                            isChildItemActive
                              ? 'bg-sidebar-active text-white'
                              : 'text-gray-400 hover:bg-sidebar-hover hover:text-white',
                          )}
                        >
                          {child.icon}
                          {child.label}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}

        <SshSidebarSection />
      </nav>

      <div className="border-t border-white/10">
        <ThemeSwitcher onSettingsChange={onSettingsChange} />
      </div>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-gray-400">{getRoleIcon(user.role)}</span>
            <span className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-300 hover:bg-sidebar-hover hover:text-white transition-colors duration-150"
        >
          <LogOut size={20} />
          Выйти
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar-bg rounded-lg text-white"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-bg transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-sidebar-bg min-h-screen flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
