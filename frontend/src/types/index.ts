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
}

export interface AiSearchTerm {
  id: string;
  term: string;
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
  searchTermId: string;
  userId: string;
  query: string;
  url: string;
  title: string;
  snippet: string;
  createdAt: string;
}

export interface SearchResponse {
  results: Purchase[];
  debugUrl: string;
  searchQueryId: string;
}
