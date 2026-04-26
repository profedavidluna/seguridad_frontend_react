# Ejemplo Básico: Decodificación de un JWT

> **Nivel:** 🟢 Básico | **Tiempo estimado:** 20 minutos

---

## Objetivo

Entender la estructura de un JWT decodificándolo manualmente y mediante código, sin usar librerías externas.

---

## Concepto Previo

Un JWT es simplemente tres bloques de texto separados por puntos. Cada bloque es un objeto JSON codificado en **Base64URL** (con excepción de la firma, que es binaria codificada en Base64URL).

```
HEADER.PAYLOAD.SIGNATURE
  ↓       ↓        ↓
Base64  Base64   Binario
URL     URL     (no legible sin la clave)
```

---

## Ejemplo: Token Real

Vamos a trabajar con este JWT de ejemplo:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzIiwiZW1haWwiOiJqdWFuQGVtcHJlc2EuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sImlhdCI6MTcxNjIzNTQyMiwiZXhwIjoxNzE2MjM5MDIyfQ.firma_aqui
```

---

## Código 1: Decodificación Manual en JavaScript (Vanilla)

```javascript
// jwt-decoder.js
// Sin dependencias externas — funciona en el navegador y en Node.js

/**
 * Decodifica la parte Base64URL de un JWT.
 * Base64URL es como Base64 pero reemplaza '+' con '-' y '/' con '_'
 * y omite el padding '='.
 */
function base64UrlDecode(base64Url) {
  // Reemplazar caracteres Base64URL a Base64 estándar
  const base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Agregar padding si es necesario
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  
  // Decodificar
  const decoded = atob(padded);
  
  // Convertir a UTF-8 correctamente (para caracteres especiales)
  return decodeURIComponent(
    decoded
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Parsea y decodifica un JWT mostrando sus tres partes.
 * IMPORTANTE: Solo decodifica, NO verifica la firma.
 */
function parseJWT(token) {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Formato de JWT inválido: se esperan exactamente 3 partes separadas por "."');
  }
  
  const [encodedHeader, encodedPayload, signature] = parts;
  
  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    return {
      header,
      payload,
      signature: signature, // La firma NO es JSON, es binario codificado
      raw: {
        header: encodedHeader,
        payload: encodedPayload,
        signature: signature,
      }
    };
  } catch (error) {
    throw new Error(`Error al decodificar JWT: ${error.message}`);
  }
}

// ─── EJEMPLO DE USO ──────────────────────────────────────────────────────────

const miToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzIiwiZW1haWwiOiJqdWFuQGVtcHJlc2EuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sImlhdCI6MTcxNjIzNTQyMiwiZXhwIjoxNzE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const decoded = parseJWT(miToken);

console.log('=== HEADER ===');
console.log(JSON.stringify(decoded.header, null, 2));
// Output:
// {
//   "alg": "HS256",
//   "typ": "JWT"
// }

console.log('\n=== PAYLOAD ===');
console.log(JSON.stringify(decoded.payload, null, 2));
// Output:
// {
//   "sub": "usr_abc123",
//   "email": "juan@empresa.com",
//   "roles": ["admin", "user"],
//   "iat": 1716235422,
//   "exp": 1716239022
// }

console.log('\n=== INFORMACIÓN ÚTIL ===');
const { payload } = decoded;

// Mostrar fecha de creación
const createdAt = new Date(payload.iat * 1000);
console.log(`Creado: ${createdAt.toLocaleString('es-ES')}`);

// Mostrar fecha de expiración
const expiresAt = new Date(payload.exp * 1000);
console.log(`Expira: ${expiresAt.toLocaleString('es-ES')}`);

// Verificar si está expirado (solo verificación local, NO reemplaza verificación del servidor)
const isExpired = Date.now() > payload.exp * 1000;
console.log(`¿Expirado? ${isExpired ? '⛔ SÍ' : '✅ NO'}`);

// Calcular tiempo restante
const remainingMs = (payload.exp * 1000) - Date.now();
const remainingMin = Math.floor(remainingMs / 60000);
console.log(`Tiempo restante: ${remainingMin} minutos`);
```

---

## Código 2: Hook de React para Leer el Token

```tsx
// hooks/useJWTInfo.ts
import { useMemo } from 'react';

interface JWTPayload {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
  [key: string]: unknown; // Permite claims adicionales
}

interface JWTInfo {
  payload: JWTPayload | null;
  isExpired: boolean;
  expiresAt: Date | null;
  remainingMinutes: number;
}

function decodePayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '='));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function useJWTInfo(token: string | null): JWTInfo {
  return useMemo(() => {
    if (!token) {
      return { payload: null, isExpired: true, expiresAt: null, remainingMinutes: 0 };
    }
    
    const payload = decodePayload(token);
    
    if (!payload) {
      return { payload: null, isExpired: true, expiresAt: null, remainingMinutes: 0 };
    }
    
    const expiresAt = new Date(payload.exp * 1000);
    const isExpired = Date.now() > payload.exp * 1000;
    const remainingMinutes = Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 60000));
    
    return { payload, isExpired, expiresAt, remainingMinutes };
  }, [token]);
}
```

---

## Código 3: Componente de Visualización

```tsx
// components/JWTViewer.tsx
import React from 'react';
import { useJWTInfo } from '../hooks/useJWTInfo';

interface JWTViewerProps {
  token: string | null;
}

export function JWTViewer({ token }: JWTViewerProps) {
  const { payload, isExpired, expiresAt, remainingMinutes } = useJWTInfo(token);
  
  if (!token) {
    return <div className="text-gray-500">No hay token activo</div>;
  }
  
  if (!payload) {
    return <div className="text-red-500">⛔ Token inválido o mal formado</div>;
  }
  
  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm">
      <h3 className="text-green-400 font-bold mb-3">🔍 Información del Token JWT</h3>
      
      {/* Estado del token */}
      <div className={`mb-3 p-2 rounded ${isExpired ? 'bg-red-900' : 'bg-green-900'}`}>
        {isExpired ? '⛔ Token EXPIRADO' : `✅ Token válido — ${remainingMinutes} min restantes`}
      </div>
      
      {/* Datos del usuario */}
      <div className="mb-3">
        <span className="text-yellow-400">Subject:</span> {payload.sub}
      </div>
      <div className="mb-3">
        <span className="text-yellow-400">Email:</span> {payload.email}
      </div>
      
      {/* Roles */}
      <div className="mb-3">
        <span className="text-yellow-400">Roles:</span>{' '}
        {payload.roles?.map(role => (
          <span key={role} className="bg-blue-800 text-blue-200 px-2 py-0.5 rounded mr-1 text-xs">
            {role}
          </span>
        ))}
      </div>
      
      {/* Fechas */}
      <div className="text-gray-400 text-xs mt-3 border-t border-gray-700 pt-3">
        <div>Emitido: {new Date(payload.iat * 1000).toLocaleString('es-ES')}</div>
        <div>Expira: {expiresAt?.toLocaleString('es-ES')}</div>
      </div>
    </div>
  );
}
```

---

## 🧪 Pruébalo en JWT.io

Visita [https://jwt.io/](https://jwt.io/) y pega este token para verlo decodificado visualmente:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzIiwiZW1haWwiOiJqdWFuQGVtcHJlc2EuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sImlhdCI6MTcxNjIzNTQyMiwiZXhwIjoxNzE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## ⚠️ Advertencias de Seguridad

> 🔴 **NUNCA uses la decodificación del frontend para tomar decisiones de seguridad.**
> 
> La decodificación sin verificación de firma que se muestra aquí sirve para:
> - Leer el nombre del usuario para mostrarlo en la UI
> - Verificar si el token está por expirar (para mostrar advertencia)
> - Obtener roles para adaptar la interfaz
> 
> El backend SIEMPRE debe verificar la firma antes de confiar en cualquier claim.

---

*← [Volver a la Sección 1.1](../README.md) | [→ Ejemplo Intermedio](./intermedio.md)*
