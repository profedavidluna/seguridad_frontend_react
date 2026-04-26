# Ejemplo Básico 2.2 — App Router Básico en Next.js

## Descripción

Configuración inicial de un proyecto Next.js 14 con App Router. Rutas básicas, layout raíz, y páginas simples de autenticación.

---

## Crear el Proyecto

```bash
npx create-next-app@latest mi-app-empresarial \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd mi-app-empresarial
npm run dev
```

---

## Estructura de archivos básica

```
src/
├── app/
│   ├── layout.tsx          ← Layout raíz
│   ├── page.tsx            ← Página de inicio (/)
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx        ← /login
│   └── dashboard/
│       └── page.tsx        ← /dashboard
```

---

## Código

### Layout Raíz

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portal Empresarial',
  description: 'Aplicación empresarial segura con Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

---

### Página de Inicio

```tsx
// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Portal Empresarial</h1>
      <p className="text-xl text-gray-600 mb-8">
        Sistema de gestión empresarial seguro
      </p>
      <Link
        href="/login"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Iniciar Sesión
      </Link>
    </main>
  );
}
```

---

### Página de Login

```tsx
// src/app/login/page.tsx
import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-gray-500 mt-2">Ingresa tus credenciales</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

---

### Formulario de Login (Client Component)

```tsx
// src/components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      router.push('/dashboard');
      router.refresh(); // Forzar re-render del layout
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="usuario@empresa.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

---

### API Route de Login

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Usuarios demo (en producción: verificar contra base de datos)
const USUARIOS_DEMO = [
  { id: '1', email: 'admin@empresa.com', password: 'admin123', nombre: 'Admin', rol: 'ADMIN' },
  { id: '2', email: 'user@empresa.com', password: 'user123', nombre: 'Usuario', rol: 'USER' },
];

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const usuario = USUARIOS_DEMO.find(
    u => u.email === email && u.password === password
  );

  if (!usuario) {
    return NextResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 }
    );
  }

  const { password: _, ...userData } = usuario;

  const response = NextResponse.json({ usuario: userData });

  // Establecer cookie de sesión
  response.cookies.set('session', JSON.stringify(userData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  });

  return response;
}
```

---

### Dashboard básico

```tsx
// src/app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  // Verificar sesión en el servidor
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    redirect('/login');
  }

  const session = JSON.parse(sessionCookie.value);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Hola, {session.nombre}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-red-600 hover:underline">
              Cerrar Sesión
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <p className="text-gray-600">Bienvenido al dashboard. Rol: <strong>{session.rol}</strong></p>
      </main>
    </div>
  );
}
```

---

## Variables de Entorno

```env
# .env.local
# Secreto para firmar JWT (mínimo 32 caracteres)
JWT_SECRET=tu-secreto-super-largo-y-seguro-aqui

# URL de la base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/miapp

# NOTA: Las variables sin NEXT_PUBLIC_ son solo del servidor
# Las variables con NEXT_PUBLIC_ son visibles en el cliente
NEXT_PUBLIC_APP_NAME="Portal Empresarial"
```

---

## Scripts Útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar en producción
npm start

# Linting
npm run lint

# Verificar tipos TypeScript
npx tsc --noEmit
```
