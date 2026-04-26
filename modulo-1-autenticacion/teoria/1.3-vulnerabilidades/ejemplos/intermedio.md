# Ejemplo Intermedio: CSRF — Ataque Completo y Mitigaciones

> **Nivel:** 🟡 Intermedio | **Tiempo estimado:** 50 minutos

---

## Objetivo

Comprender el ataque CSRF con un ejemplo completo de exploit y sus contramedidas implementadas en React + Express.

---

## Parte 1: Escenario Vulnerable (Simulación)

### La Aplicación Víctima (banco-app.com)

```typescript
// ❌ SERVIDOR VULNERABLE: Sin protección CSRF

// backend/server.js
import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// El servidor confía ciegamente en la cookie de sesión
// No verifica el origen del request
app.post('/api/transfer', (req, res) => {
  const sessionCookie = req.cookies.session;
  
  if (!sessionCookie) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  // ❌ VULNERABLE: Solo verifica la cookie, no el origen del request
  const { destinatario, monto } = req.body;
  
  // Ejecuta la transferencia sin verificar que fue el usuario quien la pidió
  console.log(`⚠️ TRANSFERENCIA: $${monto} → ${destinatario}`);
  
  res.json({ success: true, message: `Transferencia de $${monto} realizada` });
});
```

### La Página del Atacante (sitio-malicioso.com)

```html
<!-- El atacante crea una página que parece inocente -->
<!DOCTYPE html>
<html lang="es">
<head>
  <title>¡Ganaste un premio!</title>
</head>
<body>
  <h1>🎉 ¡Felicitaciones! Haz clic para reclamar tu premio</h1>
  
  <!-- El formulario real está oculto y se envía automáticamente -->
  <form
    id="csrf-attack"
    action="https://banco-app.com/api/transfer"
    method="POST"
    style="display: none"
  >
    <input name="destinatario" value="cuenta_atacante_123" />
    <input name="monto" value="5000" />
  </form>
  
  <script>
    // Se envía automáticamente al cargar la página
    // El navegador envía la cookie de sesión del banco automáticamente
    window.onload = () => {
      document.getElementById('csrf-attack').submit();
    };
  </script>
  
  <!-- Variante con imagen (GET request) -->
  <img src="https://banco-app.com/api/delete-account?confirm=true"
       width="1" height="1"
       style="display:none">
</body>
</html>
```

### Por Qué Funciona

```
┌────────────────────────────────────────────────────────────┐
│                    POR QUÉ FUNCIONA CSRF                   │
│                                                            │
│  1. María está logueada en banco-app.com                   │
│     → Cookie: session=abc123 (en su navegador)            │
│                                                            │
│  2. María visita sitio-malicioso.com (el premio falso)     │
│                                                            │
│  3. La página envía un POST a banco-app.com                │
│     → El navegador incluye cookie session=abc123 auto ✓   │
│     → El servidor verifica la cookie y es válida ✓        │
│     → La transferencia SE EJECUTA ✓                       │
│                                                            │
│  4. María no sabe que ocurrió la transferencia             │
└────────────────────────────────────────────────────────────┘
```

---

## Parte 2: Servidor Protegido

```typescript
// ✅ SERVIDOR PROTEGIDO: Múltiples capas de defensa CSRF

import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ─── DEFENSA 1: SameSite Cookie ──────────────────────────────────────────────

// Al hacer login, usar SameSite=Strict
app.post('/api/login', (req, res) => {
  // ... verificar credenciales ...
  
  res.cookie('session', generateSessionId(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // ✅ No se envía en requests cross-site
    maxAge: 24 * 60 * 60 * 1000,
  });
  
  res.json({ success: true });
});

// ─── DEFENSA 2: CSRF Token (Double Submit Cookie) ────────────────────────────

const CSRF_TOKEN_LENGTH = 32; // bytes

// Generar un CSRF token al iniciar sesión
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  
  // Guardar en la base de datos asociado a la sesión
  // (simplificado: usamos otra cookie)
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false, // Debe ser legible por JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hora
  });
  
  res.json({ csrfToken });
});

// ─── MIDDLEWARE: Validar CSRF Token ──────────────────────────────────────────

function validateCsrfToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  // Los métodos seguros (GET, HEAD, OPTIONS) no necesitan CSRF token
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'] as string;
  
  if (!cookieToken || !headerToken) {
    res.status(403).json({
      error: 'CSRF_TOKEN_MISSING',
      message: 'Request bloqueado: falta el token CSRF',
    });
    return;
  }
  
  // Comparación de tiempo constante para evitar timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'hex'),
      Buffer.from(headerToken, 'hex')
    );
    
    if (!isValid) {
      res.status(403).json({
        error: 'CSRF_TOKEN_INVALID',
        message: 'Request bloqueado: token CSRF inválido',
      });
      return;
    }
  } catch {
    res.status(403).json({ error: 'CSRF_TOKEN_INVALID' });
    return;
  }
  
  next();
}

// ─── DEFENSA 3: Verificar Header Origin/Referer ──────────────────────────────

function validateOrigin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const allowedOrigins = [
    'https://banco-app.com',
    'https://www.banco-app.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ];
  
  const origin = req.headers.origin || req.headers.referer;
  
  if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    res.status(403).json({
      error: 'INVALID_ORIGIN',
      message: `Origen no permitido: ${origin}`,
    });
    return;
  }
  
  next();
}

// ─── ENDPOINT PROTEGIDO ──────────────────────────────────────────────────────

// ✅ Ahora el endpoint de transferencia tiene múltiples capas de protección:
// 1. Cookie SameSite=Strict (no se envía desde sitios externos)
// 2. CSRF token que el atacante no puede leer (Same-Origin Policy)
// 3. Verificación del header Origin
app.post('/api/transfer',
  validateOrigin,
  validateCsrfToken,
  (req, res) => {
    const sessionCookie = req.cookies.session;
    if (!sessionCookie) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const { destinatario, monto } = req.body;
    
    // ✅ Solo llega aquí si pasó todas las validaciones de seguridad
    console.log(`✅ TRANSFERENCIA LEGÍTIMA: $${monto} → ${destinatario}`);
    
    res.json({ success: true });
  }
);

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

---

## Parte 3: Cliente React con CSRF Protection

```typescript
// ✅ Cliente HTTP con CSRF token automático

// lib/csrf-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class CsrfProtectedClient {
  private client: AxiosInstance;
  private csrfToken: string | null = null;
  
  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      withCredentials: true, // Enviar cookies automáticamente
    });
    
    // Interceptor para agregar CSRF token
    this.client.interceptors.request.use((config) => {
      const mutatingMethods = ['post', 'put', 'patch', 'delete'];
      
      if (mutatingMethods.includes(config.method?.toLowerCase() ?? '')) {
        const token = this.getCsrfTokenFromCookie() || this.csrfToken;
        
        if (token) {
          config.headers['X-CSRF-Token'] = token;
        }
      }
      
      return config;
    });
    
    // Interceptor para renovar CSRF token si falla
    this.client.interceptors.response.use(
      response => response,
      async (error) => {
        if (error.response?.status === 403 &&
            error.response?.data?.error === 'CSRF_TOKEN_INVALID') {
          await this.refreshCsrfToken();
          // Reintentar el request original
          return this.client.request(error.config as AxiosRequestConfig);
        }
        return Promise.reject(error);
      }
    );
  }
  
  private getCsrfTokenFromCookie(): string | null {
    return document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('csrf_token='))
      ?.split('=')?.[1] ?? null;
  }
  
  async refreshCsrfToken(): Promise<void> {
    const response = await axios.get('/api/csrf-token', { withCredentials: true });
    this.csrfToken = response.data.csrfToken;
  }
  
  get instance(): AxiosInstance {
    return this.client;
  }
}

export const csrfClient = new CsrfProtectedClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
);

// Uso:
// csrfClient.instance.post('/api/transfer', { destinatario, monto });
```

---

## Parte 4: Verificar la Protección

```bash
# Test 1: Request legítimo desde el frontend (debe funcionar)
curl -v -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: TOKEN_DEL_COOKIE" \
  -H "Origin: http://localhost:3000" \
  -b "session=SESSION_ID; csrf_token=TOKEN_DEL_COOKIE" \
  -d '{"destinatario":"cuenta_legit","monto":100}'
# Respuesta: 200 OK ✅

# Test 2: Simular ataque CSRF (sin CSRF token en header)
curl -v -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "Origin: https://sitio-malicioso.com" \
  -b "session=SESSION_ID" \
  -d '{"destinatario":"cuenta_atacante","monto":5000}'
# Respuesta: 403 INVALID_ORIGIN ✅ (ataque bloqueado)

# Test 3: Con origen correcto pero sin CSRF token
curl -v -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b "session=SESSION_ID" \
  -d '{"destinatario":"cuenta_atacante","monto":5000}'
# Respuesta: 403 CSRF_TOKEN_MISSING ✅ (ataque bloqueado)
```

---

*← [Ejemplo Básico](./basico.md) | [→ Ejemplo Avanzado](./avanzado.md)*
