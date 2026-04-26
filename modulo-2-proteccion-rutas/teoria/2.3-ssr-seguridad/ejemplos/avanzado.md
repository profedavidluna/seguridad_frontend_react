# Ejemplo Avanzado 2.3 — Middleware Empresarial con Refresco de Token y Auditoría

## Descripción

Sistema de seguridad completo para aplicaciones empresariales: rotación automática de tokens, registro de auditoría, rate limiting, protección CSRF, y manejo de sesiones concurrentes.

---

## Código

### 1. Middleware empresarial completo

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT, errors as joseErrors } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const REFRESH_THRESHOLD_SECONDS = 30 * 60; // 30 minutos antes de expirar

interface TokenPayload {
  userId: string;
  email: string;
  nombre: string;
  roles: string[];
  sessionId: string; // Para invalidación de sesiones
  iat: number;
  exp: number;
}

// Configuración declarativa de rutas protegidas
const ROUTE_CONFIG: Array<{
  pattern: RegExp;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  auditLog?: boolean;
}> = [
  { pattern: /^\/admin/, requiredRoles: ['ADMIN'], auditLog: true },
  { pattern: /^\/gestion/, requiredRoles: ['ADMIN', 'MANAGER'] },
  { pattern: /^\/reportes/, requiredRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { pattern: /^\/api\/admin/, requiredRoles: ['ADMIN'], auditLog: true },
];

// Rutas que no requieren autenticación
const PUBLIC_PATTERNS = [
  /^\//,                   // Solo /
  /^\/login/,
  /^\/register/,
  /^\/unauthorized/,
  /^\/api\/auth/,
  /^\/_next/,
  /^\/favicon/,
];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const response = NextResponse.next();

  // 1. Saltar rutas públicas
  if (PUBLIC_PATTERNS.some(p => p.test(pathname)) || /\.\w+$/.test(pathname)) {
    return response;
  }

  // 2. Verificar token CSRF para requests mutantes
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const csrfCheck = verifyCsrfToken(request);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: 'CSRF token inválido' }, { status: 403 });
    }
  }

  // 3. Obtener y verificar token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return redirectToLogin(request, 'NO_TOKEN');
  }

  let payload: TokenPayload;

  try {
    const { payload: jwtPayload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
    });
    payload = jwtPayload as unknown as TokenPayload;
  } catch (error) {
    const reason = error instanceof joseErrors.JWTExpired
      ? 'TOKEN_EXPIRED'
      : 'INVALID_TOKEN';

    await logSecurityEvent(request, null, reason);

    const res = redirectToLogin(request, reason);
    res.cookies.delete('auth-token');
    return res;
  }

  // 4. Verificar si la sesión fue invalidada (logout de otro dispositivo)
  const sessionRevoked = await isSessionRevoked(payload.sessionId);
  if (sessionRevoked) {
    await logSecurityEvent(request, payload, 'SESSION_REVOKED');
    const res = redirectToLogin(request, 'SESSION_REVOKED');
    res.cookies.delete('auth-token');
    return res;
  }

  // 5. Verificar permisos por ruta
  const routeConfig = ROUTE_CONFIG.find(r => r.pattern.test(pathname));

  if (routeConfig?.requiredRoles) {
    const tieneAcceso = routeConfig.requiredRoles.some(r =>
      payload.roles.includes(r)
    );

    if (!tieneAcceso) {
      await logSecurityEvent(request, payload, 'INSUFFICIENT_ROLE', {
        requiredRoles: routeConfig.requiredRoles,
        userRoles: payload.roles,
        path: pathname,
      });

      return NextResponse.redirect(
        new URL(`/unauthorized?from=${encodeURIComponent(pathname)}`, request.url)
      );
    }
  }

  // 6. Registro de auditoría para rutas sensibles
  if (routeConfig?.auditLog) {
    await logSecurityEvent(request, payload, 'SENSITIVE_ACCESS', {
      path: pathname,
      method: request.method,
    });
  }

  // 7. Renovar token si está próximo a expirar
  const ahora = Math.floor(Date.now() / 1000);
  const tiempoRestante = payload.exp - ahora;

  let finalResponse = NextResponse.next({
    request: {
      headers: buildUserHeaders(request, payload),
    },
  });

  if (tiempoRestante < REFRESH_THRESHOLD_SECONDS) {
    const nuevoToken = await renewToken(payload);
    finalResponse.cookies.set('auth-token', nuevoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
  }

  return finalResponse;
}

// Helpers

function buildUserHeaders(request: NextRequest, payload: TokenPayload): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-user-id', payload.userId);
  headers.set('x-user-email', payload.email);
  headers.set('x-user-name', payload.nombre);
  headers.set('x-user-roles', payload.roles.join(','));
  headers.set('x-session-id', payload.sessionId);
  return headers;
}

function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('from', request.nextUrl.pathname);
  if (reason === 'TOKEN_EXPIRED') {
    url.searchParams.set('reason', 'expired');
  }
  return NextResponse.redirect(url);
}

function verifyCsrfToken(request: NextRequest): { valid: boolean } {
  const csrfHeader = request.headers.get('x-csrf-token');
  const csrfCookie = request.cookies.get('csrf-token')?.value;

  // El token CSRF del header debe coincidir con el de la cookie
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return { valid: false };
  }
  return { valid: true };
}

async function renewToken(payload: TokenPayload): Promise<string> {
  const { iat, exp, ...renewPayload } = payload;
  return new SignJWT(renewPayload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

async function isSessionRevoked(sessionId: string): Promise<boolean> {
  // En producción: verificar en Redis/DB si la sesión fue invalidada
  // Aquí se retorna false como ejemplo
  return false;
}

async function logSecurityEvent(
  request: NextRequest,
  payload: TokenPayload | null,
  event: string,
  extra?: Record<string, unknown>
) {
  // En producción: enviar a CloudWatch, DataDog, SIEM, etc.
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId: payload?.userId,
    email: payload?.email,
    ip: request.ip || request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    path: request.nextUrl.pathname,
    ...extra,
  };

  // Durante desarrollo, loguear a consola
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(logEntry));
  }

  // En producción, enviar al servicio de logs
  // await fetch(process.env.LOG_SERVICE_URL!, { method: 'POST', body: JSON.stringify(logEntry) });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### 2. Invalidación de Sesiones Múltiples

```typescript
// src/lib/sessionStore.ts
// Gestión de sesiones con Redis (simplificado con Map para demo)

const activeSessions = new Map<string, {
  userId: string;
  createdAt: number;
  lastActivity: number;
  userAgent: string;
  ip: string;
}>();

const revokedSessions = new Set<string>();

export const sessionStore = {
  async create(sessionId: string, data: any) {
    activeSessions.set(sessionId, {
      ...data,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
  },

  async revoke(sessionId: string) {
    revokedSessions.add(sessionId);
    activeSessions.delete(sessionId);
  },

  async revokeAllUserSessions(userId: string) {
    for (const [id, session] of activeSessions) {
      if (session.userId === userId) {
        revokedSessions.add(id);
        activeSessions.delete(id);
      }
    }
  },

  async isRevoked(sessionId: string): Promise<boolean> {
    return revokedSessions.has(sessionId);
  },

  async getUserSessions(userId: string) {
    return Array.from(activeSessions.entries())
      .filter(([_, s]) => s.userId === userId)
      .map(([id, s]) => ({ id, ...s }));
  },
};
```

---

### 3. Página de Gestión de Sesiones

```tsx
// src/app/(protected)/perfil/sesiones/page.tsx
import { requireAuth } from '@/lib/auth';
import { sessionStore } from '@/lib/sessionStore';
import { RevokeSessionButton } from './RevokeSessionButton';

export default async function SesionesPage() {
  const session = await requireAuth();
  const sesionesActivas = await sessionStore.getUserSessions(session.userId);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sesiones Activas</h1>
      <p className="text-gray-600 mb-4">
        Tienes {sesionesActivas.length} sesión(es) activa(s).
      </p>

      <div className="space-y-3">
        {sesionesActivas.map(s => (
          <div key={s.id} className="bg-white rounded-lg border p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{s.userAgent || 'Dispositivo desconocido'}</p>
              <p className="text-xs text-gray-500">IP: {s.ip}</p>
              <p className="text-xs text-gray-500">
                Última actividad: {new Date(s.lastActivity).toLocaleString('es-MX')}
              </p>
            </div>
            <RevokeSessionButton
              sessionId={s.id}
              isCurrent={s.id === session.sessionId}
            />
          </div>
        ))}
      </div>

      <form action="/api/auth/logout-all" method="POST" className="mt-6">
        <button
          type="submit"
          className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
        >
          Cerrar Todas las Sesiones
        </button>
      </form>
    </div>
  );
}
```

---

### 4. API Route para logout de todas las sesiones

```typescript
// src/app/api/auth/logout-all/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { sessionStore } from '@/lib/sessionStore';

export async function POST() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Invalidar TODAS las sesiones del usuario
  await sessionStore.revokeAllUserSessions(session.userId);

  const response = NextResponse.redirect(new URL('/login', 'http://localhost'));
  response.cookies.delete('auth-token');
  return response;
}
```

---

## Resumen del Sistema de Seguridad

| Capa | Función | Dónde |
|------|---------|-------|
| Cookie httpOnly | Almacenamiento seguro del JWT | Browser ↔ Server |
| Middleware | Verificación centralizada + logs | Edge Network |
| Renovación automática | UX sin interrupciones | Middleware |
| Headers x-user-* | Datos de usuario sin re-verificar | Middleware → Server Components |
| Invalidación de sesión | Logout remoto | sessionStore |
| Registro de auditoría | Trazabilidad de accesos | Middleware → Log Service |
| Verificación CSRF | Protección contra solicitudes cruzadas | Middleware |

> **Nota de producción:** La verificación de sesiones revocadas (`isSessionRevoked`) debe usar Redis o una base de datos en memoria de baja latencia. No se debe consultar una DB relacional en cada request del middleware ya que impactaría significativamente el rendimiento.
