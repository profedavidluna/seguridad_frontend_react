# 3.3 — Diseño Responsivo Empresarial

> **Sección:** 3.3 de 4 | **Duración:** 2 horas | **Nivel:** Intermedio-Avanzado

---

## 🎯 Objetivos de Aprendizaje

Al completar esta sección, podrás:

- Aplicar la metodología **Mobile-First** de forma disciplinada
- Construir layouts adaptativos con **CSS Grid y Flexbox**
- Crear **componentes React responsivos** con hooks y Container Queries
- Usar **Tailwind CSS** de forma eficiente para diseño responsivo empresarial
- Definir una **estrategia coherente de breakpoints**
- Implementar principios básicos de **accesibilidad (a11y)** en interfaces responsivas
- Aplicar **patrones de UI empresarial** estándar de la industria

---

## 1. Filosofía Mobile-First

### 1.1 ¿Por qué Mobile-First?

```
DESKTOP-FIRST (tradicional):          MOBILE-FIRST (recomendada):
.componente {                          .componente {
  display: grid;                         /* Móvil primero: una columna */
  grid-template-columns:                 display: flex;
    repeat(3, 1fr);                      flex-direction: column;
  gap: 24px;                           }
}

@media (max-width: 768px) {            @media (min-width: 768px) {
  /* Sobrescribir para móvil */          .componente {
  .componente {                            /* Tablet: dos columnas */
    grid-template-columns: 1fr;            display: grid;
  }                                        grid-template-columns: 1fr 1fr;
}                                        }
                                       }
                                       
                                       @media (min-width: 1024px) {
                                         .componente {
                                           /* Desktop: tres columnas */
                                           grid-template-columns:
                                             repeat(3, 1fr);
                                         }
                                       }

Problemas:                             Ventajas:
- CSS más complejo (sobrescritura)     - CSS más limpio (adición progresiva)
- Más difícil de mantener              - Prioriza lo esencial
- Performance peor en móvil            - Performance móvil óptima
- Tendencia a ocultar en vez de        - Obliga a diseñar con restricciones
  adaptar                              - Aliado con Progressive Enhancement
```

### 1.2 Reglas del Mobile-First

```css
/* REGLA 1: Nunca usar max-width en media queries (Mobile-First) */
/* ❌ Desktop-first */
@media (max-width: 1024px) { ... }

/* ✅ Mobile-First */
@media (min-width: 1024px) { ... }

/* REGLA 2: El CSS base es para móvil */
.tarjeta {
  padding: 16px;        /* Móvil */
  font-size: 14px;      /* Móvil */
}

@media (min-width: 640px) {
  .tarjeta {
    padding: 24px;      /* Tablet */
    font-size: 16px;
  }
}

/* REGLA 3: Diseñar para touchscreen primero */
button, a {
  min-height: 44px;     /* Mínimo de Apple HIG para touch targets */
  min-width: 44px;
  padding: 12px 16px;
}
```

---

## 2. CSS Grid para Layouts Empresariales

### 2.1 Sistema de Grid para Dashboard

```css
/* styles/dashboard-layout.css */

/* Layout principal del dashboard */
.dashboard-layout {
  display: grid;
  grid-template-areas:
    "header"
    "main";
  grid-template-rows: auto 1fr;
  min-height: 100dvh; /* dvh: viewport height dinámica (mejor en móvil) */
}

/* Tablet y arriba: mostrar sidebar */
@media (min-width: 768px) {
  .dashboard-layout {
    grid-template-areas:
      "header  header"
      "sidebar main";
    grid-template-columns: 240px 1fr;
    grid-template-rows: 64px 1fr;
  }
}

/* Desktop amplio: sidebar más espacioso */
@media (min-width: 1280px) {
  .dashboard-layout {
    grid-template-columns: 280px 1fr;
  }
}

.dashboard-header  { grid-area: header; }
.dashboard-sidebar { grid-area: sidebar; }
.dashboard-main    { grid-area: main; }
```

### 2.2 Grid de Tarjetas Responsivo (Auto-fill)

```css
/* Grid que se adapta automáticamente sin media queries */
.cards-grid {
  display: grid;
  /* auto-fill: crea tantas columnas como quepan */
  /* minmax: mínimo 280px, máximo 1fr */
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: clamp(16px, 3vw, 32px); /* gap fluido con clamp */
}

/* Tarjeta que ocupa todo el ancho en algún punto */
.cards-grid .card--featured {
  grid-column: 1 / -1; /* Span completo */
}

/* En tablets: la featured ocupa solo 2 columnas si hay 3+ */
@media (min-width: 768px) {
  .cards-grid .card--featured {
    grid-column: span 2;
  }
}
```

### 2.3 Layout de Formulario con Grid

```css
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  /* Algunos campos ocupan todo el ancho */
  .form-grid .field--full {
    grid-column: 1 / -1;
  }
  
  /* Botones al final */
  .form-grid .form-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
```

---

## 3. Flexbox para Componentes Responsivos

### 3.1 Navigation Bar Responsiva

```css
/* Navbar que colapsa en móvil */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
}

.navbar-logo    { flex: 0 0 auto; }
.navbar-menu    { display: none; }    /* Oculto en móvil */
.navbar-toggle  { display: flex; }    /* Visible en móvil */

@media (min-width: 768px) {
  .navbar-menu {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .navbar-toggle { display: none; }
}

/* Menú móvil expandido */
.navbar-mobile-menu {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.navbar-mobile-menu a {
  padding: 12px 16px;
  min-height: 44px;
  display: flex;
  align-items: center;
}
```

### 3.2 Layout de Hero Responsivo

```css
.hero {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: clamp(32px, 8vw, 80px) clamp(16px, 5vw, 64px);
  text-align: center;
}

.hero-content { order: 2; }  /* Texto abajo en móvil */
.hero-image   { order: 1; }  /* Imagen arriba en móvil */

@media (min-width: 768px) {
  .hero {
    flex-direction: row;
    align-items: center;
    text-align: left;
  }

  .hero-content {
    order: 1;
    flex: 1;
  }

  .hero-image {
    order: 2;
    flex: 0 0 45%;
  }
}
```

---

## 4. Componentes React Responsivos

### 4.1 Hook useMediaQuery

```typescript
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

/**
 * Hook que observa un media query y retorna si coincide.
 * Se actualiza automáticamente al cambiar el viewport.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    // SSR-safe: en servidor siempre retorna false
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

// Hooks de breakpoint específicos (consistentes con Tailwind)
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

export function useBreakpoint(bp: keyof typeof breakpoints): boolean {
  return useMediaQuery(breakpoints[bp]);
}

// Uso:
// const isMobile = !useBreakpoint('md');
// const isDesktop = useBreakpoint('lg');
```

### 4.2 Container Queries en React

```tsx
// components/ui/ResponsiveCard.tsx
// Usa Container Queries (CSS moderno) para responder al contenedor, no al viewport

'use client';
import { useRef, useState, useEffect } from 'react';

interface ResponsiveCardProps {
  title: string;
  description: string;
  image?: string;
  actions?: React.ReactNode;
}

export function ResponsiveCard({ title, description, image, actions }: ResponsiveCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isWide = containerWidth > 400;

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-gray-200 overflow-hidden ${
        isWide ? 'flex flex-row' : 'flex flex-col'
      }`}
    >
      {image && (
        <img
          src={image}
          alt=""
          className={isWide ? 'w-48 object-cover' : 'w-full h-48 object-cover'}
        />
      )}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
        {actions && <div className="mt-auto pt-3">{actions}</div>}
      </div>
    </div>
  );
}
```

### 4.3 Componente de Tabla Responsiva

```tsx
// components/ui/ResponsiveTable.tsx
'use client';

interface Column<T> {
  key: keyof T;
  label: string;
  hideOnMobile?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Tabla para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(row => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas para móvil */}
      <div className="md:hidden space-y-3">
        {data.map(row => (
          <div key={keyExtractor(row)} className="bg-white rounded-lg border border-gray-200 p-4">
            {columns.map(col => (
              <div key={String(col.key)} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-xs font-medium text-gray-500 uppercase">{col.label}</span>
                <span className="text-sm text-gray-900">
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? '')}
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

## 5. Tailwind CSS para Diseño Responsivo Empresarial

### 5.1 Configuración de Tailwind Empresarial

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Breakpoints personalizados del design system empresarial
      screens: {
        'xs': '375px',   // iPhone SE y similares
        'sm': '640px',   // Móvil grande / Tablet pequeña
        'md': '768px',   // Tablet
        'lg': '1024px',  // Desktop pequeño / Tablet grande
        'xl': '1280px',  // Desktop estándar
        '2xl': '1536px', // Desktop amplio
        // Breakpoints para dispositivos específicos
        'print': { 'raw': 'print' },
        // Reducción de movimiento (accesibilidad)
        'motion-safe': { 'raw': '(prefers-reduced-motion: no-preference)' },
        'motion-reduce': { 'raw': '(prefers-reduced-motion: reduce)' },
        // Modo oscuro por preferencia del sistema
        'dark-mode': { 'raw': '(prefers-color-scheme: dark)' },
      },

      // Espaciado del design system
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
      },

      // Tipografía empresarial
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // Colores de marca
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};

export default config;
```

### 5.2 Patrones Responsivos con Tailwind

```tsx
// Navbar empresarial responsiva con Tailwind
function Navbar() {
  return (
    <nav className="
      fixed top-0 left-0 right-0 z-50
      flex items-center justify-between
      h-14 md:h-16
      px-4 md:px-6 lg:px-8
      bg-white border-b border-gray-200
      shadow-sm
    ">
      <Logo className="h-8 w-auto" />

      {/* Desktop navigation */}
      <div className="hidden md:flex items-center gap-1">
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/usuarios">Usuarios</NavLink>
        <NavLink href="/reportes">Reportes</NavLink>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell className="hidden sm:flex" />
        <UserMenu />
        {/* Mobile menu button */}
        <MobileMenuButton className="md:hidden" />
      </div>
    </nav>
  );
}

// Grid de métricas responsivo
function MetricsGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="
      grid gap-4
      grid-cols-1
      sm:grid-cols-2
      lg:grid-cols-4
    ">
      {metrics.map(metric => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}

// Formulario responsivo
function ProfileForm() {
  return (
    <form className="
      grid gap-4
      grid-cols-1 sm:grid-cols-2
    ">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre completo
        </label>
        <input
          type="text"
          className="
            w-full rounded-md border border-gray-300
            px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
          "
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input type="tel" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
        <button type="button" className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
          Guardar cambios
        </button>
      </div>
    </form>
  );
}
```

---

## 6. Estrategia de Breakpoints

### 6.1 Sistema Coherente de Puntos de Quiebre

```
BREAKPOINTS ESTÁNDAR RECOMENDADOS:

Device             Width      Breakpoint    Tailwind
──────────────────────────────────────────────────────
Móvil pequeño      < 375px    base          (base)
Móvil              375-639px  xs            xs:
Móvil grande       640-767px  sm            sm:
Tablet             768-1023px md            md:
Desktop pequeño    1024-1279px lg            lg:
Desktop estándar   1280-1535px xl            xl:
Desktop amplio     ≥ 1536px   2xl           2xl:

PATRONES DE USO:
- Sidebar: oculto en base/xs, visible en md+
- Columnas de grid: 1 en base, 2 en sm, 3+ en lg
- Tipografía: text-sm en base, text-base en md
- Padding: p-4 en base, p-6 en md, p-8 en xl
- Navigation: hamburger en base, horizontal en md
```

### 6.2 Tipografía Fluida

```css
/* Tipografía que escala suavemente entre breakpoints */
:root {
  /* clamp(mínimo, preferido, máximo) */
  --text-xs:   clamp(0.75rem,  0.7rem + 0.1vw,  0.875rem);
  --text-sm:   clamp(0.875rem, 0.8rem + 0.15vw, 1rem);
  --text-base: clamp(1rem,     0.95rem + 0.2vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem + 0.3vw,    1.25rem);
  --text-xl:   clamp(1.25rem,  1.1rem + 0.5vw,  1.5rem);
  --text-2xl:  clamp(1.5rem,   1.2rem + 0.75vw, 2rem);
  --text-3xl:  clamp(1.875rem, 1.4rem + 1vw,    2.25rem);
  --heading:   clamp(2rem,     1.5rem + 1.5vw,  3rem);
}

/* Espaciado fluido */
:root {
  --space-sm:  clamp(8px,  2vw, 16px);
  --space-md:  clamp(16px, 4vw, 32px);
  --space-lg:  clamp(24px, 6vw, 48px);
  --space-xl:  clamp(32px, 8vw, 64px);
}
```

---

## 7. Accesibilidad (a11y) en Diseño Responsivo

### 7.1 Principios WCAG 2.1 Básicos

```tsx
// ✅ Texto alternativo en imágenes
<img src="/foto-perfil.jpg" alt="Foto de perfil de María García" />
<img src="/decorativo.svg" alt="" role="presentation" />

// ✅ Contraste mínimo (ratio 4.5:1 para texto normal, 3:1 para texto grande)
// Usar herramienta: https://webaim.org/resources/contrastchecker/
<p className="text-gray-900 bg-white">  {/* ✅ Ratio 21:1 */}
<p className="text-gray-400 bg-white">  {/* ❌ Ratio ~3:1 — solo para texto grande */}

// ✅ Áreas de toque mínimas
<button className="min-h-[44px] min-w-[44px] p-3">
  Acción
</button>

// ✅ Etiquetas visibles en formularios (nunca solo placeholder)
<div>
  <label htmlFor="email">Correo electrónico</label>
  <input
    id="email"
    type="email"
    placeholder="ejemplo@dominio.com"  {/* Solo texto de ejemplo */}
    aria-required="true"
    aria-describedby="email-error"
  />
  <p id="email-error" role="alert" className="text-red-600 text-sm">
    {error}
  </p>
</div>
```

### 7.2 Navegación por Teclado

```tsx
// components/ui/FocusTrap.tsx — Atrapar el foco dentro de un modal
'use client';
import { useEffect, useRef } from 'react';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface FocusTrapProps {
  active: boolean;
  children: React.ReactNode;
}

export function FocusTrap({ active, children }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
}
```

### 7.3 ARIA Roles y Live Regions

```tsx
// ✅ Anuncios dinámicos para lectores de pantalla
function StatusAnnouncer() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"  {/* Visualmente oculto pero accesible */}
    >
      {/* Los cambios aquí se anuncian automáticamente */}
      {statusMessage}
    </div>
  );
}

// ✅ Roles ARIA correctos
<nav aria-label="Navegación principal">
<nav aria-label="Paginación">
<main>
<aside aria-label="Filtros">

// ✅ Describir el estado de elementos interactivos
<button
  aria-expanded={isMenuOpen}
  aria-controls="mobile-menu"
  aria-label="Abrir menú de navegación"
>
  <MenuIcon aria-hidden="true" />
</button>

<div id="mobile-menu" aria-hidden={!isMenuOpen}>
  {/* Contenido del menú */}
</div>
```

---

## 8. Patrones de UI Empresarial

### 8.1 Dashboard Layout Estándar

```tsx
// app/(dashboard)/layout.tsx
'use client';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64
        bg-white border-r border-gray-200
        transform transition-transform duration-300
        md:translate-x-0 md:static md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-6">
          <button
            className="md:hidden mr-3 p-2 rounded-md text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú lateral"
          >
            <MenuIcon />
          </button>
          <HeaderContent />
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>

        <footer className="text-center text-xs text-gray-400 py-4">
          © {new Date().getFullYear()} Empresa S.A.
        </footer>
      </div>
    </div>
  );
}
```

---

## 9. Buenas Prácticas — Resumen

| Práctica | Descripción | Impacto |
|---------|-------------|---------|
| **Mobile-First** | Escribir CSS base para móvil, agregar con min-width | Rendimiento + Mantenibilidad |
| **clamp() para tamaños fluidos** | Tipografía y espaciado que escala suavemente | UX mejorada |
| **44px mínimo para touch** | Áreas de tap accesibles en móvil | Accesibilidad |
| **Container Queries** | Responder al contenedor, no al viewport | Flexibilidad |
| **Tailwind responsivo** | Prefijos sm: md: lg: xl: consistentes | Velocidad |
| **Tablas → Cards en móvil** | Transformar tablas en tarjetas para móvil | UX móvil |
| **ARIA labels** | Describir todos los elementos interactivos | Accesibilidad |
| **Focus trapping** | Atrapar foco en modales y overlays | Accesibilidad |
| **Skip links** | Permitir saltar al contenido principal | Accesibilidad |
| **Alto contraste** | Ratio mínimo 4.5:1 para texto normal | Accesibilidad |

---

## 🔗 Referencias

- [MDN — CSS Grid](https://developer.mozilla.org/es/docs/Web/CSS/CSS_grid_layout)
- [MDN — Flexbox](https://developer.mozilla.org/es/docs/Web/CSS/CSS_flexible_box_layout)
- [Tailwind CSS — Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG 2.1 — Accesibilidad Web](https://www.w3.org/TR/WCAG21/)
- [MDN — ARIA Roles](https://developer.mozilla.org/es/docs/Web/Accessibility/ARIA/Roles)
- [Every Layout — CSS Layout Patterns](https://every-layout.dev/)
- [Smashing Magazine — Mobile-First CSS](https://www.smashingmagazine.com/2018/12/generic-css-mobile-first/)
