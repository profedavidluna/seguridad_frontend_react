# Ejemplo Intermedio: AuthContext con Interceptores Axios y Refresh Automático

> **Nivel:** 🟡 Intermedio | **Tiempo estimado:** 60 minutos

---

## Objetivo

Implementar un AuthContext completo que integra interceptores Axios para agregar el token automáticamente, manejar respuestas 401 con renovación silenciosa del token, y sincronización entre múltiples pestañas.

---

## Código 1: Cliente Axios Configurado

```typescript
// lib/api-client.ts
import axios, { AxiosError } from 'axios';

// Cola para requests que esperan renovación del token
type PendingResolve = (token: string) => void;
type PendingReject = (error: Error) => void;

let isRefreshing = false;
let pendingQueue: Array<{ resolve: PendingResolve; reject: PendingReject }> = [];

function processPending(token: string | null, error: Error | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error!);
  });
  pendingQueue = [];
}

// Almacenamiento de token en memoria
let memoryToken: string | null = null;

export const tokenStore = {
  set: (token: string) => { memoryToken = token; },
  get: () => memoryToken,
  clear: () => { memoryToken = null; },
};

// Función de refresh para ser inyectada (evita dependencia circular)
let refreshFn: (() => Promise<string>) | null = null;
export function setRefreshFunction(fn: () => Promise<string>): void {
  refreshFn = fn;
}

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
  withCredentials: true,
});

// ─── INTERCEPTOR DE REQUEST: Agregar token ───────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── INTERCEPTOR DE RESPONSE: Manejar 401 con refresh ───────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    
    // Si no es 401 o ya se reintentó, no hacer nada
    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }
    
    // Marcar como reintento
    if (originalRequest) originalRequest._retry = true;
    
    if (isRefreshing) {
      // Esperar a que se complete el refresh actual
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        if (originalRequest) {
          originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest!);
      });
    }
    
    isRefreshing = true;
    
    try {
      if (!refreshFn) throw new Error('Refresh function not set');
      
      const newToken = await refreshFn();
      tokenStore.set(newToken);
      processPending(newToken, null);
      
      if (originalRequest) {
        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest!);
      
    } catch (refreshError) {
      processPending(null, new Error('Session expired'));
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(refreshError);
      
    } finally {
      isRefreshing = false;
    }
  }
);
```

---

## Código 2: AuthContext Completo con Interceptores

```tsx
// contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { apiClient, tokenStore, setRefreshFunction } from '../lib/api-client';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  clearError: () => void;
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true para validar sesión al inicio
  const [error, setError] = useState<string | null>(null);
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  
  // ─── Función de refresh (inyectada en el cliente Axios) ────────────────────
  const performRefresh = useCallback(async (): Promise<string> => {
    // El refresh token se envía automáticamente por el navegador (cookie httpOnly)
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) throw new Error('Refresh failed');
    
    const data = await response.json();
    return data.accessToken;
  }, []);
  
  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignorar errores del servidor en logout
    } finally {
      tokenStore.clear();
      setUser(null);
      setError(null);
      
      // Notificar a otras pestañas
      broadcastChannel.current?.postMessage({ type: 'LOGOUT' });
    }
  }, []);
  
  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Usar fetch nativo para login (no pasar por el interceptor de Axios)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        const messages: Record<number, string> = {
          401: 'Correo electrónico o contraseña incorrectos',
          423: 'Cuenta bloqueada. Contacta a soporte.',
          429: 'Demasiados intentos. Espera unos minutos.',
        };
        throw new Error(messages[response.status] ?? data.message ?? 'Error al iniciar sesión');
      }
      
      const { accessToken, user: userData } = await response.json();
      
      tokenStore.set(accessToken);
      setUser(userData);
      
      // Notificar a otras pestañas del login
      broadcastChannel.current?.postMessage({ type: 'LOGIN', userId: userData.id });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ─── Inicialización: Inyectar refresh function y validar sesión ───────────
  useEffect(() => {
    // Inyectar la función de refresh en el cliente Axios
    setRefreshFunction(async () => {
      const token = await performRefresh();
      return token;
    });
    
    // Configurar BroadcastChannel para sincronización entre pestañas
    if (window.BroadcastChannel) {
      broadcastChannel.current = new BroadcastChannel('auth_channel');
      
      broadcastChannel.current.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
          tokenStore.clear();
          setUser(null);
        }
      };
    }
    
    // Escuchar evento de sesión expirada (emitido por el interceptor de Axios)
    const handleSessionExpired = () => {
      setUser(null);
      setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
    };
    window.addEventListener('auth:logout', handleSessionExpired);
    
    // Intentar restaurar la sesión al cargar la app
    const initSession = async () => {
      try {
        const newToken = await performRefresh();
        tokenStore.set(newToken);
        
        // Obtener datos del usuario con el nuevo token
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
      } catch {
        // No hay sesión activa — mostrar login
      } finally {
        setIsLoading(false);
      }
    };
    
    initSession();
    
    return () => {
      broadcastChannel.current?.close();
      window.removeEventListener('auth:logout', handleSessionExpired);
    };
  }, [performRefresh]);
  
  // ─── Helpers ──────────────────────────────────────────────────────────────
  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);
  
  const clearError = useCallback(() => setError(null), []);
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      login,
      logout,
      hasRole,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
```

---

## Código 3: Uso en Componentes

```tsx
// pages/Dashboard.tsx
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { useEffect, useState } from 'react';

interface DashboardData {
  stats: { users: number; revenue: number };
}

export function Dashboard() {
  const { user, logout, hasRole } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  
  useEffect(() => {
    // El token se agrega automáticamente por el interceptor de Axios
    // Si expira durante este request, se renueva automáticamente
    apiClient.get<DashboardData>('/dashboard/stats')
      .then(response => setData(response.data))
      .catch(console.error);
  }, []);
  
  return (
    <div>
      <header>
        <span>Bienvenido, {user?.name}</span>
        {hasRole('admin') && <span className="badge">Admin</span>}
        <button onClick={logout}>Cerrar sesión</button>
      </header>
      
      {data && (
        <div>
          <p>Usuarios: {data.stats.users}</p>
          <p>Ingresos: ${data.stats.revenue}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔑 Puntos Clave

| Característica | Implementación |
|---|---|
| Token storage | Variable en módulo (`memoryToken`) |
| Agregar token | Interceptor de request Axios |
| Manejar 401 | Interceptor de response con cola |
| Sincronización pestañas | `BroadcastChannel` |
| Restaurar sesión | `performRefresh()` al iniciar la app |
| Logout | Notifica al servidor + otras pestañas |

---

*← [Ejemplo Básico](./basico.md) | [→ Ejemplo Avanzado](./avanzado.md)*
