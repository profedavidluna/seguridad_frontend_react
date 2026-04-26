# 2.2 — Next.js Esencial para Proyectos Empresariales

## Introducción

Next.js es el framework React más popular para aplicaciones de producción. Combina la flexibilidad de React con características empresariales como Server-Side Rendering (SSR), Static Site Generation (SSG), optimización automática de imágenes, manejo de rutas integrado, y mucho más.

Para seguridad, Next.js ofrece ventajas críticas: la validación de sesiones puede ocurrir en el servidor antes de enviar cualquier HTML al cliente, eliminando la vulnerabilidad de "flash" de contenido protegido.

---

## 1. Arquitectura de Next.js

### 1.1 ¿Por qué Next.js para aplicaciones empresariales?

| Característica | React (Vite/CRA) | Next.js |
|----------------|------------------|---------|
| Enrutamiento | Manual (React Router) | Integrado (File-based) |
| SSR/SSG | No nativo | Nativo |
| API Routes | No | Sí (`/app/api/`) |
| Middleware | No | Sí (`middleware.ts`) |
| Optimización imágenes | No | Sí (`next/image`) |
| Metadatos SEO | Manual | API integrada |
| Seguridad de rutas en servidor | Difícil | Nativo (Middleware) |
| Deploy en Vercel | Básico | Optimizado |

### 1.2 Modelos de Rendering en Next.js

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Rendering                  │
├───────────┬──────────────┬──────────────┬───────────┤
│    SSG    │     ISR      │     SSR      │    CSR    │
│  Static   │ Incremental  │   Server-    │  Client   │
│  Site     │   Static     │   Side       │   Side    │
│  Gen.     │  Regen.      │  Rendering   │ Rendering │
├───────────┼──────────────┼──────────────┼───────────┤
│ Build     │ Build +      │ Each        │ Browser   │
│ time      │ Revalidate   │ Request     │           │
├───────────┼──────────────┼──────────────┼───────────┤
│ Blog,     │ Catálogo,    │ Dashboard,  │ Widgets,  │
│ Docs      │ Noticias     │ Auth pages  │ Charts    │
└───────────┴──────────────┴──────────────┴───────────┘
```

### 1.3 App Router vs Pages Router

Next.js 13+ introdujo el **App Router** (carpeta `app/`). Para nuevos proyectos empresariales, siempre usar App Router.

| | Pages Router (`/pages`) | App Router (`/app`) |
|-|------------------------|---------------------|
| Estado | Legacy, mantenido | Nuevo, recomendado |
| Server Components | No | Sí (por defecto) |
| Streaming | No | Sí |
| Layouts | Manual | Nativo |
| Loading UI | Manual | `loading.tsx` |
| Error UI | Manual | `error.tsx` |
| Metadata | `_document.tsx` | `metadata` export |

---

## 2. File-Based Routing con App Router

### 2.1 Estructura de carpetas

```
app/
├── layout.tsx              ← Layout raíz (HTML, Body)
├── page.tsx                ← Página principal (/)
├── loading.tsx             ← UI de carga para /
├── error.tsx               ← UI de error para /
├── not-found.tsx           ← Página 404
│
├── (auth)/                 ← Grupo de rutas (no afecta URL)
│   ├── login/
│   │   └── page.tsx        ← /login
│   └── register/
│       └── page.tsx        ← /register
│
├── (dashboard)/            ← Grupo del dashboard
│   ├── layout.tsx          ← Layout compartido del dashboard
│   ├── dashboard/
│   │   └── page.tsx        ← /dashboard
│   ├── perfil/
│   │   └── page.tsx        ← /perfil
│   └── reportes/
│       ├── page.tsx        ← /reportes
│       └── [id]/
│           └── page.tsx    ← /reportes/[id]
│
├── admin/
│   ├── layout.tsx          ← Layout del admin
│   ├── page.tsx            ← /admin
│   └── usuarios/
│       ├── page.tsx        ← /admin/usuarios
│       └── [id]/
│           ├── page.tsx    ← /admin/usuarios/[id]
│           └── editar/
│               └── page.tsx ← /admin/usuarios/[id]/editar
│
└── api/
    └── auth/
        ├── login/
        │   └── route.ts    ← POST /api/auth/login
        └── logout/
            └── route.ts    ← POST /api/auth/logout
```

### 2.2 Convenciones de archivos especiales

| Archivo | Propósito |
|---------|-----------|
| `page.tsx` | Hace una ruta accesible públicamente |
| `layout.tsx` | UI compartida (persiste entre navegaciones) |
| `loading.tsx` | UI de carga (Suspense automático) |
| `error.tsx` | UI de error (Error Boundary automático) |
| `not-found.tsx` | UI para 404 |
| `template.tsx` | Similar a layout pero re-monta en cada navegación |
| `route.ts` | API endpoint (no tiene UI) |

### 2.3 Segmentos dinámicos

```
app/
├── productos/
│   ├── [id]/               ← /productos/123
│   ├── [...slug]/          ← /productos/a/b/c (catch-all)
│   └── [[...slug]]/        ← /productos o /productos/a/b (opcional)
```

```tsx
// app/productos/[id]/page.tsx
interface Props {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ProductoPage({ params, searchParams }: Props) {
  return <div>Producto {params.id}</div>;
}
```

---

## 3. Layouts y Layouts Anidados

### 3.1 Concepto de Layout

Un layout es una UI que se comparte entre múltiples páginas y **persiste** durante la navegación (no se re-monta).

```tsx
// app/layout.tsx — Layout raíz (OBLIGATORIO)
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Mi Empresa',
    default: 'Mi Empresa — Portal Corporativo',
  },
  description: 'Portal corporativo empresarial',
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

### 3.2 Layouts Anidados para Autenticación

```tsx
// app/(dashboard)/layout.tsx
// Este layout aplica a TODAS las rutas dentro de (dashboard)/
import { redirect } from 'next/navigation';
import { getServerSession } from '../lib/auth';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar sesión en el servidor ANTES de renderizar
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="dashboard-layout">
      <Sidebar user={session.user} />
      <div className="main-area">
        <Topbar user={session.user} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 3.3 Grupos de Rutas para Organización

```tsx
// app/(auth)/layout.tsx
// Layout simple para páginas de autenticación
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-container">
      <div className="auth-logo">
        <img src="/logo.svg" alt="Logo" />
      </div>
      <div className="auth-card">
        {children}
      </div>
    </div>
  );
}
```

### 3.4 Loading y Error en Layouts

```tsx
// app/(dashboard)/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="loading-state">
      <div className="skeleton-sidebar" />
      <div className="skeleton-content">
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    </div>
  );
}

// app/(dashboard)/error.tsx
'use client'; // Error boundaries deben ser Client Components

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log del error a servicio de monitoreo
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="error-state">
      <h2>Algo salió mal</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Intentar nuevamente</button>
    </div>
  );
}
```

---

## 4. Server Components vs Client Components

### 4.1 La diferencia fundamental

```
┌─────────────────────────────────────────────────────┐
│                  Server Component                    │
│  ✅ Acceso a DB/APIs internas directamente           │
│  ✅ Manejo de secretos (env vars sin NEXT_PUBLIC_)   │
│  ✅ Reduce JavaScript enviado al cliente             │
│  ✅ Mejor SEO y rendimiento inicial                  │
│  ❌ Sin useState, useEffect, useContext              │
│  ❌ Sin event handlers (onClick, etc.)               │
│  ❌ Sin acceso a APIs del browser (localStorage)     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Client Component                    │
│  'use client' — directiva obligatoria               │
│  ✅ useState, useEffect, useRef, etc.                │
│  ✅ Event handlers (onClick, onChange, etc.)         │
│  ✅ Acceso a APIs del browser                        │
│  ✅ Custom hooks                                     │
│  ❌ No puede acceder a recursos del servidor         │
│  ❌ Aumenta el bundle del cliente                    │
└─────────────────────────────────────────────────────┘
```

### 4.2 Cuándo usar cada uno

| Necesidad | Tipo de Componente |
|-----------|--------------------|
| Mostrar datos de DB sin interactividad | Server Component |
| Formulario con validación en tiempo real | Client Component |
| Verificar autenticación antes de render | Server Component |
| Menú con estado abierto/cerrado | Client Component |
| Dashboard con datos estáticos | Server Component |
| Gráfico interactivo | Client Component |
| Middleware de seguridad | Server (middleware.ts) |

### 4.3 Composición de Server y Client Components

```tsx
// app/dashboard/page.tsx — Server Component (por defecto)
import { DashboardStats } from './DashboardStats'; // Server Component
import { InteractiveChart } from './InteractiveChart'; // Client Component
import { getStats } from '../lib/data';
import { getServerSession } from '../lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession();
  const stats = await getStats(session.user.id);

  return (
    <div>
      <h1>Dashboard de {session.user.nombre}</h1>

      {/* Server Component — datos pre-renderizados en el servidor */}
      <DashboardStats stats={stats} />

      {/* Client Component — interactividad en el cliente */}
      {/* Los datos se pasan como props desde el servidor */}
      <InteractiveChart data={stats.chartData} />
    </div>
  );
}
```

```tsx
// app/dashboard/InteractiveChart.tsx — Client Component
'use client';

import { useState } from 'react';
import { LineChart } from 'recharts';

interface Props {
  data: ChartData[];
}

export function InteractiveChart({ data }: Props) {
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'año'>('mes');

  // Los datos vienen del servidor como props
  const filteredData = filterByPeriod(data, periodo);

  return (
    <div>
      <div className="period-selector">
        {(['semana', 'mes', 'año'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={periodo === p ? 'active' : ''}
          >
            {p}
          </button>
        ))}
      </div>
      <LineChart data={filteredData} width={600} height={300}>
        {/* configuración del gráfico */}
      </LineChart>
    </div>
  );
}
```

### 4.4 Acceso seguro a datos en Server Components

```tsx
// app/admin/usuarios/page.tsx — Server Component con datos seguros
import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/auth';
import { db } from '../../lib/database';

export default async function UsuariosPage() {
  const session = await getServerSession();

  // Verificar rol en el servidor
  if (!session?.user.roles.includes('ADMIN')) {
    redirect('/unauthorized');
  }

  // Acceso directo a la base de datos (SOLO posible en Server Component)
  // La clave de BD nunca sale del servidor
  const usuarios = await db.user.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true,
    },
    orderBy: { creadoEn: 'desc' },
  });

  return (
    <div>
      <h1>Gestión de Usuarios ({usuarios.length})</h1>
      <UserTable users={usuarios} />
    </div>
  );
}
```

---

## 5. Comparación con React Router

### 5.1 Diferencias clave

| Aspecto | React Router v6 | Next.js App Router |
|---------|-----------------|--------------------|
| Tipo | Client-side only | Server + Client |
| Definición de rutas | JSX en App.tsx | Sistema de archivos |
| Protección de rutas | Client Component | Server Component / Middleware |
| Datos para rutas | useEffect/loader | async Server Components |
| Layouts | Manual con Outlet | Automático con layout.tsx |
| Carga | Manual (lazy) | Automático (streaming) |
| URL params | `useParams()` | Props `params` del componente |
| Navegación | `useNavigate()` | `redirect()` / `useRouter()` |
| Link | `<Link to="...">` | `<Link href="...">` de next |

### 5.2 Equivalencias de código

```tsx
// React Router — Ruta protegida
<Route element={<PrivateRoute requiredRole="ADMIN" />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>

// Next.js — Equivalente
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await getServerSession();
  if (!session?.user.roles.includes('ADMIN')) {
    redirect('/unauthorized');
  }
  return <>{children}</>;
}
```

```tsx
// React Router — Parámetros de URL
function ProductPage() {
  const { id } = useParams();
  return <div>Producto {id}</div>;
}

// Next.js — Equivalente
export default function ProductPage({ params }: { params: { id: string } }) {
  return <div>Producto {params.id}</div>;
}
```

```tsx
// React Router — Navegación programática
const navigate = useNavigate();
navigate('/dashboard');

// Next.js — Client Component
'use client';
const router = useRouter();
router.push('/dashboard');

// Next.js — Server Component
import { redirect } from 'next/navigation';
redirect('/dashboard');
```

---

## 6. API Routes en Next.js

### 6.1 Creación de endpoints

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '../../../lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validar credenciales
    const user = await validateCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const token = await signToken({ userId: user.id, roles: user.roles });

    const response = NextResponse.json({ user, token });

    // También establecer cookie HttpOnly para mayor seguridad
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

---

## 7. Buenas Prácticas con Next.js App Router

### ✅ Hacer

- **Usar Server Components por defecto** y solo añadir `'use client'` cuando sea necesario
- **Validar sesión en Server Components y layouts** — nunca confiar solo en el middleware del cliente
- **Usar `redirect()` del servidor** para redirecciones de seguridad, no el router del cliente
- **Almacenar secretos solo en variables de entorno sin `NEXT_PUBLIC_`** para que no lleguen al cliente
- **Usar cookies HttpOnly** en lugar de localStorage para tokens de sesión
- **Implementar Middleware (`middleware.ts`)** para protección centralizada de rutas

### ❌ Evitar

- **Añadir `'use client'` innecesariamente** — aumenta el bundle del cliente
- **Hacer fetch desde Client Components** cuando un Server Component podría hacerlo de forma más segura
- **Exponer datos sensibles en Server Component props** — solo pasar lo necesario
- **Usar `localStorage` para sesiones** — usar cookies HttpOnly en su lugar
- **Mezclar Pages Router y App Router** en el mismo proyecto sin necesidad

---

## 📚 Referencias

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Layouts](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
