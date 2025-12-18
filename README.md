# Portal Meraki - Dashboard de Monitoreo de Redes

Portal web empresarial para monitoreo y diagnostico de redes Cisco Meraki, disenado para equipos tecnicos (NOC/soporte) que necesitan visibilidad operativa clara de infraestructura de red.

---

## Arquitectura

```
Portal Meraki
├── Frontend (React 18 + Vite)
│   ├── Componentes responsivos
│   ├── Visualizacion D3-style
│   └── Build optimizado
├── Backend (Node.js + Express)
│   ├── API RESTful
│   ├── Cache LLDP/CDP inteligente
│   └── Integracion Meraki API v1
└── Infraestructura
    ├── PM2 (gestion de procesos)
    ├── Nginx (reverse proxy + SSL)
    └── Ubuntu 22.04 LTS
```

---

## Caracteristicas Principales

- **Dashboard en Tiempo Real** - Monitoreo de estado de dispositivos y redes
- **PWA Instalable** - App nativa para movil/desktop con cache inteligente
- **Topologia Visual** - Visualizacion interactiva de conectividad de red
- **Analisis Wireless** - Metricas de APs, conexiones fallidas, y calidad de senal
- **Gestion de Appliances** - Estado de MX, uplinks, VPN, y configuracion de puertos
- **Administracion de Tecnicos** - Panel para gestion de usuarios (max. 40 cuentas)
- **Historicos y Metricas** - Analisis de tendencias y patrones de conectividad
- **Exportacion JPG/PDF** - Capturas de Topologia y Access Points

---

## Despliegue Rapido

### Prerequisitos

- Ubuntu 22.04+ LTS
- Dominio configurado (DNS A record)
- Acceso root al VPS

### Instalacion

```bash
# 1. Clonar repositorio
cd /root
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy
cd portal-meraki-deploy

# 2. Dar permisos de ejecucion
chmod +x *.sh

# 3. Ejecutar deploy automatico
./deploy-ubuntu.sh

# 4. Configurar SSL (despues del deploy)
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

El script `deploy-ubuntu.sh` automaticamente:
- Instala Node.js 20, PM2, Nginx
- Configura variables de entorno desde `.env.production`
- Construye frontend optimizado
- Configura Nginx con proxy reverso
- Inicia backend con PM2

---

## Actualizacion en Produccion

```bash
cd /root/portal-meraki-deploy
./update.sh
```

El script automaticamente:
1. Descarga cambios de GitHub
2. Actualiza dependencias del backend
3. Reinicia backend con PM2
4. Reconstruye frontend
5. Recarga Nginx

---

## Configuracion

### Variables de Entorno (`backend/.env.production`)

```bash
# Meraki API (REQUERIDO)
MERAKI_API_KEY=tu_api_key_aqui
MERAKI_ORG_ID=                      # Opcional

# Administracion (REQUERIDO en produccion)
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

**Cambiar ADMIN_KEY**:
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

Mas metodos disponibles en [DEPLOY.md](./DEPLOY.md)

---

## PWA (Progressive Web App)

Portal Meraki es una PWA instalable que funciona como app nativa en cualquier dispositivo.

### Instalacion

- **Android**: Menu > "Instalar app"
- **iOS**: Safari > Compartir > "Agregar a pantalla de inicio" (Safari 16.4+)
- **Desktop**: Clic icono en barra URL > "Instalar"

### Ventajas

- Carga instantanea (interfaz en cache)
- Datos siempre actuales (API no cacheada)
- Ventana independiente sin barras del navegador
- Actualizaciones automaticas en segundo plano

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

### Autenticacion
- `POST /api/login` - Login de tecnicos

### Resolucion de Redes
- `GET /api/resolve-network?q={codigo}` - Buscar predio por codigo
- `GET /api/networks/{networkId}/summary` - Resumen operativo

### Secciones
- `GET /api/networks/{networkId}/section/switches` - Switches detallados
- `GET /api/networks/{networkId}/section/access_points` - APs con metricas wireless
- `GET /api/networks/{networkId}/section/appliances` - MX con uplinks y puertos

### Administracion (requiere ADMIN_KEY)
- `GET /api/predios` - Catalogo de predios
- `GET /api/tecnicos` - Lista de tecnicos
- `POST /api/tecnicos` - Crear tecnico (max 40)
- `DELETE /api/tecnicos/{username}` - Eliminar tecnico

### Health
- `GET /api/health` - Estado del servicio

---

## Comandos Utiles

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
git log --oneline -10               # Ver ultimos commits
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
├── backend/
│   ├── src/
│   │   ├── servidor.js              # Servidor Express principal
│   │   ├── merakiApi.js             # Cliente API Meraki
│   │   ├── auth.js                  # Autenticacion
│   │   ├── prediosManager.js        # Gestion de predios
│   │   └── controllers/             # Controladores MVC
│   ├── data/
│   │   └── predios.csv              # Catalogo de 32k+ predios
│   ├── scripts/                     # Utilidades y ETL
│   ├── ecosystem.config.js          # Config PM2
│   └── .env.production              # Variables de produccion
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Componente principal
│   │   ├── components/              # Componentes React
│   │   └── pages/                   # Vistas de la app
│   └── vite.config.js               # Config Vite
├── deploy-ubuntu.sh                 # Deploy inicial
├── update.sh                        # Actualizacion en produccion
├── nginx-portal-meraki.conf         # Config Nginx
├── DEPLOY.md                        # Guia completa de despliegue
├── SSH_KEY_MANAGEMENT.md            # Gestion de claves por SSH
└── CHANGELOG.md                     # Historial de cambios
```

---

## Seguridad

- Certificado SSL automatico (Let's Encrypt)
- Headers de seguridad configurados en Nginx
- API key nunca expuesta en frontend
- Autenticacion por token para tecnicos
- Gestion de claves por SSH (sin endpoints HTTP)
- Rate limiting en endpoints sensibles
- Validacion de entrada en todos los campos

---

## Performance

- Cache LLDP/CDP con TTL de 10 minutos
- Warm cache de predios frecuentes al iniciar
- Build optimizado de Vite con tree-shaking
- Compresion gzip en Nginx
- Lazy loading de componentes React
- Pool de threads UV expandido (16 workers)

---

## Documentacion

- [DEPLOY.md](./DEPLOY.md) - Guia completa de despliegue y actualizacion
- [SSH_KEY_MANAGEMENT.md](./SSH_KEY_MANAGEMENT.md) - Gestion segura de claves administrativas por SSH
- [CHANGELOG.md](./CHANGELOG.md) - Historial de cambios y versiones

---

## Soporte

- **Repositorio**: [github.com/GriffithFan/portal_web_deploy](https://github.com/GriffithFan/portal_web_deploy)
- **Issues**: GitHub Issues

---

## Licencia

Proyecto privado para uso empresarial.

---

**Ultima actualizacion**: Diciembre 2025  
**Version**: 2.2.0  
**Status**: Produccion - Estable

