# Changelog - Noviembre 2025

## [2025-11-05] - PWA (Progressive Web App) Implementado

### ✨ Nueva Funcionalidad: Instalación como App Nativa

El Portal Meraki ahora es una **Progressive Web App (PWA)** completa que puede instalarse en cualquier dispositivo como una aplicación nativa.

#### Características PWA

- 📱 **Instalable**: Botón "Instalar" en navegador (Chrome, Edge, Safari iOS 16.4+)
- 🚀 **Carga Rápida**: Cache inteligente de assets estáticos (HTML/CSS/JS)
- 🎨 **Interfaz Nativa**: Se abre en ventana independiente sin barras del navegador
- 🔄 **Actualizaciones Automáticas**: Service Worker se actualiza en segundo plano
- 💾 **Cache Conservador**: Solo UI en cache, datos siempre frescos del servidor

#### Estrategia de Cache

**Qué se cachea**:
- ✅ HTML, CSS, JavaScript
- ✅ Íconos SVG (192x192, 512x512)
- ✅ Fuentes y assets estáticos

**Qué NO se cachea**:
- ❌ Llamadas `/api/*` (siempre van al servidor)
- ❌ Datos de dispositivos, topología, métricas

**Ventaja**: La interfaz carga instantáneamente pero los datos siempre son actuales.

#### Cómo Instalar

**En Android (Chrome/Edge)**:
1. Abrir https://portalmeraki.info
2. Tap en menú ⋮ → "Instalar app" o "Añadir a inicio"
3. Confirmar instalación

**En iOS (Safari 16.4+)**:
1. Abrir https://portalmeraki.info en Safari
2. Tap botón Compartir → "Añadir a pantalla de inicio"
3. Confirmar

**En Desktop (Chrome/Edge)**:
1. Abrir https://portalmeraki.info
2. Clic en ícono ⊕ en barra de URL → "Instalar Portal Meraki"
3. La app se abre en ventana independiente

#### Tecnología Implementada

**Dependencias agregadas**:
- `vite-plugin-pwa` v1.1.0 - Generación automática de SW
- `workbox` (incluido) - Estrategias de cache

**Archivos creados**:
- `frontend/public/manifest.json` - Metadata de la PWA
- `frontend/public/icon-192.svg` - Ícono pequeño
- `frontend/public/icon-512.svg` - Ícono grande
- `dist/sw.js` - Service Worker (generado automáticamente)
- `dist/registerSW.js` - Script de registro

**Configuración**:
```javascript
// vite.config.js
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      // NO cachear API - NetworkOnly
      { urlPattern: /\/api\//, handler: 'NetworkOnly' },
      // Cachear assets - StaleWhileRevalidate
      { urlPattern: /\.(js|css|html|svg)$/, handler: 'StaleWhileRevalidate' }
    ]
  }
})
```

### 📦 Archivos Modificados

**Frontend**:
- `frontend/vite.config.js` - Configuración plugin PWA
- `frontend/index.html` - Meta tags PWA (theme-color, manifest, icons)
- `frontend/package.json` - Nueva dependencia vite-plugin-pwa
- `frontend/public/manifest.json` - Metadata app
- `frontend/public/icon-*.svg` - Íconos PWA

### 🚀 Despliegue en VPS

**Comandos requeridos**:
```bash
cd ~/portal-meraki-deploy
git pull origin main
cd frontend
sudo npm install  # Instala vite-plugin-pwa
sudo npm run build  # Genera sw.js
sudo systemctl reload nginx
```

El Service Worker se genera automáticamente en cada build.

### 🔍 Testing

- ✅ Build genera `sw.js` y `registerSW.js` correctamente
- ✅ Manifest válido con iconos SVG
- ✅ Meta tags PWA en index.html
- ⏳ Pendiente: Test de instalación en dispositivos reales (requiere HTTPS)

### 📝 Próximos Pasos

1. Reemplazar íconos SVG placeholder con logo oficial
2. Agregar screenshots en manifest para mejor UX
3. Test de instalación en Android/iOS/Desktop
4. Verificar cache strategy en producción

---

## [2025-11-05] - Funcionalidad de Exportación y Optimización de Topología

### ✨ Nuevas Funcionalidades

#### Exportación de Capturas (Desktop)
- **Botones JPG/PDF** en secciones Topología y Access Points
- **Ubicación**: Esquina superior derecha de cada sección (solo desktop)
- **Características**:
  - Captura completa de página (incluye topbar y sidebar)
  - Formato de archivo: `Topologia 613074.jpg` / `Access Points 613074.pdf`
  - Usa código de predio en nombre de archivo
  - Soporte mejorado para SVG con `foreignObjectRendering` y `onclone` callback
- **Librerías agregadas**:
  - `html2canvas` v1.4.1 - Captura de pantalla
  - `jspdf` v2.5.2 - Generación de PDF
- **Archivos modificados**:
  - `frontend/src/pages/Dashboard.jsx` - Botones y funciones de captura
  - `frontend/package.json` - Nuevas dependencias

### 🎨 Optimizaciones de UI/UX

#### Reducción de Espacio Blanco en Topología
- **Problema**: Excesivo espacio blanco debajo del gráfico de topología
- **Soluciones aplicadas**:
  1. Cambio de `height={layout.height}` a `height="auto"` en SVG
  2. Ajuste de cálculo de height: eliminado paddingTop duplicado
  3. Wrapper con `overflow: hidden` para evitar líneas visuales
  4. Ajuste de `paddingBottom`: 50px → 200px para balancear espacio vs visibilidad
- **Resultado**: Menos espacio vacío sin cortar dispositivos inferiores
- **Archivos modificados**:
  - `frontend/src/components/SimpleGraph.jsx`

#### Fixes de UX
- ✅ Mobile: Icono de búsqueda funcionando (z-index corregido)
- ✅ Mobile: Predios recientes guardándose en localStorage
- ✅ Desktop/Mobile: Placeholder "-" mientras velocidades cargan
- ✅ Topología: Dispositivos inferiores completamente visibles

### 🔧 Mejoras Técnicas

#### Gestión de Estados
- `enrichedAPs` pasado como prop `isEnriched` a `AccessPointCard`
- Placeholder dinámico en `formatWiredSpeed(speedString, isEnriched)`
- localStorage para predios recientes: key `recentPredios`, max 10 items

#### CSS Fixes
- Mobile search modal z-index: backdrop=1, content=2
- SimpleGraph wrapper con overflow:hidden

### 📦 Dependencias Actualizadas

```json
{
  "html2canvas": "^1.4.1",
  "jspdf": "^2.5.2"
}
```

### 🚀 Despliegue en VPS

**Comandos ejecutados**:
```bash
cd ~/portal-meraki-deploy
git reset --hard origin/main  # Forzar actualización
cd frontend
sudo rm -rf node_modules package-lock.json
sudo npm install  # Reinstalar con nuevas dependencias
sudo npm run build
sudo systemctl reload nginx
```

### 🔍 Testing Realizado

- ✅ Exportación JPG funciona en Topología
- ✅ Exportación PDF funciona en Topología  
- ✅ Exportación JPG funciona en Access Points
- ✅ Exportación PDF funciona en Access Points
- ✅ SVG de topología captura correctamente
- ✅ Espacio blanco reducido sin cortar dispositivos
- ✅ No hay líneas visuales extrañas
- ✅ Predios grandes (17+ APs) se muestran completos

### 📝 Commits

1. `feat: agregar botones exportación JPG/PDF en Topología y Access Points (desktop) + reducir espacio blanco inferior topología` (a42e587)
2. `fix: agregar overflow hidden al contenedor de SimpleGraph para evitar líneas visuales` (faa541c)
3. `fix: ajustar paddingBottom a 80px para evitar corte de dispositivos en parte inferior` (1ddce9f)
4. `fix: aumentar paddingBottom a 120px para mostrar completamente dispositivos inferiores` (2827c38)
5. `fix: aumentar paddingBottom a 200px para asegurar visibilidad completa` (ce6074c)

---

## [2025-11-04] - Mejoras en Topología y Velocidades Ethernet

### 🔧 Fixes Críticos

#### Velocidades Ethernet de Access Points
- **Problema**: APs offline mostraban velocidad incorrecta (1000 Mbps en lugar de 100 Mbps)
- **Solución**: Integrado endpoint `/organizations/{orgId}/wireless/devices/ethernet/statuses`
- **Resultado**: Ahora muestra velocidad real del puerto ethernet incluso para APs offline
- **Archivos modificados**:
  - `backend/src/merakiApi.js` - Nuevo endpoint `getOrgWirelessDevicesEthernetStatuses()`
  - `backend/src/servidor.js` - Lógica de prioridad para obtener velocidad ethernet

#### Formato de Velocidad
- Cambio de formato: `100 Mbps` → `100 Mbps, full duplex`
- Acceso correcto a la estructura: `status.ports[0].linkNegotiation.speed`

### 🎨 Mejoras en Topología

#### Espaciado Dinámico Basado en Cantidad de APs
- **Antes**: Basado en `totalDevices` (incluía switches, causando espaciado inconsistente)
- **Después**: Basado en `apCount` (más preciso para UX)

| Cantidad de APs | yGap (espaciado vertical) | Uso de etiquetas (primaryY) |
|-----------------|---------------------------|------------------------------|
| ≤4 APs          | 50px (compacto)          | -32px (cerca del dispositivo)|
| 5-8 APs         | 120px                    | -60px                        |
| 9-12 APs        | 120px                    | -65px                        |
| 13-20 APs       | 140px                    | -70px (perfecto para 17 APs) |
| 21-30 APs       | 180px                    | -85px                        |
| 31-40 APs       | 180px                    | -95px                        |
| 41-60 APs       | 220px                    | -110px                       |
| >60 APs         | 270px                    | -125px                       |

#### Casos Validados
- ✅ **Predio 602360** (4 switches): Mantiene espaciado compacto original
- ✅ **Predio 613074** (10 APs): Espaciado mejorado, etiquetas más arriba
- ✅ **Predio 603005** (17 APs): Espaciado perfecto, sin modificaciones

#### Etiquetas de Dispositivos
- Todas las etiquetas (nombre + MAC + serial) ahora se posicionan **arriba** de cada dispositivo
- Espaciado vertical entre etiquetas adaptado según cantidad de APs
- Fuentes escaladas dinámicamente (20-24px para nombre principal)

**Archivo modificado**: `frontend/src/components/SimpleGraph.jsx`

### 📚 Documentación

#### Nuevos Archivos
- **`DEPLOY.md`**: Guía completa de despliegue y troubleshooting (5000+ palabras)
  - Despliegue inicial
  - Actualización
  - Configuración de variables sin editor
  - 50+ comandos útiles
  - Troubleshooting detallado
  
- **`config-env.sh`**: Script interactivo para configurar `.env` sin nano/vi
  - Actualizar MERAKI_API_KEY
  - Actualizar ADMIN_KEY
  - Actualizar CORS_ORIGINS
  - Ver configuración actual
  - Resetear a valores por defecto

- **`pre-deploy-check.sh`**: Checklist pre-commit
  - Verifica que .env no esté versionado
  - Verifica que node_modules no esté versionado
  - Verifica permisos de scripts
  - Busca API keys hardcoded
  - Valida estructura del proyecto

#### Archivos Actualizados
- **`README.md`**: Completamente reescrito
  - Estructura clara con emojis
  - Sección de arquitectura
  - Comandos útiles (PM2, Nginx, Git)
  - Enlaces a documentación detallada
  
- **`update.sh`**: Mejorado con más logging
  - Verifica y copia `.env.production` si no existe `.env`
  - Mensajes informativos en cada paso
  - Manejo de errores mejorado
  
- **`.gitignore`**: Limpiado y organizado
  - Eliminado contenido duplicado
  - Categorías claras (Node.js, Build, Env, Logs, OS, IDE, Docker)
  - Agregados archivos de certificados SSL

### 🔒 Seguridad

- ✅ Verificado que `.env` no esté versionado
- ✅ API keys solo en `.env.production` (template)
- ✅ `.gitignore` actualizado para prevenir leaks
- ✅ Scripts de configuración que evitan uso de editores de texto

### 📊 Estado del Proyecto

#### Completado
- ✅ Tarea 1: Históricos y Métricas
- ✅ Tarea 2: Dashboard Optimizado
- ✅ Tarea 3: Security & Validation
- ✅ Tarea 4: Logging & Monitoring
- ✅ Tarea 5: UX/UI Enhancements
- ✅ Tarea 6: Refactorización MVC (95% - integración pendiente)

#### Pendiente
- 🔄 Tarea 7: PWA con Service Worker
- 🔄 Tarea 8: Optimización de Rendimiento

### 🚀 Instrucciones de Despliegue

#### En Producción (Ubuntu VPS)

```bash
# 1. Conectarse al VPS
ssh root@72.61.32.146

# 2. Ir al directorio del proyecto
cd /root/portal-meraki-deploy

# 3. Ejecutar actualización
./update.sh
```

El script automáticamente:
1. Descarga cambios de GitHub
2. Verifica/copia .env.production si es necesario
3. Actualiza dependencias (backend y frontend)
4. Reinicia backend con PM2
5. Reconstruye frontend optimizado
6. Recarga Nginx

#### Para Configurar Variables (sin nano/vi)

```bash
# Opción 1: Script interactivo
./config-env.sh

# Opción 2: Comando directo con sed
sed -i 's|^MERAKI_API_KEY=.*|MERAKI_API_KEY=nueva_key|' backend/.env
pm2 restart portal-meraki-backend
```

### 📦 Archivos Modificados en este Commit

**Backend**:
- `backend/src/merakiApi.js`
- `backend/src/servidor.js`

**Frontend**:
- `frontend/src/components/SimpleGraph.jsx`

**Documentación**:
- `README.md` (reescrito)
- `DEPLOY.md` (nuevo)
- `CHANGELOG.md` (nuevo)
- `update.sh` (mejorado)
- `config-env.sh` (nuevo)
- `pre-deploy-check.sh` (nuevo)
- `.gitignore` (limpiado)

### 🔍 Testing Realizado

- ✅ Predio 613074 (10 APs): Velocidades correctas, espaciado mejorado
- ✅ Predio 603005 (17 APs): Sin cambios, ya perfecto
- ✅ Predio 602360 (4 switches): Mantiene espaciado compacto
- ✅ Backend reinicia sin errores
- ✅ Frontend compila sin warnings
- ✅ Scripts de deploy tienen permisos correctos

---

**Versión**: 1.6.0  
**Fecha**: 2025-11-04  
**Autor**: Equipo Portal Meraki

