# Investigación API Meraki - Velocidad de Puertos WAN

**Fecha:** 17 de diciembre de 2025  
**Actualizado:** 17 de diciembre de 2025 (pruebas directas con API)  
**Objetivo:** Obtener la velocidad ACTUAL negociada del puerto WAN en dispositivos appliance (MX, Z3, UTM)  
**Valores esperados:** 10 Mbps, 100 Mbps, 1000 Mbps (velocidad negociada, no máxima soportada)

---

## Resumen Ejecutivo

La API de Meraki **NO expone la velocidad negociada de puertos WAN** en dispositivos appliance (MX, Z3, UTM). Esto fue confirmado mediante pruebas directas contra la API el 17/12/2025.

### Hallazgos clave:

| Endpoint | Resultado |
|----------|-----------|
| `GET /devices/{serial}/appliance/ports/statuses` | **404 Not Found** (no disponible para MX84) |
| `GET /devices/{serial}/appliance/uplinks/settings` | Solo configuración, sin velocidad |
| `GET /organizations/{orgId}/appliance/uplink/statuses` | Sin campo speed en respuesta |
| `POST /devices/{serial}/liveTools/cableTest` | **403 Forbidden** (requiere permisos especiales) |
| `GET /devices/{serial}/switch/ports/statuses` | ✅ **SÍ incluye velocidad** (solo switches) |

### Conclusión:
Para obtener velocidad de puertos WAN en appliances, las opciones son:
1. **LLDP/CDP inference** - Si el modem/ISP reporta información
2. **Switch uplink port** - Velocidad del puerto del switch conectado al MX (ej: puerto 23 = 1 Gbps)
3. **Cable Test** - Requiere permisos API especiales y es bajo demanda

---

## Endpoints Investigados

### 1. Endpoints de Appliance (SIN velocidad)

| Endpoint | Descripción | Campos disponibles |
|----------|-------------|-------------------|
| `GET /networks/{networkId}/appliance/ports` | Configuración de puertos | `number`, `enabled`, `type`, `vlan`, `allowedVlans`, `accessPolicy` |
| `GET /devices/{serial}/appliance/ports/statuses` | Estado de puertos | Similar, **SIN campo speed documentado** |
| `GET /organizations/{orgId}/appliance/uplink/statuses` | Estado de uplinks | `interface`, `status`, `ip`, `publicIp`, `gateway`, `loss`, `latency`, `jitter` |
| `GET /networks/{networkId}/appliance/uplinks/statuses` | Estado de uplinks por red | Igual que arriba |

### 2. Endpoints que SÍ incluyen velocidad

| Endpoint | Campo de velocidad | Dispositivos | Notas |
|----------|-------------------|--------------|-------|
| `GET /devices/{serial}/switch/ports/statuses` | `speed` | **Switches** | Valores: "10 Gbps", "1 Gbps", "100 Mbps", etc. |
| `GET /organizations/{orgId}/wireless/devices/ethernetStatuses` | `ports[].linkNegotiation.speed` | **APs** | Velocidad del puerto Ethernet del AP |
| `POST /devices/{serial}/liveTools/cableTest` | `speedMbps` | **Todos** | Bajo demanda, rate limited |

### 3. Estructura de respuesta switch ports (referencia)

```json
{
  "portId": "1",
  "enabled": true,
  "status": "Connected",
  "speed": "1 Gbps",
  "duplex": "full",
  "isUplink": false,
  "poe": { "isAllocated": false },
  "lldp": { "systemName": "...", "portId": "..." },
  "cdp": { "platform": "...", "deviceId": "..." }
}
```

**Valores posibles de `speed`:**
- `""` (vacío)
- `"10 Mbps"`
- `"100 Mbps"`
- `"1 Gbps"`
- `"2.5 Gbps"`
- `"5 Gbps"`
- `"10 Gbps"`
- `"20 Gbps"`
- `"25 Gbps"`
- `"40 Gbps"`
- `"50 Gbps"`
- `"100 Gbps"`

---

## Alternativas Implementadas/Disponibles

### Opción A: Inferencia desde LLDP/CDP (Actual)

**Ubicación:** `servidor.js` líneas 1917-1926 (`fillDeviceConnectionFromLldp`)

```javascript
if (!device.wiredSpeed) {
  const descriptor = [cdpInfo?.platform, lldpInfo?.systemDescription, lldpInfo?.portDescription].filter(Boolean).join(' ');
  if (/10g|10000/i.test(descriptor)) {
    device.wiredSpeed = '10 Gbps';
  } else if (/2500|2\.5g/i.test(descriptor)) {
    device.wiredSpeed = '2.5 Gbps';
  } else if (/gigabit|1000/i.test(descriptor)) {
    device.wiredSpeed = '1000 Mbps';
  } else if (/100m|fast ethernet/i.test(descriptor)) {
    device.wiredSpeed = '100 Mbps';
  }
}
```

**Ventajas:** No requiere llamadas adicionales  
**Limitaciones:** Depende de información proporcionada por equipo conectado (modem/ISP)

### Opción B: Cable Test (Live Tool)

**Endpoint:** `POST /devices/{serial}/liveTools/cableTest`

```javascript
// Ejemplo de respuesta
{
  "cableTestId": "1284392014819",
  "status": "complete",
  "results": [
    {
      "port": "2",
      "status": "up",
      "speedMbps": 1000,
      "pairs": [...]
    }
  ]
}
```

**Ventajas:** Velocidad exacta  
**Limitaciones:** 
- Es asíncrono (hay que esperar resultado)
- Rate limit: 1 request cada 5 segundos por dispositivo
- Requiere especificar puertos

### Opción C: Verificar datos no documentados

Agregar logging para capturar respuesta real de `/devices/{serial}/appliance/ports/statuses`:

```javascript
const portStatuses = await getDeviceAppliancePortsStatuses(serial);
console.log('[DEBUG] Appliance port statuses:', JSON.stringify(portStatuses, null, 2));
```

---

## Funciones Existentes en el Código

### merakiApi.js

| Función | Línea | Endpoint |
|---------|-------|----------|
| `getApplianceStatuses(networkId)` | 131 | `/networks/{networkId}/appliance/uplinks/statuses` |
| `getDeviceUplink(serial)` | 263 | `/devices/{serial}/uplink` |
| `getDeviceAppliancePortsStatuses(serial)` | 320 | `/devices/{serial}/appliance/ports/statuses` |
| `getOrgApplianceUplinkStatuses(organizationId)` | 533 | `/organizations/{orgId}/appliance/uplink/statuses` |
| `getAppliancePorts(networkId)` | 315 | `/networks/{networkId}/appliance/ports` |
| `getDeviceLldpCdp(serial)` | 231 | `/devices/{serial}/lldpCdp` |

### servidor.js

| Función | Línea | Propósito |
|---------|-------|-----------|
| `normalizeApplianceUplinks()` | 1766 | Normaliza datos de uplinks (NO incluye speed) |
| `flattenAppliancePortStatuses()` | 1943 | Extrae datos de puertos (incluye speed si viene) |
| `mergeAppliancePorts()` | 2007 | Fusiona configs, statuses y uplinks |
| `fillDeviceConnectionFromLldp()` | 1871 | Infiere velocidad desde LLDP/CDP |

---

## Mejoras Sugeridas

### Para Appliances (MX, Z3, UTM)

1. **Agregar logging** para verificar si `/devices/{serial}/appliance/ports/statuses` devuelve speed
2. **Implementar Cable Test** como opción bajo demanda en el UI
3. **Mejorar inferencia LLDP/CDP** con más patrones

### Para Switches

Ya funcional - el endpoint devuelve `speed` directamente:
```javascript
// servidor.js línea 1858
speed: port.speed ?? port.speedMbps ?? port.linkSpeed
```

### Para Access Points

Usar endpoint de ethernet statuses:
```javascript
// ethernetStatus.ports[0].linkNegotiation.speed
// Implementado en líneas 1395-1402
```

---

## Datos Disponibles en Uplinks (sin speed)

```javascript
// Estructura actual de normalizeApplianceUplinks
{
  serial: "Q2XX-XXXX-XXXX",
  interface: "wan1",
  status: "active",
  statusNormalized: "online",
  ip: "192.168.1.100",
  publicIp: "203.0.113.50",
  subnet: "192.168.1.0/24",
  gateway: "192.168.1.1",
  latency: 25,
  loss: 0.5,
  jitter: 2,
  connectionType: "dhcp",
  usingStaticIp: false,
  provider: "Telmex"
}
```

---

## Implementación Realizada (17/12/2025)

### Tooltip WAN con información de Uplink

Se agregó un tooltip completo a los puertos WAN en el componente `AppliancePortsMatrix.jsx` que muestra:

- **Status**: Estado de conexión (connected/disconnected)
- **IP Address**: Dirección IP privada
- **Public IP**: Dirección IP pública
- **Gateway**: Puerta de enlace
- **Provider**: Proveedor de internet (si está disponible)
- **Latency**: Latencia en ms
- **Packet Loss**: Pérdida de paquetes (%)
- **Jitter**: Variación de latencia en ms
- **Speed**: Velocidad (si está disponible vía LLDP/CDP)
- **Connection**: Tipo de conexión (DHCP/Static)

**Archivos modificados:**
- `frontend/src/components/AppliancePortsMatrix.jsx`
  - Función `NodePortIcon`: Líneas 231-303 (nuevo wanTooltipContent)
  - Función `NodePortIconSfp`: Mismo patrón agregado

**Código clave:**
```javascript
const isWanPort = port.role === 'wan' || port.type === 'wan' || !!port.uplink;
const uplink = port.uplink || {};
// ... tooltip con uplink.ip, uplink.publicIp, uplink.latency, etc.
```

---

## TODO: Mejoras Futuras

- [x] ~~Implementar tooltip en puertos WAN mostrando: IP, publicIP, latency, loss, provider, speed~~
- [ ] Agregar campo `speed` a uplinks si la API lo devuelve (verificar con logging en producción)
- [ ] Agregar opción de Cable Test bajo demanda en UI
- [ ] Mejorar patrones de detección LLDP/CDP para velocidad
- [ ] Unificar visualización de velocidad en switches, APs y appliances
- [ ] Considerar endpoint `getOrganizationWirelessDevicesEthernetStatuses` para APs

---

## Referencias

- [Meraki API Index](https://developer.cisco.com/meraki/api-v1/)
- [OpenAPI Spec](https://github.com/meraki/openapi)
- [Python SDK](https://github.com/meraki/dashboard-api-python)
