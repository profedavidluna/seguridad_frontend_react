# Ejercicios — 2.3 SSR Aplicado a Seguridad

## Configuración

```bash
npm install jose zod
```

Asegúrate de tener `.env.local` con:
```env
JWT_SECRET=secreto-muy-largo-para-desarrollo-local-min-32-chars
```

---

## 🟢 Ejercicio 1 — Cookie httpOnly vs localStorage

**Nivel:** Básico | **Tiempo:** 20 minutos

### Descripción

Comparar empíricamente la diferencia de seguridad entre almacenar el token en localStorage versus en una cookie httpOnly.

### Requerimientos

1. Crear dos rutas de login:
   - `/api/auth/login-inseguro` → Retorna el token en el body (para guardar en localStorage)
   - `/api/auth/login-seguro` → Establece cookie httpOnly con el token
2. Crear dos páginas de prueba:
   - `/demo/inseguro` → Lee el token desde localStorage
   - `/demo/seguro` → Lee la cookie httpOnly del servidor con `cookies()`
3. En la página insegura, mostrar cómo se puede leer el token con `localStorage.getItem`
4. En la página segura, demostrar que `document.cookie` NO contiene el auth token

### Verificación en el browser

```javascript
// Ejecutar en la consola del browser después de loguearse:

// En /demo/inseguro:
console.log(localStorage.getItem('token')); // Muestra el token ← INSEGURO

// En /demo/seguro:
console.log(document.cookie); // NO contiene 'auth-token' ← SEGURO
```

### Criterios de Aceptación

- [ ] La cookie httpOnly aparece en Network → Application → Cookies del browser
- [ ] `document.cookie` no incluye el token httpOnly
- [ ] El login "inseguro" permite leer el token desde la consola del browser
- [ ] Ambas páginas muestran el usuario correctamente a pesar de los diferentes mecanismos

---

## 🟢 Ejercicio 2 — Middleware Básico

**Nivel:** Básico | **Tiempo:** 30 minutos

### Descripción

Implementar el archivo `middleware.ts` que proteja todas las rutas del dashboard y redirija al login si no hay sesión válida.

### Requerimientos

1. El middleware debe correr en todas las rutas excepto:
   - `/login`, `/`, archivos estáticos, `/api/auth/*`
2. Si no hay cookie `auth-token` → redirect a `/login?from=<pathname>`
3. Si hay token inválido → redirect a `/login` y borrar la cookie
4. Si el token es válido → continuar al Server Component

### Verificar con curl

```bash
# Sin token — debe dar 302
curl -v http://localhost:3000/dashboard 2>&1 | grep "Location"

# Con token falso — debe dar 302
curl -v -H "Cookie: auth-token=token-falso" \
  http://localhost:3000/dashboard 2>&1 | grep "Location"

# Con token válido — debe dar 200
# Primero: obtener token real haciendo login
# Luego: usar la cookie en la siguiente petición
```

### Pistas

<details>
<summary>💡 Estructura del middleware.ts</summary>

```typescript
// middleware.ts (raíz del proyecto, no en /src)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  // Tu implementación aquí
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

</details>

### Criterios de Aceptación

- [ ] `/dashboard` sin cookie → redirect a `/login?from=/dashboard`
- [ ] `/dashboard` con cookie inválida → redirect a `/login` + cookie borrada
- [ ] `/login` accesible sin autenticación
- [ ] El parámetro `from` en la URL de login contiene la ruta original

---

## 🟡 Ejercicio 3 — Middleware con Roles

**Nivel:** Intermedio | **Tiempo:** 45 minutos

### Descripción

Extender el middleware para proteger rutas según el rol del usuario dentro del JWT.

### Configuración de rutas

```typescript
// Rutas y sus roles requeridos
const ROUTE_ROLES = [
  { pattern: /^\/admin/, roles: ['ADMIN'] },
  { pattern: /^\/manager/, roles: ['ADMIN', 'MANAGER'] },
  // /dashboard accesible para cualquier usuario autenticado
];
```

### Requerimientos

1. El JWT debe incluir el campo `roles: string[]`
2. El middleware verifica si el usuario tiene alguno de los roles requeridos para la ruta
3. Si no tiene el rol → redirect a `/unauthorized?from=<pathname>`
4. Crear usuarios de prueba con diferentes roles:

```typescript
const USUARIOS = [
  { email: 'admin@test.com',   password: '123', roles: ['ADMIN'] },
  { email: 'manager@test.com', password: '123', roles: ['MANAGER'] },
  { email: 'user@test.com',    password: '123', roles: ['USER'] },
];
```

### Tabla de acceso esperada

| Usuario | `/dashboard` | `/manager` | `/admin` |
|---------|:---:|:---:|:---:|
| admin@test.com | ✅ | ✅ | ✅ |
| manager@test.com | ✅ | ✅ | ❌ → /unauthorized |
| user@test.com | ✅ | ❌ → /unauthorized | ❌ → /unauthorized |

### Criterios de Aceptación

- [ ] La tabla de acceso anterior se cumple exactamente
- [ ] La página `/unauthorized` muestra la ruta a la que se intentó acceder
- [ ] Los roles se leen del JWT, no de un estado del cliente
- [ ] Modificar manualmente la cookie (con DevTools) y poner un token falso resulta en redirect

---

## 🟡 Ejercicio 4 — Verificación en Múltiples Capas

**Nivel:** Intermedio | **Tiempo:** 40 minutos

### Descripción

Implementar "defensa en profundidad" verificando la sesión en tres capas: Middleware, Layout y Page.

### Por qué múltiples capas

- El Middleware puede fallar (bugs, bypass edge cases)
- Los layouts protegen groups de rutas lógicamente relacionadas
- Las páginas pueden tener permisos más granulares

### Requerimientos

1. **Capa 1 — Middleware:** Verificar token JWT básico
2. **Capa 2 — Layout del Dashboard:** Llamar a `getServerSession()` y redirigir si es null
3. **Capa 3 — Page del Admin:** Llamar a `requireRole('ADMIN')` y redirigir si no tiene el rol

### Código base para la capa 3

```typescript
// src/lib/auth.ts — Implementar estas funciones:

export const getServerSession = cache(async () => {
  // 1. Leer cookie 'auth-token'
  // 2. Verificar JWT con jose
  // 3. Retornar payload o null
});

export async function requireAuth() {
  // Llamar getServerSession
  // Si null → redirect('/login')
  // Si hay sesión → retornarla
}

export async function requireRole(role: string) {
  // Llamar requireAuth
  // Si no tiene el rol → redirect('/unauthorized')
  // Si tiene el rol → retornar sesión
}
```

### Pistas

<details>
<summary>💡 Importar redirect correctamente</summary>

```typescript
// En Server Components y lib functions:
import { redirect } from 'next/navigation';

// En middleware:
return NextResponse.redirect(new URL('/login', request.url));
```

</details>

### Criterios de Aceptación

- [ ] Si el middleware falla y una petición llega al layout sin cookie, el layout redirige
- [ ] El admin page redirige a `/unauthorized` si el usuario no es ADMIN aunque pase el middleware y el layout
- [ ] `getServerSession()` usa `React.cache()` (se llama múltiples veces pero la verificación ocurre una vez)
- [ ] Las tres capas pueden comprobarse en los logs de la consola del servidor

---

## 🔴 Ejercicio 5 — Renovación Automática de Token

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Implementar renovación silenciosa de token en el middleware. Cuando el token tiene menos de 30 minutos para expirar, el middleware debe generar y enviar un nuevo token sin interrumpir al usuario.

### Requerimientos

1. Los tokens deben tener vida corta para pruebas: 2 minutos (`setExpirationTime('2m')`)
2. El umbral de renovación: 1 minuto antes de expirar (`REFRESH_THRESHOLD = 60`)
3. El middleware detecta tokens próximos a expirar y crea uno nuevo
4. El nuevo token se envía como cookie en la respuesta (el usuario no nota nada)
5. Agregar un header `X-Token-Refreshed: true` en la respuesta para debugging

### Flujo esperado

```
t=0:00 → Login → Token expira en t=2:00
t=1:00 → Usuario hace request → Token tiene 1 min restante < umbral (1 min)
         Middleware renueva el token → nuevo token expira en t=3:00
t=2:00 → Token original habría expirado, pero fue reemplazado
t=3:00 → Nuevo token expira → renovar de nuevo si hay actividad
```

### Verificación

```bash
# En Chrome DevTools → Network → Headers de cualquier request al dashboard:
# Buscar: Set-Cookie: auth-token=<nuevo-token>
# Buscar: X-Token-Refreshed: true
```

### Criterios de Aceptación

- [ ] Con tokens de 2 minutos, el usuario nunca ve la página de login durante actividad continua
- [ ] El header `X-Token-Refreshed: true` aparece cuando el middleware renueva
- [ ] Si el usuario está inactivo 2+ minutos (sin requests), su sesión expira normalmente
- [ ] El nuevo token tiene las mismas claims que el original (mismo userId, roles, etc.)

---

## 🔴 Ejercicio 6 — Audit Log de Accesos

**Nivel:** Avanzado | **Tiempo:** 50 minutos

### Descripción

Implementar un sistema básico de registro de auditoría que guarde los accesos a rutas sensibles.

### Requerimientos

1. Crear una función `logAuditEvent(event: AuditEvent): Promise<void>`
2. El middleware debe llamarla cuando:
   - Un usuario accede a `/admin/*` (acceso sensible exitoso)
   - Un usuario intenta acceder a una ruta para la que no tiene rol (acceso denegado)
   - Se detecta un token inválido (posible ataque)
3. Crear una API route `GET /api/admin/audit-logs` que retorne los últimos 100 eventos
4. Solo ADMIN puede acceder a los logs

### Tipo de evento

```typescript
interface AuditEvent {
  timestamp: string;           // ISO 8601
  type: 'ACCESS' | 'DENIED' | 'INVALID_TOKEN' | 'ADMIN_ACTION';
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  result: 'ALLOWED' | 'REDIRECTED_LOGIN' | 'REDIRECTED_UNAUTHORIZED';
  extra?: Record<string, unknown>;
}
```

### Almacenamiento (para el ejercicio)

Usar un array en memoria (en producción sería una DB o servicio de logs):

```typescript
// src/lib/auditLog.ts
const events: AuditEvent[] = [];

export const auditLog = {
  push: async (event: AuditEvent) => {
    events.push(event);
    if (events.length > 1000) events.shift(); // Máximo 1000 eventos
  },
  getAll: () => [...events].reverse(), // Más recientes primero
};
```

### Criterios de Aceptación

- [ ] Cada acceso a `/admin/*` genera un evento `ACCESS` en el log
- [ ] Cada intento denegado genera un evento `DENIED`
- [ ] `GET /api/admin/audit-logs` retorna los eventos correctamente
- [ ] La ruta de los logs requiere ser ADMIN (verifica con usuario manager → debe dar 403)
- [ ] El log incluye IP y User-Agent del request

---

## Checklist del Módulo 2.3

- [ ] Ejercicio 1: Cookie httpOnly vs localStorage ✅
- [ ] Ejercicio 2: Middleware básico ✅
- [ ] Ejercicio 3: Middleware con roles ✅
- [ ] Ejercicio 4: Verificación en múltiples capas ✅
- [ ] Ejercicio 5: Renovación automática de token ✅
- [ ] Ejercicio 6: Audit log de accesos ✅

### Conceptos clave del módulo

| Concepto | ¿Por qué importa? |
|----------|------------------|
| Cookie httpOnly | El JS del cliente no puede robar el token |
| Middleware en Edge | Protección antes de cualquier procesamiento |
| Verificación en múltiples capas | Defensa en profundidad |
| Renovación silenciosa | Seguridad sin sacrificar UX |
| Audit log | Trazabilidad para cumplimiento y forensics |
