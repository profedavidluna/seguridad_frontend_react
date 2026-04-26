# Ejemplo Intermedio – Protección de Campos Sensibles y Sanitización

## Nivel: 🟡 Intermedio

---

## 1. Hook useSecureForm – Formulario con Sanitización

```tsx
// hooks/useSecureForm.ts
import { useState, useCallback } from 'react';
import DOMPurify from 'dompurify'; // npm install dompurify @types/dompurify

interface FormConfig<T> {
  initialValues: T;
  sensitiveFields?: (keyof T)[];
}

export function useSecureForm<T extends Record<string, string>>({
  initialValues,
  sensitiveFields = [],
}: FormConfig<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const sanitize = useCallback((value: string, isSensitive: boolean): string => {
    if (isSensitive) return value; // No sanitizar contraseñas (rompe caracteres válidos)
    return DOMPurify.sanitize(value.trim()); // Sanitizar campos de texto
  }, []);

  const handleChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const isSensitive = sensitiveFields.includes(field);
      const sanitized = sanitize(e.target.value, isSensitive);
      setValues((prev) => ({ ...prev, [field]: sanitized }));
    },
    [sanitize, sensitiveFields]
  );

  const clearSensitiveFields = useCallback(() => {
    const cleared = { ...values };
    sensitiveFields.forEach((field) => {
      (cleared[field] as string) = '';
    });
    setValues(cleared);
  }, [values, sensitiveFields]);

  return { values, errors, setErrors, handleChange, clearSensitiveFields };
}
```

---

## 2. Componente SensitiveDataDisplay

```tsx
// components/SensitiveDataDisplay.tsx
import { useState } from 'react';

interface SensitiveDataProps {
  label: string;
  value: string;
  type?: 'card' | 'phone' | 'email' | 'generic';
}

function maskValue(value: string, type: string): string {
  switch (type) {
    case 'card':
      return value.replace(/\d(?=\d{4})/g, '*'); // 4111111111111111 → ************1111
    case 'phone':
      return value.replace(/(\d{3})\d+(\d{4})/, '$1****$2');
    case 'email': {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 2)}${'*'.repeat(local.length - 2)}@${domain}`;
    }
    default:
      return '*'.repeat(value.length);
  }
}

export function SensitiveDataDisplay({ label, value, type = 'generic' }: SensitiveDataProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
      <span className="text-sm text-gray-600 w-24">{label}:</span>
      <span className="font-mono flex-1">
        {revealed ? value : maskValue(value, type)}
      </span>
      <button
        onClick={() => setRevealed((r) => !r)}
        className="text-blue-600 text-sm hover:underline"
        aria-label={revealed ? 'Ocultar dato' : 'Revelar dato'}
      >
        {revealed ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  );
}
```

---

## 3. Sanitización de Inputs para Prevenir XSS

```tsx
// utils/sanitize.ts

/**
 * Elimina etiquetas HTML peligrosas de un string.
 * Usar para inputs de texto libre (nombres, comentarios, etc.)
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida que solo contenga caracteres seguros para un nombre.
 */
export function validateName(name: string): boolean {
  const safeNameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
  return safeNameRegex.test(name);
}

/**
 * Valida email con regex seguro.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Limpia un objeto de datos antes de enviar al servidor.
 * Elimina campos undefined/null y sanitiza strings.
 */
export function sanitizePayload<T extends Record<string, unknown>>(data: T): Partial<T> {
  const clean: Partial<T> = {};
  for (const key in data) {
    const value = data[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      (clean[key] as string) = sanitizeText(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
```

---

## 4. Limpiar Datos al Desmontar Componente

```tsx
// pages/PaymentForm.tsx
import { useEffect, useRef, useState } from 'react';

export function PaymentForm() {
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      // Limpiar datos sensibles al desmontar el componente
      isMounted.current = false;
      setCardNumber('');
      setCvv('');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await processPayment({ cardNumber, cvv });
    } finally {
      // Limpiar siempre después de enviar
      if (isMounted.current) {
        setCardNumber('');
        setCvv('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <input
        type="text"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
        placeholder="Número de tarjeta"
        inputMode="numeric"
        autoComplete="cc-number"
      />
      <input
        type="password"
        value={cvv}
        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="CVV"
        autoComplete="cc-csc"
      />
      <button type="submit">Pagar</button>
    </form>
  );
}

async function processPayment(_data: { cardNumber: string; cvv: string }) {
  // Implementación real del pago
}
```

---

## Buenas Prácticas

- ✅ Sanitizar texto libre siempre antes de mostrar o enviar
- ✅ Limpiar campos sensibles tras submit o unmount
- ✅ Usar `type="password"` e `inputMode` correcto
- ✅ Validar en cliente Y en servidor (nunca solo en uno)
- ❌ Nunca confiar solo en validación frontend
