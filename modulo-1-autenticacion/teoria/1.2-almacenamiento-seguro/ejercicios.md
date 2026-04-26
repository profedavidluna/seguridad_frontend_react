# Ejercicios: Almacenamiento Seguro de Tokens

> **Sección:** 1.2 | **Total:** 10 ejercicios | **Tiempo estimado:** 3-4 horas

---

## 📋 Índice de Ejercicios

| # | Título | Nivel | Tiempo |
|---|--------|-------|--------|
| 1 | Auditar una app que usa localStorage | 🟢 Básico | 15 min |
| 2 | Migrar de localStorage a memoria | 🟢 Básico | 25 min |
| 3 | Inspeccionar cookies con DevTools | 🟢 Básico | 20 min |
| 4 | Configurar cookies seguras en Express | 🟡 Intermedio | 35 min |
| 5 | Implementar lector de CSRF token | 🟡 Intermedio | 30 min |
| 6 | Detectar tokens en storage inseguro | 🟡 Intermedio | 40 min |
| 7 | Service Worker para interceptar tokens | 🔴 Avanzado | 60 min |
| 8 | Gestor de tokens multi-tab | 🔴 Avanzado | 55 min |
| 9 | Limpieza automática por inactividad | 🔴 Avanzado | 50 min |
| 10 | Auditoría de seguridad de storage | 🔴 Avanzado | 45 min |

---

## 🟢 Ejercicio 1: Auditar una Aplicación que usa localStorage

**Nivel:** Básico | **Tiempo:** 15 minutos

### Descripción

Analiza el siguiente código de una aplicación React existente e identifica todos los problemas de seguridad relacionados con el almacenamiento de tokens.

### Código a Auditar

```typescript
// ⚠️ Este código tiene múltiples vulnerabilidades — identifícalas todas

// auth.js
export const AUTH = {
  login: async (email, password) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const { token, refreshToken, user } = await res.json();
    
    localStorage.setItem('token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('login_time', Date.now().toString());
    
    return user;
  },
  
  getToken: () => localStorage.getItem('token'),
  
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  
  isAuth: () => localStorage.getItem('is_authenticated') === 'true',
  
  logout: () => {
    localStorage.removeItem('token');
    // Olvidó remover otros items
  }
};

// api.js
export async function apiCall(endpoint, options = {}) {
  const token = AUTH.getToken();
  
  return fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': token,  // Falta "Bearer "
      'Content-Type': 'application/json'
    }
  });
}

// UserProfile.jsx
function UserProfile() {
  const user = JSON.parse(localStorage.getItem('user_data'));
  
  // Confiar en datos de localStorage para mostrar info sensible
  if (user?.role === 'admin') {
    return <AdminPanel />;
  }
  return <UserPanel />;
}
```

### Tareas

1. Lista **todos los problemas** de seguridad encontrados (mínimo 8).
2. Clasifica cada problema por severidad: **Crítico**, **Alto**, **Medio**, **Bajo**.
3. Explica el impacto potencial de cada vulnerabilidad.
4. Proporciona la corrección para los 3 problemas más críticos.

### Formato de Entrega

```markdown
| # | Línea | Problema | Severidad | Impacto | Corrección |
|---|-------|----------|-----------|---------|------------|
| 1 |  ...  | ...      | Crítico   | ...     | ...        |
```

---

## 🟢 Ejercicio 2: Migrar de localStorage a Memoria

**Nivel:** Básico | **Tiempo:** 25 minutos

### Descripción

Refactoriza el código del Ejercicio 1 para usar almacenamiento en memoria seguro. Asegúrate de mantener la misma API externa para no romper el código que lo usa.

### Requerimientos

1. Crear un módulo `SecureAuthStore` que reemplace los accesos a `localStorage`.
2. Mantener el mismo interfaz público (`login`, `getToken`, `isAuth`, `logout`).
3. Agregar soporte para callback de expiración de sesión.
4. Manejar correctamente el caso de recarga de página (retornar `null`).

### Código de Inicio

```typescript
// Implementa este módulo
class SecureAuthStore {
  private token: string | null = null;
  private user: object | null = null;
  
  login(tokenData: { token: string; user: object }): void {
    // Implementar
  }
  
  getToken(): string | null {
    // Implementar
  }
  
  isAuthenticated(): boolean {
    // Implementar — sin depender de localStorage
  }
  
  logout(): void {
    // Implementar — limpiar TODO
  }
}
```

---

## 🟢 Ejercicio 3: Inspeccionar Cookies con DevTools

**Nivel:** Básico | **Tiempo:** 20 minutos

### Descripción

Ejercicio práctico de inspección de cookies usando las herramientas de desarrollo del navegador. Responde las preguntas basándote en la inspección de un sitio con autenticación.

### Instrucciones

1. Abre `http://localhost:3000` (app del curso) en Chrome.
2. Abre DevTools (F12) → Tab **Application** → **Cookies**.
3. Haz login con las credenciales de prueba.
4. Inspecciona todas las cookies creadas.

### Preguntas a Responder

```markdown
1. ¿Cuántas cookies se crearon al hacer login?

2. Para la cookie del refresh token:
   - ¿Tiene el flag HttpOnly? ¿Cómo puedes saberlo?
   - ¿Tiene el flag Secure? 
   - ¿Qué valor tiene SameSite?
   - ¿Cuál es el Path configurado?
   - ¿Cuándo expira?

3. Intenta leer la cookie httpOnly desde la consola:
   document.cookie
   ¿Aparece el refresh token? ¿Por qué sí o no?

4. ¿Qué información contiene la cookie csrfToken?
   ¿Por qué NO tiene el flag HttpOnly?

5. Si cambiaras SameSite de 'strict' a 'none', ¿qué riesgo se introduce?
```

---

## 🟡 Ejercicio 4: Configurar Cookies Seguras en Express

**Nivel:** Intermedio | **Tiempo:** 35 minutos

### Descripción

Implementa un servidor Express completo con configuración correcta de cookies para diferentes entornos (desarrollo y producción).

### Requerimientos

```typescript
// Implementa los siguientes endpoints con las cookies apropiadas:

// POST /auth/login
// - Establece refreshToken como httpOnly cookie
// - Establece csrfToken como cookie legible por JS
// - Responde con accessToken en el body

// POST /auth/refresh
// - Lee refreshToken de la cookie httpOnly
// - Rota el refresh token (emite uno nuevo)
// - Responde con nuevo accessToken

// POST /auth/logout
// - Elimina AMBAS cookies correctamente
// - Revoca el refresh token en la "base de datos"
```

### Validación de tu Implementación

```bash
# Test 1: Login y verificar flags de cookies
curl -v -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
# Debe mostrar: HttpOnly; Secure; SameSite=Strict

# Test 2: Refresh con cookie
curl -v -X POST http://localhost:3001/auth/refresh \
  -b "refreshToken=TOKEN_AQUI"
# Debe responder con nuevo accessToken

# Test 3: Logout y verificar que la cookie se elimina
curl -v -X POST http://localhost:3001/auth/logout \
  -b "refreshToken=TOKEN_AQUI"
# La cookie debe tener Max-Age=0 en la respuesta
```

---

## 🟡 Ejercicio 5: Implementar Lector de CSRF Token

**Nivel:** Intermedio | **Tiempo:** 30 minutos

### Descripción

Crea un cliente HTTP personalizado que automáticamente incluya el token CSRF en todos los requests mutantes, leyéndolo desde las cookies.

### Requerimientos

```typescript
interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, body: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, body: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

interface RequestConfig {
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

// Tu implementación debe:
// 1. Leer el csrfToken de las cookies automáticamente
// 2. Incluirlo como X-CSRF-Token en POST, PUT, DELETE
// 3. NO incluirlo en GET (no necesario)
// 4. Manejar el caso donde el csrfToken no exista
// 5. Renovar el token CSRF si el servidor responde 403 CSRF_INVALID

function createHttpClient(baseUrl: string): HttpClient {
  // Tu implementación
}
```

### Prueba

```typescript
const client = createHttpClient('/api');

// GET no debe incluir CSRF token
const profile = await client.get('/profile');

// POST debe incluir automáticamente X-CSRF-Token
const result = await client.post('/articles', { title: 'Test' });

// Verificar en la consola de red que el header está presente
```

---

## 🟡 Ejercicio 6: Detectar y Alertar sobre Almacenamiento Inseguro

**Nivel:** Intermedio | **Tiempo:** 40 minutos

### Descripción

Implementa una herramienta de auditoría que detecte tokens JWT almacenados en lugares inseguros (`localStorage`, `sessionStorage`, cookies accesibles por JS) y genere un reporte.

### Requerimientos

```typescript
interface StorageAuditResult {
  insecureFindings: InsecureFinding[];
  risk: 'critical' | 'high' | 'medium' | 'low' | 'none';
  recommendations: string[];
}

interface InsecureFinding {
  location: 'localStorage' | 'sessionStorage' | 'cookie_js_accessible';
  key: string;
  valueType: 'jwt' | 'possible_token' | 'other';
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

function auditTokenStorage(): StorageAuditResult {
  // Debe revisar:
  // 1. Todas las claves de localStorage
  // 2. Todas las claves de sessionStorage
  // 3. Todas las cookies accesibles por JS (document.cookie)
  // 4. Identificar valores que parecen JWTs (formato xxx.yyy.zzz)
  // 5. Identificar keys con nombres sospechosos (token, jwt, auth, etc.)
}
```

### Detectores a Implementar

```typescript
function looksLikeJWT(value: string): boolean {
  // Un JWT tiene exactamente 3 partes separadas por '.'
  // Cada parte es Base64URL
}

function hasTokenKeyword(key: string): boolean {
  const keywords = ['token', 'jwt', 'auth', 'bearer', 'session', 'credential'];
  // Verificar si la key contiene alguna de estas palabras (case-insensitive)
}
```

---

## 🔴 Ejercicio 7: Service Worker para Interceptar y Agregar Tokens

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Implementa un Service Worker que intercepte todas las requests a la API y automáticamente agregue el token de autenticación. El token se almacena en el Service Worker (contexto aislado) para mayor seguridad.

### Concepto

```
┌────────────────────────────────────────────────────────────────┐
│                  SERVICE WORKER COMO PROXY                     │
│                                                                │
│  Página Web                Service Worker            API       │
│  ──────────                ──────────────            ───       │
│  fetch('/api/data') ──────►interceptar request ─────►/api/data │
│                            + agregar AT header        │        │
│  recibir respuesta ◄──────────────────────────────────┘        │
│                                                                │
│  VENTAJA: El token está en el SW, aislado de la página         │
│  Si hay XSS en la página, no puede acceder al token del SW     │
└────────────────────────────────────────────────────────────────┘
```

### Código de Inicio

```javascript
// public/auth-worker.js — Service Worker

let accessToken = null;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Escuchar mensajes de la página para actualizar el token
self.addEventListener('message', (event) => {
  if (event.data.type === 'SET_TOKEN') {
    accessToken = event.data.token;
  }
  if (event.data.type === 'CLEAR_TOKEN') {
    accessToken = null;
  }
});

// Interceptar requests a la API
self.addEventListener('fetch', (event) => {
  // Implementar:
  // 1. Solo interceptar requests a /api/
  // 2. Si hay accessToken, agregarlo como Bearer
  // 3. Si la respuesta es 401, notificar a la página
  // 4. Pasar el resto de requests sin modificar
});
```

### Registro en la Aplicación

```typescript
// Implementa el registro del SW y la comunicación
async function registerAuthWorker() {
  // Registrar el service worker
  // Configurar comunicación bidireccional
  // Enviar el token cuando cambie
}
```

---

## 🔴 Ejercicio 8: Gestor de Tokens Multi-Pestaña

**Nivel:** Avanzado | **Tiempo:** 55 minutos

### Descripción

Implementa un sistema de sincronización de estado de autenticación entre múltiples pestañas usando `BroadcastChannel` y `localStorage` para la señalización (sin almacenar tokens).

### Requerimientos de Comportamiento

```
Pestaña 1: Usuario hace LOGIN
  → Broadcast: { type: 'LOGIN', userId: '123', sessionId: 'sess_abc' }
  → Pestaña 2 recibe el evento y actualiza su estado
  → Pestaña 2 hace un refresh silencioso para obtener su propio AT

Pestaña 1: Usuario hace LOGOUT
  → Broadcast: { type: 'LOGOUT' }
  → Todas las pestañas limpian su estado y muestran login

Pestaña 2 intenta usar AT expirado:
  → La pestaña coordina la renovación con las demás
  → Solo UNA pestaña hace el refresh (evitar múltiples requests)
```

### Implementación a Completar

```typescript
class MultiTabAuthCoordinator {
  private channel: BroadcastChannel;
  private isRenewing: boolean = false;
  
  constructor() {
    this.channel = new BroadcastChannel('auth_sync');
    this.setupListener();
  }
  
  private setupListener(): void {
    // Implementar manejo de mensajes entre pestañas
  }
  
  broadcastLogin(userId: string): void {
    // Notificar login a otras pestañas
  }
  
  broadcastLogout(): void {
    // Notificar logout a todas las pestañas
  }
  
  async coordinateRefresh(): Promise<string | null> {
    // Coordinar que solo una pestaña haga el refresh
    // Las demás esperan y usan el token renovado
  }
  
  destroy(): void {
    this.channel.close();
  }
}
```

---

## 🔴 Ejercicio 9: Limpieza Automática por Inactividad

**Nivel:** Avanzado | **Tiempo:** 50 minutos

### Descripción

Implementa un sistema de detección de inactividad del usuario que automáticamente cierre la sesión después de un período configurable sin actividad, con advertencia previa.

### Flujo Esperado

```
Usuario inactivo por 28 minutos:
  → Mostrar modal: "Tu sesión expirará en 2 minutos. ¿Continuar?"
  [Continuar]  → Renovar token, reiniciar timer
  [Cerrar]     → Logout inmediato
  [Sin acción] → Logout automático a los 30 minutos
```

### Código de Inicio

```typescript
interface InactivityConfig {
  timeoutMs: number;        // 30 * 60 * 1000 = 30 minutos
  warningMs: number;        // 2 * 60 * 1000 = 2 minutos antes del timeout
  onWarning: () => void;    // Callback para mostrar el modal
  onTimeout: () => void;    // Callback para hacer logout
  trackEvents: string[];    // ['mousemove', 'keypress', 'click', 'touchstart']
}

class InactivityDetector {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private warningId: ReturnType<typeof setTimeout> | null = null;
  
  constructor(private config: InactivityConfig) {}
  
  start(): void {
    // Implementar: registrar event listeners y timers
  }
  
  reset(): void {
    // Implementar: reiniciar todos los timers
  }
  
  stop(): void {
    // Implementar: limpiar event listeners y timers
  }
}

// Hook de React para usar el detector
function useInactivityDetector(config: InactivityConfig): void {
  // Implementar usando useEffect
}
```

### Componente de Advertencia

```tsx
function SessionExpiryWarning({
  isVisible,
  remainingSeconds,
  onContinue,
  onLogout,
}: {
  isVisible: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogout: () => void;
}) {
  // Implementar modal con cuenta regresiva
}
```

---

## 🔴 Ejercicio 10: Auditoría Completa de Seguridad de Storage

**Nivel:** Avanzado | **Tiempo:** 45 minutos

### Descripción

Crea un reporte de auditoría completo que evalúe todas las prácticas de almacenamiento de una aplicación React e identifique vulnerabilidades, su impacto y correcciones específicas.

### Aplicación a Auditar

Usa la aplicación de ejemplo del curso (en `/modulo-1-autenticacion/proyecto`) y realiza una auditoría completa respondiendo:

### Checklist de Auditoría

```markdown
## 1. Análisis de localStorage
- [ ] ¿Se almacenan tokens en localStorage?
- [ ] ¿Qué datos están en localStorage? ¿Son sensibles?
- [ ] ¿Se limpian correctamente al cerrar sesión?

## 2. Análisis de sessionStorage
- [ ] ¿Se almacenan tokens en sessionStorage?
- [ ] ¿Qué datos están disponibles post-logout?

## 3. Análisis de Cookies
- [ ] ¿Las cookies de auth tienen HttpOnly?
- [ ] ¿Tienen el flag Secure en producción?
- [ ] ¿Cuál es el valor de SameSite?
- [ ] ¿Está configurado el Path apropiadamente?
- [ ] ¿Las cookies expiran correctamente?

## 4. Análisis de Headers HTTP
- [ ] ¿Se envía el token correctamente? (Bearer vs. sin prefijo)
- [ ] ¿Se incluye el CSRF token cuando es necesario?

## 5. Análisis de Logout
- [ ] ¿Se limpian todos los storages?
- [ ] ¿Se invalida el refresh token en el servidor?
- [ ] ¿Se notifica a otras pestañas?
```

### Reporte Final

```markdown
# Reporte de Auditoría de Almacenamiento Seguro
Fecha: [Fecha]
Aplicación: [Nombre]

## Hallazgos Críticos
...

## Hallazgos de Alta Severidad
...

## Plan de Remediación
| Hallazgo | Prioridad | Esfuerzo estimado | Solución |
|----------|-----------|-------------------|----------|
```

---

*← [Volver a la Sección 1.2](../README.md) | [→ Sección 1.3: Vulnerabilidades](../../1.3-vulnerabilidades/README.md)*
