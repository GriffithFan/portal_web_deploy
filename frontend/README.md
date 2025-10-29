# Portal Meraki - Frontend

Este directorio contiene el código fuente del frontend de la aplicación, desarrollado en React con Vite. Aquí se implementa la interfaz de usuario que simula el dashboard de Meraki, completamente responsiva y en español.

## Estructura sugerida
- `src/` - Código fuente principal
- `public/` - Archivos estáticos

## Requisitos para desarrollo
- Node.js (versión recomendada: 18.x o superior)
- npm (incluido con Node.js)

## Instalación y uso
1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   ```md
   # Frontend — Aplicación React (Vite)

   Descripción breve
   - Interfaz enfocada a tareas de diagnóstico y visualización (topología, estado de APs, switches y appliances). Implementada con React y Vite para ciclos de desarrollo rápidos.

   Requisitos
   - Node 18+ y npm (o yarn/pnpm si lo prefieres).

   Arranque local (rápido)

   ```bash
   cd frontend
   npm ci
   npm run dev

   # Abre http://localhost:5173
   ```

   Cómo trabajar como desarrollador
   - Componentes en `src/components`
   - Páginas en `src/pages` (Dashboard, AdminPanel, Login, Selector)
   - Estilos en `src/estilos.css` y archivos CSS de componentes

   Construir para producción

   ```bash
   cd frontend
   npm run build

   # El resultado queda en dist/ (según configuración de Vite)
   ```

   Buenas prácticas

   - No hardcodear API keys en el frontend. Usar variables de entorno en el servidor.
   - Mantener componentes pequeños y con responsabilidad única para facilitar testing.
   - Añadir tests (Jest/React Testing Library) para los componentes críticos (formulario de login, tablas y visualizadores de topología).

   Acciones recomendadas al integrar con backend
   - Usar tiempos de espera razonables para llamadas a la API y mostrar estados de carga/errores legibles para el técnico.
   - Centralizar llamadas HTTP en un módulo (p. ej. `src/api`) para poder interceptar y mockear en tests.

   Si necesitas que añada un script de lint/prettier o un pipeline de tests en CI, lo preparo y lo committeo.
   ``` 