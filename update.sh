#!/bin/bash

set -e

cd /home/portal-meraki

echo "Descargando cambios desde repositorio..."
git pull origin main

echo "Actualizando dependencias del backend..."
cd backend
npm install --production

echo "Reiniciando servicio backend..."
pm2 restart portal-meraki

echo "Reconstruyendo frontend..."
cd ../frontend
npm install
npm run build

echo "Actualizacion completada"
pm2 status
