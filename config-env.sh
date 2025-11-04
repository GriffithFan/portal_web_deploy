#!/bin/bash

# ==============================================
# Portal Meraki - Configuración de Variables de Entorno
# Script para actualizar .env sin necesidad de editor
# ==============================================

set -e

PROJECT_DIR="/root/portal-meraki-deploy"
ENV_FILE="$PROJECT_DIR/backend/.env"
ENV_PROD="$PROJECT_DIR/backend/.env.production"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Portal Meraki - Configuración de Variables de Entorno ===${NC}"
echo ""

# Verificar si existe .env.production
if [ ! -f "$ENV_PROD" ]; then
    echo -e "${RED}Error: No se encontró $ENV_PROD${NC}"
    exit 1
fi

# Función para actualizar una variable
update_var() {
    local var_name=$1
    local var_value=$2
    local file=$3
    
    if grep -q "^${var_name}=" "$file"; then
        # Variable existe, actualizarla
        sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
        echo -e "${GREEN}✓${NC} ${var_name} actualizado"
    else
        # Variable no existe, agregarla
        echo "${var_name}=${var_value}" >> "$file"
        echo -e "${GREEN}✓${NC} ${var_name} agregado"
    fi
}

# Crear .env desde .env.production si no existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Archivo .env no existe, creando desde .env.production...${NC}"
    cp "$ENV_PROD" "$ENV_FILE"
    echo -e "${GREEN}✓ Archivo .env creado${NC}"
fi

echo -e "${BLUE}Archivo actual: $ENV_FILE${NC}"
echo ""

# Menú de opciones
echo "Selecciona una opción:"
echo "1) Actualizar MERAKI_API_KEY"
echo "2) Actualizar ADMIN_KEY"
echo "3) Actualizar CORS_ORIGINS"
echo "4) Actualizar HOST (defecto: 127.0.0.1)"
echo "5) Actualizar PUERTO (defecto: 3000)"
echo "6) Ver configuración actual"
echo "7) Resetear a valores por defecto (.env.production)"
echo "8) Salir"
echo ""

read -p "Opción: " option

case $option in
    1)
        read -p "Ingresa el nuevo MERAKI_API_KEY: " api_key
        update_var "MERAKI_API_KEY" "$api_key" "$ENV_FILE"
        ;;
    2)
        read -p "Ingresa el nuevo ADMIN_KEY: " admin_key
        update_var "ADMIN_KEY" "$admin_key" "$ENV_FILE"
        ;;
    3)
        read -p "Ingresa los CORS_ORIGINS (separados por coma): " cors
        update_var "CORS_ORIGINS" "$cors" "$ENV_FILE"
        ;;
    4)
        read -p "Ingresa el HOST (127.0.0.1 o 0.0.0.0): " host
        update_var "HOST" "$host" "$ENV_FILE"
        ;;
    5)
        read -p "Ingresa el PUERTO: " port
        update_var "PUERTO" "$port" "$ENV_FILE"
        ;;
    6)
        echo ""
        echo -e "${BLUE}=== Configuración Actual ===${NC}"
        cat "$ENV_FILE"
        echo ""
        ;;
    7)
        read -p "¿Estás seguro de resetear a valores por defecto? (s/N): " confirm
        if [ "$confirm" = "s" ] || [ "$confirm" = "S" ]; then
            cp "$ENV_PROD" "$ENV_FILE"
            echo -e "${GREEN}✓ Configuración reseteada a .env.production${NC}"
        else
            echo "Operación cancelada"
        fi
        ;;
    8)
        echo "Saliendo..."
        exit 0
        ;;
    *)
        echo -e "${RED}Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Configuración actualizada exitosamente${NC}"
echo ""
echo -e "${YELLOW}Para aplicar los cambios, ejecuta:${NC}"
echo "  pm2 restart portal-meraki-backend"
echo ""
