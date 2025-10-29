# Scripts de Mantenimiento

Scripts para gestión del catálogo CSV de predios.

## loadAllPredios.js

Carga inicial de **todos los predios** (~20,000) desde Meraki Dashboard API.

### Uso

```bash
cd backend
node scripts/loadAllPredios.js
```

### Funcionalidades

- Carga masiva de todas las organizaciones
- Rate limiting (5 requests/segundo)
- Extracción inteligente de códigos de 6 dígitos
- Clasificación automática por región y estado
- Procesamiento por lotes con recuperación de errores
- Progreso en tiempo real

### Patrones de Detección

| Formato de Red | Código Extraído |
|----------------|-----------------|
| `603005` | `603005` |
| `SUC_603005` | `603005` |
| `PREDIO 603-005` | `603005` |
| `Centro_PRD123` | `123` |
| `Sucursal 4567-89` | `456789` |

### Clasificación

**Regiones:**
- Keywords: norte, sur, este, oeste, centro, cdmx, guadalajara, monterrey
- Default: "Sin asignar"

**Estados:**
- `activo` (default)
- `mantenimiento` (si contiene "mant")
- `prueba` (si contiene "test")
- `temporal` (si contiene "temp")
- `offline` (si contiene "offline")

## updatePredios.js

Actualización incremental del catálogo sin rebuild completo.

```bash
node scripts/updatePredios.js
```

## dumpSummary.js

Exporta snapshot completo de un predio.

```bash
node scripts/dumpSummary.js <predio_code>
# Ejemplo: node scripts/dumpSummary.js 602360
```

## checkPrediosDuplicates.js

Verifica duplicados en el CSV.

```bash
node scripts/checkPrediosDuplicates.js
```

## dedupePrediosCsv.js

Elimina duplicados del CSV.

```bash
node scripts/dedupePrediosCsv.js
```

---

**IMPORTANTE:** Ejecutar `loadAllPredios.js` al menos una vez después del deployment inicial. Este proceso toma ~5-10 minutos y es crítico para que la búsqueda de predios funcione.
