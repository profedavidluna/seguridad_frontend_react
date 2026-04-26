# Ejemplo Avanzado: CSP, Cabeceras de Seguridad y Hardening Completo

> **Nivel:** 🔴 Avanzado | **Tiempo estimado:** 80 minutos

---

## Objetivo

Implementar una estrategia de seguridad en profundidad (defense in depth) para una aplicación React/Next.js, incluyendo Content Security Policy con nonces, todas las cabeceras de seguridad HTTP relevantes, y un sistema de reporte de violaciones CSP.

---

## Parte 1: Content Security Policy con Nonces

Los **nonces** permiten que scripts inline legítimos ejecuten incluso con una CSP restrictiva, sin tener que usar `unsafe-inline`:

```typescript
// lib/csp.ts
import crypto from 'crypto';

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function buildCSP(nonce: string, environment: 'development' | 'production'): string {
  const policies: Record<string, string[]> = {
    'default-src': ["'self'"],
    
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      // En desarrollo, Next.js necesita eval() para hot reload
      ...(environment === 'development' ? ["'unsafe-eval'"] : []),
    ],
    
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Necesario para CSS-in-JS (Tailwind, styled-components)
      'https://fonts.googleapis.com',
    ],
    
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:', // Para fuentes base64
    ],
    
    'img-src': [
      "'self'",
      'data:',        // Para imágenes en línea (avatares generados)
      'blob:',        // Para imágenes desde objetos Blob
      'https:',       // Cualquier imagen HTTPS externa
    ],
    
    'connect-src': [
      "'self'",
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      ...(environment === 'development' ? [
        'ws://localhost:3000',  // WebSocket de Next.js hot reload
        'ws://localhost:3001',
      ] : []),
    ],
    
    'media-src': ["'self'", 'blob:'],
    
    'frame-src': ["'none'"],          // No permitir iframes
    'frame-ancestors': ["'none'"],    // No puede ser embebido en iframes
    
    'object-src': ["'none'"],         // No Flash ni plugins
    
    'base-uri': ["'self'"],           // Previene ataques base tag injection
    
    'form-action': [
      "'self'",
      // Si tienes formularios que envían a otros dominios, agregalos aquí
    ],
    
    'manifest-src': ["'self'"],
    
    'worker-src': ["'self'", 'blob:'], // Para Service Workers
    
    // Reportar violaciones CSP a nuestro endpoint
    'report-uri': ['/api/csp-violation'],
    'report-to': ['csp-violations'],
  };
  
  return Object.entries(policies)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}
```

---

## Parte 2: Middleware de Next.js con Todas las Cabeceras

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateNonce, buildCSP } from './lib/csp';

export function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const environment = process.env.NODE_ENV as 'development' | 'production';
  
  const cspHeader = buildCSP(nonce, environment);
  
  // Crear la respuesta con el nonce en el contexto
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        'x-nonce': nonce, // Pasar el nonce a los Server Components
      }),
    },
  });
  
  // ─── CONTENT SECURITY POLICY ───────────────────────────────────────────
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // ─── HTTPS STRICT TRANSPORT SECURITY ───────────────────────────────────
  // Solo activar en producción (en desarrollo no hay HTTPS)
  if (environment === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // ─── CLICKJACKING PREVENTION ───────────────────────────────────────────
  response.headers.set('X-Frame-Options', 'DENY');
  
  // ─── MIME TYPE SNIFFING PREVENTION ─────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // ─── XSS PROTECTION (para navegadores legacy) ──────────────────────────
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // ─── REFERRER POLICY ───────────────────────────────────────────────────
  // strict-origin-when-cross-origin: Envía full URL en same-origin,
  // solo origin en cross-origin HTTPS→HTTPS, nada en HTTPS→HTTP
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // ─── PERMISSIONS POLICY ────────────────────────────────────────────────
  // Restringir acceso a APIs del navegador que no necesitas
  response.headers.set(
    'Permissions-Policy',
    [
      'accelerometer=()',      // Acelerómetro
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',             // Cámara
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self)',     // Fullscreen solo desde el propio origen
      'geolocation=()',        // Geolocalización
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',         // Micrófono
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
      'interest-cohort=()',    // FLoC de Google (privacidad)
    ].join(', ')
  );
  
  // ─── CROSS-ORIGIN POLÍTICAS ────────────────────────────────────────────
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // ─── CACHE CONTROL para páginas con datos sensibles ────────────────────
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/profile') ||
      request.nextUrl.pathname.startsWith('/settings')) {
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Parte 3: Reportes de Violaciones CSP

```typescript
// app/api/csp-violation/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface CSPViolationReport {
  'blocked-uri': string;
  'document-uri': string;
  'effective-directive': string;
  'original-policy': string;
  'referrer': string;
  'script-sample': string;
  'status-code': number;
  'violated-directive': string;
}

interface CSPReport {
  'csp-report': CSPViolationReport;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as CSPReport;
    const report = body['csp-report'];
    
    // Loguear la violación para análisis
    console.warn('[CSP VIOLATION]', {
      blockedUri: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      documentUri: report['document-uri'],
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.ip,
    });
    
    // En producción, enviar a un servicio de monitoreo
    if (process.env.NODE_ENV === 'production') {
      await sendToMonitoring({
        type: 'CSP_VIOLATION',
        severity: 'medium',
        data: report,
        context: {
          userAgent: request.headers.get('user-agent'),
          ip: request.ip,
        },
      });
    }
    
    return NextResponse.json({ received: true }, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}

async function sendToMonitoring(_data: unknown): Promise<void> {
  // Integrar con Sentry, Datadog, etc.
  // await fetch('https://monitoring.service.com/events', { ... })
}
```

---

## Parte 4: Server Component con Nonce

```tsx
// app/layout.tsx — Next.js App Router
import { headers } from 'next/headers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Leer el nonce generado por el middleware
  const nonce = headers().get('x-nonce') ?? '';
  
  return (
    <html lang="es">
      <head>
        {/* Script de analytics con nonce (no requiere unsafe-inline) */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // Código de inicialización que debe ejecutarse inline
              window.__APP_CONFIG__ = {
                env: "${process.env.NODE_ENV}",
                version: "${process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}"
              };
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Parte 5: Verificación con SecurityHeaders.com

```bash
# Verificar las cabeceras de seguridad de tu aplicación
curl -I https://tu-aplicacion.com | grep -E "(Content-Security|X-Frame|X-Content|Strict-Trans|Referrer|Permissions)"

# Resultado esperado:
# Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-...'; ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), ...
```

---

## Parte 6: Testing de Seguridad Automatizado

```typescript
// tests/security-headers.test.ts
import { test, expect } from '@playwright/test';

test.describe('Cabeceras de Seguridad HTTP', () => {
  test('debe incluir Content-Security-Policy', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()['content-security-policy'];
    
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-inline"); // Para scripts
  });
  
  test('debe incluir X-Frame-Options: DENY', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['x-frame-options']).toBe('DENY');
  });
  
  test('debe incluir X-Content-Type-Options: nosniff', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  });
  
  test('debe incluir HSTS en producción', async ({ page }) => {
    if (process.env.NODE_ENV !== 'production') return;
    
    const response = await page.goto('/');
    const hsts = response?.headers()['strict-transport-security'];
    
    expect(hsts).toContain('max-age=');
    expect(hsts).toContain('includeSubDomains');
  });
  
  test('no debe exponer información del servidor', async ({ page }) => {
    const response = await page.goto('/');
    
    // No debe revelar tecnologías usadas
    expect(response?.headers()['x-powered-by']).toBeUndefined();
    expect(response?.headers()['server']).not.toContain('Express');
    expect(response?.headers()['server']).not.toContain('Apache');
  });
});
```

---

## 🏆 Puntuación de Seguridad Objetivo

Usa [SecurityHeaders.com](https://securityheaders.com/) para auditar tu aplicación. El objetivo es obtener grado **A+**:

```
✅ Content-Security-Policy      → Implementado con nonce
✅ X-Frame-Options               → DENY
✅ X-Content-Type-Options        → nosniff
✅ Strict-Transport-Security     → Habilitado con preload
✅ Referrer-Policy               → strict-origin-when-cross-origin
✅ Permissions-Policy            → Todos los permisos restrictivos

Grade: A+ 🏆
```

---

*← [Ejemplo Intermedio](./intermedio.md) | [→ Ejercicios](../ejercicios.md)*
