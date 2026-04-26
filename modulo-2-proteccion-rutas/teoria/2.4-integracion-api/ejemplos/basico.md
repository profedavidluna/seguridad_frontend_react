# Ejemplo Básico 2.4 — Cliente HTTP Centralizado con fetch

## Descripción

Implementación de un cliente HTTP básico usando `fetch` nativo con autenticación automática, manejo de errores centralizado y TypeScript.

---

## Código

### 1. Clase ApiError

```typescript
// src/services/apiError.ts

export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isUnauthorized() { return this.status === 401; }
  get isForbidden()    { return this.status === 403; }
  get isNotFound()     { return this.status === 404; }
  get isServerError()  { return this.status >= 500; }
}
```

---

### 2. Cliente HTTP básico

```typescript
// src/services/apiClient.ts
import { ApiError } from './apiError';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('accessToken');
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parsear respuesta vacía
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || `Error ${response.status}`,
      response.status,
      data
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, body?: unknown) => request<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body?: unknown) => request<T>('PUT', endpoint, body),
  patch: <T>(endpoint: string, body?: unknown) => request<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
};
```

---

### 3. Módulo de API — Usuarios

```typescript
// src/services/api/usuarios.ts
import { apiClient } from '../apiClient';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'MANAGER' | 'USER';
  activo: boolean;
}

export const usuariosService = {
  listar: () => apiClient.get<Usuario[]>('/usuarios'),

  obtener: (id: string) => apiClient.get<Usuario>(`/usuarios/${id}`),

  crear: (datos: Omit<Usuario, 'id'> & { password: string }) =>
    apiClient.post<Usuario>('/usuarios', datos),

  actualizar: (id: string, datos: Partial<Omit<Usuario, 'id'>>) =>
    apiClient.patch<Usuario>(`/usuarios/${id}`, datos),

  eliminar: (id: string) => apiClient.delete<void>(`/usuarios/${id}`),
};
```

---

### 4. Hook useApiCall para manejo de estados

```typescript
// src/hooks/useApiCall.ts
import { useState, useCallback } from 'react';
import { ApiError } from '../services/apiError';

type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; statusCode: number };

export function useApiCall<T>() {
  const [state, setState] = useState<ApiState<T>>({ status: 'idle' });

  const call = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setState({ status: 'loading' });
    try {
      const data = await fn();
      setState({ status: 'success', data });
      return data;
    } catch (err) {
      const error = err instanceof ApiError ? err.message : 'Error inesperado';
      const statusCode = err instanceof ApiError ? err.status : 0;
      setState({ status: 'error', error, statusCode });
      return null;
    }
  }, []);

  return { state, call };
}
```

---

### 5. Uso en un componente

```tsx
// src/app/admin/usuarios/UsuariosPage.tsx
'use client';

import { useEffect } from 'react';
import { useApiCall } from '@/hooks/useApiCall';
import { usuariosService, Usuario } from '@/services/api/usuarios';

export function UsuariosList() {
  const { state, call } = useApiCall<Usuario[]>();

  useEffect(() => {
    call(() => usuariosService.listar());
  }, []);

  if (state.status === 'loading') return <div>Cargando usuarios...</div>;

  if (state.status === 'error') {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded">
        Error {state.statusCode}: {state.error}
      </div>
    );
  }

  if (state.status !== 'success') return null;

  return (
    <ul>
      {state.data.map(usuario => (
        <li key={usuario.id} className="py-2 border-b">
          <span className="font-medium">{usuario.nombre}</span>
          <span className="text-gray-500 ml-2">{usuario.email}</span>
          <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">
            {usuario.rol}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

---

### 6. API Mock para desarrollo (Next.js Route Handler)

```typescript
// src/app/api/usuarios/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

const USUARIOS_MOCK = [
  { id: '1', nombre: 'Ana García', email: 'ana@empresa.com', rol: 'ADMIN', activo: true },
  { id: '2', nombre: 'Carlos López', email: 'carlos@empresa.com', rol: 'MANAGER', activo: true },
  { id: '3', nombre: 'María Pérez', email: 'maria@empresa.com', rol: 'USER', activo: true },
];

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  if (!session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  return NextResponse.json(USUARIOS_MOCK);
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.nombre || !body.email) {
    return NextResponse.json(
      { error: 'nombre y email son obligatorios' },
      { status: 400 }
    );
  }

  const nuevoUsuario = {
    id: Date.now().toString(),
    ...body,
    activo: true,
  };

  return NextResponse.json(nuevoUsuario, { status: 201 });
}
```

---

## Patrones de Uso

```typescript
// Manejo de errores específicos por código
try {
  const usuario = await usuariosService.obtener(id);
  mostrarPerfil(usuario);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401: navigate('/login'); break;
      case 403: navigate('/unauthorized'); break;
      case 404: mostrarError('Usuario no encontrado'); break;
      default:  mostrarError(error.message);
    }
  }
}
```
