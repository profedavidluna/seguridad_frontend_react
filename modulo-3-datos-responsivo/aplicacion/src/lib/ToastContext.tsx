'use client';
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import type { Toast, ToastType } from '@/types';

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
    case 'ADD': {
      const next = [...state, action.payload];
      return next.length > 5 ? next.slice(next.length - 5) : next;
    }
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: 'ADD', payload: { id, message, type } });
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
      {/* Contenedor de toasts */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
        aria-label="Notificaciones"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.toast;
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  warning: 'bg-yellow-500',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${toastStyles[toast.type]}`}
    >
      <span aria-hidden="true" className="font-bold">{toastIcons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-80 hover:opacity-100 text-lg leading-none"
        aria-label="Cerrar notificación"
      >✕</button>
    </div>
  );
}
