# 1.4 Implementación Práctica: Sistema de Autenticación Empresarial

> **Sección:** 1.4 | **Duración:** 2 horas | **Nivel:** Avanzado

---

## 📖 Introducción

Esta sección integra todos los conceptos del módulo para construir un sistema de autenticación de nivel empresarial. Iremos desde la estructura del formulario de login hasta el contexto global de autenticación, pasando por la gestión de sesiones, el logout seguro y el manejo de errores.

---

## 🏗️ Arquitectura del Sistema de Autenticación

```
┌──────────────────────────────────────────────────────────────────────┐
│                  ARQUITECTURA DE AUTENTICACIÓN                       │
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐ │
│  │  LoginPage  │    │  AuthContext │    │    API (Backend)        │ │
│  │             │───>│              │    │                         │ │
│  │  - Form     │    │  - user      │    │  POST /auth/login       │ │
│  │  - Validate │    │  - isAuth    │    │  POST /auth/refresh     │ │
│  │  - Submit   │    │  - isLoading │    │  POST /auth/logout      │ │
│  └─────────────┘    │  - login()   │    │  GET  /auth/me          │ │
│                      │  - logout()  │    └─────────────────────────┘ │
│  ┌─────────────┐    │  - hasRole() │                                 │
│  │ ProtectedRoute    └──────────────┘                                │
│  │ Component   │           │                                         │
│  │             │    ┌──────▼───────┐                                 │
│  │  - Check    │    │  TokenMgr    │                                 │
│  │    auth     │    │  (memoria)   │                                 │
│  │  - Redirect │    └──────────────┘                                 │
│  └─────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
src/
├── auth/
│   ├── AuthContext.tsx          ← Context global de autenticación
│   ├── AuthProvider.tsx         ← Provider con toda la lógica
│   ├── useAuth.ts               ← Hook principal
│   ├── useAuthGuard.ts          ← Hook para proteger rutas
│   └── types.ts                 ← Tipos TypeScript de autenticación
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx        ← Formulario de login
│   │   ├── LogoutButton.tsx     ← Botón de cierre de sesión
│   │   └── ProtectedRoute.tsx   ← Componente guardián de rutas
│   └── ui/
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
├── lib/
│   ├── api-client.ts            ← Axios con interceptores
│   ├── token-manager.ts         ← Gestión de tokens en memoria
│   └── auth-api.ts              ← Llamadas HTTP de auth
├── hooks/
│   ├── useLoginForm.ts          ← Lógica del formulario
│   └── useSessionTimeout.ts    ← Timeout por inactividad
└── pages/ (o app/ para Next.js)
    ├── login.tsx
    ├── dashboard.tsx
    └── _app.tsx                 ← Envolver con AuthProvider
```

---

## 🔐 Implementación del Sistema de Login

### Paso 1: Tipos TypeScript

```typescript
// auth/types.ts

export interface LoginCredentials {
  email: string;
  password: string;
  rememberDevice?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  permissions: string[];
  tenantId?: string;
  avatarUrl?: string;
}

export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer' | 'user';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshSession: () => Promise<boolean>;
}

export interface LogoutOptions {
  reason?: 'user_action' | 'session_expired' | 'inactivity' | 'security';
  redirectTo?: string;
}

export interface AuthError {
  code: string;
  message: string;
  retryAfter?: number; // Para rate limiting
}
```

### Paso 2: Formulario de Login Seguro

```tsx
// components/auth/LoginForm.tsx
import React, { useState, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import type { LoginCredentials } from '../../auth/types';

interface LoginFormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validateLoginForm(values: LoginFormState): FormErrors {
  const errors: FormErrors = {};
  
  // Validar email
  if (!values.email) {
    errors.email = 'El correo electrónico es requerido';
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors.email = 'El correo electrónico no es válido';
  }
  
  // Validar contraseña
  if (!values.password) {
    errors.password = 'La contraseña es requerida';
  } else if (values.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }
  
  return errors;
}

export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  
  const [formValues, setFormValues] = useState<LoginFormState>({
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  
  const MAX_ATTEMPTS = 5;
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo al escribir
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Limpiar error general
    if (error) clearError();
  }, [formErrors, error, clearError]);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLockedOut) return;
    
    // Validar el formulario
    const errors = validateLoginForm(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      const credentials: LoginCredentials = {
        email: formValues.email.trim().toLowerCase(),
        password: formValues.password,
      };
      
      await login(credentials);
      // Si el login es exitoso, el AuthContext redirigirá automáticamente
      
    } catch (err) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // Lockout después de MAX_ATTEMPTS intentos fallidos
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLockedOut(true);
        setTimeout(() => {
          setIsLockedOut(false);
          setLoginAttempts(0);
        }, 15 * 60 * 1000); // 15 minutos
      }
      
      // El error se maneja en el AuthContext — no necesitamos hacer nada más aquí
    }
  }, [formValues, login, loginAttempts, isLockedOut]);
  
  if (isLockedOut) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
        <h3 className="text-red-800 font-semibold">Cuenta temporalmente bloqueada</h3>
        <p className="text-red-600 text-sm mt-1">
          Demasiados intentos fallidos. Por favor, espera 15 minutos antes de intentar de nuevo.
        </p>
      </div>
    );
  }
  
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Formulario de inicio de sesión"
      className="space-y-4"
    >
      {/* Mostrar error general (credenciales inválidas, error de red, etc.) */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
        >
          {error}
        </div>
      )}
      
      {/* Campo de email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formValues.email}
          onChange={handleChange}
          aria-invalid={!!formErrors.email}
          aria-describedby={formErrors.email ? 'email-error' : undefined}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2
            ${formErrors.email
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
            }`}
        />
        {formErrors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {formErrors.email}
          </p>
        )}
      </div>
      
      {/* Campo de contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={formValues.password}
            onChange={handleChange}
            aria-invalid={!!formErrors.password}
            aria-describedby={formErrors.password ? 'password-error' : undefined}
            className={`block w-full rounded-md border px-3 py-2 pr-10 shadow-sm focus:outline-none focus:ring-2
              ${formErrors.password
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
              }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {formErrors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
            {formErrors.password}
          </p>
        )}
      </div>
      
      {/* Indicador de intentos fallidos */}
      {loginAttempts > 0 && loginAttempts < MAX_ATTEMPTS && (
        <p className="text-sm text-amber-600">
          ⚠️ {MAX_ATTEMPTS - loginAttempts} intento(s) restante(s) antes del bloqueo temporal.
        </p>
      )}
      
      {/* Botón de submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm
          text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Iniciando sesión...
          </span>
        ) : 'Iniciar sesión'}
      </button>
    </form>
  );
}
```

---

## 🔓 Logout Seguro

```typescript
// lib/auth-api.ts
import { apiClient } from './api-client';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  
  logout: async () => {
    try {
      // Notificar al servidor para invalidar el refresh token
      await apiClient.post('/auth/logout');
    } catch {
      // Incluso si el servidor falla, hacer logout en el cliente
      console.warn('Server logout failed, performing client-side logout');
    }
  },
  
  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
  
  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};
```

---

## 🧭 Manejo de Sesiones

```typescript
// Gestión del ciclo de vida de la sesión:

// 1. Al iniciar la aplicación:
//    → Intentar restaurar la sesión con el refresh token (cookie httpOnly)
//    → Si existe, obtener un nuevo access token
//    → Si no existe, mostrar la pantalla de login

// 2. Durante el uso:
//    → El access token se renueva automáticamente 30s antes de expirar
//    → El interceptor de Axios maneja los 401 automáticamente
//    → El timer de inactividad cierra la sesión tras 30 minutos sin actividad

// 3. Al cerrar sesión:
//    → Notificar al servidor (invalidar refresh token en DB)
//    → Limpiar el access token de memoria
//    → El servidor borra la cookie httpOnly
//    → Redirigir a login
//    → Notificar a otras pestañas (BroadcastChannel)
```

---

## 🛡️ Mejores Prácticas de Implementación

### 1. Manejo de Errores de Autenticación

```typescript
// Mapear códigos de error del servidor a mensajes amigables en español
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo electrónico o contraseña incorrectos.',
  ACCOUNT_LOCKED: 'Tu cuenta está bloqueada. Contacta a soporte.',
  ACCOUNT_DISABLED: 'Tu cuenta ha sido desactivada.',
  TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
  SERVER_ERROR: 'Error del servidor. Por favor, intenta más tarde.',
};

function getAuthErrorMessage(errorCode: string): string {
  return AUTH_ERROR_MESSAGES[errorCode] ?? 'Ha ocurrido un error. Por favor, intenta de nuevo.';
}
```

### 2. Prevenir Ataques de Timing

```typescript
// El servidor debe tardar el mismo tiempo tanto en logins exitosos como fallidos
// para prevenir que un atacante determine si un email existe en el sistema

// ❌ MAL: Diferente tiempo de respuesta revela si el email existe
async function loginVulnerable(email: string, password: string) {
  const user = await db.findUserByEmail(email);
  if (!user) return null; // Respuesta rápida → el email no existe
  return await bcrypt.compare(password, user.passwordHash);
}

// ✅ BIEN: Tiempo constante de respuesta
async function loginSecure(email: string, password: string) {
  const user = await db.findUserByEmail(email);
  const dummyHash = '$2b$10$invalidHashForTimingPrevention';
  const passwordToCheck = user?.passwordHash ?? dummyHash;
  
  // bcrypt.compare siempre tarda el mismo tiempo
  const isValid = await bcrypt.compare(password, passwordToCheck);
  
  if (!user || !isValid) return null;
  return user;
}
```

### 3. Limpiar Estado Sensible

```typescript
// Al hacer logout, asegurarse de limpiar TODO el estado sensible
function performCompleteLogout() {
  // 1. Limpiar tokens
  tokenManager.clearAccessToken();
  
  // 2. Limpiar estado de la aplicación
  queryClient.clear(); // React Query cache
  
  // 3. Limpiar sessionStorage (estado de sesión sin tokens)
  sessionStorage.clear();
  
  // 4. Limpiar cualquier dato sensible en memoria
  // (setState de componentes se limpia automáticamente al remontar)
  
  // 5. Cancelar requests pendientes
  abortController.abort();
  
  // 6. Notificar a otras pestañas
  authBroadcastChannel.postMessage({ type: 'LOGOUT' });
}
```

---

## 🔗 Referencias

- [React Context API](https://react.dev/reference/react/useContext)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [WCAG 2.1 - Accessibility in Forms](https://www.w3.org/WAI/WCAG21/Understanding/)

---

## 📂 Ejemplos y Ejercicios

- [📄 Ejemplo Básico: Login Form simple](./ejemplos/basico.md)
- [📄 Ejemplo Intermedio: AuthContext con interceptores](./ejemplos/intermedio.md)
- [📄 Ejemplo Avanzado: Sistema completo empresarial](./ejemplos/avanzado.md)
- [📝 Ejercicios Prácticos](./ejercicios.md)

---

*← [Sección 1.3: Vulnerabilidades](../1.3-vulnerabilidades/README.md) | [→ Módulo 2: Autorización](../../../modulo-2-autorizacion/README.md)*
