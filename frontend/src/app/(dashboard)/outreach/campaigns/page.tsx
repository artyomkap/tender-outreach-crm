'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import {
  OutreachCampaign,
  OutreachCampaignStep,
  OutreachLeadList,
  OutreachEmailAccount,
  OutreachCampaignLead,
} from '@/types';
import {
  Zap,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Send,
  ChevronDown,
  ChevronUp,
  Users,
  Mail,
  CheckCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  XCircle,
  Reply,
  CircleDot,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  active: { label: 'Активна', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'Пауза', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Завершена', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:      { label: 'В очереди',        color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',          icon: <Clock size={10} /> },
  in_progress:  { label: 'Отправляется',     color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',        icon: <Loader2 size={10} className="animate-spin" /> },
  completed:    { label: 'Отправлено',       color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',    icon: <CheckCircle size={10} /> },
  replied:      { label: 'Ответил',          color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <Reply size={10} /> },
  bounced:      { label: 'Ошибка доставки', color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',            icon: <XCircle size={10} /> },
  unsubscribed: { label: 'Отписался',       color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: <CircleDot size={10} /> },
};

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<OutreachCampaign | null>(null);
  const [leadLists, setLeadLists] = useState<OutreachLeadList[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<OutreachEmailAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    leadListId: '',
    emailAccountIds: [] as string[],
    dailySendLimit: '50',
    sendFromHour: '9',
    sendToHour: '18',
  });

  const [stepsForm, setStepsForm] = useState<Array<{ subject: string; body: string; delayDays: string; delayHours: string }>>([
    { subject: '', body: '', delayDays: '0', delayHours: '0' },
  ]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await api.get<OutreachCampaign[]>('/outreach/campaigns');
      setCampaigns(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    api.get<OutreachLeadList[]>('/outreach/lead-lists').then(setLeadLists).catch(() => {});
    api.get<OutreachEmailAccount[]>('/outreach/email-accounts').then(setEmailAccounts).catch(() => {});
  }, [fetchCampaigns]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailCampaign(null);
      return;
    }
    setExpandedId(id);
    try {
      const detail = await api.get<OutreachCampaign>(`/outreach/campaigns/${id}`);
      setDetailCampaign(detail);
      if (detail.steps && detail.steps.length > 0) {
        setStepsForm(detail.steps.map((s) => ({
          subject: s.subject || '',
          body: s.body,
          delayDays: String(s.delayDays),
          delayHours: String(s.delayHours),
        })));
      } else {
        setStepsForm([{ subject: '', body: '', delayDays: '0', delayHours: '0' }]);
      }
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post<OutreachCampaign>('/outreach/campaigns', {
        name: createForm.name,
        leadListId: createForm.leadListId || undefined,
        emailAccountIds: createForm.emailAccountIds,
        dailySendLimit: parseInt(createForm.dailySendLimit),
        sendFromHour: parseInt(createForm.sendFromHour),
        sendToHour: parseInt(createForm.sendToHour),
      });
      setCampaigns((prev) => [created, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', leadListId: '', emailAccountIds: [], dailySendLimit: '50', sendFromHour: '9', sendToHour: '18' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSteps = async (campaignId: string) => {
    setSaving(true);
    try {
      const steps = stepsForm.map((s) => ({
        subject: s.subject || undefined,
        body: s.body,
        delayDays: parseInt(s.delayDays),
        delayHours: parseInt(s.delayHours),
      }));
      await api.post(`/outreach/campaigns/${campaignId}/steps`, { steps });
      alert('Цепочка сохранена');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('Запустить рассылку?')) return;
    setLaunchingId(id);
    try {
      const updated = await api.post<OutreachCampaign>(`/outreach/campaigns/${id}/launch`, {});
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c)));
      setDetailCampaign(updated);

      // Сразу отправляем, не ждём планировщика
      const result = await api.post<{ sent: number; errors: number }>(`/outreach/campaigns/${id}/send`, {});
      alert(`Рассылка запущена! Отправлено: ${result.sent}${result.errors > 0 ? `, ошибок: ${result.errors}` : ''}`);
      fetchCampaigns();
      if (expandedId === id) handleExpand(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLaunchingId(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/outreach/campaigns/${id}/pause`, {});
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'paused' as const } : c)));
    } catch {
      // ignore
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.post(`/outreach/campaigns/${id}/resume`, {});
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'active' as const } : c)));
    } catch {
      // ignore
    }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const result = await api.post<{ sent: number; errors: number }>(`/outreach/campaigns/${id}/send`, {});
      alert(`Отправлено: ${result.sent}, ошибок: ${result.errors}`);
      fetchCampaigns();
      if (expandedId === id) handleExpand(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить кампанию?')) return;
    try {
      await api.delete(`/outreach/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) { setExpandedId(null); setDetailCampaign(null); }
    } catch {
      // ignore
    }
  };

  const toggleEmailAccount = (accountId: string) => {
    setCreateForm((prev) => ({
      ...prev,
      emailAccountIds: prev.emailAccountIds.includes(accountId)
        ? prev.emailAccountIds.filter((id) => id !== accountId)
        : [...prev.emailAccountIds, accountId],
    }));
  };

  const handleUpdateAccounts = async (campaignId: string, accountIds: string[]) => {
    try {
      await api.patch(`/outreach/campaigns/${campaignId}`, { emailAccountIds: accountIds });
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, emailAccountIds: accountIds } : c));
      setDetailCampaign((prev) => prev ? { ...prev, emailAccountIds: accountIds } : prev);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const toggleDetailAccount = (campaignId: string, accountId: string, current: string[]) => {
    const next = current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId];
    handleUpdateAccounts(campaignId, next);
  };

  const addStep = () => {
    setStepsForm((prev) => [...prev, { subject: '', body: '', delayDays: '2', delayHours: '0' }]);
  };

  const removeStep = (idx: number) => {
    setStepsForm((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: string, value: string) => {
    setStepsForm((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  if (!user) return null;

  return (
    <>
      <Header title="Кампании рассылок" user={user} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/outreach" className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors">
            <ArrowLeft size={16} /> Назад
          </Link>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Новая кампания
          </button>
        </div>

        {/* Create Campaign Form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Новая кампания</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Название *</label>
                <input type="text" required value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Первая рассылка" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Список лидов</label>
                <select value={createForm.leadListId} onChange={(e) => setCreateForm((p) => ({ ...p, leadListId: e.target.value }))} className="input-field">
                  <option value="">— Выберите —</option>
                  {leadLists.map((ll) => (
                    <option key={ll.id} value={ll.id}>{ll.name} ({ll.leadsCount})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дневной лимит</label>
                <input type="number" value={createForm.dailySendLimit} onChange={(e) => setCreateForm((p) => ({ ...p, dailySendLimit: e.target.value }))} className="input-field" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Отправлять с</label>
                  <input type="number" min="0" max="23" value={createForm.sendFromHour} onChange={(e) => setCreateForm((p) => ({ ...p, sendFromHour: e.target.value }))} className="input-field" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">До</label>
                  <input type="number" min="0" max="23" value={createForm.sendToHour} onChange={(e) => setCreateForm((p) => ({ ...p, sendToHour: e.target.value }))} className="input-field" />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Почтовые аккаунты</label>
              <div className="flex flex-wrap gap-2">
                {emailAccounts.filter((a) => a.status === 'active').map((acc) => (
                  <button key={acc.id} type="button" onClick={() => toggleEmailAccount(acc.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      createForm.emailAccountIds.includes(acc.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Mail size={12} /> {acc.email}
                  </button>
                ))}
                {emailAccounts.filter((a) => a.status === 'active').length === 0 && (
                  <p className="text-xs text-gray-400">Нет активных аккаунтов. <Link href="/outreach/accounts" className="text-primary-600">Добавить</Link></p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Создать
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Отмена</button>
            </div>
          </form>
        )}

        {/* Campaigns List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card text-center py-12">
            <Zap size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Нет кампаний</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Создайте первую кампанию для рассылки
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const status = STATUS_LABELS[campaign.status] || STATUS_LABELS.draft;
              return (
                <div key={campaign.id} className="card">
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleExpand(campaign.id)}
                    >
                      <Zap size={18} className="text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {campaign.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span>{campaign.steps?.length || 0} шагов</span>
                          <span className="flex items-center gap-1"><Send size={10} /> {campaign.statsSent}</span>
                          <span className="flex items-center gap-1"><MessageSquare size={10} /> {campaign.statsReplied}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color} shrink-0`}>
                        {status.label}
                      </span>
                      {expandedId === campaign.id ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {campaign.status === 'draft' && (
                        <button onClick={() => handleLaunch(campaign.id)} disabled={launchingId === campaign.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {launchingId === campaign.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                          Запустить
                        </button>
                      )}
                      {campaign.status === 'active' && (
                        <>
                          <button onClick={() => handleSend(campaign.id)} disabled={sendingId === campaign.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {sendingId === campaign.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Отправить
                          </button>
                          <button onClick={() => handlePause(campaign.id)} className="p-1.5 rounded-lg text-yellow-500 hover:text-yellow-600 transition-colors" title="Пауза">
                            <Pause size={16} />
                          </button>
                        </>
                      )}
                      {campaign.status === 'paused' && (
                        <button onClick={() => handleResume(campaign.id)} className="p-1.5 rounded-lg text-green-500 hover:text-green-600 transition-colors" title="Возобновить">
                          <Play size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(campaign.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Campaign Detail */}
                  {expandedId === campaign.id && detailCampaign && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-6">
                      {/* Email Accounts */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Почтовые аккаунты для отправки
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {emailAccounts.filter((a) => a.status === 'active').map((acc) => {
                            const selected = (detailCampaign.emailAccountIds || []).includes(acc.id);
                            return (
                              <button key={acc.id} type="button"
                                onClick={() => toggleDetailAccount(campaign.id, acc.id, detailCampaign.emailAccountIds || [])}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                  selected
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                                }`}
                              >
                                <Mail size={12} /> {acc.email}
                              </button>
                            );
                          })}
                          {emailAccounts.filter((a) => a.status === 'active').length === 0 && (
                            <p className="text-xs text-gray-400">
                              Нет активных аккаунтов. <Link href="/outreach/accounts" className="text-primary-600">Добавить →</Link>
                            </p>
                          )}
                        </div>
                        {(detailCampaign.emailAccountIds || []).length === 0 && emailAccounts.filter((a) => a.status === 'active').length > 0 && (
                          <p className="text-xs text-amber-500 mt-1.5">Выберите хотя бы один аккаунт для запуска рассылки</p>
                        )}
                      </div>
                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <Send size={14} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{detailCampaign.statsSent}</p>
                            <p className="text-xs text-gray-500">Отправлено</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <MessageSquare size={14} className="text-green-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{detailCampaign.statsReplied}</p>
                            <p className="text-xs text-gray-500">Ответов</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                          <Users size={14} className="text-amber-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{detailCampaign.campaignLeads?.length || 0}</p>
                            <p className="text-xs text-gray-500">Лидов</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                          <AlertTriangle size={14} className="text-red-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{detailCampaign.statsBounced}</p>
                            <p className="text-xs text-gray-500">Отскочило</p>
                          </div>
                        </div>
                      </div>

                      {/* Steps Editor */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Цепочка писем</h4>
                          <div className="flex gap-2">
                            <button onClick={addStep} className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1">
                              <Plus size={12} /> Шаг
                            </button>
                            <button onClick={() => handleSaveSteps(campaign.id)} disabled={saving} className="btn-primary !py-1 !px-3 text-xs flex items-center gap-1">
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              Сохранить
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {stepsForm.map((step, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  Шаг {idx + 1}
                                  {idx > 0 && ` (через ${step.delayDays}д ${step.delayHours}ч)`}
                                </span>
                                {stepsForm.length > 1 && (
                                  <button onClick={() => removeStep(idx)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              {idx > 0 && (
                                <div className="flex gap-2 mb-2">
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Задержка (дней)</label>
                                    <input type="number" min="0" value={step.delayDays} onChange={(e) => updateStep(idx, 'delayDays', e.target.value)} className="input-field text-xs" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Часов</label>
                                    <input type="number" min="0" max="23" value={step.delayHours} onChange={(e) => updateStep(idx, 'delayHours', e.target.value)} className="input-field text-xs" />
                                  </div>
                                </div>
                              )}
                              <input
                                type="text"
                                placeholder="Тема письма"
                                value={step.subject}
                                onChange={(e) => updateStep(idx, 'subject', e.target.value)}
                                className="input-field text-xs mb-2"
                              />
                              <textarea
                                placeholder="Текст письма. Переменные: {{firstName}}, {{lastName}}, {{company}}, {{position}}, {{website}}"
                                value={step.body}
                                onChange={(e) => updateStep(idx, 'body', e.target.value)}
                                className="input-field text-xs"
                                rows={4}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Campaign Leads Status */}
                      {detailCampaign.campaignLeads && detailCampaign.campaignLeads.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Лиды ({detailCampaign.campaignLeads.length})
                          </h4>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {detailCampaign.campaignLeads.slice(0, 50).map((cl) => {
                              const total = detailCampaign.steps?.length || 0;
                              const cfg = LEAD_STATUS_CONFIG[cl.status] || LEAD_STATUS_CONFIG.pending;
                              const stepLabel = cl.status === 'pending'
                                ? 'Ещё не отправлено'
                                : `Письмо ${cl.currentStep} из ${total}`;
                              return (
                                <div key={cl.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs">
                                  <span className="text-gray-900 dark:text-gray-100 truncate">
                                    {cl.lead?.email || cl.leadId}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-gray-400">{stepLabel}</span>
                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                                      {cfg.icon}
                                      {cfg.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
