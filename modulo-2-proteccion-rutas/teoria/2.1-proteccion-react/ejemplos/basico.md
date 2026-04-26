# Ejemplo Básico 2.1 — Componente PrivateRoute Simple

## Descripción

Este ejemplo implementa el componente `PrivateRoute` más básico posible: verificar si el usuario está autenticado y, de no estarlo, redirigirlo al login. Es el punto de partida para cualquier aplicación React con protección de rutas.

**Conceptos cubiertos:**
- Verificar autenticación desde localStorage/cookie
- Redirección con `<Navigate>`
- Uso de `<Outlet>` de React Router v6

---

## Código Completo

### 1. Estructura de archivos

```
src/
├── App.tsx
├── components/
│   └── PrivateRoute.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── Home.tsx
└── utils/
    └── auth.ts
```

---

### 2. Utilidad de autenticación básica

```tsx
// src/utils/auth.ts

/**
 * Verifica si el usuario está autenticado comprobando
 * la existencia de un token en localStorage.
 *
 * NOTA: En producción, también se debe validar que el
 * token no haya expirado (verificar el campo `exp` del JWT).
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    // Decodificar el payload del JWT (sin verificar firma — solo para UI)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const ahora = Math.floor(Date.now() / 1000);

    // Verificar que no haya expirado
    if (payload.exp && payload.exp < ahora) {
      localStorage.removeItem('accessToken');
      return false;
    }

    return true;
  } catch {
    // Token malformado
    localStorage.removeItem('accessToken');
    return false;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function setToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

export function removeToken(): void {
  localStorage.removeItem('accessToken');
}
```

---

### 3. Componente PrivateRoute básico

```tsx
// src/components/PrivateRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

/**
 * PrivateRoute — Versión básica
 *
 * Protege todas las rutas hijas verificando si el usuario
 * está autenticado. Si no lo está, redirige al login.
 *
 * Uso en App.tsx:
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */
export function PrivateRoute() {
  const location = useLocation();

  // Si no está autenticado, redirigir al login
  // Guardamos la ubicación actual en el state para poder redirigir
  // de vuelta después del login exitoso
  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Usuario autenticado: renderizar las rutas hijas
  return <Outlet />;
}
```

---

### 4. Configuración de rutas en App.tsx

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública raíz */}
        <Route path="/" element={<Home />} />

        {/* Ruta de login pública */}
        <Route path="/login" element={<Login />} />

        {/* Grupo de rutas protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Route>

        {/* Redirigir rutas desconocidas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

### 5. Página de Login con redirección post-login

```tsx
// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { setToken } from '../utils/auth';

interface LocationState {
  from?: { pathname: string };
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Obtener la ruta a la que el usuario quería ir antes de ser redirigido
  const from = (location.state as LocationState)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Llamada al endpoint de login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }

      const { token } = await response.json();

      // Guardar el token
      setToken(token);

      // Redirigir a la ruta original (o al dashboard por defecto)
      navigate(from, { replace: true });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Iniciar Sesión</h1>

        {/* Mensaje informativo si fue redirigido */}
        {from !== '/dashboard' && (
          <div className="info-banner">
            Necesitas iniciar sesión para acceder a{' '}
            <strong>{from}</strong>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p>
          ¿Olvidaste tu contraseña?{' '}
          <Link to="/recuperar-password">Recupérala aquí</Link>
        </p>
      </div>
    </div>
  );
}
```

---

### 6. Dashboard protegido

```tsx
// src/pages/Dashboard.tsx
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';

export function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <button onClick={handleLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>
      <main>
        <p>¡Bienvenido! Has accedido correctamente a la zona protegida.</p>
      </main>
    </div>
  );
}
```

---

## Cómo Ejecutar el Ejemplo

```bash
# Crear proyecto con Vite
npm create vite@latest mi-app -- --template react-ts
cd mi-app

# Instalar dependencias
npm install react-router-dom

# Crear los archivos del ejemplo
# (Copiar el código de cada sección en los archivos correspondientes)

# Iniciar el servidor de desarrollo
npm run dev
```

---

## Pruebas del Ejemplo

### Escenario 1: Usuario no autenticado
1. Abrir `http://localhost:5173/dashboard`
2. **Resultado esperado:** Redirige a `/login` con `state.from = /dashboard`

### Escenario 2: Login exitoso
1. Ingresar credenciales válidas en `/login`
2. **Resultado esperado:** Redirige a `/dashboard` con el token guardado en localStorage

### Escenario 3: Acceso directo al login ya autenticado
1. Con token válido en localStorage, navegar a `/login`
2. **Resultado esperado:** Podría mejorarse redirigiendo al dashboard si ya está autenticado

---

## Limitaciones y Siguientes Pasos

Este ejemplo básico tiene las siguientes limitaciones que se resuelven en los ejemplos intermedio y avanzado:

| Limitación | Solución |
|------------|----------|
| No maneja roles/permisos | Ver ejemplo intermedio |
| No usa Context API | Ver ejemplo intermedio |
| No maneja estado de carga | Ver ejemplo intermedio |
| No renueva tokens expirados | Ver ejemplo avanzado (sección 2.4) |
| Validación JWT solo en cliente | Ver sección 2.3 (SSR + Middleware) |

> 💡 **Consejo:** Este ejemplo es un buen punto de partida para proyectos pequeños o prototipos. Para aplicaciones empresariales, siempre usa el patrón con Context API y validación en el servidor.
