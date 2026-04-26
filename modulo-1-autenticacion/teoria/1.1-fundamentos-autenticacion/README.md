# 1.1 Fundamentos de Autenticación con JWT

> **Sección:** 1.1 | **Duración:** 2 horas | **Nivel:** Básico-Intermedio

---

## 📖 Introducción

La **autenticación** es el proceso de verificar la identidad de un usuario o sistema. En aplicaciones web modernas, la autenticación basada en **JSON Web Tokens (JWT)** se ha convertido en el estándar de facto para sistemas distribuidos, APIs REST y aplicaciones de una sola página (SPA).

A diferencia de las sesiones tradicionales basadas en cookies del lado del servidor, JWT permite una arquitectura **stateless** (sin estado), donde el servidor no necesita mantener un registro de sesiones activas. Toda la información necesaria para verificar la identidad del usuario está contenida dentro del propio token.

---

## 🏛️ ¿Qué es un JSON Web Token (JWT)?

Un JWT es un estándar abierto definido en el [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) que define una forma compacta y autocontenida de transmitir información de forma segura entre partes como un objeto JSON. Esta información puede ser verificada y confiada porque está **firmada digitalmente**.

Los JWT pueden ser firmados usando:
- **HMAC** con un secreto compartido (algoritmo `HS256`, `HS384`, `HS512`)
- **RSA** o **ECDSA** con par de claves pública/privada (algoritmo `RS256`, `ES256`)

---

## 🔍 Estructura de un JWT

Un JWT tiene exactamente **tres partes** separadas por puntos (`.`):

```
xxxxx.yyyyy.zzzzz
```

Ejemplo real de un JWT:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Parte 1: Header (Cabecera)

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

- `alg`: Algoritmo de firma usado
- `typ`: Tipo de token (siempre "JWT")

Este objeto se codifica en **Base64URL** para formar la primera parte del JWT.

### Parte 2: Payload (Carga útil)

```json
{
  "sub": "1234567890",
  "name": "Juan García",
  "email": "juan@empresa.com",
  "roles": ["admin", "user"],
  "iat": 1516239022,
  "exp": 1516242622,
  "iss": "https://auth.empresa.com",
  "aud": "https://api.empresa.com"
}
```

El payload contiene los **claims** (afirmaciones) sobre el usuario y metadatos del token.

### Parte 3: Signature (Firma)

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

La firma garantiza que el token no ha sido **manipulado** y que proviene de una fuente confiable.

---

## 📦 Claims Estándar (Registered Claims)

El RFC 7519 define un conjunto de claims estándar recomendados:

| Claim | Nombre         | Descripción                                      | Ejemplo                        |
|-------|----------------|--------------------------------------------------|--------------------------------|
| `iss` | Issuer         | Quién emitió el token                            | `"https://auth.empresa.com"`   |
| `sub` | Subject        | Identificador del sujeto (usuario)               | `"usr_abc123"`                 |
| `aud` | Audience       | Para quién está destinado el token               | `"https://api.empresa.com"`    |
| `exp` | Expiration     | Timestamp Unix de expiración (en segundos)       | `1716239022`                   |
| `nbf` | Not Before     | El token no es válido antes de esta fecha        | `1716235422`                   |
| `iat` | Issued At      | Timestamp Unix de creación del token             | `1716235422`                   |
| `jti` | JWT ID         | Identificador único del token (para revocación)  | `"token_xyz789"`               |

### Claims Personalizados (Custom Claims)

Además de los claims estándar, puedes agregar claims personalizados para tu aplicación:

```json
{
  "sub": "usr_abc123",
  "email": "juan@empresa.com",
  "roles": ["admin", "editor"],
  "permissions": ["read:users", "write:articles", "delete:comments"],
  "tenant_id": "empresa_acme",
  "department": "engineering",
  "exp": 1716239022
}
```

> ⚠️ **Importante:** El payload de un JWT es solo **codificado en Base64URL**, NO encriptado. Cualquier persona con acceso al token puede leer su contenido. Nunca incluyas información sensible (contraseñas, datos de tarjetas de crédito, etc.) en el payload.

---

## 🔄 Access Token vs. Refresh Token

En un sistema de autenticación robusto se utilizan dos tipos de tokens con propósitos distintos:

### Access Token

```
┌─────────────────────────────────────────────────────────┐
│                     ACCESS TOKEN                        │
├─────────────────────────────────────────────────────────┤
│ ✅ Propósito: Autorizar solicitudes a la API            │
│ ⏱️  Vida útil: Corta (5-30 minutos)                     │
│ 📦 Almacenamiento: Memoria RAM (preferido)              │
│ 🔑 Contiene: User ID, roles, permisos                   │
│ 🚀 Uso: Se envía en cada request a la API              │
│ 🔒 Riesgo si se roba: Alto pero limitado por expiración │
└─────────────────────────────────────────────────────────┘
```

### Refresh Token

```
┌─────────────────────────────────────────────────────────┐
│                    REFRESH TOKEN                        │
├─────────────────────────────────────────────────────────┤
│ ✅ Propósito: Obtener nuevos access tokens              │
│ ⏱️  Vida útil: Larga (7-30 días)                        │
│ 📦 Almacenamiento: httpOnly cookie (seguro)             │
│ 🔑 Contiene: Solo el identificador de sesión            │
│ 🚀 Uso: Solo se usa al renovar el access token          │
│ 🔒 Riesgo si se roba: Muy alto (sesión completa)       │
└─────────────────────────────────────────────────────────┘
```

### Comparación Detallada

| Característica        | Access Token          | Refresh Token              |
|-----------------------|-----------------------|----------------------------|
| Duración              | 5–30 minutos          | 7–30 días                  |
| Almacenamiento ideal  | Memoria (variable JS) | httpOnly Cookie             |
| Frecuencia de uso     | Cada request API      | Solo al renovar             |
| Información contenida | Roles, permisos       | Solo session ID             |
| Revocable             | No (espera expiración)| Sí (en base de datos)       |
| Enviado automático    | No (manual)           | Sí (por el navegador)       |
| Riesgo XSS            | Moderado si en RAM    | Bajo si es httpOnly cookie  |
| Riesgo CSRF           | Bajo (manual)         | Moderado (mitigar con CSRF token) |

---

## 🔄 Flujo de Autenticación Completo

### Diagrama: Login Inicial

```
Usuario          Frontend               Backend Auth           Base de Datos
   │                 │                        │                      │
   │  1. Credenciales│                        │                      │
   │────────────────>│                        │                      │
   │                 │  2. POST /auth/login   │                      │
   │                 │  {email, password}     │                      │
   │                 │───────────────────────>│                      │
   │                 │                        │  3. Buscar usuario   │
   │                 │                        │─────────────────────>│
   │                 │                        │  4. Usuario + hash   │
   │                 │                        │<─────────────────────│
   │                 │                        │  5. Verificar bcrypt │
   │                 │                        │  6. Generar tokens   │
   │                 │  7. {accessToken}      │                      │
   │                 │  + Set-Cookie:         │                      │
   │                 │  refreshToken (httpOnly)│                     │
   │                 │<───────────────────────│                      │
   │                 │  8. Guardar accessToken│                      │
   │                 │  en memoria (variable) │                      │
   │  9. ✅ Login OK │                        │                      │
   │<────────────────│                        │                      │
```

### Diagrama: Request Autenticado

```
Usuario          Frontend               Backend API
   │                 │                        │
   │  1. Acción      │                        │
   │────────────────>│                        │
   │                 │  2. GET /api/data      │
   │                 │  Authorization:        │
   │                 │  Bearer <accessToken>  │
   │                 │───────────────────────>│
   │                 │                        │  3. Verificar JWT
   │                 │                        │  - Firma válida?
   │                 │                        │  - ¿Expirado?
   │                 │                        │  - ¿Permisos OK?
   │                 │  4. 200 OK + datos     │
   │                 │<───────────────────────│
   │  5. Mostrar     │                        │
   │<────────────────│                        │
```

### Diagrama: Renovación de Token (Token Refresh)

```
Usuario          Frontend               Backend Auth           Redis/DB
   │                 │                        │                    │
   │                 │  1. Access Token       │                    │
   │                 │  expirado (401)        │                    │
   │                 │                        │                    │
   │                 │  2. POST /auth/refresh │                    │
   │                 │  Cookie: refreshToken  │                    │
   │                 │  (enviado automático)  │                    │
   │                 │───────────────────────>│                    │
   │                 │                        │  3. Verificar RT   │
   │                 │                        │  en DB/Redis       │
   │                 │                        │───────────────────>│
   │                 │                        │  4. RT válido      │
   │                 │                        │<───────────────────│
   │                 │                        │  5. Generar nuevo  │
   │                 │                        │  Access Token      │
   │                 │  6. {nuevo accessToken}│                    │
   │                 │<───────────────────────│                    │
   │                 │  7. Reintentar request │                    │
   │                 │  original con nuevo AT │                    │
```

### Diagrama: Logout Seguro

```
Usuario          Frontend               Backend Auth           Redis/DB
   │                 │                        │                    │
   │  1. Logout      │                        │                    │
   │────────────────>│                        │                    │
   │                 │  2. POST /auth/logout  │                    │
   │                 │  Cookie: refreshToken  │                    │
   │                 │───────────────────────>│                    │
   │                 │                        │  3. Invalidar RT   │
   │                 │                        │  en DB/Redis       │
   │                 │                        │───────────────────>│
   │                 │                        │  4. RT eliminado   │
   │                 │                        │<───────────────────│
   │                 │  5. 200 OK             │                    │
   │                 │  Set-Cookie: (borrar)  │                    │
   │                 │<───────────────────────│                    │
   │                 │  6. Limpiar AT         │                    │
   │                 │  de memoria            │                    │
   │  7. ✅ Logout   │                        │                    │
   │<────────────────│                        │                    │
```

---

## 🔐 Roles y Claims en JWT

Los **roles** y **permisos** son un mecanismo fundamental para implementar **Control de Acceso Basado en Roles (RBAC)** usando JWT.

### Estructura de Claims con Roles

```json
{
  "sub": "usr_abc123",
  "email": "carlos@empresa.com",
  "iat": 1716235422,
  "exp": 1716236322,
  "roles": ["manager", "editor"],
  "permissions": [
    "users:read",
    "users:create",
    "articles:read",
    "articles:write",
    "articles:delete"
  ],
  "tenant": "empresa_acme",
  "department": "marketing"
}
```

### Verificación de Roles en el Frontend

```typescript
// utils/auth.ts
interface JWTPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  exp: number;
}

// NUNCA usar este payload para decisiones de seguridad en el backend
// Solo para UI/UX en el frontend
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

function hasRole(token: string, role: string): boolean {
  const payload = decodeJWT(token);
  return payload?.roles?.includes(role) ?? false;
}

function hasPermission(token: string, permission: string): boolean {
  const payload = decodeJWT(token);
  return payload?.permissions?.includes(permission) ?? false;
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
```

> ⚠️ **Principio de Seguridad:** La verificación de roles en el frontend es solo para **mejorar la experiencia de usuario** (ocultar/mostrar elementos UI). Las verificaciones de autorización reales **siempre deben hacerse en el backend**.

---

## 🛡️ Mejores Prácticas

### ✅ Hacer

1. **Usar tiempos de expiración cortos** para access tokens (máximo 30 minutos en producción).
2. **Firmar con algoritmos robustos**: Preferir RS256 (asimétrico) sobre HS256 en producción.
3. **Validar todos los claims**: `exp`, `iss`, `aud` en cada verificación.
4. **Usar HTTPS siempre**: Los tokens nunca deben viajar por HTTP en producción.
5. **Implementar rotación de refresh tokens**: Invalidar el RT anterior al emitir uno nuevo.
6. **Incluir `jti`** para poder revocar tokens individuales si es necesario.
7. **Minimizar el payload**: Solo incluir los datos estrictamente necesarios.

### ❌ No Hacer

1. **No almacenar secretos en el payload**: El payload es público (solo codificado, no encriptado).
2. **No usar el algoritmo `none`**: Es una vulnerabilidad de seguridad conocida.
3. **No ignorar la validación de firma en el backend**.
4. **No usar tiempos de expiración excesivamente largos** para access tokens.
5. **No reutilizar el mismo secreto** para access y refresh tokens.
6. **No transmitir tokens por URL** (query strings): Son visibles en logs y referrer headers.

---

## 🔑 Algoritmos de Firma

### Simétrico (HMAC) - HS256, HS384, HS512

```
┌─────────────────────────────────────────────────┐
│           FIRMA SIMÉTRICA (HS256)               │
│                                                 │
│  Servidor A                    Servidor B       │
│  ┌──────────┐    secreto      ┌──────────┐     │
│  │  Firmar  │◄──────────────►│ Verificar│     │
│  └──────────┘  compartido     └──────────┘     │
│                                                 │
│  ✅ Simple de implementar                       │
│  ✅ Rápido                                     │
│  ❌ Ambos lados deben conocer el secreto        │
│  ❌ No escalable en arquitecturas distribuidas  │
└─────────────────────────────────────────────────┘
```

### Asimétrico (RSA/ECDSA) - RS256, ES256

```
┌─────────────────────────────────────────────────┐
│          FIRMA ASIMÉTRICA (RS256)               │
│                                                 │
│  Auth Server      Clave Pública   API Servers   │
│  ┌──────────┐    ────────────►  ┌──────────┐   │
│  │  Firmar  │                   │ Verificar│   │
│  │  (clave  │                   │ (clave   │   │
│  │ privada) │                   │ pública) │   │
│  └──────────┘                   └──────────┘   │
│                                                 │
│  ✅ Solo el auth server puede firmar            │
│  ✅ Cualquier servicio puede verificar          │
│  ✅ Ideal para microservicios                   │
│  ❌ Más lento que HMAC                         │
└─────────────────────────────────────────────────┘
```

---

## 📋 Resumen de Conceptos Clave

| Concepto          | Definición                                                   |
|-------------------|--------------------------------------------------------------|
| JWT               | Token autocontenido que lleva claims del usuario firmados    |
| Access Token      | Token de corta duración para autorizar requests API          |
| Refresh Token     | Token de larga duración para renovar access tokens           |
| Claim             | Par clave-valor en el payload del JWT                        |
| Firma             | Garantía criptográfica de integridad y origen del token      |
| RBAC              | Control de acceso basado en roles asignados al usuario       |
| Stateless Auth    | Autenticación sin estado del lado del servidor               |
| Token Rotation    | Técnica de invalidar tokens usados y emitir nuevos           |

---

## 🔗 Referencias

- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 7515 - JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
- [JWT.io - Debugger y Documentación](https://jwt.io/)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 - JWT Introduction](https://auth0.com/learn/json-web-tokens/)

---

## 📂 Ejemplos y Ejercicios

- [📄 Ejemplo Básico: Decodificar un JWT](./ejemplos/basico.md)
- [📄 Ejemplo Intermedio: Crear y validar JWT con roles](./ejemplos/intermedio.md)
- [📄 Ejemplo Avanzado: Flujo completo con refresh tokens](./ejemplos/avanzado.md)
- [📝 Ejercicios Prácticos (10 ejercicios)](./ejercicios.md)

---

*← [Volver al Módulo 1](../../README.md) | [→ Sección 1.2: Almacenamiento Seguro](../1.2-almacenamiento-seguro/README.md)*
