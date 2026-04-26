# Ejemplo Básico: Formulario de Login y AuthContext Mínimo

> **Nivel:** 🟢 Básico | **Tiempo estimado:** 30 minutos

---

## Objetivo

Construir un sistema de autenticación mínimo pero correcto: formulario de login con validación, AuthContext con estado, y una ruta protegida simple.

---

## Estructura de Archivos

```
src/
├── contexts/AuthContext.tsx
├── components/LoginForm.tsx
├── components/PrivateRoute.tsx
└── App.tsx
```

---

## Código 1: AuthContext Mínimo

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Almacenamiento en memoria (no localStorage)
let _accessToken: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Para recibir cookies httpOnly
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Credenciales incorrectas');
      }
      
      const data = await response.json();
      
      // Guardar access token en memoria (no localStorage)
      _accessToken = data.accessToken;
      
      setUser(data.user);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const logout = useCallback(() => {
    _accessToken = null;
    setUser(null);
    setError(null);
    
    // Notificar al servidor para invalidar la cookie httpOnly
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  }, []);
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

// Función auxiliar para obtener el token (para usar en las llamadas API)
export function getAccessToken(): string | null {
  return _accessToken;
}
```

---

## Código 2: Formulario de Login Simple

```tsx
// components/LoginForm.tsx
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginForm() {
  const { login, isLoading, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  
  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    
    if (!email) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email inválido';
    }
    
    if (!password) {
      errors.password = 'La contraseña es requerida';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      await login(email.trim().toLowerCase(), password);
      // Éxito: el componente padre (App.tsx) redirigirá automáticamente
    } catch {
      // El error ya se maneja en el AuthContext
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Iniciar Sesión
        </h1>
        
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Error general de autenticación */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}
          
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="usuario@empresa.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>
          
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>
          
          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded font-medium
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Código 3: Ruta Protegida Simple

```tsx
// components/PrivateRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Redirigir a login guardando la ruta original para volver después
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return <>{children}</>;
}
```

---

## Código 4: App Principal

```tsx
// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { PrivateRoute } from './components/PrivateRoute';

function Dashboard() {
  const { user, logout } = useAuth();
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Cerrar sesión
        </button>
      </div>
      <p>Bienvenido, <strong>{user?.name}</strong></p>
      <p className="text-gray-500 text-sm">{user?.email}</p>
    </div>
  );
}

function LoginPage() {
  const { isAuthenticated } = useAuth();
  
  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <LoginForm />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## ✅ Qué está bien en este ejemplo

1. **Token en memoria**: `_accessToken` es una variable de módulo, no localStorage.
2. **`credentials: 'include'`**: Permite recibir/enviar cookies httpOnly.
3. **Validación cliente**: Errores de formulario antes de enviar.
4. **Redirect después de login**: Guardando la ruta original con `state`.
5. **Logout completo**: Limpia token y notifica al servidor.
6. **Loading state**: Evita flash de contenido no autorizado.

---

*← [Volver a la Sección 1.4](../README.md) | [→ Ejemplo Intermedio](./intermedio.md)*
