# Ejercicios: Vulnerabilidades XSS, CSRF y Seguridad Web

> **Sección:** 1.3 | **Total:** 10 ejercicios | **Tiempo estimado:** 4-5 horas

---

## 📋 Índice de Ejercicios

| # | Título | Nivel | Tiempo |
|---|--------|-------|--------|
| 1 | Identificar XSS en código React | 🟢 Básico | 20 min |
| 2 | Sanitizar HTML con DOMPurify | 🟢 Básico | 25 min |
| 3 | Construir un payload XSS de prueba | 🟢 Básico | 20 min |
| 4 | Implementar validación de URLs | 🟡 Intermedio | 35 min |
| 5 | Construir un ataque CSRF simulado | 🟡 Intermedio | 40 min |
| 6 | Implementar protección CSRF completa | 🟡 Intermedio | 45 min |
| 7 | Configurar CSP sin romper la app | 🔴 Avanzado | 60 min |
| 8 | Detectar XSS en revisión de código | 🔴 Avanzado | 50 min |
| 9 | Implementar CSP con nonces en Next.js | 🔴 Avanzado | 65 min |
| 10 | Auditoría completa de seguridad | 🔴 Avanzado | 60 min |

---

## 🟢 Ejercicio 1: Identificar XSS en Código React

**Nivel:** Básico | **Tiempo:** 20 minutos

### Descripción

Analiza el siguiente código de una aplicación de e-commerce y encuentra TODOS los puntos vulnerables a XSS. Clasifica cada vulnerabilidad por tipo (Reflected, Stored, DOM-based).

### Código a Auditar

```tsx
// ⚠️ Este código contiene múltiples vulnerabilidades XSS — encuéntralas todas

// pages/search.tsx
import { useRouter } from 'next/router';

export default function SearchPage() {
  const router = useRouter();
  const { q: searchQuery } = router.query;
  
  return (
    <div>
      {/* Vulnerabilidad #1 */}
      <h1>Resultados para: 
        <span dangerouslySetInnerHTML={{ __html: searchQuery as string }} />
      </h1>
    </div>
  );
}

// components/ProductReview.tsx
function ProductReview({ review }: { review: { author: string; content: string; rating: number } }) {
  return (
    <div className="review">
      {/* Vulnerabilidad #2 */}
      <p dangerouslySetInnerHTML={{ __html: review.content }} />
      <span>Por: {review.author}</span>
      <div className="stars">{review.rating} ⭐</div>
    </div>
  );
}

// components/UserBio.tsx
function UserBio({ user }: { user: { bio: string; website: string; avatar: string } }) {
  return (
    <div>
      {/* Vulnerabilidad #3 */}
      <a href={user.website}>Visitar sitio web</a>
      
      {/* Vulnerabilidad #4 */}
      <img src={user.avatar} alt="Avatar" />
      
      {/* Vulnerabilidad #5 */}
      <div dangerouslySetInnerHTML={{ __html: user.bio }} />
    </div>
  );
}

// utils/render.ts
export function renderTemplate(template: string, data: Record<string, string>): string {
  // Vulnerabilidad #6
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

// Y luego se usa así:
const html = renderTemplate('<h1>Bienvenido {{name}}</h1>', { name: userInput });
document.getElementById('greeting')!.innerHTML = html; // Vulnerabilidad #7

// components/RedirectHandler.tsx
export function RedirectHandler() {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  
  const handleClick = () => {
    // Vulnerabilidad #8
    window.location.href = redirect || '/';
  };
  
  return <button onClick={handleClick}>Continuar</button>;
}
```

### Tareas

1. Identifica y numera cada vulnerabilidad.
2. Clasifica cada una: Reflected, Stored, o DOM-based.
3. Escribe el payload de ataque para cada una.
4. Proporciona el código corregido para cada vulnerabilidad.

### Tabla de Respuesta

```markdown
| # | Archivo | Línea | Tipo XSS | Payload de Ataque | Corrección |
|---|---------|-------|----------|-------------------|------------|
| 1 | search.tsx | ... | Reflected | `<img src=x onerror=alert(1)>` | Usar {variable} sin dangerouslySetInnerHTML |
| 2 | ... | ... | ... | ... | ... |
```

---

## 🟢 Ejercicio 2: Sanitizar HTML con DOMPurify

**Nivel:** Básico | **Tiempo:** 25 minutos

### Descripción

La siguiente aplicación de blog necesita mostrar HTML formateado de los posts (negrita, cursiva, links). Implementa la sanitización correcta usando DOMPurify.

### Requerimientos

```typescript
// Debes implementar un componente que:
// 1. Permita mostrar HTML seguro (negritas, cursivas, listas, links)
// 2. Bloquee scripts, iframes, event handlers (onclick, etc.)
// 3. Transforme links externos para que abran en nueva pestaña
// 4. Elimine atributos style potencialmente peligrosos
// 5. Funcione correctamente con SSR (Next.js)

interface RichTextProps {
  content: string;
  allowedTags?: string[];
  allowLinks?: boolean;
}

function SafeRichText({ content, allowedTags, allowLinks = true }: RichTextProps) {
  // Tu implementación con DOMPurify
}
```

### Casos de Prueba

```typescript
// Caso 1: Contenido legítimo — debe renderizarse correctamente
const legitContent = `
  <p>Este es un <strong>artículo importante</strong> sobre seguridad.</p>
  <ul>
    <li>Punto 1: <em>XSS es peligroso</em></li>
    <li>Punto 2: <a href="https://owasp.org">Ver OWASP</a></li>
  </ul>
`;

// Caso 2: Intento de XSS — debe ser eliminado
const xssAttempt = `
  <p>Contenido normal</p>
  <script>alert('XSS')</script>
  <img src="x" onerror="robarToken()">
  <a href="javascript:alert('xss')">Click aquí</a>
  <div onclick="robar()">Click me</div>
  <iframe src="https://atacante.com"></iframe>
`;

// Caso 3: Estilos maliciosos — deben ser eliminados
const maliciousStyles = `
  <p style="background:url(javascript:alert('xss'))">Texto</p>
  <div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999">
    PHISHING OVERLAY
  </div>
`;

// Resultado esperado Caso 2: Solo <p>Contenido normal</p>
// El script, img, iframe y onclick deben ser eliminados
```

---

## 🟢 Ejercicio 3: Construir un Payload XSS de Prueba (Ético)

**Nivel:** Básico | **Tiempo:** 20 minutos

### Descripción

> ⚠️ **Solo para entornos de prueba controlados.** Nunca usar en producción o en sistemas de terceros sin autorización.

Crea una página de prueba que demuestre distintos vectores de XSS para usar en tus pruebas de penetración en entornos locales.

### Implementación

```typescript
// Crea un servidor Express local para probar XSS
// Este servidor simula una aplicación vulnerable para propósitos educativos

// Los payloads deben solo mostrar una alerta de prueba (alert, console.log)
// NO deben robar datos ni hacer requests externos

const XSS_TEST_PAYLOADS = {
  basic: [
    '<script>alert("XSS básico")</script>',
    '<img src=x onerror=alert("XSS img")>',
    '<svg onload=alert("XSS SVG")>',
  ],
  advanced: [
    '"><script>alert("XSS en atributo")</script>',
    "'; alert('XSS en JS string'); var x='",
    '<a href="javascript:alert(\'XSS href\')">click</a>',
  ],
  filter_bypass: [
    '<scr<script>ipt>alert("XSS bypass")</scr</script>ipt>',
    '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
    '<img src=`x`onerror=alert(1)>',
  ],
};

// Documenta:
// 1. En qué contextos funciona cada payload (HTML, atributo, JS)
// 2. Qué filtros evade cada uno
// 3. Cómo DOMPurify bloquea cada uno
```

### Verificación

Para cada payload, documenta:
- ✅ Se ejecuta en app vulnerable
- ❌ Bloqueado por DOMPurify
- ❌ Bloqueado por CSP

---

## 🟡 Ejercicio 4: Implementar Validación de URLs Robusta

**Nivel:** Intermedio | **Tiempo:** 35 minutos

### Descripción

Implementa una función de validación de URLs que proteja contra XSS via `javascript:` URIs y otros esquemas peligrosos, con soporte para listas blancas de dominios.

### Requerimientos

```typescript
interface URLValidationOptions {
  allowedProtocols?: string[];      // Default: ['https:', 'http:', 'mailto:']
  allowedDomains?: string[];        // Si se especifica, solo permite estos dominios
  allowRelative?: boolean;          // Permitir URLs relativas (/path, ./path)
  allowDataUrls?: string[];         // Tipos MIME permitidos en data: URIs
  transformExternal?: boolean;      // Agregar rel=noopener en links externos
}

interface URLValidationResult {
  isValid: boolean;
  sanitizedUrl: string;
  isExternal: boolean;
  protocol: string | null;
  reason?: string;        // Por qué fue invalidada
}

function validateUrl(url: string, options?: URLValidationOptions): URLValidationResult {
  // Tu implementación
}
```

### Casos de Prueba

```typescript
// Deben ser VÁLIDOS:
validateUrl('https://empresa.com/page');            // ✅
validateUrl('http://localhost:3000');               // ✅ (en dev)
validateUrl('/relative/path');                      // ✅
validateUrl('./otro/path');                         // ✅
validateUrl('mailto:contacto@empresa.com');         // ✅
validateUrl('data:image/png;base64,abc123',
  { allowDataUrls: ['image/png'] });               // ✅

// Deben ser INVÁLIDOS:
validateUrl('javascript:alert(1)');                 // ❌
validateUrl('vbscript:msgbox(1)');                  // ❌
validateUrl('data:text/html,<script>alert(1)</script>'); // ❌
validateUrl('  javascript:alert(1) ');              // ❌ (con espacios)
validateUrl('JAVASCRIPT:alert(1)');                 // ❌ (mayúsculas)
validateUrl('https://malicioso.com',
  { allowedDomains: ['empresa.com'] });            // ❌
```

---

## 🟡 Ejercicio 5: Construir un Ataque CSRF Simulado

**Nivel:** Intermedio | **Tiempo:** 40 minutos

### Descripción

> ⚠️ **Solo para entornos de prueba locales.** Este ejercicio tiene fines educativos exclusivamente.

Configura un entorno local con dos servidores:
1. Una app vulnerable (`http://localhost:3001`)
2. Un sitio "atacante" (`http://localhost:3002`)

Demuestra un ataque CSRF exitoso y luego aplica las protecciones para bloquearlo.

### Servidor Víctima (vulnerable)

```typescript
// servidor-victima/index.ts
// Puerto: 3001

// Implementa:
// POST /api/change-email (sin protección CSRF)
// GET /profile (muestra el email actual)
// POST /api/login (establece cookie de sesión)

// La cookie de sesión NO debe tener SameSite para que el ataque funcione
// Esto es intencional para el ejercicio
```

### Servidor Atacante

```html
<!-- servidor-atacante/ataque.html -->
<!-- Puerto: 3002 -->

<!-- Implementa una página que automáticamente:
     1. Envíe un POST a localhost:3001/api/change-email
     2. Con los datos del atacante
     3. Usando un formulario oculto que se envía automáticamente -->
```

### Verificar el Ataque

```bash
# 1. Iniciar ambos servidores
node servidor-victima/index.ts  # Puerto 3001
node servidor-atacante/index.ts # Puerto 3002

# 2. En el navegador:
# - Ir a http://localhost:3001 y hacer login
# - Ir a http://localhost:3002/ataque.html
# - Volver a http://localhost:3001/profile
# - Verificar que el email cambió sin que el usuario lo pidiera

# 3. Luego aplicar las protecciones y verificar que el ataque falla
```

### Aplicar Protecciones

Una vez que el ataque funciona, aplica las siguientes protecciones en orden y verifica que cada una bloquea el ataque:

1. `SameSite=Strict` en la cookie
2. Verificar header `Origin`
3. Token CSRF (Double Submit Cookie)

---

## 🟡 Ejercicio 6: Implementar Protección CSRF Completa

**Nivel:** Intermedio | **Tiempo:** 45 minutos

### Descripción

Implementa un sistema completo de protección CSRF para una API REST de React + Express que incluye generación de tokens, middleware de validación, y cliente React que los envía automáticamente.

### Arquitectura a Implementar

```
Backend (Express):
├── Middleware: attachCsrfToken  — Genera y establece la cookie CSRF
├── Middleware: validateCsrf     — Valida el token en requests mutantes
└── Ruta: GET /api/csrf-token    — Devuelve el token para el frontend

Frontend (React):
├── Hook: useCsrfToken()         — Lee el token de la cookie
├── Axios interceptor            — Agrega el header automáticamente
└── Componente: CsrfProvider     — Inicializa el token al montar la app
```

### Implementación Completa Esperada

```typescript
// Backend: CSRF Middleware
export const csrfMiddleware = {
  attach: (req, res, next) => { /* ... */ },
  validate: (req, res, next) => { /* ... */ },
};

// Frontend: Hook
export function useCsrfToken(): string | null { /* ... */ }

// Frontend: Axios con CSRF
export const secureAxios = axios.create({ /* ... */ });
secureAxios.interceptors.request.use(/* agregar X-CSRF-Token */);
```

### Pruebas Requeridas

```typescript
describe('CSRF Protection', () => {
  it('debe bloquear POST sin CSRF token');
  it('debe bloquear POST con CSRF token incorrecto');
  it('debe permitir POST con CSRF token correcto');
  it('debe permitir GET sin CSRF token');
  it('debe bloquear request desde origen diferente');
});
```

---

## 🔴 Ejercicio 7: Configurar CSP sin Romper la Aplicación

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Configura un Content Security Policy estricto para una aplicación React con Tailwind CSS y Google Fonts, sin romper ninguna funcionalidad. Este ejercicio te enseña a balancear seguridad con funcionalidad.

### La Aplicación

La app usa:
- React con create-react-app (tiene scripts inline)
- Tailwind CSS (tiene estilos inline)
- Google Fonts
- Axios para API calls a `https://api.empresa.com`
- Google Analytics (script externo)
- Imágenes de Cloudinary

### Proceso

```
Paso 1: Activar CSP en modo "report-only" (no bloquea, solo reporta)
Paso 2: Revisar los reportes de violaciones
Paso 3: Ajustar la política para permitir lo legítimo
Paso 4: Activar en modo "enforce" (ahora sí bloquea)
Paso 5: Verificar que todo funciona
Paso 6: Migrar Google Analytics a usar nonces
```

### Implementación Esperada

```typescript
// next.config.js
const generateCsp = (nonce: string) => `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' https://res.cloudinary.com data:;
  connect-src 'self' https://api.empresa.com https://www.google-analytics.com;
  report-uri /api/csp-violations;
`;

// ¿Es esta CSP suficientemente restrictiva?
// ¿Qué mejorarías si pudieras?
```

### Análisis Requerido

Documenta:
1. ¿Qué directivas son imprescindibles para que la app funcione?
2. ¿Qué directivas representan un riesgo de seguridad pero son necesarias?
3. ¿Cómo mitigarías esos riesgos?
4. ¿Qué puntuación daría SecurityHeaders.com con esta configuración?

---

## 🔴 Ejercicio 8: Detectar XSS en Revisión de Código (Code Review)

**Nivel:** Avanzado | **Tiempo:** 50 minutos

### Descripción

Actúa como revisor de seguridad en un Pull Request. El siguiente código tiene vulnerabilidades sutiles de XSS que no son obvias a primera vista.

### Código del PR

```tsx
// PR: Agregar sistema de notificaciones con HTML personalizado

// notifications/NotificationRenderer.tsx
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;      // Puede venir del servidor
  html?: string;        // HTML personalizado opcional
  action?: {
    label: string;
    url: string;        // URL para el botón de acción
  };
}

// El desarrollador argumenta que esto es "seguro" porque solo
// acepta notificaciones del servidor de confianza
function NotificationItem({ notification }: { notification: Notification }) {
  const handleAction = () => {
    // "Validamos" que sea una URL absoluta
    if (notification.action?.url.startsWith('http')) {
      window.location.href = notification.action.url;
    }
  };
  
  return (
    <div className={`notification ${notification.type}`}>
      {notification.html ? (
        // "Solo se usa para notificaciones del sistema"
        <div dangerouslySetInnerHTML={{ __html: notification.html }} />
      ) : (
        <p>{notification.message}</p>
      )}
      {notification.action && (
        <button onClick={handleAction}>
          {notification.action.label}
        </button>
      )}
    </div>
  );
}

// notifications/useNotifications.ts
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    // Cargar notificaciones desde el servidor
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setNotifications(data.notifications));
    
    // También escuchar notificaciones en tiempo real
    const eventSource = new EventSource('/api/notifications/stream');
    eventSource.onmessage = (e) => {
      const notification = JSON.parse(e.data);
      setNotifications(prev => [...prev, notification]);
    };
    
    return () => eventSource.close();
  }, []);
  
  return notifications;
}
```

### Tareas del Code Review

1. Identifica **todas las vulnerabilidades** de XSS, incluyendo las no obvias.
2. Para cada una, escribe un payload de ataque que la explote.
3. Argumenta si el código debería ser **aprobado, rechazado o reescrito**.
4. Proporciona el código corregido completo.
5. Agrega comentarios de revisión específicos (como en GitHub Code Review).

### Preguntas de Análisis

- ¿La validación `url.startsWith('http')` es suficiente? ¿Por qué?
- ¿Qué pasa si el servidor API es comprometido? ¿Sigue siendo seguro `dangerouslySetInnerHTML`?
- ¿El SSE (Server-Sent Events) introduce algún riesgo adicional?

---

## 🔴 Ejercicio 9: Implementar CSP con Nonces en Next.js

**Nivel:** Avanzado | **Tiempo:** 65 minutos

### Descripción

Implementa una solución completa de CSP con nonces en Next.js App Router, incluyendo el middleware, la propagación del nonce a los componentes, y el reporte de violaciones.

### Requerimientos Técnicos

1. **Middleware**: Generar nonce único por request y construir CSP header.
2. **Layout**: Usar el nonce para scripts inline de Next.js.
3. **Server Components**: Pasar el nonce a los componentes que lo necesiten.
4. **Cliente**: Script de Google Analytics migrado a usar nonce.
5. **Reporte**: Endpoint que recibe y procesa violaciones CSP.
6. **Testing**: Prueba E2E que verifica que la CSP no bloquea funcionalidad legítima.

### Estructura de Archivos a Crear

```
middleware.ts              ← CSP + nonce + todas las cabeceras de seguridad
app/
├── layout.tsx             ← Usar nonce en scripts inline
├── api/
│   └── csp-violation/
│       └── route.ts       ← Receptor de reportes de violaciones
lib/
├── csp-builder.ts         ← Construir la política CSP
└── security-headers.ts    ← Todas las cabeceras de seguridad
tests/
└── security-headers.spec.ts ← Tests de cabeceras
```

### Validación

```bash
# Verificar que la CSP está activa
curl -I http://localhost:3000 | grep Content-Security-Policy

# Verificar que los nonces cambian en cada request
curl -s -I http://localhost:3000 | grep -o "nonce-[a-zA-Z0-9+/=]*" 
curl -s -I http://localhost:3000 | grep -o "nonce-[a-zA-Z0-9+/=]*"
# Los dos nonces deben ser DIFERENTES ✅
```

---

## 🔴 Ejercicio 10: Auditoría Completa de Seguridad (Vulnerabilidades)

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Realiza una auditoría de seguridad completa de la aplicación del módulo 1, documentando todas las vulnerabilidades encontradas y un plan de remediación priorizado.

### Metodología: OWASP Testing Guide

Sigue el [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) para las siguientes pruebas:

#### 1. Testing de XSS (OTG-INPVAL-001)

```markdown
- [ ] Probar todos los campos de entrada de usuario
- [ ] Probar parámetros de URL
- [ ] Probar cabeceras HTTP reflejadas
- [ ] Probar contenido cargado desde la API
- [ ] Verificar que la CSP está activa y correctamente configurada
```

#### 2. Testing de CSRF (OTG-SESS-005)

```markdown
- [ ] Verificar presencia de token CSRF en formularios
- [ ] Intentar enviar formularios sin el token CSRF
- [ ] Verificar que el token CSRF cambia entre sesiones
- [ ] Verificar configuración SameSite de cookies
```

#### 3. Testing de Autenticación (OTG-AUTHN)

```markdown
- [ ] Verificar expiración correcta de tokens
- [ ] Verificar que el logout invalida el token en el servidor
- [ ] Intentar reutilizar un refresh token
- [ ] Verificar cabeceras de no-cache en páginas autenticadas
```

#### 4. Testing de Cabeceras HTTP (OTG-CONFIG-007)

```markdown
- [ ] X-Frame-Options o CSP frame-ancestors
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security
- [ ] Referrer-Policy
- [ ] Content-Security-Policy
```

### Reporte de Auditoría

```markdown
# Informe de Auditoría de Seguridad
**Aplicación:** [Nombre]
**Fecha:** [Fecha]
**Auditor:** [Nombre]
**Versión:** 1.0

## Resumen Ejecutivo
[2-3 párrafos con los hallazgos principales]

## Hallazgos por Severidad

### 🔴 Críticos (CVSS 9.0-10.0)
| ID | Título | Impacto | Evidencia | Remediación |
|----|--------|---------|-----------|-------------|

### 🟠 Altos (CVSS 7.0-8.9)
...

### 🟡 Medios (CVSS 4.0-6.9)
...

### 🟢 Bajos (CVSS 0.1-3.9)
...

## Plan de Remediación
| Prioridad | Hallazgo | Esfuerzo | Responsable | Fecha límite |
|-----------|----------|----------|-------------|--------------|

## Referencias
- OWASP Top 10 2021
- OWASP Testing Guide v4.2
```

---

*← [Volver a la Sección 1.3](../README.md) | [→ Sección 1.4: Implementación Práctica](../../1.4-implementacion-practica/README.md)*
