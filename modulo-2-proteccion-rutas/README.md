# Módulo 2: Protección de Rutas y Next.js Empresarial

## 📋 Descripción General

Este módulo cubre las estrategias de protección de rutas en aplicaciones React empresariales, el uso de Next.js como framework full-stack y la aplicación de Server-Side Rendering (SSR) para fortalecer la seguridad. Al finalizar, el estudiante será capaz de construir sistemas de autorización robustos, tanto en el cliente como en el servidor.

**Duración estimada:** 8 horas  
**Nivel:** Intermedio–Avanzado  
**Prerrequisitos:** Módulo 1 (Autenticación), conocimientos básicos de React y JavaScript ES6+

---

## 🎯 Objetivos de Aprendizaje

Al completar este módulo, el estudiante será capaz de:

1. **Implementar rutas privadas** en React con React Router v6 usando patrones modernos
2. **Aplicar control de acceso basado en roles (RBAC)** mediante renderizado condicional y HOCs
3. **Manejar estados no autorizados** (401/403) de forma elegante y segura
4. **Configurar Next.js** con App Router para proyectos empresariales
5. **Aprovechar SSR** para validar sesiones antes de servir contenido sensible
6. **Implementar Middleware** en Next.js para protección centralizada de rutas
7. **Gestionar integraciones con APIs** usando interceptores, manejo de errores y refresco de tokens

---

## 🗂 Estructura del Módulo

```
modulo-2-proteccion-rutas/
├── README.md                          ← Este archivo
└── teoria/
    ├── 2.1-proteccion-react/
    │   ├── README.md                  ← Teoría: Protección de rutas en React
    │   ├── ejercicios.md              ← Ejercicios prácticos
    │   └── ejemplos/
    │       ├── basico.md              ← PrivateRoute simple
    │       ├── intermedio.md          ← Protección basada en roles
    │       └── avanzado.md            ← Permisos multi-nivel con HOC
    ├── 2.2-nextjs-esencial/
    │   ├── README.md                  ← Teoría: Next.js esencial
    │   ├── ejercicios.md
    │   └── ejemplos/
    │       ├── basico.md              ← App Router básico
    │       ├── intermedio.md          ← Layouts anidados con auth
    │       └── avanzado.md            ← Server Components + auth
    ├── 2.3-ssr-seguridad/
    │   ├── README.md                  ← Teoría: SSR aplicado a seguridad
    │   ├── ejercicios.md
    │   └── ejemplos/
    │       ├── basico.md              ← Middleware básico
    │       ├── intermedio.md          ← Validación de sesión en servidor
    │       └── avanzado.md            ← Middleware avanzado con roles
    └── 2.4-integracion-api/
        ├── README.md                  ← Teoría: Integración con APIs empresariales
        ├── ejercicios.md
        └── ejemplos/
            ├── basico.md              ← Cliente HTTP básico
            ├── intermedio.md          ← Interceptores con Axios
            └── avanzado.md            ← Refresco de tokens + cola de peticiones
```

---

## 📚 Secciones del Módulo

### 2.1 — Protección de Rutas en React (2 horas)
Fundamentos de rutas privadas, renderizado condicional por rol, manejo de estados 401/403 y patrones con React Router v6.

| Tema | Duración |
|------|----------|
| Concepto de rutas privadas | 20 min |
| Implementación con React Router v6 | 30 min |
| Renderizado condicional por rol | 25 min |
| HOC para protección | 20 min |
| Manejo de 401/403 | 15 min |
| Buenas prácticas | 10 min |

---

### 2.2 — Next.js Esencial (2 horas)
Arquitectura de Next.js, App Router, layouts, Server vs Client Components y comparación con React Router.

| Tema | Duración |
|------|----------|
| Arquitectura de Next.js | 20 min |
| File-based routing (App Router) | 30 min |
| Layouts y layouts anidados | 25 min |
| Server Components vs Client Components | 30 min |
| Comparación con React Router | 15 min |

---

### 2.3 — SSR Aplicado a Seguridad (2 horas)
Concepto de SSR, validación de sesión en servidor, Next.js Middleware para autenticación.

| Tema | Duración |
|------|----------|
| SSR y beneficios para la seguridad | 20 min |
| Validación de sesión en servidor | 30 min |
| Next.js Middleware | 30 min |
| Implementación de `middleware.ts` | 25 min |
| Buenas prácticas SSR + Auth | 15 min |

---

### 2.4 — Integración con APIs Empresariales (2 horas)
Gestión estructurada de peticiones, manejo centralizado de errores, interceptores, Axios vs fetch, refresco de tokens.

| Tema | Duración |
|------|----------|
| Gestión estructurada de fetch | 20 min |
| Manejo centralizado de errores | 20 min |
| Interceptores de API | 25 min |
| Axios vs fetch: comparación | 20 min |
| Interceptores de refresco de token | 30 min |
| Buenas prácticas | 5 min |

---

## 🧪 Ejercicios y Evaluación

Cada sección incluye:

- **Ejercicios básicos:** Refuerzo de conceptos fundamentales
- **Ejercicios intermedios:** Aplicación en casos reales
- **Ejercicios avanzados:** Integración de múltiples conceptos

### Evaluación del Módulo
- Quiz teórico (20%)
- Proyecto práctico: Sistema de dashboard empresarial con roles (80%)
  - Implementar autenticación + protección de rutas
  - Integración con API real o mock
  - Middleware de Next.js funcional
  - Manejo de errores completo

---

## 🛠 Herramientas y Tecnologías

| Herramienta | Versión recomendada | Uso |
|-------------|---------------------|-----|
| React | 18+ | Framework base |
| React Router | v6.x | Enrutamiento SPA |
| Next.js | 14+ (App Router) | Framework full-stack |
| Axios | 1.x | Cliente HTTP |
| TypeScript | 5.x | Tipado estático |
| jose / jsonwebtoken | Latest | Validación JWT |

---

## 🔗 Recursos y Referencias

### Documentación Oficial
- [React Router v6 Docs](https://reactrouter.com/en/main)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Axios Docs](https://axios-http.com/docs/intro)

### Lecturas Recomendadas
- [OWASP Top 10 for Frontend](https://owasp.org/www-project-top-ten/)
- [Auth0 — React Security Best Practices](https://auth0.com/blog/react-security-best-practices/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

### Videos y Cursos Complementarios
- Next.js 14 Full Course — Vercel YouTube Channel
- React Router v6 Migration Guide

---

## ⚠️ Conceptos Clave de Seguridad

> **Defensa en profundidad:** La protección de rutas en el cliente (frontend) es UNA capa de seguridad, NO la única. Siempre debe existir validación en el servidor (API/backend).

> **Principio de mínimo privilegio:** Los usuarios solo deben acceder a los recursos que necesitan para su función.

> **Fail-safe defaults:** Por defecto, denegar acceso. Solo conceder acceso explícito cuando se cumplan todas las condiciones.

---

## 📝 Notas del Instructor

- Hacer énfasis en que la seguridad del frontend es una capa de UX, no la barrera principal de seguridad
- Demostrar cómo un usuario con DevTools puede saltar rutas privadas del cliente → importancia del servidor
- Mostrar la diferencia entre autenticación (¿quién eres?) y autorización (¿qué puedes hacer?)
- Usar ejemplos reales de empresas que han sufrido brechas por falta de validación en el servidor

---

*Módulo 2 | Curso: Seguridad en Frontend con React | Versión 1.0*
