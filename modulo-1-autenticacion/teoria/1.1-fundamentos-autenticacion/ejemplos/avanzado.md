# Ejemplo Avanzado: Flujo Completo con Refresh Tokens e Interceptores

> **Nivel:** 🔴 Avanzado | **Tiempo estimado:** 90 minutos

---

## Objetivo

Implementar un sistema de autenticación empresarial completo en React + TypeScript que incluye:
- Gestión de tokens en memoria (no localStorage)
- Interceptores Axios para agregar el token automáticamente
- Renovación silenciosa de access tokens usando refresh tokens
- Cola de requests pendientes durante la renovación
- Manejo de múltiples pestañas del navegador
- Detección de sesión expirada con redirección automática

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                                                             │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────┐  │
│  │  AuthContext │───>│ TokenManager  │───>│ Axios Client│  │
│  │  (estado)    │    │ (en memoria)  │    │(interceptors│  │
│  └──────────────┘    └───────────────┘    └─────────────┘  │
│         │                                        │          │
│         │                                        │ 401?     │
│         │                               ┌────────▼───────┐  │
│         │                               │ RefreshService │  │
│         │                               │ (cola + retry) │  │
│         │                               └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Archivos

```
src/
├── lib/
│   ├── api-client.ts          ← Cliente Axios configurado
│   └── token-manager.ts       ← Gestión de tokens en memoria
├── contexts/
│   └── AuthContext.tsx        ← Context de autenticación global
├── hooks/
│   ├── useAuth.ts             ← Hook principal de autenticación
│   └── useTokenRefresh.ts     ← Hook para renovación automática
└── services/
    └── auth.service.ts        ← Llamadas HTTP de autenticación
```

---

## Código 1: Token Manager (Almacenamiento en Memoria)

```typescript
// src/lib/token-manager.ts

/**
 * Gestiona los tokens en memoria (no en localStorage ni sessionStorage).
 * Los tokens en memoria no son vulnerables a XSS.
 * La desventaja es que se pierden al recargar la página (por eso usamos refresh tokens en cookies).
 */

let accessToken: string | null = null;
let tokenExpiryTimeout: ReturnType<typeof setTimeout> | null = null;

type TokenExpiryCallback = () => void;
let onTokenExpiry: TokenExpiryCallback | null = null;

export const tokenManager = {
  /**
   * Almacena el access token en memoria y configura el timer de expiración.
   */
  setAccessToken(token: string, expiresInSeconds: number): void {
    accessToken = token;
    
    // Limpiar timer anterior si existe
    if (tokenExpiryTimeout) {
      clearTimeout(tokenExpiryTimeout);
    }
    
    // Configurar timer para renovar ANTES de que expire (30 segundos antes)
    const refreshBeforeExpiry = (expiresInSeconds - 30) * 1000;
    
    if (refreshBeforeExpiry > 0) {
      tokenExpiryTimeout = setTimeout(() => {
        if (onTokenExpiry) {
          onTokenExpiry();
        }
      }, refreshBeforeExpiry);
    }
  },
  
  getAccessToken(): string | null {
    return accessToken;
  },
  
  clearAccessToken(): void {
    accessToken = null;
    if (tokenExpiryTimeout) {
      clearTimeout(tokenExpiryTimeout);
      tokenExpiryTimeout = null;
    }
  },
  
  setOnTokenExpiry(callback: TokenExpiryCallback): void {
    onTokenExpiry = callback;
  },
  
  hasValidToken(): boolean {
    if (!accessToken) return false;
    
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
};
```

---

## Código 2: Cliente Axios con Interceptores

```typescript
// src/lib/api-client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from './token-manager';
import { authService } from '../services/auth.service';

// Cola de requests que esperan que se renueve el token
interface PendingRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

/**
 * Procesa todos los requests en cola después de renovar el token.
 */
function processPendingRequests(token: string | null, error: Error | null): void {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error ?? new Error('Token refresh failed'));
    } else {
      resolve(token);
    }
  });
  pendingRequests = [];
}

// ─── CREAR INSTANCIA DE AXIOS ────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  withCredentials: true, // CRÍTICO: permite enviar cookies (refresh token httpOnly)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── INTERCEPTOR DE REQUEST ───────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── INTERCEPTOR DE RESPONSE ──────────────────────────────────────────────────

apiClient.interceptors.response.use(
  // Respuesta exitosa: pasar sin modificar
  (response) => response,
  
  // Error: manejar 401 con renovación automática de token
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    
    // Si no es un 401 o ya se reintentó, propagar el error
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Marcar como reintento para evitar loops infinitos
    originalRequest._retry = true;
    
    if (isRefreshing) {
      // Ya hay una renovación en curso — encolar este request
      return new Promise<string>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((refreshError) => Promise.reject(refreshError));
    }
    
    // Iniciar proceso de renovación
    isRefreshing = true;
    
    try {
      // Llamar al endpoint de refresh (el refresh token se envía automáticamente
      // como cookie httpOnly gracias a withCredentials: true)
      const { accessToken, expiresIn } = await authService.refreshToken();
      
      tokenManager.setAccessToken(accessToken, expiresIn);
      
      // Notificar a todos los requests en cola
      processPendingRequests(accessToken, null);
      
      // Reintentar el request original
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
      
    } catch (refreshError) {
      // Si la renovación falla, la sesión expiró completamente
      processPendingRequests(null, new Error('Session expired'));
      tokenManager.clearAccessToken();
      
      // Emitir evento para que el AuthContext maneje el logout
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
```

---

## Código 3: Servicio de Autenticación

```typescript
// src/services/auth.service.ts
import axios from 'axios';

// Usar axios nativo (no apiClient) para las llamadas de auth
// para evitar loops en los interceptores
const authAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true, // Necesario para las cookies httpOnly
});

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authAxios.post<AuthResponse>('/auth/login', credentials);
    // El refresh token se almacena automáticamente en una cookie httpOnly por el servidor
    return response.data;
  },
  
  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    // El refresh token se envía automáticamente como cookie httpOnly
    const response = await authAxios.post<{ accessToken: string; expiresIn: number }>(
      '/auth/refresh'
    );
    return response.data;
  },
  
  async logout(): Promise<void> {
    await authAxios.post('/auth/logout');
    // El servidor elimina la cookie del refresh token
  },
  
  async validateSession(): Promise<AuthResponse | null> {
    try {
      // Intentar renovar el token al cargar la app (si hay refresh token en cookie)
      const response = await authAxios.post<{ accessToken: string; expiresIn: number; user: AuthResponse['user'] }>(
        '/auth/refresh'
      );
      return {
        accessToken: response.data.accessToken,
        expiresIn: response.data.expiresIn,
        user: response.data.user,
      };
    } catch {
      return null; // No hay sesión activa
    }
  },
};
```

---

## Código 4: AuthContext Completo

```tsx
// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { tokenManager } from '../lib/token-manager';
import { authService, type LoginCredentials } from '../services/auth.service';

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // true al inicio para validar la sesión
  });
  
  const isInitialized = useRef(false);

  // ─── Renovación automática de tokens ─────────────────────────────────────
  const refreshTokenSilently = useCallback(async () => {
    try {
      const { accessToken, expiresIn } = await authService.refreshToken();
      tokenManager.setAccessToken(accessToken, expiresIn);
      console.log(`[Auth] Token renovado. Próxima renovación en ${expiresIn - 30}s`);
    } catch {
      // Si falla la renovación, hacer logout
      await handleLogout();
    }
  }, []);

  // ─── Configurar callback de expiración de token ───────────────────────────
  useEffect(() => {
    tokenManager.setOnTokenExpiry(refreshTokenSilently);
  }, [refreshTokenSilently]);

  // ─── Escuchar evento de sesión expirada ────────────────────────────────────
  useEffect(() => {
    const handleSessionExpired = () => {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    };
    
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // ─── Sincronización entre pestañas (BroadcastChannel) ─────────────────────
  useEffect(() => {
    if (!window.BroadcastChannel) return;
    
    const channel = new BroadcastChannel('auth_channel');
    
    channel.addEventListener('message', (event) => {
      if (event.data.type === 'LOGOUT') {
        // Otra pestaña hizo logout — limpiar esta también
        tokenManager.clearAccessToken();
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });
    
    return () => channel.close();
  }, []);

  // ─── Validar sesión al iniciar la app ─────────────────────────────────────
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const validateSession = async () => {
      try {
        const session = await authService.validateSession();
        
        if (session) {
          tokenManager.setAccessToken(session.accessToken, session.expiresIn);
          setState({
            user: session.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };
    
    validateSession();
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    tokenManager.setAccessToken(response.accessToken, response.expiresIn);
    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      tokenManager.clearAccessToken();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      
      // Notificar a otras pestañas
      if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('auth_channel');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      }
    }
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return state.user?.roles?.includes(role) ?? false;
  }, [state.user]);

  const hasPermission = useCallback((_permission: string): boolean => {
    // En una implementación real, extraerías permisos del token
    return state.isAuthenticated;
  }, [state.isAuthenticated]);

  const value: AuthContextValue = {
    ...state,
    login: handleLogin,
    logout: handleLogout,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
```

---

## Código 5: Uso en Componentes

```tsx
// Ejemplo de uso en un componente protegido
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

function Dashboard() {
  const { user, logout, hasRole } = useAuth();
  
  const handleFetchData = async () => {
    // El token se agrega automáticamente por el interceptor
    // Si expira durante la petición, se renueva automáticamente
    const response = await apiClient.get('/dashboard/stats');
    console.log(response.data);
  };
  
  return (
    <div>
      <p>Bienvenido, {user?.email}</p>
      {hasRole('admin') && (
        <button onClick={handleFetchData}>Cargar datos admin</button>
      )}
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
```

---

## 🔑 Puntos Clave

| Característica | Implementación |
|---|---|
| Almacenamiento del access token | Variable JS en memoria (`token-manager.ts`) |
| Almacenamiento del refresh token | `httpOnly` cookie (manejada por el servidor) |
| Renovación automática | Timer 30s antes de expiración + interceptor 401 |
| Requests concurrentes | Cola de espera durante renovación |
| Multi-pestaña | `BroadcastChannel` API |
| CSRF protection | Token en cookie `SameSite=Strict` |

---

*← [Ejemplo Intermedio](./intermedio.md) | [→ Ejercicios](../ejercicios.md)*
