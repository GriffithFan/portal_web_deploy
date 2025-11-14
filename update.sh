#!/bin/bash

set -e

echo "=== Portal Meraki - Script de Actualización ==="
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"

# Ruta del proyecto
PROJECT_DIR="/root/portal-meraki-deploy"

# Verificar que el directorio existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Directorio $PROJECT_DIR no encontrado"
    exit 1
fi

cd "$PROJECT_DIR"

# Backup del commit actual antes de actualizar
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "📍 Commit actual: $CURRENT_COMMIT"

echo ""
echo "📥 Paso 1/6: Descargando cambios desde GitHub..."
git fetch origin

# Verificar si hay cambios
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Ya estás actualizado. No hay cambios nuevos."
    echo ""
    echo "🔍 Estado de servicios:"
    pm2 status
    exit 0
fi

echo "🔄 Actualizando de $CURRENT_COMMIT a $(git rev-parse --short origin/main)..."
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
npm install --production --no-audit

echo ""
echo "🔄 Paso 4/6: Reiniciando servicio backend con PM2..."
if pm2 describe portal-meraki-backend > /dev/null 2>&1; then
    pm2 restart portal-meraki-backend
    echo "✅ Backend reiniciado"
else
    echo "⚠️  Backend no encontrado en PM2, iniciando..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    echo "✅ Backend iniciado y guardado"
fi

echo ""
echo "🎨 Paso 5/6: Reconstruyendo frontend..."
cd ../frontend
npm install --no-audit
npm run build

# Verificar que el build se completó
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ Error: Build del frontend falló (carpeta dist vacía)"
    exit 1
fi
echo "✅ Frontend construido correctamente"

echo ""
echo "🔄 Paso 6/6: Recargando Nginx..."
if command -v nginx > /dev/null 2>&1; then
    # Verificar configuración antes de recargar
    if nginx -t > /dev/null 2>&1; then
        systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx 2>/dev/null || echo "⚠️  No se pudo recargar Nginx automáticamente"
        echo "✅ Nginx recargado"
    else
        echo "⚠️  Configuración de Nginx tiene errores, saltando recarga"
        nginx -t
    fi
else
    echo "⚠️  Nginx no instalado, saltando paso"
fi

cd "$PROJECT_DIR"

echo ""
echo "📋 Estado de servicios PM2:"
pm2 status

echo ""
echo "🔍 Verificando que el backend responde..."
sleep 2  # Dar tiempo a que PM2 inicie el proceso
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend respondiendo correctamente"
else
    echo "⚠️  Backend no responde en /api/health"
    echo "   Verifica con: pm2 logs portal-meraki-backend"
fi

echo ""
echo "✅ =========================================="
echo "✅ Actualización completada exitosamente"
echo "✅ =========================================="
echo ""
echo "📍 Commit aplicado: $(git rev-parse --short HEAD)"
echo "🌐 Frontend: http://72.61.32.146 o https://portalmeraki.info"
echo "🔧 Backend API: https://portalmeraki.info/api"
echo ""
echo "📊 Ver logs del backend:"
echo "   pm2 logs portal-meraki-backend"
echo ""
echo "🔍 Ver estado detallado:"
echo "   pm2 describe portal-meraki-backend"
echo ""
echo "🔙 Rollback (si hay problemas):"
echo "   cd $PROJECT_DIR && git reset --hard $CURRENT_COMMIT"
echo "   ./update.sh"
echo ""

