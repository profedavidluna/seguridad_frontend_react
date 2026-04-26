# Ejercicios — 2.4 Integración con APIs Empresariales

## Configuración

```bash
npm install axios
# Para las pruebas de API, usaremos Next.js Route Handlers como mock
```

---

## 🟢 Ejercicio 1 — Cliente HTTP Básico

**Nivel:** Básico | **Tiempo:** 25 minutos

### Descripción

Crear un cliente HTTP centralizado con `fetch` que añada automáticamente el token de autorización y maneje errores básicos.

### Requerimientos

1. Crear `src/services/apiClient.ts` con métodos `get`, `post`, `put`, `patch`, `delete`
2. El cliente debe:
   - Leer el token de `sessionStorage.getItem('accessToken')`
   - Añadir `Authorization: Bearer <token>` automáticamente
   - Retornar los datos parseados como JSON
   - Lanzar un error con el mensaje del servidor si el status no es 2xx
3. Crear `src/services/api/usuariosAPI.ts` que use el cliente
4. Crear una API Mock en `src/app/api/usuarios/route.ts`

### Plantilla a completar

```typescript
// src/services/apiClient.ts
const BASE_URL = '/api';

function getToken() {
  // TODO: Leer token de sessionStorage
}

async function request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  // TODO:
  // 1. Construir headers con Content-Type y Authorization
  // 2. Hacer fetch
  // 3. Si no ok, lanzar error con status y mensaje
  // 4. Si status 204, retornar undefined
  // 5. Retornar data parseada como JSON
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  // TODO: post, put, patch, delete
};
```

### API Mock requerida

La API mock en `/api/usuarios` debe:
- `GET` → Retornar lista de 3 usuarios
- `POST` → Crear un usuario y retornar con `status: 201`
- Verificar que el header `Authorization` esté presente (si no → 401)

### Criterios de Aceptación

- [ ] `apiClient.get<Usuario[]>('/usuarios')` retorna un array tipado
- [ ] Sin token en sessionStorage → la API retorna 401 y el cliente lanza un error
- [ ] El error incluye el status code para poder diferenciarlo (401 vs 500)
- [ ] `apiClient.post('/usuarios', datos)` envía los datos como JSON

---

## 🟢 Ejercicio 2 — Manejo de Errores por Tipo

**Nivel:** Básico | **Tiempo:** 30 minutos

### Descripción

Extender el cliente del Ejercicio 1 para manejar diferentes tipos de errores de manera específica.

### Requerimientos

1. Crear una clase `ApiError` con propiedades `status`, `message`, `data`
2. Añadir getters helpers: `isUnauthorized`, `isForbidden`, `isNotFound`, `isServerError`
3. Crear un componente `<ApiErrorDisplay>` que muestre mensajes diferentes según el tipo de error
4. Crear un hook `useApiError` que clasifique el error y retorne el mensaje apropiado

### Mensajes por tipo de error

```typescript
const MENSAJES_ERROR = {
  401: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'El recurso que buscas no existe.',
  422: 'Los datos enviados son inválidos.',
  429: 'Demasiadas solicitudes. Por favor, espera un momento.',
  500: 'Error en el servidor. Intenta de nuevo más tarde.',
  0: 'Error de conexión. Verifica tu internet.',
};
```

### Criterios de Aceptación

- [ ] `ApiError.isUnauthorized` retorna `true` cuando status es 401
- [ ] El componente muestra iconos diferentes según el tipo (⚠️, 🚫, 🔍, 💥)
- [ ] Error 401 → muestra botón "Iniciar Sesión" que redirige a `/login`
- [ ] Error 403 → muestra botón "Volver" que navega hacia atrás

---

## 🟡 Ejercicio 3 — Configuración de Axios con Interceptores

**Nivel:** Intermedio | **Tiempo:** 50 minutos

### Descripción

Configurar una instancia de Axios con interceptores de request y response para un proyecto empresarial.

### Requerimientos del interceptor de REQUEST

1. Añadir el token JWT automáticamente
2. Añadir header `X-Request-ID` con un UUID único por petición
3. Loguear en consola (solo en desarrollo): `[HTTP ▶] GET /endpoint`
4. Guardar `startTime` en la config para calcular duración

### Requerimientos del interceptor de RESPONSE

1. Loguear en consola: `[HTTP ✅] GET /endpoint — 200 (145ms)`
2. En error 401 → Emitir evento `auth:unauthorized` en `window`
3. En error 403 → Emitir evento `auth:forbidden` con la ruta
4. En error de red (sin respuesta) → Lanzar error con mensaje en español

### Código inicial de la instancia

```typescript
// src/services/axiosClient.ts
import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30_000,
});

// TODO: Añadir interceptor de request
axiosClient.interceptors.request.use(
  (config) => {
    // Implementar aquí
    return config;
  }
);

// TODO: Añadir interceptor de response
axiosClient.interceptors.response.use(
  (response) => {
    // Implementar aquí (éxito)
    return response;
  },
  (error) => {
    // Implementar aquí (errores)
    return Promise.reject(error);
  }
);
```

### Prueba del interceptor

```typescript
// Verificar en los logs de la consola del browser:
// [HTTP ▶] GET /api/usuarios
// [HTTP ✅] GET /api/usuarios — 200 (89ms)
// [HTTP ▶] GET /api/admin
// [HTTP ❌] GET /api/admin — 403
```

### Criterios de Aceptación

- [ ] Cada petición tiene `Authorization: Bearer <token>` automáticamente
- [ ] Cada petición tiene un `X-Request-ID` único
- [ ] Los logs aparecen en la consola en desarrollo
- [ ] Error 401 emite el evento `auth:unauthorized`
- [ ] Error de red muestra mensaje en español, no el error nativo de JS

---

## 🟡 Ejercicio 4 — Módulos de API por Dominio

**Nivel:** Intermedio | **Tiempo:** 40 minutos

### Descripción

Organizar las llamadas a la API en módulos separados por dominio de negocio, con TypeScript completo.

### Módulos a implementar

#### `reportesAPI.ts`

```typescript
interface Reporte {
  id: string;
  titulo: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'ARCHIVADO';
  creadoEn: string;
}

export const reportesAPI = {
  listar: (params?: { estado?: string; pagina?: number }) => ...,
  obtener: (id: string) => ...,
  crear: (datos: Omit<Reporte, 'id' | 'creadoEn'>) => ...,
  publicar: (id: string) => ...,
  archivar: (id: string) => ...,
};
```

#### `authAPI.ts`

```typescript
export const authAPI = {
  login: (email: string, password: string) => ...,
  logout: () => ...,
  refresh: (refreshToken: string) => ...,
  me: () => ...,
};
```

### Requerimientos

1. Cada módulo usa `axiosClient` del Ejercicio 3
2. Todos los métodos están tipados (entrada y salida)
3. Crear un `index.ts` que exporte todos los módulos
4. Crear mocks en Next.js para probar los módulos

### Pistas

<details>
<summary>💡 Estructura del index.ts</summary>

```typescript
// src/services/api/index.ts
export { reportesAPI } from './reportesAPI';
export { authAPI } from './authAPI';
export { usuariosAPI } from './usuariosAPI';
```

</details>

### Criterios de Aceptación

- [ ] `reportesAPI.publicar('123')` hace `PATCH /reportes/123` con `{ estado: 'PUBLICADO' }`
- [ ] `authAPI.refresh(token)` hace `POST /auth/refresh` sin incluir el accessToken en headers
- [ ] Los tipos TypeScript previenen pasar parámetros incorrectos (errores en compilación)
- [ ] Todos los módulos se exportan desde un único archivo `index.ts`

---

## 🔴 Ejercicio 5 — Token Refresh con Cola

**Nivel:** Avanzado | **Tiempo:** 75 minutos

### Descripción

Implementar el sistema de refresh de token con cola para evitar múltiples refreshes simultáneos.

### Escenario de prueba

```typescript
// Este código debe funcionar correctamente:
// Hacer 3 peticiones simultáneas cuando el token está expirado
Promise.all([
  axiosClient.get('/usuarios'),
  axiosClient.get('/reportes'),
  axiosClient.get('/dashboard'),
]).then(([usuarios, reportes, dashboard]) => {
  // Las 3 deben resolverse con los datos correctos
  // Solo se debe haber hecho UN request de refresh
});
```

### Requerimientos

1. Implementar `TokenRefreshQueue` con:
   - `isRefreshing: boolean`
   - `waitForRefresh(): Promise<string | null>`
   - `startRefresh(): (token: string | null) => void`
2. Implementar `executeTokenRefresh()` que use la cola
3. El interceptor de 401 debe usar `executeTokenRefresh()`
4. Verificar en los Network Logs del browser: solo 1 petición a `/api/auth/refresh`

### Pistas

<details>
<summary>💡 Estructura de la cola</summary>

```typescript
// src/services/tokenRefreshQueue.ts
class TokenRefreshQueue {
  private _isRefreshing = false;
  private subscribers: Array<(token: string | null) => void> = [];

  get isRefreshing() { return this._isRefreshing; }

  waitForRefresh(): Promise<string | null> {
    return new Promise(resolve => {
      this.subscribers.push(resolve);
    });
  }

  startRefresh(): (token: string | null) => void {
    this._isRefreshing = true;
    return (token: string | null) => {
      this._isRefreshing = false;
      const subs = [...this.subscribers];
      this.subscribers = [];
      subs.forEach(cb => cb(token));
    };
  }
}

export const tokenQueue = new TokenRefreshQueue();
```

</details>

### API Mock para el refresh

```typescript
// src/app/api/auth/refresh/route.ts
// Simular refresh: validar refreshToken y retornar nuevo accessToken
export async function POST(request: Request) {
  const { refreshToken } = await request.json();

  if (!refreshToken) {
    return Response.json({ error: 'No refresh token' }, { status: 401 });
  }

  // Simular delay de red
  await new Promise(r => setTimeout(r, 500));

  return Response.json({
    accessToken: `new_access_${Date.now()}`,
    refreshToken: `new_refresh_${Date.now()}`,
  });
}
```

### Criterios de Aceptación

- [ ] 3 peticiones simultáneas con token expirado → solo 1 request de refresh
- [ ] Las 3 peticiones se reintentan exitosamente con el nuevo token
- [ ] Si el refresh falla → las 3 peticiones fallan y se emite `auth:session-expired`
- [ ] El log muestra: `[TokenQueue] 1 refresh, 2 waiting`

---

## 🔴 Ejercicio 6 — Upload de Archivos con Progreso

**Nivel:** Avanzado | **Tiempo:** 45 minutos

### Descripción

Implementar un componente de upload de archivos con barra de progreso y cancelación.

### Requerimientos

1. `archivosAPI.subir(file, carpeta, onProgress)` usando Axios con `onUploadProgress`
2. Hook `useFileUpload` que maneje: `isUploading`, `progress`, `error`, `cancelar()`
3. Componente `<FileUploader>` con:
   - Zona de drag & drop
   - Barra de progreso animada
   - Botón de cancelar
   - Validación de tipo y tamaño de archivo
4. El botón cancelar debe abortar la petición con `AbortController`

### Código base del hook

```typescript
// src/hooks/useFileUpload.ts
export function useFileUpload(carpeta: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = async (file: File) => {
    // TODO: Implementar upload con progreso
  };

  const cancelar = () => {
    // TODO: Abortar la petición con abortControllerRef.current?.abort()
  };

  return { upload, cancelar, isUploading, progress, error };
}
```

### Criterios de Aceptación

- [ ] La barra de progreso se actualiza en tiempo real (no salta de 0 a 100%)
- [ ] El botón "Cancelar" detiene el upload inmediatamente
- [ ] Subir un archivo > 5MB muestra error sin hacer el request
- [ ] Tipo de archivo no permitido muestra error antes del upload
- [ ] Tras el upload exitoso, el input se resetea para permitir otro archivo

---

## Checklist Final del Módulo 2.4

- [ ] Ejercicio 1: Cliente HTTP básico ✅
- [ ] Ejercicio 2: Manejo de errores por tipo ✅
- [ ] Ejercicio 3: Axios con interceptores ✅
- [ ] Ejercicio 4: Módulos de API por dominio ✅
- [ ] Ejercicio 5: Token refresh con cola ✅
- [ ] Ejercicio 6: Upload con progreso ✅

---

## Proyecto Final del Módulo 2

Construir un **Dashboard Empresarial Completo** que integre todo lo aprendido:

### Funcionalidades requeridas

1. **Autenticación:** Login con JWT + cookie httpOnly (Sección 2.3)
2. **Protección de rutas:** Middleware + layouts verificando sesión (Sección 2.1 + 2.3)
3. **Roles:** ADMIN, MANAGER, USER con diferentes accesos (Sección 2.1)
4. **Next.js App Router:** Grupos de rutas, layouts anidados (Sección 2.2)
5. **APIs:** Cliente Axios con interceptores y refresh automático (Sección 2.4)
6. **UI:** Server Components para datos + Client Components para interactividad

### Criterios de evaluación

| Criterio | Peso |
|----------|------|
| Autenticación funcional | 20% |
| Protección de rutas correcta | 25% |
| Middleware implementado | 20% |
| Cliente API con interceptores | 20% |
| Calidad del código TypeScript | 15% |
