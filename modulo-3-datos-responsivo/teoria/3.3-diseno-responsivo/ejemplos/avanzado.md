# Ejemplo Avanzado – Design System y Accesibilidad Empresarial

## Nivel: 🔴 Avanzado

---

## 1. Variantes de Componentes con CVA (class-variance-authority)

```tsx
// components/ui/Button.tsx
// npm install class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

const buttonVariants = cva(
  `inline-flex items-center justify-center font-medium rounded-lg
   transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
   focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
   min-h-[44px]`, // Accesibilidad: touch target mínimo WCAG
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        ghost: 'text-gray-600 hover:bg-gray-100',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 gap-1.5',
        md: 'text-sm px-4 py-2 gap-2',
        lg: 'text-base px-6 py-3 gap-2.5',
        responsive: 'text-xs px-3 py-1.5 md:text-sm md:px-4 md:py-2',
      },
      fullWidth: { true: 'w-full', false: 'w-auto' },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, fullWidth, loading, children, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, fullWidth })}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="animate-spin mr-2">⟳</span>}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

---

## 2. Modal Accesible con Focus Trap

```tsx
// components/Modal.tsx
'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Guardar elemento que tenía el foco antes de abrir
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus al primer elemento interactivo
    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus(); // Restaurar foco al cerrar
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={containerRef}
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md
                   max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
            aria-label="Cerrar modal"
          >✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
```

---

## 3. Skip Navigation y Accesibilidad de Teclado

```tsx
// components/SkipLink.tsx
// Permite a usuarios de teclado/lector de pantalla saltar al contenido
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
        focus:rounded-lg focus:shadow-lg focus:outline-none
      "
    >
      Ir al contenido principal
    </a>
  );
}

// En layout.tsx:
// <SkipLink />
// <Navbar />
// <main id="main-content" tabIndex={-1}>
//   {children}
// </main>
```

---

## 4. Container Queries (CSS Moderno)

```tsx
// components/ProductCard.tsx
// El componente se adapta a su CONTENEDOR, no al viewport
// npm install @tailwindcss/container-queries

export function ProductCard({ name, description, price, image }: ProductProps) {
  return (
    <div className="@container"> {/* Define el contenedor de referencia */}
      <div className="
        flex flex-col gap-3 p-4 bg-white rounded-lg shadow
        @sm:flex-row @sm:items-center    /* contenedor >= 384px */
        @lg:gap-6 @lg:p-6               /* contenedor >= 1024px */
      ">
        <img
          src={image} alt={name}
          className="w-full h-48 object-cover rounded @sm:w-24 @sm:h-24 @sm:flex-shrink-0"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 @lg:text-lg">{name}</h3>
          <p className="text-sm text-gray-500 @sm:line-clamp-2">{description}</p>
          <p className="text-blue-600 font-bold mt-2">${price}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Checklist de Calidad WCAG 2.1 AA

| Criterio | Requisito | Herramienta |
|----------|-----------|------------|
| Contraste texto | 4.5:1 normal, 3:1 grande | Axe, Lighthouse |
| Touch targets | Mínimo 44×44px | Chrome DevTools |
| Foco visible | Siempre visible | Prueba con Tab |
| Navegación teclado | Todo accesible | Prueba manual |
| Screen readers | Texto alt en imágenes | NVDA, VoiceOver |
| Skip links | Al inicio del documento | Prueba con Tab |
