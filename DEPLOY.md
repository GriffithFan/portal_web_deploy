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
cat /root/portal-meraki-deploy/backend/.env.production
```

---

## 🔑 Cambiar ADMIN_KEY (Clave de Administrador)

### Opción 1: Con `sed` (Recomendado - Sin Editor)

```bash
# 1. Conectarse al VPS
ssh root@72.61.32.146

# 2. Cambiar la clave (reemplaza con tu nueva clave)
sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=tu_nueva_clave_admin_super_segura_32caracteres|' /root/portal-meraki-deploy/backend/.env.production

# 3. Verificar que el cambio se guardó
grep "^ADMIN_KEY=" /root/portal-meraki-deploy/backend/.env.production

# 4. Reiniciar el backend
pm2 restart portal-meraki-backend

# 5. Verificar que el servicio está corriendo
pm2 status
```

**Recomendaciones para la nueva clave:**
- Mínimo 32 caracteres
- Mezclar mayúsculas, minúsculas, números y símbolos
- Ejemplo seguro: `e58a89f9f23220f83b37330fa7a4794415633275dd94effc947bb3d128d86aa6`

**Ejemplo REAL de ejecución:**

```bash
ssh root@72.61.32.146

# Cambiar ADMIN_KEY con un ejemplo real
sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=Pr0t4lM3r4k1_S3cur0_2025_x9k7mN2pQ4wZ1vB5c|' /root/portal-meraki-deploy/backend/.env.production

# Ver que se guardó
grep "^ADMIN_KEY=" /root/portal-meraki-deploy/backend/.env.production
# Output: ADMIN_KEY=Pr0t4lM3r4k1_S3cur0_2025_x9k7mN2pQ4wZ1vB5c

# Reiniciar
pm2 restart portal-meraki-backend

# Verificar estado
pm2 status
# El backend debe mostrar "online"
```

---

## 🔑 Cambiar MERAKI_API_KEY

### Opción 1: Con `sed` (Recomendado - Sin Editor)

```bash
# 1. Conectarse al VPS
ssh root@72.61.32.146

# 2. Obtener tu nueva API Key de Meraki
#    https://dashboard.meraki.com/api_access
#    (Copiar la clave completa)

# 3. Cambiar la clave en el servidor
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=tu_nueva_api_key_de_meraki_aqui|' /root/portal-meraki-deploy/backend/.env.production

# 4. Verificar que se guardó correctamente
grep "^MERAKI_API_KEY=" /root/portal-meraki-deploy/backend/.env.production

# 5. Reiniciar el backend
pm2 restart portal-meraki-backend

# 6. Verificar que el servicio está corriendo
pm2 status
```

---

## 📝 Métodos Alternativos (Sin Nano)

### Opción 2: Con `echo` y Redirección (Una sola línea)

#### Para ADMIN_KEY:
```bash
ssh root@72.61.32.146 "sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=nuevaclave123|' /root/portal-meraki-deploy/backend/.env.production && pm2 restart portal-meraki-backend"
```

**Ejemplo REAL:**
```bash
ssh root@72.61.32.146 "sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=MyS3cur3Adm1nK3y_2025_9Xz2Qw5Ez8|' /root/portal-meraki-deploy/backend/.env.production && pm2 restart portal-meraki-backend"
```

#### Para MERAKI_API_KEY:
```bash
ssh root@72.61.32.146 "sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=tu_meraki_key|' /root/portal-meraki-deploy/backend/.env.production && pm2 restart portal-meraki-backend"
```

**Ejemplo REAL:**
```bash
ssh root@72.61.32.146 "sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=12ab34cd56ef78gh90ij12kl34mn56op78qr90st|' /root/portal-meraki-deploy/backend/.env.production && pm2 restart portal-meraki-backend"
```

### Opción 3: Con `awk` (Si necesitas ser más preciso)

#### Para ADMIN_KEY:
```bash
awk -F= '/^ADMIN_KEY=/ {print $1"=tu_nueva_clave"; next} 1' /root/portal-meraki-deploy/backend/.env.production > /tmp/env.tmp && mv /tmp/env.tmp /root/portal-meraki-deploy/backend/.env.production
```

**Ejemplo REAL:**
```bash
awk -F= '/^ADMIN_KEY=/ {print $1"=AwesomeAdmin2025_Secure_xK7pR3mV9Ld"; next} 1' /root/portal-meraki-deploy/backend/.env.production > /tmp/env.tmp && mv /tmp/env.tmp /root/portal-meraki-deploy/backend/.env.production
pm2 restart portal-meraki-backend
```

#### Para MERAKI_API_KEY:
### Opción 4: Con `perl` (Si `sed` tiene problemas)

#### Para ADMIN_KEY:
```bash
perl -i -pe 's/^ADMIN_KEY=.*/ADMIN_KEY=tu_nueva_clave/' /root/portal-meraki-deploy/backend/.env.production
```

**Ejemplo REAL:**
```bash
perl -i -pe 's/^ADMIN_KEY=.*/ADMIN_KEY=P3rl_Upd@t3d_K3y_2025_qWe9RtYu3/' /root/portal-meraki-deploy/backend/.env.production
pm2 restart portal-meraki-backend
```

#### Para MERAKI_API_KEY:
```bash
perl -i -pe 's/^MERAKI_API_KEY=.*/MERAKI_API_KEY=tu_nueva_api_key/' /root/portal-meraki-deploy/backend/.env.production
```

**Ejemplo REAL:**
```bash
perl -i -pe 's/^MERAKI_API_KEY=.*/MERAKI_API_KEY=xyzabc123def456ghi789jkl012mno345/' /root/portal-meraki-deploy/backend/.env.production
pm2 restart portal-meraki-backend
```

### Opción 4: Con `perl` (Si `sed` tiene problemas)

#### Para ADMIN_KEY:
```bash
perl -i -pe 's/^ADMIN_KEY=.*/ADMIN_KEY=tu_nueva_clave/' /root/portal-meraki-deploy/backend/.env.production
```

#### Para MERAKI_API_KEY:
```bash
perl -i -pe 's/^MERAKI_API_KEY=.*/MERAKI_API_KEY=tu_nueva_api_key/' /root/portal-meraki-deploy/backend/.env.production
```

---

### Opción 5: Con `cat` y Heredoc (Reemplazar archivo completo)

```bash
# Respaldar antes
cp /root/portal-meraki-deploy/backend/.env.production /root/portal-meraki-deploy/backend/.env.production.backup

# Ver el contenido actual
cat /root/portal-meraki-deploy/backend/.env.production

# Crear nuevo archivo con los valores actualizados
cat > /root/portal-meraki-deploy/backend/.env.production << 'EOF'
# backend/.env (limpio — completar antes de producción)

# Entorno
NODE_ENV=production

# Puerto y host
PUERTO=3000
HOST=127.0.0.1

# CORS: dominio(s) permitidos (coma-separados)
CORS_ORIGINS=https://portalmeraki.info,http://localhost:5173

# Clave administrativa (RELLENA: cadena larga y aleatoria)
ADMIN_KEY=tu_nueva_clave_admin_aqui

# Meraki API
MERAKI_API_KEY=tu_nueva_api_key_aqui
MERAKI_ORG_ID=

# TTL cache LLDP en ms
LLDP_CACHE_TTL_MS=600000

# Opcionales
ENABLE_WARM_CACHE=true
WARM_CACHE_SIZE=20

# Performance (opcional)
UV_THREADPOOL_SIZE=16

# Número de proxies confiables (Cloudflare = 1, múltiples proxies = ajustar)
TRUST_PROXY_HOPS=1
EOF

# Reiniciar
pm2 restart portal-meraki-backend
```

---

## ✅ Verificar que los cambios funcionan

### Verificar ADMIN_KEY

```bash
# Desde tu computadora local (no en SSH):
curl -X POST http://72.61.32.146/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"key":"tu_nueva_clave_admin_aqui"}'

# Respuesta esperada si funciona:
# {"success":true}
```

### Verificar MERAKI_API_KEY

```bash
# Desde tu computadora local:
curl http://72.61.32.146/api/organizations \
  -H "x-admin-key: tu_nueva_clave_admin_aqui"

# Si devuelve datos de organizaciones Meraki, el cambio funciona
# Si devuelve error, la API key es inválida
```

---

## 🔄 Script Automatizado (Recomendado)

Crear un script local para cambiar claves fácilmente:

**Crear archivo `change_keys.sh` en tu computadora:**

```bash
#!/bin/bash

# Script para cambiar ADMIN_KEY y MERAKI_API_KEY remotamente

VPS_HOST="root@72.61.32.146"
PROJECT_PATH="/root/portal-meraki-deploy"

echo "=== Cambiar Claves en el VPS ==="
echo ""

# Leer entrada del usuario
read -sp "Nueva ADMIN_KEY (Enter si no cambiar): " NEW_ADMIN_KEY
echo ""
read -sp "Nueva MERAKI_API_KEY (Enter si no cambiar): " NEW_MERAKI_KEY
echo ""

# Hacer backup remoto
echo "📦 Haciendo backup..."
ssh $VPS_HOST "cp $PROJECT_PATH/backend/.env.production $PROJECT_PATH/backend/.env.production.backup.\$(date +%s)"

# Actualizar ADMIN_KEY si se proporcionó
if [ ! -z "$NEW_ADMIN_KEY" ]; then
  echo "🔄 Actualizando ADMIN_KEY..."
  ssh $VPS_HOST "sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=$NEW_ADMIN_KEY|' $PROJECT_PATH/backend/.env.production"
  echo "✅ ADMIN_KEY actualizada"
fi

# Actualizar MERAKI_API_KEY si se proporcionó
if [ ! -z "$NEW_MERAKI_KEY" ]; then
  echo "🔄 Actualizando MERAKI_API_KEY..."
  ssh $VPS_HOST "sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=$NEW_MERAKI_KEY|' $PROJECT_PATH/backend/.env.production"
  echo "✅ MERAKI_API_KEY actualizada"
fi

# Reiniciar si algo cambió
if [ ! -z "$NEW_ADMIN_KEY" ] || [ ! -z "$NEW_MERAKI_KEY" ]; then
  echo "♻️ Reiniciando backend..."
  ssh $VPS_HOST "pm2 restart portal-meraki-backend"
  echo "✅ Backend reiniciado"
  echo ""
  echo "🎉 ¡Cambios aplicados correctamente!"
else
  echo "⚠️ No se hizo ningún cambio"
fi
```

**Usar el script:**

```bash
# Hacer ejecutable
chmod +x change_keys.sh

# Ejecutar
./change_keys.sh

# Te pedirá que ingreses las nuevas claves (ocultas)
```

---

## 🚨 Rollback (Si algo sale mal)

```bash
# Ver backups disponibles
ls -lh /root/portal-meraki-deploy/backend/.env.production.backup.*

# Restaurar desde un backup (reemplaza TIMESTAMP)
cp /root/portal-meraki-deploy/backend/.env.production.backup.TIMESTAMP /root/portal-meraki-deploy/backend/.env.production

# Reiniciar
pm2 restart portal-meraki-backend

# Verificar
pm2 status
```

---

### Actualizar Otras Variables

```bash
# Actualizar CORS_ORIGINS
sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://portalmeraki.info,http://72.61.32.146|' /root/portal-meraki-deploy/backend/.env.production

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
