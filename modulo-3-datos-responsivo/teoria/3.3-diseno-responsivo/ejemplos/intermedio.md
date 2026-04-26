# Ejemplo Intermedio – Layouts Adaptativos y Componentes Responsivos

## Nivel: 🟡 Intermedio

---

## 1. Layout Sidebar + Contenido (Enterprise Pattern)

```tsx
// components/layout/AppLayout.tsx
'use client';
import { useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function AppLayout({ children, sidebar }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 transform transition-transform duration-300
          lg:relative lg:translate-x-0 lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Menú lateral"
      >
        {sidebar}
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white shadow-sm flex items-center gap-4 px-4 h-16 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <h1 className="font-semibold text-gray-800 truncate">Panel Empresarial</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 2. Tabla Responsiva (Patrón Tarjeta en Móvil)

```tsx
// components/ResponsiveTable.tsx
interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Vista tabla - md y superior */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className="px-4 py-3 text-left font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={String(row[keyField])} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-gray-700">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista tarjeta - solo móvil */}
      <div className="md:hidden flex flex-col gap-4">
        {data.map((row) => (
          <div key={String(row[keyField])} className="bg-white rounded-lg shadow p-4 space-y-2">
            {columns.map((col) => (
              <div key={String(col.key)} className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium uppercase">
                  {col.label}
                </span>
                <span className="text-sm text-gray-800">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

---

## 3. Hook useBreakpoint

```tsx
// hooks/useBreakpoint.ts
import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<Breakpoint, number> = {
  xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536,
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'xs';
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'lg'
  );

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setBreakpoint(getBreakpoint(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint),
    isAtLeast: (bp: Breakpoint) => breakpoints[breakpoint] >= breakpoints[bp],
  };
}
```

---

## 4. Formulario Responsivo Empresarial

```tsx
// Dos columnas en desktop, una en móvil
export function UserForm() {
  return (
    <form className="bg-white rounded-xl shadow p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Información de Usuario</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Nombre" name="firstName" type="text" required />
        <FormField label="Apellido" name="lastName" type="text" required />
        <FormField label="Email" name="email" type="email" className="md:col-span-2" required />
        <FormField label="Teléfono" name="phone" type="tel" />
        <FormField label="Departamento" name="department" type="text" />
      </div>

      {/* Botones: invertidos en móvil (Cancelar abajo), en fila en desktop */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="border px-4 py-2 rounded-lg">Cancelar</button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}

interface FormFieldProps {
  label: string; name: string; type: string; required?: boolean; className?: string;
}
function FormField({ label, name, type, required, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
```
