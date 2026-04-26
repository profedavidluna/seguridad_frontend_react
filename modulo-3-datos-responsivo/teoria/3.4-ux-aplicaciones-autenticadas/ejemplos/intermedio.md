# Ejemplo Intermedio – Manejo de 401/403 y Sistema de Toasts

## Nivel: 🟡 Intermedio

---

## 1. Interceptor HTTP para 401 / 403

```tsx
// lib/apiClient.ts
import axios, { AxiosError, type AxiosInstance } from 'axios';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

export function createApiClient(onLogout: () => void): AxiosInstance {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as typeof error.config & { _retry?: boolean };

      // 401: intentar refresh
      if (error.response?.status === 401 && !original._retry) {
        if (isRefreshing) {
          // Encolar mientras se refresca
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token) => {
                original.headers!['Authorization'] = `Bearer ${token}`;
                resolve(client(original));
              },
              reject,
            });
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const { data } = await client.post('/auth/refresh');
          processQueue(null, data.accessToken);
          original.headers!['Authorization'] = `Bearer ${data.accessToken}`;
          return client(original);
        } catch (refreshError) {
          processQueue(refreshError, null);
          onLogout(); // Redirigir al login
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 403: no tiene permiso (ya autenticado)
      if (error.response?.status === 403) {
        // No redirigir al login, mostrar página de acceso denegado
        window.dispatchEvent(new CustomEvent('auth:forbidden'));
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );

  return client;
}
```

---

## 2. Páginas 401 y 403 Profesionales

```tsx
// app/(errors)/no-autorizado/page.tsx
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Sesión Requerida</h1>
        <p className="text-gray-500 mb-6">
          Tu sesión ha expirado o no has iniciado sesión.
          Por favor inicia sesión para continuar.
        </p>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium
                     hover:bg-blue-700 transition-colors inline-block"
        >
          Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}

// app/(errors)/acceso-denegado/page.tsx
export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4" aria-hidden="true">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
        <p className="text-gray-500 mb-6">
          {/* Mensaje genérico - no revelar qué recurso fue denegado */}
          No tienes permiso para acceder a este recurso.
          Contacta a tu administrador si crees que esto es un error.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-secondary">
            Ir al Dashboard
          </Link>
          <a href="mailto:soporte@empresa.com" className="btn-primary">
            Contactar Soporte
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Sistema de Toasts con Context API

```tsx
// contexts/ToastContext.tsx
'use client';
import { createContext, useCallback, useContext, useReducer } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
  dismiss: (id: string) => void;
}

type Action =
  | { type: 'ADD'; payload: Toast }
  | { type: 'REMOVE'; id: string };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD': return [...state, action.payload];
    case 'REMOVE': return state.filter((t) => t.id !== action.id);
    default: return state;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = crypto.randomUUID();
    dispatch({ type: 'ADD', payload: { id, message, type } });

    // Auto-dismiss para no-errores
    if (type !== 'error') {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), 4000);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const toast = {
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
    warning: (msg: string) => add(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.toast;
}

// Contenedor de toasts (posicionado fijo)
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
```

---

## 4. Advertencia de Sesión por Expirar

```tsx
// components/SessionWarning.tsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const WARNING_BEFORE_MS = 2 * 60 * 1000; // Avisar 2 min antes

export function SessionWarning() {
  const { tokenExpiresAt, refreshSession, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!tokenExpiresAt) return;

    const interval = setInterval(() => {
      const remaining = tokenExpiresAt - Date.now();
      if (remaining <= 0) {
        // Sesión expirada - logout limpio
        logout('Tu sesión ha expirado. Inicia sesión de nuevo.');
        clearInterval(interval);
      } else if (remaining <= WARNING_BEFORE_MS) {
        setShowWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenExpiresAt, logout]);

  if (!showWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h2 id="session-warning-title" className="text-lg font-bold text-yellow-700 mb-2">
          ⏱ Sesión por expirar
        </h2>
        <p className="text-gray-600 mb-4">
          Tu sesión expirará en <strong>{secondsLeft} segundos</strong>.
          ¿Deseas continuar?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { refreshSession(); setShowWarning(false); }}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
            autoFocus
          >
            Continuar Sesión
          </button>
          <button
            onClick={() => logout()}
            className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-700"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
```
