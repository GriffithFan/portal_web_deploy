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

---

## Arquitectura

**Backend**: Node.js 18 + Express (Puerto 3000)  
**Frontend**: React 18 + Vite 5 (Puerto 5173)  
**API**: Meraki Dashboard API v1  
**Datos**: CSV (~20k predios)

## Instalación Rápida

### Docker

```bash
cp backend/.env.production .env
docker-compose up -d
docker-compose exec portal-meraki node backend/scripts/loadAllPredios.js
```

### Desarrollo Local

```bash
cd backend && npm install && npm run load-predios && npm run dev
cd frontend && npm install && npm run dev
```

```md
# Portal Meraki — Panel técnico de operación

Este repositorio contiene una aplicación web para monitorizar y diagnosticar infraestructuras gestionadas con Cisco Meraki. Está pensada para equipos técnicos (NOC/soporte) que necesitan obtener un resumen operativo rápido de redes, topología de dispositivos y estado de appliances.

Este README ofrece una guía práctica de arranque, despliegue y enlaces a la documentación técnica del backend y frontend.

Resumen rápido
- Backend: Node.js (Express). API REST que orquesta llamadas al Meraki Dashboard.
- Frontend: React + Vite. Interfaz para técnicos, en español.
- Despliegue recomendado: Docker Compose / runner CI que construya imágenes.

Requisitos mínimos
- Docker y Docker Compose (para despliegue)
- Node 18+ y npm (para desarrollo local)

Inicio rápido (Docker)

```powershell
# Copia el fichero de ejemplo de variables y ajústalo
cp backend/.env.production .env

# Levanta los servicios
docker-compose up -d --build

# (Opcional) Cargar catálogo de predios si procede
docker-compose exec portal-meraki node backend/scripts/loadAllPredios.js
```

Desarrollo local (modo iterativo)

```powershell
# Backend
cd backend
npm ci
npm run dev

# Frontend (en otra terminal)
cd frontend
npm ci
npm run dev

# Accede a http://localhost:5173 para el frontend y al puerto configurado para el backend (por defecto 3000)
```

Variables de entorno clave
- MERAKI_API_KEY — (requerido) API Key de Meraki Dashboard
- ADMIN_KEY — (requerido) clave para endpoints administrativos
- MERAKI_ORG_ID — ID de organización (opcional, acelera la resolución)
- PUERTO — puerto del backend (default 3000)

Principales endpoints (resumen)

POST /api/login — autenticación de técnicos
GET /api/resolve-network?q={codigo} — busca y resuelve un código de predio
GET /api/networks/{networkId}/summary — resumen operativo completo (topology, devices, stats)
POST /api/predios/sync — sincroniza CSV de predios (requiere x-admin-key)

Estructura del repositorio (alto nivel)

- /backend — API, scripts y datos maestros (predios.csv)
- /frontend — aplicación React + assets
- /docker-compose.yml — orquestación local
- /.github/workflows — workflows CI (builds y tests)

Buenas prácticas y notas
- No subir instaladores/binarios grandes al repo; si es necesario, usar Git LFS.
- Mantener la API key fuera del repositorio (.env no versionado).
- Para producción, use un proceso supervisado (systemd / PM2) y configure backups del CSV si se mantiene como fuente de verdad.

Soporte y documentación adicional
- Backend: ./backend/README.md
- Frontend: ./frontend/README.md
- Guías de despliegue detalladas: carpeta de docs (si existe) o archivos DEPLOYMENT_*.md

Si necesitas que prepare un pipeline de CI/CD más completo (build + tests + push de imágenes), dime el proveedor objetivo (GitHub Packages, Docker Hub, Azure ACR) y preparo el workflow.

``` 
