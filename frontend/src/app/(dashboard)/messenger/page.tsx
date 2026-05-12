'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { EmailThread, EmailMessage as EmailMsg, OutreachEmailAccount } from '@/types';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
import {
  MessageSquare,
  Send,
  Loader2,
  Search,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  ExternalLink,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

const EMAIL_PREVIEW_LEN = 200;

interface Chat {
  id: string;
  name: string;
  chatId: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  body: string;
  fromMe: boolean;
  time: number;
  chatId: string;
  subject?: string;
  bodyHtml?: string | null;
  bodyText?: string;
  emailMessageId?: string | null;
}

export default function MessengerPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const deepLinkEmail = searchParams.get('email');
  const deepLinkHandled = useRef(false);

  const [accounts, setAccounts] = useState<OutreachEmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<OutreachEmailAccount | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatSearch, setChatSearch] = useState('');

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [msgText, setMsgText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [sending, setSending] = useState(false);

  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [modalEmail, setModalEmail] = useState<ChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeChatRef = useRef<Chat | null>(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    api.get<OutreachEmailAccount[]>('/outreach/email-accounts')
      .then((data) => {
        const active = data.filter((a) => a.status === 'active');
        setAccounts(active);
        if (active.length > 0) setSelectedAccount(active[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []);

  const fetchChats = useCallback(async () => {
    if (!selectedAccount) return;
    setLoadingChats(true);
    try {
      try { await api.post('/emails/fetch-inbox', { accountId: selectedAccount.id }); } catch { /* ignore */ }
      const res = await api.get<{ data: EmailThread[]; total: number }>(`/emails/threads?limit=100&accountId=${encodeURIComponent(selectedAccount.id)}`);
      const list: Chat[] = (res.data || []).map((t) => ({
        id: t.contactEmail,
        name: t.contactEmail,
        chatId: t.contactEmail,
        lastMessage: t.lastMessage
          ? `${t.lastMessage.subject ? t.lastMessage.subject + ': ' : ''}${t.lastMessage.preview}`
          : '',
        lastMessageTime: new Date(t.lastMessageAt).getTime() / 1000,
        unreadCount: t.unreadCount,
      }));
      setChats(list);
    } catch {
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    setChats([]);
    setActiveChat(null);
    setMessages([]);
    setEmailSubject('');
    fetchChats();
  }, [fetchChats]);

  const fetchMessages = useCallback(async (chat: Chat, accountId?: string) => {
    setLoadingMessages(true);
    const accId = accountId ?? selectedAccount?.id;
    try {
      const accParam = accId ? `&accountId=${encodeURIComponent(accId)}` : '';
      const res = await api.get<EmailMsg[]>(`/emails/thread?email=${encodeURIComponent(chat.chatId)}${accParam}`);
      const list: ChatMessage[] = (res || []).map((m) => ({
        id: m.id,
        body: m.bodyText || '',
        fromMe: m.direction === 'sent',
        time: new Date(m.emailDate || m.createdAt).getTime() / 1000,
        chatId: chat.chatId,
        subject: m.subject,
        bodyHtml: m.bodyHtml,
        bodyText: m.bodyText,
        emailMessageId: m.messageId,
      }));
      setMessages(list);
      const last = [...list].reverse().find((m) => m.subject);
      if (last?.subject) {
        setEmailSubject(last.subject.startsWith('Re:') ? last.subject : `Re: ${last.subject}`);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAccount]);

  // SSE: auto-refresh when new email arrives
  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) return;
    const es = new EventSource(`${API_URL}/emails/events?token=${encodeURIComponent(token)}`);
    es.onmessage = (event) => {
      try {
        const data: { from: string } = JSON.parse(event.data);
        fetchChats();
        if (activeChatRef.current?.chatId === data.from) {
          fetchMessages(activeChatRef.current);
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [fetchChats, fetchMessages]);

  // Auto-open conversation from deep-link (?email=...)
  useEffect(() => {
    if (!deepLinkEmail || deepLinkHandled.current || chats.length === 0) return;
    const target = chats.find((c) => c.chatId.toLowerCase() === deepLinkEmail.toLowerCase());
    if (target) {
      setActiveChat(target);
      deepLinkHandled.current = true;
    }
  }, [chats, deepLinkEmail]);

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat);
  }, [activeChat, fetchMessages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages]);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeChat || !msgText.trim() || sending) return;
    setSending(true);
    const text = msgText.trim();
    try {
      const lastReceived = [...messages].reverse().find((m) => !m.fromMe);
      await api.post('/emails/send', {
        to: activeChat.chatId,
        subject: emailSubject || 'Без темы',
        body: text,
        inReplyTo: lastReceived?.emailMessageId || undefined,
        accountId: selectedAccount?.id,
      });
      setMsgText('');
      // Append sent message locally — no full re-render of thread
      setMessages((prev) => [
        ...prev,
        {
          id: `sent-${Date.now()}`,
          body: text,
          fromMe: true,
          time: Date.now() / 1000,
          chatId: activeChat.chatId,
          subject: emailSubject || undefined,
          bodyHtml: null,
          bodyText: text,
          emailMessageId: null,
        },
      ]);
    } catch {
      // ignore
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [activeChat, msgText, sending, emailSubject, messages]);

  const filteredChats = useMemo(() => {
    if (!chatSearch.trim()) return chats;
    const q = chatSearch.toLowerCase();
    return chats.filter(
      (c) => c.name.toLowerCase().includes(q) || (typeof c.lastMessage === 'string' && c.lastMessage.toLowerCase().includes(q)),
    );
  }, [chats, chatSearch]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const openInNewWindow = useCallback((msg: ChatMessage) => {
    const html = msg.bodyHtml || `<pre style="font-family:sans-serif;white-space:pre-wrap">${(msg.bodyText || msg.body || '').replace(/</g, '&lt;')}</pre>`;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(msg.subject || '').replace(/</g, '&lt;')}</title><style>body{font-family:system-ui,sans-serif;margin:20px;color:#333}</style></head><body>${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts < 1e12 ? ts * 1000 : ts);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const renderEmailBubble = (msg: ChatMessage) => {
    const text = msg.bodyText || msg.body || '';
    const needsTruncation = text.length > EMAIL_PREVIEW_LEN || !!msg.bodyHtml;
    const isExpanded = expandedEmails.has(msg.id);

    return (
      <div className={`max-w-[94%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
        msg.fromMe
          ? 'bg-primary-600 text-white rounded-br-md'
          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm'
      }`}>
        {msg.subject && (
          <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 pb-1.5 border-b ${
            msg.fromMe ? 'text-white/90 border-white/20' : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
          }`}>
            <Mail size={12} className="shrink-0" />
            <span className="break-words">{msg.subject}</span>
          </div>
        )}

        {isExpanded ? (
          msg.bodyHtml ? (
            <iframe
              srcDoc={msg.bodyHtml}
              sandbox="allow-same-origin"
              className="w-full border-0 rounded bg-white min-h-[80px] mt-1"
              style={{ colorScheme: 'light' }}
              onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentDocument?.body) {
                  iframe.style.height = Math.min(iframe.contentDocument.body.scrollHeight + 20, 500) + 'px';
                }
              }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mt-1">{text}</p>
          )
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mt-1">
            {text.length > EMAIL_PREVIEW_LEN ? text.slice(0, EMAIL_PREVIEW_LEN) + '...' : text}
          </p>
        )}

        {needsTruncation && (
          <div className={`flex flex-wrap items-center gap-1 mt-2 pt-1.5 border-t ${msg.fromMe ? 'border-white/20' : 'border-gray-200 dark:border-gray-600'}`}>
            <button onClick={() => toggleExpand(msg.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                msg.fromMe ? 'hover:bg-white/15 text-white/80' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </button>
            <button onClick={() => setModalEmail(msg)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                msg.fromMe ? 'hover:bg-white/15 text-white/80' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
              <Maximize2 size={11} /> Развернуть
            </button>
            <button onClick={() => openInNewWindow(msg)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                msg.fromMe ? 'hover:bg-white/15 text-white/80' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
              <ExternalLink size={11} /> Окно
            </button>
          </div>
        )}

        <div className={`flex items-center gap-1 mt-1 ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${msg.fromMe ? 'text-white/60' : 'text-gray-400'}`}>
            {formatTime(msg.time)}
          </span>
        </div>
      </div>
    );
  };

  if (!user) return null;

  if (loadingAccounts) {
    return (
      <>
        <Header title="Мессенджер" user={user} />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (accounts.length === 0) {
    return (
      <>
        <Header title="Мессенджер" user={user} />
        <div className="p-3 sm:p-6">
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-amber-400 mb-4" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">Нет почтовых аккаунтов</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Добавьте SMTP/IMAP аккаунт в{' '}
              <Link href="/outreach/accounts" className="text-primary-600 dark:text-primary-400 hover:underline">
                Email Outreach → Почтовые аккаунты
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Мессенджер" user={user} />
      <div className="flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>

        {/* Account selector bar */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0 overflow-x-auto">
          {accounts.map((acc) => {
            const isActive = selectedAccount?.id === acc.id;
            return (
              <button key={acc.id} onClick={() => setSelectedAccount(acc)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}>
                <Mail size={13} />
                <span className="max-w-[180px] truncate">
                  {acc.senderName ? `${acc.senderName} <${acc.email}>` : acc.email}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left — chat list */}
          <div className={`${activeChat ? 'hidden sm:flex' : 'flex'} w-full sm:w-96 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Поиск по email..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingChats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary-600" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Mail size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Нет переписок</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = activeChat?.chatId === chat.chatId;
                  return (
                    <div key={chat.chatId} onClick={() => setActiveChat(chat)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700/50 ${
                        isActive ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}>
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                        <UserIcon size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{chat.name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatTime(chat.lastMessageTime || 0)}</span>
                        </div>
                        <div className="flex items-start justify-between gap-2 mt-0.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                          {!!chat.unreadCount && chat.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary-600 text-white shrink-0">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <button onClick={fetchChats} disabled={loadingChats}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
                <RefreshCw size={12} className={loadingChats ? 'animate-spin' : ''} />
                Получить почту
              </button>
            </div>
          </div>

          {/* Right — messages */}
          <div className={`${activeChat ? 'flex' : 'hidden sm:flex'} flex-1 flex-col min-w-0 bg-gray-50 dark:bg-gray-900`}>
            {!activeChat ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare size={64} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Выберите переписку</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Чтобы начать общение</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                  <button onClick={() => setActiveChat(null)} className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    <ArrowLeft size={18} />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <UserIcon size={18} className="text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{activeChat.name}</p>
                  </div>
                  <button
                    onClick={() => api.post('/emails/fetch-inbox', { accountId: selectedAccount?.id }).finally(() => fetchMessages(activeChat))}
                    disabled={loadingMessages}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Обновить">
                    <RefreshCw size={14} className={loadingMessages ? 'animate-spin' : ''} />
                  </button>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-2">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-primary-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-gray-400">Нет сообщений</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                        {renderEmailBubble(msg)}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Тема письма..."
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <form onSubmit={handleSend} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Текст письма..."
                      rows={3}
                      className="flex-1 px-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                      style={{ minHeight: '80px' }}
                    />
                    <button type="submit" disabled={sending || !msgText.trim()}
                      className="w-full sm:w-auto p-2.5 bg-primary-600 text-white rounded-2xl sm:rounded-full hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Email modal */}
      {modalEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[min(48rem,calc(100vw-1rem))] max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={18} className="text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{modalEmail.subject || 'Без темы'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {modalEmail.fromMe ? 'Отправлено' : 'Получено'} &middot; {formatTime(modalEmail.time)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openInNewWindow(modalEmail)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Открыть в новом окне">
                  <ExternalLink size={16} />
                </button>
                <button onClick={() => setModalEmail(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
              {modalEmail.bodyHtml ? (
                <iframe
                  srcDoc={modalEmail.bodyHtml}
                  sandbox="allow-same-origin"
                  className="w-full border-0 min-h-[300px]"
                  style={{ colorScheme: 'light', height: '100%' }}
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument?.body) {
                      iframe.style.height = iframe.contentDocument.body.scrollHeight + 40 + 'px';
                    }
                  }}
                />
              ) : (
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-sans leading-relaxed">
                  {modalEmail.bodyText || modalEmail.body}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
