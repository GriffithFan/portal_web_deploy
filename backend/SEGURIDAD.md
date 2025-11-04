# Medidas de Seguridad Implementadas

## Resumen
Este documento detalla las medidas de seguridad implementadas en el backend del Portal Meraki para proteger la API contra ataques comunes y garantizar la seguridad de los datos.

## 1. Headers de Seguridad (Helmet)

**Ubicación:** `src/middleware/security.js` → `configurarHelmet()`

**Características:**
- **Content Security Policy (CSP)**: Controla los recursos que pueden cargarse
  - Scripts, estilos, imágenes y fuentes limitados a fuentes confiables
  - Previene ataques XSS bloqueando scripts inline no autorizados
- **HSTS (HTTP Strict Transport Security)**: Fuerza conexiones HTTPS
  - Max-age: 1 año (31536000 segundos)
  - Include subdomains: activado
  - Preload: habilitado
- **Cross-Origin Policies**: Protección contra ataques de origen cruzado

**Configuración:**
```javascript
helmet({
  contentSecurityPolicy: { /* políticas restrictivas */ },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
})
```

## 2. Rate Limiting (Limitación de Tasa)

**Ubicación:** `src/middleware/security.js` → Limiters múltiples

### 2.1 Limiter General (API completa)
- **Ventana:** 15 minutos
- **Límite:** 1000 requests por IP
- **Aplicado a:** Todas las rutas `/api/*`

### 2.2 Limiter de Autenticación (Endpoints críticos)
- **Ventana:** 15 minutos
- **Límite:** 10 intentos por IP
- **Aplicado a:**
  - `POST /api/login`
  - `POST /api/admin/login`
- **Característica especial:** `skipSuccessfulRequests: true` (no cuenta logins exitosos)

### 2.3 Limiter de Datos Intensivos
- **Ventana:** 5 minutos
- **Límite:** 100 requests por IP
- **Aplicado a:**
  - `GET /api/networks/:networkId/section/:sectionKey`
  - `GET /api/networks/:networkId/summary`
  - `GET /api/networks/:networkId/topology_discovery`
  - `GET /api/debug/topology/:networkId`

### 2.4 Limiter de Escritura
- **Ventana:** 15 minutos
- **Límite:** 50 operaciones por IP
- **Aplicado a:**
  - `POST /api/tecnicos`
  - `DELETE /api/tecnicos/:username`
  - `POST /api/cache/clear`
  - `DELETE /api/cache`
  - `POST /api/predios/refresh`
  - `POST /api/predios/sync`
  - `POST /api/predios/sync-stream`

**Beneficios:**
- Previene ataques de fuerza bruta
- Protege contra DoS (Denial of Service)
- Reduce carga del servidor
- Headers informativos: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

## 3. Validación y Sanitización de Inputs

### 3.1 Sanitización de Strings
**Función:** `sanitizarInputs()`

**Protege contra:**
- XSS (Cross-Site Scripting)
- Inyección de código HTML

**Aplica a:**
- Query parameters (`req.query`)
- Request body (`req.body`)

**Operaciones:**
- Elimina tags `<script>` completos
- Remueve tags HTML arbitrarios
- Trim de espacios en blanco

### 3.2 Prevención de Parameter Pollution
**Función:** `prevenirParameterPollution()`

**Protege contra:**
- HTTP Parameter Pollution (HPP)
- Arrays inesperados en parámetros críticos

**Parámetros protegidos:**
- `organizationId`
- `networkId`
- `deviceSerial`
- `predio`
- `usuario`

**Comportamiento:** Si recibe array, toma solo el primer valor

### 3.3 Validación de Formato de IDs
**Función:** `validarFormatoIds()`

**Valida:**
- `organizationId`: Solo caracteres alfanuméricos, guiones y underscores
- `networkId`: Mismo patrón de validación

**Respuesta en error:** HTTP 400 con mensaje descriptivo

## 4. Protección CSRF (Cross-Site Request Forgery)

**Función:** `proteccionCSRF()`

**Mecanismo:**
- Verifica header `X-Requested-With: XMLHttpRequest` en requests de modificación
- Solo aplica a: POST, PUT, DELETE, PATCH

**Beneficios:**
- Previene requests maliciosos desde sitios externos
- No afecta requests GET (seguros por definición)

**Configuración del cliente:**
```javascript
fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify(data)
})
```

## 5. Detección de Requests Sospechosos

**Función:** `logRequestsSospechosos()`

**Detecta patrones de:**
- Path traversal: `../`
- SQL injection: `union select`
- XSS: `javascript:`, `<script>`
- Code injection: `eval(`
- Acceso a archivos sensibles: `.env`, `/etc/`

**Acciones:**
- Log en consola con nivel WARNING
- Incluye: IP, path, query parameters
- No bloquea el request (solo auditoría)
- **Recomendación futura:** Integrar con sistema de alertas

## 6. Configuración de CORS

**Ubicación:** `src/servidor.js` → `corsOptions`

**Características:**
- **Desarrollo:** Permite cualquier origen
- **Producción:** Lista blanca de dominios específicos
- **Configuración dinámica:** Variable de entorno `CORS_ORIGINS`
- **Credentials:** Habilitado para cookies/autenticación

**Orígenes permitidos (predeterminados):**
- `http://localhost:5173` (Vite dev)
- `http://localhost:5174`
- `https://portal-meraki.tu-empresa.com`

## 7. Trust Proxy para Cloudflare

**Configuración:** `app.set('trust proxy', true)`

**Beneficios:**
- Lee correctamente IP real desde headers:
  - `cf-connecting-ip` (Cloudflare)
  - `x-forwarded-for` (proxies estándar)
- Rate limiting efectivo detrás de proxy
- Logs con IPs reales

## 8. Límite de Tamaño de Payload

**Configuración:** `app.use(express.json({ limit: '10mb' }))`

**Protege contra:**
- Ataques de agotamiento de memoria
- Payloads excesivamente grandes

## 9. Variables de Entorno Sensibles

**Archivo:** `.env` (NO incluido en git)

**Variables críticas:**
- `ADMIN_KEY`: Clave maestra de administrador
- `MERAKI_API_KEY`: Clave de API de Meraki
- `CORS_ORIGINS`: Dominios permitidos para CORS
- `NODE_ENV`: Entorno de ejecución

**Protección:**
- Nunca expuestas en logs públicos
- Cargadas solo en el servidor
- Validación antes de uso

## Orden de Aplicación de Middlewares

```
1. Trust Proxy
2. Helmet (headers de seguridad)
3. CORS
4. Body Parser (con límite de tamaño)
5. Log de requests sospechosos
6. Sanitización de inputs
7. Prevención de parameter pollution
8. Validación de formato de IDs
9. Rate limiting general (/api/*)
10. Rate limiters específicos (por endpoint)
11. Rutas y controladores
```

## Recomendaciones para Producción

### Configuraciones Adicionales Recomendadas

1. **Sistema de Alertas:**
   - Integrar logs sospechosos con Sentry, Datadog o similar
   - Alertas en tiempo real para patrones de ataque

2. **WAF (Web Application Firewall):**
   - Cloudflare WAF activado
   - Reglas personalizadas para patrones específicos

3. **Auditoría y Monitoreo:**
   - Implementar Winston para logging estructurado (próxima tarea)
   - Dashboard de métricas de seguridad
   - Análisis de intentos de breach

4. **Secrets Management:**
   - Considerar HashiCorp Vault o AWS Secrets Manager
   - Rotación automática de claves

5. **HTTPS Obligatorio:**
   - Redirect HTTP → HTTPS en Nginx/Cloudflare
   - Certificados SSL/TLS válidos

6. **Rate Limiting Avanzado:**
   - Usar Redis para rate limiting distribuido
   - Diferente límites por rol de usuario

7. **Autenticación Avanzada:**
   - Considerar JWT con refresh tokens
   - 2FA para usuarios admin

## Testing de Seguridad

### Comandos de Prueba

```bash
# Test rate limiting
for i in {1..15}; do curl http://localhost:3000/api/login -d '{"username":"test","password":"test"}' -H "Content-Type: application/json"; done

# Test CSRF protection
curl -X POST http://localhost:3000/api/tecnicos -d '{"username":"test","password":"test"}' -H "Content-Type: application/json"
# Debería retornar 403

# Test con header CSRF
curl -X POST http://localhost:3000/api/tecnicos -d '{"username":"test","password":"test"}' -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -H "x-admin-key: YOUR_KEY"
# Debería funcionar

# Test headers de seguridad
curl -I http://localhost:3000/api/health
# Verificar headers: Strict-Transport-Security, Content-Security-Policy, etc.
```

## Cumplimiento y Estándares

✅ **OWASP Top 10 (2021):**
- A01:2021 – Broken Access Control: Mitigado con autenticación y rate limiting
- A02:2021 – Cryptographic Failures: HTTPS + HSTS
- A03:2021 – Injection: Sanitización de inputs
- A05:2021 – Security Misconfiguration: Headers seguros, configuración explícita
- A07:2021 – Identification and Authentication Failures: Rate limiting en login

✅ **Mejores Prácticas de Express.js:**
- Helmet activado
- Trust proxy configurado
- Rate limiting implementado
- CORS restrictivo en producción
- Validación de inputs
- Logs de seguridad

## Mantenimiento

- **Revisar dependencias:** `npm audit` mensualmente
- **Actualizar limiters:** Ajustar según patrones de uso real
- **Revisar logs:** Análisis semanal de requests sospechosos
- **Testing:** Pruebas de penetración trimestrales

---

**Última actualización:** 4 de noviembre de 2025
**Responsable:** Equipo de Desarrollo
**Versión:** 1.0.0
