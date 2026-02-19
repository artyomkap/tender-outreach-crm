'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { Purchase } from '@/types';
import {
  ArrowLeft,
  FileDown,
  Calendar,
  Banknote,
  Building2,
  Tag,
  MapPin,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

  useEffect(() => {
    if (!purchaseNumber) return;

    const fetchPurchase = async () => {
      try {
        const data = await api.get<Purchase>(`/purchases/${purchaseNumber}`);
        setPurchase(data);
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
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatPrice(purchase.maxPrice, purchase.currencyCode)}
                </p>
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
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
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
                      <FileDown size={16} className="text-gray-400 group-hover:text-primary-600 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
