# Ejemplo Intermedio 2.2 — Layouts Anidados con Autenticación

## Descripción

Implementación de layouts anidados en Next.js para separar la UI de autenticación del dashboard protegido. Uso de grupos de rutas, layouts con verificación de sesión, y navegación condicional.

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── layout.tsx                    ← Layout raíz
│   ├── page.tsx                      ← Página de inicio
│   │
│   ├── (auth)/                       ← Grupo de rutas públicas
│   │   ├── layout.tsx                ← Layout de autenticación
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── recuperar-password/
│   │       └── page.tsx
│   │
│   ├── (app)/                        ← Grupo de rutas protegidas
│   │   ├── layout.tsx                ← Layout del dashboard (verifica sesión)
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── perfil/
│   │   │   └── page.tsx
│   │   └── reportes/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   │
│   ├── admin/
│   │   ├── layout.tsx                ← Layout de admin (verifica rol ADMIN)
│   │   └── page.tsx
│   │
│   └── api/
│       └── auth/
│           ├── login/route.ts
│           ├── logout/route.ts
│           └── me/route.ts
│
├── components/
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── UserMenu.tsx
│
└── lib/
    ├── auth.ts                       ← Utilidades de sesión
    └── session.ts                    ← Gestión de cookies de sesión
```

---

## Código

### 1. Librería de Sesión

```typescript
// src/lib/session.ts
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'secreto-de-desarrollo-no-usar-en-produccion'
);

export interface SessionPayload {
  userId: string;
  email: string;
  nombre: string;
  roles: string[];
  exp?: number;
}

export async function createSession(payload: Omit<SessionPayload, 'exp'>) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  return verifySession(token);
}

export function setSessionCookie(response: Response, token: string) {
  const cookie = [
    `auth-token=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
    'Max-Age=28800', // 8 horas
  ].filter(Boolean).join('; ');

  response.headers.set('Set-Cookie', cookie);
}
```

---

### 2. Layout del Grupo (auth) — Páginas Públicas

```tsx
// src/app/(auth)/layout.tsx
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: {
    template: '%s | Acceso',
    default: 'Acceso — Portal Empresarial',
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel izquierdo: formulario */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Image src="/logo.svg" alt="Empresa" width={120} height={40} />
          </div>
          {children}
        </div>
      </div>

      {/* Panel derecho: imagen de fondo (solo en desktop) */}
      <div className="hidden lg:flex items-center justify-center bg-blue-600 p-12">
        <div className="text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Portal Corporativo</h2>
          <p className="text-blue-100 text-lg">
            Gestiona tu empresa de forma segura y eficiente
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Layout del Grupo (app) — Dashboard Protegido

```tsx
// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificación de sesión EN EL SERVIDOR
  // Esto ocurre ANTES de renderizar cualquier cosa del dashboard
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar fijo */}
      <Sidebar userRoles={session.roles} />

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          userName={session.nombre}
          userEmail={session.email}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

### 4. Layout de Admin — Verificación de Rol

```tsx
// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.roles.includes('ADMIN')) {
    redirect('/unauthorized');
  }

  return (
    <div className="admin-layout">
      <div className="admin-header bg-red-600 text-white px-6 py-2">
        <span className="text-sm font-medium">⚠️ Zona de Administración — Solo ADMIN</span>
      </div>
      {children}
    </div>
  );
}
```

---

### 5. Sidebar con Navegación Condicional

```tsx
// src/components/Sidebar.tsx
import Link from 'next/link';

interface SidebarProps {
  userRoles: string[];
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: '🏠',
    roles: null, // null = accesible para todos
  },
  {
    href: '/perfil',
    label: 'Mi Perfil',
    icon: '👤',
    roles: null,
  },
  {
    href: '/reportes',
    label: 'Reportes',
    icon: '📊',
    roles: ['MANAGER', 'ADMIN'],
  },
  {
    href: '/admin',
    label: 'Administración',
    icon: '⚙️',
    roles: ['ADMIN'],
  },
];

export function Sidebar({ userRoles }: SidebarProps) {
  const navItemsVisibles = NAV_ITEMS.filter(item =>
    item.roles === null || item.roles.some(r => userRoles.includes(r))
  );

  return (
    <aside className="w-64 bg-white shadow-sm flex flex-col">
      <div className="p-6 border-b">
        <span className="font-bold text-lg">Portal Empresarial</span>
      </div>

      <nav className="flex-1 py-4">
        {navItemsVisibles.map(item => (
          <SidebarLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="p-4 border-t">
        <LogoutButton />
      </div>
    </aside>
  );
}

function SidebarLink({ href, label, icon }: typeof NAV_ITEMS[0]) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
```

---

### 6. Topbar con Menú de Usuario

```tsx
// src/components/Topbar.tsx
import { UserMenu } from './UserMenu';

interface TopbarProps {
  userName: string;
  userEmail: string;
}

export function Topbar({ userName, userEmail }: TopbarProps) {
  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div>
        {/* Breadcrumb o título de la sección actual */}
      </div>
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
```

```tsx
// src/components/UserMenu.tsx
'use client'; // Necesita estado para el dropdown

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserMenuProps {
  name: string;
  email: string;
}

export function UserMenu({ name, email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
          <div className="px-4 py-3 border-b">
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => router.push('/perfil')}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Mi Perfil
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 7. Loading State por Página

```tsx
// src/app/(app)/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-xl" />
        ))}
      </div>
      <div className="bg-gray-200 h-64 rounded-xl" />
    </div>
  );
}
```

---

## Ventajas de este Patrón

| Aspecto | Beneficio |
|---------|-----------|
| Verificación de sesión en layout | Ocurre en el servidor → cero flash de contenido |
| Grupos de rutas `(auth)` y `(app)` | Layouts completamente diferentes sin afectar URLs |
| Sidebar con roles del servidor | Los roles vienen validados del servidor |
| `redirect()` del servidor | No puede ser bypasseado desde el cliente |
| Logout con `router.refresh()` | Limpia el estado del router del cliente |
