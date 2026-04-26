# Módulo 1: Autenticación Segura con JWT

> **Duración:** 8 horas | **Nivel:** Intermedio-Avanzado | **SFIA Level 4**

---

## 🎯 Objetivos del Módulo

Al finalizar este módulo, el estudiante será capaz de:

1. Comprender el flujo completo de autenticación JWT en una arquitectura frontend/backend empresarial.
2. Diferenciar entre Access Tokens y Refresh Tokens, y gestionar su ciclo de vida correctamente.
3. Implementar estrategias de almacenamiento seguro para tokens en el navegador.
4. Identificar y mitigar las vulnerabilidades XSS y CSRF más comunes en aplicaciones React.
5. Construir un sistema de autenticación completo y seguro con React, incluyendo contexto, interceptores HTTP y renovación automática de tokens.

---

## 📚 Contenido del Módulo

| Sección | Tema                              | Duración | Nivel        |
|---------|-----------------------------------|----------|--------------|
| 1.1     | Fundamentos de Autenticación      | 2 horas  | Básico-Intermedio |
| 1.2     | Almacenamiento Seguro de Tokens   | 2 horas  | Intermedio   |
| 1.3     | Vulnerabilidades Comunes (XSS/CSRF) | 2 horas | Intermedio-Avanzado |
| 1.4     | Implementación Práctica           | 2 horas  | Avanzado     |

---

## 🗂️ Estructura de Archivos

```
modulo-1-autenticacion/
├── README.md                              ← Este archivo
├── teoria/
│   ├── 1.1-fundamentos-autenticacion/
│   │   ├── README.md                      ← Teoría JWT, flujos, claims
│   │   ├── ejemplos/
│   │   │   ├── basico.md                  ← Decodificación JWT simple
│   │   │   ├── intermedio.md              ← Creación y validación con roles
│   │   │   └── avanzado.md               ← Flujo completo con refresh tokens
│   │   └── ejercicios.md                  ← 10 ejercicios prácticos
│   ├── 1.2-almacenamiento-seguro/
│   │   ├── README.md                      ← httpOnly cookies, localStorage risks
│   │   ├── ejemplos/
│   │   │   ├── basico.md
│   │   │   ├── intermedio.md
│   │   │   └── avanzado.md
│   │   └── ejercicios.md
│   ├── 1.3-vulnerabilidades/
│   │   ├── README.md                      ← XSS, CSRF, OWASP Top 10
│   │   ├── ejemplos/
│   │   │   ├── basico.md
│   │   │   ├── intermedio.md
│   │   │   └── avanzado.md
│   │   └── ejercicios.md
│   └── 1.4-implementacion-practica/
│       ├── README.md                      ← Auth Context completo, interceptores
│       ├── ejemplos/
│       │   ├── basico.md
│       │   ├── intermedio.md
│       │   └── avanzado.md
│       └── ejercicios.md
└── proyecto/                              ← Aplicación demo del módulo
    ├── package.json
    ├── src/
    └── README.md
```

---

## 🔗 Navegación del Módulo

### [→ Sección 1.1: Fundamentos de Autenticación](./teoria/1.1-fundamentos-autenticacion/README.md)
Aprende qué es JWT, cómo se estructura, el ciclo de vida de los tokens y los estándares detrás de la autenticación moderna.

### [→ Sección 1.2: Almacenamiento Seguro de Tokens](./teoria/1.2-almacenamiento-seguro/README.md)
Compara localStorage, sessionStorage, cookies y memoria en RAM. Entiende por qué la elección del almacenamiento es crítica para la seguridad.

### [→ Sección 1.3: Vulnerabilidades Comunes](./teoria/1.3-vulnerabilidades/README.md)
Estudia los ataques XSS y CSRF en profundidad con ejemplos reales, y aprende las técnicas de mitigación aplicadas al contexto React.

### [→ Sección 1.4: Implementación Práctica](./teoria/1.4-implementacion-practica/README.md)
Construye un sistema de autenticación empresarial completo: contexto React, interceptores Axios, renovación de tokens y gestión de sesiones.

---

## ⚙️ Prerrequisitos Técnicos

Para trabajar con los ejemplos de este módulo necesitas tener instalado:

```bash
node --version   # >= 18.0.0
npm --version    # >= 9.0.0
```

Conceptos previos recomendados:
- React Hooks (`useState`, `useEffect`, `useContext`, `useCallback`)
- TypeScript básico (interfaces, tipos genéricos)
- Promesas y async/await
- Fundamentos de HTTP (cabeceras, cookies, códigos de estado)

---

## 📖 Referencias del Módulo

| Recurso | URL | Relevancia |
|---------|-----|------------|
| RFC 7519 - JSON Web Token | https://datatracker.ietf.org/doc/html/rfc7519 | Estándar oficial JWT |
| JWT.io Debugger | https://jwt.io/ | Herramienta de decodificación |
| OWASP Authentication Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | Mejores prácticas |
| OWASP Session Management | https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | Gestión de sesiones |
| OWASP JWT Security | https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html | JWT seguro |

---

*← [Volver al curso principal](../README.md) | Módulo 2: Autorización y RBAC →*
