# Ejemplo Avanzado – Arquitectura Escalable con Server Actions y Monorepo

## Nivel: 🔴 Avanzado

---

## 1. Server Actions en Next.js 14+

```tsx
// app/actions/auth.actions.ts
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signJWT, verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';

const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña muy corta'),
});

export type LoginState = {
  errors?: { email?: string[]; password?: string[]; _form?: string[] };
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // 1. Validar datos del formulario en el servidor
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  // 2. Verificar usuario en base de datos
  const user = await db.users.findByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    // Mensaje genérico - no revelar si el email existe
    return { errors: { _form: ['Credenciales incorrectas'] } };
  }

  // 3. Generar tokens
  const accessToken = await signJWT(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: '15m' }
  );
  const refreshToken = await signJWT({ sub: user.id }, { expiresIn: '7d' });

  // 4. Establecer cookies httpOnly (en el servidor)
  const cookieStore = cookies();
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
    path: '/',
  });
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/api/auth/refresh',
  });

  redirect('/dashboard');
}

// Uso en componente (con useFormState)
// app/(auth)/login/page.tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from '@/app/actions/auth.actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, {});

  return (
    <form action={action}>
      <input name="email" type="email" />
      {state.errors?.email && <p>{state.errors.email[0]}</p>}

      <input name="password" type="password" />
      {state.errors?.password && <p>{state.errors.password[0]}</p>}

      {state.errors?._form && <p>{state.errors._form[0]}</p>}

      <SubmitButton />
    </form>
  );
}
```

---

## 2. Estructura de Monorepo con Turborepo

```
empresa-monorepo/
├── apps/
│   ├── web/                    # App principal Next.js
│   ├── admin/                  # Panel de administración
│   └── mobile-bff/             # Backend for Frontend móvil
│
├── packages/
│   ├── ui/                     # Librería de componentes compartidos
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── auth/                   # Lógica de auth compartida
│   │   ├── src/
│   │   │   ├── jwt.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── types/                  # Tipos TypeScript compartidos
│   │   └── src/index.ts
│   │
│   └── config/                 # Configuraciones compartidas
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── turbo.json
└── package.json
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 3. Optimistic Updates con React Query

```tsx
// features/users/hooks/useUpdateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import type { UserProfile, UpdateUserDto } from '../types';

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateUserDto) => userService.updateProfile(userId, dto),

    // Actualización optimista
    onMutate: async (newData) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: ['user', userId] });

      // Guardar snapshot del estado anterior
      const previousUser = queryClient.getQueryData<UserProfile>(['user', userId]);

      // Actualizar optimistamente
      queryClient.setQueryData<UserProfile>(['user', userId], (old) => ({
        ...old!,
        ...newData,
      }));

      return { previousUser };
    },

    // Si falla, revertir
    onError: (_err, _newData, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', userId], context.previousUser);
      }
    },

    // Siempre re-validar con el servidor
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}
```

---

## 4. Error Boundaries por Feature

```tsx
// shared/components/FeatureErrorBoundary.tsx
'use client';
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class FeatureErrorBoundary extends React.Component<
  { children: React.ReactNode; feature: string; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Registrar en servicio de monitoreo (Sentry, etc.)
    console.error(`[${this.props.feature}] Error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-200 rounded bg-red-50">
          <p className="text-red-600">
            Ocurrió un error en {this.props.feature}. Por favor recarga la página.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
```
