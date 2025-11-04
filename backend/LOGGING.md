# Sistema de Logging con Winston

## Descripción

Sistema de logging profesional implementado con Winston que proporciona logging estructurado, rotación automática de archivos, múltiples niveles de log y separación por categorías.

## Características

### 1. Niveles de Log

El sistema utiliza 5 niveles de log ordenados por prioridad:

- **error** (0): Errores críticos que requieren atención inmediata
- **warn** (1): Advertencias sobre situaciones potencialmente problemáticas
- **info** (2): Información general sobre el funcionamiento del sistema
- **http** (3): Logs de requests HTTP
- **debug** (4): Información detallada para debugging (solo en desarrollo)

### 2. Transports Configurados

#### Consola
- **Desarrollo**: Formato colorizado y legible
- **Producción**: Formato JSON estructurado

#### Archivos con Rotación Diaria

| Archivo | Contenido | Retención | Tamaño Máximo |
|---------|-----------|-----------|---------------|
| `application-%DATE%.log` | Todos los logs | 30 días | 20MB |
| `error-%DATE%.log` | Solo errores | 90 días | 20MB |
| `http-%DATE%.log` | Requests HTTP | 14 días | 50MB |
| `security-%DATE%.log` | Eventos de seguridad | 180 días | 20MB |
| `exceptions-%DATE%.log` | Excepciones no capturadas | 90 días | 20MB |
| `rejections-%DATE%.log` | Promesas rechazadas | 90 días | 20MB |

### 3. Funciones Helper

#### `logger`
Logger principal para uso general:
```javascript
const { logger } = require('./config/logger');

logger.info('Mensaje informativo');
logger.error('Error crítico', { context: 'additional data' });
logger.debug('Debugging info', { data });
```

#### `logRequest(req, res, duration)`
Log automático de requests HTTP (usado por middleware):
```javascript
// Automático via expressLogger()
app.use(expressLogger());
```

#### `logSecurity(event, details)`
Log de eventos de seguridad:
```javascript
const { logSecurity } = require('./config/logger');

logSecurity('Intento de acceso no autorizado', {
  ip: req.ip,
  path: req.path,
  user: req.user
});
```

#### `logError(message, error, context)`
Log estructurado de errores con stack trace:
```javascript
const { logError } = require('./config/logger');

try {
  // código...
} catch (error) {
  logError('Error procesando predio', error, {
    predioCode: '603005',
    networkId: 'L_123'
  });
}
```

#### `logAdmin(action, details)`
Log de operaciones administrativas:
```javascript
const { logAdmin } = require('./config/logger');

logAdmin('Usuario agregado', {
  username: 'nuevo_usuario',
  by: req.user.username
});
```

#### `logCache(operation, details)`
Log de operaciones de caché:
```javascript
const { logCache } = require('./config/logger');

logCache('hit', { key: 'network_123', ttl: 300 });
logCache('miss', { key: 'network_456' });
```

#### `logAPICall(endpoint, details)`
Log de llamadas a API externa (Meraki):
```javascript
const { logAPICall } = require('./config/logger');

logAPICall('/organizations/:orgId/networks', {
  orgId: '123',
  duration: '450ms',
  statusCode: 200
});
```

## Uso en el Código

### Middleware de Express

El logging automático de HTTP requests está integrado como middleware:

```javascript
const { expressLogger } = require('./config/logger');

app.use(expressLogger());
```

Esto registra automáticamente:
- Método HTTP
- URL
- Status code
- Duración del request
- IP del cliente
- User agent
- Usuario autenticado (si existe)

### Reemplazo de console.log

**Antes:**
```javascript
console.log('Servidor iniciado');
console.error('Error crítico:', error);
console.warn('Advertencia');
```

**Después:**
```javascript
const { logger } = require('./config/logger');

logger.info('Servidor iniciado');
logger.error('Error crítico', { error });
logger.warn('Advertencia');
```

### Manejo de Errores Globales

Winston maneja automáticamente:
- `uncaughtException`: Excepciones no capturadas
- `unhandledRejection`: Promesas rechazadas

Los logs se guardan en archivos dedicados.

## Formato de Logs

### Desarrollo (Consola)
```
2025-11-04 13:30:57 [info]: Portal Meraki iniciado en http://127.0.0.1:3000
2025-11-04 13:31:02 [http]: HTTP Request
{
  "method": "GET",
  "url": "/api/networks/search",
  "statusCode": 200,
  "duration": "45ms",
  "ip": "192.168.1.100"
}
```

### Producción (JSON)
```json
{
  "level": "info",
  "message": "Portal Meraki iniciado en http://127.0.0.1:3000",
  "timestamp": "2025-11-04T13:30:57.193Z"
}
{
  "level": "http",
  "message": "HTTP Request",
  "method": "GET",
  "url": "/api/networks/search",
  "statusCode": 200,
  "duration": "45ms",
  "ip": "192.168.1.100",
  "timestamp": "2025-11-04T13:31:02.456Z"
}
```

## Configuración

### Variables de Entorno

```bash
# Nivel de log (development = debug, production = info)
NODE_ENV=production
```

### Personalización

Editar `backend/src/config/logger.js` para:
- Ajustar tamaños máximos de archivo
- Cambiar períodos de retención
- Modificar formatos de salida
- Agregar nuevos transports (email, Slack, etc.)

## Estructura de Directorios

```
backend/
├── logs/                          # Directorio de logs (auto-creado)
│   ├── .gitignore                # Ignora archivos .log
│   ├── .gitkeep                  # Mantiene directorio en Git
│   ├── application-2025-11-04.log
│   ├── error-2025-11-04.log
│   ├── http-2025-11-04.log
│   ├── security-2025-11-04.log
│   ├── exceptions-2025-11-04.log
│   └── rejections-2025-11-04.log
└── src/
    └── config/
        └── logger.js             # Configuración de Winston
```

## Monitoreo y Análisis

### Visualizar Logs en Tiempo Real

**Todos los logs:**
```bash
tail -f backend/logs/application-$(date +%Y-%m-%d).log
```

**Solo errores:**
```bash
tail -f backend/logs/error-$(date +%Y-%m-%d).log
```

**HTTP requests:**
```bash
tail -f backend/logs/http-$(date +%Y-%m-%d).log
```

**Eventos de seguridad:**
```bash
tail -f backend/logs/security-$(date +%Y-%m-$ %d).log
```

### Análisis con jq (JSON)

```bash
# Contar requests por status code
cat backend/logs/http-2025-11-04.log | jq -r '.statusCode' | sort | uniq -c

# Extraer solo errores 500
cat backend/logs/error-2025-11-04.log | jq 'select(.statusCode >= 500)'

# Top 10 endpoints más llamados
cat backend/logs/http-2025-11-04.log | jq -r '.url' | sort | uniq -c | sort -rn | head -10
```

### Búsqueda de Patrones

```bash
# Buscar por IP específica
grep "192.168.1.100" backend/logs/http-$(date +%Y-%m-%d).log

# Buscar errores relacionados con Meraki API
grep "merakiApi" backend/logs/error-$(date +%Y-%m-%d).log
```

## Integración con Herramientas

### ELK Stack (Elasticsearch, Logstash, Kibana)

1. Configurar Logstash para leer logs JSON
2. Indexar en Elasticsearch
3. Visualizar en Kibana

### Grafana + Loki

1. Configurar Promtail para enviar logs a Loki
2. Crear dashboards en Grafana

### Sentry

Agregar transport de Sentry para errores críticos:

```javascript
const Sentry = require('@sentry/node');
const SentryTransport = require('winston-sentry-log');

logger.add(new SentryTransport({
  sentry: {
    dsn: process.env.SENTRY_DSN
  },
  level: 'error'
}));
```

## Mejores Prácticas

### ✅ Hacer

- Usar niveles de log apropiados
- Incluir context relevante en objetos metadata
- Log de operaciones críticas (auth, cache, admin)
- Usar `logError()` para errores con stack trace
- Revisar logs de seguridad regularmente

### ❌ Evitar

- No loggear información sensible (passwords, tokens, API keys)
- No usar console.log directamente
- No loggear en cada línea de código (ruido)
- No loggear objetos circulares (causará error)

### Ejemplo de Buen Log

```javascript
// ✅ Bueno - Estructurado con context
logger.info('Predio cargado exitosamente', {
  predioCode: '603005',
  networkId: 'L_123',
  devices: 45,
  duration: '1.2s'
});

// ❌ Malo - String concatenado sin estructura
console.log('Predio 603005 cargado con 45 dispositivos en 1.2s');
```

## Limpieza Automática

Los logs se rotan y eliminan automáticamente según la configuración:

- **application**: 30 días
- **http**: 14 días  
- **error**: 90 días
- **security**: 180 días
- **exceptions/rejections**: 90 días

No se requiere intervención manual para gestión de espacio.

## Troubleshooting

### Problema: Logs no se generan

**Solución:**
1. Verificar permisos del directorio `logs/`
2. Verificar que NODE_ENV está configurado
3. Revisar errores en consola al iniciar

### Problema: Archivos de log muy grandes

**Solución:**
1. Reducir `maxSize` en `logger.js`
2. Reducir período de retención `maxFiles`
3. Aumentar nivel mínimo de log (de debug a info)

### Problema: Logs no rotan

**Solución:**
1. Verificar que `winston-daily-rotate-file` está instalado
2. Revisar formato de `datePattern`
3. Reiniciar el servidor

---

**Última actualización:** 4 de noviembre de 2025  
**Responsable:** Equipo de Desarrollo  
**Versión:** 1.0.0
