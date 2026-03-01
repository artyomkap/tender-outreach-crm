'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ProzorroPipelineDetail } from '@/types';
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

interface Props {
  tenderId: string;
}

const STAGE_CONFIG: { key: StageKey; icon: typeof FileText; label: string }[] = [
  { key: 'docs', icon: FileText, label: 'Документи' },
  { key: 'ai', icon: Brain, label: 'AI-аналіз' },
  { key: 'sites', icon: Globe, label: 'Сайти' },
  { key: 'emails', icon: AtSign, label: 'Email' },
  { key: 'letters', icon: Mail, label: 'Листи' },
];

export default function ProzorroPipelineStatus({ tenderId }: Props) {
  const [openStage, setOpenStage] = useState<StageKey | null>(null);
  const [detail, setDetail] = useState<ProzorroPipelineDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openModal = useCallback(async (stage: StageKey) => {
    setOpenStage(stage);
    setLoadingDetail(true);
    try {
      const data = await api.get<ProzorroPipelineDetail>(`/prozorro/tender/${tenderId}/pipeline`);
      setDetail(data);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  }, [tenderId]);

  const closeModal = useCallback(() => {
    setOpenStage(null);
    setDetail(null);
  }, []);

  function getBadgeText(stage: StageKey): string {
    if (!detail) return '—';
    switch (stage) {
      case 'docs':
        return detail.docs.total > 0 ? `${detail.docs.parsed}/${detail.docs.total}` : '0';
      case 'ai':
        return detail.ai.done ? 'OK' : '—';
      case 'sites':
        return detail.sites.count > 0 ? String(detail.sites.count) : '—';
      case 'emails':
        return detail.emails.count > 0 ? String(detail.emails.count) : '—';
      case 'letters':
        return detail.letters.ready ? String(detail.letters.emailsCount) : '—';
      default:
        return '—';
    }
  }

  function isStageComplete(stage: StageKey): boolean {
    if (!detail) return false;
    switch (stage) {
      case 'docs':
        return detail.docs.total > 0 && detail.docs.parsed > 0;
      case 'ai':
        return detail.ai.done;
      case 'sites':
        return detail.sites.count > 0;
      case 'emails':
        return detail.emails.count > 0;
      case 'letters':
        return detail.letters.ready;
      default:
        return false;
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {STAGE_CONFIG.map(({ key, icon: Icon, label }) => {
          const complete = isStageComplete(key);
          const text = getBadgeText(key);
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
                  Не вдалося завантажити дані
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalContent({ stage, detail }: { stage: StageKey; detail: ProzorroPipelineDetail }) {
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

function DocsContent({ detail }: { detail: ProzorroPipelineDetail }) {
  const { docs } = detail;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Документи: {docs.parsed}/{docs.total} спарсено
        </span>
        {docs.parsed === docs.total && docs.total > 0 && (
          <CheckCircle2 size={16} className="text-emerald-500" />
        )}
      </div>
      {docs.files.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Документів немає</p>
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
              <span className="truncate">{f.title || f.documentType || 'Без назви'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiContent({ detail }: { detail: ProzorroPipelineDetail }) {
  const { ai } = detail;
  if (!ai.done) {
    return (
      <div className="text-center py-8">
        <Brain size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">AI-аналіз не виконано</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {ai.searchQuery && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Пошуковий запит</p>
          <p className="text-sm bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 px-3 py-2 rounded-lg">
            {ai.searchQuery}
          </p>
        </div>
      )}
      {ai.subject && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тема листа</p>
          <p className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg">
            {ai.subject}
          </p>
        </div>
      )}
      {ai.body && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тіло листа</p>
          <p className="text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto">
            {ai.body}
          </p>
        </div>
      )}
    </div>
  );
}

function SitesContent({ detail }: { detail: ProzorroPipelineDetail }) {
  const { sites } = detail;
  if (sites.count === 0) {
    return (
      <div className="text-center py-8">
        <Globe size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Сайти не знайдено</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Знайдено сайтів: {sites.count}
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

function EmailsContent({ detail }: { detail: ProzorroPipelineDetail }) {
  const { emails } = detail;
  if (emails.count === 0) {
    return (
      <div className="text-center py-8">
        <AtSign size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Email-адреси не зібрано</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Зібрано email: {emails.count}
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

function LettersContent({ detail }: { detail: ProzorroPipelineDetail }) {
  const { ai, emails, letters } = detail;
  if (!letters.ready) {
    return (
      <div className="text-center py-8">
        <Mail size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {!ai.done
            ? 'Спочатку виконайте AI-аналіз'
            : emails.count === 0
              ? 'Спочатку зберіть email-адреси'
              : 'Листи не готові'}
        </p>
      </div>
    );
  }

  const subject = ai.subject || '';
  const body = ai.body || '';

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Готово до відправки на {letters.emailsCount} адрес
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
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Отримувачі</p>
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
