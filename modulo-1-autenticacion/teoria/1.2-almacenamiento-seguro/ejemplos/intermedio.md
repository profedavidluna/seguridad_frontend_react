# Ejemplo Intermedio: Configuración de Cookies Seguras y CSRF Protection

> **Nivel:** 🟡 Intermedio | **Tiempo estimado:** 45 minutos

---

## Objetivo

Implementar correctamente cookies `httpOnly` en el backend y configurar la protección CSRF para aplicaciones que usan cookies de autenticación.

---

## Parte 1: Backend — Configuración de Cookies Seguras

```typescript
// server/middleware/cookie-config.ts
import { CookieOptions } from 'express';

// Configuraciones de cookies por entorno
export const cookieConfigs = {
  refreshToken: (env: 'development' | 'production'): CookieOptions => ({
    httpOnly: true,           // ✅ No accesible por JavaScript
    secure: env === 'production',  // ✅ Solo HTTPS en producción
    sameSite: 'strict',       // ✅ No se envía en requests cross-site
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/api/auth',        // ✅ Solo para endpoints de auth
  }),
  
  csrfToken: (env: 'development' | 'production'): CookieOptions => ({
    httpOnly: false,          // ⚠️ El cliente JS necesita leerlo
    secure: env === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000,  // 1 hora
    path: '/',
  }),
};

// Función helper para establecer cookies con configuración correcta
export function setSecureCookie(
  res: import('express').Response,
  name: string,
  value: string,
  options: CookieOptions
): void {
  // Validar que en producción siempre se use Secure
  if (process.env.NODE_ENV === 'production' && !options.secure) {
    throw new Error(`Cookie "${name}" debe usar Secure=true en producción`);
  }
  
  res.cookie(name, value, options);
}
```

---

## Parte 2: Protección CSRF con Double Submit Cookie

El patrón **Double Submit Cookie** es la técnica más común para proteger endpoints que usan cookies contra CSRF:

```
┌──────────────────────────────────────────────────────────────┐
│              DOUBLE SUBMIT COOKIE PATTERN                    │
│                                                              │
│  1. Servidor genera CSRF token aleatorio                     │
│  2. Lo envía como: cookie (legible por JS) + response body  │
│  3. En cada request mutante, el cliente debe enviar:         │
│     - Cookie: csrf_token=abc123 (automático)                 │
│     - Header X-CSRF-Token: abc123 (manual)                  │
│  4. El servidor verifica que ambos valores coincidan         │
│                                                              │
│  El atacante (CSRF) puede hacer que el navegador envíe la   │
│  cookie automáticamente, pero NO puede leer su valor para   │
│  incluirlo en el header (política Same-Origin).             │
└──────────────────────────────────────────────────────────────┘
```

### Backend: Generación y Validación de CSRF Token

```typescript
// server/middleware/csrf.ts
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Generar un CSRF token criptográficamente seguro
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware para generar y adjuntar CSRF token a las respuestas
export function attachCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Si ya hay un token válido en la cookie, reutilizarlo
  if (!req.cookies.csrfToken) {
    const token = generateCsrfToken();
    
    res.cookie('csrfToken', token, {
      httpOnly: false,  // ⚠️ Debe ser legible por JS para incluirlo en headers
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hora
      path: '/',
    });
  }
  
  next();
}

// Middleware para validar el CSRF token en requests mutantes
export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
  const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  
  if (SAFE_METHODS.includes(req.method)) {
    return next(); // Los métodos seguros no necesitan CSRF token
  }
  
  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers['x-csrf-token'] as string;
  
  if (!cookieToken || !headerToken) {
    res.status(403).json({
      error: 'CSRF_TOKEN_MISSING',
      message: 'Se requiere el token CSRF para esta operación',
    });
    return;
  }
  
  // Comparación segura (timing-safe) para evitar timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
  
  if (!isValid) {
    res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Token CSRF inválido',
    });
    return;
  }
  
  next();
}
```

---

## Parte 3: Frontend — Leer y Enviar el CSRF Token

```typescript
// lib/csrf.ts

/**
 * Lee el CSRF token desde la cookie (NO httpOnly, así que es accesible por JS)
 */
export function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrfToken') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * Configura Axios para incluir el CSRF token automáticamente
 * en todos los requests mutantes (POST, PUT, DELETE, PATCH)
 */
import axios from 'axios';

const MUTATING_METHODS = ['post', 'put', 'delete', 'patch'];

axios.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  
  if (method && MUTATING_METHODS.includes(method)) {
    const csrfToken = getCsrfToken();
    
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return config;
});
```

---

## Parte 4: Configuración con Next.js

```typescript
// next.config.js — Configurar headers de seguridad para cookies

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Evitar que el navegador recuerde cookies en páginas cacheadas
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
          // Política de seguridad de contenido básica
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

```typescript
// app/api/auth/route.ts — API Route de Next.js con cookies seguras

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  // Autenticar al usuario...
  const { accessToken, refreshToken, user } = await authenticateUser(body);
  
  // Crear la respuesta
  const response = NextResponse.json({ accessToken, user });
  
  // Establecer la cookie httpOnly de refresh token
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 días en segundos
    path: '/api/auth',
  });
  
  return response;
}

async function authenticateUser(_body: unknown) {
  // Implementación de ejemplo
  return {
    accessToken: 'at_example',
    refreshToken: 'rt_example',
    user: { id: '1', email: 'user@example.com', roles: ['user'] },
  };
}
```

---

## Parte 5: Prueba de la Configuración

```bash
# Verificar los atributos de las cookies con cURL
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'

# Buscar en la respuesta:
# Set-Cookie: refreshToken=...; Path=/api/auth; HttpOnly; Secure; SameSite=Strict
#                                                ^^^^^^^^^  ^^^^^^  ^^^^^^^^^^^^^^
#                                                Bien ✅    Bien ✅  Bien ✅
```

```javascript
// En la consola del navegador, verificar que la httpOnly cookie NO sea accesible:
document.cookie
// Solo mostrará las cookies SIN httpOnly
// La cookie refreshToken NO debe aparecer aquí ✅

// Verificar que el csrfToken SÍ sea accesible (no es httpOnly):
document.cookie.includes('csrfToken')
// true ✅ (es accesible porque lo necesitamos para enviarlo en headers)
```

---

*← [Ejemplo Básico](./basico.md) | [→ Ejemplo Avanzado](./avanzado.md)*
