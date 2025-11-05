# Setup Ubuntu desde Cero - Portal Meraki
**Última actualización:** 4 de noviembre de 2025

## Pre-requisitos
- Ubuntu 22.04/24.04 limpio
- Acceso root SSH
- Dominio apuntando al servidor (portalmeraki.info → IP del servidor)
- GitHub repo actualizado: https://github.com/GriffithFan/portal_web_deploy

---

## 1. PREPARAR SISTEMA UBUNTU

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar versiones
node --version  # debe mostrar v20.x
npm --version   # debe mostrar 10.x

# Instalar herramientas esenciales
apt install -y git nginx curl unzip certbot python3-certbot-nginx

# Configurar firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

---

## 2. CLONAR REPOSITORIO Y CONFIGURAR

```bash
# Ir a directorio root
cd /root

# Clonar repositorio
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy
cd portal-meraki-deploy

# Verificar última versión
git log --oneline -5
git status
```

### Crear archivo .env (SIN USAR NANO)

```bash
# Backend .env
cat > /root/portal-meraki-deploy/backend/.env << 'EOF'
MERAKI_API_KEY=tu_api_key_real_aqui
SESSION_SECRET=secreto_largo_aleatorio_minimo_32_caracteres_seguros
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://portalmeraki.info
ALLOWED_ORIGINS=https://portalmeraki.info,https://www.portalmeraki.info
EOF

# Verificar contenido
cat /root/portal-meraki-deploy/backend/.env

# Ajustar permisos (importante para seguridad)
chmod 600 /root/portal-meraki-deploy/backend/.env
```

**IMPORTANTE:** Reemplaza `tu_api_key_real_aqui` con tu API key real de Meraki Dashboard.

---

## 3. INSTALAR DEPENDENCIAS Y CONSTRUIR

```bash
# Backend
cd /root/portal-meraki-deploy/backend
npm install --production

# Verificar que instaló correctamente
ls -la node_modules/ | wc -l  # debe mostrar ~300+ paquetes

# Frontend
cd /root/portal-meraki-deploy/frontend
npm install

# Construir frontend (CRÍTICO - genera /dist)
npm run build

# Verificar que se creó dist/
ls -la dist/
ls -la dist/assets/  # debe tener .js y .css

# Ajustar permisos para Nginx
chmod -R a+rX /root/portal-meraki-deploy/frontend/dist
```

---

## 4. CONFIGURAR NGINX

```bash
# Copiar configuración desde el repo
cp /root/portal-meraki-deploy/nginx-portal-meraki.conf /etc/nginx/sites-available/portal-meraki

# Crear symlink
ln -sf /etc/nginx/sites-available/portal-meraki /etc/nginx/sites-enabled/portal-meraki

# Eliminar config default (evita conflictos)
rm -f /etc/nginx/sites-enabled/default

# Probar configuración
nginx -t

# Recargar Nginx
systemctl reload nginx

# Verificar que arrancó correctamente
systemctl status nginx
```

### Obtener certificado SSL (Let's Encrypt)

```bash
# Obtener certificado para el dominio
certbot --nginx -d portalmeraki.info -d www.portalmeraki.info --non-interactive --agree-tos --email tu_email@ejemplo.com

# Verificar renovación automática
certbot renew --dry-run

# Ver configuración actualizada (debe tener SSL)
grep -A 5 "listen 443" /etc/nginx/sites-enabled/portal-meraki
```

**NOTA:** Certbot modifica automáticamente la configuración de Nginx para agregar SSL.

---

## 5. CONFIGURAR PM2 (PROCESS MANAGER)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalación
pm2 --version

# Iniciar backend con ecosystem config
cd /root/portal-meraki-deploy/backend
pm2 start ecosystem.config.js

# Verificar estado
pm2 status
pm2 logs --lines 30

# Configurar PM2 para arranque automático
pm2 startup systemd
# Copiar y ejecutar el comando que PM2 muestra

pm2 save

# Verificar que se guardó
systemctl status pm2-root
```

---

## 6. VALIDACIÓN COMPLETA

```bash
# 1. Verificar backend
pm2 status  # debe mostrar "online"
curl http://127.0.0.1:3000/api/health  # debe retornar JSON con status OK

# 2. Verificar frontend vía Nginx
curl -I https://portalmeraki.info/  # debe retornar 200 OK
curl -I https://portalmeraki.info/api/health  # debe retornar 200 OK

# 3. Verificar logs del backend
pm2 logs portal-meraki-backend --lines 50

# 4. Verificar logs de Nginx
tail -50 /var/log/nginx/portal-meraki-access.log
tail -50 /var/log/nginx/portal-meraki-error.log
```

### Pruebas desde navegador

1. Abre https://portalmeraki.info
2. Deberías ver la página de login (no error 500)
3. Ingresa con tus credenciales
4. Selecciona un predio (ej: 613074)
5. Ve a la sección "Puntos de acceso"
6. **Verifica que se muestren las velocidades:** 100 Mbps o 1000 Mbps
7. Ve a la topología y verifica el espaciado mejorado

---

## 7. VERIFICACIÓN DE CÓDIGO ACTUALIZADO

```bash
# Backend: verificar que función de ethernet speeds existe
grep -n "getOrgWirelessDevicesEthernetStatuses" /root/portal-meraki-deploy/backend/src/merakiApi.js
# Debe mostrar línea ~640

grep -n "wirelessEthernetStatuses" /root/portal-meraki-deploy/backend/src/servidor.js
# Debe mostrar líneas 1289-1350

# Frontend: verificar topología mejorada
grep -n "apCount" /root/portal-meraki-deploy/frontend/src/components/SimpleGraph.jsx
# Debe mostrar múltiples líneas (330-700)
```

---

## SOLUCIÓN DE PROBLEMAS

### Error: "vite: Permission denied" al construir frontend

```bash
# Verificar que npm está en el PATH
which npm
which node

# Limpiar cache y reinstalar
cd /root/portal-meraki-deploy/frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

### Error 500 en frontend

```bash
# Verificar que dist existe
ls -la /root/portal-meraki-deploy/frontend/dist/

# Verificar permisos
chmod -R a+rX /root/portal-meraki-deploy/frontend/dist

# Verificar configuración Nginx
grep "root" /etc/nginx/sites-enabled/portal-meraki
# Debe mostrar: root /root/portal-meraki-deploy/frontend/dist;

# Verificar logs
tail -50 /var/log/nginx/error.log
```

### Backend no arranca

```bash
# Verificar .env existe
cat /root/portal-meraki-deploy/backend/.env

# Verificar que MERAKI_API_KEY está configurada
grep MERAKI_API_KEY /root/portal-meraki-deploy/backend/.env

# Verificar puerto 3000 no está ocupado
netstat -tulpn | grep 3000

# Ver logs detallados
pm2 logs portal-meraki-backend --lines 100
```

### Velocidades ethernet no aparecen

```bash
# Verificar que el código está actualizado
cd /root/portal-meraki-deploy/backend
git log --oneline -1  # debe ser commit reciente (1b2890f o posterior)

# Verificar que la función está presente
grep -A 30 "case 'access_points':" src/servidor.js | grep wirelessEthernetStatuses
# Debe mostrar el código de fetch

# Reiniciar backend para aplicar cambios
pm2 restart portal-meraki-backend
pm2 logs --lines 50
```

---

## MANTENIMIENTO FUTURO

### Actualizar desde GitHub

```bash
cd /root/portal-meraki-deploy

# Descargar últimos cambios
git pull origin main

# Backend: reinstalar dependencias si cambió package.json
cd backend
npm install --production
pm2 restart portal-meraki-backend

# Frontend: reconstruir
cd ../frontend
npm install
npm run build
chmod -R a+rX dist/

# Recargar Nginx
systemctl reload nginx
```

### Monitoreo

```bash
# Estado de servicios
pm2 status
systemctl status nginx

# Logs en tiempo real
pm2 logs --lines 50

# Uso de recursos
pm2 monit
```

---

## RESUMEN DE COMANDOS RÁPIDOS

```bash
# Setup completo (copiar todo el bloque):
apt update && apt upgrade -y && \
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
apt install -y nodejs git nginx curl certbot python3-certbot-nginx && \
cd /root && \
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy && \
cd portal-meraki-deploy/backend && \
echo 'MERAKI_API_KEY=TU_API_KEY_AQUI' > .env && \
echo 'SESSION_SECRET=secreto_largo_aleatorio_minimo_32_caracteres_seguros' >> .env && \
echo 'PORT=3000' >> .env && \
echo 'NODE_ENV=production' >> .env && \
echo 'FRONTEND_URL=https://portalmeraki.info' >> .env && \
echo 'ALLOWED_ORIGINS=https://portalmeraki.info,https://www.portalmeraki.info' >> .env && \
chmod 600 .env && \
npm install --production && \
cd ../frontend && \
npm install && \
npm run build && \
chmod -R a+rX dist/ && \
cd .. && \
cp nginx-portal-meraki.conf /etc/nginx/sites-available/portal-meraki && \
ln -sf /etc/nginx/sites-available/portal-meraki /etc/nginx/sites-enabled/portal-meraki && \
rm -f /etc/nginx/sites-enabled/default && \
nginx -t && \
systemctl reload nginx && \
npm install -g pm2 && \
cd backend && \
pm2 start ecosystem.config.js && \
pm2 startup systemd && \
pm2 save && \
echo "✅ Setup completado - Ahora configura SSL con: certbot --nginx -d portalmeraki.info -d www.portalmeraki.info"
```

**IMPORTANTE:** Reemplaza `TU_API_KEY_AQUI` en el comando con tu API key real antes de ejecutar.

---

## TIEMPO ESTIMADO

- Instalación sistema: 5-10 min
- Clonar y configurar: 2 min
- Instalar dependencias: 5-10 min
- Configurar Nginx y SSL: 3-5 min
- Configurar PM2: 2 min
- **Total: 20-30 minutos**

---

## CHECKLIST FINAL

- [ ] Sistema Ubuntu actualizado
- [ ] Node.js 20.x instalado
- [ ] Repositorio clonado en `/root/portal-meraki-deploy`
- [ ] Archivo `.env` creado con API key válida
- [ ] Backend: `npm install` ejecutado exitosamente
- [ ] Frontend: `npm run build` generó carpeta `dist/`
- [ ] Nginx configurado con SSL (Let's Encrypt)
- [ ] PM2 ejecutando backend (`pm2 status` = online)
- [ ] PM2 configurado para autostart
- [ ] `curl https://portalmeraki.info/` retorna 200 OK
- [ ] Login funciona en navegador
- [ ] Predios cargan correctamente
- [ ] Velocidades ethernet se muestran (100/1000 Mbps)
- [ ] Topología tiene espaciado mejorado

---

**Si algo falla, consulta la sección "SOLUCIÓN DE PROBLEMAS" arriba.**
