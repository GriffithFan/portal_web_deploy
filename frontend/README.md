# Frontend — Portal Meraki

Este directorio contiene la aplicación cliente, implementada en React (Vite). Está diseñada para técnicos que necesitan diagnóstico rápido: topología, estado de APs, switches y appliances.

Requisitos
- Node.js 18+ y npm (o yarn/pnpm).

Arranque local

```bash
cd frontend
npm ci
npm run dev
# Abre http://localhost:5173
```

Construir para producción

```bash
cd frontend
npm run build
# Salida en dist/
```

Estructura útil
- `src/` — código fuente
- `src/components` — componentes reutilizables
  - `src/components/ui` — componentes UI reutilizables (Skeleton, Loading, Theme)
- `src/pages` — páginas principales (Dashboard, AdminPanel, Login, Selector)
- `src/context` — Context API (ThemeContext para dark mode)
- `src/styles` — estilos globales y sistema de diseño
  - `animations.css` — animaciones y transiciones
  - `theme.css` — variables CSS y temas
- `src/estilos.css` — estilos globales

## 🎨 Sistema UX/UI

El frontend incluye un sistema completo de componentes UX/UI para mejorar la experiencia:

### Componentes Disponibles:
- **Skeleton Loaders**: Estados de carga visuales (`SkeletonTable`, `SkeletonTopology`, etc.)
- **Loading Components**: Overlays, spinners, barras de progreso
- **Dark Mode**: Infraestructura completa con Context API (preparado para activación)
- **Animaciones**: Sistema de animaciones suaves y profesionales
- **Variables CSS**: Sistema centralizado de diseño con temas

Ver documentación completa en [`UX_UI.md`](./UX_UI.md)

### Uso Rápido:

```jsx
// Skeleton para estados de carga
import { SkeletonTable } from './components/ui/SkeletonLoaders';
{loading && <SkeletonTable rows={5} columns={4} />}

// Loading overlay
import { LoadingOverlay } from './components/ui/LoadingOverlay';
<LoadingOverlay isLoading={true} message="Cargando..." variant="blur" />

// Animaciones
<div className="animate-fadeIn hover-lift">Contenido</div>
```

Buenas prácticas rápidas
- No inyectar API keys en el cliente; centraliza llamadas HTTP en `src/api`.
- Mantén componentes pequeños y testables; añade tests para formularios y tablas críticas.
- Muestra estados de carga y errores claros para el usuario técnico.

Si quieres que añada lint, formateo o un pipeline de tests en CI, lo preparo y lo committeo.