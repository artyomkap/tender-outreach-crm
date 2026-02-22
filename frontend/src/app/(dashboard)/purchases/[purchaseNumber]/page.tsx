'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Purchase, PurchaseFile, PurchaseAiResult } from '@/types';
import {
  ArrowLeft,
  FileDown,
  Calendar,
  Banknote,
  Building2,
  Tag,
  MapPin,
  FileText,
  Eye,
  Save,
  BookOpen,
  Loader2,
  X,
  Sparkles,
  Search,
  Mail,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MagicPipeline from '@/components/magic-pipeline';

const STAGE_LABELS: Record<number, string> = {
  1: 'Подача заявок',
  2: 'Работа комиссии',
  3: 'Закупка завершена',
  4: 'Закупка отменена',
};

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return '—';
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${formatted} ${currency || '₽'}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function PurchaseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const purchaseNumber = params.purchaseNumber as string;
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingFileId, setSavingFileId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<PurchaseFile | null>(null);
  const [aiResult, setAiResult] = useState<PurchaseAiResult | null>(null);
  const [preparing, setPreparing] = useState(false);

  const handlePreview = (file: PurchaseFile) => {
    const parserDocsUrl = user?.settings?.parserDocsUrl;
    const proxyUrl = user?.settings?.proxyUrl;

    if (!parserDocsUrl || !proxyUrl) {
      alert('Настройте Parser Docs URL и Proxy URL в профиле');
      return;
    }

    try {
      const encodedFileUrl = encodeURIComponent(file.url);
      const proxiedUrl = proxyUrl + encodedFileUrl;
      const encodedProxiedUrl = encodeURIComponent(proxiedUrl);
      const finalUrl = parserDocsUrl + encodedProxiedUrl;

      window.open(finalUrl, '_blank');
    } catch (err) {
      alert('Ошибка открытия документа');
    }
  };

  const handleSave = async (file: PurchaseFile) => {
    if (savingFileId) return;
    setSavingFileId(file.id);

    try {
      const updated = await api.post<PurchaseFile>(`/purchases/files/${file.id}/parse`, {});
      setPurchase((prev) => {
        if (!prev || !prev.files) return prev;
        return {
          ...prev,
          files: prev.files.map((f) => (f.id === updated.id ? { ...f, parsedText: updated.parsedText } : f)),
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения документа');
    } finally {
      setSavingFileId(null);
    }
  };

  const handlePrepare = async () => {
    if (!purchase || preparing) return;
    setPreparing(true);
    try {
      const result = await api.post<PurchaseAiResult>(`/purchases/${purchase.id}/prepare`, {});
      setAiResult(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка AI-анализа');
    } finally {
      setPreparing(false);
    }
  };

  useEffect(() => {
    if (!purchaseNumber) return;

    const fetchPurchase = async () => {
      try {
        const data = await api.get<Purchase>(`/purchases/${purchaseNumber}`);
        setPurchase(data);
        // Fetch AI result if exists
        try {
          const result = await api.get<PurchaseAiResult | null>(`/purchases/${data.id}/ai-result`);
          if (result) setAiResult(result);
        } catch {
          // no AI result yet
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };
    fetchPurchase();
  }, [purchaseNumber]);

  if (!user) return null;

  return (
    <>
      <Header title="Детали закупки" user={user} />
      <div className="p-6">
        <Link
          href="/purchases"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Назад к поиску
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        ) : purchase ? (
          <div className="space-y-6">
            {/* Header card */}
            <div className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    № {purchase.purchaseNumber}
                  </h3>
                  {purchase.stage !== null && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                        purchase.stage === 1
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : purchase.stage === 3
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            : purchase.stage === 4
                              ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {STAGE_LABELS[purchase.stage] || `Этап ${purchase.stage}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatPrice(purchase.maxPrice, purchase.currencyCode)}
                  </p>
                  <MagicPipeline
                    purchase={purchase}
                    onComplete={() => {
                      // Reload AI result
                      api.get<PurchaseAiResult | null>(`/purchases/${purchase.id}/ai-result`)
                        .then((r) => { if (r) setAiResult(r); })
                        .catch(() => {});
                      // Reload purchase to get updated parsedText on files
                      api.get<Purchase>(`/purchases/${purchaseNumber}`)
                        .then((p) => setPurchase(p))
                        .catch(() => {});
                    }}
                  />
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {purchase.objectInfo || 'Описание отсутствует'}
              </p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Информация
                </h4>
                <InfoRow
                  icon={<Calendar size={16} />}
                  label="Дата публикации"
                  value={formatDate(purchase.publishedAt)}
                />
                <InfoRow
                  icon={<Calendar size={16} />}
                  label="Последнее обновление"
                  value={formatDate(purchase.updatedAtExternal)}
                />
                <InfoRow
                  icon={<Tag size={16} />}
                  label="Тип закупки"
                  value={purchase.purchaseType || '—'}
                />
                <InfoRow
                  icon={<MapPin size={16} />}
                  label="Регион"
                  value={purchase.region !== null ? String(purchase.region) : '—'}
                />
                <InfoRow
                  icon={<Banknote size={16} />}
                  label="Начальная (максимальная) цена"
                  value={formatPrice(purchase.maxPrice, purchase.currencyCode)}
                />
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Заказчики
                </h4>
                {purchase.customers && purchase.customers.length > 0 ? (
                  <div className="space-y-2">
                    {purchase.customers.map((customer, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <Building2 size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">{customer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Информация отсутствует</p>
                )}
              </div>
            </div>

            {/* Files */}
            {purchase.files && purchase.files.length > 0 && (
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Документы ({purchase.files.length})
                </h4>
                <div className="space-y-2">
                  {purchase.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <FileText size={20} className="text-gray-400 group-hover:text-primary-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                          {file.fileName || file.docDescription || 'Документ'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          {file.docKindName && <span>{file.docKindName}</span>}
                          {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                          {file.docDate && <span>{formatDate(file.docDate)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handlePreview(file)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors shrink-0"
                        title="Предпросмотр документа"
                      >
                        <Eye size={14} />
                        Предпросмотр
                      </button>
                      {file.parsedText ? (
                        <button
                          onClick={() => setViewingFile(file)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors shrink-0"
                          title="Просмотр сохранённого текста"
                        >
                          <BookOpen size={14} />
                          Просмотр
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSave(file)}
                          disabled={savingFileId === file.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0 disabled:opacity-50"
                          title="Сохранить текст документа"
                        >
                          {savingFileId === file.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          {savingFileId === file.id ? 'Сохранение...' : 'Сохранить'}
                        </button>
                      )}
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                        title="Скачать"
                      >
                        <FileDown size={16} className="text-gray-400 hover:text-primary-600 transition-colors" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* AI Result */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-500" />
                  AI-анализ
                </h4>
                <button
                  onClick={handlePrepare}
                  disabled={preparing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-50"
                >
                  {preparing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {preparing ? 'Анализ...' : aiResult ? 'Повторить' : 'Prepare'}
                </button>
              </div>

              {aiResult ? (
                <div className="space-y-4">
                  {aiResult.searchTerm && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                      <Search size={16} className="text-violet-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Поисковый запрос</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{aiResult.searchTerm.term}</p>
                      </div>
                    </div>
                  )}

                  {aiResult.subject && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                      <Mail size={16} className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Тема</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{aiResult.subject}</p>
                      </div>
                    </div>
                  )}

                  {aiResult.body && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                      <MessageSquare size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Содержание</p>
                        <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-sans leading-relaxed">
                          {aiResult.body}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Нажмите &quot;Prepare&quot; для запуска AI-анализа. Убедитесь, что документы сохранены и настроены AI URL и промпт.
                </p>
              )}
            </div>

            {/* Saved text modal */}
            {viewingFile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingFile(null)}>
                <div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate pr-4">
                      {viewingFile.fileName || viewingFile.docDescription || 'Документ'}
                    </h3>
                    <button
                      onClick={() => setViewingFile(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-sans leading-relaxed">
                      {viewingFile.parsedText}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
