# 3.4 UX en Aplicaciones Autenticadas

## Objetivos de Aprendizaje

Al finalizar esta sección, el participante será capaz de:
- Implementar estados críticos de UI (carga, error, éxito) de forma segura
- Diseñar mensajes de error que no expongan información sensible
- Manejar respuestas HTTP 401 y 403 con UX profesional
- Construir componentes de feedback visual para aplicaciones empresariales

---

## 3.4.1 Manejo de Estados Críticos

Las aplicaciones autenticadas pasan constantemente entre estados: cargando datos, mostrando resultados, manejando errores. Un manejo descuidado de estos estados puede degradar la experiencia o exponer información sensible.

### Los 4 Estados de Cualquier Operación Asíncrona

```
IDLE → LOADING → SUCCESS
                ↓
               ERROR
```

| Estado | Descripción | Componente UI |
|--------|-------------|---------------|
| `idle` | Sin operación en curso | Nada o formulario vacío |
| `loading` | Esperando respuesta | Skeleton, Spinner, Indicador |
| `success` | Operación exitosa | Toast verde, contenido |
| `error` | Falló la operación | Mensaje de error (seguro) |

### Implementación con Discriminated Union

```tsx
// types/async-state.ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// Uso con TypeScript - el compilador garantiza el manejo completo
function render<T>(state: AsyncState<T>): React.ReactNode {
  switch (state.status) {
    case 'idle':    return <EmptyState />;
    case 'loading': return <Skeleton />;
    case 'success': return <DataView data={state.data} />;
    case 'error':   return <ErrorMessage message={state.message} />;
  }
}
```

---

## 3.4.2 Feedback Seguro – Qué Decirle al Usuario

Una de las decisiones más importantes en UX de seguridad es **qué información incluir en los mensajes de error**. Los mensajes demasiado específicos ayudan a los atacantes.

### Mensajes de Error: Seguros vs Inseguros

| Situación | ❌ Inseguro | ✅ Seguro |
|-----------|------------|----------|
| Login fallido (email no existe) | "El email no está registrado" | "Credenciales incorrectas" |
| Login fallido (contraseña mal) | "Contraseña incorrecta" | "Credenciales incorrectas" |
| Cuenta bloqueada | "Tu cuenta está bloqueada por 15 min" | "Credenciales incorrectas. Intenta más tarde" |
| Error de servidor | Stack trace completo | "Ocurrió un error. Por favor intenta de nuevo" |
| Recurso no autorizado | "No tienes permiso para ver /admin/users" | "No tienes permiso para acceder a este recurso" |
| Sesión expirada | "Tu JWT expiró a las 14:32:05" | "Tu sesión ha expirado. Inicia sesión de nuevo" |

### Regla de Oro
> Dar al usuario suficiente información para **resolver su problema legítimo**, pero nunca revelar detalles que ayuden a un atacante.

---

## 3.4.3 Manejo Profesional de 401 y 403

### 401 Unauthorized – No Autenticado
El usuario no está autenticado (no tiene token o el token expiró).

**Comportamiento esperado:**
1. Detectar el 401 en el interceptor HTTP
2. Intentar refrescar el token (si hay refresh token)
3. Si el refresh falla: redirigir al login con mensaje amigable
4. Preservar la URL original para redirigir después del login

### 403 Forbidden – No Autorizado
El usuario está autenticado pero no tiene permiso para este recurso.

**Comportamiento esperado:**
1. No redirigir al login (ya está autenticado)
2. Mostrar página de "Acceso Denegado" específica
3. Ofrecer navegación de vuelta a una sección permitida
4. NO mostrar qué recurso exacto fue denegado (seguridad)

---

## 3.4.4 Sesión Expirada – UX Pattern

Cuando la sesión expira mientras el usuario trabaja, la experiencia debe ser:
1. **No destructiva**: no perder el trabajo no guardado
2. **Clara**: explicar qué pasó sin alarmar
3. **Accionable**: dar pasos claros para continuar

### Patrón "Session Warning Modal"
- A los 2 minutos antes de expirar: mostrar modal de advertencia
- El usuario puede extender la sesión con un click
- Si no responde: logout automático con mensaje claro
- Guardar el estado actual antes del logout

---

## 3.4.5 Skeleton Screens vs Spinners

| Aspecto | Skeleton Screens | Spinners |
|---------|-----------------|----------|
| Percepción de velocidad | Más rápida | Más lenta |
| Cuándo usar | Listas, cards, páginas completas | Botones, acciones puntuales |
| Reduce CLS | Sí (reserva espacio) | No |
| Complejidad | Mayor | Menor |

**Regla:** Usar skeleton para cargas de contenido inicial; usar spinner para acciones del usuario.

---

## 3.4.6 Toasts y Notificaciones Seguras

Los toasts son el mecanismo principal de feedback en apps autenticadas. Deben ser:

- **Temporales**: auto-desaparecer (3-5 segundos para info, nunca para errores críticos)
- **No bloqueantes**: no interrumpir el flujo de trabajo
- **Seguros**: no incluir tokens, IDs internos ni rutas sensibles
- **Accesibles**: con `role="alert"` o `aria-live` para lectores de pantalla

---

## Buenas Prácticas

1. **Estados de carga siempre visibles** – nunca dejar al usuario sin feedback
2. **Mensajes de error genéricos** – no revelar detalles del sistema
3. **401 → redirect to login** con `returnUrl` para UX fluida
4. **403 → página dedicada** con opciones de navegación
5. **Session expiry warning** al menos 2 minutos antes
6. **Skeleton screens** para cargas de página completa
7. **Disable buttons** durante submit (evitar doble envío)
8. **Toast accesible** con `aria-live="polite"` para no interrumpir

---

## Referencias

- [OWASP Error Handling](https://owasp.org/www-community/Improper_Error_Handling)
- [Nielsen Norman Group: Error Messages](https://www.nngroup.com/articles/error-message-guidelines/)
- [WCAG 2.1 – Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
- [Skeleton Screens (Luke Wroblewski)](https://www.lukew.com/ff/entry.asp?1797)
