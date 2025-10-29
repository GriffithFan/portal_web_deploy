# Backend - Portal Meraki

API REST desarrollada en Node.js + Express para comunicación con Cisco Meraki Dashboard API.

## Estructura

```
backend/
├── src/
│   ├── servidor.js      # Servidor principal y endpoints
│   ├── merakiApi.js     # Cliente API Meraki con caché
│   ├── auth.js          # Autenticación de técnicos
│   ├── rutas.js         # Definición de rutas
│   ├── transformers.js  # Normalización de topología
│   └── tecnicos.json    # Base de datos de usuarios
├── config/              # Configuraciones
├── data/
│   └── predios.csv      # Catálogo de predios
└── scripts/             # Scripts de mantenimiento
```

## Instalación

```bash
npm install
cp .env.example .env
nano .env  # Configurar MERAKI_API_KEY
npm run dev
```

## Variables de Entorno

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `MERAKI_API_KEY` | Sí | API Key de Dashboard Meraki |
| `MERAKI_ORG_ID` | No | ID específico (si no, recorre todas) |
| `PUERTO` | No | Puerto del servidor (default 3000) |
| `ADMIN_KEY` | Sí | Clave para endpoints admin |
| `CORS_ORIGINS` | No | Orígenes permitidos (default *) |
| `NODE_ENV` | No | production/development |

## Endpoints Principales

### Autenticación
- `POST /api/login` - Login de técnicos

### Búsqueda de Predios
- `GET /api/networks/search?q=<codigo>` - Buscar predio por código
- `GET /api/resolve-network?q=<codigo>` - Resolver predio (retorna org + network)

### Datos de Red
- `GET /api/networks/:networkId/summary` - Resumen completo (topology, devices, appliance)
- `GET /api/networks/:networkId/topology` - Topología linkLayer con fallbacks
- `GET /api/networks/:networkId/switches` - Lista de switches MS
- `GET /api/networks/:networkId/access_points` - Access points MR
- `GET /api/networks/:networkId/appliance_status` - Estado de appliances MX

### Administración (requiere `x-admin-key`)
- `POST /api/predios/sync` - Sincronizar CSV predios
- `GET /api/predios/last-sync` - Último estado de sincronización
- `GET /api/tecnicos` - Listar técnicos
- `POST /api/tecnicos` - Crear técnico `{ username, password }`
- `DELETE /api/tecnicos/:username` - Eliminar técnico

## Arquitectura Técnica

### Sistema de Caché
- TTL dinámico por tipo de dato (5 min networks, 3 min devices, 1 min appliance)
- Caché en memoria con limpieza automática
- Warm-up opcional al inicio (`warmCache.js`)

### Transformación de Topología
`transformers.js` reconstruye topología usando:
1. **Datos LinkLayer** (preferido)
2. **LLDP/CDP** de dispositivos (fallback)
3. **Appliance Uplinks** (último recurso)

### Sincronización de Predios
- Catálogo CSV con códigos de 6 dígitos
- Auto-sync programable cada N minutos
- Rebuild completo con `POST /api/predios/sync` + `{ force: true }`

## Scripts de Mantenimiento

Ver [scripts/README.md](scripts/README.md) para detalles de:
- `loadAllPredios.js` - Carga inicial del catálogo
- `updatePredios.js` - Actualización incremental
- `dumpSummary.js` - Exportar snapshots
- `checkPrediosDuplicates.js` - Verificar duplicados

## Desarrollo

```bash
# Modo desarrollo con hot-reload
npm run dev

# Verificar logs
tail -f logs/app.log

# Cargar predios (CRÍTICO después de deploy)
npm run load-predios
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| 401 Unauthorized | Verificar `MERAKI_API_KEY` en .env |
| No encuentra predios | Ejecutar `npm run load-predios` |
| Timeout en API | Verificar conectividad a api.meraki.com |
| Caché desactualizado | Reiniciar servidor o esperar TTL |

---

**Ver documentación completa:** [README.md](../README.md) | [DEPLOYMENT.md](../DEPLOYMENT.md)


