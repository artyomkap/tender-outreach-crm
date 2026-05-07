'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function useEmailNotifications(enabled: boolean) {
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const token = Cookies.get('accessToken');
    if (!token) return;

    requestPermission();

    const url = `${API_URL}/emails/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: { from: string; subject: string } = JSON.parse(event.data);

        setUnreadCount((n) => n + 1);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(`✉️ Новое письмо от ${data.from}`, {
            body: data.subject || '(без темы)',
            icon: '/favicon.ico',
            tag: 'email-notification',
          });
          n.onclick = () => {
            window.focus();
            router.push('/messenger');
            n.close();
            setUnreadCount(0);
          };
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on error
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [enabled, router, requestPermission]);

  return { unreadCount, clearUnread };
}
