'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { PipelineDetail } from '@/types';
import {
  FileText,
  Brain,
  Globe,
  AtSign,
  Mail,
  X,
  Loader2,
  CheckCircle2,
  Circle,
  ExternalLink,
} from 'lucide-react';

type StageKey = 'docs' | 'ai' | 'sites' | 'emails' | 'letters';

interface PipelineStatusBarProps {
  purchaseId: string;
  savedDocsCount?: number;
  totalDocsCount?: number;
  aiResult?: { id: string; subject: string | null; body: string | null; searchTerm: { id: string; term: string } | null } | null;
  sitesCount?: number;
  emailsCount?: number;
}

const STAGE_CONFIG: { key: StageKey; icon: typeof FileText; label: string }[] = [
  { key: 'docs', icon: FileText, label: 'Документы' },
  { key: 'ai', icon: Brain, label: 'AI-анализ' },
  { key: 'sites', icon: Globe, label: 'Сайты' },
  { key: 'emails', icon: AtSign, label: 'Email' },
  { key: 'letters', icon: Mail, label: 'Письма' },
];

function getBadgeText(
  stage: StageKey,
  props: PipelineStatusBarProps,
): string {
  const { savedDocsCount = 0, totalDocsCount = 0, aiResult, sitesCount = 0, emailsCount = 0 } = props;
  switch (stage) {
    case 'docs':
      return totalDocsCount > 0 ? `${savedDocsCount}/${totalDocsCount}` : '0';
    case 'ai':
      return aiResult ? 'OK' : '—';
    case 'sites':
      return sitesCount > 0 ? String(sitesCount) : '—';
    case 'emails':
      return emailsCount > 0 ? String(emailsCount) : '—';
    case 'letters':
      return (aiResult?.subject && emailsCount > 0) ? String(emailsCount) : '—';
    default:
      return '—';
  }
}

function isStageComplete(
  stage: StageKey,
  props: PipelineStatusBarProps,
): boolean {
  const { savedDocsCount = 0, totalDocsCount = 0, aiResult, sitesCount = 0, emailsCount = 0 } = props;
  switch (stage) {
    case 'docs':
      return totalDocsCount > 0 && savedDocsCount > 0;
    case 'ai':
      return !!aiResult;
    case 'sites':
      return sitesCount > 0;
    case 'emails':
      return emailsCount > 0;
    case 'letters':
      return !!(aiResult?.subject && emailsCount > 0);
    default:
      return false;
  }
}

export default function PipelineStatusBar(props: PipelineStatusBarProps) {
  const { purchaseId } = props;
  const [openStage, setOpenStage] = useState<StageKey | null>(null);
  const [detail, setDetail] = useState<PipelineDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openModal = useCallback(async (stage: StageKey) => {
    setOpenStage(stage);
    setLoadingDetail(true);
    try {
      const data = await api.get<PipelineDetail>(`/purchases/${purchaseId}/pipeline`);
      setDetail(data);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  }, [purchaseId]);

  const closeModal = useCallback(() => {
    setOpenStage(null);
    setDetail(null);
  }, []);

  return (
    <>
      <div className="flex items-center gap-1">
        {STAGE_CONFIG.map(({ key, icon: Icon, label }, idx) => {
          const complete = isStageComplete(key, props);
          const text = getBadgeText(key, props);
          return (
            <button
              key={key}
              onClick={() => openModal(key)}
              title={label}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                complete
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon size={10} />
              {text}
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {openStage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {/* Stage tabs */}
                {STAGE_CONFIG.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => openModal(key)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      openStage === key
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary-600" />
                </div>
              ) : detail ? (
                <ModalContent stage={openStage} detail={detail} />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Не удалось загрузить данные
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalContent({ stage, detail }: { stage: StageKey; detail: PipelineDetail }) {
  switch (stage) {
    case 'docs':
      return <DocsContent detail={detail} />;
    case 'ai':
      return <AiContent detail={detail} />;
    case 'sites':
      return <SitesContent detail={detail} />;
    case 'emails':
      return <EmailsContent detail={detail} />;
    case 'letters':
      return <LettersContent detail={detail} />;
    default:
      return null;
  }
}

function DocsContent({ detail }: { detail: PipelineDetail }) {
  const { docs } = detail;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Документы: {docs.parsed}/{docs.total} спарсено
        </span>
        {docs.parsed === docs.total && docs.total > 0 && (
          <CheckCircle2 size={16} className="text-emerald-500" />
        )}
      </div>
      {docs.files.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Документов нет</p>
      ) : (
        <div className="space-y-2">
          {docs.files.map((f) => (
            <div
              key={f.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                f.parsed
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
              }`}
            >
              {f.parsed ? (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
              )}
              <span className="truncate">{f.fileName || f.docDescription || 'Без названия'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiContent({ detail }: { detail: PipelineDetail }) {
  const { ai } = detail;
  if (!ai.done) {
    return (
      <div className="text-center py-8">
        <Brain size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">AI-анализ не выполнен</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {ai.searchTerm && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Поисковый запрос</p>
          <p className="text-sm bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 px-3 py-2 rounded-lg">
            {ai.searchTerm}
          </p>
        </div>
      )}
      {ai.subject && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тема письма</p>
          <p className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg">
            {ai.subject}
          </p>
        </div>
      )}
      {ai.body && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тело письма</p>
          <p className="text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto">
            {ai.body}
          </p>
        </div>
      )}
    </div>
  );
}

function SitesContent({ detail }: { detail: PipelineDetail }) {
  const { sites } = detail;
  if (sites.count === 0) {
    return (
      <div className="text-center py-8">
        <Globe size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Сайты не найдены</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Найдено сайтов: {sites.count}
      </p>
      <div className="space-y-2">
        {sites.items.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Globe size={14} className="text-blue-500 shrink-0" />
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {s.title || s.url}
              </a>
            </div>
            {s.emailsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 shrink-0">
                <AtSign size={10} />
                {s.emailsCount}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailsContent({ detail }: { detail: PipelineDetail }) {
  const { emails } = detail;
  if (emails.count === 0) {
    return (
      <div className="text-center py-8">
        <AtSign size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Email-адреса не собраны</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Собрано email: {emails.count}
      </p>
      <div className="flex flex-wrap gap-2">
        {emails.items.map((email) => (
          <a
            key={email}
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
          >
            <AtSign size={10} />
            {email}
          </a>
        ))}
      </div>
    </div>
  );
}

function LettersContent({ detail }: { detail: PipelineDetail }) {
  const { ai, emails, letters } = detail;
  if (!letters.ready) {
    return (
      <div className="text-center py-8">
        <Mail size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {!ai.done
            ? 'Сначала выполните AI-анализ'
            : emails.count === 0
              ? 'Сначала соберите email-адреса'
              : 'Письма не готовы'}
        </p>
      </div>
    );
  }

  const subject = ai.subject || '';
  const body = ai.body || '';

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Готово к отправке на {letters.emailsCount} адресов
      </p>
      <div className="space-y-2 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тема</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">{subject}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Текст</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
            {body}
          </p>
        </div>
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Получатели</p>
      <div className="flex flex-wrap gap-2">
        {emails.items.map((email) => (
          <a
            key={email}
            href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Mail size={10} />
            {email}
            <ExternalLink size={8} />
          </a>
        ))}
      </div>
    </div>
  );
}
