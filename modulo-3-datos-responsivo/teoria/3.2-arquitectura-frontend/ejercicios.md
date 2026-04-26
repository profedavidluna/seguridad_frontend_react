# Ejercicios – Arquitectura Frontend Empresarial

## Sección 3.2

---

## 🟢 Nivel Básico

### Ejercicio 1 – Crear Estructura Feature-First
**Objetivo:** Organizar un proyecto existente en arquitectura feature-first.

**Instrucciones:**
1. Dado el siguiente proyecto plano, reorganízalo en features:
```
src/
├── LoginForm.tsx
├── UserProfile.tsx
├── ProductList.tsx
├── authService.ts
├── userService.ts
├── productService.ts
└── App.tsx
```
2. Crea la nueva estructura de carpetas con un `index.ts` (barrel) para cada feature.
3. Actualiza las importaciones en `App.tsx` para usar los barrels.

**Estructura esperada:**
```
src/
├── features/
│   ├── auth/
│   ├── users/
│   └── products/
└── App.tsx
```

---

### Ejercicio 2 – Variables de Entorno Seguras
**Objetivo:** Configurar correctamente las variables de entorno en Next.js.

**Instrucciones:**
1. Crea un archivo `.env.example` con las siguientes claves (sin valores):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_APP_NAME`
2. Crea un `.env.local` con valores de prueba.
3. Verifica que `.env.local` esté en `.gitignore`.
4. En un componente, accede solo a `NEXT_PUBLIC_*` variables y explica por qué.

---

### Ejercicio 3 – Separar Cliente y Servidor
**Objetivo:** Identificar y separar correctamente los componentes de servidor y cliente.

**Instrucciones:**
1. Dado este componente mixto, sepáralo en Server Component + Client Component:
```tsx
// dashboard/page.tsx (actualmente todo en cliente)
'use client';
export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData);
  }, []);
  return <div>{data?.title}</div>;
}
```
2. El Server Component debe hacer el fetch directamente.
3. El Client Component solo debe manejar interactividad.

---

## 🟡 Nivel Intermedio

### Ejercicio 4 – Barrel Exports y Encapsulamiento
**Objetivo:** Implementar encapsulamiento de features con barrel exports.

**Instrucciones:**
1. Crea un feature `notifications` con:
   - `components/NotificationBell.tsx`
   - `components/NotificationList.tsx`
   - `hooks/useNotifications.ts`
   - `services/notificationService.ts`
   - `types/notification.types.ts`
   - `index.ts` (barrel que solo exporta `NotificationBell` y `useNotifications`)
2. Crea un segundo feature `dashboard` que importe desde el barrel de `notifications`.
3. Verifica que `NotificationList` y `notificationService` no sean accesibles directamente desde fuera.

---

### Ejercicio 5 – Service Layer con TypeScript
**Objetivo:** Implementar una capa de servicio tipada para un recurso empresarial.

**Instrucciones:**
1. Crea `features/reports/services/reportService.ts` con estos métodos:
   - `getReports(filters: ReportFilters): Promise<Report[]>`
   - `getReportById(id: string): Promise<Report>`
   - `generateReport(config: ReportConfig): Promise<Report>`
   - `downloadReport(id: string, format: 'pdf' | 'excel'): Promise<Blob>`
2. Define todas las interfaces necesarias en `types/report.types.ts`.
3. Crea un hook `useReports(filters)` que use el service.

---

### Ejercicio 6 – Providers Composition Pattern
**Objetivo:** Implementar el patrón de composición de providers.

**Instrucciones:**
1. Crea un `app/providers.tsx` que combine:
   - `AuthProvider` (Context API)
   - `ThemeProvider` (toggle dark/light)
   - `ToastProvider` (notificaciones)
2. Configura `QueryClient` con retry inteligente (no reintentar en 401/403).
3. Implementa lazy loading para el `AdminModule` en el router.
4. El `AdminModule` solo se carga si el usuario tiene rol `admin`.

---

## 🔴 Nivel Avanzado

### Ejercicio 7 – Server Actions con Validación
**Objetivo:** Implementar un Server Action seguro con validación Zod.

**Instrucciones:**
1. Crea un Server Action `updateProfileAction` que:
   - Valide el payload con Zod (`nombre`, `email`, `departamento`)
   - Verifique la sesión del usuario en el servidor
   - Actualice la base de datos (mock con un array)
   - Retorne errores de validación en formato `{ errors: {} }`
2. Crea el formulario cliente usando `useFormState` y `useFormStatus`.
3. Implementa `SubmitButton` que se deshabilita mientras `pending` es `true`.

---

### Ejercicio 8 – Optimistic Updates
**Objetivo:** Implementar actualizaciones optimistas con React Query.

**Instrucciones:**
1. Crea un hook `useToggleFavorite(itemId: string)`.
2. Al hacer click en "favorito", actualiza el estado inmediatamente (optimistic).
3. Si el servidor falla, revierte al estado anterior.
4. Siempre re-valida con el servidor después de la respuesta.
5. Muestra un toast de error si la operación falla.

---

### Ejercicio 9 – Error Boundaries por Feature
**Objetivo:** Implementar manejo de errores granular por feature.

**Instrucciones:**
1. Crea `FeatureErrorBoundary` como clase de React.
2. En `componentDidCatch`, enviar el error a un mock de Sentry.
3. El fallback debe mostrar el nombre del feature afectado.
4. Envuelve al menos 3 features diferentes con su propio `FeatureErrorBoundary`.
5. Prueba que un error en un feature no rompe los demás.

---

### Ejercicio 10 – Configurar Turborepo (Conceptual + Práctico)
**Objetivo:** Planificar y estructurar un monorepo empresarial.

**Instrucciones:**
1. Diseña la estructura de un monorepo para una empresa con:
   - App web principal (`apps/web`)
   - Panel de administración (`apps/admin`)
   - Librería de componentes compartidos (`packages/ui`)
   - Tipos compartidos (`packages/types`)
   - Configuración ESLint/TypeScript compartida (`packages/config`)
2. Crea el `turbo.json` con el pipeline de `build`, `test`, `lint` y `dev`.
3. Crea el `package.json` raíz con workspaces.
4. Explica en un comentario cómo `packages/ui` sería consumido por `apps/web` y `apps/admin`.

**Criterios de aceptación:**
- [ ] Estructura de carpetas creada
- [ ] `turbo.json` con pipeline válido
- [ ] Dependencias entre packages definidas correctamente
- [ ] Documentación de cómo escalar el monorepo
