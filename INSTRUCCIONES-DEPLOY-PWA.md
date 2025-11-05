# 🚀 Instrucciones de Deploy - PWA + Eliminación Dark Mode

## 📋 Resumen de Cambios

**Commit**: `770ad2f`

### ✅ Implementado:
- PWA completa con Service Worker auto-generado
- Cache conservador (solo UI, API siempre fresca)
- Manifest.json con íconos SVG
- Meta tags PWA en index.html

### ❌ Eliminado:
- Modo oscuro completo (ThemeToggle, ThemeContext, theme.css)
- Estilos dark mode en componentes UI

---

## 🔧 Método 1: Deploy Estándar (Recomendado)

### Conectar al VPS:
```bash
ssh root@72.61.32.146
```

### Actualizar código:
```bash
cd ~/portal-meraki-deploy
git pull origin main
```

### Instalar dependencias y hacer build:
```bash
cd frontend
npm install
npm run build
```

### Recargar Nginx:
```bash
systemctl reload nginx
```

### Verificar Service Worker:
- Abrir `https://portalmeraki.info`
- F12 → Application → Service Workers
- Debe aparecer `sw.js` activado

---

## 🔐 Método 2: Con Permisos de Sudo (Si hay problemas de escritura)

Si `npm install` o `npm run build` dan error de permisos:

```bash
cd ~/portal-meraki-deploy
git pull origin main
cd frontend

# Instalar con sudo
sudo npm install

# Build con sudo
sudo npm run build

# Cambiar propietario de dist a nginx
sudo chown -R www-data:www-data dist/

# Recargar nginx
sudo systemctl reload nginx
```

---

## ⚠️ Método 3: Si Git Rechaza el Pull (conflictos locales)

Si `git pull` falla con mensajes de conflictos:

```bash
cd ~/portal-meraki-deploy

# Opción A: Resetear cambios locales (CUIDADO: borra modificaciones no commiteadas)
git fetch origin
git reset --hard origin/main

# Opción B: Stash cambios locales y aplicar después
git stash
git pull origin main
git stash pop

cd frontend
npm install
npm run build
systemctl reload nginx
```

---

## 🚨 Método 4: Deploy Limpio (Si nada funciona)

Reinstalación completa de frontend:

```bash
cd ~/portal-meraki-deploy
git pull origin main

cd frontend

# Eliminar node_modules y lockfile
rm -rf node_modules package-lock.json dist/

# Reinstalar desde cero
npm install

# Build limpio
npm run build

# Verificar que sw.js se generó
ls -la dist/ | grep sw.js

# Recargar nginx
systemctl reload nginx
```

---

## 📦 Archivos que Deben Generarse en `dist/`

Después de `npm run build`, verifica que existan:

```bash
cd ~/portal-meraki-deploy/frontend
ls -la dist/

# Deben existir:
# - sw.js (Service Worker)
# - registerSW.js (Script de registro)
# - workbox-*.js (Runtime de workbox)
# - manifest.webmanifest (Metadata PWA)
# - icon-192.svg
# - icon-512.svg
# - index.html (con meta tags PWA)
```

---

## 🔍 Verificación Post-Deploy

### 1. Service Worker Registrado:
```bash
# Abrir en navegador
https://portalmeraki.info

# DevTools (F12) → Application
# - Service Workers: debe aparecer sw.js activado
# - Manifest: debe mostrar "Portal Meraki"
# - Cache Storage: debe aparecer "static-resources"
```

### 2. Backend Funcionando:
```bash
# En el VPS
pm2 status
pm2 logs portal-meraki-backend --lines 20
```

### 3. Nginx OK:
```bash
systemctl status nginx
nginx -t
```

### 4. Logs de Error (si algo falla):
```bash
# Logs de Nginx
tail -f /var/log/nginx/error.log

# Logs de PM2
pm2 logs portal-meraki-backend --err

# Logs del sistema
journalctl -xe
```

---

## 🧪 Pruebas de Funcionalidad

Después del deploy, probar:

1. ✅ **Login** funciona
2. ✅ **Búsqueda de predios** funciona
3. ✅ **Topología** se muestra correctamente
4. ✅ **Access Points** cargan con velocidades
5. ✅ **Exportar JPG/PDF** funciona
6. ✅ **Ya NO aparece botón de modo oscuro**
7. ✅ **PWA instalable** (ícono + en barra de URL)

---

## 📱 Probar Instalación PWA

### Android (Chrome/Edge):
1. Abrir `https://portalmeraki.info`
2. Menú ⋮ → "Instalar app"
3. Confirmar instalación
4. Verificar que se abre en ventana independiente

### iOS (Safari 16.4+):
1. Abrir en Safari
2. Botón Compartir
3. "Añadir a pantalla de inicio"
4. Confirmar

### Desktop (Chrome/Edge):
1. Abrir `https://portalmeraki.info`
2. Clic en ícono ⊕ en barra de URL
3. "Instalar Portal Meraki"
4. Se abre en ventana sin barras del navegador

---

## 🐛 Troubleshooting

### Problema: "Cannot GET /"
**Causa**: Nginx no encuentra archivos de frontend

**Solución**:
```bash
cd ~/portal-meraki-deploy/frontend
npm run build
ls -la dist/index.html  # Verificar que existe
systemctl reload nginx
```

### Problema: Service Worker no se registra
**Causa**: HTTPS no configurado o sw.js no generado

**Solución**:
```bash
# Verificar HTTPS
curl -I https://portalmeraki.info | grep -i "HTTP/2"

# Regenerar Service Worker
cd ~/portal-meraki-deploy/frontend
rm -rf dist/
npm run build
ls -la dist/sw.js  # Verificar
```

### Problema: Backend no responde
**Causa**: PM2 no está corriendo o puerto 3000 ocupado

**Solución**:
```bash
pm2 restart portal-meraki-backend
pm2 logs portal-meraki-backend --lines 50
netstat -tlnp | grep 3000
```

### Problema: Permisos denegados en npm
**Causa**: Archivos propiedad de root

**Solución**:
```bash
cd ~/portal-meraki-deploy/frontend
sudo chown -R $USER:$USER node_modules dist package-lock.json
npm install
npm run build
```

### Problema: Git pull rechazado
**Causa**: Modificaciones locales no commiteadas

**Solución**:
```bash
git status
git stash  # Guardar cambios temporalmente
git pull origin main
git stash pop  # Restaurar cambios (opcional)
```

---

## 📊 Logs Útiles

```bash
# Ver status de todos los servicios
pm2 status
systemctl status nginx

# Logs en tiempo real
pm2 logs portal-meraki-backend --lines 100
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Verificar procesos
ps aux | grep node
ps aux | grep nginx
netstat -tlnp | grep -E "3000|80|443"
```

---

## ✅ Checklist de Deploy

- [ ] Conectado al VPS vía SSH
- [ ] `git pull origin main` exitoso
- [ ] `npm install` exitoso (sin errores de permisos)
- [ ] `npm run build` exitoso
- [ ] `dist/sw.js` generado correctamente
- [ ] `systemctl reload nginx` ejecutado
- [ ] `pm2 status` muestra backend online
- [ ] `https://portalmeraki.info` carga correctamente
- [ ] Login funciona
- [ ] Service Worker registrado (DevTools)
- [ ] NO aparece botón de modo oscuro
- [ ] PWA instalable (ícono + en barra URL)

---

## 🎉 Deploy Completado

Si todos los checks pasan:
- ✅ PWA instalada y funcionando
- ✅ Modo oscuro eliminado
- ✅ Cache conservador activo (UI rápida, datos frescos)
- ✅ Service Worker auto-actualizable

**Next Steps**:
- Reemplazar íconos SVG placeholder con logo oficial
- Agregar screenshots a manifest.json
- Probar instalación en dispositivos reales
