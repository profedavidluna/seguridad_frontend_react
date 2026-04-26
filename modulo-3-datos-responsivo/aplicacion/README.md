# Aplicación Práctica – Módulo 3

## Descripción

Aplicación Next.js 14 que demuestra los conceptos del Módulo 3:

- **Manejo de datos sensibles** con enmascaramiento por rol
- **Arquitectura feature-based** con separación cliente/servidor
- **Diseño responsivo** mobile-first con Tailwind CSS
- **UX en apps autenticadas**: toasts, estados de carga, páginas 401/403

## Tecnologías

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Context API (Auth + Toast)

## Instalación y Ejecución

```bash
cd modulo-3-datos-responsivo/aplicacion
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Usuarios de Prueba

| Email | Contraseña | Rol | Acceso |
|-------|-----------|-----|--------|
| ana.garcia@empresa.com | Admin123! | admin | Todo |
| carlos.lopez@empresa.com | Manager123! | manager | Dashboard + Perfil |
| maria.torres@empresa.com | Employee123! | employee | Dashboard + Perfil propio |

## Estructura de la App

```
src/
├── app/
│   ├── layout.tsx           # Layout raíz con providers
│   ├── page.tsx             # Home / Landing
│   ├── login/page.tsx       # Formulario de login seguro
│   ├── dashboard/page.tsx   # Dashboard responsivo
│   ├── perfil/page.tsx      # Perfil con datos enmascarados
│   ├── admin/page.tsx       # Área restringida (solo admin)
│   ├── acceso-denegado/     # Página 403
│   └── no-autorizado/       # Página 401
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    # Layout con sidebar responsivo
│   │   └── Sidebar.tsx      # Menú lateral
│   └── UserProfileCard.tsx  # Card con datos enmascarados por rol
├── lib/
│   ├── AuthContext.tsx       # Context de autenticación
│   ├── ToastContext.tsx      # Sistema de notificaciones
│   └── masks.ts             # Utilidades de enmascaramiento
├── data/
│   └── mockData.ts          # Datos mock con usuarios
└── types/
    └── index.ts             # Tipos TypeScript
```

## Conceptos Demostrados

### Manejo de Datos Sensibles
- Email enmascarado: `ma**@empresa.com`
- Teléfono enmascarado: `300***4567`
- Salario: solo visible para admin/propio
- SSN: solo visible para admin

### Control de Acceso por Rol
- La página `/admin` solo es accesible para `admin`
- Los managers y employees reciben un 403
- Los no autenticados reciben un 401

### Diseño Responsivo
- Sidebar que colapsa en móvil con overlay
- Tabla que se convierte en tarjetas en móvil
- Grid de estadísticas adaptativo (1→2→4 columnas)

### UX Segura
- Mensajes de error genéricos (no revelan información del sistema)
- Botón de submit deshabilitado durante carga
- Toast system con auto-dismiss (excepto errores)
