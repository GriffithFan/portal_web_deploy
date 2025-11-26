# 🚀 Guía de Deploy - Post Restauración

## ✅ Cambios Aplicados (Commit: f06ad83)

### 🎯 Problema Resuelto
**Crash del frontend al descargar desde GitHub** causado por:
- Service Worker manual conflictuando con Vite-PWA
- Cache de archivos versionados con hash dinámico
- Headers de cache incorrectos en Nginx

### 🔧 Soluciones Implementadas

#### 1. **Vite PWA Optimizado** (`frontend/vite.config.js`)
```javascript
✅ Auto-update automático
✅ Cache strategies para Meraki API (NetworkFirst, 5min TTL)
✅ Cache strategies para Backend API (NetworkFirst, 5min TTL)
✅ globPatterns para todos los assets
✅ manualChunks: vendor (React libs) + icons (lucide-react)
✅ skipWaiting + clientsClaim para updates instantáneos
```

#### 2. **Nginx Cache Headers** (`nginx-portal-meraki.conf`)
```nginx
✅ index.html: no-store (siempre fresh)
✅ manifest.json: no-store (siempre fresh)
✅ sw.js, registerSW.js: no-cache
✅ JS/CSS versionados: cache 1 año inmutable
✅ Imágenes/fuentes: cache 1 año inmutable
```

#### 3. **GitIgnore Limpiado** (`.gitignore`)
```
✅ Eliminadas referencias a archivos de docs vacíos
✅ Mantenido portal_web_deploy/ (carpeta temporal)
✅ Preservado tecnicos.json en backend/data/
```

## 📋 Pasos para Deploy en VPS

### 1️⃣ Conectar a VPS
```bash
ssh root@72.61.32.146
```

### 2️⃣ Ir al directorio del proyecto
```bash
cd /root/portal-meraki-deploy
```

### 3️⃣ Verificar estado actual
```bash
git status
git log --oneline -5
```

### 4️⃣ Ejecutar actualización
```bash
./update.sh
```

**El script automáticamente:**
- ✅ Hace backup de `tecnicos.json`
- ✅ Descarga cambios desde GitHub
- ✅ Restaura `tecnicos.json`
- ✅ Instala dependencias backend
- ✅ Reinicia PM2
- ✅ Builda frontend con Vite
- ✅ Recarga Nginx

### 5️⃣ Verificar deployment
```bash
# Ver logs en tiempo real
pm2 logs portal-meraki-backend --lines 50

# Verificar health check
curl http://localhost:3000/api/health

# Ver estado PM2
pm2 status
```

### 6️⃣ Probar desde navegador
1. Abrir: https://portalmeraki.info
2. **Ctrl+Shift+R** (hard refresh) para limpiar cache
3. Abrir DevTools → Application → Service Workers
4. Verificar que el SW se actualiza correctamente
5. Probar funcionalidades (login, búsqueda de predios, etc.)

## 🔍 Troubleshooting

### ❌ Si el frontend no carga
```bash
# Verificar que el build se completó
ls -lah /root/portal-meraki-deploy/frontend/dist/

# Debe mostrar:
# - index.html
# - assets/ (con archivos .js y .css)
# - manifest.json
# - iconos SVG
```

### ❌ Si el backend no responde
```bash
# Ver logs completos
pm2 logs portal-meraki-backend --lines 100

# Reiniciar manualmente
pm2 restart portal-meraki-backend

# Verificar .env
cat backend/.env | grep -v "API_KEY"
```

### ❌ Si Nginx muestra 502
```bash
# Verificar que PM2 está corriendo
pm2 status

# Test de configuración Nginx
nginx -t

# Recargar Nginx
systemctl reload nginx
```

### ❌ Service Worker antiguo cacheado
**En el navegador:**
1. DevTools → Application → Service Workers
2. Click en "Unregister"
3. Application → Storage → Clear site data
4. Hard refresh (Ctrl+Shift+R)

## 📊 Verificaciones Post-Deploy

- [ ] Backend responde en `http://localhost:3000/api/health`
- [ ] Frontend carga en `https://portalmeraki.info`
- [ ] Login funciona correctamente
- [ ] Búsqueda de predios retorna resultados
- [ ] Service Worker se registra (ver DevTools)
- [ ] No hay errores en consola del navegador
- [ ] PM2 muestra proceso "online"
- [ ] Nginx logs no muestran errores 502/504

## 🎉 Resultado Esperado

```
✅ Frontend carga sin errores
✅ Service Worker se actualiza automáticamente
✅ Assets versionados cachean correctamente
✅ API responde con datos de Meraki
✅ PWA instalable en móviles
✅ No más crashes al actualizar desde GitHub
```

## 🔄 Rollback (si algo falla)
```bash
cd /root/portal-meraki-deploy
git reset --hard 3a5b446  # Commit anterior
./update.sh
```

---

**Commit actual:** `f06ad83` - Optimización PWA y cache  
**Commit anterior:** `3a5b446` - Backup seguro  
**Fecha:** 26 de noviembre de 2025
