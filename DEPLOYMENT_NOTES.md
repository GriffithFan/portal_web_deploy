# Notas de Deployment - Portal Meraki

## 📋 Resumen de Configuración

### ✅ Service Worker (PWA)
- **Manejado por:** `vite-plugin-pwa`
- **Estrategia:** Auto-update con cache inteligente
- **Versionado:** Automático con hash de Vite
- **No requiere:** Service Worker manual

### ✅ Caché de Archivos
**Archivos versionados (con hash):**
- JS/CSS: `main-abc123.js`, `index-xyz789.css`
- Cache: 1 año (inmutable)
- Vite regenera hash en cada build

**Archivos NO cacheables:**
- `index.html` - Siempre fresh
- `manifest.json` - Siempre fresh
- `sw.js`, `workbox-*.js`, `registerSW.js` - Siempre fresh
- API calls - Network first

### ✅ Nginx
- Compresión Gzip + Brotli
- Headers de cache correctos
- Proxy reverso para `/api/`
- Timeouts ajustados para Meraki API (60s)

## 🔄 Proceso de Actualización

1. **GitHub → VPS**
   ```bash
   ./update.sh
   ```

2. **Backup automático de:**
   - `tecnicos.json` (preservado en updates)

3. **Build frontend:**
   - Vite genera nuevos hashes
   - Service Worker detecta cambios
   - Usuarios reciben actualización automática

4. **Rollback si falla:**
   ```bash
   cd /root/portal-meraki-deploy
   git reset --hard <commit-anterior>
   ./update.sh
   ```

## 🎯 Problemas Resueltos

### ❌ Problema: Crash en producción desde GitHub
**Causa:** Archivos versionados con hash no coincidían con Service Worker hardcodeado

**Solución:**
- Eliminado Service Worker manual
- Vite-PWA maneja todo automáticamente
- Cache strategy: NetworkFirst para APIs, Cache con fallback para assets

### ❌ Problema: Archivos no se actualizaban
**Causa:** Cache agresivo de index.html

**Solución:**
- `index.html`: Cache-Control no-store
- JS/CSS versionados: Cache 1 año (cambian nombre en cada build)
- Manifest y SW: no-cache

## 📦 Build Chunks Optimizados

```javascript
manualChunks: {
  vendor: ['react', 'react-dom', 'react-router-dom'],
  icons: ['lucide-react']
}
```

**Beneficios:**
- Mejor cache de dependencias
- Menos re-downloads en updates
- Carga inicial más rápida

## 🚀 URLs de Producción

- **Frontend:** https://portalmeraki.info
- **API Backend:** https://portalmeraki.info/api
- **Health Check:** https://portalmeraki.info/api/health

## 📝 Checklist Pre-Deploy

- [ ] Variables de entorno configuradas (`.env`)
- [ ] `tecnicos.json` tiene credenciales válidas
- [ ] PM2 corriendo: `pm2 status`
- [ ] Nginx configurado: `nginx -t`
- [ ] SSL activo (Cloudflare o Let's Encrypt)
- [ ] Puertos abiertos: 80, 443

## 🔍 Diagnóstico Rápido

```bash
# Backend logs
pm2 logs portal-meraki-backend

# Estado PM2
pm2 describe portal-meraki-backend

# Test API
curl http://localhost:3000/api/health

# Test Nginx
curl -I https://portalmeraki.info

# Ver Service Worker activo (desde browser console)
navigator.serviceWorker.getRegistrations()
```

## 🎨 Características PWA

- ✅ Instalable en móviles
- ✅ Funcionamiento offline (recursos cacheados)
- ✅ Auto-actualización en background
- ✅ Iconos optimizados (SVG adaptables)
- ✅ Tema color personalizado (#2563eb)

---

**Última actualización:** 26 de noviembre de 2025
