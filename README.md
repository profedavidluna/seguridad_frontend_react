# 🔐 Frontend Empresarial Seguro con React y Next.js

> **Curso Profesional Avanzado** | 24 horas | Nivel SFIA 4 | En Español

---

## 📋 Descripción del Curso

Este curso de nivel profesional avanzado está diseñado para ingenieros de software que desean dominar la **seguridad en aplicaciones frontend empresariales** construidas con React y Next.js. Aborda desde los fundamentos de autenticación JWT hasta la implementación de arquitecturas de seguridad de grado empresarial, cumplimiento de estándares OWASP y despliegue seguro en producción.

El curso sigue el estándar **SFIA (Skills Framework for the Information Age) Nivel 4**, orientado a profesionales que trabajan en entornos corporativos de mediana y gran escala y que necesitan tomar decisiones técnicas fundamentadas en materia de seguridad frontend.

---

## 🎯 Objetivos de Aprendizaje

Al completar este curso, el estudiante será capaz de:

1. **Diseñar e implementar** sistemas de autenticación seguros basados en JWT con soporte de refresh tokens y revocación de sesiones.
2. **Aplicar estrategias de almacenamiento seguro** para tokens y datos sensibles en el navegador, evitando vectores de ataque XSS y CSRF.
3. **Identificar y mitigar** vulnerabilidades del Top 10 de OWASP aplicadas al contexto de aplicaciones frontend React.
4. **Proteger rutas y componentes** mediante autorización basada en roles (RBAC) y políticas de acceso granular.
5. **Integrar Next.js** con patrones de seguridad modernos: Middleware de autenticación, Server Components seguros, y API Routes protegidas.
6. **Auditar y fortalecer** aplicaciones React existentes contra amenazas de seguridad reales.
7. **Implementar Content Security Policy (CSP)**, cabeceras HTTP seguras y buenas prácticas de despliegue en producción.

---

## 📚 Estructura del Curso

```
seguridad_frontend_react/
├── README.md                          ← Este archivo
├── modulo-1-autenticacion/            ← Módulo 1 (8 horas)
│   ├── README.md
│   ├── teoria/
│   │   ├── 1.1-fundamentos-autenticacion/
│   │   ├── 1.2-almacenamiento-seguro/
│   │   ├── 1.3-vulnerabilidades/
│   │   └── 1.4-implementacion-practica/
│   └── proyecto/
├── modulo-2-autorizacion/             ← Módulo 2 (8 horas)
│   ├── README.md
│   ├── teoria/
│   │   ├── 2.1-rbac-frontend/
│   │   ├── 2.2-proteccion-rutas/
│   │   ├── 2.3-nextjs-middleware/
│   │   └── 2.4-server-components/
│   └── proyecto/
└── modulo-3-seguridad-avanzada/       ← Módulo 3 (8 horas)
    ├── README.md
    ├── teoria/
    │   ├── 3.1-csp-headers/
    │   ├── 3.2-auditoria/
    │   ├── 3.3-produccion/
    │   └── 3.4-testing-seguridad/
    └── proyecto/
```

---

## 📦 Módulos del Curso

### [Módulo 1: Autenticación Segura con JWT](./modulo-1-autenticacion/README.md)
**Duración:** 8 horas | **Dificultad:** Intermedio-Avanzado

Fundamentos y práctica avanzada de autenticación JWT en aplicaciones React empresariales. Cubre el ciclo de vida completo del token, almacenamiento seguro, vulnerabilidades comunes y patrones de implementación robustos.

**Secciones:**
- [1.1 Fundamentos de Autenticación](./modulo-1-autenticacion/teoria/1.1-fundamentos-autenticacion/README.md)
- [1.2 Almacenamiento Seguro de Tokens](./modulo-1-autenticacion/teoria/1.2-almacenamiento-seguro/README.md)
- [1.3 Vulnerabilidades Comunes](./modulo-1-autenticacion/teoria/1.3-vulnerabilidades/README.md)
- [1.4 Implementación Práctica](./modulo-1-autenticacion/teoria/1.4-implementacion-practica/README.md)

---

### [Módulo 2: Autorización y Control de Acceso](./modulo-2-autorizacion/README.md)
**Duración:** 8 horas | **Dificultad:** Avanzado

Control de acceso basado en roles (RBAC), protección de rutas en React Router y Next.js, y patrones avanzados de autorización para aplicaciones empresariales multi-tenant.

**Secciones:**
- 2.1 RBAC en el Frontend
- 2.2 Protección de Rutas con React Router
- 2.3 Next.js Middleware de Autenticación
- 2.4 Server Components y Seguridad

---

### [Módulo 3: Seguridad Avanzada y Producción](./modulo-3-seguridad-avanzada/README.md)
**Duración:** 8 horas | **Dificultad:** Avanzado-Experto

Content Security Policy, cabeceras HTTP seguras, auditoría de código, testing de seguridad y estrategias de despliegue seguro en entornos empresariales.

**Secciones:**
- 3.1 CSP y Cabeceras HTTP de Seguridad
- 3.2 Auditoría y Análisis de Vulnerabilidades
- 3.3 Despliegue Seguro en Producción
- 3.4 Testing de Seguridad Frontend

---

## ✅ Prerrequisitos

Para aprovechar al máximo este curso, el estudiante debe contar con:

| Conocimiento                          | Nivel Requerido |
|---------------------------------------|-----------------|
| React (Hooks, Context, Router)        | Avanzado        |
| JavaScript / TypeScript               | Avanzado        |
| HTTP / REST APIs                      | Intermedio      |
| Node.js básico                        | Básico          |
| Conceptos de seguridad web            | Básico          |
| Next.js (App Router)                  | Básico-Intermedio |

---

## 🛠️ Tecnologías Utilizadas

| Tecnología      | Versión  | Propósito                           |
|-----------------|----------|-------------------------------------|
| React           | 18+      | Framework UI principal              |
| Next.js         | 14+      | Framework full-stack con App Router |
| TypeScript      | 5+       | Tipado estático                     |
| jsonwebtoken    | 9+       | Generación/validación de JWT        |
| jose            | 5+       | JWT en Edge Runtime (Next.js)       |
| Axios           | 1.6+     | Cliente HTTP con interceptores      |
| React Query     | 5+       | Gestión de estado del servidor      |
| Zod             | 3+       | Validación de esquemas              |
| Tailwind CSS    | 3+       | Estilos utilitarios                 |

---

## 🚀 Cómo Ejecutar las Aplicaciones

Cada módulo contiene una aplicación demo independiente. Para ejecutar cualquiera de ellas:

```bash
# 1. Navegar al directorio del proyecto del módulo
cd modulo-1-autenticacion/proyecto

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# 4. Ejecutar en modo desarrollo
npm run dev

# 5. Abrir en el navegador
# http://localhost:3000
```

### Variables de Entorno Requeridas

```env
# JWT
JWT_SECRET=tu-secreto-super-seguro-aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Cookies
COOKIE_SECURE=false        # true en producción
COOKIE_SAME_SITE=lax
```

---

## 🗺️ Cómo Navegar el Curso

Cada sección del curso sigue esta estructura consistente:

```
seccion-X.Y-nombre/
├── README.md          ← Teoría detallada con diagramas y explicaciones
├── ejemplos/
│   ├── basico.md      ← Ejemplo de nivel básico con código
│   ├── intermedio.md  ← Ejemplo de nivel intermedio
│   └── avanzado.md    ← Ejemplo de nivel avanzado
└── ejercicios.md      ← Ejercicios prácticos con niveles y soluciones
```

**Ruta de aprendizaje recomendada:**
1. Leer el `README.md` de la sección para entender los conceptos
2. Estudiar los ejemplos en orden: básico → intermedio → avanzado
3. Completar los ejercicios de la sección
4. Avanzar a la siguiente sección

---

## 📖 Referencias y Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Lista oficial de vulnerabilidades web más críticas
- [JWT.io](https://jwt.io/) — Herramienta de decodificación y documentación de JWT
- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519) — Estándar oficial JWT
- [React Documentation](https://react.dev/) — Documentación oficial de React
- [Next.js Documentation](https://nextjs.org/docs) — Documentación oficial de Next.js
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — Guías de referencia rápida de seguridad

---

## 👨‍🏫 Nivel SFIA 4

Este curso está alineado con el nivel 4 del **Skills Framework for the Information Age (SFIA)**, que describe profesionales capaces de:

- Trabajar de forma autónoma bajo supervisión mínima
- Aplicar metodologías y estándares establecidos
- Contribuir a la revisión y mejora de procesos
- Guiar a otros en el uso de herramientas y técnicas
- Tomar decisiones técnicas en su área de especialización

---

*Curso desarrollado siguiendo los estándares OWASP, RFC 7519 y buenas prácticas de la industria para seguridad frontend empresarial.*
