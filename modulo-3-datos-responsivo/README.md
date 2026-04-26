# Módulo 3: Gestión Responsable de Datos y Diseño Responsivo Profesional

> **Curso:** Seguridad Frontend en React — Nivel Empresarial  
> **Duración:** 8 horas  
> **Nivel:** Intermedio - Avanzado  
> **Prerrequisitos:** Módulo 1 (Autenticación) y Módulo 2 (Protección de Rutas)

---

## 🎯 Objetivos del Módulo

Al finalizar este módulo, el estudiante será capaz de:

1. **Identificar y proteger datos sensibles** en aplicaciones React/Next.js empresariales
2. **Implementar patrones de enmascaramiento** y protección visual de información confidencial
3. **Diseñar arquitecturas frontend escalables** con separación cliente-servidor adecuada
4. **Construir interfaces responsivas profesionales** usando Mobile-First, CSS Grid, Flexbox y Tailwind CSS
5. **Gestionar estados críticos de UX** (carga, error, éxito) de forma segura y accesible
6. **Aplicar principios de accesibilidad (a11y)** en aplicaciones autenticadas

---

## 📚 Contenido del Módulo

### 📂 Sección 3.1 — Manejo Responsable de Datos Sensibles
**Duración estimada:** 2 horas

| Tema | Descripción |
|------|-------------|
| Qué NO exponer en el frontend | Tokens, contraseñas, PII, secretos de API |
| Protección visual de datos | Enmascaramiento, asteriscos, ocultamiento progresivo |
| Cifrado en tránsito | HTTPS, TLS, cabeceras de seguridad |
| Sanitización de inputs | Prevención de XSS, validación del lado cliente |
| Seguridad en formularios | CSRF, autocomplete, gestión de campos sensibles |
| Patrones de prevención | Data exposure prevention patterns empresariales |

**Archivos:**
- [`teoria/3.1-manejo-datos-sensibles/README.md`](./teoria/3.1-manejo-datos-sensibles/README.md) — Teoría completa
- [`teoria/3.1-manejo-datos-sensibles/ejemplos/basico.md`](./teoria/3.1-manejo-datos-sensibles/ejemplos/basico.md) — Enmascaramiento simple
- [`teoria/3.1-manejo-datos-sensibles/ejemplos/intermedio.md`](./teoria/3.1-manejo-datos-sensibles/ejemplos/intermedio.md) — Protección de formularios
- [`teoria/3.1-manejo-datos-sensibles/ejemplos/avanzado.md`](./teoria/3.1-manejo-datos-sensibles/ejemplos/avanzado.md) — Capa de protección con auditoría
- [`teoria/3.1-manejo-datos-sensibles/ejercicios.md`](./teoria/3.1-manejo-datos-sensibles/ejercicios.md) — 10 ejercicios prácticos

---

### 📂 Sección 3.2 — Arquitectura Frontend Empresarial
**Duración estimada:** 2 horas

| Tema | Descripción |
|------|-------------|
| Organización de proyectos Next.js | Estructura de carpetas escalable |
| Separación Cliente-Servidor | Patrones con App Router de Next.js |
| Arquitectura basada en features | Feature-first vs Layer-first |
| Monorepos | Turborepo, Nx y organizaciones grandes |
| Code splitting y lazy loading | Rendimiento y seguridad combinados |

**Archivos:**
- [`teoria/3.2-arquitectura-frontend/README.md`](./teoria/3.2-arquitectura-frontend/README.md) — Teoría completa
- [`teoria/3.2-arquitectura-frontend/ejemplos/basico.md`](./teoria/3.2-arquitectura-frontend/ejemplos/basico.md)
- [`teoria/3.2-arquitectura-frontend/ejemplos/intermedio.md`](./teoria/3.2-arquitectura-frontend/ejemplos/intermedio.md)
- [`teoria/3.2-arquitectura-frontend/ejemplos/avanzado.md`](./teoria/3.2-arquitectura-frontend/ejemplos/avanzado.md)
- [`teoria/3.2-arquitectura-frontend/ejercicios.md`](./teoria/3.2-arquitectura-frontend/ejercicios.md)

---

### 📂 Sección 3.3 — Diseño Responsivo Empresarial
**Duración estimada:** 2 horas

| Tema | Descripción |
|------|-------------|
| Mobile-First | Metodología y filosofía |
| CSS Grid y Flexbox | Layouts adaptativos modernos |
| Componentes responsivos en React | Hooks, Container Queries |
| Tailwind CSS | Utilidades responsivas empresariales |
| Estrategia de Breakpoints | Sistema coherente de puntos de quiebre |
| Accesibilidad básica (a11y) | WCAG 2.1, ARIA, navegación por teclado |

**Archivos:**
- [`teoria/3.3-diseno-responsivo/README.md`](./teoria/3.3-diseno-responsivo/README.md)
- [`teoria/3.3-diseno-responsivo/ejemplos/basico.md`](./teoria/3.3-diseno-responsivo/ejemplos/basico.md)
- [`teoria/3.3-diseno-responsivo/ejemplos/intermedio.md`](./teoria/3.3-diseno-responsivo/ejemplos/intermedio.md)
- [`teoria/3.3-diseno-responsivo/ejemplos/avanzado.md`](./teoria/3.3-diseno-responsivo/ejemplos/avanzado.md)
- [`teoria/3.3-diseno-responsivo/ejercicios.md`](./teoria/3.3-diseno-responsivo/ejercicios.md)

---

### 📂 Sección 3.4 — UX en Aplicaciones Autenticadas
**Duración estimada:** 2 horas

| Tema | Descripción |
|------|-------------|
| Gestión de estados críticos | Loading, error, success, empty |
| Feedback seguro | No exponer detalles internos en errores |
| Manejo profesional de 401/403 | Redirección, mensajes, flujos de recuperación |
| UX de expiración de sesión | Alertas, contadores, renovación silenciosa |
| Notificaciones Toast seguras | Qué mostrar y qué ocultar |
| Skeleton Screens | Carga optimista y esqueletos de UI |

**Archivos:**
- [`teoria/3.4-ux-aplicaciones-autenticadas/README.md`](./teoria/3.4-ux-aplicaciones-autenticadas/README.md)
- [`teoria/3.4-ux-aplicaciones-autenticadas/ejemplos/basico.md`](./teoria/3.4-ux-aplicaciones-autenticadas/ejemplos/basico.md)
- [`teoria/3.4-ux-aplicaciones-autenticadas/ejemplos/intermedio.md`](./teoria/3.4-ux-aplicaciones-autenticadas/ejemplos/intermedio.md)
- [`teoria/3.4-ux-aplicaciones-autenticadas/ejemplos/avanzado.md`](./teoria/3.4-ux-aplicaciones-autenticadas/ejemplos/avanzado.md)
- [`teoria/3.4-ux-aplicaciones-autenticadas/ejercicios.md`](./teoria/3.4-ux-aplicaciones-autenticadas/ejercicios.md)

---

## ⚡ Guía de Inicio Rápido

```bash
# Instalar dependencias del módulo
npm install

# Ejecutar el proyecto de ejemplo
npm run dev

# Ejecutar tests de seguridad
npm run test:security
```

---

## 🗺️ Mapa de Aprendizaje

```
Módulo 1: Autenticación
        ↓
Módulo 2: Protección de Rutas
        ↓
┌─────────────────────────────────────────────┐
│         MÓDULO 3 (este módulo)              │
│                                             │
│  3.1 Datos Sensibles ──→ 3.2 Arquitectura  │
│           ↓                     ↓           │
│  3.3 Responsivo    ──→ 3.4 UX Segura       │
└─────────────────────────────────────────────┘
        ↓
Módulo 4: Testing de Seguridad (próximamente)
```

---

## 🏆 Evaluación

| Componente | Peso | Descripción |
|-----------|------|-------------|
| Ejercicios prácticos | 40% | 10 ejercicios por sección |
| Proyecto integrador | 40% | Dashboard empresarial completo |
| Quiz teórico | 20% | Conceptos de seguridad y arquitectura |

**Criterios de aprobación:** 70% mínimo en cada componente

---

## 🔗 Referencias Oficiales

- [OWASP Top 10 — A02: Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [OWASP Top 10 — A03: Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [Next.js — App Router Documentation](https://nextjs.org/docs/app)
- [MDN — HTTPS y TLS](https://developer.mozilla.org/es/docs/Glossary/HTTPS)
- [WCAG 2.1 — Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG21/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React — Lazy Loading](https://react.dev/reference/react/lazy)

---

> 💡 **Consejo del instructor:** Los temas de este módulo son interdependientes. Una buena arquitectura facilita la protección de datos; un diseño responsivo accesible mejora la UX de seguridad. Abórdelos de forma integrada.
