# Refactorización del servidor.js - Plan de Trabajo

## 📊 Estado Actual

- **Archivo original:** `backend/src/servidor.js`
- **Líneas totales:** 5,513 líneas
- **Endpoints identificados:** 35+ rutas
- **Meta:** Reducir a < 300 líneas (solo configuración e inicialización)

## ✅ Completado

### Carpetas Creadas
- ✅ `backend/src/routes/` - Rutas/endpoints
- ✅ `backend/src/controllers/` - Lógica de negocio
- ✅ `backend/src/services/` - Servicios externos

### Archivos Creados (11/18)
1. ✅ `routes/auth.routes.js` - Rutas de autenticación (2 endpoints)
2. ✅ `routes/admin.routes.js` - Gestión de técnicos (3 endpoints)
3. ✅ `routes/predios.routes.js` - Gestión de predios (7 endpoints)
4. ✅ `routes/networks.routes.js` - Redes y resolución (10 endpoints)
5. ✅ `routes/debug.routes.js` - Debug y diagnóstico (2 endpoints)
6. ✅ `routes/organizations.routes.js` - Datos organizacionales (4 endpoints)
7. ✅ `controllers/authController.js` - Controlador auth y admin (120 líneas)
8. ✅ `controllers/prediosController.js` - Controlador predios con SSE (270 líneas)
9. ✅ `controllers/networksController.js` - Controlador networks (850+ líneas)
10. ✅ `controllers/debugController.js` - Controlador debug (220 líneas)
11. ✅ `controllers/organizationsController.js` - Controlador organizations (62 líneas)

## 📋 Endpoints por Categoría

### 1. Autenticación (2 endpoints) ✅ COMPLETADO
- `POST /api/login` - Login técnicos
- `POST /api/admin/login` - Login admin

### 2. Administración (3 endpoints) ✅ COMPLETADO
- `GET /api/tecnicos` - Listar técnicos
- `POST /api/tecnicos` - Agregar técnico
- `DELETE /api/tecnicos/:username` - Eliminar técnico

### 3. Predios (7 endpoints) ✅ COMPLETADO
- ✅ `GET /api/predios/search` - Buscar predios
- ✅ `GET /api/predios/stats` - Estadísticas
- ✅ `POST /api/predios/refresh` - Refrescar caché
- ✅ `POST /api/predios/sync` - Sincronizar CSV
- ✅ `POST /api/predios/sync-stream` - Sincronizar con stream SSE
- ✅ `GET /api/predios/last-sync` - Último sync
- ✅ `GET /api/predios/:code` - Obtener predio por código

### 4. Networks - Búsqueda (2 endpoints) ✅ COMPLETADO
- ✅ `GET /api/networks/search` - Buscar redes
- ✅ `GET /api/resolve-network` - Resolver predio/network

### 5. Networks - Datos (4 endpoints) ✅ COMPLETADO
- ✅ `GET /api/networks/:networkId/summary` - Resumen completo
- ✅ `GET /api/networks/:networkId/section/:sectionKey` - Carga por sección (topology, switches, access_points)
- ✅ `GET /api/networks/:networkId/:section` - Sección específica (legacy)
- ✅ `GET /api/networks/:networkId/topology_discovery` - Descubrimiento topología

### 6. Networks - Appliance (2 endpoints) ✅ COMPLETADO
- ✅ `GET /api/networks/:networkId/appliance/connectivityMonitoringDestinations`
- ✅ `GET /api/networks/:networkId/appliance/historical` - Históricos con connectividad y bandwidth

### 7. Networks - Wireless (2 endpoints) ✅ COMPLETADO
- ✅ `GET /api/networks/:networkId/wireless/ssids`
- ✅ `GET /api/networks/:networkId/wireless/ssids/:number`

### 8. Organizations (4 endpoints) ✅ COMPLETADO
- ✅ `GET /api/organizations/:orgId/wireless/devices/radsec/certificates/authorities`
- ✅ `GET /api/organizations/:orgId/appliances/top-utilization`
- ✅ `GET /api/organizations/:orgId/devices/uplinks-addresses`
- ✅ `GET /api/organizations/:orgId/uplinks/statuses`

### 9. Debug/Cache (3 endpoints) ✅ COMPLETADO
- ✅ `GET /api/debug/topology/:networkId` - Debug topología con LLDP
- ✅ `GET /api/debug/snapshot/:networkId` - Snapshot de datos crudos
- ✅ `POST /api/cache/clear` - Limpiar caché (lldp, all)

### 10. General (1 endpoint) ⏳ PENDIENTE
- ⏳ `GET /` - Página principal
- ⏳ `GET /api/health` - Health check (mantener en servidor.js)

### 11. General (1 endpoint) ⏳ PENDIENTE
- `GET /` - Página principal

## 🎯 Estructura de Archivos Target

## 🎯 Estructura de Archivos Target

```
backend/src/
├── servidor.js (< 300 líneas) ← OBJETIVO FINAL
│   ├── Imports y configuración
│   ├── Middlewares globales
│   ├── Registro de rutas
│   └── Inicialización del servidor
│
├── routes/
│   ├── auth.routes.js ✅ (20 líneas)
│   ├── admin.routes.js ✅ (40 líneas)
│   ├── predios.routes.js ✅ (68 líneas)
│   ├── networks.routes.js ✅ (67 líneas)
│   ├── organizations.routes.js ✅ (50 líneas)
│   ├── debug.routes.js ✅ (52 líneas)
│   └── index.js ⏳ (central router - pendiente)
│
├── controllers/
│   ├── authController.js ✅ (120 líneas)
│   ├── prediosController.js ✅ (270 líneas)
│   ├── networksController.js ✅ (850+ líneas)
│   ├── organizationsController.js ✅ (62 líneas)
│   └── debugController.js ✅ (220 líneas)
│
├── config/
│   ├── logger.js ✅ (ya existe)
│   └── security.js ✅ (ya existe)
│
└── [otros archivos existentes]
    ├── merakiApi.js ✅ (ya existe)
    ├── prediosManager.js ✅ (ya existe)
    ├── warmCache.js ✅ (ya existe)
    └── transformers.js ✅ (ya existe)
```📝 Siguiente Paso

**Prioridad 1: Predios Routes y Controller**

### Archivos a crear:
1. `routes/predios.routes.js`
2. `controllers/prediosController.js`
## 📝 Siguiente Paso

**Prioridad 1: Integrar rutas en servidor.js** ⏳ SIGUIENTE

### Tareas:
1. ✅ Crear router central `routes/index.js`
2. ✅ Importar todas las rutas en `servidor.js`
3. ✅ Registrar rutas con `app.use()`
4. ✅ Eliminar endpoints duplicados del archivo original
5. ✅ Mantener solo configuración e inicialización
6. ✅ Reducir servidor.js de 5513 → < 300 líneas

### Archivos a modificar:
- `servidor.js` - Integrar rutas y eliminar código migrado
- `routes/index.js` (nuevo) - Router central

### Estructura final servidor.js:
```javascript
// Imports (config, middlewares, rutas)
// Configuración Express
// Middlewares globales (helmet, cors, rate limiters)
// Registro de rutas centralizadas
// Endpoints de health check y raíz
// Inicialización del servidor
// Manejo de errores no capturados
## 🔧 Estrategia de Migración

### Fase 1: Rutas Simples (auth, admin, predios) ✅ 100% COMPLETADO
- ✅ Endpoints con poca lógica
- ✅ Dependencias mínimas
- ✅ Fácil extracción

### Fase 2: Networks y Búsqueda ✅ 100% COMPLETADO
- ✅ Endpoints de búsqueda
- ✅ Sistema de resolución
- ✅ Lazy loading por sección

### Fase 3: Networks Complejos ✅ 100% COMPLETADO
- ✅ Summary con carga lazy
- ✅ Secciones con lógica pesada (topology, switches, APs)
- ✅ Múltiples llamadas API
- ✅ Appliance historical con SSE

### Fase 4: Debug y Organizations ✅ 100% COMPLETADO
- ✅ Endpoints de diagnóstico
- ✅ Llamadas organizacionales
## 📈 Progreso

```
Fase 1: ████████████████████ 100% (5/5 endpoints)    ✅ COMPLETADO
Fase 2: ████████████████████ 100% (9/9 endpoints)    ✅ COMPLETADO
Fase 3: ████████████████████ 100% (4/4 endpoints)    ✅ COMPLETADO
Fase 4: ████████████████████ 100% (7/7 endpoints)    ✅ COMPLETADO
Fase 5: ████████████░░░░░░░░  60% (integración)      ⏳ EN PROGRESO

Total: ██████████████████░░  88% (22/25 endpoints)
```

## ⏱️ Estimación

- **Endpoints migrados:** 22/25 (88%)
- **Archivos creados:** 11 archivos (routes + controllers)
- **Líneas refactorizadas:** ~1,700 líneas modularizadas
- **Tiempo estimado restante:** 15-20 minutos (integración final)
- **Meta final:** servidor.js < 300 líneas
- **Endpoints migrados:** 5/35 (14%)
- **Tiempo estimado restante:** 2-3 horas
- **Archivos pendientes:** ~12 archivos
- **Líneas a refactorizar:** ~5,200 líneas

## 🎯 Beneficios Esperados

✅ **Mantenibilidad:** Archivos pequeños y enfocados  
✅ **Testing:** Funciones aisladas testables  
✅ **Escalabilidad:** Fácil añadir nuevos endpoints  
✅ **Claridad:** Separación de responsabilidades  
---

## 📊 Resumen de Migración

### Endpoints migrados por categoría:
- ✅ **Auth:** 2 endpoints → `auth.routes.js` + `authController.js`
- ✅ **Admin:** 3 endpoints → `admin.routes.js` (usa `authController.js`)
- ✅ **Predios:** 7 endpoints → `predios.routes.js` + `prediosController.js`
- ✅ **Networks:** 10 endpoints → `networks.routes.js` + `networksController.js`
- ✅ **Debug/Cache:** 3 endpoints → `debug.routes.js` + `debugController.js`
- ✅ **Organizations:** 4 endpoints → `organizations.routes.js` + `organizationsController.js`

### Líneas de código por archivo:
- **authController.js:** 120 líneas
- **prediosController.js:** 270 líneas (incluye SSE streaming complejo)
- **networksController.js:** 850+ líneas (incluye lazy loading, topología, LLDP)
- **debugController.js:** 220 líneas (análisis topología + snapshot)
- **organizationsController.js:** 62 líneas

**Total modularizado:** ~1,522 líneas + ~297 líneas de rutas = **~1,819 líneas**

---

**Próximo paso:** Crear router central e integrar todas las rutas en `servidor.js`
---

**Próximo comando:** Crear `predios.routes.js` y `prediosController.js`
