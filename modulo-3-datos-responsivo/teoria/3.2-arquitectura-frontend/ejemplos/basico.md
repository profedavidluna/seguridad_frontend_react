# Ejemplo Básico – Arquitectura Frontend Empresarial

## Nivel: 🟢 Básico

### Objetivo
Entender la estructura de carpetas recomendada para un proyecto Next.js empresarial.

---

## 1. Estructura de Proyecto Next.js (App Router)

```
mi-empresa-app/
├── app/                          # App Router (Next.js 13+)
│   ├── (auth)/                   # Grupo de rutas - autenticación
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/              # Grupo de rutas - dashboard
│   │   ├── layout.tsx            # Layout del dashboard
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── perfil/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       └── page.tsx
│   ├── api/                      # API Routes
│   │   └── auth/
│   │       └── route.ts
│   ├── globals.css
│   └── layout.tsx                # Layout raíz
│
├── components/                   # Componentes reutilizables
│   ├── ui/                       # Componentes de UI base
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   └── layout/                   # Componentes de layout
│       ├── Navbar.tsx
│       └── Sidebar.tsx
│
├── lib/                          # Utilidades y configuraciones
│   ├── auth.ts                   # Configuración de autenticación
│   └── api.ts                    # Cliente API
│
├── types/                        # Tipos TypeScript globales
│   └── index.ts
│
├── middleware.ts                 # Middleware de Next.js (raíz)
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 2. Convenciones de Nomenclatura

```tsx
// ✅ Componentes: PascalCase
// components/ui/Button.tsx
export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ✅ Hooks: camelCase con prefijo "use"
// hooks/useAuth.ts
export function useAuth() {
  // ...
}

// ✅ Utilidades: camelCase
// lib/formatters.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO');
}

// ✅ Tipos/Interfaces: PascalCase con sufijo descriptivo
// types/user.ts
export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'user' | 'editor';

// ✅ Constantes: SCREAMING_SNAKE_CASE
// constants/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;
export const TOKEN_EXPIRY_MINUTES = 60;
```

---

## 3. Separación Cliente/Servidor en Next.js

```tsx
// ✅ BIEN: Componente del servidor (sin 'use client')
// app/dashboard/page.tsx - Server Component
import { getUserData } from '@/lib/api';

export default async function DashboardPage() {
  // Esta función se ejecuta en el SERVIDOR
  const userData = await getUserData(); // Acceso directo a DB o API

  return (
    <div>
      <h1>Bienvenido, {userData.name}</h1>
      {/* Pasar solo los datos necesarios al cliente */}
      <DashboardClient stats={userData.stats} />
    </div>
  );
}

// ✅ BIEN: Componente del cliente solo cuando es necesario
// components/DashboardClient.tsx
'use client';
import { useState } from 'react';

interface DashboardClientProps {
  stats: { visits: number; sales: number };
}

export function DashboardClient({ stats }: DashboardClientProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  return (
    <div>
      <select onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}>
        <option value="week">Esta semana</option>
        <option value="month">Este mes</option>
      </select>
      <p>Visitas: {stats.visits}</p>
    </div>
  );
}
```

---

## 4. Variables de Entorno

```bash
# .env.local (NUNCA commitear)
DATABASE_URL=postgresql://...
JWT_SECRET=mi-secreto-super-seguro

# Variables públicas (prefijo NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=https://api.miempresa.com
NEXT_PUBLIC_APP_NAME=MiEmpresa

# .env.example (SÍ commitear - sin valores reales)
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=
```

```tsx
// Acceder a variables de entorno
// En el servidor: process.env.DATABASE_URL (disponible siempre)
// En el cliente: process.env.NEXT_PUBLIC_API_URL (solo NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## Checklist de Estructura

- [ ] Carpeta `app/` para rutas (App Router)
- [ ] Carpeta `components/` separada de las rutas
- [ ] Carpeta `lib/` para utilidades
- [ ] `.env.local` en `.gitignore`
- [ ] `.env.example` commiteado con claves vacías
- [ ] `middleware.ts` en la raíz del proyecto
