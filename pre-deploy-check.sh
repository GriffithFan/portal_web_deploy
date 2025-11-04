#!/bin/bash

# ==============================================
# Portal Meraki - Pre-Deploy Checklist
# ==============================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Portal Meraki - Pre-Deploy Checklist ===${NC}"
echo ""

ERRORS=0
WARNINGS=0

# 1. Verificar que .env no esté en el repo
echo -n "1. Verificando que .env no esté versionado... "
if git ls-files --error-unmatch backend/.env 2>/dev/null; then
    echo -e "${RED}✗ FALLO${NC}"
    echo -e "   ${RED}El archivo backend/.env está en Git. Debes eliminarlo:${NC}"
    echo -e "   git rm --cached backend/.env"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ OK${NC}"
fi

# 2. Verificar que .env.production exista
echo -n "2. Verificando que .env.production exista... "
if [ -f "backend/.env.production" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FALLO${NC}"
    echo -e "   ${RED}No se encontró backend/.env.production${NC}"
    ((ERRORS++))
fi

# 3. Verificar que node_modules no esté versionado
echo -n "3. Verificando que node_modules no esté versionado... "
if git ls-files --error-unmatch backend/node_modules 2>/dev/null || git ls-files --error-unmatch frontend/node_modules 2>/dev/null; then
    echo -e "${RED}✗ FALLO${NC}"
    echo -e "   ${RED}node_modules está en Git. Debes eliminarlo:${NC}"
    echo -e "   git rm -r --cached backend/node_modules frontend/node_modules"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ OK${NC}"
fi

# 4. Verificar que scripts tengan permisos de ejecución
echo -n "4. Verificando permisos de scripts... "
SCRIPTS=("deploy-ubuntu.sh" "update.sh" "config-env.sh")
MISSING_PERMS=0
for script in "${SCRIPTS[@]}"; do
    if [ ! -x "$script" ]; then
        ((MISSING_PERMS++))
    fi
done

if [ $MISSING_PERMS -eq 0 ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ ADVERTENCIA${NC}"
    echo -e "   ${YELLOW}Algunos scripts no tienen permisos de ejecución${NC}"
    echo -e "   Ejecuta: chmod +x *.sh"
    ((WARNINGS++))
fi

# 5. Verificar que README.md esté actualizado
echo -n "5. Verificando README.md... "
if [ -f "README.md" ] && [ -s "README.md" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ ADVERTENCIA${NC}"
    echo -e "   ${YELLOW}README.md está vacío o no existe${NC}"
    ((WARNINGS++))
fi

# 6. Verificar que DEPLOY.md exista
echo -n "6. Verificando DEPLOY.md... "
if [ -f "DEPLOY.md" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ ADVERTENCIA${NC}"
    echo -e "   ${YELLOW}DEPLOY.md no existe${NC}"
    ((WARNINGS++))
fi

# 7. Verificar estructura de directorios
echo -n "7. Verificando estructura de directorios... "
DIRS=("backend/src" "frontend/src" "backend/data")
MISSING_DIRS=0
for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        ((MISSING_DIRS++))
    fi
done

if [ $MISSING_DIRS -eq 0 ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FALLO${NC}"
    echo -e "   ${RED}Faltan directorios críticos${NC}"
    ((ERRORS++))
fi

# 8. Verificar archivos package.json
echo -n "8. Verificando package.json... "
if [ -f "backend/package.json" ] && [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FALLO${NC}"
    echo -e "   ${RED}Faltan archivos package.json${NC}"
    ((ERRORS++))
fi

# 9. Verificar que no haya API keys hardcoded
echo -n "9. Verificando API keys hardcoded... "
HARDCODED=$(git grep -i "abcfebc2a5ae619bebe7fccc42a4e35228fcab86" -- '*.js' '*.jsx' '*.ts' '*.tsx' 2>/dev/null | wc -l)
if [ "$HARDCODED" -gt 1 ]; then  # Permitimos 1 en .env.production
    echo -e "${RED}✗ FALLO${NC}"
    echo -e "   ${RED}Se encontraron API keys hardcoded en el código${NC}"
    echo -e "   Archivos:"
    git grep -i "abcfebc2a5ae619bebe7fccc42a4e35228fcab86" -- '*.js' '*.jsx' '*.ts' '*.tsx' | head -5
    ((ERRORS++))
else
    echo -e "${GREEN}✓ OK${NC}"
fi

# 10. Verificar que .gitignore esté correcto
echo -n "10. Verificando .gitignore... "
if [ -f ".gitignore" ] && grep -q "node_modules" .gitignore && grep -q ".env" .gitignore; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ ADVERTENCIA${NC}"
    echo -e "   ${YELLOW}.gitignore puede estar incompleto${NC}"
    ((WARNINGS++))
fi

# Resumen
echo ""
echo -e "${BLUE}=== Resumen ===${NC}"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ TODO OK - Listo para hacer push a GitHub${NC}"
    echo ""
    echo -e "${BLUE}Comandos sugeridos:${NC}"
    echo "  git add ."
    echo "  git commit -m \"Actualización: mejoras en topología y velocidades ethernet\""
    echo "  git push origin main"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} advertencia(s) - Puedes continuar pero revisa${NC}"
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} error(es) encontrado(s) - Corrige antes de hacer push${NC}"
    exit 1
fi
