# Portal Meraki# Portal Meraki



Una aplicación web completa para monitorear redes Cisco Meraki, construida con React y Node.js.Portal web empresarial de monitoreo Cisco Meraki para técnicos de redes.



## 🚀 Deployment en Ubuntu VPS## Despliegue en Producción (Hostinger + EasyPanel)



Este proyecto está optimizado para deployment directo en servidores Ubuntu usando PM2 y Nginx.**Guía completa**: [HOSTINGER_EASYPANEL_SETUP.md](./HOSTINGER_EASYPANEL_SETUP.md)



### Estructura del Proyecto### Setup Rápido

``````bash

portal-meraki-deploy/# 1. Instalar EasyPanel en VPS Hostinger

├── backend/                 # API Node.jscurl -sSL https://get.easypanel.io | sh

│   ├── src/                # Código fuente

│   ├── ecosystem.config.js # Configuración PM2# 2. Configurar .env con tu Meraki API Key

│   └── .env.example       # Variables de entornoMERAKI_API_KEY=tu_api_key_aqui

├── frontend/              # Aplicación React

│   ├── src/              # Código fuente# 3. Deploy desde EasyPanel UI o Docker Compose

│   └── dist/             # Build de produccióndocker-compose up -d

└── deploy-ubuntu.sh      # Script de deployment```

```

```markdown

### Requisitos# Portal Meraki — Panel técnico para técnicos de redes

- Ubuntu 22.04+ LTS

- Dominio apuntando al servidorAplicación para diagnóstico y monitoreo de infraestructuras gestionadas con Cisco Meraki. Está pensada para equipos técnicos (NOC/soporte) que necesitan un resumen operativo claro de redes, topología y estado de appliances.

- Acceso root al VPS

Guía rápida — despliegue

### Deployment Rápido

1) Preparar variables de entorno en `backend/.env.production` o `.env`.

1. **Copia el proyecto al VPS:**2) Construir y levantar con Docker Compose:

```bash

scp -r portal-meraki-deploy root@tu-servidor-ip:/home/```bash

```docker-compose up -d --build

```

2. **Ejecuta el script de deployment:**

```bash3) (Opcional) Cargar catálogo de predios:

cd /home/portal-meraki-deploy

chmod +x deploy-ubuntu.sh```bash

sudo ./deploy-ubuntu.shdocker-compose exec portal-meraki node backend/scripts/loadAllPredios.js

``````



3. **Configura tus variables de entorno:**Desarrollo local

```bash

nano /home/portal-meraki/backend/.env- Backend (API):

```

```bash

4. **Obtén certificado SSL:**cd backend

```bashnpm ci

certbot --nginx -d portalmeraki.info -d www.portalmeraki.infonpm run dev

``````



### Variables de Entorno Requeridas- Frontend (cliente):



En `/home/portal-meraki/backend/.env`:```bash

```bashcd frontend

MERAKI_API_KEY=tu_api_key_aquinpm ci

ADMIN_KEY=tu_clave_admin_seguranpm run dev

NODE_ENV=production# Abre http://localhost:5173

PUERTO=3000```

HOST=127.0.0.1

```Arquitectura



### Comandos Útiles- Backend: Node.js (Express)

- Frontend: React (Vite)

```bash- Orquestación local: Docker Compose

# Ver estado de la aplicación

sudo -u www-data pm2 statusVariables críticas



# Ver logs en tiempo real- `MERAKI_API_KEY` — clave de Meraki Dashboard (no subir al repo).

sudo -u www-data pm2 logs portal-meraki- `ADMIN_KEY` — clave para endpoints administrativos.

- `MERAKI_ORG_ID` — ID de organización (opcional para limitar búsquedas).

# Reiniciar aplicación

sudo -u www-data pm2 restart portal-merakiEndpoints principales



# Reiniciar Nginx- `POST /api/login` — autenticación técnicos.

sudo systemctl restart nginx- `GET /api/resolve-network?q={codigo}` — resuelve código de predio.

```- `GET /api/networks/{networkId}/summary` — resumen operativo.



## 🛠️ Desarrollo LocalEstructura del repo



### Backend- `/backend` — API, scripts y datos maestros (predios.csv)

```bash- `/frontend` — cliente React

cd backend- `docker-compose.yml` — orquestación local

npm install

npm run devNotas prácticas

```

- No incluir instaladores o binarios grandes en el repositorio; usar Git LFS si son necesarios.

### Frontend- Mantén la API key fuera del control de versiones (`.env` no versionado).

```bash

cd frontendSi quieres, preparo un workflow CI/CD que construya el frontend y publique imágenes (Docker Hub, GitHub Packages o ACR). Dime el destino.

npm install

npm run dev```

```Variables de entorno clave


## 📁 Características

- **Dashboard**: Monitoreo en tiempo real de redes Meraki
- **Mobile UX**: Interfaz optimizada para dispositivos móviles
- **Wireless**: Análisis de puntos de acceso y calidad de señal
- **Topología**: Visualización de conectividad de red
- **Administración**: Panel para gestión de técnicos

## 🔧 API Endpoints

- `POST /api/login` - Autenticación de técnicos
- `GET /api/resolve-network?q={codigo}` - Resolución de códigos de predio
- `GET /api/networks/{networkId}/summary` - Resumen operativo
- `GET /api/predios` - Gestión de predios
- `GET /api/health` - Health check

## 📝 Notas

- Mantén el archivo `.env` fuera del control de versiones
- La aplicación incluye interfaz móvil optimizada
- Configurado para funcionar con certificados SSL automáticos via Certbot