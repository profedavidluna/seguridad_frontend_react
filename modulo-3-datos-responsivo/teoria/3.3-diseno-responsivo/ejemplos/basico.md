# Ejemplo Básico – Diseño Responsivo Empresarial

## Nivel: 🟢 Básico

### Objetivo
Aprender los fundamentos de diseño mobile-first y componentes responsivos en React.

---

## 1. Principio Mobile-First con Tailwind CSS

```tsx
// components/HeroSection.tsx
// Mobile-first: estilos base = móvil, luego escalar hacia arriba

export function HeroSection() {
  return (
    <section className="
      px-4 py-8
      md:px-8 md:py-16
      lg:px-16 lg:py-24
    ">
      <h1 className="
        text-2xl
        md:text-4xl
        lg:text-6xl
        font-bold text-gray-900
      ">
        Bienvenido al Sistema
      </h1>

      <p className="
        text-sm mt-4
        md:text-base md:mt-6
        lg:text-lg lg:mt-8
        text-gray-600 max-w-2xl
      ">
        Plataforma empresarial segura de gestión de recursos.
      </p>

      {/* En móvil: botones apilados. En desktop: en fila */}
      <div className="flex flex-col gap-3 mt-6 sm:flex-row">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium">
          Iniciar Sesión
        </button>
        <button className="border border-gray-300 px-6 py-3 rounded-lg font-medium">
          Ver Demo
        </button>
      </div>
    </section>
  );
}
```

---

## 2. Grid Responsivo para Dashboard

```tsx
// components/DashboardGrid.tsx

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

const stats: StatCard[] = [
  { title: 'Usuarios Activos', value: '1,234', icon: '👥', color: 'blue' },
  { title: 'Ventas Hoy', value: '$45,678', icon: '💰', color: 'green' },
  { title: 'Tickets Abiertos', value: 23, icon: '🎫', color: 'yellow' },
  { title: 'Uptime', value: '99.9%', icon: '⚡', color: 'purple' },
];

export function DashboardGrid() {
  return (
    <div className="
      grid grid-cols-1 gap-4
      sm:grid-cols-2
      lg:grid-cols-4
    ">
      {stats.map((stat) => (
        <StatCardItem key={stat.title} {...stat} />
      ))}
    </div>
  );
}

function StatCardItem({ title, value, icon, color }: StatCard) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorMap[color]} flex items-center gap-4`}>
      <span className="text-3xl" role="img" aria-label={title}>{icon}</span>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
```

---

## 3. Navbar Responsivo con Menú Hamburguesa

```tsx
// components/Navbar.tsx
'use client';
import { useState } from 'react';

const navLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Usuarios', href: '/usuarios' },
  { label: 'Reportes', href: '/reportes' },
  { label: 'Configuración', href: '/configuracion' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <span className="font-bold text-lg">MiEmpresa</span>

        {/* Links - ocultos en móvil */}
        <ul className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="hover:text-blue-300 transition-colors">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Botón hamburguesa - solo en móvil */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <ul className="md:hidden bg-gray-800 px-4 pb-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="block py-2 hover:text-blue-300"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
```

---

## 4. Breakpoints de Tailwind – Referencia

| Prefijo | Tamaño mínimo | Dispositivo típico |
|---------|---------------|-------------------|
| (none)  | 0px           | Móvil (default)   |
| `sm:`   | 640px         | Móvil grande      |
| `md:`   | 768px         | Tablet            |
| `lg:`   | 1024px        | Laptop            |
| `xl:`   | 1280px        | Desktop           |
| `2xl:`  | 1536px        | Pantalla grande   |

```tsx
// ✅ BIEN: base=móvil, escalar hacia arriba
<div className="text-sm md:text-base lg:text-lg">

// ❌ MAL: pensar en desktop primero
<div className="text-lg lg:text-lg md:text-base sm:text-sm">
```

---

## Checklist de Responsive Design

- [ ] Todos los layouts usan mobile-first
- [ ] `flex-col` en móvil, `flex-row` en desktop
- [ ] Imágenes con `max-w-full` y `h-auto`
- [ ] Touch targets mínimo 44x44px
- [ ] Texto legible sin hacer zoom (mínimo 16px en móvil)
