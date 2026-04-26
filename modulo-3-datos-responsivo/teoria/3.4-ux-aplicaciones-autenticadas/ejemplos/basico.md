# Ejemplo Básico – Estados de Carga y Feedback Visual

## Nivel: 🟢 Básico

---

## 1. Los 4 Estados de una Operación Asíncrona

```tsx
// components/UserList.tsx
import { useState, useEffect } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserList() {
  const [status, setStatus] = useState<Status>('idle');
  const [users, setUsers] = useState<User[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadUsers() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsers(data);
      setStatus('success');
    } catch {
      // Mensaje genérico - no exponer detalles del error interno
      setErrorMsg('No se pudo cargar la lista. Intenta de nuevo.');
      setStatus('error');
    }
  }

  useEffect(() => { loadUsers(); }, []);

  // Estado: cargando
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8" aria-live="polite" aria-busy="true">
        <div className="animate-spin text-4xl">⟳</div>
        <span className="sr-only">Cargando usuarios...</span>
      </div>
    );
  }

  // Estado: error
  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
        <p className="text-red-700 font-medium">⚠️ {errorMsg}</p>
        <button
          onClick={loadUsers}
          className="mt-2 text-sm text-red-600 underline hover:no-underline"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  // Estado: éxito
  return (
    <ul className="divide-y divide-gray-100" aria-label="Lista de usuarios">
      {users.map((user) => (
        <li key={user.id} className="py-3 flex gap-3">
          <div>
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

---

## 2. Botón con Estado de Carga (Prevenir Doble Submit)

```tsx
// components/SubmitButton.tsx
interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function SubmitButton({ loading, children, onClick }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}  // Deshabilitar durante carga - evita doble envío
      aria-busy={loading}
      onClick={onClick}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
        min-h-[44px] transition-all
        ${loading
          ? 'bg-blue-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
        }
        text-white
      `}
    >
      {loading && (
        <span className="animate-spin" aria-hidden="true">⟳</span>
      )}
      {loading ? 'Procesando...' : children}
    </button>
  );
}

// Uso en formulario:
function LoginForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(/* datos */);
    } finally {
      setLoading(false); // Siempre restaurar en finally
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ...campos... */}
      <SubmitButton loading={loading}>Iniciar Sesión</SubmitButton>
    </form>
  );
}
```

---

## 3. Toast Simple (Notificación No Bloqueante)

```tsx
// components/Toast.tsx
'use client';
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number; // ms
}

const styles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-500 text-white',
};

const icons: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    // Los errores no se auto-cierran (el usuario debe reconocerlos)
    if (type === 'error') return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [type, duration, onClose]);

  return (
    <div
      role="alert"            // Anuncia inmediatamente al screen reader
      aria-live="assertive"   // Para errores; usar "polite" para info/success
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        max-w-sm w-full ${styles[type]}
      `}
    >
      <span aria-hidden="true" className="text-lg">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 opacity-80 hover:opacity-100"
        aria-label="Cerrar notificación"
      >✕</button>
    </div>
  );
}
```

---

## 4. Skeleton Screen Simple

```tsx
// components/skeletons/UserCardSkeleton.tsx
export function UserCardSkeleton() {
  return (
    <div
      className="p-4 bg-white rounded-lg shadow animate-pulse"
      aria-hidden="true"  // No anunciar al screen reader (no es contenido real)
    >
      {/* Avatar simulado */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      {/* Líneas de contenido simuladas */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

// Lista de skeletons durante carga:
function LoadingState() {
  return (
    <div aria-label="Cargando contenido">
      <span className="sr-only">Cargando usuarios...</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}
```
