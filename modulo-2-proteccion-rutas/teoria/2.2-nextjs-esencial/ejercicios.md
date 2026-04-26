# Ejercicios — 2.2 Next.js Esencial

## Prerrequisitos

- Node.js 18+
- Conocimiento de React y TypeScript
- Completar la sección 2.1

## Configuración Inicial

```bash
npx create-next-app@latest ejercicios-nextjs \
  --typescript --tailwind --eslint --app --src-dir
cd ejercicios-nextjs
npm install jose zod
npm run dev
```

---

## 🟢 Ejercicio 1 — Estructura App Router

**Nivel:** Básico | **Tiempo:** 25 minutos

### Descripción

Crear la estructura de rutas para un portal empresarial con las siguientes páginas:

| URL | Descripción |
|-----|-------------|
| `/` | Página de bienvenida |
| `/login` | Formulario de login |
| `/dashboard` | Dashboard principal |
| `/dashboard/perfil` | Perfil del usuario |
| `/admin` | Panel de administración |
| `/admin/usuarios` | Gestión de usuarios |

### Requerimientos

1. Usar grupos de rutas `(public)` para páginas sin auth y `(private)` para páginas protegidas
2. Cada ruta debe tener su propio `page.tsx` con contenido mínimo (título `<h1>`)
3. La página raíz `/` debe tener un enlace a `/login`
4. Configurar metadata (`title`) para cada página

### Criterios de Aceptación

- [ ] Todas las URLs funcionan sin error 404
- [ ] Cada página muestra un `<h1>` con el nombre de la sección
- [ ] Los grupos de rutas `(public)` y `(private)` no aparecen en la URL
- [ ] Cada `page.tsx` tiene un `export const metadata`

---

## 🟢 Ejercicio 2 — Layouts Anidados

**Nivel:** Básico | **Tiempo:** 35 minutos

### Descripción

Implementar layouts diferenciados para las páginas de autenticación y el dashboard.

### Layout de Autenticación `(public)/layout.tsx`

- Diseño centrado verticalmente
- Logo de empresa en la parte superior
- Tarjeta blanca para el contenido

### Layout del Dashboard `(private)/layout.tsx`

- Sidebar izquierdo con navegación
- Topbar con nombre del usuario
- Área de contenido principal

### Requerimientos

1. El layout de autenticación solo aplica a `/login`
2. El layout del dashboard aplica a `/dashboard` y `/dashboard/perfil`
3. El sidebar del dashboard debe tener al menos 3 enlaces de navegación
4. Usar `Link` de `next/link` para la navegación (no `<a>`)

### Código base

```tsx
// src/app/(private)/layout.tsx
// Completa este layout:
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* TODO: Sidebar */}
      <main className="flex-1">
        {/* TODO: Topbar */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

### Criterios de Aceptación

- [ ] `/login` muestra el layout de autenticación (tarjeta centrada)
- [ ] `/dashboard` muestra el layout con sidebar
- [ ] La URL no contiene `(public)` ni `(private)`
- [ ] Los `Link` del sidebar navegan correctamente sin recargar la página

---

## 🟡 Ejercicio 3 — Server Components con Sesión

**Nivel:** Intermedio | **Tiempo:** 45 minutos

### Descripción

Implementar verificación de sesión real en el layout del dashboard usando Server Components y cookies.

### Requerimientos

1. Crear una API route `POST /api/auth/login` que establezca una cookie `session` (JSON con usuario)
2. El layout del dashboard debe leer la cookie con `cookies()` de `next/headers`
3. Si no hay cookie válida → `redirect('/login')`
4. El dashboard debe mostrar el nombre del usuario desde la sesión
5. Crear un botón de logout que llame a `DELETE /api/auth/logout` y limpie la cookie

### Variables de entorno

```env
# .env.local
JWT_SECRET=mi-secreto-super-seguro-desarrollo
```

### Pistas

<details>
<summary>💡 Leer cookie en Server Component</summary>

```tsx
import { cookies } from 'next/headers';

export default async function Layout({ children }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    redirect('/login');
  }

  const session = JSON.parse(sessionCookie.value);
  // usar session.nombre, session.email, etc.
}
```

</details>

<details>
<summary>💡 Establecer cookie en API Route</summary>

```typescript
// src/app/api/auth/login/route.ts
const response = NextResponse.json({ ok: true });
response.cookies.set('session', JSON.stringify(userData), {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 60 * 60 * 8,
});
return response;
```

</details>

### Criterios de Aceptación

- [ ] Acceder a `/dashboard` sin sesión redirige a `/login`
- [ ] Después del login, el dashboard muestra el nombre del usuario
- [ ] El botón de logout elimina la cookie y redirige a `/login`
- [ ] La cookie es `httpOnly` (no accesible desde JavaScript del cliente)
- [ ] Refrescar la página mantiene la sesión (persiste en cookie)

---

## 🟡 Ejercicio 4 — Server vs Client Components

**Nivel:** Intermedio | **Tiempo:** 40 minutos

### Descripción

Construir una página de estadísticas que combine Server Components (datos) con Client Components (interactividad). El objetivo es entender cuándo usar cada tipo.

### Página: `/dashboard/estadisticas`

Debe contener:

| Componente | Tipo | Razón |
|------------|------|-------|
| `StatsHeader` | Server | Muestra datos estáticos del servidor |
| `StatsGrid` | Server | Tarjetas con números (datos del servidor) |
| `FilterBar` | Client | Filtros interactivos con `useState` |
| `ChartContainer` | Client | Gráfico con datos dinámicos |

### Datos simulados (sin DB real)

```typescript
// src/lib/mockData.ts
export const STATS_DEMO = {
  usuarios: 1247,
  reportesMes: 89,
  ingresos: 284500,
  tickets: 23,
};

export const CHART_DATA = [
  { mes: 'Ene', valor: 4000 },
  { mes: 'Feb', valor: 3000 },
  { mes: 'Mar', valor: 5000 },
  { mes: 'Abr', valor: 4500 },
  { mes: 'May', valor: 6000 },
  { mes: 'Jun', valor: 5500 },
];
```

### Requerimientos

1. `StatsGrid` es un Server Component que lee `STATS_DEMO` directamente
2. `FilterBar` es un Client Component con un `select` para filtrar por período
3. `ChartContainer` recibe `data` como prop desde el Server Component padre
4. Ambos Client Components deben tener `'use client'` como primera línea
5. Los datos del gráfico deben responder al filtro seleccionado

### Pistas

<details>
<summary>💡 Pasar datos del servidor al cliente</summary>

```tsx
// Server Component (page.tsx)
import { CHART_DATA } from '@/lib/mockData';
import { InteractiveChart } from './InteractiveChart';

export default function StatsPage() {
  // Datos obtenidos en el servidor (podrían venir de DB)
  const data = CHART_DATA;

  return (
    <div>
      <StatsGrid /> {/* Server Component — sin props necesarios */}
      <InteractiveChart data={data} /> {/* Client Component — recibe datos del servidor */}
    </div>
  );
}
```

</details>

### Criterios de Aceptación

- [ ] `StatsGrid` NO tiene `'use client'` y NO usa `useState`/`useEffect`
- [ ] `ChartContainer` y `FilterBar` SÍ tienen `'use client'`
- [ ] Los datos del servidor llegan al cliente como props, no como fetch del cliente
- [ ] El filtro funciona sin recargar la página
- [ ] En las DevTools de React, los Server Components no aparecen en el árbol de componentes del cliente

---

## 🔴 Ejercicio 5 — Server Actions

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Implementar un formulario de actualización de perfil usando Server Actions. Sin JavaScript personalizado para el submit — usar el mecanismo nativo.

### Requerimientos

1. Crear un Server Action en `src/app/(private)/perfil/actions.ts`
2. El Action debe:
   - Verificar la sesión del usuario
   - Validar los datos con Zod
   - Simular actualización (console.log de los datos)
   - Llamar a `revalidatePath('/perfil')`
   - Retornar `{ success: true }` o `{ error: '...' }`
3. El formulario debe usar el Action directamente con `action={updateProfile}`
4. Mostrar estados de éxito y error
5. Usar `useFormState` y `useFormStatus` para estados del formulario

### Schema de validación

```typescript
import { z } from 'zod';

export const ProfileSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  telefono: z
    .string()
    .regex(/^\+?[\d\s\-()]+$/, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
});
```

### Pistas

<details>
<summary>💡 Server Action básico</summary>

```typescript
// src/app/(private)/perfil/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function updateProfile(prevState: any, formData: FormData) {
  // El primer parámetro es el estado previo (para useFormState)
  const nombre = formData.get('nombre') as string;

  // Validar y procesar...

  revalidatePath('/perfil');
  return { success: true };
}
```

</details>

<details>
<summary>💡 Usar useFormState en Client Component</summary>

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar Cambios'}
    </button>
  );
}

export function ProfileForm() {
  const [state, formAction] = useFormState(updateProfile, null);

  return (
    <form action={formAction}>
      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.success && <p className="text-green-600">¡Perfil actualizado!</p>}
      {/* campos */}
      <SubmitButton />
    </form>
  );
}
```

</details>

### Criterios de Aceptación

- [ ] El formulario funciona sin JavaScript del cliente (progressive enhancement)
- [ ] El Server Action valida con Zod y retorna errores por campo
- [ ] La UI muestra estado de carga durante el submit
- [ ] `revalidatePath` actualiza los datos mostrados sin recargar manualmente
- [ ] El Action verifica la sesión (si no hay sesión, retorna error)

---

## 🔴 Ejercicio 6 — Metadata Dinámica y SEO

**Nivel:** Avanzado | **Tiempo:** 30 minutos

### Descripción

Implementar metadata dinámica para rutas con parámetros. Una página de detalle de usuario `/admin/usuarios/[id]` debe generar metadata con el nombre real del usuario.

### Requerimientos

1. Crear la ruta `/admin/usuarios/[id]/page.tsx`
2. Exportar `generateMetadata` que obtenga el nombre del usuario (datos mock)
3. Exportar `generateStaticParams` con 3 IDs de ejemplo
4. La página debe verificar que el usuario exista (si no, llamar a `notFound()`)

### Código base para completar

```typescript
// src/app/admin/usuarios/[id]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// TODO: Importar datos mock de usuarios

interface Props {
  params: { id: string };
}

// TODO: Implementar generateMetadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Obtener usuario por ID
  // Si no existe, retornar metadata genérica
  // Si existe, retornar { title: `Usuario — ${usuario.nombre}` }
}

// TODO: Implementar generateStaticParams con 3 IDs demo
export async function generateStaticParams() {
  return [];
}

export default async function UsuarioDetallePage({ params }: Props) {
  // TODO: Obtener usuario, llamar notFound() si no existe
  return <div>Detalle del usuario {params.id}</div>;
}
```

### Criterios de Aceptación

- [ ] El `<title>` de la página muestra el nombre del usuario
- [ ] Si el ID no existe, se muestra la página 404 (no error 500)
- [ ] `generateStaticParams` retorna al menos 3 objetos `{ id: string }`
- [ ] La metadata se genera en el servidor (no en el cliente)

---

## Checklist del Módulo 2.2

- [ ] Ejercicio 1: Estructura App Router ✅
- [ ] Ejercicio 2: Layouts anidados ✅
- [ ] Ejercicio 3: Server Components con sesión ✅
- [ ] Ejercicio 4: Server vs Client Components ✅
- [ ] Ejercicio 5: Server Actions ✅
- [ ] Ejercicio 6: Metadata dinámica ✅

### Auto-evaluación

| Concepto | Nivel |
|----------|-------|
| Crear rutas con App Router | ⬜ Básico ⬜ Intermedio ⬜ Avanzado |
| Layouts anidados con grupos | ⬜ Básico ⬜ Intermedio ⬜ Avanzado |
| Verificar sesión en Server Component | ⬜ Básico ⬜ Intermedio ⬜ Avanzado |
| Diferenciar Server y Client Components | ⬜ Básico ⬜ Intermedio ⬜ Avanzado |
| Implementar Server Actions | ⬜ Básico ⬜ Intermedio ⬜ Avanzado |
| Metadata dinámica con `generateMetadata` | ⬜ Básico ⬜ Intermedio ⬜ Avanzado |
