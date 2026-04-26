# 3.1 — Manejo Responsable de Datos Sensibles

> **Sección:** 3.1 de 4 | **Duración:** 2 horas | **Nivel:** Intermedio-Avanzado

---

## 🎯 Objetivos de Aprendizaje

Al completar esta sección, podrás:

- Identificar qué tipos de datos **nunca deben exponerse** en el frontend
- Implementar técnicas de **enmascaramiento y protección visual** de datos sensibles
- Comprender los fundamentos de **cifrado en tránsito** (HTTPS/TLS) desde la perspectiva frontend
- Aplicar **sanitización de inputs** para prevenir ataques de inyección
- Diseñar **formularios seguros** que protejan la información del usuario
- Usar patrones empresariales de **prevención de exposición de datos**

---

## 1. ¿Qué NO debe exponerse en el Frontend?

El frontend es la capa más expuesta de cualquier aplicación. Cualquier dato que incluyas en tu código JavaScript, HTML o CSS puede ser visto por cualquier usuario con acceso a las herramientas de desarrollo del navegador.

### 1.1 Secretos y Credenciales

```
❌ NUNCA incluir en el frontend:
├── API Keys de servicios de terceros (Stripe, Twilio, SendGrid)
├── Tokens de acceso de larga duración
├── Claves privadas o certificados
├── Contraseñas de bases de datos
├── Secrets de OAuth (client_secret)
└── Variables de entorno del servidor
```

**Ejemplo del problema:**

```javascript
// ❌ PELIGROSO — Este código expone la clave en el bundle de JavaScript
const STRIPE_SECRET_KEY = 'sk_live_51ABC...XYZ'; // ← Visible en DevTools

async function procesarPago(monto) {
  const stripe = require('stripe')(STRIPE_SECRET_KEY); // ← NUNCA en frontend
  // ...
}
```

**Solución correcta:**

```javascript
// ✅ CORRECTO — La clave secreta vive únicamente en el servidor
// frontend/components/Checkout.tsx
async function procesarPago(monto: number) {
  // Solo llamamos a NUESTRA API, nunca directamente a Stripe
  const response = await fetch('/api/pagos/procesar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monto }),
  });
  return response.json();
}

// backend/api/pagos/procesar.ts (Next.js API Route — se ejecuta en servidor)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // ← Solo en servidor
```

### 1.2 Información de Identificación Personal (PII)

La **PII (Personally Identifiable Information)** incluye cualquier dato que pueda identificar a una persona. Su exposición puede violar regulaciones como GDPR, LGPD o CCPA.

| Categoría | Ejemplos | Riesgo |
|-----------|----------|--------|
| **Identificadores directos** | DNI, pasaporte, seguridad social | Crítico |
| **Datos financieros** | Número de tarjeta completo, CVV, IBAN | Crítico |
| **Datos de salud** | Diagnósticos, medicamentos, historial | Crítico |
| **Contacto personal** | Email, teléfono, dirección exacta | Alto |
| **Datos biométricos** | Huella, reconocimiento facial | Crítico |
| **Credenciales** | Contraseñas, PINs, preguntas secretas | Crítico |

```typescript
// ❌ MAL — Guardando PII completo en localStorage o estado global
const [usuario, setUsuario] = useState({
  id: 'usr_123',
  nombre: 'Juan García',
  dni: '12345678A',          // ← No debería estar en estado del cliente
  tarjeta: '4111111111111111', // ← NUNCA en frontend
  cvv: '123',                  // ← NUNCA en frontend
  email: 'juan@empresa.com',
  salario: 75000,              // ← Dato sensible innecesario
});

// ✅ BIEN — Solo los datos mínimos necesarios para la UI
const [usuario, setUsuario] = useState({
  id: 'usr_123',
  nombre: 'Juan García',
  email: 'j***@empresa.com',   // ← Parcialmente enmascarado
  rol: 'empleado',
  // El resto se pide bajo demanda con autorización adecuada
});
```

### 1.3 Tokens de Autenticación

```typescript
// ❌ MAL — Token en localStorage (accesible por JavaScript, vulnerable a XSS)
localStorage.setItem('access_token', 'eyJhbGciOi...');

// ❌ MAL — Token en variables globales de JavaScript
window.__AUTH_TOKEN__ = 'eyJhbGciOi...';

// ❌ MAL — Token en el estado de React (puede aparecer en React DevTools)
const [token, setToken] = useState('eyJhbGciOi...');

// ✅ MEJOR — Cookies HttpOnly gestionadas por el servidor
// El token nunca es accesible desde JavaScript
// next.config.js + middleware de autenticación manejan esto automáticamente
// Ver Módulo 1 para implementación completa
```

---

## 2. Protección Visual de Datos Sensibles

Cuando es necesario mostrar datos sensibles en la UI, debemos implementar técnicas de **protección visual** que minimizan la exposición.

### 2.1 Enmascaramiento de Datos

```typescript
// utils/masking.ts — Utilidades de enmascaramiento reutilizables

/**
 * Enmascara un número de tarjeta mostrando solo los últimos 4 dígitos
 * "4111 1111 1111 1234" → "**** **** **** 1234"
 */
export function enmascararTarjeta(numero: string): string {
  const limpio = numero.replace(/\s/g, '');
  if (limpio.length < 4) return '****';
  const ultimos4 = limpio.slice(-4);
  const grupos = Math.ceil((limpio.length - 4) / 4);
  const asteriscos = Array(grupos).fill('****').join(' ');
  return `${asteriscos} ${ultimos4}`;
}

/**
 * Enmascara un email: "usuario@dominio.com" → "us***@dominio.com"
 */
export function enmascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return '***';
  const visible = usuario.slice(0, 2);
  return `${visible}***@${dominio}`;
}

/**
 * Enmascara un número de documento: "12345678A" → "****5678A"
 */
export function enmascararDocumento(doc: string): string {
  if (doc.length <= 4) return '****';
  return `****${doc.slice(-4)}`;
}

/**
 * Enmascara un número de teléfono: "+34 612 345 678" → "+34 *** *** 678"
 */
export function enmascararTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, '');
  if (digits.length < 3) return '***';
  return telefono.replace(/\d(?=\d{3})/g, '*');
}

/**
 * Enmascara un IBAN: "ES91 2100 0418 4502 0005 1332" → "ES91 **** **** **** **** 1332"
 */
export function enmascararIBAN(iban: string): string {
  const limpio = iban.replace(/\s/g, '');
  const pais = limpio.slice(0, 4);
  const ultimos4 = limpio.slice(-4);
  const medio = limpio.slice(4, -4).replace(/./g, '*');
  const grupos = medio.match(/.{1,4}/g) || [];
  return `${pais} ${grupos.join(' ')} ${ultimos4}`;
}
```

### 2.2 Componente de Campo Sensible con Toggle

```tsx
// components/SensitiveField.tsx
import { useState, useCallback } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface SensitiveFieldProps {
  value: string;
  maskedValue: string;
  label: string;
  copyable?: boolean;
  className?: string;
}

export function SensitiveField({
  value,
  maskedValue,
  label,
  copyable = false,
  className = '',
}: SensitiveFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-ocultar después de 30 segundos por seguridad
  const handleToggle = useCallback(() => {
    setIsVisible(prev => {
      if (!prev) {
        setTimeout(() => setIsVisible(false), 30_000);
      }
      return !prev;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard no disponible (HTTP o sin permiso)
    }
  }, [value]);

  return (
    <div className={`flex items-center gap-2 font-mono ${className}`}>
      <span className="sr-only">{label}:</span>
      <span aria-live="polite" aria-label={isVisible ? value : `${label} oculto`}>
        {isVisible ? value : maskedValue}
      </span>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isVisible ? `Ocultar ${label}` : `Mostrar ${label}`}
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
      >
        {isVisible ? (
          <EyeSlashIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copiar ${label}`}
          className="text-xs text-blue-600 hover:underline"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      )}
    </div>
  );
}
```

### 2.3 Protección de Pantalla (Screen Capture Prevention)

```tsx
// hooks/useScreenProtection.ts
import { useEffect } from 'react';

/**
 * Agrega protección básica contra capturas de pantalla en páginas con datos sensibles.
 * Nota: No es 100% infalible, pero añade una capa de disuasión.
 */
export function useScreenProtection(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Ocultar contenido sensible cuando la pestaña pierde el foco
        document.documentElement.classList.add('data-hidden');
      } else {
        document.documentElement.classList.remove('data-hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
}

// styles/globals.css
/*
.data-hidden [data-sensitive] {
  filter: blur(8px);
  user-select: none;
}
*/
```

---

## 3. Cifrado en Tránsito: HTTPS y TLS

### 3.1 Fundamentos para Desarrolladores Frontend

Como desarrollador frontend, **no configuras TLS directamente**, pero sí tienes responsabilidades importantes:

```
Cadena de seguridad en tránsito:
┌─────────────────────────────────────────────────────────┐
│  Browser                                     Servidor   │
│  ┌──────┐  TLS Handshake  ┌───────┐         ┌───────┐  │
│  │ React│ ──────────────→ │ CDN/  │ ──────→ │ API   │  │
│  │ App  │ ←────────────── │ Edge  │ ←────── │ Server│  │
│  └──────┘  HTTPS (443)    └───────┘         └───────┘  │
│                                                         │
│  ✅ Datos cifrados en todo el recorrido                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Verificación y Forzado de HTTPS desde el Frontend

```typescript
// middleware.ts (Next.js) — Forzar HTTPS en producción
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirigir HTTP a HTTPS en producción
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  return NextResponse.next();
}
```

```typescript
// next.config.ts — Cabeceras de seguridad HTTP
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Forzar HTTPS por 1 año, incluir subdominios
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Prevenir que el navegador "adivine" el tipo de contenido
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Política de referrer estricta
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // Ajustar según necesidad
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.tuempresa.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 3.3 Fetch Seguro — Siempre Usar HTTPS

```typescript
// lib/http-client.ts — Cliente HTTP que garantiza HTTPS en producción
class SecureHttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    // Garantizar que en producción siempre usemos HTTPS
    if (process.env.NODE_ENV === 'production' && !baseURL.startsWith('https://')) {
      throw new Error(`[SecureHttpClient] URL debe usar HTTPS en producción: ${baseURL}`);
    }
    this.baseURL = baseURL;
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      // Nunca incluir cookies de terceros
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }

    return response.json();
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
```

---

## 4. Sanitización de Inputs

La sanitización del lado cliente es la **primera línea de defensa** (el servidor siempre debe validar también).

### 4.1 Prevención de XSS en Inputs

```typescript
// utils/sanitize.ts
/**
 * Sanitiza texto escapando caracteres HTML especiales.
 * Previene ataques XSS básicos al mostrar texto de usuario.
 */
export function escaparHTML(str: string): string {
  const mapa: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return String(str).replace(/[&<>"'`=/]/g, char => mapa[char]);
}

/**
 * Valida y sanitiza una URL — previene javascript: y data: URLs maliciosas
 */
export function sanitizarURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Solo permitir http y https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`[Security] URL con protocolo no permitido bloqueada: ${parsed.protocol}`);
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Elimina tags HTML de un string (para mostrar texto plano)
 */
export function eliminarHTML(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Normaliza y valida un email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim().toLowerCase());
}
```

### 4.2 Hook de Input Sanitizado

```tsx
// hooks/useSanitizedInput.ts
import { useState, useCallback } from 'react';
import { escaparHTML } from '../utils/sanitize';

type SanitizationMode = 'text' | 'email' | 'numeric' | 'alphanumeric';

interface UseSanitizedInputOptions {
  mode?: SanitizationMode;
  maxLength?: number;
  required?: boolean;
}

export function useSanitizedInput(
  initialValue: string = '',
  options: UseSanitizedInputOptions = {}
) {
  const { mode = 'text', maxLength = 500, required = false } = options;
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const sanitize = useCallback((input: string): string => {
    let sanitized = input;

    switch (mode) {
      case 'numeric':
        sanitized = input.replace(/[^0-9]/g, '');
        break;
      case 'alphanumeric':
        sanitized = input.replace(/[^a-zA-Z0-9\s]/g, '');
        break;
      case 'email':
        sanitized = input.trim().toLowerCase();
        break;
      case 'text':
      default:
        // Para texto libre, solo limitar longitud y escapar al mostrar
        sanitized = input;
        break;
    }

    return sanitized.slice(0, maxLength);
  }, [mode, maxLength]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const sanitized = sanitize(e.target.value);
    setValue(sanitized);

    // Validación inmediata
    if (required && !sanitized.trim()) {
      setError('Este campo es obligatorio');
    } else if (mode === 'email' && sanitized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      setError('Email no válido');
    } else {
      setError(null);
    }
  }, [sanitize, required, mode]);

  // El valor "seguro" para mostrar en el DOM (escapado)
  const displayValue = escaparHTML(value);

  return { value, displayValue, error, handleChange, setValue };
}
```

---

## 5. Seguridad en Formularios

### 5.1 Configuración Segura de Campos de Contraseña

```tsx
// components/PasswordInput.tsx
import { useState, useRef, useId } from 'react';

interface PasswordInputProps {
  name: string;
  label: string;
  onChange: (value: string) => void;
  showStrengthMeter?: boolean;
  autoComplete?: 'current-password' | 'new-password' | 'off';
}

function calcularFortaleza(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Muy débil', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Débil', color: 'bg-orange-500' };
  if (score <= 4) return { score, label: 'Aceptable', color: 'bg-yellow-500' };
  if (score <= 5) return { score, label: 'Fuerte', color: 'bg-blue-500' };
  return { score, label: 'Muy fuerte', color: 'bg-green-500' };
}

export function PasswordInput({
  name,
  label,
  onChange,
  showStrengthMeter = false,
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const strengthId = useId();

  const fortaleza = showStrengthMeter ? calcularFortaleza(value) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          // Evitar que gestores de contraseñas incorrectos guarden datos
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          value={value}
          onChange={handleChange}
          aria-describedby={fortaleza ? strengthId : undefined}
          className="w-full rounded border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
      {fortaleza && (
        <div id={strengthId} aria-live="polite">
          <div className="flex gap-1 mt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < fortaleza.score ? fortaleza.color : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Seguridad: <span className="font-medium">{fortaleza.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
```

### 5.2 Prevención de Autocompletado en Datos Sensibles

```tsx
// Configuración correcta de autocomplete según el contexto
// Ver: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill

// ✅ Permitir autocompletado para datos de usuario (mejora UX y seguridad)
<input type="email" autoComplete="email" />
<input type="password" autoComplete="current-password" />
<input type="text" autoComplete="given-name" />

// ✅ Contraseña nueva — el gestor de contraseñas puede sugerir una fuerte
<input type="password" autoComplete="new-password" />

// ✅ Para OTP/códigos de verificación
<input type="text" autoComplete="one-time-code" inputMode="numeric" />

// ❌ No usar autoComplete="off" en campos de contraseña — va en contra de las
// mejores prácticas de seguridad según NIST y OWASP.
// Los gestores de contraseñas son más seguros que la memoria humana.

// ✅ SÍ usar autoComplete="off" en campos que NO deben persistir
// (como campo de búsqueda con datos sensibles de sesión)
<input type="search" autoComplete="off" />
```

### 5.3 Protección CSRF en Formularios

```typescript
// En Next.js con App Router, los Server Actions tienen protección CSRF integrada.
// Para formularios tradicionales con API Routes:

// lib/csrf.ts
import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET!;

export function generarTokenCSRF(): string {
  const token = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${token}.${timestamp}`;
  const firma = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return `${payload}.${firma}`;
}

export function validarTokenCSRF(token: string): boolean {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return false;

    const [randomPart, timestamp, firma] = partes;
    const payload = `${randomPart}.${timestamp}`;
    const firmaEsperada = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');

    // Verificar firma (timing-safe comparison)
    const firmaBuffer = Buffer.from(firma, 'hex');
    const firmaEsperadaBuffer = Buffer.from(firmaEsperada, 'hex');
    if (firmaBuffer.length !== firmaEsperadaBuffer.length) return false;

    let igual = true;
    for (let i = 0; i < firmaBuffer.length; i++) {
      if (firmaBuffer[i] !== firmaEsperadaBuffer[i]) igual = false;
    }

    if (!igual) return false;

    // Verificar que el token no ha expirado (1 hora)
    const tiempoToken = parseInt(timestamp, 10);
    const ahora = Date.now();
    return ahora - tiempoToken < 3_600_000;
  } catch {
    return false;
  }
}
```

---

## 6. Patrones de Prevención de Exposición de Datos

### 6.1 Principio de Mínimo Privilegio en el Frontend

```typescript
// types/user.ts — Definir tipos con distintos niveles de acceso

// Perfil público (visible para todos)
interface PerfilPublico {
  id: string;
  nombreDisplay: string;
  avatar: string;
  fechaRegistro: string;
}

// Perfil propio (visible solo para el usuario)
interface PerfilPropio extends PerfilPublico {
  email: string; // Enmascarado: "us***@dom.com"
  telefono: string; // Enmascarado: "+34 *** *** 678"
  ultimoAcceso: string;
}

// Perfil admin (solo para administradores, con control estricto)
interface PerfilAdmin extends PerfilPropio {
  emailCompleto: string;
  telefonoCompleto: string;
  ipUltimoAcceso: string;
  intentosFallidos: number;
}

// hooks/useUserProfile.ts
export function useUserProfile(userId: string, viewerRole: string) {
  // Solo solicitar al servidor el nivel de datos necesario
  const endpoint = viewerRole === 'admin'
    ? `/api/admin/users/${userId}`
    : viewerRole === 'self'
    ? `/api/users/me`
    : `/api/users/${userId}/public`;

  return useSWR(endpoint, fetcher);
}
```

### 6.2 Limpieza de Datos al Cerrar Sesión

```typescript
// lib/session-cleanup.ts
export async function limpiarSesionCompleta(): Promise<void> {
  // 1. Limpiar estado de React (se hace en el store/contexto)

  // 2. Limpiar localStorage
  const clavesPermitidas = ['preferencias-tema', 'idioma'];
  const todasLasClaves = Object.keys(localStorage);
  todasLasClaves
    .filter(k => !clavesPermitidas.includes(k))
    .forEach(k => localStorage.removeItem(k));

  // 3. Limpiar sessionStorage completamente
  sessionStorage.clear();

  // 4. Limpiar caché de SWR/React Query
  // (se hace con la función mutate o queryClient.clear())

  // 5. Revocar el token en el servidor
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

  // 6. Redirigir al login
  window.location.href = '/login';
}
```

### 6.3 Logging Seguro

```typescript
// lib/secure-logger.ts
// Evitar que datos sensibles aparezcan en logs de consola en producción

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const CAMPOS_SENSIBLES = [
  'password', 'contraseña', 'token', 'secret', 'key',
  'tarjeta', 'card', 'cvv', 'pin', 'dni', 'ssn',
];

function redactarSensibles(obj: unknown, profundidad = 0): unknown {
  if (profundidad > 5) return '[max-depth]';
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(item => redactarSensibles(item, profundidad + 1));

  const redactado: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(obj as Record<string, unknown>)) {
    const esSecreto = CAMPOS_SENSIBLES.some(s =>
      clave.toLowerCase().includes(s)
    );
    redactado[clave] = esSecreto ? '[REDACTED]' : redactarSensibles(valor, profundidad + 1);
  }
  return redactado;
}

export const logger = {
  debug: (msg: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${msg}`, data ? redactarSensibles(data) : '');
    }
  },
  info: (msg: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${msg}`, data ? redactarSensibles(data) : '');
    }
  },
  warn: (msg: string, data?: unknown) => {
    console.warn(`[WARN] ${msg}`, data ? redactarSensibles(data) : '');
  },
  error: (msg: string, error?: unknown) => {
    // En producción, enviar a servicio de monitoreo (Sentry, Datadog)
    console.error(`[ERROR] ${msg}`, error instanceof Error ? error.message : error);
  },
};
```

---

## 7. Buenas Prácticas — Resumen

| Práctica | Descripción | Prioridad |
|---------|-------------|-----------|
| **Mínima exposición** | Solo mostrar en UI lo que el usuario necesita ver | 🔴 Crítico |
| **Enmascarar por defecto** | Datos sensibles siempre enmascarados hasta acción explícita | 🔴 Crítico |
| **No secretos en cliente** | API keys, secrets, tokens de larga duración: solo en servidor | 🔴 Crítico |
| **HTTPS siempre** | Forzar HTTPS + HSTS en producción | 🔴 Crítico |
| **Sanitizar inputs** | Validar y sanitizar antes de procesar o mostrar | 🟠 Alto |
| **Limpiar al logout** | Borrar todo el estado y caché sensible | 🟠 Alto |
| **Logs seguros** | Nunca logear datos sensibles, redactar automáticamente | 🟠 Alto |
| **CSP headers** | Content Security Policy para prevenir XSS | 🟠 Alto |
| **Autocomplete correcto** | Usar valores semánticos de autocomplete | 🟡 Medio |
| **Auto-hide** | Ocultar automáticamente datos expuestos tras un tiempo | 🟡 Medio |

---

## 🔗 Referencias

- [OWASP — Sensitive Data Exposure](https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure)
- [NIST SP 800-63B — Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [MDN — autocomplete attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete)
- [GDPR — Regulación General de Protección de Datos](https://gdpr-info.eu/)
- [Content Security Policy (W3C)](https://www.w3.org/TR/CSP3/)
- [Next.js — Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
