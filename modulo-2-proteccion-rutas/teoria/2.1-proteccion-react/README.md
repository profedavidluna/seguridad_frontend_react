# 2.1 — Protección de Rutas en React

## Introducción

La protección de rutas es uno de los pilares fundamentales de la seguridad en aplicaciones SPA (Single Page Application). En React, el enrutamiento del lado del cliente permite navegar entre vistas sin recargar la página, pero esto también significa que debemos controlar activamente qué partes de la aplicación puede ver cada usuario.

> **Importante:** La protección de rutas en el cliente es una medida de **experiencia de usuario (UX)**. Un atacante con acceso a DevTools puede modificar el estado del cliente. La validación real debe ocurrir **siempre en el servidor**.

---

## 1. Concepto de Rutas Privadas

Una **ruta privada** (o ruta protegida) es aquella que solo puede ser accedida por usuarios que cumplen ciertos criterios:

1. **Autenticados:** El usuario ha iniciado sesión (tiene un token o sesión válida)
2. **Autorizados:** El usuario tiene los permisos necesarios para acceder al recurso
3. **Activos:** La sesión no ha expirado

### Flujo de una Ruta Privada

```
Usuario navega a /dashboard
        │
        ▼
¿Está autenticado?
   │          │
  NO         SÍ
   │          │
   ▼          ▼
Redirigir  ¿Tiene el rol requerido?
a /login      │              │
             NO             SÍ
              │              │
              ▼              ▼
         Redirigir      Renderizar
         a /403         el componente
```

### Tipos de Protección

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Autenticación** | Requiere sesión iniciada | Cualquier página del dashboard |
| **Autorización por rol** | Requiere un rol específico | Panel de administración |
| **Autorización por permiso** | Requiere un permiso granular | Botón de "eliminar usuario" |
| **Propiedad del recurso** | Solo el dueño puede acceder | Perfil de usuario propio |

---

## 2. Implementación con React Router v6

### 2.1 Instalación

```bash
npm install react-router-dom
# o con yarn
yarn add react-router-dom
```

### 2.2 Estructura Básica de Enrutamiento

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas privadas - solo usuarios autenticados */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* Rutas privadas con rol específico */}
          <Route element={<PrivateRoute requiredRole="ADMIN" />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 2.3 Componente PrivateRoute (Patrón Outlet)

En React Router v6, el patrón recomendado usa `<Outlet />` en lugar de wrapping:

```tsx
// src/components/PrivateRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PrivateRouteProps {
  requiredRole?: string;
}

export function PrivateRoute({ requiredRole }: PrivateRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Mostrar spinner mientras se verifica la autenticación
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Si no está autenticado, redirigir al login
  // Guardar la ruta original para redirigir después del login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si requiere un rol específico y el usuario no lo tiene
  if (requiredRole && !user?.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // El usuario está autenticado y autorizado: renderizar las rutas hijas
  return <Outlet />;
}
```

### 2.4 Hook `useAuth`

```tsx
// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
```

### 2.5 AuthContext

```tsx
// src/context/AuthContext.tsx
import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  nombre: string;
  roles: string[];
  permisos: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si existe una sesión al cargar la aplicación
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const userData = await authService.validateToken(token);
          setUser(userData);
        }
      } catch {
        localStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: userData, token } = await authService.login(email, password);
    localStorage.setItem('accessToken', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const hasRole = (role: string) => {
    return user?.roles.includes(role) ?? false;
  };

  const hasPermission = (permission: string) => {
    return user?.permisos.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 3. Renderizado Condicional por Rol

Además de proteger rutas completas, muchas veces necesitamos mostrar u ocultar elementos dentro de una misma página según el rol del usuario.

### 3.1 Componente `<Can />`

```tsx
// src/components/Can.tsx
import { useAuth } from '../hooks/useAuth';
import { ReactNode } from 'react';

interface CanProps {
  role?: string;
  permission?: string;
  roles?: string[];
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({
  role,
  permission,
  roles,
  permissions,
  fallback = null,
  children,
}: CanProps) {
  const { hasRole, hasPermission } = useAuth();

  const canAccess = (() => {
    // Verificar rol único
    if (role && !hasRole(role)) return false;
    // Verificar permiso único
    if (permission && !hasPermission(permission)) return false;
    // Verificar que tenga AL MENOS UNO de los roles
    if (roles && !roles.some(r => hasRole(r))) return false;
    // Verificar que tenga AL MENOS UNO de los permisos
    if (permissions && !permissions.some(p => hasPermission(p))) return false;
    return true;
  })();

  return canAccess ? <>{children}</> : <>{fallback}</>;
}
```

### 3.2 Uso del componente `<Can />`

```tsx
// src/pages/Dashboard.tsx
import { Can } from '../components/Can';

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Solo visible para ADMIN */}
      <Can role="ADMIN">
        <button>Gestionar Usuarios</button>
      </Can>

      {/* Visible para ADMIN o MANAGER */}
      <Can roles={['ADMIN', 'MANAGER']}>
        <section>Reportes Avanzados</section>
      </Can>

      {/* Con fallback */}
      <Can
        permission="reports:export"
        fallback={<p>No tienes permiso para exportar reportes.</p>}
      >
        <button>Exportar Reportes</button>
      </Can>
    </div>
  );
}
```

### 3.3 Hook `usePermissions`

```tsx
// src/hooks/usePermissions.ts
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user, hasRole, hasPermission } = useAuth();

  return {
    isAdmin: hasRole('ADMIN'),
    isManager: hasRole('MANAGER'),
    isUser: hasRole('USER'),
    canCreateUsers: hasPermission('users:create'),
    canDeleteUsers: hasPermission('users:delete'),
    canViewReports: hasPermission('reports:view'),
    canExportReports: hasPermission('reports:export'),
    hasAnyRole: (...roles: string[]) => roles.some(r => hasRole(r)),
    hasAllRoles: (...roles: string[]) => roles.every(r => hasRole(r)),
  };
}
```

---

## 4. Manejo de Estados No Autorizados (401/403)

### 4.1 Diferencia entre 401 y 403

| Código | Significado | Causa | Acción recomendada |
|--------|-------------|-------|-------------------|
| **401 Unauthorized** | No autenticado | Token ausente, expirado o inválido | Redirigir a `/login` |
| **403 Forbidden** | No autorizado | El usuario está autenticado pero no tiene permisos | Mostrar página de acceso denegado |

### 4.2 Página 401 — Sesión Expirada

```tsx
// src/pages/SessionExpired.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function SessionExpired() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleRelogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="error-page">
      <div className="error-content">
        <span className="error-icon">⏰</span>
        <h1>Sesión Expirada</h1>
        <p>Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.</p>
        <button onClick={handleRelogin} className="btn-primary">
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
}
```

### 4.3 Página 403 — Acceso Denegado

```tsx
// src/pages/Unauthorized.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const attemptedPath = (location.state as any)?.from?.pathname || 'recurso';

  return (
    <div className="error-page">
      <div className="error-content">
        <span className="error-icon">🚫</span>
        <h1>Acceso Denegado (403)</h1>
        <p>
          Hola <strong>{user?.nombre}</strong>, no tienes los permisos necesarios
          para acceder a <code>{attemptedPath}</code>.
        </p>
        <p>Si crees que esto es un error, contacta al administrador del sistema.</p>
        <div className="button-group">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Volver
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 Manejo Global de Errores HTTP

```tsx
// src/components/ErrorBoundaryHTTP.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpEventEmitter } from '../services/apiClient';

export function HTTPErrorHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle401 = () => {
      navigate('/session-expired');
    };

    const handle403 = (path: string) => {
      navigate('/unauthorized', { state: { from: { pathname: path } } });
    };

    httpEventEmitter.on('401', handle401);
    httpEventEmitter.on('403', handle403);

    return () => {
      httpEventEmitter.off('401', handle401);
      httpEventEmitter.off('403', handle403);
    };
  }, [navigate]);

  return null; // Componente sin UI, solo lógica
}
```

---

## 5. Higher-Order Components (HOC) para Protección

Los HOCs son una técnica avanzada que permite envolver componentes con lógica de autorización reutilizable.

### 5.1 HOC `withAuth`

```tsx
// src/hoc/withAuth.tsx
import { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AuthOptions {
  requiredRole?: string;
  requiredPermission?: string;
  redirectTo?: string;
}

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: AuthOptions = {}
) {
  const {
    requiredRole,
    requiredPermission,
    redirectTo = '/login',
  } = options;

  function WithAuthComponent(props: P) {
    const { user, isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
    const location = useLocation();

    if (isLoading) {
      return <div className="loading">Verificando acceso...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return <Navigate to="/unauthorized" replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return <WrappedComponent {...props} />;
  }

  // Nombre descriptivo para debugging
  WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAuthComponent;
}
```

### 5.2 Uso del HOC

```tsx
// src/pages/AdminPanel.tsx
import { withAuth } from '../hoc/withAuth';

function AdminPanelPage() {
  return (
    <div>
      <h1>Panel de Administración</h1>
      {/* ... contenido del panel ... */}
    </div>
  );
}

// Exportar el componente protegido
export const AdminPanel = withAuth(AdminPanelPage, {
  requiredRole: 'ADMIN',
  redirectTo: '/login',
});

// Protección con permiso específico
function ReportsPage() {
  return <div>Reportes</div>;
}

export const Reports = withAuth(ReportsPage, {
  requiredPermission: 'reports:view',
});
```

---

## 6. Patrones Avanzados de React Router v6

### 6.1 Lazy Loading con Rutas Protegidas

```tsx
// src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { LoadingPage } from './pages/LoadingPage';

// Carga diferida de componentes pesados
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Reports = lazy(() => import('./pages/Reports'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
        </Route>

        <Route element={<PrivateRoute requiredRole="ADMIN" />}>
          <Route path="/admin/*" element={<AdminPanel />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
```

### 6.2 Rutas con Parámetros Protegidos

```tsx
// Protección de recurso propio (ownership)
function OwnedResourceRoute() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: resource, isLoading } = useResource(id);

  if (isLoading) return <LoadingSpinner />;

  // Verificar que el recurso pertenece al usuario o es admin
  if (resource.ownerId !== user?.id && !user?.roles.includes('ADMIN')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

### 6.3 Redireccionamiento Post-Login

```tsx
// src/pages/Login.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener la ruta original a la que el usuario quería ir
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirigir a la ruta original después del login exitoso
      navigate(from, { replace: true });
    } catch (error) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {from !== '/dashboard' && (
        <p className="info-message">
          Inicia sesión para continuar a <strong>{from}</strong>
        </p>
      )}
      {/* ... campos del formulario ... */}
    </form>
  );
}
```

---

## 7. Buenas Prácticas

### ✅ Hacer

- **Siempre validar en el servidor:** Las rutas privadas del frontend son UX, no seguridad real
- **Mostrar estados de carga** mientras se verifica la autenticación para evitar "flashes" de contenido
- **Guardar la ruta original** antes de redirigir al login para mejorar la UX
- **Usar TypeScript** para tipar correctamente roles y permisos
- **Separar autenticación de autorización** en el código
- **Principio de mínimo privilegio:** Denegar por defecto, conceder explícitamente

### ❌ Evitar

- **Ocultar rutas basándose solo en CSS** (display:none) — el HTML sigue siendo accesible
- **Almacenar roles/permisos en localStorage** sin verificación del servidor — pueden ser manipulados
- **Confiar en datos del frontend** para decisiones de seguridad críticas
- **Rutas hardcodeadas** en múltiples lugares — centralizar la configuración de rutas
- **Exponer información sensible** en mensajes de error (como qué roles se requieren)

### 🏗 Arquitectura Recomendada

```
src/
├── config/
│   └── routes.ts          ← Configuración centralizada de rutas y permisos
├── context/
│   └── AuthContext.tsx     ← Estado global de autenticación
├── hooks/
│   ├── useAuth.ts
│   └── usePermissions.ts
├── components/
│   ├── PrivateRoute.tsx
│   └── Can.tsx
├── hoc/
│   └── withAuth.tsx
└── pages/
    ├── Login.tsx
    ├── Unauthorized.tsx
    └── SessionExpired.tsx
```

---

## 📚 Referencias

- [React Router v6 — Auth Examples](https://reactrouter.com/en/main/start/examples)
- [React Context API](https://react.dev/reference/react/createContext)
- [OWASP — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [Auth0 — RBAC](https://auth0.com/docs/manage-users/access-control/rbac)
