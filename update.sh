#!/bin/bash

set -e

echo "================================================"
echo "  Portal Meraki - Actualizacion"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

PROJECT_DIR="/root/portal-meraki-deploy"
cd "$PROJECT_DIR"

echo ""
echo "[1/6] Descargando cambios desde GitHub..."
git pull origin main

echo ""
echo "[2/6] Verificando variables de entorno..."
cd backend
if [ ! -f ".env" ]; then
    echo "  WARN: .env no encontrado, copiando desde .env.production..."
    cp .env.production .env
    echo "  OK: Variables de entorno configuradas"
else
    echo "  OK: Archivo .env existe"
fi

echo ""
echo "[3/6] Actualizando dependencias del backend..."
npm install --production

echo ""
echo "[4/6] Reiniciando servicio backend con PM2..."
pm2 restart portal-meraki-backend 2>/dev/null || pm2 start ecosystem.config.js --env production

echo ""
echo "[5/6] Reconstruyendo frontend..."
cd ../frontend
npm install
npm run build

echo ""
echo "[6/6] Recargando Nginx..."
sudo systemctl reload nginx 2>/dev/null || echo "  WARN: Nginx no se pudo recargar (puede requerir sudo)"

echo ""
echo "Estado de servicios PM2:"
pm2 status

echo ""
echo "================================================"
echo "  Actualizacion completada"
echo "================================================"
echo ""
echo "Frontend: http://72.61.32.146 | https://portalmeraki.info"
echo "Backend:  https://portalmeraki.info/api"
echo ""
echo "Comandos utiles:"
echo "  pm2 logs portal-meraki-backend"
echo "  pm2 describe portal-meraki-backend"
echo ""

