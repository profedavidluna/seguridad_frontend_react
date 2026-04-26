# Ejemplo Intermedio 2.1 — Protección de Rutas Basada en Roles

## Descripción

Este ejemplo implementa un sistema completo de protección de rutas con **Control de Acceso Basado en Roles (RBAC)**. Incluye AuthContext, rutas por nivel de rol, renderizado condicional por permisos y manejo de errores 401/403.

**Conceptos cubiertos:**
- AuthContext y AuthProvider
- Protección de rutas por rol (`ADMIN`, `MANAGER`, `USER`)
- Componente `<Can>` para renderizado condicional
- Páginas de error 401 y 403
- Navegación inteligente post-login

---

## Arquitectura del Sistema

```
src/
├── context/
│   └── AuthContext.tsx       ← Estado global de autenticación
├── hooks/
│   ├── useAuth.ts
│   └── usePermissions.ts
├── components/
│   ├── PrivateRoute.tsx      ← Protección de rutas con roles
│   ├── Can.tsx               ← Renderizado condicional
│   └── Navbar.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── AdminPanel.tsx
│   ├── ManagerView.tsx
│   ├── Unauthorized.tsx      ← Página 403
│   └── SessionExpired.tsx    ← Página 401
└── App.tsx
```

---

## Código

### 1. Tipos y constantes

```tsx
// src/types/auth.ts

export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export type Permission =
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'reports:view'
  | 'reports:export'
  | 'settings:view'
  | 'settings:edit';

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  avatar?: string;
  roles: Role[];
  permisos: Permission[];
  activo: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp en segundos
}

// Mapa de permisos por defecto para cada rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'reports:view', 'reports:export',
    'settings:view', 'settings:edit',
  ],
  MANAGER: [
    'users:view', 'users:create', 'users:edit',
    'reports:view', 'reports:export',
    'settings:view',
  ],
  USER: [
    'users:view',
    'reports:view',
    'settings:view',
  ],
};
```

---

### 2. AuthContext completo

```tsx
// src/context/AuthContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, Role, Permission, AuthTokens } from '../types/auth';
import { authAPI } from '../services/authAPI';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  USER: 'auth.user',
} as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estado desde almacenamiento persistente
  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedUser = sessionStorage.getItem(STORAGE_KEYS.USER);

        if (storedToken && storedUser) {
          // Validar el token con el servidor
          const validatedUser = await authAPI.validateToken(storedToken);
          setUser(validatedUser);
          setTokens({
            accessToken: storedToken,
            refreshToken: sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '',
            expiresAt: 0,
          });
        }
      } catch {
        // Token inválido o expirado, limpiar almacenamiento
        clearStorage();
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const clearStorage = () => {
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  };

  const persistAuth = (userData: User, authTokens: AuthTokens) => {
    sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authTokens.accessToken);
    sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authTokens.refreshToken);
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
  };

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData, tokens: authTokens } = await authAPI.login(email, password);
      setUser(userData);
      setTokens(authTokens);
      persistAuth(userData, authTokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (tokens?.accessToken) {
        await authAPI.logout(tokens.accessToken);
      }
    } finally {
      setUser(null);
      setTokens(null);
      clearStorage();
    }
  }, [tokens]);

  const hasRole = useCallback(
    (role: Role) => user?.roles.includes(role) ?? false,
    [user]
  );

  const hasAnyRole = useCallback(
    (...roles: Role[]) => roles.some(r => user?.roles.includes(r)),
    [user]
  );

  const hasPermission = useCallback(
    (permission: Permission) => user?.permisos.includes(permission) ?? false,
    [user]
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        hasRole,
        hasAnyRole,
        hasPermission,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

---

### 3. Hook useAuth

```tsx
// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de un componente envuelto por <AuthProvider>.'
    );
  }
  return context;
}
```

---

### 4. Hook usePermissions

```tsx
// src/hooks/usePermissions.ts
import { useAuth } from './useAuth';

export function usePermissions() {
  const { hasRole, hasAnyRole, hasPermission } = useAuth();

  return {
    // Roles
    isAdmin:    hasRole('ADMIN'),
    isManager:  hasRole('MANAGER'),
    isUser:     hasRole('USER'),
    isAdminOrManager: hasAnyRole('ADMIN', 'MANAGER'),

    // Permisos de usuarios
    puedeVerUsuarios:    hasPermission('users:view'),
    puedeCrearUsuarios:  hasPermission('users:create'),
    puedeEditarUsuarios: hasPermission('users:edit'),
    puedeBorrarUsuarios: hasPermission('users:delete'),

    // Permisos de reportes
    puedeVerReportes:      hasPermission('reports:view'),
    puedeExportarReportes: hasPermission('reports:export'),

    // Permisos de configuración
    puedeVerConfig:    hasPermission('settings:view'),
    puedeEditarConfig: hasPermission('settings:edit'),
  };
}
```

---

### 5. PrivateRoute con soporte de roles

```tsx
// src/components/PrivateRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types/auth';
import { LoadingSpinner } from './LoadingSpinner';

interface PrivateRouteProps {
  /** Rol único requerido */
  requiredRole?: Role;
  /** Al menos uno de estos roles es requerido */
  anyRole?: Role[];
  /** Todos estos roles son requeridos */
  allRoles?: Role[];
}

export function PrivateRoute({ requiredRole, anyRole, allRoles }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();

  // Mostrar carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="auth-loading">
        <LoadingSpinner />
        <p>Verificando sesión...</p>
      </div>
    );
  }

  // No autenticado → redirigir al login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Verificar rol único
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" state={{ requiredRole }} replace />;
  }

  // Verificar cualquiera de los roles
  if (anyRole && !hasAnyRole(...anyRole)) {
    return <Navigate to="/unauthorized" state={{ anyRole }} replace />;
  }

  // Verificar todos los roles
  if (allRoles && !allRoles.every(r => hasRole(r))) {
    return <Navigate to="/unauthorized" state={{ allRoles }} replace />;
  }

  return <Outlet />;
}
```

---

### 6. Componente Can para renderizado condicional

```tsx
// src/components/Can.tsx
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Role, Permission } from '../types/auth';

interface CanProps {
  /** Mostrar si tiene este rol */
  role?: Role;
  /** Mostrar si tiene este permiso */
  permission?: Permission;
  /** Mostrar si tiene al menos uno de estos roles */
  anyRole?: Role[];
  /** Mostrar si tiene al menos uno de estos permisos */
  anyPermission?: Permission[];
  /** Mostrar si tiene TODOS estos roles */
  allRoles?: Role[];
  /** Contenido a mostrar si NO tiene acceso */
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({
  role,
  permission,
  anyRole,
  anyPermission,
  allRoles,
  fallback = null,
  children,
}: CanProps) {
  const { hasRole, hasAnyRole, hasPermission } = useAuth();

  const tieneAcceso = (() => {
    if (role && !hasRole(role)) return false;
    if (permission && !hasPermission(permission)) return false;
    if (anyRole && !hasAnyRole(...anyRole)) return false;
    if (anyPermission && !anyPermission.some(p => hasPermission(p))) return false;
    if (allRoles && !allRoles.every(r => hasRole(r))) return false;
    return true;
  })();

  return tieneAcceso ? <>{children}</> : <>{fallback}</>;
}
```

---

### 7. Configuración de rutas con roles

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';

// Páginas
import { Login }          from './pages/Login';
import { Dashboard }      from './pages/Dashboard';
import { AdminPanel }     from './pages/AdminPanel';
import { ManagerView }    from './pages/ManagerView';
import { UserProfile }    from './pages/UserProfile';
import { Unauthorized }   from './pages/Unauthorized';
import { NotFound }       from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas para cualquier usuario autenticado */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<UserProfile />} />
          </Route>

          {/* Solo MANAGER o ADMIN */}
          <Route element={<PrivateRoute anyRole={['ADMIN', 'MANAGER']} />}>
            <Route path="/gestion" element={<ManagerView />} />
            <Route path="/reportes" element={<Reports />} />
          </Route>

          {/* Solo ADMIN */}
          <Route element={<PrivateRoute requiredRole="ADMIN" />}>
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/usuarios" element={<UserManagement />} />
            <Route path="/admin/configuracion" element={<SystemConfig />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

### 8. Uso de Can en el Dashboard

```tsx
// src/pages/Dashboard.tsx
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { Can } from '../components/Can';

export function Dashboard() {
  const { user, logout } = useAuth();
  const perms = usePermissions();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <nav>
          {/* Siempre visible */}
          <a href="/dashboard">🏠 Inicio</a>
          <a href="/perfil">👤 Mi Perfil</a>

          {/* Solo si puede ver reportes */}
          <Can permission="reports:view">
            <a href="/reportes">📊 Reportes</a>
          </Can>

          {/* Solo MANAGER o ADMIN */}
          <Can anyRole={['ADMIN', 'MANAGER']}>
            <a href="/gestion">📋 Gestión</a>
          </Can>

          {/* Solo ADMIN */}
          <Can role="ADMIN">
            <a href="/admin">⚙️ Administración</a>
          </Can>
        </nav>
      </aside>

      <main>
        <header>
          <h1>Bienvenido, {user?.nombre}</h1>
          <div className="user-info">
            <span>Roles: {user?.roles.join(', ')}</span>
            <button onClick={logout}>Cerrar Sesión</button>
          </div>
        </header>

        <section className="quick-actions">
          <h2>Acciones Rápidas</h2>

          {/* Con fallback descriptivo */}
          <Can
            permission="users:create"
            fallback={
              <div className="disabled-action">
                <span>➕ Crear Usuario</span>
                <small>Requiere permiso de creación</small>
              </div>
            }
          >
            <button onClick={() => navigate('/admin/usuarios/nuevo')}>
              ➕ Crear Usuario
            </button>
          </Can>

          <Can permission="reports:export">
            <button onClick={handleExportReport}>
              📥 Exportar Reporte
            </button>
          </Can>

          <Can role="ADMIN">
            <button onClick={() => navigate('/admin/configuracion')}>
              🔧 Configuración del Sistema
            </button>
          </Can>
        </section>
      </main>
    </div>
  );
}
```

---

### 9. Página de Error 403

```tsx
// src/pages/Unauthorized.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const intentedPath = (location.state as any)?.from?.pathname;
  const requiredRole = (location.state as any)?.requiredRole;

  return (
    <div className="error-page error-403">
      <div className="error-card">
        <div className="error-icon">🚫</div>
        <h1>Acceso No Autorizado</h1>
        <p className="error-code">Error 403 — Forbidden</p>

        {user && (
          <div className="user-context">
            <p>
              Usuario: <strong>{user.email}</strong>
            </p>
            <p>
              Roles actuales:{' '}
              {user.roles.map(r => (
                <span key={r} className="role-badge">{r}</span>
              ))}
            </p>
            {requiredRole && (
              <p>
                Rol requerido:{' '}
                <span className="role-badge required">{requiredRole}</span>
              </p>
            )}
          </div>
        )}

        {intentedPath && (
          <p className="attempted-path">
            Intentaste acceder a: <code>{intentedPath}</code>
          </p>
        )}

        <p className="help-text">
          Si crees que deberías tener acceso a este recurso, contacta al
          administrador del sistema o a tu supervisor.
        </p>

        <div className="action-buttons">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            ← Volver
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Flujo de Autorización Completo

```
Petición a /admin/usuarios
         │
         ▼
    PrivateRoute
    requiredRole="ADMIN"
         │
    ┌────┴────┐
    │         │
isLoading?  No
    │         │
   Spinner  ¿Autenticado?
              │         │
             No        Sí
              │         │
         → /login   ¿Tiene rol ADMIN?
                        │         │
                       No        Sí
                        │         │
                   → /unauth  <Outlet/>
                              (renderiza UserManagement)
```

---

## Resumen de Roles y Acceso

| Ruta | USER | MANAGER | ADMIN |
|------|------|---------|-------|
| /dashboard | ✅ | ✅ | ✅ |
| /perfil | ✅ | ✅ | ✅ |
| /reportes | ❌ | ✅ | ✅ |
| /gestion | ❌ | ✅ | ✅ |
| /admin | ❌ | ❌ | ✅ |
| /admin/usuarios | ❌ | ❌ | ✅ |
| /admin/configuracion | ❌ | ❌ | ✅ |
