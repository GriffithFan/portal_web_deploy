# 🚀 Comandos para Subir a GitHub y Actualizar Hostinger

## 📋 Pre-requisitos

Asegúrate de estar en el directorio correcto:
```bash
cd c:\portal-meraki-deploy
```

---

## 1️⃣ Verificación Pre-Commit (Opcional pero Recomendado)

### En Windows (Git Bash):
```bash
bash pre-deploy-check.sh
```

Este script verifica:
- ✅ Que `.env` NO esté versionado
- ✅ Que `node_modules` NO esté versionado  
- ✅ Que scripts tengan permisos correctos
- ✅ Que no haya API keys hardcoded
- ✅ Que `.gitignore` esté correcto

---

## 2️⃣ Subir Cambios a GitHub

### Verificar estado actual:
```bash
git status
```

### Agregar todos los cambios:
```bash
git add .
```

### Crear commit:
```bash
git commit -m "Mejoras en topología y velocidades ethernet

- Fix: Velocidades ethernet correctas para APs (incluso offline)
- Mejora: Espaciado dinámico basado en cantidad de APs
- Mejora: Etiquetas posicionadas arriba de dispositivos
- Docs: README, DEPLOY.md, CHANGELOG.md actualizados
- Scripts: update.sh mejorado, config-env.sh agregado
- Validado: Predios 613074 (10 APs), 603005 (17 APs), 602360 (4 switches)"
```

### Subir a GitHub:
```bash
git push origin main
```

---

## 3️⃣ Actualizar en Hostinger (Ubuntu VPS)

### Conectarse al VPS:
```bash
ssh root@72.61.32.146
```

### Navegar al proyecto:
```bash
cd /root/portal-meraki-deploy
```

### Ejecutar actualización automática:
```bash
./update.sh
```

**¿Qué hace el script?**
1. ⬇️ Descarga cambios de GitHub (`git pull`)
2. 📦 Verifica/copia `.env.production` → `.env` (si no existe)
3. 📦 Actualiza dependencias del backend
4. 🔄 Reinicia backend con PM2
5. 🎨 Reconstruye frontend optimizado
6. ♻️ Recarga Nginx

### Verificar que todo funcione:
```bash
# Ver estado de PM2
pm2 status

# Ver logs del backend
pm2 logs portal-meraki-backend --lines 50

# Ver estado de Nginx
systemctl status nginx
```

---

## 4️⃣ Comandos Útiles Post-Deploy

### Si necesitas actualizar variables de entorno:
```bash
# Opción 1: Script interactivo (SIN nano)
./config-env.sh

# Opción 2: Manual con sed
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=nueva_key|' backend/.env
pm2 restart portal-meraki-backend
```

### Ver logs en tiempo real:
```bash
pm2 logs portal-meraki-backend
```

### Verificar la aplicación:
```bash
# Frontend
curl -I https://portalmeraki.info

# API Health Check
curl https://portalmeraki.info/api/health
```

---

## 🐛 Troubleshooting Rápido

### Backend no responde:
```bash
pm2 restart portal-meraki-backend
pm2 logs portal-meraki-backend --err
```

### Frontend no se actualiza:
```bash
cd /root/portal-meraki-deploy/frontend
rm -rf dist
npm run build
systemctl reload nginx
```

### Verificar que .env existe:
```bash
cat /root/portal-meraki-deploy/backend/.env
# Si no existe:
cp /root/portal-meraki-deploy/backend/.env.production /root/portal-meraki-deploy/backend/.env
pm2 restart portal-meraki-backend
```

### Resetear completamente desde GitHub:
```bash
cd /root/portal-meraki-deploy
git fetch origin
git reset --hard origin/main
./update.sh
```

---

## ✅ Checklist Final

- [ ] Pre-commit check pasó sin errores
- [ ] Git commit creado exitosamente
- [ ] Push a GitHub completado
- [ ] SSH a Hostinger exitoso
- [ ] `./update.sh` ejecutado sin errores
- [ ] `pm2 status` muestra backend online
- [ ] Frontend accesible en https://portalmeraki.info
- [ ] API responde en https://portalmeraki.info/api/health

---

## 📞 Comandos de Referencia Rápida

```bash
# En Windows (Git Bash) - Subir a GitHub
cd c:\portal-meraki-deploy
git add .
git commit -m "Tu mensaje"
git push origin main

# En Ubuntu VPS - Actualizar producción
ssh root@72.61.32.146
cd /root/portal-meraki-deploy
./update.sh

# Verificar estado
pm2 status
pm2 logs portal-meraki-backend
```

---

**Documentación completa**: Ver `DEPLOY.md` para troubleshooting detallado
