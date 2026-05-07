'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Purchase, PurchaseFile, PurchaseAiResult, WebSearchResult } from '@/types';
import {
  Wand2,
  FileText,
  Sparkles,
  Globe,
  AtSign,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
} from 'lucide-react';

interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  detail?: string;
  icon: React.ReactNode;
}

interface MagicPipelineProps {
  purchase: Purchase;
  onComplete?: () => void;
  onApprove?: (data: { emails: string[]; subject: string; body: string }) => void;
}

export default function MagicPipeline({ purchase, onComplete, onApprove }: MagicPipelineProps) {
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [result, setResult] = useState<{
    aiResult?: PurchaseAiResult | null;
    searchResults?: WebSearchResult[];
    emails?: string[];
  } | null>(null);

  const updateStep = (id: string, updates: Partial<PipelineStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const runPipeline = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setExpanded(true);
    setResult(null);

    const files = purchase.files || [];
    const unsavedFiles = files.filter((f) => !f.parsedText);
    const totalDocs = files.length;
    const savedDocs = files.filter((f) => f.parsedText).length;

    // Build initial steps
    const initialSteps: PipelineStep[] = [];

    if (unsavedFiles.length > 0) {
      initialSteps.push({
        id: 'parse-docs',
        label: `Парсинг документов (${unsavedFiles.length} из ${totalDocs})`,
        status: 'pending',
        icon: <FileText size={16} />,
      });
    } else if (totalDocs > 0) {
      initialSteps.push({
        id: 'parse-docs',
        label: `Документы уже сохранены (${savedDocs}/${totalDocs})`,
        status: 'skipped',
        icon: <FileText size={16} />,
      });
    }

    initialSteps.push(
      {
        id: 'ai-prepare',
        label: 'AI-анализ: тема, письмо, поисковый запрос',
        status: 'pending',
        icon: <Sparkles size={16} />,
      },
      {
        id: 'web-search',
        label: 'Поиск сайтов по запросу',
        status: 'pending',
        icon: <Globe size={16} />,
      },
      {
        id: 'parse-emails',
        label: 'Сбор email-адресов с сайтов',
        status: 'pending',
        icon: <AtSign size={16} />,
      },
      {
        id: 'done',
        label: 'Письма подготовлены к отправке',
        status: 'pending',
        icon: <Mail size={16} />,
      },
    );

    setSteps(initialSteps);

    try {
      // Step 1: Parse unsaved documents
      if (unsavedFiles.length > 0) {
        updateStep('parse-docs', { status: 'running', detail: `0/${unsavedFiles.length}` });
        let parsed = 0;
        for (const file of unsavedFiles) {
          try {
            await api.post<PurchaseFile>(`/purchases/files/${file.id}/parse`, {});
            parsed++;
            updateStep('parse-docs', { detail: `${parsed}/${unsavedFiles.length}` });
          } catch {
            // Continue with other files
          }
        }
        updateStep('parse-docs', {
          status: 'done',
          detail: `Сохранено ${parsed + savedDocs}/${totalDocs}`,
        });
      }

      // Step 2: AI Prepare
      updateStep('ai-prepare', { status: 'running', detail: 'Отправка запроса...' });
      let aiResult: PurchaseAiResult | null = null;
      try {
        aiResult = await api.post<PurchaseAiResult>(
          `/purchases/${purchase.id}/prepare`,
          {},
        );
        updateStep('ai-prepare', {
          status: 'done',
          detail: aiResult.searchTerm
            ? `Запрос: "${aiResult.searchTerm.term}"`
            : 'Готово',
        });
      } catch (err) {
        updateStep('ai-prepare', {
          status: 'error',
          detail: err instanceof Error ? err.message : 'Ошибка',
        });
        // Can't continue without AI result
        updateStep('web-search', { status: 'skipped', detail: 'Нет поискового запроса' });
        updateStep('parse-emails', { status: 'skipped', detail: 'Нет сайтов' });
        updateStep('done', { status: 'error', detail: 'Прервано из-за ошибки AI' });
        setRunning(false);
        return;
      }

      // Step 3: Web search
      let searchResults: WebSearchResult[] = [];
      if (aiResult?.searchTerm) {
        updateStep('web-search', { status: 'running', detail: 'Поиск...' });
        try {
          searchResults = await api.post<WebSearchResult[]>(
            `/purchases/web-search/${aiResult.searchTerm.id}`,
            {},
          );
          updateStep('web-search', {
            status: 'done',
            detail: `Найдено ${searchResults.length} сайт(ов)`,
          });
        } catch (err) {
          updateStep('web-search', {
            status: 'error',
            detail: err instanceof Error ? err.message : 'Ошибка',
          });
          updateStep('parse-emails', { status: 'skipped', detail: 'Нет сайтов' });
          updateStep('done', { status: 'error', detail: 'Прервано' });
          setRunning(false);
          setResult({ aiResult, searchResults: [] });
          return;
        }
      } else {
        updateStep('web-search', { status: 'skipped', detail: 'AI не вернул поисковый запрос' });
        updateStep('parse-emails', { status: 'skipped', detail: 'Нет сайтов' });
        updateStep('done', {
          status: 'done',
          detail: 'Письмо готово, но без email-адресов',
        });
        setRunning(false);
        setResult({ aiResult, searchResults: [] });
        return;
      }

      // Step 4: Parse emails from each site
      if (searchResults.length > 0) {
        updateStep('parse-emails', { status: 'running', detail: `0/${searchResults.length} сайтов` });
        const allEmails = new Set<string>();
        let processed = 0;

        for (const site of searchResults) {
          try {
            const res = await api.post<{ emails: string[] }>(
              `/purchases/web-search-results/${site.id}/parse-emails`,
              {},
            );
            for (const email of res.emails) {
              allEmails.add(email);
            }
          } catch {
            // Continue with other sites
          }
          processed++;
          updateStep('parse-emails', {
            detail: `${processed}/${searchResults.length} сайтов, ${allEmails.size} email`,
          });
        }

        const emailList = Array.from(allEmails).sort();
        updateStep('parse-emails', {
          status: 'done',
          detail: `Найдено ${emailList.length} email-адрес(ов)`,
        });

        // Final step
        updateStep('done', {
          status: 'done',
          detail: emailList.length > 0
            ? `Готово! ${emailList.length} адресат(ов)`
            : 'Готово, но email-адреса не найдены',
        });

        setResult({ aiResult, searchResults, emails: emailList });
      } else {
        updateStep('parse-emails', { status: 'skipped', detail: 'Нет результатов поиска' });
        updateStep('done', { status: 'done', detail: 'Письмо готово' });
        setResult({ aiResult, searchResults: [] });
      }
    } catch (err) {
      // Unexpected error
    } finally {
      setRunning(false);
      onComplete?.();
    }
  }, [running, purchase, onComplete]);

  const statusIcon = (status: PipelineStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 size={14} className="animate-spin text-blue-500" />;
      case 'done':
        return <Check size={14} className="text-emerald-500" />;
      case 'error':
        return <X size={14} className="text-red-500" />;
      case 'skipped':
        return <span className="w-3.5 h-3.5 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />;
      default:
        return <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 inline-block" />;
    }
  };

  return (
    <div className="relative">
      {/* Magic button */}
      <button
        onClick={runPipeline}
        disabled={running}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-700 hover:via-fuchsia-700 hover:to-pink-700 rounded-lg transition-all disabled:opacity-70 shadow-sm hover:shadow-md"
        title="Запустить полный цикл обработки"
      >
        {running ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Wand2 size={14} />
        )}
        {running ? 'Обработка...' : 'Magic'}
      </button>

      {/* Pipeline progress panel */}
      {steps.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {running ? 'Процесс выполняется...' : 'Результат обработки'}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                    step.status === 'running'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                      : step.status === 'done'
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                        : step.status === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{statusIcon(step.status)}</div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`shrink-0 ${
                      step.status === 'running' ? 'text-blue-500' :
                      step.status === 'done' ? 'text-emerald-500' :
                      step.status === 'error' ? 'text-red-500' :
                      'text-gray-400'
                    }`}>
                      {step.icon}
                    </span>
                    <span className={`font-medium ${
                      step.status === 'running' ? 'text-blue-700 dark:text-blue-300' :
                      step.status === 'done' ? 'text-emerald-700 dark:text-emerald-300' :
                      step.status === 'error' ? 'text-red-700 dark:text-red-300' :
                      step.status === 'skipped' ? 'text-gray-400 dark:text-gray-500' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                    {step.detail && (
                      <span className="text-gray-400 dark:text-gray-500 truncate">
                        — {step.detail}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Summary with emails */}
              {result?.emails && result.emails.length > 0 && !running && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AtSign size={12} className="text-teal-500" />
                      <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                        Найденные адреса ({result.emails.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.emails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 dark:bg-teal-800/50 text-teal-700 dark:text-teal-300"
                        >
                          <Mail size={10} />
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>

                  {onApprove && (
                    <button
                      onClick={() => onApprove({
                        emails: result.emails!,
                        subject: result.aiResult?.subject || '',
                        body: result.aiResult?.body || '',
                      })}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                    >
                      <Send size={16} />
                      Утвердить тендер в рассылку →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
