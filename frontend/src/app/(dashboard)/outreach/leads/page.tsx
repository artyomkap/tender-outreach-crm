'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { api } from '@/lib/api';
import { OutreachLeadList, OutreachLead } from '@/types';
import {
  Users,
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  AtSign,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function OutreachLeadsPage() {
  const { user } = useAuth();
  const [lists, setLists] = useState<OutreachLeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importingListId, setImportingListId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [leadForm, setLeadForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    website: '',
    position: '',
    phone: '',
  });

  const fetchLists = useCallback(async () => {
    try {
      const data = await api.get<OutreachLeadList[]>('/outreach/lead-lists');
      setLists(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const fetchLeads = useCallback(async (listId: string, page: number) => {
    setLeadsLoading(true);
    try {
      const data = await api.get<{ data: OutreachLead[]; total: number }>(
        `/outreach/lead-lists/${listId}/leads?page=${page}&limit=20`,
      );
      setLeads(data.data);
      setLeadsTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const handleExpandList = useCallback(
    (listId: string) => {
      if (expandedListId === listId) {
        setExpandedListId(null);
        return;
      }
      setExpandedListId(listId);
      setLeadsPage(1);
      fetchLeads(listId, 1);
    },
    [expandedListId, fetchLeads],
  );

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setSaving(true);
    try {
      const created = await api.post<OutreachLeadList>('/outreach/lead-lists', {
        name: newListName,
        description: newListDesc || undefined,
      });
      setLists((prev) => [created, ...prev]);
      setShowCreateList(false);
      setNewListName('');
      setNewListDesc('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('Удалить список лидов и все лиды в нём?')) return;
    try {
      await api.delete(`/outreach/lead-lists/${id}`);
      setLists((prev) => prev.filter((l) => l.id !== id));
      if (expandedListId === id) setExpandedListId(null);
    } catch {
      // ignore
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedListId || !leadForm.email) return;
    setSaving(true);
    try {
      const created = await api.post<OutreachLead>(`/outreach/lead-lists/${expandedListId}/leads`, leadForm);
      setLeads((prev) => [created, ...prev]);
      setLeadsTotal((prev) => prev + 1);
      setLists((prev) => prev.map((l) => (l.id === expandedListId ? { ...l, leadsCount: l.leadsCount + 1 } : l)));
      setShowAddLead(false);
      setLeadForm({ email: '', firstName: '', lastName: '', company: '', website: '', position: '', phone: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!expandedListId || !bulkText.trim()) return;
    setBulkImporting(true);
    try {
      const lines = bulkText.split('\n').filter((l) => l.trim());
      const leads = lines.map((line) => {
        // Support formats: "email, firstName, lastName" or "email firstName lastName" or just "email"
        const sep = line.includes(',') ? ',' : line.includes(';') ? ';' : line.includes('\t') ? '\t' : ' ';
        const parts = line.split(sep).map((p) => p.trim()).filter(Boolean);
        return {
          email: parts[0] || '',
          firstName: parts[1] || undefined,
          lastName: parts[2] || undefined,
          company: parts[3] || undefined,
        };
      }).filter((l) => l.email && l.email.includes('@'));

      if (leads.length === 0) {
        alert('Не найдено валидных email-адресов');
        return;
      }

      const result = await api.post<{ imported: number; skipped: number }>(
        `/outreach/lead-lists/${expandedListId}/import`,
        { leads },
      );
      alert(`Импортировано: ${result.imported}, пропущено: ${result.skipped}`);
      setBulkText('');
      setShowBulkAdd(false);
      fetchLists();
      fetchLeads(expandedListId, leadsPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await api.delete(`/outreach/leads/${id}`);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setLeadsTotal((prev) => prev - 1);
      if (expandedListId) {
        setLists((prev) => prev.map((l) => (l.id === expandedListId ? { ...l, leadsCount: Math.max(0, l.leadsCount - 1) } : l)));
      }
    } catch {
      // ignore
    }
  };

  const handleCsvImport = async (listId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImportingListId(listId);
      try {
        const text = await file.text();
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length === 0) return;

        // Parse CSV: detect separator and headers
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('почта') || h.includes('mail'));
        const firstNameIdx = headers.findIndex((h) => h.includes('first') || h.includes('имя') || h === 'name');
        const lastNameIdx = headers.findIndex((h) => h.includes('last') || h.includes('фамилия'));
        const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('компания') || h.includes('организация'));
        const websiteIdx = headers.findIndex((h) => h.includes('website') || h.includes('сайт') || h.includes('site') || h.includes('url'));
        const positionIdx = headers.findIndex((h) => h.includes('position') || h.includes('должность') || h.includes('title'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('телефон'));

        const leads = lines.slice(1).map((line) => {
          const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
          return {
            email: emailIdx >= 0 ? cols[emailIdx] : cols[0],
            firstName: firstNameIdx >= 0 ? cols[firstNameIdx] : undefined,
            lastName: lastNameIdx >= 0 ? cols[lastNameIdx] : undefined,
            company: companyIdx >= 0 ? cols[companyIdx] : undefined,
            website: websiteIdx >= 0 ? cols[websiteIdx] : undefined,
            position: positionIdx >= 0 ? cols[positionIdx] : undefined,
            phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
          };
        }).filter((l) => l.email && l.email.includes('@'));

        const result = await api.post<{ imported: number; skipped: number }>(`/outreach/lead-lists/${listId}/import`, { leads });
        alert(`Импортировано: ${result.imported}, пропущено: ${result.skipped}`);
        fetchLists();
        if (expandedListId === listId) fetchLeads(listId, leadsPage);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Ошибка импорта');
      } finally {
        setImportingListId(null);
      }
    };
    input.click();
  };

  const leadsTotalPages = Math.ceil(leadsTotal / 20);

  if (!user) return null;

  return (
    <>
      <Header title="База лидов" user={user} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/outreach"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
          >
            <ArrowLeft size={16} /> Назад
          </Link>
          <button
            onClick={() => setShowCreateList(!showCreateList)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Создать список
          </button>
        </div>

        {/* Create List Form */}
        {showCreateList && (
          <form onSubmit={handleCreateList} className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Новый список лидов
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="input-field"
                  placeholder="B2B компании Москва"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Описание
                </label>
                <input
                  type="text"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="input-field"
                  placeholder="Базa из Export-base"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Создать
              </button>
              <button type="button" onClick={() => setShowCreateList(false)} className="btn-secondary">
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Lists */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : lists.length === 0 ? (
          <div className="card text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Нет списков лидов</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Создайте список и загрузите CSV с базой компаний
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <div key={list.id} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleExpandList(list.id)}
                  >
                    <Users size={18} className="text-violet-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {list.name}
                      </p>
                      {list.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 shrink-0">
                      {list.leadsCount} лидов
                    </span>
                    {expandedListId === list.id ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCsvImport(list.id)}
                      disabled={importingListId === list.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors disabled:opacity-50"
                    >
                      {importingListId === list.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Upload size={12} />
                      )}
                      CSV
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      title="Удалить список"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Leads Table */}
                {expandedListId === list.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500">{leadsTotal} лидов</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setShowBulkAdd(!showBulkAdd); setShowAddLead(false); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                        >
                          <Users size={12} /> Массовое добавление
                        </button>
                        <button
                          onClick={() => { setShowAddLead(!showAddLead); setShowBulkAdd(false); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                        >
                          <Plus size={12} /> Добавить лида
                        </button>
                      </div>
                    </div>

                    {showBulkAdd && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Вставьте лидов по одному на строку. Формат: <code className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded">email, имя, фамилия, компания</code>
                        </p>
                        <textarea
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                          rows={8}
                          className="input-field text-xs font-mono w-full"
                          placeholder={`ivan@example.com, Иван, Петров, ООО Ромашка\nanna@company.ru, Анна, Сидорова\npeter@mail.com`}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {bulkText.trim() ? `${bulkText.split('\n').filter((l) => l.trim()).length} строк` : 'Пусто'}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={handleBulkAdd}
                              disabled={bulkImporting || !bulkText.trim()}
                              className="btn-primary !py-1 !px-3 text-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              {bulkImporting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                              Импортировать
                            </button>
                            <button
                              onClick={() => { setShowBulkAdd(false); setBulkText(''); }}
                              className="btn-secondary !py-1 !px-3 text-xs"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {showAddLead && (
                      <form onSubmit={handleAddLead} className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="grid grid-cols-3 gap-2">
                          <input type="email" required placeholder="Email *" value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))} className="input-field text-xs" />
                          <input type="text" placeholder="Имя" value={leadForm.firstName} onChange={(e) => setLeadForm((p) => ({ ...p, firstName: e.target.value }))} className="input-field text-xs" />
                          <input type="text" placeholder="Фамилия" value={leadForm.lastName} onChange={(e) => setLeadForm((p) => ({ ...p, lastName: e.target.value }))} className="input-field text-xs" />
                          <input type="text" placeholder="Компания" value={leadForm.company} onChange={(e) => setLeadForm((p) => ({ ...p, company: e.target.value }))} className="input-field text-xs" />
                          <input type="text" placeholder="Сайт" value={leadForm.website} onChange={(e) => setLeadForm((p) => ({ ...p, website: e.target.value }))} className="input-field text-xs" />
                          <input type="text" placeholder="Должность" value={leadForm.position} onChange={(e) => setLeadForm((p) => ({ ...p, position: e.target.value }))} className="input-field text-xs" />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button type="submit" disabled={saving} className="btn-primary !py-1 !px-3 text-xs">
                            Добавить
                          </button>
                          <button type="button" onClick={() => setShowAddLead(false)} className="btn-secondary !py-1 !px-3 text-xs">
                            Отмена
                          </button>
                        </div>
                      </form>
                    )}

                    {leadsLoading ? (
                      <div className="py-6 text-center">
                        <Loader2 size={20} className="animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : leads.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">Лидов пока нет</p>
                    ) : (
                      <div className="space-y-1">
                        {leads.map((lead) => (
                          <div
                            key={lead.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <AtSign size={14} className="text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                {lead.email}
                              </span>
                              {lead.firstName && (
                                <span className="text-xs text-gray-500 shrink-0">
                                  {lead.firstName} {lead.lastName || ''}
                                </span>
                              )}
                              {lead.company && (
                                <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                                  <Building2 size={10} /> {lead.company}
                                </span>
                              )}
                              {lead.website && (
                                <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                                  <Globe size={10} /> {lead.website}
                                </span>
                              )}
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                                  lead.status === 'active'
                                    ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                    : lead.status === 'bounced'
                                      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                              >
                                {lead.status}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {leadsTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <button
                          onClick={() => { setLeadsPage((p) => Math.max(1, p - 1)); fetchLeads(list.id, Math.max(1, leadsPage - 1)); }}
                          disabled={leadsPage === 1}
                          className="btn-secondary !py-1 !px-2 disabled:opacity-50"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-gray-500">{leadsPage} / {leadsTotalPages}</span>
                        <button
                          onClick={() => { setLeadsPage((p) => Math.min(leadsTotalPages, p + 1)); fetchLeads(list.id, Math.min(leadsTotalPages, leadsPage + 1)); }}
                          disabled={leadsPage === leadsTotalPages}
                          className="btn-secondary !py-1 !px-2 disabled:opacity-50"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
