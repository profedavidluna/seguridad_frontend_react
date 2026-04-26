# 3.2 — Arquitectura Frontend Empresarial

> **Sección:** 3.2 de 4 | **Duración:** 2 horas | **Nivel:** Intermedio-Avanzado

---

## 🎯 Objetivos de Aprendizaje

Al completar esta sección, podrás:

- Diseñar una **estructura de carpetas escalable** para proyectos Next.js empresariales
- Aplicar correctamente los patrones de **separación Cliente-Servidor** con App Router
- Elegir entre **arquitectura orientada a features** vs. arquitectura por capas
- Entender los fundamentos de un **monorepo** con Turborepo o Nx
- Implementar **code splitting y lazy loading** para mejorar rendimiento y seguridad
- Establecer convenciones de equipo claras y mantenibles

---

## 1. Organización de Proyectos Next.js — Mejores Prácticas

### 1.1 Estructura Base Recomendada

```
mi-app-empresarial/
├── app/                          # App Router de Next.js 13+
│   ├── (auth)/                   # Grupo de rutas — sin segmento en URL
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── registro/
│   │       └── page.tsx
│   ├── (dashboard)/              # Rutas protegidas del dashboard
│   │   ├── layout.tsx            # Layout con protección de ruta
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── usuarios/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── reportes/
│   │       └── page.tsx
│   ├── api/                      # API Routes (Server-side only)
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   └── usuarios/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   └── not-found.tsx
│
├── components/                   # Componentes reutilizables
│   ├── ui/                       # Componentes de UI genéricos (design system)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts              # Re-exportaciones
│   ├── layout/                   # Componentes de estructura
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   └── features/                 # Componentes específicos de dominio
│       ├── auth/
│       ├── dashboard/
│       └── usuarios/
│
├── lib/                          # Utilidades y configuraciones
│   ├── api/                      # Clientes de API
│   │   ├── client.ts
│   │   └── endpoints.ts
│   ├── auth/                     # Lógica de autenticación
│   │   ├── session.ts
│   │   └── permissions.ts
│   ├── validations/              # Schemas de validación (Zod)
│   └── utils/                    # Utilidades genéricas
│
├── hooks/                        # Custom hooks de React
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   └── useMediaQuery.ts
│
├── stores/                       # Estado global (Zustand / Jotai)
│   ├── authStore.ts
│   └── uiStore.ts
│
├── types/                        # TypeScript types e interfaces
│   ├── api.ts
│   ├── auth.ts
│   └── domain.ts
│
├── public/                       # Archivos estáticos
│   ├── images/
│   └── icons/
│
├── middleware.ts                 # Middleware de Next.js (auth, i18n, etc.)
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### 1.2 Convenciones de Nomenclatura

```typescript
// Archivos de componentes: PascalCase
// UserProfile.tsx, DashboardLayout.tsx

// Archivos de utilidades/hooks: camelCase
// useAuth.ts, formatDate.ts, apiClient.ts

// Directorios: kebab-case
// user-profile/, dashboard-layout/

// Constantes: SCREAMING_SNAKE_CASE
// MAX_RETRY_ATTEMPTS, API_BASE_URL

// Interfaces y Types: PascalCase con prefijo descriptivo
// interface UserProfile {...}
// type ApiResponse<T> = {...}

// Ejemplo de estructura de componente completo:
// components/features/usuarios/UserCard/
// ├── UserCard.tsx        ← Componente principal
// ├── UserCard.test.tsx   ← Tests unitarios
// ├── UserCard.stories.tsx ← Storybook (si se usa)
// └── index.ts            ← Re-exportación limpia
```

---

## 2. Separación Cliente-Servidor en Next.js App Router

### 2.1 La Distinción Fundamental

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODELO MENTAL CLAVE                          │
│                                                                 │
│  SERVER COMPONENTS          CLIENT COMPONENTS                   │
│  ┌────────────────────┐     ┌────────────────────┐             │
│  │ - Acceso a DB      │     │ - useState          │             │
│  │ - Variables .env   │     │ - useEffect         │             │
│  │ - Fetch directo    │     │ - Event handlers    │             │
│  │ - SEO automático   │     │ - Browser APIs      │             │
│  │ - Sin estado       │     │ - Interactividad    │             │
│  │ - Más seguro       │     │ 'use client'        │             │
│  │ [Default en App    │     │                     │             │
│  │  Router]           │     │                     │             │
│  └────────────────────┘     └────────────────────┘             │
│                                                                 │
│  REGLA: Mover hacia el servidor todo lo que puedas              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Patrones de Composición

```tsx
// app/(dashboard)/usuarios/page.tsx
// ✅ Server Component por defecto — accede a DB directamente

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db'; // Acceso directo a BD — solo posible en servidor
import { UsersTable } from '@/components/features/usuarios/UsersTable';
import { UsersFilters } from '@/components/features/usuarios/UsersFilters';

export default async function UsuariosPage() {
  // ✅ La sesión y los datos se obtienen en el servidor
  const session = await getServerSession(authOptions);

  if (!session) {
    // El middleware debería haber redirigido, pero por si acaso
    redirect('/login');
  }

  // ✅ Fetch directo a la base de datos — seguro, sin exponer credenciales
  const usuarios = await db.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      // ❌ No seleccionar campos sensibles innecesarios
      // password: false (implícito)
      // resetToken: false (implícito)
    },
    orderBy: { nombre: 'asc' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
      {/* Componente de cliente para interactividad */}
      <UsersFilters />
      {/* Componente de servidor: recibe datos estáticos */}
      <UsersTable usuarios={usuarios} />
    </div>
  );
}
```

```tsx
// components/features/usuarios/UsersFilters.tsx
'use client'; // ← Necesario para estado e interactividad

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function UsersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '');

  const handleSearch = (valor: string) => {
    setBusqueda(valor);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor) {
        params.set('q', valor);
      } else {
        params.delete('q');
      }
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex gap-3">
      <input
        type="search"
        placeholder="Buscar usuarios..."
        value={busqueda}
        onChange={e => handleSearch(e.target.value)}
        className="border rounded px-3 py-2"
      />
      {isPending && <span className="text-gray-500 text-sm">Cargando...</span>}
    </div>
  );
}
```

### 2.3 Server Actions — Mutaciones Seguras

```tsx
// app/(dashboard)/usuarios/actions.ts
'use server'; // ← Este archivo se ejecuta SOLO en el servidor

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/db';

// Schema de validación del lado servidor
const CrearUsuarioSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  rol: z.enum(['admin', 'editor', 'visor']),
});

export async function crearUsuario(formData: FormData) {
  // 1. Verificar autenticación
  const session = await getServerSession();
  if (!session) throw new Error('No autorizado');

  // 2. Verificar permisos
  if (session.user.rol !== 'admin') {
    throw new Error('Solo los administradores pueden crear usuarios');
  }

  // 3. Validar datos
  const resultado = CrearUsuarioSchema.safeParse({
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    rol: formData.get('rol'),
  });

  if (!resultado.success) {
    return { error: resultado.error.flatten().fieldErrors };
  }

  // 4. Crear en base de datos
  await db.usuario.create({ data: resultado.data });

  // 5. Revalidar caché y redirigir
  revalidatePath('/usuarios');
  redirect('/usuarios?mensaje=usuario-creado');
}
```

---

## 3. Arquitectura Basada en Features

### 3.1 Feature-First vs Layer-First

```
LAYER-FIRST (tradicional):          FEATURE-FIRST (recomendada para empresas):
src/
├── components/                     src/
│   ├── UserList.tsx                ├── features/
│   ├── UserForm.tsx                │   ├── usuarios/
│   └── OrderList.tsx               │   │   ├── components/
├── hooks/                          │   │   │   ├── UserList.tsx
│   ├── useUsers.ts                 │   │   │   └── UserForm.tsx
│   └── useOrders.ts                │   │   ├── hooks/
├── services/                       │   │   │   └── useUsers.ts
│   ├── userService.ts              │   │   ├── services/
│   └── orderService.ts             │   │   │   └── userService.ts
└── types/                          │   │   ├── types.ts
    ├── user.ts                     │   │   └── index.ts
    └── order.ts                    │   └── pedidos/
                                    │       ├── components/
Ventajas:                           │       │   └── OrderList.tsx
- Simple de entender                │       └── ...
Desventajas:                        ├── shared/      ← Compartido entre features
- No escala bien                    │   ├── components/
- Alto acoplamiento                 │   ├── hooks/
- Difícil de hacer lazy loading     │   └── utils/
por feature                         └── app/
                                    
                                    Ventajas:
                                    - Cohesión alta
                                    - Bajo acoplamiento
                                    - Lazy loading por feature
                                    - Fácil de eliminar features
```

### 3.2 Implementación de Feature Module

```typescript
// features/usuarios/index.ts — API pública de la feature
// Solo exportar lo que otras features deben poder usar

export { UserList } from './components/UserList';
export { UserCard } from './components/UserCard';
export { useUsers } from './hooks/useUsers';
export type { Usuario, PerfilUsuario } from './types';

// NO exportar detalles internos:
// export { UserRepository } from './services/userRepository'; // ❌ interno
// export { userSchema } from './validations'; // ❌ interno
```

```typescript
// features/usuarios/services/userService.ts — Lógica de negocio
import type { Usuario, CreateUsuarioInput, UpdateUsuarioInput } from '../types';
import { apiClient } from '@/lib/api/client';

export const userService = {
  async getAll(): Promise<Usuario[]> {
    return apiClient.get<Usuario[]>('/usuarios');
  },

  async getById(id: string): Promise<Usuario> {
    return apiClient.get<Usuario>(`/usuarios/${id}`);
  },

  async create(data: CreateUsuarioInput): Promise<Usuario> {
    return apiClient.post<Usuario>('/usuarios', data);
  },

  async update(id: string, data: UpdateUsuarioInput): Promise<Usuario> {
    return apiClient.patch<Usuario>(`/usuarios/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/usuarios/${id}`);
  },
};
```

```typescript
// features/usuarios/hooks/useUsers.ts — Hook de la feature
import useSWR from 'swr';
import { userService } from '../services/userService';
import type { Usuario } from '../types';

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<Usuario[]>(
    '/usuarios',
    () => userService.getAll()
  );

  return {
    usuarios: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

export function useUser(id: string) {
  const { data, error, isLoading } = useSWR<Usuario>(
    id ? `/usuarios/${id}` : null,
    () => userService.getById(id)
  );

  return {
    usuario: data,
    isLoading,
    isError: !!error,
  };
}
```

---

## 4. Consideraciones de Monorepo

### 4.1 Cuándo Usar un Monorepo

```
Usar Monorepo cuando:                 NO usar Monorepo cuando:
✅ Múltiples apps que comparten       ❌ Una sola app pequeña
   componentes/lógica                 ❌ Equipo pequeño sin necesidad
✅ Teams que trabajan en el mismo     ❌ Apps completamente independientes
   dominio de negocio                 ❌ Stacks tecnológicos muy diferentes
✅ Necesitas consistencia en          ❌ No hay infraestructura de CI/CD
   versiones de dependencias             adecuada
✅ Empresa grande con múltiples
   productos relacionados
```

### 4.2 Estructura con Turborepo

```
empresa-monorepo/
├── apps/
│   ├── web/              # App principal (Next.js)
│   ├── admin/            # Panel de administración (Next.js)
│   └── docs/             # Documentación (Next.js)
├── packages/
│   ├── ui/               # Design System compartido
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   ├── auth/             # Lógica de autenticación compartida
│   ├── config/           # Configuraciones compartidas
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   └── utils/            # Utilidades compartidas
├── turbo.json            # Configuración de Turborepo
└── package.json          # Workspace root
```

```json
// turbo.json — Configuración del pipeline
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 5. Code Splitting y Lazy Loading

### 5.1 Lazy Loading de Componentes

```tsx
// app/(dashboard)/layout.tsx
import { Suspense, lazy } from 'react';

// Importación dinámica — el código se carga solo cuando se necesita
const AnalyticsWidget = lazy(() =>
  import('@/features/analytics/components/AnalyticsWidget')
    .then(m => ({ default: m.AnalyticsWidget }))
);

// Con next/dynamic (preferido en Next.js)
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('@/features/reportes/components/HeavyChart'),
  {
    loading: () => <div className="animate-pulse h-64 bg-gray-200 rounded" />,
    ssr: false, // No renderizar en servidor (solo cliente)
  }
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense fallback={<div>Cargando analíticas...</div>}>
        <AnalyticsWidget />
      </Suspense>
      <HeavyChart />
      {children}
    </div>
  );
}
```

### 5.2 Lazy Loading de Rutas Completas

```tsx
// En Next.js App Router, cada segmento de ruta se divide automáticamente
// Pero podemos controlar la granularidad:

// app/(dashboard)/reportes/page.tsx
// Este chunk solo se carga cuando el usuario navega a /reportes
import { Suspense } from 'react';
import { ReportesTable } from '@/features/reportes/components/ReportesTable';
import { ReportesSkeleton } from '@/features/reportes/components/ReportesSkeleton';

// El componente de datos también puede ser lazy
async function ReportesData() {
  // Fetch de datos pesados
  const reportes = await obtenerReportes();
  return <ReportesTable reportes={reportes} />;
}

export default function ReportesPage() {
  return (
    <Suspense fallback={<ReportesSkeleton />}>
      <ReportesData />
    </Suspense>
  );
}
```

### 5.3 Barrel Files y Tree Shaking

```typescript
// ❌ MAL — Barrel file que impide tree shaking
// components/index.ts
export * from './Button';
export * from './HeavyDataGrid'; // Se incluye aunque no se use
export * from './Modal';
export * from './Chart'; // Biblioteca pesada incluida siempre

// ✅ MEJOR — Importaciones directas para tree shaking efectivo
import { Button } from '@/components/ui/Button';
// Solo el código de Button se incluye en el bundle

// ✅ También válido — barrel file pero con importaciones directas
// Si tu bundler soporta tree shaking correctamente
import { Button, Modal } from '@/components/ui';
// Solo Button y Modal se incluyen
```

### 5.4 Análisis del Bundle

```bash
# Analizar el bundle de Next.js
npm install --save-dev @next/bundle-analyzer

# next.config.ts
import type { NextConfig } from 'next';
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  // ... tu config
} satisfies NextConfig);

# Ejecutar análisis
ANALYZE=true npm run build
```

---

## 6. Configuración de TypeScript para Empresas

### 6.1 tsconfig.json Estricto

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/features/*": ["./src/features/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 7. Buenas Prácticas — Resumen

| Práctica | Descripción | Impacto |
|---------|-------------|---------|
| **Feature-first** | Organizar por dominio de negocio, no por tipo técnico | Mantenibilidad |
| **Server por defecto** | Solo usar 'use client' cuando sea necesario | Seguridad + Rendimiento |
| **Server Actions** | Mutaciones en servidor con validación doble | Seguridad |
| **TypeScript estricto** | `strict: true` + opciones adicionales | Calidad |
| **Alias de paths** | `@/` en vez de `../../` para imports | DX |
| **Barrel exports mínimos** | Solo exportar API pública de cada feature | Bundle size |
| **Lazy loading** | Cargar código solo cuando se necesita | Rendimiento |
| **Monorepo con CI** | Solo si hay múltiples apps relacionadas | Escalabilidad |

---

## 🔗 Referencias

- [Next.js — Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js — Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Turborepo — Getting Started](https://turbo.build/repo/docs)
- [bulletproof-react — Scalable React Architecture](https://github.com/alan2207/bulletproof-react)
- [Next.js — Bundle Analyzer](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)
