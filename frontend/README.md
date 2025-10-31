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
- `src/pages` — páginas principales (Dashboard, AdminPanel, Login, Selector)
- `src/estilos.css` — estilos globales

Buenas prácticas rápidas
- No inyectar API keys en el cliente; centraliza llamadas HTTP en `src/api`.
- Mantén componentes pequeños y testables; añade tests para formularios y tablas críticas.
- Muestra estados de carga y errores claros para el usuario técnico.

Si quieres que añada lint, formateo o un pipeline de tests en CI, lo preparo y lo committeo.