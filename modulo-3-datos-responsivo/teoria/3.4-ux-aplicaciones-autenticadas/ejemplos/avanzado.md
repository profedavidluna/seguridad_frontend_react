# Ejemplo Avanzado – UX Enterprise: Optimistic Updates, Retry y Estado Global de Errores

## Nivel: 🔴 Avanzado

---

## 1. Error Boundary Global con Tipos de Error

```tsx
// components/GlobalErrorBoundary.tsx
'use client';
import React from 'react';

interface ErrorInfo {
  status?: number;
  code?: string;
  message: string;
}

function parseError(error: unknown): ErrorInfo {
  if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
    const e = error as { status: number; message?: string };
    switch (e.status) {
      case 401: return { status: 401, message: 'Sesión expirada' };
      case 403: return { status: 403, message: 'Acceso denegado' };
      case 404: return { status: 404, message: 'Recurso no encontrado' };
      case 500: return { status: 500, message: 'Error del servidor' };
      default:  return { status: e.status, message: 'Ocurrió un error inesperado' };
    }
  }
  return { message: 'Ocurrió un error inesperado' };
}

interface State { hasError: boolean; errorInfo: ErrorInfo | null }

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, errorInfo: parseError(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Enviar a servicio de monitoreo (Sentry, etc.)
    console.error('[GlobalErrorBoundary]', { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const { errorInfo } = this.state;

    if (errorInfo?.status === 401) {
      return <RedirectToLogin />;
    }
    if (errorInfo?.status === 403) {
      return <ForbiddenPage />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">💥</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal</h1>
          {/* Mensaje genérico - no exponer detalles técnicos */}
          <p className="text-gray-500 mb-4">
            Ocurrió un error inesperado. Por favor recarga la página.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorInfo: null })}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }
}

function RedirectToLogin() {
  if (typeof window !== 'undefined') {
    const returnUrl = window.location.pathname;
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  return <div>Redirigiendo al inicio de sesión...</div>;
}

function ForbiddenPage() {
  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-gray-800">Acceso Denegado</h1>
      <p className="text-gray-500 mt-2">No tienes permiso para ver este contenido.</p>
      <a href="/dashboard" className="text-blue-600 underline mt-4 inline-block">
        Volver al Dashboard
      </a>
    </div>
  );
}
```

---

## 2. useAsyncOperation – Hook Genérico con Retry

```tsx
// hooks/useAsyncOperation.ts
import { useCallback, useReducer, useRef } from 'react';

type OperationState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; message: string; retryCount: number };

type Action<T> =
  | { type: 'START' }
  | { type: 'SUCCESS'; data: T }
  | { type: 'ERROR'; message: string; retryCount: number }
  | { type: 'RESET' };

function reducer<T>(state: OperationState<T>, action: Action<T>): OperationState<T> {
  switch (action.type) {
    case 'START':   return { status: 'loading' };
    case 'SUCCESS': return { status: 'success', data: action.data, timestamp: Date.now() };
    case 'ERROR':   return { status: 'error', message: action.message, retryCount: action.retryCount };
    case 'RESET':   return { status: 'idle' };
    default:        return state;
  }
}

interface Options {
  maxRetries?: number;
  retryDelay?: number; // ms
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export function useAsyncOperation<T>(options: Options = {}) {
  const { maxRetries = 3, retryDelay = 1000, onSuccess, onError } = options;
  const [state, dispatch] = useReducer(reducer<T>, { status: 'idle' });
  const retryCountRef = useRef(0);

  const execute = useCallback(
    async (operation: () => Promise<T>) => {
      dispatch({ type: 'START' });

      async function attempt(retriesLeft: number): Promise<void> {
        try {
          const data = await operation();
          retryCountRef.current = 0;
          dispatch({ type: 'SUCCESS', data });
          onSuccess?.();
        } catch (err) {
          const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
          // Solo reintentar en errores de red, no en 4xx
          const status = (err as { response?: { status: number } }).response?.status;
          const isRetryable = isNetworkError || status === 503 || status === 504;

          if (retriesLeft > 0 && isRetryable) {
            await new Promise((r) => setTimeout(r, retryDelay * (maxRetries - retriesLeft + 1)));
            return attempt(retriesLeft - 1);
          }

          const message = getErrorMessage(err, status);
          retryCountRef.current++;
          dispatch({ type: 'ERROR', message, retryCount: retryCountRef.current });
          onError?.(message);
        }
      }

      await attempt(maxRetries);
    },
    [maxRetries, retryDelay, onSuccess, onError]
  );

  return { state, execute, reset: () => dispatch({ type: 'RESET' }) };
}

function getErrorMessage(err: unknown, status?: number): string {
  // Nunca exponer mensajes internos del servidor al usuario
  switch (status) {
    case 400: return 'Los datos enviados no son válidos.';
    case 401: return 'Tu sesión ha expirado.';
    case 403: return 'No tienes permiso para realizar esta acción.';
    case 404: return 'El recurso solicitado no existe.';
    case 429: return 'Demasiadas solicitudes. Espera un momento.';
    case 500:
    case 503: return 'Error del servidor. Intenta más tarde.';
    default:  return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
```

---

## 3. Optimistic Updates con Rollback

```tsx
// hooks/useOptimisticList.ts
import { useState, useCallback } from 'react';

export function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const optimisticUpdate = useCallback(
    async (
      id: string,
      updater: (item: T) => T,
      apiCall: () => Promise<T>
    ) => {
      // 1. Guardar snapshot para rollback
      const snapshot = [...items];

      // 2. Actualizar inmediatamente en UI
      setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
      setPendingIds((prev) => new Set(prev).add(id));

      try {
        // 3. Confirmar con el servidor
        const updated = await apiCall();
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      } catch {
        // 4. Revertir si falla
        setItems(snapshot);
        throw new Error('No se pudo actualizar. Los cambios han sido revertidos.');
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [items]
  );

  return { items, pendingIds, optimisticUpdate };
}
```

---

## 4. Feedback con Estado de Conexión

```tsx
// hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Banner de sin conexión
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm font-medium"
    >
      📵 Sin conexión a internet. Los cambios se guardarán cuando se restablezca la conexión.
    </div>
  );
}
```
