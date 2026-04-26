# Ejemplo Intermedio: Creación y Validación de JWT con Roles

> **Nivel:** 🟡 Intermedio | **Tiempo estimado:** 45 minutos

---

## Objetivo

Implementar un sistema completo de generación y validación de JWT en Node.js/TypeScript con soporte de roles, utilizando la librería `jsonwebtoken`. Incluye un servicio de autenticación y un middleware de verificación.

---

## Dependencias

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

---

## Estructura del Ejemplo

```
src/
├── auth/
│   ├── jwt.service.ts        ← Lógica de generación/validación JWT
│   ├── auth.middleware.ts    ← Middleware de verificación para Express
│   └── types.ts              ← Interfaces TypeScript
└── index.ts                  ← Ejemplo de uso
```

---

## Código 1: Tipos TypeScript

```typescript
// src/auth/types.ts

export interface UserPayload {
  sub: string;          // User ID
  email: string;
  roles: UserRole[];
  permissions: string[];
  tenantId?: string;
}

export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer' | 'user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;      // Segundos hasta expiración del access token
}

export interface DecodedToken extends UserPayload {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string;
}

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;   // e.g. "15m", "1h"
  refreshTokenExpiresIn: string;  // e.g. "7d", "30d"
  issuer: string;
  audience: string;
}
```

---

## Código 2: Servicio JWT

```typescript
// src/auth/jwt.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { UserPayload, TokenPair, DecodedToken, JWTConfig } from './types';

export class JWTService {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  /**
   * Genera un par de tokens (access + refresh) para un usuario.
   */
  generateTokenPair(user: UserPayload): TokenPair {
    const jti = crypto.randomUUID(); // ID único para este token
    
    // Permisos derivados de los roles (lógica empresarial)
    const permissions = this.derivePermissions(user.roles);
    
    // Access Token: corta duración, con toda la información del usuario
    const accessToken = jwt.sign(
      {
        sub: user.sub,
        email: user.email,
        roles: user.roles,
        permissions,
        tenantId: user.tenantId,
        jti,
      },
      this.config.accessTokenSecret,
      {
        expiresIn: this.config.accessTokenExpiresIn,
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithm: 'HS256',
      }
    );

    // Refresh Token: larga duración, mínima información
    const refreshToken = jwt.sign(
      {
        sub: user.sub,
        jti: crypto.randomUUID(), // JTI diferente al del access token
        type: 'refresh',
      },
      this.config.refreshTokenSecret,
      {
        expiresIn: this.config.refreshTokenExpiresIn,
        issuer: this.config.issuer,
        algorithm: 'HS256',
      }
    );

    // Calcular segundos hasta expiración del access token
    const decoded = jwt.decode(accessToken) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Verifica y decodifica un access token.
   * Lanza una excepción si el token es inválido o está expirado.
   */
  verifyAccessToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.config.accessTokenSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256'],
      }) as DecodedToken;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('TOKEN_INVALID');
      }
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Verifica un refresh token.
   */
  verifyRefreshToken(token: string): { sub: string; jti: string } {
    try {
      const decoded = jwt.verify(token, this.config.refreshTokenSecret, {
        issuer: this.config.issuer,
        algorithms: ['HS256'],
      }) as { sub: string; jti: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new Error('TOKEN_INVALID_TYPE');
      }

      return { sub: decoded.sub, jti: decoded.jti };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      throw new Error('REFRESH_TOKEN_INVALID');
    }
  }

  /**
   * Decodifica un token SIN verificar la firma.
   * Solo para uso en el frontend (leer claims para UI).
   */
  decodeWithoutVerification(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken;
    } catch {
      return null;
    }
  }

  /**
   * Verifica si un usuario tiene un rol específico.
   */
  hasRole(decoded: DecodedToken, role: string): boolean {
    return decoded.roles?.includes(role as never) ?? false;
  }

  /**
   * Verifica si un usuario tiene un permiso específico.
   */
  hasPermission(decoded: DecodedToken, permission: string): boolean {
    return decoded.permissions?.includes(permission) ?? false;
  }

  /**
   * Deriva permisos a partir de roles (lógica de negocio).
   */
  private derivePermissions(roles: string[]): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: [
        'users:read', 'users:write', 'users:delete',
        'articles:read', 'articles:write', 'articles:delete',
        'settings:read', 'settings:write',
        'reports:read',
      ],
      manager: [
        'users:read', 'users:write',
        'articles:read', 'articles:write',
        'reports:read',
      ],
      editor: [
        'articles:read', 'articles:write',
      ],
      viewer: [
        'articles:read',
      ],
      user: [
        'articles:read',
        'profile:read', 'profile:write',
      ],
    };

    const permissions = new Set<string>();
    
    for (const role of roles) {
      const rolePermissions = permissionMap[role] ?? [];
      rolePermissions.forEach(p => permissions.add(p));
    }
    
    return Array.from(permissions);
  }
}
```

---

## Código 3: Middleware de Express

```typescript
// src/auth/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import type { JWTService } from './jwt.service';
import type { DecodedToken } from './types';

// Extender el tipo Request de Express para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * Middleware de autenticación: verifica el JWT en el header Authorization.
 */
export function authenticate(jwtService: JWTService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Se requiere autenticación. Incluye el header Authorization: Bearer <token>',
      });
      return;
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'INVALID_AUTH_FORMAT',
        message: 'Formato de autorización inválido. Usa: Bearer <token>',
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remover "Bearer "
    
    try {
      const decoded = jwtService.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage === 'TOKEN_EXPIRED') {
        res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'El token ha expirado. Por favor, renuévalo.',
        });
        return;
      }
      
      res.status(401).json({
        error: 'TOKEN_INVALID',
        message: 'Token de autenticación inválido.',
      });
    }
  };
}

/**
 * Middleware de autorización por roles.
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    
    const hasRequiredRole = roles.some(role => req.user!.roles?.includes(role as never));
    
    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`,
        userRoles: req.user.roles,
        requiredRoles: roles,
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware de autorización por permisos granulares.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    
    if (!req.user.permissions?.includes(permission)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `No tienes el permiso requerido: ${permission}`,
      });
      return;
    }
    
    next();
  };
}
```

---

## Código 4: Ejemplo de Uso Completo

```typescript
// src/index.ts
import express from 'express';
import { JWTService } from './auth/jwt.service';
import { authenticate, requireRoles, requirePermission } from './auth/auth.middleware';

const app = express();
app.use(express.json());

// Instanciar el servicio JWT con configuración
const jwtService = new JWTService({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-CAMBIAR-en-produccion',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-CAMBIAR-en-produccion',
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  issuer: 'https://auth.empresa.com',
  audience: 'https://api.empresa.com',
});

// ─── RUTAS PÚBLICAS ──────────────────────────────────────────────────────────

// Simular login y generar tokens
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Aquí irían las verificaciones reales de base de datos y bcrypt
  // Por simplicidad, hardcodeamos un usuario de prueba
  if (email === 'admin@empresa.com' && password === 'password123') {
    const tokens = jwtService.generateTokenPair({
      sub: 'usr_abc123',
      email: 'admin@empresa.com',
      roles: ['admin'],
      permissions: [], // Se derivan automáticamente de los roles
    });
    
    res.json({
      message: 'Login exitoso',
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      // El refresh token iría en una cookie httpOnly, no en el body
      // res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true })
    });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// ─── RUTAS PROTEGIDAS ────────────────────────────────────────────────────────

// Solo requiere estar autenticado
app.get('/api/profile', authenticate(jwtService), (req, res) => {
  res.json({
    message: 'Perfil del usuario',
    user: {
      id: req.user!.sub,
      email: req.user!.email,
      roles: req.user!.roles,
    }
  });
});

// Requiere rol de admin
app.get('/api/admin/users',
  authenticate(jwtService),
  requireRoles('admin'),
  (req, res) => {
    res.json({ message: 'Lista de usuarios (solo para admins)', users: [] });
  }
);

// Requiere permiso granular específico
app.delete('/api/articles/:id',
  authenticate(jwtService),
  requirePermission('articles:delete'),
  (req, res) => {
    res.json({ message: `Artículo ${req.params.id} eliminado` });
  }
);

// Requiere uno de varios roles (manager O admin)
app.get('/api/reports',
  authenticate(jwtService),
  requireRoles('admin', 'manager'),
  (req, res) => {
    res.json({ message: 'Reporte de datos (admin o manager)' });
  }
);

app.listen(3001, () => {
  console.log('✅ Servidor corriendo en http://localhost:3001');
});
```

---

## 🧪 Prueba con cURL

```bash
# 1. Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"password123"}'

# 2. Usar el token obtenido
TOKEN="eyJ..."  # Pega aquí el accessToken del paso anterior

# 3. Acceder a ruta protegida
curl http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN"

# 4. Acceder a ruta de admin
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

# 5. Intentar sin token (debería dar 401)
curl http://localhost:3001/api/profile
```

---

## 📊 Salida Esperada

```json
// POST /auth/login
{
  "message": "Login exitoso",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}

// GET /api/profile (con token válido)
{
  "message": "Perfil del usuario",
  "user": {
    "id": "usr_abc123",
    "email": "admin@empresa.com",
    "roles": ["admin"]
  }
}

// GET /api/profile (sin token)
{
  "error": "UNAUTHORIZED",
  "message": "Se requiere autenticación. Incluye el header Authorization: Bearer <token>"
}
```

---

*← [Ejemplo Básico](./basico.md) | [→ Ejemplo Avanzado](./avanzado.md)*
