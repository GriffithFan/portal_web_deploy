# Portal Meraki

Portal web empresarial de monitoreo Cisco Meraki para técnicos de redes.

## Despliegue en Producción (Hostinger + EasyPanel)

**Guía completa**: [HOSTINGER_EASYPANEL_SETUP.md](./HOSTINGER_EASYPANEL_SETUP.md)

### Setup Rápido
```bash
# 1. Instalar EasyPanel en VPS Hostinger
curl -sSL https://get.easypanel.io | sh

# 2. Configurar .env con tu Meraki API Key
MERAKI_API_KEY=tu_api_key_aqui

# 3. Deploy desde EasyPanel UI o Docker Compose
docker-compose up -d
```

```markdown
# Portal Meraki — Panel técnico para técnicos de redes

Aplicación para diagnóstico y monitoreo de infraestructuras gestionadas con Cisco Meraki. Está pensada para equipos técnicos (NOC/soporte) que necesitan un resumen operativo claro de redes, topología y estado de appliances.

Guía rápida — despliegue

1) Preparar variables de entorno en `backend/.env.production` o `.env`.
2) Construir y levantar con Docker Compose:

```bash
docker-compose up -d --build
```

3) (Opcional) Cargar catálogo de predios:

```bash
docker-compose exec portal-meraki node backend/scripts/loadAllPredios.js
```

Desarrollo local

- Backend (API):

```bash
cd backend
npm ci
npm run dev
```

- Frontend (cliente):

```bash
cd frontend
npm ci
npm run dev
# Abre http://localhost:5173
```

Arquitectura

- Backend: Node.js (Express)
- Frontend: React (Vite)
- Orquestación local: Docker Compose

Variables críticas

- `MERAKI_API_KEY` — clave de Meraki Dashboard (no subir al repo).
- `ADMIN_KEY` — clave para endpoints administrativos.
- `MERAKI_ORG_ID` — ID de organización (opcional para limitar búsquedas).

Endpoints principales

- `POST /api/login` — autenticación técnicos.
- `GET /api/resolve-network?q={codigo}` — resuelve código de predio.
- `GET /api/networks/{networkId}/summary` — resumen operativo.

Estructura del repo

- `/backend` — API, scripts y datos maestros (predios.csv)
- `/frontend` — cliente React
- `docker-compose.yml` — orquestación local

Notas prácticas

- No incluir instaladores o binarios grandes en el repositorio; usar Git LFS si son necesarios.
- Mantén la API key fuera del control de versiones (`.env` no versionado).

Si quieres, preparo un workflow CI/CD que construya el frontend y publique imágenes (Docker Hub, GitHub Packages o ACR). Dime el destino.

```
Variables de entorno clave
