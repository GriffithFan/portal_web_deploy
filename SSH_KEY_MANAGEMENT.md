# Gestión de Claves por SSH

## Visión general

Las claves administrativas (`ADMIN_KEY`) y de la API de Meraki (`MERAKI_API_KEY`) se gestionan manualmente a través de SSH en producción. Este enfoque es más seguro y simple que exponer endpoints HTTP para cambiar claves.

## Cambiar ADMIN_KEY

### En el servidor VPS

1. **Conectar por SSH**:
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navegar a la carpeta del backend**:
   ```bash
   cd /ruta/al/proyecto/backend
   ```

3. **Editar el archivo `.env`** o `.env.production`:
   ```bash
   nano .env.production
   ```

4. **Localizar y actualizar la línea `ADMIN_KEY`**:
   ```properties
   ADMIN_KEY=tu_nueva_clave_segura_aqui
   ```
   
   Recomendaciones para la nueva clave:
   - Mínimo 32 caracteres
   - Caracteres alfanuméricos + símbolos especiales
   - Ejemplo: `e58a89f9f23220f83b37330fa7a4794415633275dd94effc947bb3d128d86aa6`

5. **Guardar y cerrar** (Ctrl+X, luego Y, luego Enter en nano)

6. **Reiniciar el servicio** (si usas PM2):
   ```bash
   pm2 restart ecosystem.config.js
   # o específicamente:
   pm2 restart api
   ```

   O si usas Docker Compose:
   ```bash
   docker-compose restart backend
   ```

7. **Verificar que el cambio se aplicó**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"key":"tu_nueva_clave_segura_aqui"}'
   ```
   
   Si devuelve `{"success":true}`, el cambio fue exitoso.

## Cambiar MERAKI_API_KEY

### En el servidor VPS

1. **Conectar por SSH** (igual que arriba)

2. **Navegar a la carpeta del backend**

3. **Editar `.env.production`**:
   ```bash
   nano .env.production
   ```

4. **Localizar y actualizar `MERAKI_API_KEY`**:
   ```properties
   MERAKI_API_KEY=tu_nueva_api_key_de_meraki
   ```
   
   Obtener la clave en: https://dashboard.meraki.com/api_access

5. **Guardar y cerrar**

6. **Reiniciar el servicio**:
   ```bash
   pm2 restart api
   # o
   docker-compose restart backend
   ```

7. **Verificar** (hacer una llamada a cualquier endpoint que use Meraki API):
   ```bash
   curl http://localhost:3000/api/organizations \
     -H "x-admin-key: clave_admin_actual"
   ```

## Seguridad

- **No compartir SSH credentials**: Usa claves SSH configuradas en `~/.ssh/config`
- **No copiar claves al portapapeles**: Escribirlas directamente en los archivos `.env`
- **Auditar cambios**: Revisa logs con `pm2 logs api`
- **Respaldar .env anterior**: Hacer backup antes de cambiar:
  ```bash
  cp .env.production .env.production.backup
  ```

## Rollback en caso de error

Si algo falla después de cambiar una clave:

1. **Restaurar el backup**:
   ```bash
   cp .env.production.backup .env.production
   ```

2. **Reiniciar**:
   ```bash
   pm2 restart api
   ```

3. **Verificar logs**:
   ```bash
   pm2 logs api
   ```

## Automatización opcional (Advanced)

Para cambios más frecuentes, puedes crear un script de bash:

```bash
#!/bin/bash
# update_admin_key.sh
# Uso: ./update_admin_key.sh "nueva_clave_admin"

NEW_ADMIN_KEY="${1}"
ENV_FILE="/ruta/al/proyecto/backend/.env.production"

if [ -z "$NEW_ADMIN_KEY" ]; then
  echo "Error: Proporciona la nueva clave admin como argumento"
  exit 1
fi

# Hacer backup
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"

# Reemplazar
sed -i "s/^ADMIN_KEY=.*/ADMIN_KEY=$NEW_ADMIN_KEY/" "$ENV_FILE"

# Reiniciar
pm2 restart api

echo "ADMIN_KEY actualizada. Servicio reiniciado."
```

Guardar como `update_admin_key.sh` y hacer ejecutable:
```bash
chmod +x update_admin_key.sh
./update_admin_key.sh "nueva_clave_super_segura"
```

---

**Nota**: Esta aproximación manual via SSH es más segura porque:
- No expone endpoints HTTP para cambiar claves
- Requiere acceso directo al servidor (auditoría más clara)
- Evita ataques CSRF y escalada de privilegios
- Las claves nunca se transmiten por la red

