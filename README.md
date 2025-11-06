# Portal Meraki - Dashboard de Monitoreo de Redes

**Portal web empresarial para monitoreo y diagn�stico de redes Cisco Meraki** dise�ado para equipos t�cnicos (NOC/soporte) que necesitan visibilidad operativa clara de infraestructura de red.

---

## Caracter�sticas Principales

- **Dashboard en Tiempo Real** - Monitoreo de estado de dispositivos y redes
- **PWA Instalable** - App nativa para m�vil/desktop con cache inteligente
- **Topolog�a Visual** - Visualizaci�n interactiva de conectividad de red
- **An�lisis Wireless** - M�tricas de APs, conexiones fallidas, y calidad de se�al
- **Gesti�n de Appliances** - Estado de MX, uplinks, VPN, y configuraci�n de puertos
- **Administraci�n de T�cnicos** - Panel para gesti�n de usuarios (m�x. 40 cuentas)
- **Hist�ricos y M�tricas** - An�lisis de tendencias y patrones de conectividad
- **Exportaci�n JPG/PDF** - Capturas de Topolog�a y Access Points

---

## Despliegue R�pido

### Prerequisitos
- Ubuntu 22.04+ LTS
- Dominio configurado (DNS A record)
- Acceso root al VPS

### Instalaci�n en 3 pasos

```bash
# 1. Clonar y entrar al directorio
cd /root
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy
cd portal-meraki-deploy

# 2. Hacer ejecutables los scripts
chmod +x *.sh

# 3. Ejecutar deploy autom�tico
./deploy-ubuntu.sh

# 4. Configurar SSL (despu�s del deploy)
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

**El script `deploy-ubuntu.sh` autom�ticamente:**
- Instala Node.js 20, PM2, Nginx
- Configura variables de entorno desde `.env.production`
- Construye frontend optimizado
- Configura Nginx con proxy reverso
- Inicia backend con PM2

---

## Actualizar en Producci�n

```bash
cd /root/portal-meraki-deploy
./update.sh
```

El script autom�ticamente:
1. Descarga cambios de GitHub
2. Actualiza dependencias del backend
3. Reinicia backend con PM2
4. Reconstruye frontend
5. Recarga Nginx

---

## Configuraci�n

### Variables de Entorno (`backend/.env.production`)

```bash
# Meraki API (REQUERIDO)
MERAKI_API_KEY=tu_api_key_aqui
MERAKI_ORG_ID=                      # Opcional

# Administraci�n (REQUERIDO en producci�n)
ADMIN_KEY=clave_segura_admin_32caracteres

# Servidor
NODE_ENV=production
PUERTO=3000
HOST=127.0.0.1

# CORS
CORS_ORIGINS=https://tu-dominio.com,http://tu-ip

# Cache y Performance
LLDP_CACHE_TTL_MS=600000
ENABLE_WARM_CACHE=true
UV_THREADPOOL_SIZE=16
TRUST_PROXY_HOPS=1
```

### Cambiar Claves Remotamente

**Cambiar ADMIN_KEY** (m�todo recomendado con `sed`):
```bash
ssh root@72.61.32.146
sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=nueva_clave_segura|' /root/portal-meraki-deploy/backend/.env.production
pm2 restart portal-meraki-backend
```

**Cambiar MERAKI_API_KEY**:
```bash
ssh root@72.61.32.146
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=nueva_api_key|' /root/portal-meraki-deploy/backend/.env.production
pm2 restart portal-meraki-backend
```

**M�s m�todos disponibles:** Ver [DEPLOY.md](./DEPLOY.md) para 5 opciones diferentes

---

## Instalaci�n como PWA

Portal Meraki es una **Progressive Web App** instalable en cualquier dispositivo:

- **Android**: Men� ? ? "Instalar app"
- **iOS**: Safari ? Compartir ? "A�adir a pantalla de inicio" (Safari 16.4+)
- **Desktop**: Clic �cono ? en barra URL ? "Instalar"

**Ventajas**:
- Interfaz carga instant�neamente (en cache)
- Datos siempre actuales (API no cacheada)
- Se abre como app nativa sin barras del navegador
- Actualizaciones autom�ticas en segundo plano

---

## Desarrollo Local

### Backend
```bash
cd backend
npm install
npm run dev
# API en http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# UI en http://localhost:5173
```

---

## API Endpoints Principales

### Autenticaci�n
- `POST /api/login` - Login de t�cnicos

### Resoluci�n de Redes
- `GET /api/resolve-network?q={codigo}` - Buscar predio por c�digo
- `GET /api/networks/{networkId}/summary` - Resumen operativo

### Secciones
- `GET /api/networks/{networkId}/section/switches` - Switches detallados
- `GET /api/networks/{networkId}/section/access_points` - APs con m�tricas wireless
- `GET /api/networks/{networkId}/section/appliances` - MX con uplinks y puertos

### Administraci�n (requiere ADMIN_KEY)
- `GET /api/predios` - Cat�logo de predios
- `GET /api/tecnicos` - Lista de t�cnicos
- `POST /api/tecnicos` - Crear t�cnico (m�x 40)
- `DELETE /api/tecnicos/{username}` - Eliminar t�cnico

### Health
- `GET /api/health` - Estado del servicio

---

## Comandos �tiles

### PM2 (Backend)
```bash
pm2 status                          # Ver estado
pm2 logs portal-meraki-backend      # Ver logs
pm2 restart portal-meraki-backend   # Reiniciar
pm2 monit                           # Monitor de recursos
```

### Nginx
```bash
systemctl status nginx              # Ver estado
systemctl reload nginx              # Recargar config
nginx -t                            # Verificar sintaxis
tail -f /var/log/nginx/error.log    # Ver errores
```

### Git
```bash
git status                          # Ver cambios
git pull origin main                # Actualizar desde GitHub
git log --oneline -10               # Ver �ltimos commits
```

---

## Troubleshooting

### Backend no inicia
```bash
pm2 logs portal-meraki-backend --err
netstat -tlnp | grep 3000
pm2 restart portal-meraki-backend
```

### Frontend no se actualiza
```bash
cd frontend
rm -rf dist
npm run build
systemctl reload nginx
```

### Variables no se aplican
```bash
cat backend/.env
cp backend/.env.production backend/.env
pm2 restart portal-meraki-backend
```

### Nginx da error 502 Bad Gateway
```bash
pm2 status                          # Verificar backend
netstat -tlnp | grep 3000           # Ver si escucha
tail -f /var/log/nginx/error.log    # Ver errores
pm2 restart portal-meraki-backend
systemctl restart nginx
```

---

## Estructura del Proyecto

```
portal-meraki-deploy/
+-- backend/
�   +-- src/
�   �   +-- servidor.js              # Servidor Express principal
�   �   +-- merakiApi.js             # Cliente API Meraki
�   �   +-- auth.js                  # Autenticaci�n
�   �   +-- prediosManager.js        # Gesti�n de predios
�   �   +-- controllers/             # Controladores
�   +-- data/
�   �   +-- predios.csv              # Cat�logo de 32k+ predios
�   +-- scripts/                     # Utilidades y ETL
�   +-- ecosystem.config.js          # Config PM2
�   +-- .env.production              # Variables de producci�n
+-- frontend/
�   +-- src/
�   �   +-- App.jsx                  # Componente principal
�   �   +-- components/              # Componentes React
�   �   +-- pages/                   # Vistas de la app
�   �   +-- styles/                  # Estilos CSS
�   +-- vite.config.js               # Config Vite
+-- deploy-ubuntu.sh                 # Deploy inicial
+-- update.sh                        # Actualizaci�n en producci�n
+-- nginx-portal-meraki.conf         # Config Nginx
+-- DEPLOY.md                        # Gu�a completa de despliegue
+-- SSH_KEY_MANAGEMENT.md            # Gesti�n de claves por SSH
+-- CHANGELOG.md                     # Historial de cambios
```

---

## Seguridad

- Certificado SSL autom�tico (Let's Encrypt)
- Headers de seguridad configurados en Nginx
- API key nunca expuesta en frontend
- Autenticaci�n por token para t�cnicos
- Gesti�n de claves por SSH (sin endpoints HTTP)
- Rate limiting en endpoints sensibles
- Validaci�n de entrada en todos los campos

---

## Performance

- Cache LLDP/CDP con TTL de 10 minutos
- Warm cache de predios frecuentes al iniciar
- Build optimizado de Vite con tree-shaking
- Compresi�n gzip en Nginx
- Lazy loading de componentes React
- Pool de threads UV expandido (16 workers)

---

## Documentaci�n

- **[DEPLOY.md](./DEPLOY.md)** - Gu�a completa de despliegue y actualizaci�n (5 m�todos para cambiar claves)
- **[SSH_KEY_MANAGEMENT.md](./SSH_KEY_MANAGEMENT.md)** - Gesti�n segura de claves administrativas por SSH
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios y versiones

---

## Contribuir

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## Soporte

- **Repositorio**: [github.com/GriffithFan/portal_web_deploy](https://github.com/GriffithFan/portal_web_deploy)
- **Issues**: GitHub Issues
- **Email**: Contactar al equipo de desarrollo

---

## Licencia

Proyecto privado para uso empresarial.

---

**�ltima actualizaci�n**: Noviembre 2025  
**Versi�n**: 2.1.0  
**Status**: Producci�n - Estable

## ??? Arquitectura

```
Portal Meraki
+-- Frontend (React 18 + Vite)
�   +-- Componentes responsivos
�   +-- Visualizaci�n D3-style
�   +-- Build optimizado
+-- Backend (Node.js + Express)
�   +-- API RESTful
�   +-- Cache LLDP/CDP inteligente
�   +-- Integraci�n Meraki API v1
+-- Infraestructura
    +-- PM2 (gesti�n de procesos)
    +-- Nginx (reverse proxy + SSL)
    +-- Ubuntu 22.04 LTS
```

## ?? PWA (Progressive Web App)

El Portal Meraki es una **PWA instalable** que funciona como app nativa en cualquier dispositivo.

### Instalaci�n

**Android (Chrome/Edge)**:
1. Abrir https://portalmeraki.info
2. Men� ? ? "Instalar app"

**iOS (Safari 16.4+)**:
1. Abrir en Safari
2. Compartir ? "A�adir a pantalla de inicio"

**Desktop (Chrome/Edge)**:
1. Abrir https://portalmeraki.info
2. Clic �cono ? en barra URL ? "Instalar"

### Ventajas

-  Carga instant�nea (interfaz en cache)
- ?? Datos siempre actuales (API no cacheada)
- ?? Ventana independiente sin barras del navegador
- ?? Actualizaciones autom�ticas en segundo plano

##  Despliegue R�pido

### Prerequisitos

- Ubuntu 22.04+ LTS
- Dominio configurado (DNS A record)
- Acceso root al VPS

### Instalaci�n

```bash
# 1. Clonar repositorio
cd /root
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy
cd portal-meraki-deploy

# 2. Dar permisos de ejecuci�n
chmod +x *.sh

# 3. Ejecutar deploy autom�tico
./deploy-ubuntu.sh

# 4. Configurar SSL (despu�s del deploy)
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

El script `deploy-ubuntu.sh` autom�ticamente:
- ? Instala Node.js 20, PM2, Nginx
- ? Configura variables de entorno desde `.env.production`
- ? Construye frontend optimizado
- ? Configura Nginx con proxy reverso
- ? Inicia backend con PM2

## ?? Actualizaci�n

```bash
cd /root/portal-meraki-deploy
./update.sh
```

Este script:
1. Descarga cambios de GitHub
2. Actualiza dependencias
3. Reinicia backend (PM2)
4. Reconstruye frontend
5. Recarga Nginx

**Gu�a completa**: [DEPLOY.md](./DEPLOY.md)

## ?? Configuraci�n

### Variables de Entorno (`backend/.env`)

```bash
# Meraki API
MERAKI_API_KEY=tu_api_key_aqui
MERAKI_ORG_ID=                    # Opcional

# Administraci�n
ADMIN_KEY=clave_segura_admin

# Servidor
NODE_ENV=production
PUERTO=3000
HOST=127.0.0.1

# CORS
CORS_ORIGINS=https://tu-dominio.com,http://tu-ip

# Cach� y Performance
LLDP_CACHE_TTL_MS=600000
ENABLE_WARM_CACHE=true
UV_THREADPOOL_SIZE=16
```

### Configurar sin Editor de Texto

```bash
# Usar script interactivo
./config-env.sh

# O manualmente con sed
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=nueva_key|' backend/.env
pm2 restart portal-meraki-backend
```

## ??? Desarrollo Local

### Backend

```bash
cd backend
npm install
npm run dev
# API en http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI en http://localhost:5173
```

## ?? API Endpoints Principales

### Autenticaci�n
- `POST /api/login` - Login de t�cnicos

### Resoluci�n de Redes
- `GET /api/resolve-network?q={codigo}` - Buscar predio por c�digo
- `GET /api/networks/{networkId}/summary` - Resumen operativo

### Secciones de Red
- `GET /api/networks/{networkId}/section/switches` - Switches detallados
- `GET /api/networks/{networkId}/section/access_points` - APs con m�tricas wireless
- `GET /api/networks/{networkId}/section/appliances` - MX con uplinks y puertos

### Administraci�n
- `GET /api/predios` - Cat�logo de predios (requiere admin)
- `GET /api/tecnicos` - Lista de t�cnicos (requiere admin)
- `POST /api/tecnicos` - Crear t�cnico (requiere admin, m�x 40)

### Health Check
- `GET /api/health` - Estado del servicio

## ?? Comandos �tiles

### PM2 (Backend)

```bash
pm2 status                        # Ver estado
pm2 logs portal-meraki-backend   # Ver logs
pm2 restart portal-meraki-backend # Reiniciar
pm2 monit                         # Monitor de recursos
```

### Nginx

```bash
systemctl status nginx      # Ver estado
systemctl reload nginx      # Recargar config
nginx -t                    # Verificar sintaxis
tail -f /var/log/nginx/error.log  # Ver errores
```

### Git

```bash
git status                  # Ver cambios locales
git pull origin main        # Actualizar desde GitHub
git log --oneline -10       # Ver �ltimos commits
```

## ?? Troubleshooting

### Backend no inicia

```bash
pm2 logs portal-meraki-backend --err
netstat -tlnp | grep 3000
pm2 restart portal-meraki-backend
```

### Frontend no se actualiza

```bash
cd frontend
rm -rf dist
npm run build
systemctl reload nginx
```

### Variables no se aplican

```bash
cat backend/.env
cp backend/.env.production backend/.env
pm2 restart portal-meraki-backend
```

**Gu�a completa**: [DEPLOY.md](./DEPLOY.md)

## ?? Estructura del Proyecto

```
portal-meraki-deploy/
+-- backend/
�   +-- src/
�   �   +-- servidor.js          # Servidor Express principal
�   �   +-- merakiApi.js         # Cliente API Meraki
�   �   +-- auth.js              # Autenticaci�n
�   �   +-- prediosManager.js    # Gesti�n de predios
�   �   +-- controllers/         # Controladores MVC
�   +-- data/
�   �   +-- predios.csv          # Cat�logo de 32k+ predios
�   +-- scripts/                 # Utilidades y ETL
�   +-- ecosystem.config.js      # Config PM2
�   +-- .env.production          # Variables de producci�n
+-- frontend/
�   +-- src/
�   �   +-- App.jsx              # Componente principal
�   �   +-- components/          # Componentes React
�   �   �   +-- SimpleGraph.jsx  # Topolog�a visual
�   �   �   +-- ...
�   �   +-- pages/               # Vistas de la app
�   +-- vite.config.js           # Config Vite
+-- deploy-ubuntu.sh             # Deploy inicial
+-- update.sh                    # Script de actualizaci�n
+-- config-env.sh                # Config .env interactiva
+-- nginx-portal-meraki.conf     # Config Nginx
+-- DEPLOY.md                    # Gu�a de despliegue
+-- PROGRESO.md                  # Historial de desarrollo
```

## ? Seguridad

- ? Certificado SSL autom�tico (Let's Encrypt)
- ? Headers de seguridad configurados en Nginx
- ? API key nunca expuesta en frontend
- ? Autenticaci�n por token para t�cnicos
- ? L�mite de 40 cuentas de t�cnicos
- ? Rate limiting en endpoints sensibles

## ?? Performance

-  Cache LLDP/CDP con TTL de 10 minutos
-  Warm cache de predios frecuentes
-  Build optimizado de Vite con tree-shaking
-  Compresi�n gzip en Nginx
-  Lazy loading de componentes React
-  Pool de threads UV expandido (16 workers)

## ?? Estado del Proyecto

- ? **Tarea 1**: Hist�ricos y M�tricas (completada)
- ? **Tarea 2**: Dashboard Optimizado (completada)
- ? **Tarea 3**: Security & Validation (completada)
- ? **Tarea 4**: Logging & Monitoring (completada)
- ? **Tarea 5**: UX/UI Enhancements (completada)
- ? **Tarea 6**: Refactorizaci�n MVC (95% completada)
- ?? **Tarea 7**: PWA con Service Worker (pendiente)
- ?? **Tarea 8**: Optimizaci�n de Rendimiento (pendiente)

**Progreso detallado**: [PROGRESO.md](./PROGRESO.md)

## ?? Soporte y Documentaci�n

- **Repositorio**: [github.com/GriffithFan/portal_web_deploy](https://github.com/GriffithFan/portal_web_deploy)
- **Gu�a de Despliegue**: [DEPLOY.md](./DEPLOY.md)
- **Progreso del Proyecto**: [PROGRESO.md](./PROGRESO.md)

## ?? Licencia

Proyecto privado para uso empresarial.

---

**�ltima actualizaci�n**: Noviembre 2025

