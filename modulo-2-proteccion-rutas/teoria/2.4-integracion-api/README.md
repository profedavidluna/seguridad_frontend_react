# 2.4 — Integración con APIs Empresariales

## Introducción

En aplicaciones empresariales, la gestión de peticiones HTTP va mucho más allá de un simple `fetch()`. Necesitamos manejar: autenticación automática con tokens, renovación transparente de tokens expirados, retry de peticiones fallidas, manejo centralizado de errores, timeouts, cancelación de requests, y logging.

Esta sección cubre los patrones y herramientas más utilizados en proyectos React y Next.js de producción.

---

## 1. Gestión Estructurada de Peticiones

### 1.1 Problemas del fetch nativo en proyectos grandes

```typescript
// ❌ Patrón anti-enterprise: fetch sin estructura
async function getUsuarios() {
  const token = localStorage.getItem('token');
  const res = await fetch('https://api.empresa.com/usuarios', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

// Problemas:
// - Token hardcodeado en cada función
// - Sin manejo de errores
// - Sin tipos TypeScript
// - Sin timeout
// - Sin retry automático
// - Código duplicado en cada módulo
```

### 1.2 Cliente HTTP centralizado

```typescript
// ✅ Patrón enterprise: cliente centralizado
import { apiClient } from './services/apiClient';

// En cualquier módulo:
const usuarios = await apiClient.get<Usuario[]>('/usuarios');
const reporte = await apiClient.post<Reporte>('/reportes', { titulo: '...', datos: [] });
```

### 1.3 Arquitectura de la capa de API

```
src/
├── services/
│   ├── apiClient.ts          ← Cliente HTTP base (interceptores, auth, errores)
│   ├── api/
│   │   ├── usuariosAPI.ts    ← Endpoints de usuarios
│   │   ├── reportesAPI.ts    ← Endpoints de reportes
│   │   └── authAPI.ts        ← Endpoints de autenticación
│   └── types/
│       ├── usuario.ts        ← Tipos de la API
│       └── reporte.ts
```

---

## 2. Axios vs Fetch: Comparación

### 2.1 Tabla comparativa

| Característica | fetch (nativo) | Axios |
|----------------|----------------|-------|
| Disponibilidad | Browser + Node 18+ | Browser + Node (cualquier versión) |
| Interceptores | Manual | Nativo |
| Timeout | Manual (AbortController) | Nativo (`timeout: 5000`) |
| Transformación automática de JSON | No (requiere `.json()`) | Sí |
| Cancelación | AbortController | CancelToken + AbortController |
| Progress upload | No | Sí |
| Base URL | Manual | `baseURL` en config |
| Retry automático | Manual | Con `axios-retry` |
| Error en 4xx/5xx | No lanza error | Lanza error automáticamente |
| SSR con Next.js | Nativo (no deps extra) | Requiere instalación |
| Bundle size | 0 KB (nativo) | ~14 KB |
| TypeScript | Tipos básicos | Tipos completos |

### 2.2 Cuándo usar cada uno

**Usar fetch cuando:**
- Proyecto pequeño/mediano sin muchas integraciones de API
- Next.js Server Components (beneficios de caché de Next.js)
- Se quiere minimizar dependencias

**Usar Axios cuando:**
- Proyecto grande con muchos endpoints
- Necesitas interceptores complejos para token refresh
- Múltiples APIs con diferentes configuraciones base
- El equipo está más familiarizado con Axios

---

## 3. Cliente HTTP con fetch

### 3.1 Implementación empresarial con fetch

```typescript
// src/services/apiClient.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiClientConfig {
  baseURL: string;
  defaultHeaders?: Record<string, string>;
  onUnauthorized?: () => void;
  onForbidden?: (path: string) => void;
  getToken?: () => string | null;
}

export class ApiClient {
  private config: ApiClientConfig;
  private abortControllers = new Map<string, AbortController>();

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const { timeout = 30000, retries = 0, retryDelay = 1000, ...fetchOptions } = options;

    const url = `${this.config.baseURL}${path}`;
    const controller = new AbortController();
    const requestId = `${method}:${path}:${Date.now()}`;
    this.abortControllers.set(requestId, controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    const token = this.config.getToken?.();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const executeRequest = async (): Promise<T> => {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          ...fetchOptions,
        });

        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);

        // Manejar errores HTTP
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            this.config.onUnauthorized?.();
          } else if (response.status === 403) {
            this.config.onForbidden?.(path);
          }

          throw new ApiError(
            errorData.message || `Error HTTP ${response.status}`,
            response.status,
            errorData
          );
        }

        // Respuesta vacía (204 No Content)
        if (response.status === 204) {
          return undefined as T;
        }

        return response.json() as Promise<T>;
      } catch (error) {
        if (error instanceof ApiError) throw error;

        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError('La petición fue cancelada (timeout)', 408);
        }

        throw new ApiError(
          error instanceof Error ? error.message : 'Error de red',
          0
        );
      }
    };

    // Lógica de retry
    let lastError: Error = new Error('Unknown error');
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await executeRequest();
      } catch (error) {
        lastError = error as Error;

        // No reintentar errores de autenticación o permisos
        if (error instanceof ApiError && [401, 403, 400, 422].includes(error.status)) {
          throw error;
        }

        if (attempt < retries) {
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          ); // Backoff exponencial
        }
      }
    }

    throw lastError;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  cancelAll(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}
```

### 3.2 Instancia configurada

```typescript
// src/services/index.ts
import { ApiClient } from './apiClient';

export const api = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.empresa.com',
  defaultHeaders: {
    'X-Client-Version': '1.0.0',
    'X-App-Name': 'PortalEmpresarial',
  },
  getToken: () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('accessToken');
    }
    return null;
  },
  onUnauthorized: () => {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  },
  onForbidden: (path) => {
    window.dispatchEvent(
      new CustomEvent('auth:forbidden', { detail: { path } })
    );
  },
});
```

---

## 4. Interceptores con Axios

### 4.1 Configuración base de Axios

```typescript
// src/services/axiosClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de REQUEST — añadir token automáticamente
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Añadir timestamp para debugging
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE — manejo centralizado de errores
axiosClient.interceptors.response.use(
  (response) => {
    // Log del tiempo de respuesta en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - (response.config.metadata?.startTime || 0);
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${duration}ms`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Manejar token expirado (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        // Reintentar la petición original con el nuevo token
        return axiosClient(originalRequest);
      } catch {
        // El refresh también falló — logout
        handleAuthFailure();
        return Promise.reject(error);
      }
    }

    // Manejar acceso denegado (403)
    if (error.response?.status === 403) {
      window.dispatchEvent(
        new CustomEvent('auth:forbidden', {
          detail: { path: originalRequest.url },
        })
      );
    }

    return Promise.reject(error);
  }
);

export { axiosClient };
```

---

## 5. Token Refresh con Cola de Peticiones

### 5.1 El problema del "thundering herd"

Cuando el token expira, múltiples peticiones simultáneas pueden intentar refrescarlo a la vez. Necesitamos una cola para que solo una petición haga el refresh y las demás esperen.

```typescript
// src/services/tokenRefresh.ts
import { axiosClient } from './axiosClient';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    // Esperar a que otra petición complete el refresh
    return new Promise<string>((resolve) => {
      subscribeTokenRefresh((newToken: string) => {
        resolve(newToken);
      });
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await axios.post('/api/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = data;

    // Guardar los nuevos tokens
    setAccessToken(accessToken);
    setRefreshToken(newRefreshToken);

    // Notificar a todas las peticiones en cola
    onTokenRefreshed(accessToken);

    return accessToken;
  } catch (error) {
    refreshSubscribers = [];
    throw error;
  } finally {
    isRefreshing = false;
  }
}
```

### 5.2 Interceptor completo con cola

```typescript
// Interceptor de respuesta con cola de refresh
axiosClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }

      return axiosClient(originalRequest);
    } catch {
      handleAuthFailure();
      return Promise.reject(error);
    }
  }
);
```

---

## 6. Módulos de API por Dominio

### 6.1 Módulo de Usuarios

```typescript
// src/services/api/usuariosAPI.ts
import { api } from '../index';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  creadoEn: string;
}

export interface CrearUsuarioDTO {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface ActualizarUsuarioDTO {
  nombre?: string;
  rol?: string;
  activo?: boolean;
}

export const usuariosAPI = {
  listar: (params?: { pagina?: number; limite?: number; busqueda?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<{ usuarios: Usuario[]; total: number; pagina: number }>(
      `/usuarios${query ? `?${query}` : ''}`
    );
  },

  obtener: (id: string) =>
    api.get<Usuario>(`/usuarios/${id}`),

  crear: (datos: CrearUsuarioDTO) =>
    api.post<Usuario>('/usuarios', datos),

  actualizar: (id: string, datos: ActualizarUsuarioDTO) =>
    api.patch<Usuario>(`/usuarios/${id}`, datos),

  eliminar: (id: string) =>
    api.delete<void>(`/usuarios/${id}`),

  cambiarPassword: (id: string, datos: { passwordActual: string; passwordNuevo: string }) =>
    api.post<void>(`/usuarios/${id}/cambiar-password`, datos),
};
```

### 6.2 Uso en componentes

```tsx
// src/app/admin/usuarios/page.tsx
import { usuariosAPI } from '@/services/api/usuariosAPI';
import { requireRole } from '@/lib/auth';

export default async function UsuariosPage() {
  await requireRole('ADMIN');

  const { usuarios, total } = await usuariosAPI.listar({ pagina: 1, limite: 20 });

  return (
    <div>
      <h1>Usuarios ({total})</h1>
      {/* Tabla de usuarios */}
    </div>
  );
}
```

---

## 7. Manejo Centralizado de Errores en React

### 7.1 Hook useApi con manejo de estados

```typescript
// src/hooks/useApi.ts
import { useState, useCallback } from 'react';
import { ApiError } from '../services/apiClient';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  statusCode: number | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
    statusCode: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, error: null, isLoading: false, statusCode: 200 });
      return data;
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Error de conexión';
      const statusCode = error instanceof ApiError ? error.status : 0;

      setState({ data: null, error: message, isLoading: false, statusCode });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false, statusCode: null });
  }, []);

  return { ...state, execute, reset };
}
```

---

## 8. Buenas Prácticas

### ✅ Hacer

- **Centralizar la configuración** del cliente HTTP (baseURL, headers, timeout)
- **Usar interceptores** para lógica transversal (auth, logging, errores)
- **Organizar endpoints por dominio** en módulos separados
- **Tipar todos los requests y responses** con TypeScript
- **Implementar cola de refresh** para evitar múltiples renovaciones simultáneas
- **Usar AbortController** para cancelar peticiones en desuso (navegación)
- **Implementar backoff exponencial** para retries
- **Nunca hardcodear la URL base** — usar variables de entorno

### ❌ Evitar

- **Fetch directo** en componentes sin pasar por el cliente centralizado
- **Almacenar tokens en variables globales** sin encapsulamiento
- **Reintentar peticiones 4xx** (excepto 401 para refresh) — son errores del cliente
- **Exponer detalles de error internos** al usuario final
- **Hacer refresh de token en cada componente** — debe ser centralizado
- **Olvidar cancelar peticiones** cuando el componente se desmonta

### 🏗 Estructura de Error Handling

```
Error en fetch/axios
       │
       ▼
  ¿Tipo de error?
       │
  ┌────┼────────────────┐
  │    │                │
 401  403          4xx/5xx
  │    │                │
  ▼    ▼                ▼
Refresh  Redirect    Mostrar
Token  /unauthorized  mensaje
  │                   al usuario
  ▼
¿Refresh exitoso?
  │         │
 Sí        No
  │         │
Reintentar  Logout
petición   + redirect
original   /login
```

---

## 📚 Referencias

- [Axios Docs](https://axios-http.com/docs/intro)
- [fetch API — MDN](https://developer.mozilla.org/es/docs/Web/API/Fetch_API)
- [Next.js fetch extendido](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [OWASP — API Security Top 10](https://owasp.org/www-project-api-security/)
- [AbortController — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
