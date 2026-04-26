# Ejemplo Intermedio 2.4 — Interceptores con Axios

## Descripción

Cliente HTTP empresarial con Axios: interceptores de request y response, manejo automático de autenticación, logging de peticiones, y manejo centralizado de errores.

---

## Instalación

```bash
npm install axios
npm install -D @types/axios  # Generalmente no necesario, Axios incluye sus tipos
```

---

## Código

### 1. Tipos compartidos

```typescript
// src/services/types.ts

export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

// Extensión de configuración de Axios para metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
      requestId: string;
    };
    _retry?: boolean;
  }
}
```

---

### 2. Gestión de tokens

```typescript
// src/services/tokenStorage.ts

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'portal.accessToken',
  REFRESH_TOKEN: 'portal.refreshToken',
} as const;

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  },

  clearTokens: (): void => {
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};
```

---

### 3. Instancia de Axios con interceptores

```typescript
// src/services/axiosClient.ts
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { tokenStorage } from './tokenStorage';
import { ApiErrorResponse } from './types';

// ————————————————
// Creación de la instancia
// ————————————————
const axiosClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client': 'PortalEmpresarial/1.0',
  },
});

// ————————————————
// Interceptor de REQUEST
// ————————————————
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Añadir token de autenticación
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Añadir metadata para logging
    config.metadata = {
      startTime: Date.now(),
      requestId: `req_${Math.random().toString(36).substring(2, 9)}`,
    };

    // 3. Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[HTTP ▶] ${config.method?.toUpperCase()} ${config.url}`,
        config.data || ''
      );
    }

    return config;
  },
  (error) => {
    console.error('[HTTP Error en Request]', error);
    return Promise.reject(error);
  }
);

// ————————————————
// Interceptor de RESPONSE — Éxitos
// ————————————————
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const duration = Date.now() - (response.config.metadata?.startTime || 0);
    const requestId = response.config.metadata?.requestId;

    // Log de respuesta exitosa
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[HTTP ✅] ${response.config.method?.toUpperCase()} ` +
        `${response.config.url} — ${response.status} (${duration}ms) [${requestId}]`
      );
    }

    return response;
  },

  // ————————————————
  // Interceptor de RESPONSE — Errores
  // ————————————————
  async (error: AxiosError<ApiErrorResponse>) => {
    const { config: originalConfig, response } = error;

    // Log del error
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[HTTP ❌] ${originalConfig?.method?.toUpperCase()} ` +
        `${originalConfig?.url} — ${response?.status}`
      );
    }

    // ── 401: Token expirado — intentar renovar
    if (response?.status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        tokenStorage.setTokens(data.accessToken, data.refreshToken);

        if (originalConfig.headers) {
          originalConfig.headers.Authorization = `Bearer ${data.accessToken}`;
        }

        return axiosClient(originalConfig);
      } catch (refreshError) {
        tokenStorage.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      }
    }

    // ── 403: Sin permisos
    if (response?.status === 403) {
      window.dispatchEvent(
        new CustomEvent('auth:forbidden', {
          detail: { path: originalConfig?.url },
        })
      );
    }

    // ── 429: Rate limit
    if (response?.status === 429) {
      const retryAfter = parseInt(response.headers['retry-after'] || '60');
      console.warn(`[Rate Limit] Esperar ${retryAfter} segundos`);
    }

    // ── Error de red (sin respuesta)
    if (!response) {
      return Promise.reject(
        new Error('Error de conexión. Verifica tu conexión a internet.')
      );
    }

    // Normalizar el error
    const errorMessage =
      response.data?.message ||
      response.data?.error ||
      `Error ${response.status}`;

    const normalizedError = new Error(errorMessage) as Error & {
      status: number;
      data: unknown;
    };
    normalizedError.status = response.status;
    normalizedError.data = response.data;

    return Promise.reject(normalizedError);
  }
);

export { axiosClient };
```

---

### 4. Servicio de API con Axios

```typescript
// src/services/api/reportesAPI.ts
import { axiosClient } from '../axiosClient';
import { PaginatedResponse, ApiResponse } from '../types';

export interface Reporte {
  id: string;
  titulo: string;
  descripcion: string;
  autorId: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'ARCHIVADO';
  tipo: 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
  datos: Record<string, unknown>;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FiltrosReporte {
  pagina?: number;
  limite?: number;
  estado?: Reporte['estado'];
  tipo?: Reporte['tipo'];
  desde?: string;
  hasta?: string;
  busqueda?: string;
}

export const reportesAPI = {
  listar: async (filtros: FiltrosReporte = {}) => {
    const { data } = await axiosClient.get<PaginatedResponse<Reporte>>(
      '/reportes',
      { params: filtros }
    );
    return data;
  },

  obtener: async (id: string) => {
    const { data } = await axiosClient.get<ApiResponse<Reporte>>(`/reportes/${id}`);
    return data.data;
  },

  crear: async (dto: Pick<Reporte, 'titulo' | 'descripcion' | 'tipo' | 'datos'>) => {
    const { data } = await axiosClient.post<ApiResponse<Reporte>>('/reportes', dto);
    return data.data;
  },

  actualizar: async (id: string, dto: Partial<Pick<Reporte, 'titulo' | 'descripcion' | 'estado'>>) => {
    const { data } = await axiosClient.patch<ApiResponse<Reporte>>(`/reportes/${id}`, dto);
    return data.data;
  },

  eliminar: async (id: string) => {
    await axiosClient.delete(`/reportes/${id}`);
  },

  exportar: async (id: string, formato: 'PDF' | 'EXCEL' | 'CSV') => {
    const response = await axiosClient.get(`/reportes/${id}/exportar`, {
      params: { formato },
      responseType: 'blob',
    });

    // Crear y descargar el archivo
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-${id}.${formato.toLowerCase()}`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
```

---

### 5. Listener global de errores de auth

```tsx
// src/components/AuthErrorHandler.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AuthErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleSessionExpired = () => {
      router.push('/login?reason=expired');
    };

    const handleForbidden = (e: CustomEvent) => {
      router.push(`/unauthorized?from=${encodeURIComponent(e.detail?.path || '')}`);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:forbidden', handleForbidden as EventListener);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:forbidden', handleForbidden as EventListener);
    };
  }, [router]);

  return null;
}
```

---

### 6. Uso con manejo de errores tipado

```tsx
// src/app/reportes/ReportesClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { reportesAPI, Reporte } from '@/services/api/reportesAPI';

export function ReportesClient() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const result = await reportesAPI.listar({ limite: 10 });
        setReportes(result.data);
      } catch (err: any) {
        // El interceptor ya manejó 401 y 403
        // Aquí solo mostramos errores que el usuario puede resolver
        if (err.status !== 401 && err.status !== 403) {
          setError(err.message || 'Error al cargar reportes');
        }
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <ul>
      {reportes.map(r => (
        <li key={r.id}>{r.titulo} — {r.estado}</li>
      ))}
    </ul>
  );
}
```

---

## Resumen de Interceptores

| Interceptor | Cuándo se ejecuta | Qué hace |
|-------------|------------------|---------|
| Request | Antes de cada petición | Añade token, metadata, logs |
| Response (éxito) | Petición exitosa (2xx) | Log de duración |
| Response (error 401) | Token expirado | Refresh + retry automático |
| Response (error 403) | Sin permisos | Emite evento DOM |
| Response (error 429) | Rate limit | Aviso de espera |
| Response (sin respuesta) | Error de red | Mensaje descriptivo |
