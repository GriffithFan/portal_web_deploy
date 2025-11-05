# 🚀 Optimización de Performance - Plan de Implementación

## Fase 1: Compresión Nginx (Sin Riesgos) ⚡

### Beneficios
- 60-70% menos payload en JS/CSS
- Carga inicial 2-3x más rápida
- Assets en cache del navegador (1 año)

### Riesgos
- ❌ NINGUNO para datos actualizados
- ✅ API siempre fresca (`Cache-Control: no-cache`)
- ✅ Service Worker NO se cachea (PWA se actualiza automáticamente)

### Implementación

#### 1. Instalar Brotli
```bash
ssh root@72.61.32.146
apt update
apt install -y libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static
```

#### 2. Actualizar nginx-portal-meraki.conf
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name portalmeraki.info www.portalmeraki.info 72.61.32.146;

    # Logs
    access_log /var/log/nginx/portal-meraki-access.log;
    error_log /var/log/nginx/portal-meraki-error.log;

    # Root para archivos estáticos del frontend
    root /root/portal-meraki-deploy/frontend/dist;
    index index.html;

    # ===== COMPRESIÓN MEJORADA =====
    
    # Gzip (mejorado)
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/javascript 
        application/x-javascript
        application/xml+rss 
        application/json
        application/ld+json
        application/manifest+json
        image/svg+xml;
    
    # Brotli (NUEVO - mejor compresión)
    brotli on;
    brotli_comp_level 6;
    brotli_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/javascript 
        application/x-javascript
        application/json
        application/xml+rss
        image/svg+xml;

    # ===== PROXY API (SIN CACHE) =====
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # IMPORTANTE: NO CACHEAR API
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        
        # Timeouts aumentados
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ===== ASSETS ESTÁTICOS (CON CACHE) =====
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache para assets versionados
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # NO cachear index.html (para updates)
        location = /index.html {
            add_header Cache-Control "no-cache, must-revalidate";
            expires 0;
        }
        
        # NO cachear PWA files (para auto-update)
        location ~* (manifest\.webmanifest|sw\.js|workbox-.*\.js|registerSW\.js)$ {
            add_header Cache-Control "no-cache, must-revalidate";
            expires 0;
        }
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 3. Verificar y aplicar
```bash
# Verificar sintaxis
nginx -t

# Si OK, recargar
systemctl reload nginx

# Verificar compresión funciona
curl -I -H "Accept-Encoding: gzip, br" https://portalmeraki.info/assets/index-*.js | grep -i "content-encoding"
# Debe mostrar: content-encoding: br (o gzip)
```

---

## Fase 2: Lazy Loading de Componentes React ⚡

### Beneficios
- Bundle inicial: 850KB → 400KB (50% reducción)
- Carga inicial: 3.5s → 1.5s
- Componentes se cargan bajo demanda

### Riesgos
- ❌ NINGUNO para datos actualizados
- ✅ Componentes lazy siempre hacen fetch a API cuando se montan
- ✅ Token se pasa como prop, no se cachea

### Implementación

#### 1. Modificar Dashboard.jsx (imports)
```javascript
// frontend/src/pages/Dashboard.jsx (líneas ~10-20)
import { lazy, Suspense } from 'react';
import LoadingOverlay from '../components/ui/LoadingOverlay';

// Lazy load de componentes pesados
const SimpleGraph = lazy(() => import('../components/SimpleGraph'));
const ConnectivityGraph = lazy(() => import('../components/ConnectivityGraph'));
const ApplianceHistoricalCharts = lazy(() => import('../components/ApplianceHistoricalCharts'));
const AppliancePortsMatrix = lazy(() => import('../components/AppliancePortsMatrix'));

// Mantener imports normales para componentes críticos
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
```

#### 2. Envolver componentes con Suspense
```javascript
// Topología: carga lazy
{selectedSection === 'topology' && topologyData && (
  <Suspense fallback={<LoadingOverlay message="Cargando topología..." />}>
    <div className="graph-wrapper" style={{ overflow: 'hidden' }}>
      <SimpleGraph 
        devices={topologyData.devices} 
        links={topologyData.links}
        predioCode={selectedNetwork?.predio_code}
      />
    </div>
  </Suspense>
)}

// Gráficos históricos: carga lazy
{showHistoricalCharts && (
  <Suspense fallback={<div>Cargando gráficos...</div>}>
    <ApplianceHistoricalCharts 
      networkId={selectedNetwork.id}
      token={token}
    />
  </Suspense>
)}

// Connectivity Graph: carga lazy
{conectividadData && (
  <Suspense fallback={<LoadingOverlay message="Cargando gráfico..." />}>
    <ConnectivityGraph data={conectividadData} />
  </Suspense>
)}
```

#### 3. Build y deploy
```bash
# En local
cd c:\portal-meraki-deploy\frontend
npm run build

# Verificar chunks generados
ls dist/assets/
# Debe mostrar múltiples archivos: index-*.js, SimpleGraph-*.js, etc.

# Commit y push
git add .
git commit -m "feat: lazy loading de componentes pesados (SimpleGraph, ApplianceHistoricalCharts, ConnectivityGraph)"
git push origin main

# En servidor
cd ~/portal-meraki-deploy
git pull origin main
cd frontend
npm run build
systemctl reload nginx
```

---

## Fase 3: Redis Cache con TTL Cortos 🚀

### Beneficios
- 10-100x más rápido que API Meraki
- Cache persistente entre reinicios PM2
- Reduce llamadas API (evita rate limits)

### Riesgos MITIGADOS
1. **Datos desactualizados** → TTL cortos (30s-10min)
2. **Técnico hace cambio y no se refleja** → Invalidación manual + botón "Refrescar"
3. **Redis down** → Fallback automático a API directa

### Implementación

#### 1. Instalar Redis
```bash
ssh root@72.61.32.146
apt update
apt install -y redis-server

# Verificar instalación
redis-cli ping
# Debe responder: PONG

# Configurar inicio automático
systemctl enable redis-server
systemctl start redis-server
```

#### 2. Instalar cliente Redis en Node.js
```bash
cd ~/portal-meraki-deploy/backend
npm install ioredis
```

#### 3. Crear configuración Redis
```javascript
// backend/src/config/redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log('✅ Redis conectado');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

module.exports = redis;
```

#### 4. Crear servicio de cache
```javascript
// backend/src/services/cacheService.js
const redis = require('../config/redis');
const merakiApi = require('../merakiApi');

// TTL por tipo de dato (en segundos)
const TTL = {
  LLDP: 600,           // 10 minutos - cambios físicos raros
  DEVICE_STATUS: 30,   // 30 segundos - cambia frecuentemente
  TOPOLOGY: 600,       // 10 minutos
  UPLINK: 120,         // 2 minutos
  AP_CLIENTS: 60,      // 1 minuto - muy dinámico
  PREDIOS: 3600,       // 1 hora - casi nunca cambia
  HISTORICAL: 300      // 5 minutos - datos históricos
};

// Función genérica de cache con fallback
async function cacheOrFetch(cacheKey, ttl, fetchFunction) {
  try {
    // 1. Intentar obtener de cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }
    
    console.log(`❌ Cache MISS: ${cacheKey}`);
  } catch (redisError) {
    console.error('Redis error, usando fallback:', redisError);
  }
  
  // 2. Obtener datos frescos
  const fresh = await fetchFunction();
  
  // 3. Guardar en cache (ignorar errores de Redis)
  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(fresh));
    console.log(`💾 Cached: ${cacheKey} (TTL: ${ttl}s)`);
  } catch (err) {
    console.error('Error guardando en cache:', err);
  }
  
  return fresh;
}

// ===== FUNCIONES ESPECÍFICAS =====

async function getLLDPCached(networkId) {
  return cacheOrFetch(
    `lldp:${networkId}`,
    TTL.LLDP,
    () => merakiApi.getNetworkDevicesLldpCdp(networkId)
  );
}

async function getDeviceStatusCached(serial) {
  return cacheOrFetch(
    `device:${serial}`,
    TTL.DEVICE_STATUS,
    () => merakiApi.getDeviceStatus(serial)
  );
}

async function getTopologyCached(networkId) {
  return cacheOrFetch(
    `topology:${networkId}`,
    TTL.TOPOLOGY,
    () => merakiApi.getNetworkTopologyLinkLayer(networkId)
  );
}

// Invalidar cache manualmente
async function invalidateCache(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Cache invalidado: ${keys.length} keys (${pattern})`);
      return keys.length;
    }
    return 0;
  } catch (err) {
    console.error('Error invalidando cache:', err);
    return 0;
  }
}

module.exports = {
  getLLDPCached,
  getDeviceStatusCached,
  getTopologyCached,
  invalidateCache,
  cacheOrFetch,
  TTL
};
```

#### 5. Integrar en servidor.js
```javascript
// backend/src/servidor.js
const cacheService = require('./services/cacheService');

// Reemplazar llamadas directas a merakiApi con versiones cached

// ANTES:
// const lldpData = await merakiApi.getNetworkDevicesLldpCdp(networkId);

// DESPUÉS:
const lldpData = await cacheService.getLLDPCached(networkId);

// Endpoint para invalidar cache (admin)
app.post('/api/admin/cache/invalidate', requireAdmin, async (req, res) => {
  const { networkId, serial, pattern } = req.body;
  
  let deletedKeys = 0;
  
  if (networkId) {
    deletedKeys += await cacheService.invalidateCache(`*:${networkId}`);
  }
  
  if (serial) {
    deletedKeys += await cacheService.invalidateCache(`device:${serial}`);
  }
  
  if (pattern) {
    deletedKeys += await cacheService.invalidateCache(pattern);
  }
  
  res.json({ 
    success: true, 
    message: `Cache invalidado: ${deletedKeys} keys eliminadas` 
  });
});

// Endpoint para ver estadísticas de cache
app.get('/api/admin/cache/stats', requireAdmin, async (req, res) => {
  const redis = require('./config/redis');
  
  const info = await redis.info('stats');
  const keys = await redis.dbsize();
  
  res.json({
    totalKeys: keys,
    hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0),
    misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || 0)
  });
});
```

#### 6. Botón de refresh en frontend
```javascript
// frontend/src/pages/Dashboard.jsx
const handleForceRefresh = async () => {
  setIsLoading(true);
  
  // Invalidar cache del backend
  await fetch(`/api/admin/cache/invalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey // Solo si es admin
    },
    body: JSON.stringify({ networkId: selectedNetwork.id })
  });
  
  // Re-fetch datos
  await loadNetworkSummary(selectedNetwork.id);
  
  setIsLoading(false);
};

// En el render
<button 
  onClick={handleForceRefresh}
  title="Forzar actualización (ignora cache)"
  className="refresh-button"
>
  🔄 Actualizar
</button>
```

#### 7. Deploy
```bash
# Commit y push
git add .
git commit -m "feat: implementar Redis cache con TTL cortos y fallback automático"
git push origin main

# En servidor
cd ~/portal-meraki-deploy
git pull origin main
cd backend
npm install
pm2 restart portal-meraki-backend

# Verificar Redis funcionando
redis-cli
> KEYS *
> GET lldp:L_123456789
> TTL lldp:L_123456789
```

---

## 📊 Tabla de TTLs Recomendados

| Tipo de Dato | TTL | Razón | Impacto si desactualizado |
|--------------|-----|-------|---------------------------|
| **LLDP/CDP** | 10 min | Cambios físicos raros | Bajo - topología no cambia cada minuto |
| **Device Status** | 30s | Cambia frecuentemente | Bajo - se actualiza rápido |
| **AP Clients** | 1 min | Muy dinámico | Bajo - números aproximados OK |
| **Uplink Status** | 2 min | Ocasional | Medio - importante pero no crítico |
| **Predios CSV** | 1 hora | Casi nunca cambia | Ninguno - datos estáticos |
| **Historical Charts** | 5 min | Datos históricos | Ninguno - histórico no cambia |

---

## 🧪 Testing de Datos Actualizados

```bash
# Test 1: Verificar que datos frescos se obtienen al iniciar sesión
1. Hacer cambio en Meraki Dashboard (ej: cambiar nombre de AP)
2. Esperar 30 segundos (TTL de device status)
3. Refrescar en Portal Meraki
4. ✅ Debe mostrar nombre actualizado

# Test 2: Verificar fallback cuando Redis está down
sudo systemctl stop redis-server
# Abrir Portal Meraki
# ✅ Debe funcionar igual (más lento, pero funciona)
sudo systemctl start redis-server

# Test 3: Verificar invalidación manual
curl -X POST https://portalmeraki.info/api/admin/cache/invalidate \
  -H "X-Admin-Key: tu_key" \
  -H "Content-Type: application/json" \
  -d '{"networkId":"L_123456789"}'
# ✅ Próximo request debe traer datos frescos
```

---

## 📋 Checklist de Implementación

### Fase 1: Nginx (1 hora)
- [ ] Instalar brotli
- [ ] Actualizar nginx config
- [ ] Verificar sintaxis nginx
- [ ] Recargar nginx
- [ ] Verificar compresión con curl
- [ ] Commit cambios a Git

### Fase 2: Lazy Loading (2 horas)
- [ ] Modificar Dashboard.jsx (imports)
- [ ] Envolver componentes con Suspense
- [ ] Testing en local
- [ ] Build y verificar chunks
- [ ] Deploy a servidor
- [ ] Verificar carga en DevTools

### Fase 3: Redis (4 horas)
- [ ] Instalar Redis en servidor
- [ ] Instalar ioredis en backend
- [ ] Crear redis.js config
- [ ] Crear cacheService.js
- [ ] Integrar en servidor.js
- [ ] Crear endpoints de admin (invalidate, stats)
- [ ] Agregar botón refresh en frontend
- [ ] Testing de TTL y fallback
- [ ] Deploy y verificar

---

## 🎯 Orden de Implementación Recomendado

1. **Nginx** (sin riesgos, impacto inmediato)
2. **Lazy Loading** (sin riesgos, mejora UX)
3. **Redis** (más complejo, pero mayor beneficio a largo plazo)

¿Empezamos con Nginx?
