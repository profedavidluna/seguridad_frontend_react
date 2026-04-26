# Ejemplo Avanzado – Capa de Protección de Datos con Auditoría

## Nivel: 🔴 Avanzado

---

## 1. DataProtectionLayer – Capa Centralizada de Protección

```tsx
// lib/DataProtectionLayer.ts

type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

interface FieldPolicy {
  sensitivity: SensitivityLevel;
  mask?: (value: string) => string;
  canReveal?: (userRole: string) => boolean;
  auditOnAccess?: boolean;
}

type SchemaPolicy<T> = {
  [K in keyof T]?: FieldPolicy;
};

class DataProtectionLayer<T extends Record<string, unknown>> {
  constructor(
    private schema: SchemaPolicy<T>,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Aplica políticas de protección a un objeto de datos según el rol del usuario.
   */
  protect(data: T, userRole: string): Partial<T> {
    const protected_: Partial<T> = {};

    for (const key in data) {
      const policy = this.schema[key as keyof T];

      if (!policy) {
        protected_[key as keyof T] = data[key] as T[keyof T];
        continue;
      }

      const { sensitivity, mask, canReveal, auditOnAccess } = policy;

      // Si el campo es restringido y el usuario no puede verlo
      if (sensitivity === 'restricted' && canReveal && !canReveal(userRole)) {
        protected_[key as keyof T] = '[RESTRINGIDO]' as T[keyof T];

        if (auditOnAccess) {
          this.auditLogger.log({
            action: 'FIELD_ACCESS_DENIED',
            field: key,
            userRole,
            timestamp: new Date().toISOString(),
          });
        }
        continue;
      }

      // Aplicar máscara si existe
      if (mask && typeof data[key] === 'string') {
        protected_[key as keyof T] = mask(data[key] as string) as T[keyof T];

        if (auditOnAccess) {
          this.auditLogger.log({
            action: 'SENSITIVE_FIELD_ACCESSED',
            field: key,
            sensitivity,
            userRole,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        protected_[key as keyof T] = data[key] as T[keyof T];
      }
    }

    return protected_;
  }
}

// Ejemplo de uso con datos de empleado
interface EmployeeData {
  id: string;
  name: string;
  email: string;
  salary: string;
  ssn: string; // Número de seguridad social
  department: string;
}

const employeeSchema: SchemaPolicy<EmployeeData> = {
  email: {
    sensitivity: 'internal',
    mask: (v) => `${v.slice(0, 2)}****@${v.split('@')[1]}`,
    auditOnAccess: true,
  },
  salary: {
    sensitivity: 'confidential',
    mask: (v) => `$${v.slice(0, -3)}***`,
    canReveal: (role) => ['admin', 'hr'].includes(role),
    auditOnAccess: true,
  },
  ssn: {
    sensitivity: 'restricted',
    mask: (v) => `***-**-${v.slice(-4)}`,
    canReveal: (role) => role === 'admin',
    auditOnAccess: true,
  },
};
```

---

## 2. Audit Logger

```tsx
// lib/AuditLogger.ts

interface AuditEvent {
  action: string;
  field?: string;
  sensitivity?: string;
  userRole: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class AuditLogger {
  private buffer: AuditEvent[] = [];
  private readonly flushInterval = 5000; // ms

  constructor() {
    // Enviar buffer periódicamente al servidor
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  log(event: AuditEvent): void {
    this.buffer.push(event);

    // Flush inmediato para eventos críticos
    if (event.action.includes('DENIED') || event.action.includes('BREACH')) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        // Usar sendBeacon para garantizar envío al cerrar la página
      });
    } catch {
      // Re-encolar si falla (con límite)
      if (this.buffer.length < 100) {
        this.buffer.unshift(...events);
      }
    }
  }
}

export const auditLogger = new AuditLogger();
```

---

## 3. Hook useProtectedData

```tsx
// hooks/useProtectedData.ts
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { DataProtectionLayer } from '../lib/DataProtectionLayer';
import { auditLogger } from '../lib/AuditLogger';

export function useProtectedData<T extends Record<string, unknown>>(
  data: T | null,
  schema: SchemaPolicy<T>
): Partial<T> | null {
  const { user } = useAuth();

  return useMemo(() => {
    if (!data || !user) return null;

    const dpl = new DataProtectionLayer(schema, auditLogger);
    return dpl.protect(data, user.role);
  }, [data, schema, user]);
}

// Uso en componente:
function EmployeeProfile({ employee }: { employee: EmployeeData }) {
  const protectedData = useProtectedData(employee, employeeSchema);

  if (!protectedData) return null;

  return (
    <div>
      <p>Nombre: {protectedData.name}</p>
      <p>Email: {protectedData.email}</p>
      <p>Salario: {protectedData.salary}</p>
      <p>SSN: {protectedData.ssn}</p>
    </div>
  );
}
```

---

## 4. Content Security Policy (CSP) en Next.js

```typescript
// middleware.ts – Configurar CSP headers
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-nonce': nonce,
      }),
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
```

---

## Conceptos Aplicados

| Concepto | Implementación |
|----------|---------------|
| Data Classification | `SensitivityLevel` con 4 niveles |
| RBAC en datos | `canReveal` por rol |
| Audit Trail | `AuditLogger` con buffer y flush |
| CSP Headers | Nonce-based en middleware |
| Defense in depth | Múltiples capas de protección |
