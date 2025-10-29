# Backend - Portal Meraki

API REST desarrollada en Node.js + Express para comunicación con Cisco Meraki Dashboard API.

```md
# Backend — API del Portal Meraki

Descripción
- Servicio REST responsable de orquestar llamadas al Meraki Dashboard API, normalizar resultados y exponer endpoints consumibles por el frontend y herramientas internas.

Estructura relevante

```
backend/
├─ src/
│  ├─ servidor.js       # Inicializa servidor y monta rutas
│  ├─ merakiApi.js      # Cliente API con cache y retries
│  ├─ auth.js           # Autenticación / autorización de técnicos
│  ├─ rutas.js          # Agrupación de endpoints
│  └─ transformers.js   # Reglas para construir topología y normalizar devices
├─ data/
│  └─ predios.csv       # Catálogo maestro de predios
└─ scripts/              # Scripts de carga, depuración y mantenimiento
```

Instalación y arranque (local)

```powershell
cd backend
npm ci
cp .env.example .env   # editar .env con MERAKI_API_KEY y ADMIN_KEY
npm run dev
```

Variables de entorno importantes

- `MERAKI_API_KEY` (requerido): API Key del Dashboard Meraki.
- `ADMIN_KEY` (requerido): clave para operaciones administrativas internas.
- `MERAKI_ORG_ID` (opcional): limita consultas a una org concreta.
- `PUERTO` (opcional): puerto del servidor (por defecto 3000).

Principales endpoints (resumen operativo)

- `POST /api/login` — autenticación de técnicos.
- `GET /api/resolve-network?q={codigo}` — resuelve código de predio a org/network.
- `GET /api/networks/{networkId}/summary` — resumen operativo: dispositivos, links, uplinks y métricas.
- `GET /api/networks/{networkId}/topology` — topología basada en LLDP/CDP y heurísticas.
- `POST /api/predios/sync` — sincroniza el CSV de predios (requiere header `x-admin-key`).

Comportamiento y consideraciones técnicas

- Caché: TTL configurables por tipo de dato para evitar sobrecarga a la API de Meraki. Hay un proceso de warm-up opcional (`warmCache.js`).
- Topología: se prioriza LinkLayer (si está disponible), luego LLDP/CDP y finalmente heurísticas basadas en uplinks.
- Manejo de errores: la API contempla reintentos para llamadas a Meraki y degradación parcial (se devuelven subcomponentes si otros fallan).

Scripts útiles

- `node scripts/loadAllPredios.js` — carga inicial del catálogo.
- `node scripts/updatePredios.js` — actualizaciones incrementales.
- `node scripts/dumpSummary.js <networkId>` — exporta snapshot para diagnóstico.

Desarrollo y logs

```powershell
# Logs en desarrollo
tail -f logs/app.log

# Correr tareas de mantenimiento
node scripts/checkPrediosDuplicates.js
```

Problemas comunes y acciones rápidas

- 401 Unauthorized: revisar que `MERAKI_API_KEY` esté correcto y activo.
- No aparecen predios: ejecutar `node scripts/loadAllPredios.js` y verificar `data/predios.csv`.
- Latencia/timeout en llamadas Meraki: comprobar conectividad saliente y límites de tasa (rate limits).

Más documentación
- Leer el README principal (`../README.md`) para guías de despliegue.

``` 


## Scripts de Mantenimiento


