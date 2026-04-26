# Ejercicios – Diseño Responsivo Empresarial

## Sección 3.3

---

## 🟢 Nivel Básico

### Ejercicio 1 – Hero Section Mobile-First
**Objetivo:** Crear una sección hero completamente responsiva.

**Instrucciones:**
1. Crea un componente `HeroSection` con:
   - Título que cambia de tamaño: `text-2xl` → `md:text-4xl` → `lg:text-6xl`
   - Subtítulo responsivo
   - Dos botones: apilados en móvil (`flex-col`), en fila en desktop (`sm:flex-row`)
2. Verifica en las DevTools de Chrome con emulación de dispositivos:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1280px)

---

### Ejercicio 2 – Grid de Tarjetas
**Objetivo:** Implementar un grid de tarjetas responsivo sin media queries personalizadas.

**Instrucciones:**
1. Crea un grid de 8 tarjetas de producto.
2. El grid debe mostrar:
   - 1 columna en móvil
   - 2 columnas en `sm` (640px)
   - 3 columnas en `lg` (1024px)
   - 4 columnas en `xl` (1280px)
3. Cada tarjeta debe tener imagen, título y precio.
4. Solo usar clases de Tailwind (sin CSS personalizado).

---

### Ejercicio 3 – Navbar con Menú Hamburguesa
**Objetivo:** Crear una navegación que colapsa en móvil.

**Instrucciones:**
1. Implementa un `Navbar` con 4 links de navegación.
2. En desktop (`md+`): links visibles horizontalmente.
3. En móvil: botón hamburguesa que muestra/oculta el menú.
4. El menú móvil debe cerrase al hacer click en un link.
5. Agrega `aria-expanded` y `aria-label` al botón hamburguesa.

---

## 🟡 Nivel Intermedio

### Ejercicio 4 – Layout Sidebar Empresarial
**Objetivo:** Implementar el layout típico de aplicaciones empresariales.

**Instrucciones:**
1. Crea `AppLayout` con sidebar fijo en desktop.
2. En móvil, el sidebar se oculta fuera de pantalla (`-translate-x-full`).
3. Un botón en el header abre/cierra el sidebar en móvil.
4. Un overlay oscuro aparece detrás del sidebar en móvil (click cierra el menú).
5. El sidebar nunca se muestra como overlay en desktop (`lg:relative`).

---

### Ejercicio 5 – Tabla Responsiva con Patrón Tarjeta
**Objetivo:** Crear una tabla que se convierte en tarjetas en móvil.

**Instrucciones:**
1. Crea `ResponsiveTable` genérico con `columns` y `data` como props.
2. En desktop (`md+`): tabla tradicional con cabeceras.
3. En móvil: cada fila se muestra como una tarjeta con `label: value`.
4. Incluye al menos 5 columnas y 6 filas de datos mock.
5. Una columna debe usar render personalizado (ej: badge de estado).

---

### Ejercicio 6 – Formulario de Dos Columnas
**Objetivo:** Crear un formulario adaptable mobile-first.

**Instrucciones:**
1. Crea un formulario de perfil con: nombre, apellido, email, teléfono, departamento, cargo.
2. En móvil: todos los campos en columna única.
3. En desktop (`md+`): grid de 2 columnas. El email ocupa las 2 columnas (`col-span-2`).
4. Los botones deben estar en orden inverso en móvil (primario abajo = más fácil acceso pulgar).
5. Todos los campos deben tener `label`, `id` vinculados para accesibilidad.

---

## 🔴 Nivel Avanzado

### Ejercicio 7 – Sistema de Variantes con CVA
**Objetivo:** Construir un componente Button con variantes tipadas.

**Instrucciones:**
1. Instala `class-variance-authority`.
2. Crea `Button` con variantes:
   - `variant`: `primary`, `secondary`, `danger`, `ghost`
   - `size`: `sm`, `md`, `lg`, `responsive` (cambia automáticamente con breakpoint)
   - `fullWidth`: boolean
3. Agrega prop `loading` con spinner y `aria-busy`.
4. El componente debe usar `forwardRef`.
5. Touch target mínimo `44px` siempre.

---

### Ejercicio 8 – Modal Completamente Accesible
**Objetivo:** Implementar un modal que cumpla los estándares WCAG 2.1 AA.

**Instrucciones:**
1. El modal debe tener `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
2. Al abrirse, mover el foco al primer elemento interactivo.
3. Implementar **focus trap** (Tab/Shift+Tab no sale del modal).
4. Cerrar con `Escape`.
5. Al cerrar, restaurar el foco al elemento que lo abrió.
6. Bloquear scroll del body mientras está abierto.
7. En móvil: sheet desde abajo. En desktop: centrado.

---

### Ejercicio 9 – Hook useBreakpoint + Renderizado Condicional
**Objetivo:** Crear renderizado adaptativo basado en el tamaño de pantalla.

**Instrucciones:**
1. Implementa `useBreakpoint()` usando `ResizeObserver`.
2. Crea un componente `AdaptiveLayout` que:
   - En móvil: muestra una vista de lista simple
   - En tablet: muestra una vista de grilla de 2 columnas
   - En desktop: muestra una vista de tabla completa
3. La transición entre vistas debe ser suave (sin parpadeo).
4. Evita usar `window.innerWidth` directamente (usar el hook).

---

### Ejercicio 10 – Auditoría de Accesibilidad
**Objetivo:** Auditar y corregir problemas de accesibilidad en una app existente.

**Instrucciones:**
1. Toma tu aplicación práctica del Módulo 3 (o cualquier componente).
2. Ejecuta una auditoría con **Lighthouse** (DevTools > Lighthouse > Accessibility).
3. Identifica al menos 5 problemas de accesibilidad.
4. Corrige cada problema documentando:
   - ¿Qué estaba mal?
   - ¿Por qué importa?
   - ¿Cómo lo corregiste?
5. Objetivo: score de Accessibility ≥ 90 en Lighthouse.

**Criterios de aceptación:**
- [ ] Lighthouse Accessibility ≥ 90
- [ ] Navegación completa con solo teclado
- [ ] Todos los inputs tienen label asociado
- [ ] Contraste mínimo 4.5:1 en texto
- [ ] Imágenes con `alt` descriptivo
