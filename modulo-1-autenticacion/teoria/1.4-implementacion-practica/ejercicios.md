# Ejercicios — Sección 1.4: Implementación Práctica

> **Módulo 1 · Autenticación** | 10 ejercicios | 🕐 ~3 horas

---

## Índice

| # | Nivel | Tema | Tiempo |
|---|---|---|---|
| 1 | 🟢 Básico | Formulario de login con validación | 20 min |
| 2 | 🟢 Básico | AuthContext con estado mínimo | 20 min |
| 3 | 🟢 Básico | Ruta protegida simple | 15 min |
| 4 | 🟡 Intermedio | Logout completo y seguro | 25 min |
| 5 | 🟡 Intermedio | Renovación silenciosa del token | 30 min |
| 6 | 🟡 Intermedio | Protección de rutas por rol | 25 min |
| 7 | 🔴 Avanzado | Sincronización entre pestañas | 35 min |
| 8 | 🔴 Avanzado | Detección y cierre por inactividad | 35 min |
| 9 | 🔴 Avanzado | Middleware de autenticación en Next.js | 40 min |
| 10 | 🔴 Avanzado | Sistema de autenticación completo | 60 min |

---

## Ejercicio 1 — Formulario de Login con Validación Completa 🟢

### Descripción

Implementa un formulario de inicio de sesión que valide los campos antes de enviar y muestre mensajes de error accesibles.

### Código inicial

```tsx
// LoginForm.tsx — Completar las validaciones y el envío
import React, { useState, FormEvent } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: Agregar validaciones y llamada al API
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Entrar</button>
    </form>
  );
}
```

### Requisitos

- [ ] Validar que el email tenga formato válido
- [ ] Validar que la contraseña no esté vacía
- [ ] Mostrar errores por campo debajo del input correspondiente
- [ ] Deshabilitar el botón mientras se procesa la solicitud
- [ ] Agregar atributo `aria-describedby` para accesibilidad
- [ ] Usar `autoComplete="email"` y `autoComplete="current-password"`

### Resultado esperado

```
Correo: [usuario@empresa.com ]
        ↑ Formato de email inválido

Contraseña: [         ]
            ↑ La contraseña es requerida

[Iniciando sesión...]  ← botón deshabilitado durante carga
```

### Pistas

- Usa un objeto `{ email?: string; password?: string }` para errores de campo.
- Valida con regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- El botón debe tener `disabled={isLoading}`.

---

## Ejercicio 2 — AuthContext con Estado y Método Login 🟢

### Descripción

Crea un AuthContext que gestione el estado de autenticación y exponga un método `login` que llame al API.

### Código inicial

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// TODO: Implementar el contexto completo
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: Implementar
  return <AuthContext.Provider value={/* TODO */}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  // TODO: Implementar con verificación de null
}
```

### Requisitos

- [ ] Guardar el access token en una variable de módulo (NO en estado ni localStorage)
- [ ] Llamar a `/api/auth/login` con `credentials: 'include'`
- [ ] Manejar errores del servidor con mensajes legibles
- [ ] El método `logout` debe limpiar el token y el estado

### Pistas

```typescript
// Patrón correcto: token en módulo, NO en estado
let _accessToken: string | null = null;
// El estado de React solo guarda datos del usuario, no el token
const [user, setUser] = useState<User | null>(null);
```

---

## Ejercicio 3 — Componente PrivateRoute 🟢

### Descripción

Implementa un componente que proteja rutas privadas, redirigiendo al login si el usuario no está autenticado.

### Código inicial

```tsx
// components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // TODO: Manejar estado de carga y redirección
}
```

### Requisitos

- [ ] Mostrar un spinner mientras se verifica la sesión (`isLoading`)
- [ ] Redirigir a `/login` si no está autenticado
- [ ] Preservar la ruta original con `state={{ from: location.pathname }}`
- [ ] Renderizar `children` si está autenticado

### Uso esperado en App.tsx

```tsx
<Route path="/dashboard" element={
  <PrivateRoute>
    <Dashboard />
  </PrivateRoute>
} />
```

---

## Ejercicio 4 — Logout Completo y Seguro 🟡

### Descripción

Implementa un flujo de logout que limpie el estado de la aplicación, notifique al servidor para invalidar el refresh token, y limpie el estado del navegador.

### Requisitos

- [ ] Llamar a `POST /api/auth/logout` con `credentials: 'include'`
- [ ] Limpiar el access token de memoria
- [ ] Limpiar el estado de React (usuario, errores)
- [ ] Redirigir al login después del logout
- [ ] Manejar el caso donde el servidor no responde (logout igualmente)

### Código inicial

```tsx
// En AuthContext.tsx, implementar el método logout
const logout = useCallback(async () => {
  // TODO: Implementar logout completo
}, []);
```

### Verificación de seguridad

Después de implementar, verifica que:

1. Las cookies se eliminen (DevTools → Application → Cookies).
2. El token en memoria sea `null`.
3. Cualquier llamada a `/api/protected` después del logout retorne 401.

---

## Ejercicio 5 — Renovación Silenciosa del Token 🟡

### Descripción

Implementa la renovación automática del access token cuando expire, sin interrumpir la experiencia del usuario.

### Código inicial

```typescript
// lib/api-client.ts
import axios from 'axios';

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    // TODO: Implementar manejo de 401 con refresh automático
  }
);
```

### Requisitos

- [ ] Detectar respuestas HTTP 401
- [ ] Llamar al endpoint de refresh para obtener un nuevo token
- [ ] Reintentar la petición original con el nuevo token
- [ ] Si hay múltiples peticiones fallidas simultáneamente, hacer solo **una** llamada de refresh
- [ ] Si el refresh falla, disparar logout

### Pista: Cola de peticiones pendientes

```typescript
// Mientras el refresh está en curso, poner peticiones en cola:
if (isRefreshing) {
  return new Promise(resolve => {
    pendingRequests.push(token => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      resolve(apiClient(originalRequest));
    });
  });
}
```

---

## Ejercicio 6 — Protección de Rutas por Rol 🟡

### Descripción

Extiende el componente `PrivateRoute` para soportar roles y permisos, mostrando una página de acceso denegado cuando el usuario no tiene los permisos necesarios.

### Código inicial

```tsx
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // TODO: Verificar autenticación Y rol
}
```

### Requisitos

- [ ] Verificar autenticación primero
- [ ] Si hay `requiredRole`, verificar que el usuario lo tenga
- [ ] Si no tiene el rol, redirigir a `/403` (no a `/login`)
- [ ] Exportar también un hook `useRequireRole(role: string)` para usar en componentes

### Uso esperado

```tsx
<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin">
    <AdminPanel />
  </ProtectedRoute>
} />
```

---

## Ejercicio 7 — Sincronización Entre Pestañas 🔴

### Descripción

Implementa la sincronización del estado de autenticación entre múltiples pestañas del navegador usando `BroadcastChannel`.

### Escenario de prueba

1. Abrir la app en dos pestañas.
2. Cerrar sesión en la Pestaña A.
3. La Pestaña B debe detectar el logout y redirigir al login automáticamente.

### Código inicial

```typescript
// En AuthContext.tsx, agregar sincronización
useEffect(() => {
  // TODO: Inicializar BroadcastChannel y manejar mensajes
  
  return () => {
    // TODO: Cerrar el channel al desmontar
  };
}, []);
```

### Requisitos

- [ ] Usar `BroadcastChannel('auth_channel')` para comunicación entre pestañas
- [ ] Emitir `{ type: 'LOGOUT' }` cuando el usuario cierra sesión
- [ ] Escuchar el mensaje de logout en otras pestañas y limpiar el estado
- [ ] Agregar fallback con `localStorage` para navegadores sin soporte de BroadcastChannel
- [ ] No procesar mensajes de la propia pestaña (`event.origin`)

### Verificación

```typescript
// Test manual en consola del navegador (Pestaña B):
const channel = new BroadcastChannel('auth_channel');
channel.onmessage = (e) => console.log('Mensaje recibido:', e.data);
```

---

## Ejercicio 8 — Cierre de Sesión por Inactividad 🔴

### Descripción

Implementa un sistema que detecte la inactividad del usuario y cierre la sesión automáticamente después de 30 minutos sin actividad, mostrando una advertencia previa.

### Requisitos

- [ ] Detectar actividad del usuario: `mousedown`, `keydown`, `scroll`, `touchstart`
- [ ] Reiniciar el temporizador en cada evento de actividad
- [ ] Mostrar una advertencia 2 minutos antes del cierre automático
- [ ] Si el usuario confirma "Seguir conectado", renovar el token
- [ ] Si el usuario ignora la advertencia, cerrar sesión

### Código inicial

```tsx
// hooks/useInactivityTimeout.ts
export function useInactivityTimeout(onTimeout: () => void, timeoutMs = 30 * 60 * 1000) {
  // TODO: Implementar detección de inactividad
}
```

### Componente de advertencia esperado

```tsx
// Debe aparecer 2 minutos antes del timeout:
<InactivityWarning
  remainingSeconds={120}
  onExtend={() => renewToken()}
  onLogout={() => logout()}
/>
```

### Pista

```typescript
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutos antes
const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
const warningRef = useRef<ReturnType<typeof setTimeout>>();

const reset = () => {
  clearTimeout(timeoutRef.current);
  clearTimeout(warningRef.current);
  // Programar advertencia y timeout
};
```

---

## Ejercicio 9 — Middleware de Autenticación en Next.js 🔴

### Descripción

Implementa un middleware de Next.js que verifique la autenticación antes de servir rutas protegidas, usando la cookie del refresh token.

### Código inicial

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // TODO: Implementar verificación de autenticación
}

export const config = {
  matcher: [/* TODO: Definir rutas protegidas */],
};
```

### Requisitos

- [ ] Definir qué rutas requieren autenticación (`/dashboard/**`, `/admin/**`)
- [ ] Leer el refresh token de las cookies
- [ ] Verificar el JWT con `jose` (compatible con Edge Runtime)
- [ ] Redirigir a `/login?from=<ruta>` si no está autenticado
- [ ] Pasar el `userId` como header `x-user-id` para Server Components
- [ ] No proteger rutas estáticas ni la API pública

### Instalación de dependencias

```bash
npm install jose
```

### Test del middleware

```bash
# Sin autenticación — debe redirigir:
curl -v http://localhost:3000/dashboard
# Respuesta esperada: 307 → /login?from=/dashboard

# Con cookie válida — debe pasar:
curl -v -H "Cookie: refreshToken=<jwt>" http://localhost:3000/dashboard
# Respuesta esperada: 200
```

---

## Ejercicio 10 — Sistema de Autenticación Completo 🔴

### Descripción

Construye un sistema de autenticación de producción integrando todos los conceptos del Módulo 1. Es el ejercicio final y más completo.

### Entregables

1. **`SecureTokenManager.ts`**: Gestión del token en memoria con renovación automática.
2. **`AuthContext.tsx`**: Contexto completo con React Query.
3. **`LoginForm.tsx`**: Formulario con validación, bloqueo por intentos y accesibilidad.
4. **`ProtectedRoute.tsx`**: Con soporte de roles y permisos.
5. **`middleware.ts`** (si usas Next.js): Verificación en Edge.

### Checklist de seguridad

```
Almacenamiento:
□ Access token en memoria (NO en localStorage)
□ Refresh token en cookie httpOnly + SameSite=Strict
□ Sin datos sensibles en sessionStorage

Autenticación:
□ Validación de email y contraseña antes de enviar
□ Mensajes de error que no revelan información (no distinguir entre "email no existe" y "contraseña incorrecta")
□ Bloqueo después de N intentos fallidos
□ Logout que invalida la sesión en el servidor

Tokens:
□ Verificar expiración antes de usar el token
□ Renovación automática antes de que expire
□ Cola de peticiones durante el refresh (no múltiples llamadas)
□ Logout al fallar el refresh

Sesión:
□ Cierre por inactividad (30 minutos)
□ Sincronización entre pestañas con BroadcastChannel
□ Restaurar sesión al recargar la página (via refresh token)

Rutas:
□ PrivateRoute redirige al login guardando la ruta original
□ Protección por rol para rutas de administración
□ Loading state para evitar flash de contenido

CSRF:
□ SameSite=Strict en cookies
□ Verificación del header Origin en el servidor
```

### Criterios de evaluación

| Criterio | Puntos |
|---|---|
| Token en memoria, no localStorage | 20 |
| Renovación automática sin interrumpir al usuario | 20 |
| Logout completo (cliente + servidor) | 15 |
| Protección de rutas con roles | 15 |
| Sincronización entre pestañas | 15 |
| Cierre por inactividad | 15 |
| **Total** | **100** |

---

## 📚 Referencias

- [React Router — Protected Routes](https://reactrouter.com/en/main/start/faq#how-do-i-protect-routes)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [BroadcastChannel API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [jose — JWT para Edge Runtime](https://github.com/panva/jose)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

*← [Volver al README del Módulo 1](../../README.md) | [→ Módulo 2](../../../modulo-2-autorizacion/README.md)*
