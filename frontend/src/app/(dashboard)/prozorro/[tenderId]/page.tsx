'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { ProzorroTender, ProzorroTenderDoc } from '@/types';
import {
  FileText,
  Download,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

function formatPrice(amount: number | null, currency: string | null): string {
  if (amount === null) return '—';
  return `${new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${currency || 'UAH'}`;
}

export default function ProzorroTenderPage() {
  const { user } = useAuth();
  const params = useParams();
  const tenderId = params.tenderId as string;

  const [tender, setTender] = useState<ProzorroTender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ searchQuery: string | null; subject: string | null; body: string | null } | null>(null);

  // Doc parsing state
  const [parsingDocId, setParsingDocId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Web search
  const [webSearching, setWebSearching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<ProzorroTender>(`/prozorro/tender/${tenderId}`);
        setTender(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    })();
  }, [tenderId]);

  const handleParseDoc = useCallback(async (docId: string) => {
    setParsingDocId(docId);
    try {
      const updated = await api.post<ProzorroTenderDoc>(`/prozorro/docs/${docId}/parse`, {});
      setTender((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          docs: prev.docs?.map((d) => (d.id === docId ? { ...d, parsedText: updated.parsedText } : d)),
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка парсинга');
    } finally {
      setParsingDocId(null);
    }
  }, []);

  const handleAiPrepare = useCallback(async () => {
    if (!tender) return;
    setAiLoading(true);
    try {
      const result = await api.post<any>(`/prozorro/tender/${tender.id}/prepare`, {});
      setAiResult({
        searchQuery: result.searchQuery,
        subject: result.subject,
        body: result.body,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка AI');
    } finally {
      setAiLoading(false);
    }
  }, [tender]);

  const handleWebSearch = useCallback(async () => {
    if (!aiResult?.searchQuery) return;
    setWebSearching(true);
    try {
      await api.post('/prozorro/web-search', { searchQuery: aiResult.searchQuery });
      alert('Поиск завершён — перейдите в Воронку рассылки');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setWebSearching(false);
    }
  }, [aiResult]);

  if (!user) return null;

  if (loading) {
    return (
      <>
        <Header title="Тендер" user={user} />
        <div className="p-6 flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      </>
    );
  }

  if (error || !tender) {
    return (
      <>
        <Header title="Тендер" user={user} />
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
            {error || 'Тендер не найден'}
          </div>
        </div>
      </>
    );
  }

  const items = (tender.rawData as any)?.items || [];

  return (
    <>
      <Header title={tender.tenderNumber} user={user} />
      <div className="p-6 max-w-4xl">
        <Link href="/prozorro" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
          <ArrowLeft size={14} /> Назад к поиску
        </Link>

        {/* Main info */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-primary-600 dark:text-primary-400">{tender.tenderNumber}</span>
            {tender.status && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {tender.status}
              </span>
            )}
            <a
              href={`https://prozorro.gov.ua/tender/${tender.tenderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <ExternalLink size={12} /> Prozorro
            </a>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{tender.title}</h2>
          {tender.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tender.description}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Сумма:</span>{' '}
              <span className="font-semibold">{formatPrice(tender.amount, tender.currency)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Замовник:</span>{' '}
              <span>{tender.procuringEntityName || '—'}</span>
              {tender.procuringEntityId && (
                <span className="text-xs text-gray-400 ml-1">(ЄДРПОУ: {tender.procuringEntityId})</span>
              )}
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Тип:</span>{' '}
              <span>{tender.procurementMethodType || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Прийом до:</span>{' '}
              <span>{tender.tenderPeriodEnd ? new Date(tender.tenderPeriodEnd).toLocaleString('ru-RU') : '—'}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Позиції закупівлі ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-400 w-6 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="text-gray-800 dark:text-gray-200">{item.description || '—'}</span>
                    {(item.quantity != null || item.unit?.name) && (
                      <span className="text-gray-500 ml-2">
                        ({item.quantity ?? '?'} {item.unit?.name || 'шт'})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Документи ({tender.docs?.length || 0})
          </h3>
          {(!tender.docs || tender.docs.length === 0) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Документів немає</p>
          ) : (
            <div className="space-y-2">
              {tender.docs.map((doc) => (
                <div key={doc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{doc.title}</span>
                      {doc.documentType && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{doc.documentType}</span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        onClick={() => handleParseDoc(doc.id)}
                        disabled={parsingDocId === doc.id}
                        className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1"
                      >
                        {parsingDocId === doc.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                        Распарсить
                      </button>
                      {doc.parsedText && (
                        <button
                          onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                          className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1"
                        >
                          {expandedDocId === doc.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          Текст
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedDocId === doc.id && doc.parsedText && (
                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded max-h-60 overflow-auto whitespace-pre-wrap">
                      {doc.parsedText}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI-анализ</h3>
            <button
              onClick={handleAiPrepare}
              disabled={aiLoading}
              className="btn-primary !py-1.5 !px-3 text-sm flex items-center gap-2"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {aiResult ? 'Перезапустить AI' : 'Запустить AI'}
            </button>
          </div>

          {aiResult && (
            <div className="space-y-3">
              {aiResult.searchQuery && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Поисковый запрос:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
                      {aiResult.searchQuery}
                    </code>
                    <button
                      onClick={handleWebSearch}
                      disabled={webSearching}
                      className="btn-primary !py-1.5 !px-3 text-sm flex items-center gap-2"
                    >
                      {webSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Искать поставщиков
                    </button>
                  </div>
                </div>
              )}
              {aiResult.subject && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Тема письма:</label>
                  <p className="text-sm mt-1 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">{aiResult.subject}</p>
                </div>
              )}
              {aiResult.body && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Текст письма:</label>
                  <pre className="text-sm mt-1 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded whitespace-pre-wrap">{aiResult.body}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
