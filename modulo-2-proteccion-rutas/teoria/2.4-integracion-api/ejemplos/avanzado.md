# Ejemplo Avanzado 2.4 — Token Refresh con Cola de Peticiones

## Descripción

Sistema empresarial completo de gestión de tokens: cola de peticiones durante el refresco, múltiples instancias de API con configuraciones diferentes, upload de archivos con progreso, y cancelación de requests.

---

## El Problema del Thundering Herd

```
Escenario sin cola:
──────────────────
t=0s: Token expira
t=1s: Usuario hace 5 acciones simultáneas
      ├── GET /usuarios    → 401 → intenta refresh → POST /auth/refresh
      ├── GET /reportes    → 401 → intenta refresh → POST /auth/refresh (DUPLICADO)
      ├── GET /dashboard   → 401 → intenta refresh → POST /auth/refresh (DUPLICADO)
      ├── POST /logs       → 401 → intenta refresh → POST /auth/refresh (DUPLICADO)
      └── GET /perfil      → 401 → intenta refresh → POST /auth/refresh (DUPLICADO)
      
PROBLEMA: 5 requests de refresh, race conditions, tokens inconsistentes

Solución con cola:
──────────────────
t=1s: GET /usuarios → 401 → inicia refresh (único)
      GET /reportes → 401 → se encola (espera)
      GET /dashboard → 401 → se encola (espera)
      POST /logs → 401 → se encola (espera)
      GET /perfil → 401 → se encola (espera)
t=2s: Refresh completo → nuevo token
      Cola se vacía: 4 peticiones se reintentan con el nuevo token
```

---

## Código

### 1. Gestor de cola de refresh

```typescript
// src/services/tokenRefreshQueue.ts

type RefreshCallback = (token: string | null) => void;

class TokenRefreshQueue {
  private isRefreshing = false;
  private subscribers: RefreshCallback[] = [];

  /**
   * Si ya se está haciendo refresh, retorna una Promise que
   * se resuelve cuando el refresh complete.
   */
  waitForRefresh(): Promise<string | null> {
    if (!this.isRefreshing) {
      return Promise.resolve(null); // No hay refresh en progreso
    }

    return new Promise<string | null>((resolve) => {
      this.subscribers.push(resolve);
    });
  }

  /**
   * Iniciar el proceso de refresh.
   * Retorna una función para notificar a la cola cuando termine.
   */
  startRefresh(): () => void {
    this.isRefreshing = true;

    return (newToken: string | null) => {
      this.isRefreshing = false;
      this.notify(newToken);
    };
  }

  private notify(token: string | null): void {
    const subs = [...this.subscribers];
    this.subscribers = [];
    subs.forEach(callback => callback(token));
  }

  get refreshInProgress(): boolean {
    return this.isRefreshing;
  }
}

export const tokenQueue = new TokenRefreshQueue();
```

---

### 2. Función de refresh con cola

```typescript
// src/services/refreshToken.ts
import axios from 'axios';
import { tokenQueue } from './tokenRefreshQueue';
import { tokenStorage } from './tokenStorage';

export async function executeTokenRefresh(): Promise<string> {
  // Si ya hay un refresh en curso, esperar
  if (tokenQueue.refreshInProgress) {
    const newToken = await tokenQueue.waitForRefresh();

    if (!newToken) {
      throw new Error('Token refresh failed');
    }

    return newToken;
  }

  // Iniciar el refresh (obtener función de notificación)
  const notifyComplete = tokenQueue.startRefresh();

  try {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      notifyComplete(null);
      throw new Error('No refresh token available');
    }

    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      { refreshToken },
      {
        // Usar axios directamente (no la instancia con interceptores)
        // para evitar recursión infinita
        headers: { 'Content-Type': 'application/json' },
        timeout: 10_000,
      }
    );

    const { accessToken, refreshToken: newRefreshToken } = data;

    tokenStorage.setTokens(accessToken, newRefreshToken);
    notifyComplete(accessToken);

    return accessToken;
  } catch (error) {
    notifyComplete(null);
    tokenStorage.clearTokens();
    throw error;
  }
}
```

---

### 3. Instancia de Axios con queue de refresh

```typescript
// src/services/axiosClientAdvanced.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokenStorage';
import { executeTokenRefresh } from './refreshToken';

function createAxiosInstance(config: {
  baseURL: string;
  timeout?: number;
  withRefresh?: boolean;
}): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  // REQUEST: Añadir token
  instance.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && req.headers) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    req.metadata = { startTime: Date.now(), requestId: crypto.randomUUID() };
    return req;
  });

  // RESPONSE: Refresh automático con cola
  if (config.withRefresh) {
    instance.interceptors.response.use(
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
          const newToken = await executeTokenRefresh();

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          return instance(originalRequest);
        } catch (refreshError) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          return Promise.reject(refreshError);
        }
      }
    );
  }

  return instance;
}

// API principal (con refresh automático)
export const apiMain = createAxiosInstance({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  withRefresh: true,
});

// API externa (sin refresh — usa API keys)
export const apiExternal = createAxiosInstance({
  baseURL: process.env.NEXT_PUBLIC_EXTERNAL_API_URL!,
  withRefresh: false,
  timeout: 15_000,
});
```

---

### 4. Upload de archivos con progreso

```typescript
// src/services/api/archivosAPI.ts
import { apiMain } from '../axiosClientAdvanced';

export interface UploadProgress {
  porcentaje: number;
  cargado: number;
  total: number;
}

export interface ArchivoSubido {
  id: string;
  nombre: string;
  url: string;
  tamaño: number;
  tipo: string;
  creadoEn: string;
}

export const archivosAPI = {
  subir: (
    archivo: File,
    carpeta: string,
    onProgress?: (progress: UploadProgress) => void
  ) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('carpeta', carpeta);

    return apiMain.post<ArchivoSubido>('/archivos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress({
            porcentaje: Math.round((event.loaded * 100) / event.total),
            cargado: event.loaded,
            total: event.total,
          });
        }
      },
    }).then(res => res.data);
  },

  descargar: async (id: string, nombreArchivo: string) => {
    const response = await apiMain.get(`/archivos/${id}`, {
      responseType: 'blob',
    });

    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
```

---

### 5. Hook de upload con progreso

```tsx
// src/hooks/useFileUpload.ts
import { useState, useRef } from 'react';
import { archivosAPI, UploadProgress } from '../services/api/archivosAPI';

export function useFileUpload(carpeta: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const upload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProgress({ porcentaje: 0, cargado: 0, total: file.size });

    try {
      const resultado = await archivosAPI.subir(file, carpeta, setProgress);
      return resultado;
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  return { upload, isUploading, progress, error };
}
```

---

### 6. Componente de Upload con UI de progreso

```tsx
// src/components/FileUploader.tsx
'use client';

import { useRef } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploaderProps {
  carpeta: string;
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete?: (url: string) => void;
}

export function FileUploader({
  carpeta,
  accept = '*',
  maxSizeMB = 10,
  onUploadComplete,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress, error } = useFileUpload(carpeta);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`El archivo excede el límite de ${maxSizeMB}MB`);
      return;
    }

    const resultado = await upload(file);
    if (resultado) {
      onUploadComplete?.(resultado.url);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <div className="text-center">
            <p className="text-sm text-gray-600">Subiendo...</p>
            <p className="text-2xl font-bold text-blue-600">{progress?.porcentaje}%</p>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-3xl">📎</span>
            <p className="text-sm text-gray-500 mt-1">
              Clic para subir o arrastra el archivo
            </p>
            <p className="text-xs text-gray-400">Máximo {maxSizeMB}MB</p>
          </div>
        )}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {isUploading && progress && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.porcentaje}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}
```

---

## Diagrama de la Cola de Refresh

```
Petición A → 401
Petición B → 401  (token expiró mientras B estaba en vuelo)
Petición C → 401

tokenQueue:
  isRefreshing: false → true (A inicia refresh)
  subscribers: [B_callback, C_callback]

  POST /auth/refresh → nuevo token

  notify(newToken):
    B_callback(newToken) → B se reintenta con nuevo token ✅
    C_callback(newToken) → C se reintenta con nuevo token ✅
  
  isRefreshing: false

Total requests de refresh: 1 (no 3)
```
