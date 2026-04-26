# Ejemplo Avanzado 2.2 — Server Components con Autenticación y Datos Seguros

## Descripción

Implementación avanzada que aprovecha al máximo los Server Components para acceder a datos de forma segura, sin exponer secretos al cliente. Incluye Suspense con Streaming, React Cache para deduplicación de datos, y composición de componentes servidor/cliente.

---

## Concepto Clave: Server Components + Seguridad

```
Browser                   Next.js Server              Database/APIs
   │                            │                           │
   │── GET /dashboard ──────────►                           │
   │                            │── getServerSession() ────►│
   │                            │◄─ session válida ─────────│
   │                            │                           │
   │                            │── db.stats.findMany() ───►│
   │                            │◄─ stats data ─────────────│
   │                            │                           │
   │◄── HTML con datos ─────────│                           │
   │    (ya renderizado)        │                           │
   │                            │
   │ JavaScript mínimo al cliente (sin credenciales de DB)
```

---

## Código

### 1. React Cache para Deduplicación

```typescript
// src/lib/data.ts
import { cache } from 'react';
import { getServerSession } from './session';
import { db } from './database';

/**
 * cache() deduplica llamadas idénticas dentro del mismo request.
 * Si DashboardPage y Sidebar llaman a getSessionUser() en el mismo render,
 * solo se ejecuta UNA vez la consulta.
 */
export const getSessionUser = cache(async () => {
  const session = await getServerSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      avatar: true,
      roles: true,
      departamento: true,
    },
  });
});

export const getDashboardStats = cache(async (userId: string) => {
  const [
    totalUsuarios,
    reportesMes,
    facturacionMes,
    actividadReciente,
  ] = await Promise.all([
    db.user.count({ where: { activo: true } }),
    db.report.count({
      where: {
        autorId: userId,
        creadoEn: {
          gte: new Date(new Date().setDate(1)), // Primer día del mes
        },
      },
    }),
    db.invoice.aggregate({
      where: {
        estado: 'PAGADA',
        fechaPago: { gte: new Date(new Date().setDate(1)) },
      },
      _sum: { monto: true },
    }),
    db.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totalUsuarios,
    reportesMes,
    facturacionMes: facturacionMes._sum.monto || 0,
    actividadReciente,
  };
});

export const getReportes = cache(async (userId: string, userRoles: string[]) => {
  // Los admins ven todos los reportes; otros solo los suyos
  const where = userRoles.includes('ADMIN')
    ? {}
    : { autorId: userId };

  return db.report.findMany({
    where,
    include: {
      autor: { select: { nombre: true } },
    },
    orderBy: { creadoEn: 'desc' },
    take: 20,
  });
});
```

---

### 2. Página del Dashboard con Streaming

```tsx
// src/app/(app)/dashboard/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getSessionUser } from '@/lib/data';
import { StatsCards } from './components/StatsCards';
import { ActividadReciente } from './components/ActividadReciente';
import { ResumenFacturacion } from './components/ResumenFacturacion';
import {
  StatsCardsSkeleton,
  ActividadSkeleton,
  FacturacionSkeleton,
} from './components/Skeletons';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos días, {user.nombre} 👋
        </h1>
        <p className="text-gray-500">
          {user.departamento} · {user.roles.join(', ')}
        </p>
      </div>

      {/*
        Streaming: Los componentes dentro de Suspense se cargan
        independientemente. El usuario ve el esqueleto inmediatamente
        y cada sección aparece cuando sus datos están listos.
      */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards userId={user.id} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ActividadSkeleton />}>
          <ActividadReciente userId={user.id} />
        </Suspense>

        <Suspense fallback={<FacturacionSkeleton />}>
          <ResumenFacturacion
            userId={user.id}
            userRoles={user.roles}
          />
        </Suspense>
      </div>
    </div>
  );
}
```

---

### 3. Server Component con datos seguros

```tsx
// src/app/(app)/dashboard/components/StatsCards.tsx
// Este es un Server Component — puede consultar la DB directamente
import { getDashboardStats } from '@/lib/data';

interface Props {
  userId: string;
}

export async function StatsCards({ userId }: Props) {
  // Esta función llama a la DB con credenciales seguras del servidor
  const stats = await getDashboardStats(userId);

  const cards = [
    {
      titulo: 'Usuarios Activos',
      valor: stats.totalUsuarios.toString(),
      icono: '👥',
      color: 'blue',
    },
    {
      titulo: 'Reportes Este Mes',
      valor: stats.reportesMes.toString(),
      icono: '📊',
      color: 'green',
    },
    {
      titulo: 'Facturación del Mes',
      valor: `$${stats.facturacionMes.toLocaleString('es-MX')}`,
      icono: '💰',
      color: 'yellow',
    },
    {
      titulo: 'Actividad Reciente',
      valor: `${stats.actividadReciente.length} eventos`,
      icono: '📋',
      color: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(card => (
        <div
          key={card.titulo}
          className={`bg-white rounded-xl p-6 shadow-sm border-l-4 border-${card.color}-500`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.titulo}</p>
              <p className="text-2xl font-bold mt-1">{card.valor}</p>
            </div>
            <span className="text-3xl">{card.icono}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 4. Composición: Server + Client Components

```tsx
// src/app/(app)/reportes/page.tsx — Server Component
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser, getReportes } from '@/lib/data';
import { ReportesTable } from './components/ReportesTable'; // Client Component
import { ExportButton } from './components/ExportButton';   // Client Component

export default async function ReportesPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.roles.some(r => ['ADMIN', 'MANAGER'].includes(r))) {
    redirect('/unauthorized');
  }

  // Los datos se obtienen en el servidor y se pasan como props
  const reportes = await getReportes(user.id, user.roles);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reportes</h1>

        {/* Solo ADMIN puede exportar — verificado en servidor */}
        {user.roles.includes('ADMIN') && (
          <ExportButton reportes={reportes} />
        )}
      </div>

      {/* Client Component que recibe datos del servidor */}
      <ReportesTable
        reportes={reportes}
        canEdit={user.roles.includes('ADMIN')}
      />
    </div>
  );
}
```

```tsx
// src/app/(app)/reportes/components/ReportesTable.tsx
'use client'; // Necesita estado para filtros y ordenamiento

import { useState, useMemo } from 'react';

interface Reporte {
  id: string;
  titulo: string;
  autor: { nombre: string };
  creadoEn: Date;
  estado: 'BORRADOR' | 'PUBLICADO' | 'ARCHIVADO';
}

interface Props {
  reportes: Reporte[];
  canEdit: boolean;
}

export function ReportesTable({ reportes, canEdit }: Props) {
  const [filtro, setFiltro] = useState('');
  const [estado, setEstado] = useState<string>('TODOS');

  const reportesFiltrados = useMemo(() => {
    return reportes.filter(r => {
      const coincideFiltro = r.titulo.toLowerCase().includes(filtro.toLowerCase());
      const coincideEstado = estado === 'TODOS' || r.estado === estado;
      return coincideFiltro && coincideEstado;
    });
  }, [reportes, filtro, estado]);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Controles de filtrado — Client side */}
      <div className="p-4 border-b flex gap-4">
        <input
          type="search"
          placeholder="Buscar reporte..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={estado}
          onChange={e => setEstado(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="PUBLICADO">Publicado</option>
          <option value="ARCHIVADO">Archivado</option>
        </select>
      </div>

      {/* Tabla */}
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Título</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Autor</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fecha</th>
            {canEdit && (
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {reportesFiltrados.map(reporte => (
            <tr key={reporte.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{reporte.titulo}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{reporte.autor.nombre}</td>
              <td className="px-4 py-3">
                <EstadoBadge estado={reporte.estado} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(reporte.creadoEn).toLocaleDateString('es-MX')}
              </td>
              {canEdit && (
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline text-sm mr-2">
                    Editar
                  </button>
                  <button className="text-red-600 hover:underline text-sm">
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {reportesFiltrados.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron reportes
        </div>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles = {
    BORRADOR: 'bg-yellow-100 text-yellow-800',
    PUBLICADO: 'bg-green-100 text-green-800',
    ARCHIVADO: 'bg-gray-100 text-gray-800',
  }[estado] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles}`}>
      {estado}
    </span>
  );
}
```

---

### 5. Server Actions para mutaciones

```tsx
// src/app/(app)/perfil/actions.ts
'use server'; // Server Action — se ejecuta en el servidor

import { revalidatePath } from 'next/cache';
import { getServerSession } from '@/lib/session';
import { db } from '@/lib/database';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  nombre: z.string().min(2).max(100),
  telefono: z.string().regex(/^\+?[\d\s\-()]+$/).optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await getServerSession();

  if (!session) {
    return { error: 'No autenticado' };
  }

  const data = UpdateProfileSchema.safeParse({
    nombre: formData.get('nombre'),
    telefono: formData.get('telefono'),
  });

  if (!data.success) {
    return { error: 'Datos inválidos', fields: data.error.flatten().fieldErrors };
  }

  await db.user.update({
    where: { id: session.userId },
    data: data.data,
  });

  revalidatePath('/perfil');
  return { success: true };
}
```

---

## Resumen de Patrones Seguros

| Patrón | Descripción | Beneficio de Seguridad |
|--------|-------------|----------------------|
| `cache()` con Server Components | Deduplicar consultas seguras | Un solo acceso a DB por request |
| Streaming con Suspense | Cargar datos independientemente | Sesión verificada antes del primer byte |
| Props desde servidor → cliente | Pasar solo datos necesarios | Datos sensibles nunca llegan al cliente |
| Server Actions | Mutaciones en el servidor | CSRF automático, validación server-side |
| `redirect()` del servidor | Redirecciones de seguridad | No bypasseable desde el cliente |
