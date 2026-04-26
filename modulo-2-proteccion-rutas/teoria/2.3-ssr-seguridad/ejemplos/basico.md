# Ejemplo Básico 2.3 — Middleware de Autenticación Básico

## Descripción

Implementación mínima de un middleware de Next.js que protege todas las rutas del dashboard. Verifica la presencia de una cookie de sesión y redirige al login si no existe.

---

## Dependencias

```bash
npm install jose
```

---

## Código

### 1. Variables de entorno

```env
# .env.local
JWT_SECRET=clave-secreta-muy-larga-y-segura-para-desarrollo
```

### 2. Middleware básico

```typescript
// middleware.ts (raíz del proyecto)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Rutas que no requieren autenticación
const RUTAS_PUBLICAS = ['/login', '/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas y archivos estáticos
  const esPublica = RUTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + '/'));
  const esAsset = pathname.startsWith('/_next') || pathname.includes('.');

  if (esPublica || esAsset) {
    return NextResponse.next();
  }

  // Leer la cookie de sesión
  const token = request.cookies.get('auth-token')?.value;

  // Sin token: redirigir al login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Verificar que el token sea válido
  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next(); // Token válido: continuar
  } catch {
    // Token inválido: limpiar cookie y redirigir
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 3. API Route de Login

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const USUARIOS = [
  { id: '1', email: 'admin@test.com', password: 'admin123', nombre: 'Admin' },
  { id: '2', email: 'user@test.com',  password: 'user123',  nombre: 'Usuario' },
];

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const usuario = USUARIOS.find(u => u.email === email && u.password === password);

  if (!usuario) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await new SignJWT({
    userId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
  });

  return response;
}
```

### 4. API Route de Logout

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('auth-token');
  return response;
}
```

### 5. Dashboard protegido

```tsx
// src/app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { LogoutButton } from './LogoutButton';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value!;
  const { payload } = await jwtVerify(token, SECRET);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Bienvenido, {payload.nombre as string}</p>
      <p>Email: {payload.email as string}</p>
      <LogoutButton />
    </div>
  );
}
```

```tsx
// src/app/dashboard/LogoutButton.tsx
'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <button onClick={handleLogout} className="mt-4 text-red-600 underline">
      Cerrar Sesión
    </button>
  );
}
```

---

## Flujo Completo

```
1. Usuario navega a /dashboard
2. middleware.ts verifica cookie auth-token → no existe
3. Middleware redirige a /login?from=/dashboard
4. Usuario envía POST /api/auth/login con credenciales
5. API verifica credenciales, crea JWT, establece cookie httpOnly
6. Frontend redirige a /dashboard
7. middleware.ts verifica cookie → token válido
8. Next.js renderiza el dashboard en el servidor
9. HTML con datos del usuario llega al browser
```

---

## Verificación de la Seguridad

**Prueba 1 — La cookie es httpOnly:**
```javascript
// Ejecutar en la consola del browser — DEBE fallar
document.cookie.includes('auth-token'); // false
// La cookie NO aparece en document.cookie
```

**Prueba 2 — Acceso sin cookie:**
```bash
curl http://localhost:3000/dashboard
# Resultado esperado: 302 Redirect a /login
```

**Prueba 3 — Token manipulado:**
```bash
# Intentar con un token falso
curl -H "Cookie: auth-token=token-falso-manipulado" http://localhost:3000/dashboard
# Resultado: 302 Redirect a /login (jwtVerify falla)
```
