# Ejercicios — 2.1 Protección de Rutas en React

## Instrucciones Generales

- Cada ejercicio incluye su nivel de dificultad, tiempo estimado, pistas y criterios de aceptación
- Crea un proyecto Vite con React + TypeScript para los ejercicios: `npm create vite@latest ejercicios-rutas -- --template react-ts`
- Instala React Router: `npm install react-router-dom`
- Los ejercicios son progresivos: cada uno se basa en el anterior

---

## 🟢 Ejercicio 1 — PrivateRoute Básico

**Nivel:** Básico  
**Tiempo estimado:** 20 minutos

### Descripción

Implementa un componente `PrivateRoute` que proteja las rutas `/dashboard` y `/perfil`. El usuario solo puede acceder si existe un token en `localStorage` con la clave `auth_token`.

### Requerimientos

1. Crear el componente `PrivateRoute` usando `<Outlet>` de React Router v6
2. Si no hay token → redirigir a `/login`
3. Guardar la ruta intentada en el estado de navegación para redirigir post-login
4. Crear una página de `Login` simple con un botón "Entrar" que guarde un token falso en localStorage
5. Crear páginas vacías para `/dashboard` y `/perfil`

### Estructura esperada

```tsx
// Completa estos archivos:
// src/components/PrivateRoute.tsx
// src/pages/Login.tsx
// src/pages/Dashboard.tsx
// src/App.tsx
```

### Pistas

<details>
<summary>💡 Pista 1</summary>

Usa `localStorage.getItem('auth_token')` para verificar si el token existe.

</details>

<details>
<summary>💡 Pista 2</summary>

```tsx
// Estructura básica de PrivateRoute:
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export function PrivateRoute() {
  const location = useLocation();
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

</details>

<details>
<summary>💡 Pista 3 (Ruta en App.tsx)</summary>

```tsx
<Route element={<PrivateRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/perfil" element={<Perfil />} />
</Route>
```

</details>

### Criterios de Aceptación

- [ ] Acceder a `/dashboard` sin token redirige a `/login`
- [ ] Después de "iniciar sesión" (guardar token), se puede acceder a `/dashboard`
- [ ] Al navegar directamente a `/perfil`, el login guarda esa ruta y redirige ahí después
- [ ] Cerrar sesión (borrar token) y refrescar la página vuelve a denegar acceso

---

## 🟢 Ejercicio 2 — AuthContext Simple

**Nivel:** Básico  
**Tiempo estimado:** 30 minutos

### Descripción

Refactoriza el Ejercicio 1 para usar un `AuthContext` en lugar de leer directamente el `localStorage` en el componente.

### Requerimientos

1. Crear `AuthContext` con los campos: `isAuthenticated`, `isLoading`, `user`, `login`, `logout`
2. El `AuthProvider` debe verificar el token al montar (simular llamada asíncrona con `setTimeout`)
3. Mostrar un spinner mientras `isLoading` es `true`
4. `PrivateRoute` debe usar el contexto en lugar de `localStorage`

### Modelo de datos del usuario (simulado)

```typescript
interface User {
  id: string;
  nombre: string;
  email: string;
}
```

### Pistas

<details>
<summary>💡 Pista — Estructura del AuthContext</summary>

```tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
```

</details>

<details>
<summary>💡 Pista — Simular verificación asíncrona</summary>

```tsx
useEffect(() => {
  const verificar = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simular delay de red
    const token = localStorage.getItem('auth_token');
    if (token) {
      setUser({ id: '1', nombre: 'Usuario Demo', email: 'demo@empresa.com' });
    }
    setIsLoading(false);
  };
  verificar();
}, []);
```

</details>

### Criterios de Aceptación

- [ ] Al recargar la página con token guardado, se muestra el spinner y luego el dashboard
- [ ] `PrivateRoute` no accede directamente a `localStorage` — usa el contexto
- [ ] `logout()` limpia el usuario y el token
- [ ] El hook `useAuth()` lanza un error claro si se usa fuera del provider

---

## 🟡 Ejercicio 3 — Protección por Roles

**Nivel:** Intermedio  
**Tiempo estimado:** 45 minutos

### Descripción

Amplía el sistema del Ejercicio 2 para soportar roles. Crea un sistema de login simulado con tres usuarios con diferentes roles y protege las rutas según el rol.

### Usuarios de prueba

```typescript
const USUARIOS_DEMO = [
  { email: 'admin@empresa.com', password: '1234', rol: 'ADMIN' },
  { email: 'manager@empresa.com', password: '1234', rol: 'MANAGER' },
  { email: 'user@empresa.com', password: '1234', rol: 'USER' },
];
```

### Rutas a implementar

| Ruta | Roles permitidos |
|------|-----------------|
| `/dashboard` | Todos |
| `/reportes` | MANAGER, ADMIN |
| `/admin` | Solo ADMIN |

### Requerimientos

1. El formulario de login debe verificar email/password contra `USUARIOS_DEMO`
2. `PrivateRoute` debe aceptar una prop `requiredRole?: string`
3. Si el usuario tiene sesión pero no el rol → redirigir a `/unauthorized`
4. Crear página `Unauthorized` con botón para volver al dashboard
5. El Navbar debe mostrar los enlaces según el rol del usuario actual

### Pistas

<details>
<summary>💡 Pista — PrivateRoute con rol</summary>

```tsx
interface PrivateRouteProps {
  requiredRole?: string;
}

export function PrivateRoute({ requiredRole }: PrivateRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div>Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requiredRole && user?.rol !== requiredRole) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
```

</details>

<details>
<summary>💡 Pista — Navbar condicional</summary>

```tsx
function Navbar() {
  const { user } = useAuth();
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      {['MANAGER', 'ADMIN'].includes(user?.rol ?? '') && (
        <Link to="/reportes">Reportes</Link>
      )}
      {user?.rol === 'ADMIN' && (
        <Link to="/admin">Admin</Link>
      )}
    </nav>
  );
}
```

</details>

### Criterios de Aceptación

- [ ] `user@empresa.com` puede acceder a `/dashboard` pero no a `/reportes` ni `/admin`
- [ ] `manager@empresa.com` puede acceder a `/dashboard` y `/reportes` pero no a `/admin`
- [ ] `admin@empresa.com` puede acceder a todas las rutas
- [ ] Navegar a `/admin` como manager muestra la página `/unauthorized`
- [ ] El Navbar no muestra enlaces que el usuario no puede usar

---

## 🟡 Ejercicio 4 — Componente Can

**Nivel:** Intermedio  
**Tiempo estimado:** 30 minutos

### Descripción

Implementa el componente `<Can>` para renderizado condicional dentro de las páginas. Úsalo para mostrar/ocultar botones y secciones según el rol.

### Requerimientos

1. Implementar el componente `Can` con props: `role`, `anyRole`, `fallback`
2. En el Dashboard, mostrar diferentes paneles según el rol:
   - Panel "Resumen" → todos
   - Panel "Aprobaciones Pendientes" → MANAGER, ADMIN
   - Panel "Configuración del Sistema" → solo ADMIN
3. Los botones de acción también deben estar protegidos:
   - "Crear Usuario" → solo ADMIN
   - "Generar Reporte" → MANAGER, ADMIN
   - "Ver Actividad" → todos

### Implementación base

```tsx
// Completa este componente:
interface CanProps {
  role?: string;
  anyRole?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ role, anyRole, fallback = null, children }: CanProps) {
  const { user } = useAuth();
  // TODO: Implementar lógica de verificación
}
```

### Pistas

<details>
<summary>💡 Pista — Lógica de verificación</summary>

```tsx
const tieneAcceso = (() => {
  if (!user) return false;
  if (role && user.rol !== role) return false;
  if (anyRole && !anyRole.includes(user.rol)) return false;
  return true;
})();

return tieneAcceso ? <>{children}</> : <>{fallback}</>;
```

</details>

### Criterios de Aceptación

- [ ] El panel "Configuración del Sistema" solo aparece para ADMIN
- [ ] El panel "Aprobaciones Pendientes" aparece para MANAGER y ADMIN
- [ ] El botón "Crear Usuario" muestra un mensaje de "sin permisos" para USER (usando fallback)
- [ ] El componente `Can` no rompe el render si el usuario no está cargado aún

---

## 🔴 Ejercicio 5 — Manejo Completo de Errores HTTP

**Nivel:** Avanzado  
**Tiempo estimado:** 60 minutos

### Descripción

Implementa un sistema de manejo global de errores HTTP. Cuando la API devuelva 401 o 403, el sistema debe reaccionar automáticamente sin necesidad de manejar el error en cada componente.

### Arquitectura requerida

```
src/
├── services/
│   ├── httpEventEmitter.ts    ← EventEmitter para errores HTTP
│   └── apiClient.ts           ← Cliente HTTP que emite eventos
├── components/
│   └── HTTPErrorHandler.tsx   ← Componente que escucha eventos
└── App.tsx                    ← Incluir HTTPErrorHandler
```

### Requerimientos

1. Crear un `httpEventEmitter` (puede ser un `EventTarget` del DOM o una librería)
2. `apiClient` debe emitir eventos cuando recibe 401 o 403
3. `HTTPErrorHandler` debe escuchar esos eventos y redirigir
4. Simular una API que devuelve 401 después de 10 segundos (token "expirado")
5. Mostrar un banner de "Sesión expirada" antes de redirigir

### Código base para el cliente HTTP

```typescript
// src/services/apiClient.ts
export async function apiGet(url: string) {
  const token = sessionStorage.getItem('auth_token');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // TODO: Emitir evento de sesión expirada
  }

  if (response.status === 403) {
    // TODO: Emitir evento de acceso denegado
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
```

### Pistas

<details>
<summary>💡 Pista — EventEmitter simple con EventTarget</summary>

```typescript
// src/services/httpEventEmitter.ts
class HttpEventEmitter extends EventTarget {
  emit401() {
    this.dispatchEvent(new CustomEvent('unauthorized'));
  }
  emit403(path: string) {
    this.dispatchEvent(new CustomEvent('forbidden', { detail: { path } }));
  }
}

export const httpEvents = new HttpEventEmitter();
```

</details>

<details>
<summary>💡 Pista — HTTPErrorHandler</summary>

```tsx
export function HTTPErrorHandler() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handle401 = () => {
      logout();
      navigate('/session-expired');
    };

    const handle403 = (e: CustomEvent) => {
      navigate('/unauthorized', { state: { from: { pathname: e.detail.path } } });
    };

    httpEvents.addEventListener('unauthorized', handle401);
    httpEvents.addEventListener('forbidden', handle403 as EventListener);

    return () => {
      httpEvents.removeEventListener('unauthorized', handle401);
      httpEvents.removeEventListener('forbidden', handle403 as EventListener);
    };
  }, [navigate, logout]);

  return null;
}
```

</details>

### Criterios de Aceptación

- [ ] Cuando la API devuelve 401, el usuario es redirigido a `/session-expired` automáticamente
- [ ] Cuando la API devuelve 403, el usuario es redirigido a `/unauthorized` con información del recurso
- [ ] El logout se ejecuta automáticamente en el caso del 401
- [ ] El manejo de errores funciona desde cualquier página, sin duplicar código
- [ ] Los componentes individuales NO manejan los errores 401/403 explícitamente

---

## 🔴 Ejercicio 6 — Sistema de Permisos Granulares (RBAC Completo)

**Nivel:** Avanzado  
**Tiempo estimado:** 90 minutos

### Descripción

Implementa un sistema de permisos granulares donde cada usuario tiene una lista específica de permisos (no solo un rol genérico). Cada acción en la UI verifica el permiso específico.

### Modelo de datos

```typescript
type Permission =
  | 'dashboard:view'
  | 'users:view' | 'users:create' | 'users:edit' | 'users:delete'
  | 'reports:view' | 'reports:export'
  | 'settings:view' | 'settings:edit';

interface User {
  id: string;
  nombre: string;
  email: string;
  permisos: Permission[];
}

// Usuarios de prueba con permisos explícitos:
const USUARIOS = [
  {
    email: 'admin@empresa.com',
    permisos: ['dashboard:view', 'users:view', 'users:create', 'users:edit',
               'users:delete', 'reports:view', 'reports:export',
               'settings:view', 'settings:edit'],
  },
  {
    email: 'manager@empresa.com',
    permisos: ['dashboard:view', 'users:view', 'users:create',
               'reports:view', 'reports:export', 'settings:view'],
  },
  {
    email: 'user@empresa.com',
    permisos: ['dashboard:view', 'users:view', 'reports:view'],
  },
];
```

### Requerimientos

1. Extender `AuthContext` para incluir `hasPermission(permission: Permission): boolean`
2. Crear una ruta por permiso: solo acceder a `/reportes` si tienes `reports:view`
3. Implementar `<Can permission="...">` además de `<Can role="...">`
4. Crear un `usePermissions()` hook con propiedades computed
5. La página de reportes debe:
   - Mostrar lista de reportes si tiene `reports:view`
   - Mostrar botón "Exportar" solo si tiene `reports:export`
   - Mostrar formulario de edición solo si tiene `reports:edit` (ningún usuario lo tiene → ver fallback)

### Criterios de Aceptación

- [ ] El sistema funciona con permisos granulares, no solo roles
- [ ] `<Can permission="reports:export">` muestra el botón solo para admin y manager
- [ ] El botón de editar reportes muestra un mensaje "Sin permiso" para todos los usuarios
- [ ] `usePermissions()` devuelve `puedeExportarReportes: false` para USER
- [ ] La ruta `/reportes` redirige a `/unauthorized` si el usuario no tiene `reports:view`

---

## Checklist Final del Módulo 2.1

Antes de pasar a la sección 2.2, asegúrate de haber completado:

- [ ] Ejercicio 1: PrivateRoute básico funcionando ✅
- [ ] Ejercicio 2: AuthContext implementado ✅
- [ ] Ejercicio 3: Protección por roles ✅
- [ ] Ejercicio 4: Componente Can ✅
- [ ] Ejercicio 5: Manejo global de errores HTTP ✅
- [ ] Ejercicio 6: Sistema de permisos granulares ✅

### Auto-evaluación

| Concepto | ¿Lo domino? |
|----------|-------------|
| Crear `<Outlet>` patterns en React Router v6 | ⬜ Sí / ⬜ Parcialmente / ⬜ No |
| Implementar AuthContext con TypeScript | ⬜ Sí / ⬜ Parcialmente / ⬜ No |
| Diferencia entre autenticación y autorización | ⬜ Sí / ⬜ Parcialmente / ⬜ No |
| Usar HOCs para protección de componentes | ⬜ Sí / ⬜ Parcialmente / ⬜ No |
| Manejar errores 401 vs 403 | ⬜ Sí / ⬜ Parcialmente / ⬜ No |
| Diseñar sistemas de permisos granulares | ⬜ Sí / ⬜ Parcialmente / ⬜ No |
