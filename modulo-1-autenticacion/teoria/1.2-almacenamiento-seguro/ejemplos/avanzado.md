# Ejemplo Avanzado: Gestor de Tokens Empresarial con Persistencia Segura

> **Nivel:** 🔴 Avanzado | **Tiempo estimado:** 75 minutos

---

## Objetivo

Implementar un gestor de tokens de nivel empresarial que combine almacenamiento en memoria con persistencia segura del estado de sesión (sin almacenar el token) y soporte para Service Workers que interceptan requests.

---

## Arquitectura Avanzada

```
┌──────────────────────────────────────────────────────────────────────┐
│                    GESTOR DE TOKENS AVANZADO                         │
│                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │  MemoryTokenStore│    │ SessionPersistor │    │ TokenEncryptor │  │
│  │  (access token)  │    │ (estado, NO token│    │ (encriptación  │  │
│  │  Vive en RAM     │    │  en sessionStor) │    │  AES-GCM)      │  │
│  └─────────────────┘    └──────────────────┘    └────────────────┘  │
│           │                      │                       │           │
│           └──────────────────────┴───────────────────────┘           │
│                                  │                                   │
│                    ┌─────────────▼──────────────┐                    │
│                    │      TokenManager           │                    │
│                    │  (fachada principal)        │                    │
│                    └─────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Código 1: Encriptación de Tokens con Web Crypto API

Si tienes un caso de uso donde necesitas persistir el token (ej: SSO con múltiples dominios), usa la **Web Crypto API** para encriptarlo:

```typescript
// lib/token-encryptor.ts

/**
 * Encripta y desencripta datos usando AES-GCM (cifrado autenticado).
 * Usa la Web Crypto API nativa del navegador (sin dependencias externas).
 * 
 * NOTA: Esto NO es 100% seguro — si el atacante tiene XSS, puede
 * ejecutar código en tu contexto y usar las mismas funciones para
 * desencriptar. Úsalo como capa adicional, no como solución única.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits

async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // No exportable (la clave vive solo en memoria)
    ['encrypt', 'decrypt']
  );
}

// Clave generada una vez por sesión — vive en memoria
let sessionKey: CryptoKey | null = null;

async function getOrCreateKey(): Promise<CryptoKey> {
  if (!sessionKey) {
    sessionKey = await generateEncryptionKey();
  }
  return sessionKey;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV aleatorio de 96 bits
  
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );
  
  // Combinar IV + ciphertext y codificar como base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedBase64: string): Promise<string | null> {
  try {
    const key = await getOrCreateKey();
    
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch {
    return null; // Token inválido o clave diferente (nueva sesión)
  }
}
```

---

## Código 2: Gestor de Estado de Sesión (sin el token)

```typescript
// lib/session-state.ts

/**
 * Persiste el ESTADO de la sesión (usuario, roles, expiración)
 * pero NUNCA el token en sí.
 * 
 * Esto permite mantener la UI consistente (nombre de usuario, roles)
 * entre recargas sin exponer el token a vulnerabilidades de storage.
 */

interface SessionState {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  tokenExpiresAt: number; // Timestamp Unix
  lastActivity: number;   // Para detectar inactividad
}

const SESSION_STATE_KEY = 'session_state';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos

export const sessionStateManager = {
  save(state: SessionState): void {
    // Verificar que no estamos guardando el token
    if ('token' in state || 'accessToken' in state || 'refreshToken' in state) {
      console.error('⛔ Intento de guardar token en sessionStorage bloqueado');
      return;
    }
    
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify({
      ...state,
      lastActivity: Date.now(),
    }));
  },
  
  load(): SessionState | null {
    try {
      const raw = sessionStorage.getItem(SESSION_STATE_KEY);
      if (!raw) return null;
      
      const state = JSON.parse(raw) as SessionState;
      
      // Verificar inactividad
      const timeSinceActivity = Date.now() - state.lastActivity;
      if (timeSinceActivity > INACTIVITY_TIMEOUT) {
        this.clear();
        return null;
      }
      
      return state;
    } catch {
      return null;
    }
  },
  
  updateActivity(): void {
    const state = this.load();
    if (state) {
      this.save({ ...state, lastActivity: Date.now() });
    }
  },
  
  clear(): void {
    sessionStorage.removeItem(SESSION_STATE_KEY);
  },
};
```

---

## Código 3: TokenManager Completo y Unificado

```typescript
// lib/secure-token-manager.ts
import { sessionStateManager } from './session-state';

interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  roles: string[];
  exp: number;
}

function parseTokenPayload(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

class SecureTokenManager {
  private accessToken: string | null = null;
  private refreshCallbacks: Array<() => Promise<void>> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * Almacena el access token en memoria y configura el estado de sesión.
   */
  setToken(token: string): void {
    this.accessToken = token;
    
    const payload = parseTokenPayload(token);
    if (!payload) return;
    
    // Persistir estado (no el token) en sessionStorage
    sessionStateManager.save({
      userId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      roles: payload.roles,
      tokenExpiresAt: payload.exp,
      lastActivity: Date.now(),
    });
    
    // Programar renovación automática (30s antes de expirar)
    this.scheduleRefresh(payload.exp);
  }
  
  getToken(): string | null {
    return this.accessToken;
  }
  
  getSessionState() {
    return sessionStateManager.load();
  }
  
  /**
   * Verifica si hay una sesión persistida (para mostrar UI correcta
   * mientras se renueva el token al recargar la página).
   */
  hasCachedSession(): boolean {
    return sessionStateManager.load() !== null;
  }
  
  clearToken(): void {
    this.accessToken = null;
    sessionStateManager.clear();
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * Registra un callback que se ejecutará cuando el token esté
   * por expirar (30 segundos antes).
   */
  onRefreshNeeded(callback: () => Promise<void>): () => void {
    this.refreshCallbacks.push(callback);
    return () => {
      this.refreshCallbacks = this.refreshCallbacks.filter(cb => cb !== callback);
    };
  }
  
  private scheduleRefresh(expTimestamp: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    const msUntilExpiry = expTimestamp * 1000 - Date.now();
    const msUntilRefresh = msUntilExpiry - 30000; // 30 segundos antes
    
    if (msUntilRefresh <= 0) {
      // Ya debe renovarse
      this.triggerRefresh();
      return;
    }
    
    this.refreshTimer = setTimeout(() => {
      this.triggerRefresh();
    }, msUntilRefresh);
  }
  
  private async triggerRefresh(): Promise<void> {
    for (const callback of this.refreshCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Error en callback de renovación de token:', error);
      }
    }
  }
}

// Exportar como singleton
export const secureTokenManager = new SecureTokenManager();
```

---

## Código 4: Uso en el AuthProvider con Restauración de Sesión

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { secureTokenManager } from '../lib/secure-token-manager';
import { authService } from '../services/auth.service';

interface SessionState {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  tokenExpiresAt: number;
  lastActivity: number;
}

interface AuthContextValue {
  user: SessionState | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionState | null>(null);
  
  const handleLogout = useCallback(async () => {
    await authService.logout();
    secureTokenManager.clearToken();
    setUser(null);
  }, []);
  
  // Renovación silenciosa cuando el token está por expirar
  const renewToken = useCallback(async () => {
    try {
      const { accessToken } = await authService.refreshToken();
      secureTokenManager.setToken(accessToken);
      const state = secureTokenManager.getSessionState();
      if (state) setUser(state);
    } catch {
      await handleLogout();
    }
  }, [handleLogout]);
  
  // Registrar callback de renovación
  useEffect(() => {
    const unsubscribe = secureTokenManager.onRefreshNeeded(renewToken);
    return unsubscribe;
  }, [renewToken]);
  
  // Inicialización: intentar restaurar sesión
  useEffect(() => {
    const initialize = async () => {
      // Si hay estado de sesión cacheado, mostrar la UI mientras renovamos
      const cachedState = secureTokenManager.getSessionState();
      if (cachedState) {
        setUser(cachedState); // Mostrar usuario inmediatamente (mejor UX)
      }
      
      // Intentar renovar el token (usa la cookie httpOnly automáticamente)
      try {
        const { accessToken } = await authService.refreshToken();
        secureTokenManager.setToken(accessToken);
        const freshState = secureTokenManager.getSessionState();
        setUser(freshState);
      } catch {
        // No hay sesión válida
        secureTokenManager.clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: userData } = await authService.login({ email, password });
    secureTokenManager.setToken(accessToken);
    setUser(secureTokenManager.getSessionState());
    void userData; // userData está disponible si necesitas usarlo
  }, []);
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout: handleLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requiere AuthProvider');
  return ctx;
};
```

---

## 🔑 Resumen de la Estrategia

```
Token          | Almacenamiento        | Protección
──────────────────────────────────────────────────────
Access Token   | Variable JS (RAM)     | XSS: ✅ Alto
               |                       | CSRF: ✅ No enviado auto
               |                       |
Refresh Token  | httpOnly Cookie       | XSS: ✅ No accesible por JS
               |                       | CSRF: ✅ SameSite=Strict
               |                       |
Estado sesión  | sessionStorage        | Sin token, solo metadata
               | (solo metadata)       | Para mejorar UX al recargar
```

---

*← [Ejemplo Intermedio](./intermedio.md) | [→ Ejercicios](../ejercicios.md)*
