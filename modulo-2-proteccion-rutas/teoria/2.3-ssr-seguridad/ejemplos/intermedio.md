# Ejemplo Intermedio 2.3 — Middleware con Roles y Validación de Sesión

## Descripción

Middleware completo con protección por roles, inyección de datos del usuario en headers, y validación de sesión en múltiples capas (middleware + layout + page).

---

## Código

### 1. Tipos compartidos

```typescript
// src/types/session.ts
export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface SessionPayload {
  userId: string;
  email: string;
  nombre: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}
```

### 2. Utilidades de autenticación

```typescript
// src/lib/auth.ts
import { jwtVerify, SignJWT } from 'jose';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { SessionPayload } from '@/types/session';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createToken(payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Obtener sesión desde la cookie — para uso en layouts y pages.
 * cache() asegura que solo se verifique una vez por request.
 */
export const getServerSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
});

/**
 * Obtener datos del usuario desde los headers inyectados por el middleware.
 * Más eficiente que re-verificar el JWT.
 */
export function getUserFromHeaders(): Partial<SessionPayload> | null {
  const headersList = headers();
  const userId = headersList.get('x-user-id');

  if (!userId) return null;

  return {
    userId,
    email: headersList.get('x-user-email') || '',
    nombre: headersList.get('x-user-name') || '',
    roles: (headersList.get('x-user-roles') || '').split(',').filter(Boolean) as any,
  };
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireRole(role: string): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!session.roles.includes(role as any)) redirect('/unauthorized');
  return session;
}

export async function requireAnyRole(...roles: string[]): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!roles.some(r => session.roles.includes(r as any))) redirect('/unauthorized');
  return session;
}
```

### 3. Middleware completo con roles

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { SessionPayload } from './src/types/session';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Mapa de rutas protegidas con sus roles requeridos
const ROUTE_PERMISSIONS = new Map<RegExp, string[]>([
  [/^\/admin/, ['ADMIN']],
  [/^\/gestion/, ['ADMIN', 'MANAGER']],
  [/^\/reportes/, ['ADMIN', 'MANAGER']],
  // /dashboard es accesible por cualquier usuario autenticado (sin roles específicos)
]);

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/recuperar-password',
  '/unauthorized',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Saltar paths públicos y assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  let payload: SessionPayload;

  try {
    const { payload: jwtPayload } = await jwtVerify(token, SECRET);
    payload = jwtPayload as unknown as SessionPayload;
  } catch {
    const response = redirectToLogin(request);
    response.cookies.delete('auth-token');
    return response;
  }

  // Verificar permisos por ruta
  for (const [pattern, requiredRoles] of ROUTE_PERMISSIONS) {
    if (pattern.test(pathname)) {
      const tieneAcceso = requiredRoles.some(r => payload.roles.includes(r as any));

      if (!tieneAcceso) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      break;
    }
  }

  // Inyectar datos del usuario en headers para Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-name', payload.nombre);
  requestHeaders.set('x-user-roles', payload.roles.join(','));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToLogin(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 4. Layout con doble verificación

```tsx
// src/app/(protected)/layout.tsx
// Segunda capa de verificación (middleware es la primera)
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificación en la segunda capa (layout)
  // Aunque el middleware ya verificó, es buena práctica para defensa en profundidad
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar roles={session.roles} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar nombre={session.nombre} email={session.email} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 5. Página que usa headers del middleware

```tsx
// src/app/(protected)/dashboard/page.tsx
import { getUserFromHeaders, getServerSession } from '@/lib/auth';

export default async function DashboardPage() {
  // Opción 1: Leer desde headers (más eficiente — no re-verifica JWT)
  const userFromHeaders = getUserFromHeaders();

  // Opción 2: Verificar sesión completa (más seguro para datos críticos)
  const session = await getServerSession();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Usuario (desde headers): {userFromHeaders?.nombre}</p>
      <p>Usuario (desde cookie/JWT): {session?.nombre}</p>
      <p>Roles: {session?.roles.join(', ')}</p>

      {session?.roles.includes('ADMIN') && (
        <section className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h2>Panel Exclusivo de Admin</h2>
          <p>Esta sección solo es visible para administradores.</p>
        </section>
      )}
    </div>
  );
}
```

### 6. Registro de Accesos No Autorizados

```typescript
// src/lib/audit.ts — Registrar intentos de acceso
export async function logUnauthorizedAccess(info: {
  path: string;
  userId?: string;
  reason: 'NO_TOKEN' | 'INVALID_TOKEN' | 'INSUFFICIENT_ROLE';
}) {
  // En producción: enviar a sistema de logs (DataDog, CloudWatch, etc.)
  console.warn('[SECURITY]', {
    timestamp: new Date().toISOString(),
    ...info,
  });
}
```

---

## Diagrama de Flujo con Roles

```
GET /admin/usuarios

Middleware.ts
   ├── Token presente? No → redirect /login
   ├── Token válido?   No → redirect /login + delete cookie
   ├── Ruta /admin requiere rol ADMIN
   ├── Usuario tiene ADMIN? No → redirect /unauthorized
   └── Inyectar headers (x-user-id, x-user-roles...)
           │
           ▼
   Layout /admin/layout.tsx
   ├── getServerSession() — segunda verificación
   ├── roles.includes('ADMIN')? No → redirect /unauthorized
   └── Renderizar layout de admin
           │
           ▼
   Page /admin/usuarios/page.tsx
   ├── requireRole('ADMIN') — tercera verificación
   ├── Consultar DB con datos del usuario verificado
   └── Renderizar lista de usuarios
```
