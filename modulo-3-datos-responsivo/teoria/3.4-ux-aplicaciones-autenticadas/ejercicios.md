# Ejercicios – UX en Aplicaciones Autenticadas

## Sección 3.4

---

## 🟢 Nivel Básico

### Ejercicio 1 – Componente con 4 Estados
**Objetivo:** Implementar los 4 estados de una operación asíncrona.

**Instrucciones:**
1. Crea un componente `ProductList` que:
   - Muestra un spinner mientras carga (`loading`)
   - Muestra los productos al cargar exitosamente (`success`)
   - Muestra un mensaje de error genérico si falla (`error`)
   - No renderiza nada en estado inicial (`idle`)
2. Usa un `fetch` mock con `setTimeout` para simular la carga.
3. Incluye un botón "Reintentar" en el estado de error.
4. Usa `aria-live="polite"` en el contenedor para accesibilidad.

---

### Ejercicio 2 – Botón con Estado de Carga
**Objetivo:** Prevenir el doble submit con UI apropiada.

**Instrucciones:**
1. Crea un formulario de contacto con campos: nombre, email, mensaje.
2. El botón "Enviar" debe:
   - Deshabilitarse (`disabled`) al hacer submit
   - Mostrar un spinner y "Enviando..." mientras procesa
   - Tener `aria-busy={true}` durante la carga
3. Simula un envío con `await new Promise(r => setTimeout(r, 2000))`.
4. Después del éxito, muestra un mensaje de confirmación y limpia el formulario.

---

### Ejercicio 3 – Skeleton Screen
**Objetivo:** Crear una pantalla de carga con skeleton screens.

**Instrucciones:**
1. Crea `UserCardSkeleton` que imite la forma de una tarjeta de usuario.
2. Usa `animate-pulse` de Tailwind para la animación.
3. El skeleton debe tener `aria-hidden="true"` (no es contenido real).
4. Muestra 4 skeletons mientras carga, reemplazados por datos reales.
5. Compara visualmente con un spinner - ¿cuál se ve más profesional?

---

## 🟡 Nivel Intermedio

### Ejercicio 4 – Sistema de Toasts
**Objetivo:** Implementar un sistema de notificaciones reutilizable.

**Instrucciones:**
1. Crea `ToastContext` con `useReducer` para manejar múltiples toasts.
2. El hook `useToast()` debe exponer: `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`.
3. Los toasts de éxito/info se auto-cierran después de 4 segundos.
4. Los toasts de error NO se auto-cierran (requieren acción del usuario).
5. Máximo 5 toasts visibles a la vez (descartar el más antiguo si hay más).
6. Cada toast debe tener `role="alert"`.

**Prueba de funcionamiento:**
- Llama a `toast.success("Perfil actualizado")` → debe aparecer y desaparecer
- Llama a `toast.error("No se pudo guardar")` → debe permanecer hasta cerrarlo

---

### Ejercicio 5 – Páginas 401 y 403
**Objetivo:** Crear páginas de error profesionales y seguras.

**Instrucciones:**
1. Crea una página `/no-autorizado` (401) que:
   - Muestre mensaje genérico (sin detalles del token)
   - Tenga botón "Iniciar Sesión" que redirige con `?returnUrl`
2. Crea una página `/acceso-denegado` (403) que:
   - NO diga qué recurso fue denegado
   - Tenga botón "Volver al Dashboard"
   - Tenga enlace para contactar soporte
3. En tu interceptor Axios, redirigir automáticamente a la página correcta según el status code.

---

### Ejercicio 6 – Advertencia de Sesión por Expirar
**Objetivo:** Implementar el patrón "session warning modal".

**Instrucciones:**
1. Simula un token que expira en 3 minutos (almacena `expiresAt = Date.now() + 180000`).
2. A los 2 minutos, muestra un modal de advertencia con cuenta regresiva.
3. El modal debe tener:
   - Botón "Continuar Sesión" que llama a un mock de refresh
   - Botón "Cerrar Sesión"
   - Countdown visible de los segundos restantes
4. Si el usuario no responde, hacer logout automático al llegar a 0.
5. Usar `role="alertdialog"` y `aria-modal="true"`.

---

## 🔴 Nivel Avanzado

### Ejercicio 7 – useAsyncOperation con Retry Inteligente
**Objetivo:** Crear un hook genérico para operaciones asíncronas con retry.

**Instrucciones:**
1. Implementa `useAsyncOperation<T>` con opciones:
   - `maxRetries: number` (solo para errores de red, no 4xx)
   - `retryDelay: number` (con backoff exponencial)
   - `onSuccess?: () => void`
   - `onError?: (msg: string) => void`
2. Los errores 4xx NO deben reintentarse.
3. Los errores de red (fetch failed) SÍ deben reintentarse.
4. Los mensajes de error deben ser genéricos (no exponer status codes al UI).
5. Crea un componente que use el hook con un botón de "Ejecutar Operación".

---

### Ejercicio 8 – Optimistic Updates con Rollback
**Objetivo:** Implementar actualizaciones optimistas en una lista.

**Instrucciones:**
1. Crea una lista de tareas (TODO list) con toggle de completado.
2. Al hacer click en una tarea:
   - Marcar inmediatamente como completada/incompleta (optimistic)
   - Hacer la llamada API en segundo plano
   - Si la API falla: revertir al estado anterior + mostrar toast de error
3. Indica visualmente qué items están en estado "pending" (ej: opacidad reducida).
4. No permitir click en items pendientes (evitar doble toggle).

---

### Ejercicio 9 – Error Boundary Global
**Objetivo:** Implementar un manejo de errores global a nivel de aplicación.

**Instrucciones:**
1. Crea `GlobalErrorBoundary` como clase React.
2. Debe manejar diferentes tipos de error:
   - Error 401 → redirigir al login preservando la URL actual
   - Error 403 → mostrar página de acceso denegado
   - Error 500 → mostrar página de error genérica
3. Envuelve TODA la aplicación con este boundary.
4. En `componentDidCatch`, registrar el error en un mock de Sentry.
5. El mensaje mostrado al usuario NUNCA debe incluir el stack trace.

---

### Ejercicio 10 – Banner de Estado de Conexión
**Objetivo:** Mejorar la UX en condiciones de red degradada.

**Instrucciones:**
1. Implementa `useOnlineStatus()` usando los eventos `online`/`offline` del browser.
2. Crea `OfflineBanner` que aparece cuando no hay conexión.
3. Cuando se restaura la conexión:
   - Mostrar banner de "Conexión restaurada" por 3 segundos
   - Intentar resincronizar automáticamente (mock)
4. Las operaciones fallidas por falta de red deben encolarse y reintentarse al reconectar.
5. El banner debe tener `role="alert"` y `aria-live="assertive"`.

**Criterios de aceptación:**
- [ ] Banner visible inmediatamente al perder conexión (puedes simular offline en DevTools > Network > Offline)
- [ ] Banner desaparece al restaurar conexión (después de 3 segundos)
- [ ] Operaciones pendientes se reintentan al reconectar
- [ ] Accesible con lector de pantalla
