# 🚀 Actualización del Portal Meraki en VPS

## 📋 Resumen de Cambios Recientes

**Fecha:** 26 de Noviembre de 2025  
**Versión:** Búsqueda por MAC/Serial Integrada

### Nuevas Funcionalidades

✅ **Búsqueda por dirección MAC** (`e4:55:a8:55:f2:6d`)  
✅ **Búsqueda por Serial optimizada** (Q2XX-XXXX-XXXX)  
✅ **Detección automática** del tipo de búsqueda (MAC/Serial/Código)  
✅ **Redireccionamiento a predio completo** después de encontrar dispositivo  
✅ **Logs mejorados** para troubleshooting

### Archivos Modificados

- `backend/src/servidor.js` - Lógica de búsqueda MAC/Serial
- `backend/src/merakiApi.js` - Nueva función `getOrganizationDevices()`
- `frontend/src/pages/Dashboard.jsx` - Logs de debug
- `frontend/src/utils/networkUtils.js` - Funciones de detección (sin cambios funcionales)

---

## 🔐 Archivos Protegidos (NO se Sobrescriben)

El sistema **preserva automáticamente** estos archivos durante las actualizaciones:

### ✅ `backend/data/tecnicos.json`
**Contiene:** Credenciales de técnicos (usuarios y contraseñas)  
**Protección:** 
- ✅ Está en `.gitignore` (no se sube a GitHub)
- ✅ El script `update.sh` hace backup automático antes de actualizar
- ✅ Se restaura automáticamente después del `git pull`

### ✅ `backend/.env.production`
**Contiene:** Variables de entorno (API keys, claves admin)  
**Protección:**
- ✅ Está en `.gitignore`
- ✅ NO se sobrescribe en actualizaciones

### ✅ `backend/data/predios.csv`
**Contiene:** Base de datos de predios (se regenera automáticamente)  
**Nota:** Se puede sobrescribir, pero se recarga desde la API de Meraki al iniciar

---

## 🔧 MÉTODO 1: Actualización Automática (RECOMENDADO)

### ⚠️ IMPORTANTE: Preservar tecnicos.json

Antes de cualquier actualización, **tecnicos.json** contiene las credenciales de los técnicos y NO debe borrarse. El script `update.sh` ya maneja esto automáticamente, pero si actualizas manualmente, sigue las instrucciones del Método 2.

### Opción A: Todo en Un Comando (Más Rápido)

```bash
ssh root@72.61.32.146 'cd /root/portal-meraki-deploy && ./update.sh'
```

**Este comando hace AUTOMÁTICAMENTE:**
1. ✅ Git pull de cambios
2. ✅ Actualiza dependencias backend (`npm install`)
3. ✅ Reinicia backend con PM2
4. ✅ Reconstruye frontend (`npm run build`)
5. ✅ Recarga Nginx

⏱️ **Tiempo estimado:** 2-3 minutos

---

### Opción B: Paso a Paso con Verificación

```bash
# 1. Conectarse al VPS
ssh root@72.61.32.146

# 2. Ir al directorio del proyecto
cd /root/portal-meraki-deploy

# 3. Ver qué archivos se van a actualizar (OPCIONAL)
git fetch origin main
git diff main origin/main --name-only

# 4. Ejecutar script de actualización
./update.sh

# 5. Verificar que todo esté corriendo
pm2 status
```

**Output esperado de `pm2 status`:**
```
┌─────┬────────────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name                   │ mode    │ ↺       │ status  │ cpu      │
├─────┼────────────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ portal-meraki-backend  │ fork    │ 0       │ online  │ 0%       │
└─────┴────────────────────────┴─────────┴─────────┴─────────┴──────────┘
```

✅ **Status debe ser: `online`**

---

## 🔧 MÉTODO 2: Actualización Manual Detallada

### Paso 1: Conectarse y Navegar

```bash
# Conectarse al VPS
ssh root@72.61.32.146

# Ir al directorio del proyecto
cd /root/portal-meraki-deploy
```

### Paso 2: Descargar Cambios de GitHub

```bash
# Ver estado actual
git status

# IMPORTANTE: Hacer backup de tecnicos.json antes de actualizar
cp backend/data/tecnicos.json backend/data/tecnicos.json.backup

# Descargar cambios (puede fallar si hay conflictos)
git pull origin main

# Si falla por conflictos, usar esta solución:
git fetch origin main
git reset --hard origin/main

# Restaurar tecnicos.json después de la actualización
cp backend/data/tecnicos.json.backup backend/data/tecnicos.json
```

**Output esperado:**
```
remote: Enumerating objects: X, done.
remote: Counting objects: 100% (X/X), done.
...
From https://github.com/GriffithFan/portal_web_deploy
 * branch            main       -> FETCH_HEAD
Updating abc1234..def5678
Fast-forward
 backend/src/merakiApi.js      | 8 ++++++++
 backend/src/servidor.js       | 150 +++++++++++++++++++++++++++++++++++++-
 frontend/src/pages/Dashboard.jsx | 15 ++++
 3 files changed, 170 insertions(+), 3 deletions(-)
```

### Paso 3: Actualizar Backend

```bash
# Ir a carpeta backend
cd backend

# Instalar/actualizar dependencias
npm install --production

# Volver a raíz
cd ..
```

### Paso 4: Reiniciar Backend con PM2

```bash
# Reiniciar el proceso
pm2 restart portal-meraki-backend

# Verificar que esté corriendo
pm2 status

# Ver logs en tiempo real (Ctrl+C para salir)
pm2 logs portal-meraki-backend --lines 50
```

**Logs esperados (sin errores):**
```json
{"level":"info","message":"Portal Meraki iniciado en http://127.0.0.1:3000","timestamp":"2025-11-26T..."}
{"level":"info","message":"Predios cargados: 32349 en 30 organizaciones","timestamp":"2025-11-26T..."}
```

### Paso 5: Actualizar Frontend

```bash
# Ir a carpeta frontend
cd frontend

# Instalar/actualizar dependencias
npm install

# Construir versión de producción
npm run build

# Volver a raíz
cd ..
```

**Output esperado del build:**
```
vite v7.1.11 building for production...
✓ 1234 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.30 kB
dist/assets/index-abc123.css     45.67 kB │ gzip: 12.34 kB
dist/assets/index-def456.js     234.56 kB │ gzip: 78.90 kB
✓ built in 15.23s
```

### Paso 6: Recargar Nginx

```bash
# Recargar configuración
sudo systemctl reload nginx

# Verificar estado
sudo systemctl status nginx
```

**Output esperado:**
```
● nginx.service - A high performance web server and a reverse proxy server
   Loaded: loaded (/lib/systemd/system/nginx.service; enabled)
   Active: active (running) since ...
```

---

## ✅ Verificación de Funcionalidad

### Test 1: Verificar que el Backend Responde

```bash
# Desde el VPS o desde tu PC local:
curl http://72.61.32.146/api/organizations
```

**Respuesta esperada:** Lista de organizaciones JSON

### Test 2: Verificar Frontend

Abrir en navegador: **https://portalmeraki.info**

**Checklist:**
- [✅] La página carga correctamente
- [✅] Login funciona
- [✅] Dashboard carga

### Test 3: Probar Búsqueda por MAC

**En la barra de búsqueda del portal:**

1. Buscar: `e4:55:a8:55:f2:6d`
2. **Debe:** Encontrar el dispositivo y cargar el predio completo
3. **Verificar:** Topología, Switches, APs, Appliance muestran datos

### Test 4: Probar Búsqueda por Serial

**En la barra de búsqueda:**

1. Buscar un Serial real (ej: `Q2XX-XXXX-XXXX`)
2. **Debe:** Encontrar el dispositivo y cargar el predio completo
3. **Verificar:** Datos completos del predio

### Test 5: Verificar Logs en Tiempo Real

```bash
# SSH al VPS
ssh root@72.61.32.146

# Ver logs mientras buscas
pm2 logs portal-meraki-backend --lines 100
```

**Búsqueda por MAC debe mostrar:**
```json
{"level":"info","message":"[ResolveNetwork] Detectado como MAC: e4:55:a8:55:f2:6d","timestamp":"..."}
{"level":"info","message":"[ResolveNetwork] MAC encontrada - Serial: Q2XX, NetworkID: L_XXXXX","timestamp":"..."}
{"level":"info","message":"[ResolveNetwork] MAC pertenece al predio XXXXXX, redirigiendo a búsqueda normal","timestamp":"..."}
```

**Búsqueda por Serial debe mostrar:**
```json
{"level":"info","message":"[ResolveNetwork] Detectado como SERIAL: Q2XX-XXXX-XXXX","timestamp":"..."}
{"level":"info","message":"[ResolveNetwork] Serial encontrado - Serial: Q2XX, NetworkID: L_XXXXX","timestamp":"..."}
{"level":"info","message":"[ResolveNetwork] Serial pertenece al predio XXXXXX, redirigiendo a búsqueda normal","timestamp":"..."}
```

---

## 🚨 Troubleshooting

### Problema 0: Error "Your local changes would be overwritten by merge"

**Causa:** Archivos modificados localmente que impiden el `git pull`

**Solución Automática (script update.sh):**
El script `update.sh` maneja esto automáticamente preservando `tecnicos.json`.

**Solución Manual:**

```bash
cd /root/portal-meraki-deploy

# Hacer backup de tecnicos.json
cp backend/data/tecnicos.json /tmp/tecnicos.json.backup

# Descartar cambios locales de otros archivos
git reset --hard HEAD

# Actualizar desde GitHub
git pull origin main

# Restaurar tecnicos.json
cp /tmp/tecnicos.json.backup backend/data/tecnicos.json

# Continuar con actualización
./update.sh
```

### Problema 1: `pm2 status` muestra Backend "errored"

**Solución:**

```bash
# Ver logs de error
pm2 logs portal-meraki-backend --err --lines 50

# Reiniciar forzado
pm2 delete portal-meraki-backend
pm2 start backend/ecosystem.config.js --env production

# Verificar
pm2 status
```

### Problema 2: Frontend no actualiza (caché)

**Solución:**

```bash
# Limpiar caché de Nginx
sudo rm -rf /var/cache/nginx/*

# Reconstruir frontend
cd /root/portal-meraki-deploy/frontend
npm run build

# Recargar Nginx
sudo systemctl reload nginx
```

**En el navegador:**
- Presionar `Ctrl + Shift + R` (hard refresh)
- O limpiar caché del navegador

### Problema 3: "Cannot find module 'X'"

**Solución:**

```bash
# Backend
cd /root/portal-meraki-deploy/backend
rm -rf node_modules package-lock.json
npm install --production

# Frontend
cd /root/portal-meraki-deploy/frontend
rm -rf node_modules package-lock.json
npm install
npm run build

# Reiniciar todo
pm2 restart portal-meraki-backend
sudo systemctl reload nginx
```

### Problema 4: Error 502 Bad Gateway

**Diagnóstico:**

```bash
# Verificar que el backend esté corriendo
pm2 status

# Si está caído, ver logs
pm2 logs portal-meraki-backend --err --lines 100

# Verificar puerto 3000
netstat -tulpn | grep 3000

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
```

**Solución:**

```bash
# Reiniciar backend
pm2 restart portal-meraki-backend

# Si Nginx tiene problemas
sudo systemctl restart nginx
```

### Problema 5: Búsqueda por MAC/Serial no funciona

**Diagnóstico:**

```bash
# Ver logs mientras buscas
pm2 logs portal-meraki-backend --lines 100

# Buscar errores relacionados
pm2 logs portal-meraki-backend | grep -i "error\|MAC\|Serial"
```

**Verificar en logs:**

❌ **ERROR:** `Detectado como SERIAL: e4:55:a8:55:f2:6d`  
✅ **CORRECTO:** `Detectado como MAC: e4:55:a8:55:f2:6d`

Si la MAC se detecta como Serial, el código no se actualizó correctamente.

**Solución:**
```bash
cd /root/portal-meraki-deploy
git status
git pull origin main --force
cd backend
npm install --production
pm2 restart portal-meraki-backend
```

---

## 📊 Comandos Útiles Post-Actualización

### Ver Estado del Sistema

```bash
# Estado de PM2
pm2 status

# Logs en tiempo real
pm2 logs portal-meraki-backend

# Logs solo de errores
pm2 logs portal-meraki-backend --err

# Monitoreo de recursos
pm2 monit

# Estado de Nginx
sudo systemctl status nginx

# Test de configuración Nginx
sudo nginx -t
```

### Ver Versión Actual del Código

```bash
cd /root/portal-meraki-deploy

# Último commit
git log -1 --oneline

# Ver hash del commit actual
git rev-parse --short HEAD

# Ver cambios locales (si hay)
git status
```

### Reiniciar Todo (Reset Completo)

```bash
# Backend
pm2 restart portal-meraki-backend

# Nginx
sudo systemctl restart nginx

# Ver que todo esté online
pm2 status
sudo systemctl status nginx
```

---

## 🔄 Rollback (Volver a Versión Anterior)

Si algo sale mal y necesitas volver a la versión anterior:

```bash
# 1. Ver commits recientes
cd /root/portal-meraki-deploy
git log --oneline -10

# 2. Volver al commit anterior (reemplaza HASH)
git reset --hard HASH_DEL_COMMIT_ANTERIOR

# Ejemplo:
# git reset --hard 41e95fa

# 3. Reinstalar dependencias
cd backend
npm install --production
cd ../frontend
npm install
npm run build

# 4. Reiniciar servicios
pm2 restart portal-meraki-backend
sudo systemctl reload nginx

# 5. Verificar
pm2 status
```

**⚠️ IMPORTANTE:** Esto borra los cambios locales. Asegúrate de que sea necesario.

---

## 📝 Notas Importantes

### Backups Automáticos

El sistema hace backup automático de:
- ✅ Configuración `.env.production` (cuando cambias claves)
- ✅ Base de datos CSV de predios (en `backend/data/predios.csv`)

### Monitoreo Continuo

```bash
# Configurar PM2 para inicio automático al reiniciar VPS
pm2 startup
pm2 save

# Ver procesos guardados
pm2 list
```

### Logs Persistentes

Los logs se guardan en:
- **Backend:** `/root/portal-meraki-deploy/backend/logs/`
- **PM2:** `/root/.pm2/logs/`
- **Nginx:** `/var/log/nginx/`

---

## 🎯 Checklist Final

Después de actualizar, verificar:

- [ ] `pm2 status` muestra backend **online**
- [ ] `sudo systemctl status nginx` muestra **active (running)**
- [ ] Portal carga en https://portalmeraki.info
- [ ] Login funciona correctamente
- [ ] Búsqueda por código de predio funciona
- [ ] Búsqueda por MAC funciona (`e4:55:a8:55:f2:6d`)
- [ ] Búsqueda por Serial funciona (`Q2XX-XXXX-XXXX`)
- [ ] Topología carga correctamente
- [ ] Switches muestran datos
- [ ] Access Points muestran datos
- [ ] Appliance muestra datos
- [ ] Logs no muestran errores críticos

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs:** `pm2 logs portal-meraki-backend --lines 100`
2. **Verificar GitHub:** Commits recientes en https://github.com/GriffithFan/portal_web_deploy
3. **Rollback:** Si es crítico, usar el procedimiento de rollback

---

**Última actualización:** 26 de Noviembre de 2025  
**Commit:** `97d9bab - fix: Prioridad MAC sobre Serial en deteccion`
