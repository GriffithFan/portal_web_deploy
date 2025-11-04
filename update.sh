#!/bin/bash

set -e

echo "=== Portal Meraki - Script de Actualización ==="

# Ruta del proyecto
PROJECT_DIR="/root/portal-meraki-deploy"
cd "$PROJECT_DIR"

echo "📥 Descargando cambios desde GitHub..."
git pull origin main

echo "📦 Actualizando dependencias del backend..."
cd backend
npm install --production

echo "🔄 Reiniciando servicio backend con PM2..."
pm2 restart portal-meraki-backend || pm2 start ecosystem.config.js

echo "🎨 Reconstruyendo frontend..."
cd ../frontend
npm install
npm run build

echo "📋 Estado de servicios PM2:"
pm2 status

echo "✅ Actualización completada exitosamente"
echo "🌐 Accede a: http://72.61.32.146 o https://portalmeraki.info"
