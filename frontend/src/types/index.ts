export enum Role {
  ADMIN = 'admin',
  DIRECTOR = 'director',
  MANAGER = 'manager',
  SUPPORT = 'support',
  SELLER = 'seller',
  MARKETER = 'marketer',
  CLIENT = 'client',
  PARTNER = 'partner',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Администратор',
  [Role.DIRECTOR]: 'Директор',
  [Role.MANAGER]: 'Менеджер',
  [Role.SUPPORT]: 'Техподдержка',
  [Role.SELLER]: 'Продавец',
  [Role.MARKETER]: 'Маркетолог',
  [Role.CLIENT]: 'Клиент',
  [Role.PARTNER]: 'Партнёр',
};

export type ThemeVariant = 'classic' | 'modern';
export type ColorMode = 'light' | 'dark';

export interface UserSettings {
  theme?: ThemeVariant;
  colorMode?: ColorMode;
  parserDocsUrl?: string;
  proxyUrl?: string;
  aiUrl?: string;
  aiPrompt?: string;
  searchApiUrl?: string;
  touchApiToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpRelayUrl?: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  imapSecure?: boolean;
  emailFrom?: string;
}

export interface TouchApiClient {
  _id: string;
  login: string;
  owner: string;
  state: boolean;
  activated: boolean;
  step: string | { message: string; value: string } | null;
  addedTime: number;
  webhookUrls: string[];
  defaultState: boolean;
}

export interface TouchApiInfo {
  clients: TouchApiClient[];
  summary: {
    active: number;
    activated: number;
    demo: number;
    count: number;
    payment?: { mode: string; balance: number };
  };
  status: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  settings?: UserSettings | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'settings'>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface SshServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  createdAt: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  objectInfo: string | null;
  maxPrice: number | null;
  currencyCode: string | null;
  purchaseType: string | null;
  stage: number | null;
  region: number | null;
  publishedAt: string | null;
  updatedAtExternal: string | null;
  customers: string[] | null;
  rawListData: Record<string, unknown> | null;
  rawDetailData: Record<string, unknown> | null;
  detailFetchedAt: string | null;
  createdAt: string;
  files?: PurchaseFile[];
}

export interface PurchaseFile {
  id: string;
  publishedContentId: string;
  fileName: string | null;
  fileSize: number | null;
  docDescription: string | null;
  docDate: string | null;
  url: string;
  docKindCode: string | null;
  docKindName: string | null;
  docType: string | null;
  isDownloaded: boolean;
  parsedText: string | null;
}

export interface UserPurchaseHistory {
  id: string;
  searchQuery: string | null;
  foundAt: string;
  purchase: Purchase;
}

export interface SearchQueryRecord {
  id: string;
  userId: string;
  queryParams: Record<string, unknown>;
  resultsCount: number;
  createdAt: string;
}

export interface FoundPurchase {
  id: string;
  userId: string;
  purchaseId: string;
  searchQueryId: string | null;
  isFavorite: boolean;
  createdAt: string;
  purchase: Purchase;
  aiResult?: { id: string; subject: string | null; body: string | null; searchTerm: AiSearchTerm | null } | null;
  savedDocsCount?: number;
  totalDocsCount?: number;
  sitesCount?: number;
  emailsCount?: number;
}

export interface AiSearchTerm {
  id: string;
  term: string;
  purchases?: Purchase[];
  sites?: WebSearchResult[];
}

export interface PurchaseAiResult {
  id: string;
  userId: string;
  purchaseId: string;
  subject: string | null;
  body: string | null;
  searchTerm: AiSearchTerm | null;
  createdAt: string;
  purchase?: Purchase;
}

export interface WebSearchResult {
  id: string;
  url: string;
  title: string;
  snippet: string;
  favicon: string;
  emails: string[];
}

export interface ParsedEmailEntry {
  email: string;
  emailId: string;
  sites: { id: string; url: string; title: string }[];
  searchTerms: { id: string; term: string }[];
}

export interface PreparedLetter {
  id: string;
  subject: string | null;
  body: string | null;
  purchase: { id: string; purchaseNumber: string; objectInfo: string | null } | null;
  searchTerm: { id: string; term: string } | null;
  emails: string[];
  createdAt: string;
}

export interface PipelineDetail {
  purchaseId: string;
  purchaseNumber: string;
  docs: {
    parsed: number;
    total: number;
    files: { id: string; fileName: string | null; docDescription: string | null; parsed: boolean }[];
  };
  ai: {
    done: boolean;
    searchTerm: string | null;
    subject: string | null;
    body: string | null;
  };
  sites: {
    count: number;
    items: { id: string; url: string; title: string; emailsCount: number }[];
  };
  emails: {
    count: number;
    items: string[];
  };
  letters: {
    ready: boolean;
    emailsCount: number;
  };
}

export interface SearchResponse {
  results: Purchase[];
  debugUrl: string;
  searchQueryId: string;
}

export interface BlacklistEntry {
  id: string;
  email: string;
  createdAt: string;
}

export interface EmailThread {
  contactEmail: string;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: {
    id: string;
    direction: 'sent' | 'received';
    subject: string;
    preview: string;
  } | null;
}

export interface EmailMessage {
  id: string;
  direction: 'sent' | 'received';
  contactEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  purchaseId: string | null;
  isRead: boolean;
  createdAt: string;
}

// --- Prozorro (Ukraine) ---

export interface ProzorroTender {
  id: string;
  prozorroId: string;
  tenderNumber: string;
  title: string;
  description: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  procuringEntityName: string | null;
  procuringEntityId: string | null;
  procurementMethodType: string | null;
  rawData: Record<string, unknown> | null;
  detailFetchedAt: string | null;
  tenderPeriodEnd: string | null;
  createdAt: string;
  docs?: ProzorroTenderDoc[];
}

export interface ProzorroTenderDoc {
  id: string;
  documentId: string;
  title: string;
  format: string | null;
  url: string;
  documentType: string | null;
  parsedText: string | null;
}

export interface ProzorroSearchResponse {
  results: ProzorroTender[];
  scannedCount: number;
  debugUrl?: string;
}

export interface ProzorroOutreachItem {
  id: string;
  searchQuery: string | null;
  subject: string | null;
  body: string | null;
  createdAt: string;
  tender: { id: string; prozorroId: string; tenderNumber: string; title: string } | null;
  webResults: {
    id: string;
    url: string;
    title: string;
    snippet: string;
    favicon: string;
    parsedEmails: string[];
  }[];
  emails: string[];
}

export interface ProzorroPreparedLetter {
  searchQuery: string;
  subject: string;
  body: string;
  tender: { id: string; tenderNumber: string; title: string } | null;
  emails: string[];
}

export interface ProzorroAiResult {
  id: string;
  userId: string;
  tenderId: string;
  searchQuery: string | null;
  subject: string | null;
  body: string | null;
  createdAt: string;
}

export interface ProzorroWebResult {
  id: string;
  url: string;
  title: string;
  snippet: string;
  favicon: string;
  parsedEmails: string[];
}

export interface ProzorroPipelineDetail {
  tenderId: string;
  prozorroId: string;
  tenderNumber: string;
  docs: {
    parsed: number;
    total: number;
    files: { id: string; title: string; documentType: string | null; parsed: boolean }[];
  };
  ai: {
    done: boolean;
    searchQuery: string | null;
    subject: string | null;
    body: string | null;
  };
  sites: {
    count: number;
    items: { id: string; url: string; title: string; emailsCount: number }[];
  };
  emails: {
    count: number;
    items: string[];
  };
  letters: {
    ready: boolean;
    emailsCount: number;
  };
}

// --- Outreach (Cold Email) ---

export interface OutreachEmailAccount {
  id: string;
  userId: string;
  email: string;
  senderName: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapPass: string | null;
  dailyLimit: number;
  sentToday: number;
  sentTodayDate: string | null;
  isWarmupEnabled: boolean;
  status: 'active' | 'paused' | 'error';
  lastError: string | null;
  signature: string | null;
  smtpRelayUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachLeadList {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  leadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachLead {
  id: string;
  userId: string;
  leadListId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  website: string | null;
  position: string | null;
  phone: string | null;
  customFields: Record<string, string> | null;
  status: 'active' | 'bounced' | 'unsubscribed' | 'invalid';
  createdAt: string;
  updatedAt: string;
}

export interface OutreachCampaign {
  id: string;
  userId: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  leadListId: string | null;
  emailAccountIds: string[];
  dailySendLimit: number;
  sendFromHour: number;
  sendToHour: number;
  timezone: string;
  trackOpens: boolean;
  statsSent: number;
  statsOpened: number;
  statsReplied: number;
  statsBounced: number;
  createdAt: string;
  updatedAt: string;
  steps?: OutreachCampaignStep[];
  campaignLeads?: OutreachCampaignLead[];
}

export interface OutreachCampaignStep {
  id: string;
  campaignId: string;
  stepNumber: number;
  subject: string | null;
  body: string;
  delayDays: number;
  delayHours: number;
  createdAt: string;
}

export interface OutreachCampaignLead {
  id: string;
  campaignId: string;
  leadId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'replied' | 'bounced' | 'unsubscribed';
  nextSendAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: OutreachLead;
}

export interface OutreachCampaignEmail {
  id: string;
  campaignId: string;
  campaignStepId: string;
  campaignLeadId: string;
  leadId: string;
  emailAccountId: string;
  toEmail: string;
  subject: string | null;
  body: string;
  status: 'scheduled' | 'sent' | 'opened' | 'replied' | 'bounced' | 'failed';
  scheduledAt: string | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  errorMessage: string | null;
  replyText: string | null;
  createdAt: string;
}

export interface OutreachDashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  totalBounced: number;
}
