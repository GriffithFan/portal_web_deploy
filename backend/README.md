# Backend - Portal Meraki

API REST desarrollada en Node.js + Express para comunicación con Cisco Meraki Dashboard API.

```markdown
# Backend — API del Portal Meraki

Descripción
- Servicio REST responsable de orquestar y normalizar las llamadas al Meraki Dashboard API. Expone endpoints consumibles por el frontend y por herramientas internas de diagnóstico.

Estructura relevante

```
backend/
├─ src/
│  ├─ servidor.js       # Inicializa servidor y monta rutas
│  ├─ merakiApi.js      # Cliente API con cache y reintentos
│  ├─ auth.js           # Autenticación / autorización de técnicos
│  ├─ rutas.js          # Definición de endpoints
│  └─ transformers.js   # Construcción de topología y normalización de dispositivos
├─ data/
│  └─ predios.csv       # Catálogo maestro de predios
└─ scripts/              # Scripts de carga, auditoría y mantenimiento
```

Instalación y arranque (desarrollo)

```powershell
cd backend
npm ci
copy .env.example .env   # editar .env con MERAKI_API_KEY y ADMIN_KEY
npm run dev
```

Variables de entorno

- `MERAKI_API_KEY` (requerido): API Key de Meraki Dashboard.
- `ADMIN_KEY` (recomendado): clave para operaciones administrativas internas.
- `MERAKI_ORG_ID` (opcional): limita consultas a una organización concreta.
- `PUERTO` (opcional): puerto del servidor (por defecto 3000).

Endpoints principales (resumen)

- `POST /api/login` — autenticación de técnicos.
- `GET /api/resolve-network?q={codigo}` — resuelve código de predio a organización/network.
- `GET /api/networks/{networkId}/summary` — resumen operativo (dispositivos, topología, uplinks, métricas).
- `GET /api/networks/{networkId}/section/{sectionKey}` — carga por secciones (lazy loading).
- `POST /api/predios/sync` — sincroniza el CSV de predios (requiere header `x-admin-key`).

Comportamiento y consideraciones técnicas

- Caché: TTL por categoría para proteger las llamadas a Meraki (configurable).
- Topología: prioriza Link Layer, después LLDP/CDP y, si hace falta, heurísticas basadas en uplinks.
- Tolerancia a fallos: el servicio intenta degradar de forma parcial y devolver lo que esté disponible cuando alguna llamada externa falla.

Scripts útiles

- `node scripts/loadAllPredios.js` — genera o regenera el catálogo desde la API.
- `node scripts/updatePredios.js` — actualización incremental del CSV.
- `node scripts/dumpSummary.js <networkId>` — exporta snapshot para diagnóstico.

Desarrollo y logs

```powershell
# Ver logs (si está configurado el fichero)
tail -f logs/app.log

# Tareas de mantenimiento
node scripts/checkPrediosDuplicates.js
```

Problemas comunes

- 401 Unauthorized: comprobar `MERAKI_API_KEY` y permisos en la cuenta de Meraki.
- Predios faltantes: ejecutar `node scripts/loadAllPredios.js` y validar `data/predios.csv`.
- Latencia o timeouts: revisar conectividad saliente y límites de tasa (rate limits) de Meraki.

Más documentación

- Consulta el README raíz para despliegue y guías de producción.

```


## Scripts de Mantenimiento


