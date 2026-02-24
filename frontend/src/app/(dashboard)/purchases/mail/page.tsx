'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { EmailThread, EmailMessage, PaginatedResponse } from '@/types';
import {
  Inbox,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send,
  Download,
  Loader2,
  Mail,
  MailOpen,
  ArrowLeftCircle,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function MailPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchingInbox, setFetchingInbox] = useState(false);
  const limit = 20;

  // Thread detail
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Reply form
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<EmailThread>>(
        `/emails/threads?page=${page}&limit=${limit}`,
      );
      setThreads(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleFetchInbox = async () => {
    setFetchingInbox(true);
    try {
      await api.post('/emails/fetch-inbox', {});
      await fetchThreads();
    } catch {
      // ignore
    } finally {
      setFetchingInbox(false);
    }
  };

  const openThread = async (email: string) => {
    setActiveThread(email);
    setLoadingThread(true);
    setReplySubject('');
    setReplyBody('');
    try {
      const msgs = await api.get<EmailMessage[]>(
        `/emails/thread?email=${encodeURIComponent(email)}`,
      );
      setMessages(msgs);
      // Pre-fill reply subject from the last message
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        const sub = last.subject || '';
        setReplySubject(sub.startsWith('Re: ') ? sub : `Re: ${sub}`);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
    // Refresh thread list to update unread counts
    fetchThreads();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyBody.trim() || sending) return;
    setSending(true);
    try {
      const lastMsg = messages[messages.length - 1];
      await api.post('/emails/send', {
        to: activeThread,
        subject: replySubject,
        body: replyBody,
        inReplyTo: lastMsg?.messageId || undefined,
      });
      setReplyBody('');
      // Refresh thread
      const msgs = await api.get<EmailMessage[]>(
        `/emails/thread?email=${encodeURIComponent(activeThread)}`,
      );
      setMessages(msgs);
      fetchThreads();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (!user) return null;

  // Thread detail view
  if (activeThread) {
    return (
      <>
        <Header title="Почта" user={user} />
        <div className="p-6">
          <button
            onClick={() => setActiveThread(null)}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors mb-4"
          >
            <ArrowLeftCircle size={16} />
            Назад к списку
          </button>

          <div className="flex items-center gap-2 mb-6">
            <Mail size={18} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {activeThread}
            </h2>
          </div>

          {loadingThread ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`card py-3 ${
                      msg.direction === 'sent'
                        ? 'ml-8 border-l-4 border-l-blue-400'
                        : 'mr-8 border-l-4 border-l-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {msg.direction === 'sent' ? (
                        <Send size={12} className="text-blue-500" />
                      ) : (
                        <Download size={12} className="text-emerald-500" />
                      )}
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {msg.direction === 'sent' ? 'Отправлено' : 'Получено'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(msg.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {msg.subject}
                      </p>
                    )}
                    {msg.bodyHtml ? (
                      <iframe
                        srcDoc={msg.bodyHtml}
                        sandbox="allow-same-origin"
                        className="w-full border-0 min-h-[100px]"
                        style={{ colorScheme: 'light' }}
                        onLoad={(e) => {
                          const iframe = e.target as HTMLIFrameElement;
                          if (iframe.contentDocument?.body) {
                            iframe.style.height = iframe.contentDocument.body.scrollHeight + 20 + 'px';
                          }
                        }}
                      />
                    ) : (
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-sans leading-relaxed">
                        {msg.bodyText}
                      </pre>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply form */}
              <form onSubmit={handleReply} className="card space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Ответить
                  </span>
                </div>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Тема"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Текст сообщения..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                />
                <button
                  type="submit"
                  disabled={sending || !replyBody.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Отправить
                </button>
              </form>
            </>
          )}
        </div>
      </>
    );
  }

  // Thread list view
  return (
    <>
      <Header title="Почта" user={user} />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/purchases"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Назад к поиску
          </Link>
          <button
            onClick={handleFetchInbox}
            disabled={fetchingInbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50 ml-auto"
          >
            {fetchingInbox ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Получить почту
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : threads.length === 0 ? (
          <div className="card text-center py-12">
            <Inbox size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Нет писем</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Отправьте письмо или нажмите &quot;Получить почту&quot; для загрузки входящих
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread.contactEmail}
                  onClick={() => openThread(thread.contactEmail)}
                  className="card py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {thread.unreadCount > 0 ? (
                        <Mail size={16} className="text-primary-500" />
                      ) : (
                        <MailOpen size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            thread.unreadCount > 0
                              ? 'font-semibold text-gray-900 dark:text-gray-100'
                              : 'font-medium text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {thread.contactEmail}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-primary-600 text-white">
                            {thread.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto shrink-0">
                          {new Date(thread.lastMessageAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {thread.lastMessage && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {thread.lastMessage.direction === 'sent' && (
                            <Send size={10} className="text-blue-400 shrink-0" />
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {thread.lastMessage.subject && (
                              <span className="font-medium">{thread.lastMessage.subject}: </span>
                            )}
                            {thread.lastMessage.preview}
                          </p>
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        {thread.messageCount} {thread.messageCount === 1 ? 'сообщение' : 'сообщений'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Стр. {page} / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary !py-1.5 !px-3 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary !py-1.5 !px-3 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
