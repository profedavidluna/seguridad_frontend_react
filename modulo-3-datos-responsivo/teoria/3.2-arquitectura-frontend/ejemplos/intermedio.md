# Ejemplo Intermedio – Arquitectura Feature-First y Separación de Responsabilidades

## Nivel: 🟡 Intermedio

---

## 1. Arquitectura Feature-First (Domain-Driven)

```
src/
├── features/                    # Módulos de dominio
│   ├── auth/
│   │   ├── components/          # Componentes específicos de auth
│   │   │   ├── LoginForm.tsx
│   │   │   └── LogoutButton.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── authService.ts   # Llamadas API de auth
│   │   ├── store/
│   │   │   └── authStore.ts     # Estado global de auth
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts             # Barrel export (API pública del feature)
│   │
│   ├── users/
│   │   ├── components/
│   │   │   └── UserProfile.tsx
│   │   ├── hooks/
│   │   │   └── useUser.ts
│   │   ├── services/
│   │   │   └── userService.ts
│   │   └── index.ts
│   │
│   └── products/
│       └── ...
│
├── shared/                      # Compartido entre features
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Modal.tsx
│   ├── hooks/
│   │   ├── useFetch.ts
│   │   └── useLocalStorage.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
│
└── app/                         # Configuración de la app
    ├── providers.tsx
    ├── router.tsx
    └── store.ts
```

---

## 2. Barrel Exports – API Pública del Feature

```tsx
// features/auth/index.ts
// Solo exportar lo que otros features necesitan
export { LoginForm } from './components/LoginForm';
export { LogoutButton } from './components/LogoutButton';
export { useAuth } from './hooks/useAuth';
export type { AuthUser, AuthState } from './types/auth.types';

// ❌ NO exportar internals:
// export { authReducer } from './store/authReducer'; // Internal
// export { hashPassword } from './utils/crypto'; // Internal
```

```tsx
// Uso en otro feature - importar desde el barrel, no directamente
// ✅ BIEN:
import { useAuth } from '@/features/auth';

// ❌ MAL (acoplamiento a internals):
import { useAuth } from '@/features/auth/hooks/useAuth';
```

---

## 3. Service Layer – Abstracción de API

```tsx
// features/users/services/userService.ts
import { apiClient } from '@/shared/lib/apiClient';
import type { UserProfile, UpdateUserDto } from '../types/user.types';

export const userService = {
  async getProfile(userId: string): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>(`/users/${userId}`);
    return data;
  },

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserProfile> {
    const { data } = await apiClient.patch<UserProfile>(`/users/${userId}`, dto);
    return data;
  },

  async deleteAccount(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  },
};

// features/users/hooks/useUser.ts
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { UserProfile } from '../types/user.types';

export function useUser(userId: string) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    userService
      .getProfile(userId)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  return { user, loading, error };
}
```

---

## 4. Providers Pattern – Composición de Contextos

```tsx
// app/providers.tsx
'use client';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider } from '@/features/theme';
import { NotificationProvider } from '@/features/notifications';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: (failureCount, error: any) => {
        // No reintentar en errores 401/403
        if ([401, 403].includes(error?.response?.status)) return false;
        return failureCount < 3;
      },
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 5. Lazy Loading de Features

```tsx
// app/router.tsx (React Router) o app/dashboard/admin/page.tsx (Next.js)
import { lazy, Suspense } from 'react';

// Cargar el módulo admin solo cuando sea necesario
const AdminDashboard = lazy(() =>
  import('@/features/admin').then((module) => ({
    default: module.AdminDashboard,
  }))
);

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />
    </Routes>
  );
}
```

---

## Comparación de Arquitecturas

| Característica | Layer-Based | Feature-First |
|----------------|-------------|---------------|
| Escalabilidad | Baja | Alta |
| Cohesión | Baja | Alta |
| Acoplamiento | Alto | Bajo |
| Onboarding | Fácil | Medio |
| Equipos grandes | Problemático | Ideal |
| Recomendado para | Proyectos pequeños | Proyectos empresariales |
