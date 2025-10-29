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

## Funcionalidades

- **Búsqueda Instantánea**: <1ms por código de predio usando índice CSV (32k+ predios)
- **Topología**: Visualización fuerza-dirigida con LLDP/CDP
- **Switches**: Lista MS con puertos y conectividad
- **Access Points**: Tabla MR con velocidades y estados
- **Appliance Status**: Uplinks WAN con métricas

## Configuración

```bash
# backend/.env
MERAKI_API_KEY=tu_api_key
ADMIN_KEY=clave_segura
MERAKI_ORG_ID=              # Opcional
PUERTO=3000
```

## API Endpoints

```http
POST /api/login
GET /api/resolve-network?q=602360
GET /api/networks/:networkId/summary
POST /api/predios/sync  # requiere x-admin-key
```

## Scripts

```bash
npm run load-predios              # Carga inicial
node scripts/updatePredios.js     # Actualización
node scripts/dumpSummary.js 602360
```

## Documentación

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Despliegue completo con Docker + Portainer
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) - Configuración de Cloudflare (CDN/SSL/Firewall)
- [backend/README.md](backend/README.md) - Documentación del API
- [backend/scripts/README.md](backend/scripts/README.md) - Scripts de mantenimiento

---

**Versión 2.0.0** | Enero 2025
