'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Purchase, PurchaseFile, PurchaseAiResult, WebSearchResult } from '@/types';
import { Wand2, Loader2, Check, X } from 'lucide-react';

interface Props {
  purchaseId: string;
  onComplete?: () => void;
}

type StepStatus = 'idle' | 'docs' | 'ai' | 'search' | 'emails' | 'done' | 'error';

const STEP_LABELS: Record<StepStatus, string> = {
  idle: '',
  docs: 'Документы...',
  ai: 'AI-анализ...',
  search: 'Поиск...',
  emails: 'Email...',
  done: 'Готово!',
  error: 'Ошибка',
};

export default function MagicButtonCompact({ purchaseId, onComplete }: Props) {
  const [step, setStep] = useState<StepStatus>('idle');
  const [emailCount, setEmailCount] = useState(0);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setEmailCount(0);

    try {
      // Load purchase with files
      setStep('docs');
      let purchase: Purchase;
      try {
        // We need to get purchase number from id - use the detail view
        // Actually, we can call prepare directly which handles file loading
        // But we need to parse docs first. Let's fetch the purchase data
        const found = await api.get<{ data: any[] }>(
          `/purchases/found?page=1&limit=200`,
        );
        const item = found.data.find((f: any) => f.purchaseId === purchaseId);
        if (!item?.purchase) throw new Error('Закупка не найдена');
        purchase = item.purchase;
      } catch {
        // Try getting by purchaseId directly via existing endpoints
        // If that fails, just proceed to AI step
        setStep('ai');
        let aiResult: PurchaseAiResult | null = null;
        try {
          aiResult = await api.post<PurchaseAiResult>(
            `/purchases/${purchaseId}/prepare`,
            {},
          );
        } catch {
          setStep('error');
          running.current = false;
          return;
        }

        if (aiResult?.searchTerm) {
          setStep('search');
          let searchResults: WebSearchResult[] = [];
          try {
            searchResults = await api.post<WebSearchResult[]>(
              `/purchases/web-search/${aiResult.searchTerm.id}`,
              {},
            );
          } catch {
            // continue
          }

          if (searchResults.length > 0) {
            setStep('emails');
            const allEmails = new Set<string>();
            for (const site of searchResults) {
              try {
                const res = await api.post<{ emails: string[] }>(
                  `/purchases/web-search-results/${site.id}/parse-emails`,
                  {},
                );
                for (const e of res.emails) allEmails.add(e);
              } catch {
                // continue
              }
            }
            setEmailCount(allEmails.size);
          }
        }

        setStep('done');
        running.current = false;
        onComplete?.();
        return;
      }

      // Parse unsaved docs
      const unsaved = (purchase.files || []).filter((f) => !f.parsedText);
      for (const file of unsaved) {
        try {
          await api.post<PurchaseFile>(`/purchases/files/${file.id}/parse`, {});
        } catch {
          // continue
        }
      }

      // AI Prepare
      setStep('ai');
      let aiResult: PurchaseAiResult | null = null;
      try {
        aiResult = await api.post<PurchaseAiResult>(
          `/purchases/${purchaseId}/prepare`,
          {},
        );
      } catch {
        setStep('error');
        running.current = false;
        return;
      }

      // Web search
      let searchResults: WebSearchResult[] = [];
      if (aiResult?.searchTerm) {
        setStep('search');
        try {
          searchResults = await api.post<WebSearchResult[]>(
            `/purchases/web-search/${aiResult.searchTerm.id}`,
            {},
          );
        } catch {
          // continue
        }
      }

      // Parse emails
      if (searchResults.length > 0) {
        setStep('emails');
        const allEmails = new Set<string>();
        for (const site of searchResults) {
          try {
            const res = await api.post<{ emails: string[] }>(
              `/purchases/web-search-results/${site.id}/parse-emails`,
              {},
            );
            for (const e of res.emails) allEmails.add(e);
          } catch {
            // continue
          }
        }
        setEmailCount(allEmails.size);
      }

      setStep('done');
      onComplete?.();
    } catch {
      setStep('error');
    } finally {
      running.current = false;
    }
  }, [purchaseId, onComplete]);

  const isRunning = step !== 'idle' && step !== 'done' && step !== 'error';

  return (
    <button
      onClick={run}
      disabled={isRunning}
      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all disabled:cursor-wait ${
        step === 'done'
          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
          : step === 'error'
            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
            : isRunning
              ? 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/30'
              : 'text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-700 hover:via-fuchsia-700 hover:to-pink-700 shadow-sm'
      }`}
      title={isRunning ? STEP_LABELS[step] : 'Полный цикл обработки'}
    >
      {step === 'done' ? (
        <Check size={12} />
      ) : step === 'error' ? (
        <X size={12} />
      ) : isRunning ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Wand2 size={12} />
      )}
      {isRunning
        ? STEP_LABELS[step]
        : step === 'done'
          ? emailCount > 0 ? `${emailCount} email` : 'Готово'
          : step === 'error'
            ? 'Ошибка'
            : 'Magic'}
    </button>
  );
}
