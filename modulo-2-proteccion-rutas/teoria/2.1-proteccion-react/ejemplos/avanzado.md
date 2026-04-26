# Ejemplo Avanzado 2.1 — Permisos Multi-nivel con HOC y Context

## Descripción

Este ejemplo implementa un sistema de autorización empresarial completo con permisos granulares, HOCs componibles, motor de políticas de acceso (ABAC), y manejo avanzado de estados de sesión. Es el patrón utilizado en aplicaciones de escala empresarial real.

**Conceptos cubiertos:**
- Motor de políticas ABAC (Attribute-Based Access Control)
- HOCs componibles para autorización
- Sistema de permisos jerárquico y granular
- Detección automática de expiración de token
- Guards de autorización desacoplados de la UI
- Testing de componentes protegidos

---

## Arquitectura Avanzada

```
src/
├── auth/
│   ├── policies/
│   │   ├── types.ts              ← Tipos del motor de políticas
│   │   ├── engine.ts             ← Motor de evaluación de políticas
│   │   └── definitions.ts        ← Definición de políticas por recurso
│   ├── guards/
│   │   ├── AuthGuard.tsx         ← Guard de autenticación
│   │   ├── RoleGuard.tsx         ← Guard de roles
│   │   └── PermissionGuard.tsx   ← Guard de permisos granulares
│   ├── hoc/
│   │   ├── withAuth.tsx
│   │   ├── withRole.tsx
│   │   └── withPermission.tsx
│   └── context/
│       ├── AuthContext.tsx
│       └── PermissionContext.tsx
└── pages/
    └── (páginas protegidas)
```

---

## Código

### 1. Motor de Políticas de Acceso (ABAC)

```tsx
// src/auth/policies/types.ts

export type Action = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve';
export type Resource = 'users' | 'reports' | 'invoices' | 'settings' | 'audit_logs';
export type Role = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'AUDITOR' | 'USER';

export interface User {
  id: string;
  email: string;
  nombre: string;
  roles: Role[];
  departamento: string;
  nivelAcceso: 1 | 2 | 3 | 4 | 5; // 1=básico, 5=máximo
  permisos: string[]; // permisos granulares: 'resource:action'
}

export interface PolicyContext {
  usuario: User;
  recurso?: {
    tipo: Resource;
    id?: string;
    propietarioId?: string;
    departamento?: string;
    clasificacion?: 'PUBLICO' | 'INTERNO' | 'CONFIDENCIAL' | 'SECRETO';
  };
  ambiente?: {
    ip?: string;
    horario?: 'LABORAL' | 'FUERA_HORARIO';
    dispositivo?: 'CORPORATIVO' | 'PERSONAL';
  };
}

export type PolicyResult = {
  permitido: boolean;
  razon?: string;
  condiciones?: string[];
};

export type PolicyFunction = (ctx: PolicyContext) => PolicyResult;
```

---

### 2. Motor de evaluación de políticas

```tsx
// src/auth/policies/engine.ts
import { PolicyContext, PolicyResult, Resource, Action } from './types';
import { POLICIES } from './definitions';

class PolicyEngine {
  private policies = POLICIES;

  /**
   * Evalúa si un usuario puede realizar una acción sobre un recurso.
   */
  evaluate(
    context: PolicyContext,
    resource: Resource,
    action: Action
  ): PolicyResult {
    const policyKey = `${resource}:${action}`;
    const policy = this.policies[policyKey];

    if (!policy) {
      // Por defecto: denegar si no hay política definida
      return {
        permitido: false,
        razon: `No existe política para ${policyKey}`,
      };
    }

    return policy(context);
  }

  /**
   * Verifica si el usuario tiene un permiso granular directo.
   */
  hasDirectPermission(context: PolicyContext, permission: string): boolean {
    return context.usuario.permisos.includes(permission);
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados.
   */
  hasRole(context: PolicyContext, ...roles: string[]): boolean {
    return roles.some(r => context.usuario.roles.includes(r as any));
  }
}

export const policyEngine = new PolicyEngine();
```

---

### 3. Definición de políticas

```tsx
// src/auth/policies/definitions.ts
import { PolicyFunction, PolicyContext } from './types';

export const POLICIES: Record<string, PolicyFunction> = {

  'users:read': ({ usuario }) => ({
    permitido: usuario.roles.some(r =>
      ['ADMIN', 'MANAGER', 'AUDITOR'].includes(r)
    ),
    razon: 'Solo administradores, managers y auditores pueden ver usuarios',
  }),

  'users:create': ({ usuario }) => ({
    permitido: usuario.roles.includes('ADMIN') ||
               (usuario.roles.includes('MANAGER') && usuario.nivelAcceso >= 3),
    razon: 'Crear usuarios requiere ser ADMIN o MANAGER nivel 3+',
  }),

  'users:delete': ({ usuario, recurso }) => {
    // No puede eliminarse a sí mismo
    if (recurso?.id === usuario.id) {
      return { permitido: false, razon: 'No puedes eliminar tu propia cuenta' };
    }
    return {
      permitido: usuario.roles.includes('ADMIN'),
      razon: 'Solo administradores pueden eliminar usuarios',
    };
  },

  'reports:export': ({ usuario, recurso, ambiente }) => {
    // No permitir exportación fuera de horario laboral desde dispositivos personales
    if (
      ambiente?.horario === 'FUERA_HORARIO' &&
      ambiente?.dispositivo === 'PERSONAL'
    ) {
      return {
        permitido: false,
        razon: 'Exportación de reportes no permitida fuera de horario desde dispositivos personales',
        condiciones: ['Usa un dispositivo corporativo o trabaja en horario laboral'],
      };
    }

    // Solo pueden exportar datos confidenciales usuarios de nivel 4+
    if (
      recurso?.clasificacion === 'CONFIDENCIAL' &&
      usuario.nivelAcceso < 4
    ) {
      return {
        permitido: false,
        razon: 'Nivel de acceso insuficiente para datos confidenciales',
      };
    }

    return {
      permitido: usuario.roles.some(r => ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(r)),
      razon: 'Solo ADMIN, MANAGER y ACCOUNTANT pueden exportar reportes',
    };
  },

  'invoices:approve': ({ usuario, recurso }) => {
    // Solo puede aprobar facturas de su propio departamento (salvo ADMIN)
    if (usuario.roles.includes('ADMIN')) {
      return { permitido: true };
    }

    if (
      recurso?.departamento &&
      recurso.departamento !== usuario.departamento
    ) {
      return {
        permitido: false,
        razon: 'Solo puedes aprobar facturas de tu departamento',
      };
    }

    return {
      permitido: usuario.roles.some(r => ['MANAGER', 'ACCOUNTANT'].includes(r)),
      razon: 'Solo MANAGER y ACCOUNTANT pueden aprobar facturas',
    };
  },

  'audit_logs:read': ({ usuario }) => ({
    permitido: usuario.roles.includes('ADMIN') || usuario.roles.includes('AUDITOR'),
    razon: 'Solo administradores y auditores pueden ver logs de auditoría',
  }),

  'settings:edit': ({ usuario }) => ({
    permitido: usuario.roles.includes('ADMIN') && usuario.nivelAcceso >= 4,
    razon: 'La edición de configuración requiere ser ADMIN de nivel 4 o superior',
  }),
};
```

---

### 4. HOC `withAuth` — Componible

```tsx
// src/auth/hoc/withAuth.tsx
import { ComponentType, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface WithAuthOptions {
  redirectTo?: string;
  loadingComponent?: ReactNode;
  onUnauthenticated?: () => void;
}

/**
 * HOC de autenticación básica.
 * Verifica que el usuario tenga una sesión activa.
 */
export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    redirectTo = '/login',
    loadingComponent = <div>Verificando sesión...</div>,
  } = options;

  function WithAuthComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <>{loadingComponent}</>;

    if (!isAuthenticated) {
      return (
        <Navigate to={redirectTo} state={{ from: location }} replace />
      );
    }

    return <WrappedComponent {...props} />;
  }

  WithAuthComponent.displayName = `withAuth(${getDisplayName(WrappedComponent)})`;
  return WithAuthComponent;
}

// src/auth/hoc/withRole.tsx
import { ComponentType, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../policies/types';

export interface WithRoleOptions {
  requiredRole?: Role;
  anyRole?: Role[];
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * HOC de autorización por rol.
 * Debe usarse en combinación con withAuth.
 */
export function withRole<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithRoleOptions
) {
  const { requiredRole, anyRole, fallback, redirectTo = '/unauthorized' } = options;

  function WithRoleComponent(props: P) {
    const { hasRole, hasAnyRole } = useAuth();

    const tieneAcceso = (() => {
      if (requiredRole && !hasRole(requiredRole)) return false;
      if (anyRole && !hasAnyRole(...anyRole)) return false;
      return true;
    })();

    if (!tieneAcceso) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }

    return <WrappedComponent {...props} />;
  }

  WithRoleComponent.displayName = `withRole(${getDisplayName(WrappedComponent)})`;
  return WithRoleComponent;
}

// src/auth/hoc/withPermission.tsx
import { ComponentType, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePolicy } from '../context/PermissionContext';
import { Resource, Action } from '../policies/types';

export interface WithPermissionOptions {
  resource: Resource;
  action: Action;
  fallback?: ReactNode;
  redirectTo?: string;
  resourceContext?: {
    id?: string;
    propietarioId?: string;
    departamento?: string;
    clasificacion?: 'PUBLICO' | 'INTERNO' | 'CONFIDENCIAL' | 'SECRETO';
  };
}

/**
 * HOC de autorización por política granular (ABAC).
 * Evalúa el motor de políticas para decidir el acceso.
 */
export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithPermissionOptions
) {
  const { resource, action, fallback, redirectTo = '/unauthorized', resourceContext } = options;

  function WithPermissionComponent(props: P) {
    const { evaluate } = usePolicy();

    const result = evaluate(resource, action, resourceContext);

    if (!result.permitido) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to={redirectTo} state={{ razon: result.razon }} replace />;
    }

    return <WrappedComponent {...props} />;
  }

  WithPermissionComponent.displayName = `withPermission(${getDisplayName(WrappedComponent)})`;
  return WithPermissionComponent;
}

// Utilidad interna
function getDisplayName<P>(Component: ComponentType<P>): string {
  return Component.displayName || Component.name || 'Component';
}
```

---

### 5. Composición de HOCs

```tsx
// src/pages/InvoiceApproval.tsx
import { withAuth } from '../auth/hoc/withAuth';
import { withRole } from '../auth/hoc/withRole';
import { withPermission } from '../auth/hoc/withPermission';

// Componente base sin protección
function InvoiceApprovalBase() {
  return (
    <div>
      <h1>Aprobación de Facturas</h1>
      {/* Lógica de aprobación de facturas */}
    </div>
  );
}

// Aplicar HOCs en capas:
// 1. Verificar autenticación
// 2. Verificar rol
// 3. Verificar política granular
export const InvoiceApproval = withAuth(
  withRole(
    withPermission(InvoiceApprovalBase, {
      resource: 'invoices',
      action: 'approve',
    }),
    { anyRole: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] }
  )
);

// Alternativa: función compose para mayor legibilidad
import { compose } from '../utils/compose';

export const InvoiceApprovalV2 = compose(
  (C: any) => withAuth(C),
  (C: any) => withRole(C, { anyRole: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] }),
  (C: any) => withPermission(C, { resource: 'invoices', action: 'approve' }),
)(InvoiceApprovalBase);
```

---

### 6. PermissionContext con evaluación de políticas

```tsx
// src/auth/context/PermissionContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { policyEngine } from '../policies/engine';
import { Resource, Action, PolicyResult } from '../policies/types';

interface PermissionContextType {
  evaluate: (
    resource: Resource,
    action: Action,
    resourceCtx?: any
  ) => PolicyResult;
  can: (resource: Resource, action: Action) => boolean;
  cannot: (resource: Resource, action: Action) => boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const evaluate = (
    resource: Resource,
    action: Action,
    resourceCtx?: any
  ): PolicyResult => {
    if (!user) {
      return { permitido: false, razon: 'Usuario no autenticado' };
    }

    return policyEngine.evaluate(
      {
        usuario: user,
        recurso: resourceCtx ? { tipo: resource, ...resourceCtx } : undefined,
      },
      resource,
      action
    );
  };

  const can = (resource: Resource, action: Action) =>
    evaluate(resource, action).permitido;

  const cannot = (resource: Resource, action: Action) => !can(resource, action);

  return (
    <PermissionContext.Provider value={{ evaluate, can, cannot }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePolicy() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePolicy debe usarse dentro de PermissionProvider');
  }
  return context;
}
```

---

### 7. Detección de Expiración de Token

```tsx
// src/auth/hooks/useTokenExpiry.ts
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ADVERTENCIA_MS = 5 * 60 * 1000; // 5 minutos antes de expiración

export function useTokenExpiry() {
  const { tokens, logout } = useAuth();
  const navigate = useNavigate();
  const advertenciaTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const expiracionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!tokens?.expiresAt) return;

    const ahora = Date.now();
    const expiresAtMs = tokens.expiresAt * 1000;
    const tiempoRestante = expiresAtMs - ahora;

    if (tiempoRestante <= 0) {
      // Token ya expirado
      handleExpired();
      return;
    }

    const tiempoHastaAdvertencia = tiempoRestante - ADVERTENCIA_MS;

    // Programar advertencia si hay tiempo suficiente
    if (tiempoHastaAdvertencia > 0) {
      advertenciaTimerRef.current = setTimeout(() => {
        showExpiryWarning(Math.ceil(ADVERTENCIA_MS / 60000));
      }, tiempoHastaAdvertencia);
    }

    // Programar expiración automática
    expiracionTimerRef.current = setTimeout(handleExpired, tiempoRestante);

    return () => {
      if (advertenciaTimerRef.current) clearTimeout(advertenciaTimerRef.current);
      if (expiracionTimerRef.current) clearTimeout(expiracionTimerRef.current);
    };
  }, [tokens?.expiresAt]);

  const handleExpired = async () => {
    await logout();
    navigate('/session-expired', { replace: true });
  };

  const showExpiryWarning = (minutosRestantes: number) => {
    // Despachar evento para que cualquier componente pueda mostrarlo
    window.dispatchEvent(
      new CustomEvent('auth:session-warning', {
        detail: { minutosRestantes },
      })
    );
  };
}
```

---

### 8. Componente de advertencia de sesión

```tsx
// src/auth/components/SessionWarning.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function SessionWarning() {
  const [visible, setVisible] = useState(false);
  const [minutosRestantes, setMinutosRestantes] = useState(0);
  const { tokens, logout } = useAuth();

  useEffect(() => {
    const handleWarning = (event: CustomEvent) => {
      setMinutosRestantes(event.detail.minutosRestantes);
      setVisible(true);
    };

    window.addEventListener('auth:session-warning', handleWarning as EventListener);
    return () => {
      window.removeEventListener('auth:session-warning', handleWarning as EventListener);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="session-warning-banner" role="alert" aria-live="assertive">
      <div className="warning-content">
        <span className="warning-icon">⚠️</span>
        <p>
          Tu sesión expirará en <strong>{minutosRestantes} minutos</strong>.
          ¿Deseas extenderla?
        </p>
        <div className="warning-actions">
          <button
            onClick={async () => {
              // Lógica de refresco de token
              setVisible(false);
            }}
            className="btn-primary btn-sm"
          >
            Extender Sesión
          </button>
          <button
            onClick={() => { logout(); }}
            className="btn-secondary btn-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 9. Testing de componentes protegidos

```tsx
// src/auth/hoc/__tests__/withAuth.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { withAuth } from './withAuth';

// Componente de prueba
const ProtectedPage = withAuth(() => <div>Contenido protegido</div>);

// Helper para renderizar con contexto
function renderWithAuth(contextValue: any) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={contextValue}>
        <ProtectedPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('withAuth HOC', () => {
  it('muestra spinner mientras carga', () => {
    renderWithAuth({ isLoading: true, isAuthenticated: false });
    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
  });

  it('redirige al login si no está autenticado', () => {
    renderWithAuth({ isLoading: false, isAuthenticated: false });
    // MemoryRouter renderizará la redirección
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('muestra el contenido si está autenticado', () => {
    renderWithAuth({
      isLoading: false,
      isAuthenticated: true,
      user: { id: '1', roles: ['USER'] },
    });
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});
```

---

## Resumen del Sistema ABAC

```
Petición de Acción
       │
       ▼
  PolicyEngine.evaluate()
       │
       ├── Política definida? ──No──→ DENEGAR (fail-safe)
       │
       ▼ Sí
  Ejecutar PolicyFunction(context)
       │
       ├── ¿Usuario autenticado?
       ├── ¿Tiene el rol correcto?
       ├── ¿Tiene nivel de acceso suficiente?
       ├── ¿Recurso pertenece a su departamento?
       ├── ¿Horario y dispositivo permitidos?
       │
       ▼
  PolicyResult { permitido, razon, condiciones }
       │
       ├── permitido=true  → Renderizar componente
       └── permitido=false → Mostrar fallback o redirigir
```

> 💡 Este sistema puede extenderse fácilmente agregando nuevas políticas en `definitions.ts` sin modificar el código de los componentes o HOCs.
