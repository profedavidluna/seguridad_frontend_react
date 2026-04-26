// Tipos centrales de la aplicación Módulo 3

export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
  salary: number; // dato sensible
  ssn: string;    // dato sensible
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface SensitiveField {
  value: string;
  sensitivity: DataSensitivity;
  visibleRoles: UserRole[];
}
