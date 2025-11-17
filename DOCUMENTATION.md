# Portal Meraki - Documentación Técnica

## Tabla de Contenidos

- [Despliegue y Actualización](#despliegue-y-actualización)
- [Seguridad](#seguridad)
- [Gestión de Claves](#gestión-de-claves)
- [Logging](#logging)
- [Progreso del Proyecto](#progreso-del-proyecto)

---

## Despliegue y Actualización

### Despliegue Inicial

```bash
# Conectar al VPS
ssh root@72.61.32.146

# Clonar repositorio
cd /root
git clone https://github.com/GriffithFan/portal_web_deploy.git portal-meraki-deploy
cd portal-meraki-deploy

# Configurar variables de entorno
cd backend
cp .env.production .env
nano .env  # Configurar MERAKI_API_KEY, ADMIN_KEY, etc.

# Instalar dependencias
cd ../backend
npm ci --production
cd ../frontend
npm ci
npm run build

# Configurar PM2
cd ../backend
pm2 start ecosystem.config.js
pm2 save

# Configurar Nginx
sudo cp ../nginx-portal-meraki.conf /etc/nginx/sites-available/portalmeraki
sudo ln -s /etc/nginx/sites-available/portalmeraki /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Actualización

```bash
# Usar script automatizado
cd /root/portal-meraki-deploy
./update.sh
```

El script automáticamente:
1. Descarga cambios de GitHub
2. Verifica variables de entorno
3. Actualiza dependencias
4. Reinicia backend con PM2
5. Reconstruye frontend
6. Recarga Nginx
7. Verifica salud del sistema

### Métodos para Cambiar Variables de Entorno

**Método 1: Script Interactivo**
```bash
./config-env.sh
```

**Método 2: Comando sed**
```bash
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=nueva_key|' backend/.env
pm2 restart portal-meraki-backend
```

**Método 3: Editor (Nano)**
```bash
nano backend/.env
# Modificar valores
# Ctrl+X, Y, Enter para guardar
pm2 restart portal-meraki-backend
```

---

## Seguridad

### Medidas Implementadas

#### Headers de Seguridad (Helmet)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS): 1 año, includeSubdomains
- Cross-Origin Policies

#### Rate Limiting
- **General API**: 1000 req/15min
- **Autenticación**: 10 intentos/15min
- **Datos intensivos**: 100 req/5min
- **Operaciones de escritura**: 50 ops/15min

#### Validación y Sanitización
- Sanitización automática de inputs (query, body)
- Prevención de Parameter Pollution
- Validación de formato de IDs (organizationId, networkId)

#### Protección CSRF
- Header `X-Requested-With: XMLHttpRequest` requerido en operaciones POST/PUT/DELETE

#### Detección de Requests Sospechosos
- Path traversal: `../`
- SQL injection: `union select`
- XSS: `javascript:`, `<script>`
- Code injection: `eval(`

#### CORS Restrictivo
```javascript
// Desarrollo
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

// Producción
CORS_ORIGINS=https://portalmeraki.info
```

#### Trust Proxy
Configurado para Cloudflare/proxies reversos:
```javascript
app.set('trust proxy', true)
```

### Cumplimiento
- OWASP Top 10 (2021)
- Mejores prácticas de Express.js
- Seguridad por defecto

---

## Gestión de Claves

### Variables Sensibles

```properties
ADMIN_KEY=clave_maestra_admin_32_chars_minimo
MERAKI_API_KEY=clave_api_meraki_desde_dashboard
CORS_ORIGINS=https://portalmeraki.info
NODE_ENV=production
TRUST_PROXY_HOPS=1
```

### Cambiar ADMIN_KEY

**Por SSH (Método Recomendado)**:
```bash
ssh root@72.61.32.146
cd /root/portal-meraki-deploy/backend
cp .env .env.backup.$(date +%s)
sed -i 's|^ADMIN_KEY=.*|ADMIN_KEY=nueva_clave_segura|' .env
pm2 restart portal-meraki-backend
```

**Verificar cambio**:
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"key":"nueva_clave_segura"}'
```

### Cambiar MERAKI_API_KEY

```bash
ssh root@72.61.32.146
cd /root/portal-meraki-deploy/backend
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=nueva_key_meraki|' .env
pm2 restart portal-meraki-backend
```

Obtener clave en: https://dashboard.meraki.com/api_access

### Rollback en Caso de Error

```bash
cp .env.backup.TIMESTAMP .env
pm2 restart portal-meraki-backend
pm2 logs portal-meraki-backend
```

---

## Logging

### Sistema de Logging con Winston

#### Niveles de Log
- **error**: Errores críticos
- **warn**: Advertencias
- **info**: Información general
- **http**: Requests HTTP
- **debug**: Debugging (solo desarrollo)

#### Rotación Automática

| Archivo | Contenido | Retención | Tamaño Máx |
|---------|-----------|-----------|------------|
| `application-%DATE%.log` | Todos los logs | 30 días | 20MB |
| `error-%DATE%.log` | Solo errores | 90 días | 20MB |
| `http-%DATE%.log` | HTTP requests | 14 días | 50MB |
| `security-%DATE%.log` | Eventos de seguridad | 180 días | 20MB |
| `exceptions-%DATE%.log` | Excepciones no capturadas | 90 días | - |
| `rejections-%DATE%.log` | Promesas rechazadas | 90 días | - |

#### Uso en Código

```javascript
const { logger } = require('./config/logger');

logger.info('Servidor iniciado');
logger.error('Error crítico', { error });
logger.warn('Advertencia');
logger.http('HTTP request', { method, url, statusCode });
```

#### Funciones Helper

- `logRequest(req, res, duration)` - HTTP requests automático
- `logSecurity(event, details)` - Eventos de seguridad
- `logError(error, context)` - Errores con stack trace
- `logAdmin(operation, details)` - Operaciones administrativas
- `logCache(operation, details)` - Operaciones de caché
- `logAPICall(endpoint, details)` - Llamadas a API externa

#### Middleware

```javascript
const { expressLogger } = require('./config/logger');
app.use(expressLogger());
```

---

## Progreso del Proyecto

### Completado

#### Sistema UX/UI
- 13 componentes Skeleton Loader
- 5 componentes Loading (Overlay, Spinner, ProgressBar)
- Sistema de animaciones CSS (330+ líneas)
- Dark mode infrastructure (Context API, variables CSS)
- ThemeToggle integrado en TopBar

#### Gráficos Históricos Appliance
- Connectivity timeline (uptime/downtime)
- Client usage por WAN (bandwidth histórico)
- Selector de período: 1h, 24h, 7 días

#### Refactorización Dashboard.jsx
- Reducción: 2634 → 2104 líneas (20% reducción)
- 12 archivos modulares creados
- Hooks personalizados (useTableSort, useDashboardData)
- Componentes reutilizables extraídos

#### Sistema de Seguridad
- Helmet con CSP y HSTS
- Rate limiting (4 limiters configurados)
- Validación y sanitización de inputs
- Protección CSRF
- Detección de requests sospechosos

#### Sistema de Logging
- Winston con rotación automática
- 5 categorías de logs
- Middleware Express integrado
- Funciones helper especializadas

#### PWA (Progressive Web App)
- Instalable en Android/iOS/Desktop
- Cache inteligente de assets estáticos
- Service Worker con auto-update
- Manifest con iconos 192x192 y 512x512

#### Responsive Design
- Scroll horizontal en tablas
- Column widths en pixels fijos
- Scrollbar personalizado (8px, colores custom)
- Font scaling con CSS clamp() para 16:9

### En Progreso

#### Refactorización servidor.js
- Estructura MVC creada
- Routes: auth, admin, predios, networks
- Controllers modulares creados
- Pendiente: Integración final (servidor.js < 300 líneas)

### Pendiente

#### Testing
- Jest para backend
- React Testing Library para frontend
- Tests E2E con Playwright

#### Optimización
- Compresión gzip/brotli en Nginx
- Lazy loading de componentes adicionales
- Debounce en búsquedas

#### Documentación
- API documentation
- JSDoc en funciones críticas
- CONTRIBUTING.md

#### Accesibilidad
- ARIA labels
- Navegación por teclado
- Screen reader support

---

## Comandos Útiles

### PM2
```bash
pm2 list                          # Listar procesos
pm2 restart portal-meraki-backend # Reiniciar backend
pm2 logs portal-meraki-backend    # Ver logs en tiempo real
pm2 stop portal-meraki-backend    # Detener proceso
pm2 save                          # Guardar configuración
pm2 startup                       # Configurar inicio automático
```

### Nginx
```bash
sudo nginx -t                   # Validar configuración
sudo systemctl reload nginx     # Recargar sin downtime
sudo systemctl status nginx     # Ver estado
sudo tail -f /var/log/nginx/access.log  # Ver logs acceso
sudo tail -f /var/log/nginx/error.log   # Ver logs error
```

### Git
```bash
git pull origin main            # Actualizar desde GitHub
git status                      # Ver cambios
git log --oneline -10           # Ver últimos 10 commits
git diff                        # Ver cambios no commiteados
```

### Verificación de Salud
```bash
curl http://localhost:3000/api/health                    # Backend health
curl -I https://portalmeraki.info                        # Frontend accesible
pm2 describe portal-meraki-backend | grep "uptime"      # Tiempo activo
systemctl is-active nginx                                # Nginx activo
```

---

**Versión**: 1.7.0  
**Última actualización**: Noviembre 2025  
**Autor**: Equipo Portal Meraki
