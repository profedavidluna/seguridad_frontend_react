# Ejemplo Avanzado: Sistema de Autenticación Empresarial Completo

> **Nivel:** 🔴 Avanzado | **Tiempo estimado:** 90 minutos

---

## Objetivo

Integrar todos los patrones del Módulo 1 en un sistema de autenticación de producción: rotación de refresh tokens, detección de inactividad, Next.js App Router con middleware, y React Query para cache de estado autenticado.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  NEXT.JS MIDDLEWARE                                              │
│  ┌────────────┐   Verifica cookie JWT    ┌───────────────────┐  │
│  │  Request   │ ────────────────────────>│ Redirigir a /login│  │
│  │            │ <─ válida ─────────────  │ (si no autenticado│  │
│  └────────────┘                          └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE REACT                                                   │
│                                                                  │
│  SecureTokenManager ──> Axios Client ──> API Calls              │
│         │                                                        │
│         ├── scheduleRefresh()  (renovación anticipada)           │
│         ├── inactivityMonitor  (logout por inactividad)          │
│         └── BroadcastChannel  (sincronización de pestañas)       │
│                                                                  │
│  React Query                                                     │
│  └── useQuery('auth/me') ──> Cache del usuario autenticado      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Código 1: SecureTokenManager (Gestor Centralizado)

```typescript
// lib/SecureTokenManager.ts

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  exp: number;
  iat: number;
}

interface TokenMetadata {
  exp: number;
  roles: string[];
  userId: string;
}

class SecureTokenManager {
  private static instance: SecureTokenManager;
  
  private accessToken: string | null = null;
  private tokenMetadata: TokenMetadata | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private channel: BroadcastChannel | null = null;
  
  // Callbacks que el AuthContext puede registrar
  private onSessionExpired: (() => void) | null = null;
  private onTokenRefreshed: ((token: string) => void) | null = null;
  
  // Inactividad: 30 minutos por defecto
  private readonly INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
  // Renovar el token cuando falte el 20% del tiempo de vida
  private readonly REFRESH_THRESHOLD = 0.2;
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.initBroadcastChannel();
      this.initInactivityMonitor();
    }
  }
  
  static getInstance(): SecureTokenManager {
    if (!SecureTokenManager.instance) {
      SecureTokenManager.instance = new SecureTokenManager();
    }
    return SecureTokenManager.instance;
  }
  
  // ─── Token Operations ─────────────────────────────────────────────────────
  
  setToken(token: string): void {
    this.accessToken = token;
    this.tokenMetadata = this.parsePayload(token);
    this.scheduleRefresh();
    this.resetInactivityTimer();
  }
  
  getToken(): string | null {
    if (!this.accessToken || !this.tokenMetadata) return null;
    
    // Devolver null si el token ya expiró
    const now = Math.floor(Date.now() / 1000);
    if (this.tokenMetadata.exp <= now) {
      this.clearToken();
      return null;
    }
    
    return this.accessToken;
  }
  
  clearToken(): void {
    this.accessToken = null;
    this.tokenMetadata = null;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
  }
  
  getMetadata(): TokenMetadata | null {
    return this.tokenMetadata;
  }
  
  isTokenExpiringSoon(): boolean {
    if (!this.tokenMetadata) return false;
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = this.tokenMetadata.exp - now;
    const totalLife = this.tokenMetadata.exp - (this.tokenMetadata.exp - 900); // aprox 15 min
    return timeLeft / totalLife < this.REFRESH_THRESHOLD;
  }
  
  // ─── Callbacks ────────────────────────────────────────────────────────────
  
  onExpired(callback: () => void): void {
    this.onSessionExpired = callback;
  }
  
  onRefreshed(callback: (token: string) => void): void {
    this.onTokenRefreshed = callback;
  }
  
  // ─── Internal ─────────────────────────────────────────────────────────────
  
  private parsePayload(token: string): TokenMetadata | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      return {
        exp: payload.exp,
        roles: payload.roles ?? [],
        userId: payload.sub,
      };
    } catch {
      return null;
    }
  }
  
  private scheduleRefresh(): void {
    if (!this.tokenMetadata) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = (this.tokenMetadata.exp - now) * 1000;
    const refreshIn = timeUntilExpiry * (1 - this.REFRESH_THRESHOLD);
    
    this.refreshTimer = setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Refresh failed');
        
        const { accessToken } = await response.json();
        this.setToken(accessToken);
        this.onTokenRefreshed?.(accessToken);
        
      } catch {
        this.clearToken();
        this.onSessionExpired?.();
      }
    }, Math.max(refreshIn, 1000));
  }
  
  private initInactivityMonitor(): void {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const resetTimer = () => this.resetInactivityTimer();
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
  }
  
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    
    if (!this.accessToken) return;
    
    this.inactivityTimer = setTimeout(() => {
      console.warn('[Auth] Sesión cerrada por inactividad');
      this.clearToken();
      this.channel?.postMessage({ type: 'LOGOUT', reason: 'inactivity' });
      this.onSessionExpired?.();
    }, this.INACTIVITY_LIMIT_MS);
  }
  
  private initBroadcastChannel(): void {
    if (!window.BroadcastChannel) return;
    
    this.channel = new BroadcastChannel('secure_auth');
    
    this.channel.onmessage = (event) => {
      switch (event.data.type) {
        case 'LOGOUT':
          this.clearToken();
          this.onSessionExpired?.();
          break;
        case 'TOKEN_REFRESHED':
          // Otra pestaña renovó el token — actualizar esta también
          if (event.data.token) {
            this.accessToken = event.data.token;
            this.tokenMetadata = this.parsePayload(event.data.token);
          }
          break;
      }
    };
  }
  
  broadcastLogout(): void {
    this.channel?.postMessage({ type: 'LOGOUT' });
  }
}

export const tokenManager = SecureTokenManager.getInstance();
```

---

## Código 2: AuthContext con React Query

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '../lib/SecureTokenManager';
import { apiClient } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_QUERY_KEY = ['auth', 'currentUser'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // React Query gestiona el estado del usuario y el cache
  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async (): Promise<User | null> => {
      const token = tokenManager.getToken();
      if (!token) return null;
      
      const response = await apiClient.get<{ user: User }>('/auth/me');
      return response.data.user;
    },
    staleTime: 5 * 60 * 1000,      // Cache válido por 5 minutos
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // ─── Handlers del TokenManager ────────────────────────────────────────────
  
  useEffect(() => {
    // Cuando el token expire, limpiar el cache y mostrar login
    tokenManager.onExpired(() => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
    });
    
    // Cuando el token se renueve, refrescar los datos del usuario
    tokenManager.onRefreshed(() => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    });
    
    // Intentar restaurar sesión al cargar
    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          const { accessToken } = await response.json();
          tokenManager.setToken(accessToken);
          queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        }
      } catch {
        // No hay sesión — mostrar login
      }
    };
    
    restoreSession();
  }, [queryClient]);
  
  // ─── Actions ──────────────────────────────────────────────────────────────
  
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message ?? 'Credenciales incorrectas');
    }
    
    const { accessToken } = await response.json();
    tokenManager.setToken(accessToken);
    
    // Forzar recarga del usuario
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
  }, [queryClient]);
  
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      tokenManager.clearToken();
      tokenManager.broadcastLogout();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
    }
  }, [queryClient]);
  
  // ─── Role/Permission Helpers ──────────────────────────────────────────────
  
  const hasRole = useCallback((...roles: string[]): boolean => {
    return roles.some(r => user?.roles?.includes(r));
  }, [user]);
  
  const hasPermission = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  }, [user]);
  
  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      isAuthenticated: !!user,
      isInitializing: isLoading,
      login,
      logout,
      hasRole,
      hasPermission,
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

## Código 3: Middleware Next.js para Autenticación en Edge

```typescript
// middleware.ts (raíz del proyecto Next.js)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Rutas que requieren autenticación
const PROTECTED_PATHS = ['/dashboard', '/admin', '/api/protected'];

// Rutas que requieren rol admin
const ADMIN_PATHS = ['/admin'];

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'secret');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAdmin = ADMIN_PATHS.some(path => pathname.startsWith(path));
  
  if (!isProtected) return NextResponse.next();
  
  // Leer refresh token de la cookie httpOnly
  const refreshToken = request.cookies.get('refreshToken')?.value;
  
  if (!refreshToken) {
    return redirectToLogin(request);
  }
  
  try {
    // Verificar el refresh token (solo para saber si hay sesión activa)
    const { payload } = await jwtVerify(refreshToken, JWT_SECRET);
    
    // Verificar acceso de admin
    if (isAdmin) {
      const roles = (payload.roles as string[]) ?? [];
      if (!roles.includes('admin')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }
    
    // Pasar el userId a los headers para Server Components
    const response = NextResponse.next();
    response.headers.set('x-user-id', String(payload.sub));
    response.headers.set('x-user-roles', JSON.stringify(payload.roles ?? []));
    return response;
    
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Código 4: Ruta Protegida con Control de Roles

```tsx
// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  const hasRequiredRole = requiredRoles.length === 0 || hasRole(...requiredRoles);
  const hasRequiredPermission = !requiredPermission || hasPermission(requiredPermission);
  
  if (!hasRequiredRole || !hasRequiredPermission) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/403" replace />;
  }
  
  return <>{children}</>;
}
```

---

## 📋 Configuración del Proyecto

```typescript
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## ✅ Resumen de Patrones Integrados

| Sección | Patrón | Archivo |
|---|---|---|
| 1.1 | JWT en memoria | `SecureTokenManager.ts` |
| 1.2 | httpOnly cookie para refresh | `middleware.ts` + API |
| 1.2 | BroadcastChannel multi-tab | `SecureTokenManager.ts` |
| 1.3 | Renovación anticipada de token | `scheduleRefresh()` |
| 1.3 | Logout por inactividad | `resetInactivityTimer()` |
| 1.4 | React Query para estado autenticado | `AuthContext.tsx` |
| 1.4 | Middleware Next.js para SSR | `middleware.ts` |

---

*← [Ejemplo Intermedio](./intermedio.md) | [→ Ejercicios](../ejercicios.md)*
