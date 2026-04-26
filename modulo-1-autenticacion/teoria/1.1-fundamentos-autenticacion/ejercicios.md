# Ejercicios: Fundamentos de Autenticación JWT

> **Sección:** 1.1 | **Total:** 10 ejercicios | **Tiempo estimado:** 3-4 horas

---

## 📋 Índice de Ejercicios

| # | Título | Nivel | Tiempo |
|---|--------|-------|--------|
| 1 | Decodificar JWT manualmente | 🟢 Básico | 15 min |
| 2 | Identificar claims estándar | 🟢 Básico | 20 min |
| 3 | Verificar expiración de token | 🟢 Básico | 20 min |
| 4 | Crear función de validación de roles | 🟡 Intermedio | 30 min |
| 5 | Implementar generador de tokens | 🟡 Intermedio | 45 min |
| 6 | Comparar HS256 vs RS256 | 🟡 Intermedio | 30 min |
| 7 | Implementar rotación de refresh tokens | 🔴 Avanzado | 60 min |
| 8 | Detectar tokens manipulados | 🔴 Avanzado | 45 min |
| 9 | Sistema de revocación de tokens | 🔴 Avanzado | 60 min |
| 10 | Auditoría de claims en JWT | 🔴 Avanzado | 45 min |

---

## 🟢 Ejercicio 1: Decodificar JWT Manualmente

**Nivel:** Básico | **Tiempo:** 15 minutos

### Descripción

Dado el siguiente JWT, decodifica manualmente las partes header y payload **sin usar ninguna librería**. Identifica todos los claims y explica qué significa cada uno.

### Token de Prueba

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InByb2RfMjAyNCJ9.eyJzdWIiOiJ1c3JfeDk5ejEyMyIsImVtYWlsIjoibWFyaWFAZW1wcmVzYS5jb20iLCJyb2xlcyI6WyJtYW5hZ2VyIiwiZWRpdG9yIl0sInRlbmFudCI6ImVtcHJlc2FfYWNtZSIsImlhdCI6MTcxNjIzNTQyMiwiZXhwIjoxNzE2MjM2MzIyLCJpc3MiOiJodHRwczovL2F1dGguZW1wcmVzYS5jb20iLCJhdWQiOiJodHRwczovL2FwaS5lbXByZXNhLmNvbSIsImp0aSI6Imp3dF91dWlkXzEyMzQ1NiJ9.firma_base64url_aqui
```

### Tareas

1. Separa el token en sus tres partes usando el punto (`.`) como delimitador.
2. Decodifica el **header** de Base64URL a JSON.
3. Decodifica el **payload** de Base64URL a JSON.
4. Crea una tabla con todos los claims encontrados, su nombre completo y su valor.
5. Responde: ¿En qué algoritmo está firmado? ¿Qué indicación da el campo `kid`?

### Código de Inicio

```javascript
// Completa esta función
function decodeJWTPart(base64Url) {
  // Tu código aquí
}

const token = 'eyJhbGci...'; // Pega el token completo
const parts = token.split('.');

console.log('Header:', decodeJWTPart(parts[0]));
console.log('Payload:', decodeJWTPart(parts[1]));
```

### Resultado Esperado

```json
// Header decodificado:
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "prod_2024"
}

// Payload decodificado:
{
  "sub": "usr_x99z123",
  "email": "maria@empresa.com",
  "roles": ["manager", "editor"],
  "tenant": "empresa_acme",
  "iat": 1716235422,
  "exp": 1716236322,
  "iss": "https://auth.empresa.com",
  "aud": "https://api.empresa.com",
  "jti": "jwt_uuid_123456"
}
```

### 💡 Pistas

- Usa `atob()` en el navegador o `Buffer.from(str, 'base64')` en Node.js.
- Recuerda reemplazar `-` con `+` y `_` con `/` antes de decodificar.
- El padding Base64 (`=`) puede ser omitido en Base64URL.

---

## 🟢 Ejercicio 2: Identificar Claims Estándar vs. Personalizados

**Nivel:** Básico | **Tiempo:** 20 minutos

### Descripción

Analiza el siguiente payload JWT y clasifica cada claim en: **Registered** (RFC 7519), **Public** (IANA) o **Private** (personalizados de la empresa).

### Payload a Analizar

```json
{
  "sub": "usr_emp_456",
  "iat": 1716235422,
  "exp": 1716239022,
  "nbf": 1716235422,
  "iss": "https://sso.empresa.com",
  "aud": ["https://api.empresa.com", "https://app.empresa.com"],
  "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "pedro@empresa.com",
  "email_verified": true,
  "name": "Pedro Ramírez",
  "given_name": "Pedro",
  "family_name": "Ramírez",
  "locale": "es-MX",
  "roles": ["supervisor", "analyst"],
  "department_id": "dept_engineering_01",
  "cost_center": "CC-2024-ENG",
  "clearance_level": 3,
  "allowed_ips": ["192.168.1.0/24", "10.0.0.0/8"]
}
```

### Tareas

1. Clasifica cada claim en una tabla de tres columnas.
2. Identifica qué claims son **sensibles** y no deberían estar en un JWT no encriptado.
3. Propón una versión reducida del payload con solo los claims estrictamente necesarios.

### Tabla a Completar

| Claim | Tipo | ¿Es sensible? | ¿Necesario? |
|-------|------|---------------|-------------|
| `sub` | Registered | No | Sí |
| `iat` | ? | ? | ? |
| `roles` | ? | ? | ? |
| ... | ... | ... | ... |

### Resultado Esperado

El payload mínimo necesario debería contener:
```json
{
  "sub": "usr_emp_456",
  "iat": 1716235422,
  "exp": 1716239022,
  "iss": "https://sso.empresa.com",
  "aud": "https://api.empresa.com",
  "roles": ["supervisor", "analyst"],
  "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

---

## 🟢 Ejercicio 3: Verificar Expiración de Token

**Nivel:** Básico | **Tiempo:** 20 minutos

### Descripción

Implementa una función TypeScript que verifique el estado de expiración de un token y retorne información detallada sobre su validez temporal.

### Código de Inicio

```typescript
interface TokenStatus {
  isExpired: boolean;
  isValid: boolean;
  expiresAt: Date | null;
  issuedAt: Date | null;
  remainingSeconds: number;
  remainingFormatted: string;  // "5m 30s" o "Expirado"
  shouldRefresh: boolean;       // true si quedan menos de 5 minutos
}

function checkTokenExpiry(token: string): TokenStatus {
  // Tu código aquí
}
```

### Casos de Prueba

```typescript
// Caso 1: Token válido con 10 minutos de vida
const validToken = '...'; // Genera uno con exp = now + 10 minutos

// Caso 2: Token expirado hace 5 minutos
const expiredToken = '...'; // Genera uno con exp = now - 5 minutos

// Caso 3: Token que expira en 2 minutos (debe mostrar shouldRefresh: true)
const almostExpiredToken = '...';

// Verificar todos los casos
console.log('Token válido:', checkTokenExpiry(validToken));
console.log('Token expirado:', checkTokenExpiry(expiredToken));
console.log('Casi expirado:', checkTokenExpiry(almostExpiredToken));
```

### Resultado Esperado

```typescript
// Token válido (10 minutos restantes):
{
  isExpired: false,
  isValid: true,
  expiresAt: Date('2024-05-20T15:30:00'),
  issuedAt: Date('2024-05-20T15:15:00'),
  remainingSeconds: 600,
  remainingFormatted: "10m 0s",
  shouldRefresh: false
}

// Token expirado:
{
  isExpired: true,
  isValid: false,
  expiresAt: Date('2024-05-20T15:05:00'),
  remainingSeconds: 0,
  remainingFormatted: "Expirado hace 5m",
  shouldRefresh: true
}
```

---

## 🟡 Ejercicio 4: Función de Validación de Roles

**Nivel:** Intermedio | **Tiempo:** 30 minutos

### Descripción

Crea un sistema completo de verificación de roles y permisos para React que incluya: un hook personalizado, un componente `<ProtectedContent>` y un HOC (Higher-Order Component) para proteger rutas.

### Requerimientos

```typescript
// 1. Hook useAuthorization
const { hasRole, hasPermission, hasAnyRole, hasAllRoles } = useAuthorization();

// 2. Componente declarativo
<ProtectedContent roles={['admin', 'manager']} fallback={<p>No autorizado</p>}>
  <AdminPanel />
</ProtectedContent>

// 3. HOC para rutas
const ProtectedAdminPage = withRole('admin')(AdminPage);
```

### Código de Inicio

```typescript
// Implementa estas funciones usando el AuthContext del ejemplo avanzado
export function useAuthorization() {
  // Tu implementación
}

export function ProtectedContent({ roles, permissions, children, fallback }) {
  // Tu implementación
}

export function withRole(role: string) {
  return function<T>(Component: React.ComponentType<T>) {
    // Tu implementación
  };
}
```

### Casos de Prueba

```tsx
// Prueba 1: Usuario con rol 'admin' debería ver el contenido
// Prueba 2: Usuario con rol 'user' debería ver el fallback
// Prueba 3: Usuario con permiso 'reports:read' debería acceder
// Prueba 4: HOC debería redirigir si el usuario no tiene el rol requerido
```

---

## 🟡 Ejercicio 5: Implementar Generador de Tokens

**Nivel:** Intermedio | **Tiempo:** 45 minutos

### Descripción

Implementa un servicio de generación de tokens JWT que soporte múltiples algoritmos y configuraciones para diferentes entornos (desarrollo/producción).

### Requerimientos Funcionales

1. Soporte para `HS256` y `RS256`.
2. Configuración de claims estándar automática (`iat`, `exp`, `jti`).
3. Validación de claims requeridos antes de firmar.
4. Función de generación de par de claves RSA para RS256.
5. Soporte para tokens de corta y larga duración.

### Código de Inicio

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface TokenGeneratorConfig {
  algorithm: 'HS256' | 'RS256';
  secret?: string;        // Para HS256
  privateKey?: string;    // Para RS256
  publicKey?: string;     // Para RS256
  defaultExpiry: string;
  issuer: string;
}

class TokenGenerator {
  constructor(private config: TokenGeneratorConfig) {}
  
  generateAccessToken(payload: object): string {
    // Tu implementación
  }
  
  generateRefreshToken(userId: string): string {
    // Tu implementación
  }
  
  verify(token: string): object {
    // Tu implementación
  }
  
  static generateRSAKeyPair(): { privateKey: string; publicKey: string } {
    // Tu implementación usando crypto.generateKeyPairSync
  }
}
```

---

## 🟡 Ejercicio 6: Comparar HS256 vs RS256

**Nivel:** Intermedio | **Tiempo:** 30 minutos

### Descripción

Crea un benchmark que compare el rendimiento y las características de seguridad de los algoritmos `HS256` y `RS256` para firmar JWT.

### Tareas

1. Implementa la generación y verificación de tokens con ambos algoritmos.
2. Mide el tiempo de generación de 1000 tokens con cada algoritmo.
3. Mide el tiempo de verificación de 1000 tokens con cada algoritmo.
4. Documenta las diferencias de seguridad en un comentario.
5. Determina cuándo usar cada uno según el escenario.

### Escenarios de Análisis

```typescript
// Escenario A: Aplicación monolítica (un solo servidor)
// ¿Cuál algoritmo es mejor? ¿Por qué?

// Escenario B: Arquitectura de microservicios con 10 servicios
// ¿Cuál algoritmo es mejor? ¿Por qué?

// Escenario C: Auth server centralizado con múltiples equipos
// ¿Cuál algoritmo es mejor? ¿Por qué?
```

### Resultado Esperado (Tabla de Benchmark)

```
Algoritmo | Generación/op | Verificación/op | Tamaño token
HS256     | ~0.1ms       | ~0.08ms         | ~180 bytes
RS256     | ~2ms         | ~0.3ms          | ~350 bytes
```

---

## 🔴 Ejercicio 7: Implementar Rotación de Refresh Tokens

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Implementa un sistema de **rotación de refresh tokens** (Refresh Token Rotation) donde cada vez que se usa un refresh token para obtener un nuevo access token, el refresh token también se reemplaza por uno nuevo. Esto permite detectar robo de tokens.

### Concepto

```
Primera renovación:
  RT_1 → (usado) → AT_2 + RT_2

Segunda renovación (legítima):
  RT_2 → (usado) → AT_3 + RT_3

Intento de reutilizar RT_1 (señal de robo):
  RT_1 → ⚠️ DETECTADO: RT reutilizado → Invalidar TODA la familia de tokens
```

### Requerimientos

1. Cada refresh token tiene un `familyId` que agrupa tokens relacionados.
2. Al usar un RT, se invalida y se emite uno nuevo con el mismo `familyId`.
3. Si se intenta usar un RT ya invalidado, se invalidan TODOS los RT de esa familia.
4. Implementar con un mapa en memoria (simular Redis/DB).

### Código de Inicio

```typescript
interface RefreshTokenRecord {
  token: string;
  familyId: string;
  userId: string;
  isUsed: boolean;
  createdAt: Date;
  expiresAt: Date;
}

class RefreshTokenRotationService {
  private tokenStore = new Map<string, RefreshTokenRecord>();
  
  async createRefreshToken(userId: string, familyId?: string): Promise<string> {
    // Crear nuevo RT con familia
  }
  
  async rotateRefreshToken(oldToken: string): Promise<{
    newRefreshToken: string;
    wasStolen: boolean;
  }> {
    // Implementar rotación con detección de reutilización
  }
  
  async invalidateFamily(familyId: string): Promise<void> {
    // Invalidar todos los tokens de una familia
  }
}
```

---

## 🔴 Ejercicio 8: Detectar Tokens Manipulados

**Nivel:** Avanzado | **Tiempo:** 45 minutos

### Descripción

Crea una función que detecte intentos comunes de manipulación de JWT, incluyendo: cambio del algoritmo a `none`, modificación del payload sin actualizar la firma, y uso del algoritmo incorrecto.

### Vectores de Ataque a Detectar

```typescript
// Ataque 1: Algorithm confusion (cambiar a "none")
const manipulatedToken1 = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGVzIjpbImFkbWluIl19.';

// Ataque 2: RS256 a HS256 con clave pública como secreto
// (El servidor espera RS256, el atacante firma con HS256 usando la clave pública)

// Ataque 3: Payload modificado manualmente
const originalToken = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoidXNlciJ9.firma';
const manipulatedToken3 = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.firma_incorrecta';
```

### Requerimientos

```typescript
interface TokenValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedAttacks: string[];
}

function validateJWTSecurity(token: string, options: {
  allowedAlgorithms: string[];
  secret: string;
  verifySignature: boolean;
}): TokenValidationResult {
  // Detectar:
  // 1. Algoritmo "none"
  // 2. Algoritmo no permitido
  // 3. Firma inválida
  // 4. Claims requeridos ausentes
  // 5. Token expirado
}
```

---

## 🔴 Ejercicio 9: Sistema de Revocación de Tokens

**Nivel:** Avanzado | **Tiempo:** 60 minutos

### Descripción

Implementa un sistema de **revocación de tokens** (JWT Blacklist) que permita invalidar tokens específicos antes de su expiración natural. Esto es necesario para logout inmediato, cambio de contraseña, y respuesta a incidentes de seguridad.

### Estrategias a Implementar

1. **Blacklist en memoria** (para desarrollo).
2. **Basado en `jti`**: Almacenar solo los IDs de tokens revocados.
3. **Basado en versión de usuario**: Agregar un contador al JWT; si el usuario cambia contraseña, incrementar el contador e invalidar todos los tokens anteriores.

### Código de Inicio

```typescript
// Estrategia 1: Blacklist por JTI
class JWTBlacklist {
  private blacklist = new Set<string>();
  
  revoke(jti: string, expiresAt: Date): void {
    // Agregar a blacklist con TTL automático
  }
  
  isRevoked(jti: string): boolean {
    // Verificar si el token está revocado
  }
  
  cleanup(): void {
    // Limpiar tokens expirados del blacklist
  }
}

// Estrategia 2: Versión de usuario
interface UserWithTokenVersion {
  id: string;
  tokenVersion: number; // Incrementar al hacer logout o cambiar contraseña
}

// El JWT debe incluir: { sub: userId, version: tokenVersion }
function validateTokenVersion(decoded: any, currentVersion: number): boolean {
  // Tu implementación
}
```

---

## 🔴 Ejercicio 10: Auditoría de Claims en JWT

**Nivel:** Avanzado | **Tiempo:** 45 minutos

### Descripción

Crea un middleware de Express que audite todos los tokens JWT que pasan por la aplicación, generando un log estructurado con información de seguridad relevante.

### Requerimientos del Log

```typescript
interface AuditLog {
  timestamp: string;
  requestId: string;
  userId: string;
  userEmail: string;
  roles: string[];
  action: string;          // Método HTTP + ruta
  resource: string;        // Recurso accedido
  ipAddress: string;
  userAgent: string;
  tokenAge: number;        // Segundos desde que se emitió
  tokenExpiresIn: number;  // Segundos hasta que expira
  suspicious: boolean;     // true si hay patrones sospechosos
  suspiciousReasons: string[];
}
```

### Patrones Sospechosos a Detectar

1. Token emitido con IP diferente a la actual (si la IP está en el token).
2. Token con más de 24 horas de antigüedad (aunque no haya expirado).
3. Más de 100 requests con el mismo `jti` en una hora.
4. Token usado desde múltiples User-Agents diferentes en menos de 5 minutos.
5. Claims de roles que no coinciden con los roles actuales del usuario en DB.

### Código de Inicio

```typescript
function createAuditMiddleware(options: {
  jwtService: JWTService;
  logger: (log: AuditLog) => void;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Tu implementación
    // Pista: usa res.on('finish', ...) para loguear después de la respuesta
  };
}
```

### Resultado Esperado

```json
{
  "timestamp": "2024-05-20T15:30:00.000Z",
  "requestId": "req_abc123",
  "userId": "usr_xyz456",
  "userEmail": "juan@empresa.com",
  "roles": ["editor"],
  "action": "DELETE /api/articles/123",
  "resource": "articles",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "tokenAge": 450,
  "tokenExpiresIn": 450,
  "suspicious": true,
  "suspiciousReasons": ["Token con más de 5 minutos de antigüedad para operación DELETE"]
}
```

---

## 📊 Rúbrica de Evaluación

| Criterio | Puntos |
|----------|--------|
| Código funciona correctamente | 40% |
| Manejo de errores completo | 20% |
| Código limpio y bien tipado | 20% |
| Casos borde considerados | 10% |
| Documentación / comentarios | 10% |

---

*← [Volver a la Sección 1.1](../README.md) | [→ Sección 1.2: Almacenamiento Seguro](../../1.2-almacenamiento-seguro/README.md)*
