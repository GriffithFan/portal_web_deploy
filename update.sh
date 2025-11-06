#!/bin/bash

set -e

echo "=== Portal Meraki - Script de Actualización ==="
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"

# Ruta del proyecto
PROJECT_DIR="/root/portal-meraki-deploy"
cd "$PROJECT_DIR"

echo ""
echo "📥 Paso 1/6: Descargando cambios desde GitHub..."
git pull origin main

echo ""
echo "🔄 Paso 2/6: Verificando variables de entorno..."
cd backend
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado, copiando desde .env.production..."
    cp .env.production .env
    echo "✅ Variables de entorno configuradas"
else
    echo "✅ Archivo .env existe"
fi

echo ""
echo "📦 Paso 3/6: Actualizando dependencias del backend..."
npm install --production

echo ""
echo "🔄 Paso 4/6: Reiniciando servicio backend con PM2..."
pm2 restart portal-meraki-backend 2>/dev/null || pm2 start ecosystem.config.js --env production

echo ""
echo "🎨 Paso 5/6: Reconstruyendo frontend..."
cd ../frontend
npm install
npm run build

echo ""
echo "🔄 Paso 6/6: Reiniciando Nginx..."
sudo systemctl reload nginx 2>/dev/null || echo "⚠️  Nginx no se pudo recargar (puede requerir sudo)"

echo ""
echo "📋 Estado de servicios PM2:"
pm2 status

echo ""
echo "✅ =========================================="
echo "✅ Actualización completada exitosamente"
echo "✅ =========================================="
echo ""
echo "🌐 Frontend: http://72.61.32.146 o https://portalmeraki.info"
echo "🔧 Backend API: https://portalmeraki.info/api"
echo ""
echo "📊 Ver logs del backend:"
echo "   pm2 logs portal-meraki-backend"
echo ""
echo "🔍 Ver estado detallado:"
echo "   pm2 describe portal-meraki-backend"
echo ""

