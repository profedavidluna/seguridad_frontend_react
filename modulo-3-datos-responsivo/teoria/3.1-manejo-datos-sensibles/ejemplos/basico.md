# Ejemplo Básico – Manejo de Datos Sensibles

## Nivel: 🟢 Básico

### Objetivo
Aprender a enmascarar datos sensibles en la interfaz de usuario.

---

## 1. Componente de Enmascaramiento de Contraseña

```tsx
// components/PasswordField.tsx
import { useState } from 'react';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function PasswordField({ label, value, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded px-3 py-2 pr-10"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-8 text-gray-500"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );
}
```

---

## 2. Enmascarar Número de Tarjeta

```tsx
// components/MaskedCard.tsx
interface MaskedCardProps {
  cardNumber: string; // "4532015112830366"
}

export function MaskedCard({ cardNumber }: MaskedCardProps) {
  // Solo mostrar los últimos 4 dígitos
  const masked = `**** **** **** ${cardNumber.slice(-4)}`;

  return (
    <span className="font-mono text-gray-700" aria-label="Número de tarjeta enmascarado">
      {masked}
    </span>
  );
}

// Uso:
// <MaskedCard cardNumber="4532015112830366" />
// Muestra: **** **** **** 0366
```

---

## 3. Enmascarar Email

```tsx
// utils/mask.ts

/**
 * Enmascara un email mostrando solo los primeros 3 caracteres y el dominio.
 * Ejemplo: "usuario@empresa.com" → "usu***@empresa.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 3);
  const masked = '*'.repeat(Math.max(local.length - 3, 3));
  return `${visible}${masked}@${domain}`;
}

/**
 * Enmascara un número de teléfono.
 * Ejemplo: "3001234567" → "300***4567"
 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return '***';
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 7)}${phone.slice(-4)}`;
}

// Uso:
// maskEmail("maria.garcia@empresa.com") → "mar*********@empresa.com"
// maskPhone("3001234567")               → "300***4567"
```

---

## 4. No Exponer Datos en console.log

```tsx
// ❌ MAL: Exponer datos sensibles en consola
function loginMal(email: string, password: string) {
  console.log('Login con:', email, password); // ¡NUNCA hacer esto!
  // ...
}

// ✅ BIEN: Solo loguear información no sensible
function loginBien(email: string, _password: string) {
  console.log('Intento de login para:', email); // Solo el email, no la contraseña
  // ...
}

// ✅ En producción, deshabilitar console.log sensibles:
if (process.env.NODE_ENV === 'production') {
  console.log = () => {}; // O usar una librería de logging segura
}
```

---

## Buenas Prácticas Clave

| Práctica | Descripción |
|----------|-------------|
| Enmascarar en UI | Mostrar `****` para contraseñas, tarjetas, etc. |
| No loguear datos sensibles | Nunca `console.log(password)` |
| Inputs type="password" | Usar el tipo correcto siempre |
| Limpiar formularios | Limpiar campos sensibles tras envío |
