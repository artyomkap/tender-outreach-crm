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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
