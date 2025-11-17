# Sistema de UX/UI - Portal Meraki

Sistema completo de componentes de interfaz para mejorar la experiencia de usuario con skeleton loaders, animaciones y preparación para dark mode.

## Componentes Creados

### 1. **SkeletonLoaders** (`frontend/src/components/ui/SkeletonLoaders.jsx`)

Componentes reutilizables para mostrar estados de carga elegantes.

#### Componentes Disponibles:

- **`<Skeleton />`**: Bloque básico animado
  ```jsx
  <Skeleton width="200px" height="40px" borderRadius="8px" />
  ```

- **`<SkeletonText />`**: Líneas de texto múltiples
  ```jsx
  <SkeletonText lines={3} width="100%" />
  ```

- **`<SkeletonCard />`**: Skeleton para tarjetas
  ```jsx
  <SkeletonCard height="200px" />
  ```

- **`<SkeletonTable />`**: Skeleton para tablas
  ```jsx
  <SkeletonTable rows={5} columns={4} />
  ```

- **`<SkeletonDevice />`**: Skeleton para dispositivos individuales
  ```jsx
  <SkeletonDevice />
  ```

- **`<SkeletonDeviceList />`**: Lista de dispositivos
  ```jsx
  <SkeletonDeviceList count={3} />
  ```

- **`<SkeletonChart />`**: Skeleton para gráficos
  ```jsx
  <SkeletonChart height="300px" />
  ```

- **`<SkeletonTopology />`**: Skeleton para vista de topología
  ```jsx
  <SkeletonTopology />
  ```

- **`<SkeletonDashboard />`**: Dashboard completo
  ```jsx
  <SkeletonDashboard />
  ```

- **`<SkeletonBadge />`**: Badges pequeños
  ```jsx
  <SkeletonBadge width="60px" />
  ```

- **`<SkeletonMetric />`**: Métricas numéricas
  ```jsx
  <SkeletonMetric />
  ```

- **`<SkeletonMetricsGrid />`**: Grid de métricas
  ```jsx
  <SkeletonMetricsGrid columns={4} />
  ```

### 2. **LoadingOverlay** (`frontend/src/components/ui/LoadingOverlay.jsx`)

Componentes para overlays de carga y spinners.

#### Componentes:

- **`<LoadingOverlay />`**: Overlay de pantalla completa
  ```jsx
  <LoadingOverlay 
    isLoading={isLoading} 
    message="Cargando datos..." 
    variant="blur" // 'light' | 'dark' | 'blur'
  />
  ```

- **`<LoadingSpinner />`**: Spinner independiente
  ```jsx
  <LoadingSpinner size="md" color="#3b82f6" />
  ```

- **`<InlineLoader />`**: Loader para botones o texto
  ```jsx
  <InlineLoader text="Guardando..." />
  ```

- **`<ProgressBar />`**: Barra de progreso
  ```jsx
  <ProgressBar 
    progress={75} 
    color="#3b82f6" 
    showPercentage={true}
  />
  
  {/* Modo indeterminado */}
  <ProgressBar indeterminate={true} />
  ```

- **`<PulsingDot />`**: Punto pulsante
  ```jsx
  <PulsingDot color="#10b981" size="md" />
  ```

### 3. **Animaciones** (`frontend/src/styles/animations.css`)

Sistema completo de animaciones CSS.

#### Animaciones Disponibles:

**Fade:**
- `animate-fadeIn`
- `animate-fadeOut`
- `animate-fadeInUp`
- `animate-fadeInDown`

**Slide:**
- `animate-slideInLeft`
- `animate-slideInRight`

**Scale:**
- `animate-scaleIn`
- `animate-scaleOut`

**Spin:**
- `animate-spin` (1s)
- `animate-spinSlow` (3s)

**Pulse:**
- `animate-pulse`
- `animate-pulseGlow`

**Otros:**
- `animate-shake`
- `animate-bounce`
- `animate-shimmer`

#### Modificadores:

**Delays:**
```jsx
<div className="animate-fadeIn delay-100">...</div>
<div className="animate-fadeIn delay-200">...</div>
<div className="animate-fadeIn delay-500">...</div>
```

**Duración:**
```jsx
<div className="animate-fadeIn duration-fast">...</div>
<div className="animate-fadeIn duration-normal">...</div>
<div className="animate-fadeIn duration-slow">...</div>
```

**Transiciones:**
```jsx
<div className="transition-smooth">...</div>
<div className="transition-fast">...</div>
<div className="transition-slow">...</div>
```

#### Efectos Hover:

```jsx
<div className="hover-lift">Hover para levantar</div>
<div className="hover-scale">Hover para escalar</div>
<div className="hover-glow">Hover para brillar</div>
```

#### Animación de Listas (Stagger):

```jsx
<div className="stagger-children">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### 4. **Dark Mode** (`frontend/src/context/ThemeContext.jsx`)

Context API para gestionar temas.

#### Uso:

**1. Wrappear la app con ThemeProvider** (ya configurado en `main.jsx`):
```jsx
import { ThemeProvider } from './context/ThemeContext';

<ThemeProvider>
  <App />
</ThemeProvider>
```

**2. Usar el hook useTheme en componentes:**
```jsx
import { useTheme } from '../context/ThemeContext';

function MyComponent() {
  const { theme, isDark, isLight, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Tema actual: {theme}</p>
      <button onClick={toggleTheme}>
        Cambiar a {isDark ? 'claro' : 'oscuro'}
      </button>
    </div>
  );
}
```

**3. Usar el componente ThemeToggle:**
```jsx
import ThemeToggle from '../components/ui/ThemeToggle';

// Variante icono (circular)
<ThemeToggle variant="icon" />

// Variante botón (con texto)
<ThemeToggle variant="button" />
```

### 5. **Variables CSS de Tema** (`frontend/src/styles/theme.css`)

Variables CSS para consistencia visual y dark mode.

#### Variables Principales:

**Colores:**
```css
var(--color-primary)      /* Azul primario */
var(--color-success)      /* Verde éxito */
var(--color-warning)      /* Amarillo advertencia */
var(--color-error)        /* Rojo error */
```

**Backgrounds:**
```css
var(--bg-primary)         /* Fondo principal */
var(--bg-secondary)       /* Fondo secundario */
var(--bg-tertiary)        /* Fondo terciario */
```

**Texto:**
```css
var(--text-primary)       /* Texto principal */
var(--text-secondary)     /* Texto secundario */
var(--text-tertiary)      /* Texto terciario */
```

**Borders:**
```css
var(--border-primary)     /* Borde principal */
var(--border-secondary)   /* Borde secundario */
```

**Shadows:**
```css
var(--shadow-sm)          /* Sombra pequeña */
var(--shadow-md)          /* Sombra media */
var(--shadow-lg)          /* Sombra grande */
var(--shadow-xl)          /* Sombra extra grande */
```

**Spacing:**
```css
var(--spacing-xs)         /* 4px */
var(--spacing-sm)         /* 8px */
var(--spacing-md)         /* 16px */
var(--spacing-lg)         /* 24px */
var(--spacing-xl)         /* 32px */
```

**Border Radius:**
```css
var(--radius-sm)          /* 4px */
var(--radius-md)          /* 8px */
var(--radius-lg)          /* 12px */
var(--radius-xl)          /* 16px */
var(--radius-full)        /* 9999px (círculo) */
```

#### Uso en Componentes:

```css
.mi-componente {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.mi-componente:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}
```

## 🎯 Integración en Dashboard

Los componentes ya están integrados en `Dashboard.jsx`:

### Estados de Carga por Sección:

- **Topología**: `<SkeletonTopology />`
- **Switches**: `<SkeletonDeviceList count={5} />`
- **Access Points**: `<SkeletonDeviceList count={5} />`
- **Appliances**: `<SkeletonTable rows={4} columns={5} />`
- **Carga General**: `<LoadingOverlay variant="blur" />`

### Ejemplo de Uso en Otros Componentes:

```jsx
import { SkeletonTable } from '../components/ui/SkeletonLoaders';

function MiComponente() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  if (loading) {
    return <SkeletonTable rows={5} columns={4} />;
  }
  
  return <table>...</table>;
}
```

## 🎨 Buenas Prácticas

### 1. **Usar Skeleton en lugar de Spinners**
❌ Evitar:
```jsx
{loading && <div>Cargando...</div>}
```

✅ Preferir:
```jsx
{loading && <SkeletonTable rows={5} columns={4} />}
```

### 2. **Animar Entrada de Elementos**
```jsx
<div className="animate-fadeInUp">
  {/* Contenido */}
</div>
```

### 3. **Usar Variables CSS**
❌ Evitar valores hardcoded:
```css
.card {
  background: #ffffff;
  padding: 16px;
  border-radius: 8px;
}
```

✅ Usar variables:
```css
.card {
  background: var(--bg-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

### 4. **Transiciones Suaves**
```jsx
<div className="transition-smooth hover-lift">
  {/* Contenido interactivo */}
</div>
```

### 5. **Accesibilidad (Reduce Motion)**
Las animaciones respetan automáticamente `prefers-reduced-motion` para usuarios con sensibilidad a movimiento.

## 🚀 Próximos Pasos

### Implementación Completa de Dark Mode:

1. **Agregar ThemeToggle al TopBar:**
   ```jsx
   import ThemeToggle from '../components/ui/ThemeToggle';
   
   // En TopBar.jsx
   <ThemeToggle variant="icon" />
   ```

2. **Convertir componentes existentes a usar variables CSS:**
   - Reemplazar colores hardcoded por variables
   - Usar `var(--bg-primary)` en lugar de `#ffffff`
   - Usar `var(--text-primary)` en lugar de `#1e293b`

3. **Probar dark mode:**
   ```jsx
   // En navegador DevTools
   localStorage.setItem('theme', 'dark');
   window.location.reload();
   ```

## 📊 Estructura de Archivos

```
frontend/src/
├── components/
│   └── ui/
│       ├── SkeletonLoaders.jsx      # Componentes skeleton
│       ├── SkeletonLoaders.css      # Estilos skeleton
│       ├── LoadingOverlay.jsx       # Overlays y spinners
│       ├── LoadingOverlay.css       # Estilos loading
│       ├── ThemeToggle.jsx          # Botón de tema
│       └── ThemeToggle.css          # Estilos theme toggle
├── context/
│   └── ThemeContext.jsx             # Context API para tema
├── styles/
│   ├── animations.css               # Animaciones globales
│   └── theme.css                    # Variables CSS y temas
└── pages/
    └── Dashboard.jsx                # Dashboard actualizado
```

## 🎉 Beneficios

✅ **Mejor UX**: Estados de carga visuales y profesionales  
✅ **Animaciones suaves**: Transiciones elegantes  
✅ **Dark mode preparado**: Infraestructura completa  
✅ **Reutilizable**: Componentes modulares  
✅ **Accesible**: Respeta preferencias de usuario  
✅ **Mantenible**: Variables CSS centralizadas  
✅ **Performante**: Animaciones GPU-accelerated

---

**Autor**: Sistema UX/UI Portal Meraki  
**Fecha**: 2025  
**Versión**: 1.0
