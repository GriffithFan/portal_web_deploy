#!/bin/bash

# Script de despliegue inicial para Portal Meraki en Ubuntu VPS
# Ejecutar como root: sudo bash deploy-inicial.sh

set -e

echo "=========================================="
echo "Portal Meraki - Despliegue Inicial"
echo "=========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/root/portal-meraki-deploy"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
NGINX_CONF="/etc/nginx/sites-available/portal-meraki"
NGINX_ENABLED="/etc/nginx/sites-enabled/portal-meraki"

echo -e "${GREEN}✓${NC} Verificando que estamos en el directorio del proyecto..."
cd "$PROJECT_DIR"

# 1. Instalar dependencias del sistema si no están
echo -e "\n${YELLOW}→${NC} Verificando dependencias del sistema..."
if ! command -v node &> /dev/null; then
    echo "Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js instalado: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "npm no está instalado."
    exit 1
fi
echo -e "${GREEN}✓${NC} npm instalado: $(npm --version)"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}→${NC} Instalando PM2..."
    npm install -g pm2
fi
echo -e "${GREEN}✓${NC} PM2 instalado: $(pm2 --version)"

# 2. Instalar dependencias del backend
echo -e "\n${YELLOW}→${NC} Instalando dependencias del backend..."
cd "$BACKEND_DIR"
npm install --production

# 3. Verificar que existe .env.production
if [ ! -f "$BACKEND_DIR/.env.production" ]; then
    echo -e "${RED}✗${NC} Falta el archivo .env.production en backend/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Archivo .env.production encontrado"

# 4. Crear directorio de logs
mkdir -p "$BACKEND_DIR/logs"
echo -e "${GREEN}✓${NC} Directorio de logs creado"

# 5. Iniciar backend con PM2
echo -e "\n${YELLOW}→${NC} Iniciando backend con PM2..."
cd "$BACKEND_DIR"
pm2 delete portal-meraki-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
echo -e "${GREEN}✓${NC} Backend iniciado con PM2"

# 6. Instalar dependencias y compilar frontend
echo -e "\n${YELLOW}→${NC} Compilando frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
echo -e "${GREEN}✓${NC} Frontend compilado en frontend/dist/"

# 7. Configurar Nginx
echo -e "\n${YELLOW}→${NC} Configurando Nginx..."

# Copiar configuración
cp "$PROJECT_DIR/nginx-portal-meraki.conf" "$NGINX_CONF"

# Crear symlink si no existe
if [ ! -L "$NGINX_ENABLED" ]; then
    ln -s "$NGINX_CONF" "$NGINX_ENABLED"
fi

# Eliminar configuración default si existe
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Verificar configuración de Nginx
nginx -t

# Recargar Nginx
systemctl reload nginx
echo -e "${GREEN}✓${NC} Nginx configurado y recargado"

# 8. Configurar PM2 para iniciar al arrancar el sistema
echo -e "\n${YELLOW}→${NC} Configurando PM2 para iniciar al arrancar..."
pm2 startup systemd -u root --hp /root
pm2 save
echo -e "${GREEN}✓${NC} PM2 configurado para inicio automático"

# 9. Mostrar estado final
echo -e "\n=========================================="
echo -e "${GREEN}✓ DESPLIEGUE COMPLETADO${NC}"
echo "=========================================="
echo ""
echo "Estado de servicios:"
pm2 status
echo ""
echo "Acceso:"
echo "  → Por IP:     http://72.61.32.146"
echo "  → Por dominio: http://portalmeraki.info"
echo ""
echo "Comandos útiles:"
echo "  → Ver logs backend:  pm2 logs portal-meraki-backend"
echo "  → Reiniciar backend: pm2 restart portal-meraki-backend"
echo "  → Ver logs Nginx:    tail -f /var/log/nginx/portal-meraki-error.log"
echo "  → Actualizar:        cd $PROJECT_DIR && bash update.sh"
echo ""
echo "Siguiente paso: Configurar SSL con Certbot (opcional pero recomendado)"
echo "  sudo certbot --nginx -d portalmeraki.info -d www.portalmeraki.info"
echo ""
