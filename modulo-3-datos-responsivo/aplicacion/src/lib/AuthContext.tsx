'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthState, User } from '@/types';
import { mockCredentials, mockUsers } from '@/data/mockData';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Almacenamiento en memoria (más seguro que localStorage)
let inMemoryUser: User | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restaurar sesión desde sessionStorage al cargar
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('session_user');
      if (stored) {
        const user = JSON.parse(stored) as User;
        inMemoryUser = user;
        setState({ user, isAuthenticated: true, isLoading: false });
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Simular delay de red
    await new Promise((r) => setTimeout(r, 800));

    const credential = mockCredentials.find(
      (c) => c.email === email && c.password === password
    );

    if (!credential) {
      // Mensaje genérico - no revelar si el email existe
      throw new Error('Credenciales incorrectas');
    }

    const user = mockUsers.find((u) => u.id === credential.userId)!;
    inMemoryUser = user;
    sessionStorage.setItem('session_user', JSON.stringify(user));
    setState({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    inMemoryUser = null;
    sessionStorage.removeItem('session_user');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
