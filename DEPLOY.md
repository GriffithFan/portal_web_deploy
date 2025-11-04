# 🚀 Portal Meraki - Guía de Despliegue y Actualización

## 📋 Contenido

1. [Despliegue Inicial](#despliegue-inicial)
2. [Actualización](#actualización)
3. [Configuración de Variables](#configuración-de-variables)
4. [Comandos Útiles](#comandos-útiles)
5. [Troubleshooting](#troubleshooting)

---

## 🆕 Despliegue Inicial

### Prerequisitos en VPS Ubuntu

```bash
# Conectarse al VPS
ssh root@72.61.32.146

# Actualizar sistema
apt update && apt upgrade -y
```

### 1. Clonar el Repositorio

```bash
cd /root
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy
cd portal-meraki-deploy
```

### 2. Dar Permisos de Ejecución a Scripts

```bash
chmod +x *.sh
chmod +x backend/*.sh
```

### 3. Ejecutar Deploy Inicial

```bash
./deploy-ubuntu.sh
```

Este script automáticamente:
- ✅ Instala Node.js 20
- ✅ Instala PM2
- ✅ Instala Nginx
- ✅ Configura el backend con `.env.production`
- ✅ Construye el frontend
- ✅ Configura Nginx
- ✅ Inicia el servicio con PM2

### 4. Configurar SSL (Después del Deploy)

```bash
certbot --nginx -d portalmeraki.info -d www.portalmeraki.info
```

---

## 🔄 Actualización

### Método Simple (Recomendado)

```bash
cd /root/portal-meraki-deploy
./update.sh
```

Este script automáticamente:
1. ⬇️ Descarga cambios de GitHub (`git pull`)
2. 📦 Actualiza dependencias del backend
3. 🔄 Reinicia backend con PM2
4. 🎨 Reconstruye frontend
5. ♻️ Recarga Nginx

### Actualización Manual Paso a Paso

```bash
# 1. Ir al directorio del proyecto
cd /root/portal-meraki-deploy

# 2. Descargar cambios
git pull origin main

# 3. Actualizar backend
cd backend
npm install --production
pm2 restart portal-meraki-backend

# 4. Actualizar frontend
cd ../frontend
npm install
npm run build

# 5. Recargar Nginx
sudo systemctl reload nginx
```

---

## ⚙️ Configuración de Variables

### Ver Configuración Actual

```bash
cat /root/portal-meraki-deploy/backend/.env
```

### Actualizar Variables (SIN EDITOR)

```bash
cd /root/portal-meraki-deploy
./config-env.sh
```

Este script interactivo permite:
- Actualizar `MERAKI_API_KEY`
- Actualizar `ADMIN_KEY`
- Actualizar `CORS_ORIGINS`
- Ver configuración actual
- Resetear a valores por defecto

### Actualizar Variables Manualmente (con sed)

```bash
# Actualizar API Key
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=TU_NUEVA_KEY|' /root/portal-meraki-deploy/backend/.env

# Actualizar Admin Key
sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=TU_NUEVO_ADMIN_KEY|' /root/portal-meraki-deploy/backend/.env

# Actualizar CORS
sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://portalmeraki.info,http://72.61.32.146|' /root/portal-meraki-deploy/backend/.env

# Aplicar cambios
pm2 restart portal-meraki-backend
```

---

## 🛠️ Comandos Útiles

### PM2 (Gestión del Backend)

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs portal-meraki-backend

# Ver logs con más detalle
pm2 logs portal-meraki-backend --lines 100

# Ver información detallada
pm2 describe portal-meraki-backend

# Reiniciar
pm2 restart portal-meraki-backend

# Detener
pm2 stop portal-meraki-backend

# Iniciar
pm2 start portal-meraki-backend

# Ver uso de CPU/RAM
pm2 monit
```

### Nginx (Servidor Web)

```bash
# Ver estado
systemctl status nginx

# Recargar configuración (sin downtime)
systemctl reload nginx

# Reiniciar
systemctl restart nginx

# Verificar configuración
nginx -t

# Ver logs de acceso
tail -f /var/log/nginx/access.log

# Ver logs de error
tail -f /var/log/nginx/error.log
```

### Git (Control de Versiones)

```bash
# Ver estado actual
git status

# Ver último commit
git log -1

# Ver diferencias con GitHub
git fetch origin
git diff main origin/main

# Descartar cambios locales y sincronizar
git fetch origin
git reset --hard origin/main

# Ver historial de commits
git log --oneline -10
```

### Node.js & NPM

```bash
# Ver versión de Node
node --version

# Ver versión de NPM
npm --version

# Limpiar caché de NPM
npm cache clean --force

# Ver paquetes instalados (backend)
cd /root/portal-meraki-deploy/backend
npm list --depth=0
```

---

## 🐛 Troubleshooting

### Backend no inicia

```bash
# Ver logs de PM2
pm2 logs portal-meraki-backend --err

# Ver si el puerto 3000 está ocupado
netstat -tlnp | grep 3000

# Reiniciar completamente
pm2 delete portal-meraki-backend
cd /root/portal-meraki-deploy/backend
pm2 start ecosystem.config.js --env production
pm2 save
```

### Frontend no se actualiza

```bash
# Limpiar caché de build
cd /root/portal-meraki-deploy/frontend
rm -rf dist node_modules/.vite
npm install
npm run build

# Verificar que Nginx apunte al directorio correcto
ls -la /root/portal-meraki-deploy/frontend/dist
```

### Error de permisos

```bash
# Dar permisos al proyecto
chown -R www-data:www-data /root/portal-meraki-deploy

# Dar permisos a logs
mkdir -p /root/portal-meraki-deploy/backend/logs
chown -R www-data:www-data /root/portal-meraki-deploy/backend/logs
```

### Nginx da error 502 Bad Gateway

```bash
# Verificar que backend esté corriendo
pm2 status

# Verificar que escuche en puerto 3000
netstat -tlnp | grep 3000

# Ver logs de Nginx
tail -f /var/log/nginx/error.log

# Reiniciar ambos servicios
pm2 restart portal-meraki-backend
systemctl restart nginx
```

### Variables de entorno no se aplican

```bash
# Verificar que .env existe
ls -la /root/portal-meraki-deploy/backend/.env

# Ver contenido
cat /root/portal-meraki-deploy/backend/.env

# Copiar desde production si no existe
cp /root/portal-meraki-deploy/backend/.env.production /root/portal-meraki-deploy/backend/.env

# Reiniciar backend
pm2 restart portal-meraki-backend
```

### Frontend muestra pantalla en blanco

```bash
# Ver errores en consola del navegador (F12)
# Verificar que los archivos estén construidos
ls -la /root/portal-meraki-deploy/frontend/dist

# Reconstruir completamente
cd /root/portal-meraki-deploy/frontend
rm -rf dist
npm run build

# Recargar Nginx
systemctl reload nginx
```

### API no responde / Timeout

```bash
# Ver logs del backend
pm2 logs portal-meraki-backend

# Verificar conectividad a Meraki API
curl -H "X-Cisco-Meraki-API-Key: TU_API_KEY" https://api.meraki.com/api/v1/organizations

# Aumentar timeout de Nginx (si necesario)
# Editar /etc/nginx/sites-available/portal-meraki
# Agregar: proxy_read_timeout 30s;
```

---

## 📊 Monitoreo

### Ver uso de recursos

```bash
# CPU y RAM
htop

# Procesos de Node
ps aux | grep node

# Espacio en disco
df -h

# Uso de RAM por PM2
pm2 monit
```

### Ver estadísticas de acceso

```bash
# Últimas 20 peticiones
tail -20 /var/log/nginx/access.log

# Peticiones en tiempo real
tail -f /var/log/nginx/access.log

# Contar peticiones por IP
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10
```

---

## 🔐 Seguridad

### Verificar certificado SSL

```bash
# Ver estado del certificado
certbot certificates

# Renovar manualmente
certbot renew

# La renovación automática está configurada en cron
```

### Verificar firewall

```bash
# Ver reglas activas
ufw status

# Si UFW está habilitado, asegúrate de permitir:
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
```

---

## 📞 Soporte

- **Repositorio**: https://github.com/GriffithFan/portal_web_deploy
- **Documentación**: Ver `README.md` y `PROGRESO.md`
- **Logs Backend**: `pm2 logs portal-meraki-backend`
- **Logs Nginx**: `/var/log/nginx/error.log`

---

**Última actualización**: Noviembre 2025
