export type UserRole = 'admin' | 'gerente' | 'corretor' | 'assistente';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  active: boolean;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  corretor: 'Corretor',
  assistente: 'Assistente',
};
