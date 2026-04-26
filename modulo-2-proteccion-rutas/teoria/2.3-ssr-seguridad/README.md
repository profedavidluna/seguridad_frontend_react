# 2.3 — SSR Aplicado a Seguridad

## Introducción

El Server-Side Rendering (SSR) es una de las herramientas más poderosas para la seguridad en aplicaciones web modernas. Cuando la lógica de autorización se ejecuta **en el servidor antes de enviar cualquier HTML**, eliminamos la posibilidad de que un atacante manipule el estado del cliente para ver contenido protegido.

> **Principio fundamental:** Lo que nunca llega al cliente, no puede ser manipulado por el cliente.

---

## 1. SSR y sus Beneficios para la Seguridad

### 1.1 Vulnerabilidades del CSR puro

En una aplicación React pura (CSR — Client-Side Rendering):

```
Flujo inseguro (CSR):
1. Browser solicita /dashboard
2. Servidor envía HTML vacío + JavaScript bundle completo
3. JavaScript se ejecuta en el browser
4. JavaScript verifica token en localStorage
5. Si token válido → muestra dashboard
6. Si token inválido → redirige a /login

PROBLEMA: El atacante puede:
- Abrir DevTools → Application → LocalStorage → insertar token falso
- Usar React DevTools → modificar el estado de isAuthenticated
- Comentar la verificación en el bundle compilado
- Ver el código fuente completo de la aplicación
```

### 1.2 Por qué SSR es más seguro

```
Flujo seguro (SSR/Next.js):
1. Browser solicita /dashboard
2. Servidor verifica cookie httpOnly (inaccesible desde JS del cliente)
3. Si sesión inválida → servidor devuelve 302 redirect a /login
4. Si sesión válida → servidor renderiza HTML con datos reales
5. Browser recibe HTML ya renderizado (con o sin datos según permisos)

VENTAJA: El atacante NO puede:
- Modificar cookies httpOnly desde DevTools
- Manipular el estado antes del primer render
- Ver código de lógica de negocio en el cliente
- Acceder a datos que nunca se enviaron al browser
```

### 1.3 Comparación de Modelos de Seguridad

| Aspecto | CSR (React puro) | SSR (Next.js) |
|---------|------------------|---------------|
| Verificación de sesión | En el cliente (manipulable) | En el servidor (confiable) |
| Token de acceso | localStorage (accesible via JS) | Cookie httpOnly (inaccesible via JS) |
| Flash de contenido | Posible (brief render antes de redirect) | No existe (redirige antes de renderizar) |
| Código de negocio | Expuesto en bundle del cliente | Permanece en el servidor |
| Datos sensibles | Riesgo de exposición en bundle | Solo el servidor los conoce |
| XSS y robo de tokens | Alto riesgo con localStorage | Mitigado con cookies httpOnly |

---

## 2. Validación de Sesión en el Servidor

### 2.1 Cookies httpOnly vs localStorage

```typescript
// ❌ Inseguro: localStorage (vulnerable a XSS)
localStorage.setItem('token', jwtToken);
// Cualquier script puede leer esto:
// document.cookie; localStorage.getItem('token');

// ✅ Seguro: Cookie httpOnly
// El servidor establece la cookie:
response.cookies.set('auth-token', jwtToken, {
  httpOnly: true,      // No accesible desde JavaScript
  secure: true,        // Solo HTTPS en producción
  sameSite: 'strict',  // Protección CSRF
  maxAge: 60 * 60 * 8, // 8 horas
  path: '/',
});
// El browser envía la cookie automáticamente en cada request
// JavaScript en el cliente NO puede leer su valor
```

### 2.2 Verificación JWT en el servidor

```typescript
// src/lib/auth.ts
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { cache } from 'react';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionData {
  userId: string;
  email: string;
  nombre: string;
  roles: string[];
  iat: number;
  exp: number;
}

/**
 * Verifica y decodifica el JWT de la cookie de sesión.
 * Usa React cache() para deduplicar en el mismo request.
 */
export const getServerSession = cache(async (): Promise<SessionData | null> => {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });

    return payload as unknown as SessionData;
  } catch (error) {
    // Token inválido, expirado o malformado
    console.warn('Session verification failed:', error);
    return null;
  }
});

/**
 * Requiere sesión válida. Redirige a login si no existe.
 * Usar en Server Components y layouts.
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getServerSession();

  if (!session) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  return session;
}

/**
 * Requiere sesión con rol específico.
 * Redirige a /unauthorized si el rol no coincide.
 */
export async function requireRole(role: string): Promise<SessionData> {
  const session = await requireAuth();

  if (!session.roles.includes(role)) {
    const { redirect } = await import('next/navigation');
    redirect('/unauthorized');
  }

  return session;
}

/**
 * Crear un JWT firmado.
 */
export async function createToken(payload: Omit<SessionData, 'iat' | 'exp'>) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);
}
```

### 2.3 Uso en Server Components

```tsx
// src/app/dashboard/page.tsx
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // requireAuth() verifica la sesión y redirige si no es válida
  const session = await requireAuth();

  // En este punto, session está garantizada como válida
  return (
    <div>
      <h1>Dashboard de {session.nombre}</h1>
      <p>Email: {session.email}</p>
      <p>Roles: {session.roles.join(', ')}</p>
    </div>
  );
}
```

---

## 3. Next.js Middleware para Autenticación

### 3.1 ¿Qué es el Middleware?

El Middleware de Next.js se ejecuta **antes de que se procese cualquier request**, incluyendo páginas estáticas y API routes. Es el lugar ideal para protección centralizada de rutas.

```
Request del usuario
       │
       ▼
  ┌─────────────┐
  │  middleware  │ ← Se ejecuta PRIMERO (edge runtime)
  │  .ts        │
  └──────┬──────┘
         │
    ┌────▼────┐
    │  ¿Auth  │
    │  válida?│
    └────┬────┘
         │
    ┌────▼────────────────────┐
   No                        Sí
    │                         │
    ▼                         ▼
Redirect                  Continuar
a /login              procesamiento normal
                           │
                           ▼
                      Layout.tsx
                           │
                           ▼
                       page.tsx
```

### 3.2 Ventajas del Middleware

- **Centralizado:** Una sola función protege todas las rutas
- **Edge Runtime:** Mínima latencia (no espera al servidor de Node.js)
- **Antes del caché:** Puede verificar autenticación antes de servir contenido cacheado
- **Sin flash:** La redirección ocurre antes de que el browser reciba cualquier byte

### 3.3 Consideraciones de Edge Runtime

El middleware corre en el **Edge Runtime** (similar a Cloudflare Workers), por lo que:

- No puede usar Node.js APIs (`fs`, `crypto` nativo, etc.)
- No puede conectarse directamente a bases de datos
- Sí puede usar: `jose` para JWT, cookies, headers, URL
- El verificado de JWT debe ser ligero

---

## 4. Implementación de `middleware.ts`

### 4.1 Middleware básico

```typescript
// middleware.ts (en la raíz del proyecto, junto a src/)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET!
);

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/recuperar-password'];

// Rutas de la API que no requieren auth (ej: el endpoint de login)
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (
    PUBLIC_ROUTES.some(route => pathname.startsWith(route)) ||
    PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Permitir archivos estáticos y assets de Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Verificar token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET_KEY);
    return NextResponse.next();
  } catch {
    // Token inválido o expirado
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas excepto:
     * - Archivos estáticos (_next/static, _next/image)
     * - Archivos de imagen/favicon
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 4.2 Middleware con verificación de roles

```typescript
// middleware.ts — Con roles y rutas protegidas por nivel
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET!);

interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  exp: number;
}

// Configuración de protección de rutas por rol
const PROTECTED_ROUTES: Array<{
  pattern: RegExp;
  roles: string[];
}> = [
  { pattern: /^\/admin/, roles: ['ADMIN'] },
  { pattern: /^\/gestion/, roles: ['ADMIN', 'MANAGER'] },
  { pattern: /^\/reportes/, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
];

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Saltar rutas públicas y assets
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  // Sin token → redirigir al login
  if (!token) {
    return redirectToLogin(request);
  }

  // Verificar token
  const payload = await verifyToken(token);

  if (!payload) {
    const response = redirectToLogin(request);
    response.cookies.delete('auth-token');
    return response;
  }

  // Verificar si la ruta requiere un rol específico
  const routeConfig = PROTECTED_ROUTES.find(r => r.pattern.test(pathname));

  if (routeConfig) {
    const tieneRol = routeConfig.roles.some(r => payload.roles.includes(r));

    if (!tieneRol) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Añadir información del usuario a los headers para Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-roles', payload.roles.join(','));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function isPublicRoute(pathname: string): boolean {
  const publicPaths = ['/login', '/register', '/api/auth/login', '/_next', '/favicon'];
  return publicPaths.some(p => pathname.startsWith(p)) || pathname === '/';
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 4.3 Leer headers del Middleware en Server Components

```tsx
// src/app/dashboard/page.tsx
import { headers } from 'next/headers';

export default function DashboardPage() {
  // Leer los headers que el middleware insertó
  const headersList = headers();
  const userId = headersList.get('x-user-id');
  const userRoles = headersList.get('x-user-roles')?.split(',') ?? [];

  return (
    <div>
      <p>Usuario ID: {userId}</p>
      <p>Roles: {userRoles.join(', ')}</p>
    </div>
  );
}
```

---

## 5. Patrones Avanzados de Validación de Token

### 5.1 Refresco automático de token en Middleware

```typescript
// middleware.ts — Con refresco automático
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET!);
const REFRESH_THRESHOLD = 30 * 60; // Refrescar si expira en menos de 30 min

export async function middleware(request: NextRequest) {
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  if (!token) return redirectToLogin(request);

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const ahora = Math.floor(Date.now() / 1000);
    const tiempoRestante = (payload.exp as number) - ahora;

    const response = NextResponse.next();

    // Si el token expira pronto, renovarlo
    if (tiempoRestante < REFRESH_THRESHOLD) {
      const nuevoToken = await new SignJWT({
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles,
      } as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(SECRET_KEY);

      response.cookies.set('auth-token', nuevoToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8,
        path: '/',
      });
    }

    return response;
  } catch {
    const response = redirectToLogin(request);
    response.cookies.delete('auth-token');
    return response;
  }
}
```

### 5.2 Rate Limiting básico en Middleware

```typescript
// middleware.ts — Con rate limiting para el login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = loginAttempts.get(ip);

  if (!limit || now > limit.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true; // Permitido
  }

  if (limit.count >= 10) {
    return false; // Bloqueado: más de 10 intentos en 15 minutos
  }

  limit.count++;
  return true;
}

// En el middleware de login:
if (pathname === '/api/auth/login' && request.method === 'POST') {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' },
      { status: 429 }
    );
  }
}
```

---

## 6. Buenas Prácticas para SSR + Autenticación

### ✅ Hacer

- **Usar cookies httpOnly** para almacenar tokens de sesión
- **Verificar sesión en cada Server Component/layout** que acceda a datos protegidos (no solo en el middleware)
- **Usar `jose` (no `jsonwebtoken`)** para verificación en Edge Runtime
- **Usar `React cache()`** para deduplicar llamadas de verificación de sesión
- **Añadir información del usuario a los headers** en middleware para evitar re-verificación
- **Implementar rotación de tokens** para sesiones de larga duración
- **Registrar intentos de acceso no autorizado** en logs del servidor

### ❌ Evitar

- **Confiar solo en el middleware** — también verificar en layouts y Server Components
- **Almacenar datos sensibles en cookies no-httpOnly** o en localStorage
- **Usar `jsonwebtoken`** en middleware (requiere Node.js runtime, no Edge)
- **Verificar sesión en Client Components** como única capa de seguridad
- **Exponer el JWT completo** al cliente (usar cookies httpOnly)
- **Almacenar roles/permisos en el cliente** sin validación server-side

### 🏗 Arquitectura de Seguridad en Capas

```
Capa 1: Middleware (Edge)
  └── Verificar existencia y validez básica del token
  └── Redirigir si no autenticado
  └── Rate limiting

Capa 2: Layout Server Components
  └── Verificar sesión completa (usuario, roles)
  └── Redirigir si no autorizado

Capa 3: Page Server Components
  └── Verificar permisos granulares
  └── Solo obtener datos a los que el usuario tiene acceso

Capa 4: API Routes
  └── Verificar sesión nuevamente
  └── Validar permisos por operación
  └── Validar y sanitizar datos de entrada
```

---

## 📚 Referencias

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [jose — JavaScript Object Signing and Encryption](https://github.com/panva/jose)
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP — Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
