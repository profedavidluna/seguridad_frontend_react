# Ejercicios – Manejo Responsable de Datos Sensibles

## Sección 3.1

---

## 🟢 Nivel Básico

### Ejercicio 1 – Enmascarar Tarjeta de Crédito
**Objetivo:** Crear un componente React que muestre un número de tarjeta enmascarado.

**Instrucciones:**
1. Crea un componente `<CreditCard />` que reciba el número completo como prop.
2. Muestra solo los últimos 4 dígitos: `**** **** **** 1234`.
3. Agrega un botón que permita revelar/ocultar el número completo.
4. Usa `aria-label` apropiado para accesibilidad.

**Entrada esperada:** `"4532015112830366"`
**Salida esperada:** `**** **** **** 0366` (con botón para revelar)

**Criterios de éxito:**
- [ ] Número enmascarado por defecto
- [ ] Botón toggle funcional
- [ ] Atributos de accesibilidad presentes

---

### Ejercicio 2 – Validar Formulario Seguro
**Objetivo:** Implementar validación básica en un formulario de registro.

**Instrucciones:**
1. Crea un formulario con: nombre, email, contraseña.
2. Valida que el email tenga formato correcto.
3. Valida que la contraseña tenga mínimo 8 caracteres.
4. Muestra mensajes de error que no revelen información sensible.

**Criterios de éxito:**
- [ ] Validación de email funciona
- [ ] Mensaje de error genérico (sin decir "email no encontrado")
- [ ] El campo contraseña usa `type="password"`

---

### Ejercicio 3 – Limpiar Datos en Logout
**Objetivo:** Asegurarse de que los datos sensibles se limpian al cerrar sesión.

**Instrucciones:**
1. Crea un componente con estado que almacene datos de usuario (nombre, email).
2. Implementa función `logout()` que limpie el estado.
3. Verifica que después del logout no haya datos residuales en el estado.

---

## 🟡 Nivel Intermedio

### Ejercicio 4 – Hook useSecureInput
**Objetivo:** Crear un hook que sanitice automáticamente los inputs.

**Instrucciones:**
1. Crea `useSecureInput(initialValue: string)`.
2. El hook debe sanitizar el valor removiendo caracteres HTML (`<`, `>`, `"`, `'`).
3. Debe retornar `{ value, onChange, error }`.
4. Si detecta un intento de XSS, establecer `error: "Contenido no permitido"`.

**Caso de prueba:**
```
Input: "<script>alert('xss')</script>"
Output: value = "", error = "Contenido no permitido"
```

---

### Ejercicio 5 – Componente de Datos con Política de Visibilidad
**Objetivo:** Implementar un componente que muestre datos según el rol del usuario.

**Instrucciones:**
1. Crea un componente `<EmployeeCard />` que reciba datos de empleado.
2. Un usuario con rol `"hr"` puede ver el salario.
3. Un usuario con rol `"employee"` ve el salario enmascarado.
4. Nadie puede ver el SSN excepto `"admin"`.

```tsx
interface Employee {
  name: string;
  department: string;
  salary: number;
  ssn: string;
}
```

---

### Ejercicio 6 – Detectar DevTools Abierto
**Objetivo:** Implementar una advertencia cuando las DevTools están abiertas en producción.

**Instrucciones:**
1. Implementa un hook `useDevToolsDetection()`.
2. Si las DevTools están abiertas, mostrar un banner de advertencia.
3. Registrar el evento en un log de seguridad (mock).

> **Nota:** Esto es una medida de disuasión, no de seguridad real. Discutir por qué.

---

## 🔴 Nivel Avanzado

### Ejercicio 7 – Implementar Content Security Policy
**Objetivo:** Configurar CSP en una aplicación Next.js para prevenir XSS.

**Instrucciones:**
1. Crea un `middleware.ts` en Next.js que agregue headers CSP.
2. Configura los siguientes headers:
   - `Content-Security-Policy` con `default-src 'self'`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
3. Prueba que los scripts inline son bloqueados.
4. Implementa nonces para scripts necesarios.

---

### Ejercicio 8 – Sistema de Clasificación de Datos
**Objetivo:** Crear un sistema que clasifique y proteja datos automáticamente.

**Instrucciones:**
1. Define un enum `DataClassification`: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
2. Crea un decorator/wrapper que aplique la clasificación a campos de un objeto.
3. Al renderizar, aplica automáticamente la máscara según la clasificación y el rol del usuario.
4. Registra en un audit log cada acceso a datos `CONFIDENTIAL` o `RESTRICTED`.

---

### Ejercicio 9 – Prevenir Screenshot de Datos Sensibles
**Objetivo:** Investigar y discutir técnicas para dificultar capturas de pantalla de datos sensibles.

**Instrucciones:**
1. Investiga el CSS `user-select: none` y sus limitaciones.
2. Implementa un componente que use `pointer-events: none` en datos sensibles.
3. Explica en un comentario por qué estas medidas son insuficientes por sí solas.
4. Propón una estrategia de seguridad en capas para proteger datos sensibles visualmente.

---

### Ejercicio 10 – Audit Trail Completo
**Objetivo:** Implementar un sistema de auditoría para accesos a datos sensibles.

**Instrucciones:**
1. Crea `AuditService` con métodos: `logAccess()`, `logDenied()`, `logExport()`.
2. Integra el audit en el hook `useProtectedData`.
3. Implementa un buffer que envíe eventos en lote cada 10 segundos.
4. Asegura que los eventos se envíen antes de cerrar la página (`beforeunload`).
5. El audit log debe incluir: timestamp, userId, action, field, sensitivity level.

**Criterios de aceptación:**
- [ ] Los accesos a datos CONFIDENTIAL quedan registrados
- [ ] Los intentos denegados generan alerta inmediata
- [ ] El buffer no pierde eventos al recargar la página (usar `sessionStorage`)
