# Despliegue con Docker Compose

Este proyecto contiene un `backend` (API) y un `frontend` (React + Vite). El objetivo es construir imágenes y ejecutar ambos servicios con `docker-compose`.

PRECAUCIÓN: Nunca subas archivos `.env` con secretos a repositorios públicos. Usa `backend/.env.example` como plantilla.

Requisitos (en la máquina donde vayas a construir / ejecutar):
- Docker
- Docker Compose (v2+) o `docker compose` integrado

Pasos rápidos (en la VPS o máquina local):

1) Copia la plantilla de entorno y rellena valores secretos en `backend/.env`:

```powershell
cp backend/.env.example backend/.env
# Edítalo con tu editor y rellena ADMIN_KEY, MERAKI_API_KEY, etc.
```

2) Construir y arrancar (modo detached):

```powershell
docker compose build --pull --no-cache
docker compose up -d
```

Esto hará build de las imágenes usando los Dockerfiles en `backend/` y `frontend/`.

Comprobaciones:
- `docker compose ps` para ver contenedores en ejecución.
- `docker logs portal-meraki-backend -f` para ver logs del backend.
- `docker logs portal-meraki-frontend -f` para ver logs del frontend.

Exponer en puerto 80/443 en producción:
- El `docker-compose.yml` por defecto expone `3000` (backend) y `5173` (frontend). En producción puedes colocar un reverse proxy (Nginx) que sirva la app en `:80` y haga proxy a `backend:3000` internamente.

Alternativa: Exportar imágenes y subirlas al VPS (si no quieres construir en el VPS):

```powershell
# Construye localmente
docker compose build --pull
# Guarda las imágenes a un tar
docker image save portal-meraki-backend:latest -o backend-image.tar
docker image save portal-meraki-frontend:latest -o frontend-image.tar

# En VPS: docker load -i backend-image.tar && docker load -i frontend-image.tar
# Luego docker compose up -d (asegúrate de tener docker-compose.yml allí)
```

Notas específicas para Hostinger Easy Panel:
- Easy Panel puede aceptar `docker-compose.yml` en su gestor de contenedores. Sube los archivos del proyecto (o solo `docker-compose.yml`, `backend/.env` y los Dockerfiles) y usa la opción de construir imágenes desde el panel.
- Si el panel no permite construir, usa el método de exportar imágenes descrito arriba.

Seguridad y recomendaciones:
- Rellena `ADMIN_KEY` con una cadena larga y única.
- Limita `CORS_ORIGINS` a la URL pública del frontend en producción.
- Habilita TLS (reverse proxy o panel) y no expongas el backend directamente sin TLS.
- Mantén `backend/.env` fuera del control de versiones.
