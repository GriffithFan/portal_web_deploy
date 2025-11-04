# Changelog - Noviembre 2025

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
