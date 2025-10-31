#!/usr/bin/env node
/**
 * Script de Validación: Mapeo de Puertos Appliance
 *
 * Prueba que los uplinks de appliances incluyan el campo portNumber
 *
 * Uso:
 *   node backend/scripts/testPortMapping.js [networkId]
 *
 * Ejemplo:
 *   node backend/scripts/testPortMapping.js L_689050742987694452
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const NETWORK_ID = process.argv[2] || 'L_689050742987694452'; // Predio por defecto

async function testPortMapping() {
  console.info('Iniciando prueba de mapeo de puertos appliance...\n');

  try {
    const url = `${BASE_URL}/api/networks/${NETWORK_ID}/summary`;
    console.info(`Consultando: ${url}`);

    const response = await axios.get(url);
    const summary = response.data;

    console.info('Respuesta recibida\n');

    // Validar estructura
    if (!summary || !summary.applianceStatus || !Array.isArray(summary.applianceStatus)) {
      console.warn('No se encontró la sección applianceStatus en la respuesta');
      return;
    }

    if (summary.applianceStatus.length === 0) {
      console.info('No hay appliances en este network');
      return;
    }

    // Iterar sobre appliances
    summary.applianceStatus.forEach((appliance, index) => {
      console.info(`\nAppliance ${index + 1}:`);
      console.info(`   Serial: ${appliance.device?.serial || 'N/A'}`);
      console.info(`   Model: ${appliance.device?.model || 'N/A'}`);
      console.info(`   Status: ${appliance.device?.status || 'N/A'}`);

      if (!appliance.uplinks || !Array.isArray(appliance.uplinks) || appliance.uplinks.length === 0) {
        console.info('   Sin uplinks');
        return;
      }

      console.info(`\n   Uplinks (${appliance.uplinks.length}):`);

      let mappedCount = 0;
      appliance.uplinks.forEach((uplink) => {
        const hasPortNumber = uplink.portNumber !== undefined && uplink.portNumber !== null;
        const icon = hasPortNumber ? 'OK' : 'NO';

        console.info(`   ${icon} ${uplink.interface || 'Unknown'}`);
        console.info(`      - Status: ${uplink.status || 'N/A'}`);
        console.info(`      - Port Number: ${uplink.portNumber !== undefined ? uplink.portNumber : 'NO MAPEADO'}`);
        console.info(`      - Mapping Source: ${uplink._mappingSource || 'N/A'}`);
        console.info(`      - IP: ${uplink.ip || 'N/A'}`);

        if (hasPortNumber) mappedCount += 1;
      });

      console.info(`\n   Resultado: ${mappedCount}/${appliance.uplinks.length} uplinks mapeados`);

      if (mappedCount === 0) {
        console.warn('   Ningún uplink tiene portNumber asignado');
        console.info('   Posibles causas:');
        console.info('   - Modelo no soportado en MODEL_PORT_LAYOUTS');
        console.info('   - Sin puertos uplink activos en switch');
        console.info('   - Error en la función enrichApplianceUplinksWithPortMapping');
      } else if (mappedCount === appliance.uplinks.length) {
        console.info('   Éxito: Todos los uplinks están mapeados correctamente');
      } else {
        console.info('   Parcial: Solo algunos uplinks están mapeados');
      }
    });

    console.info('\nPrueba completada');

  } catch (error) {
    console.error('\nError durante la prueba:');

    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.message}`);
    } else if (error.request) {
      console.error('   No se pudo conectar al servidor');
      console.error(`   Verifica que el backend esté corriendo en ${BASE_URL}`);
    } else {
      console.error(`   ${error.message}`);
    }

    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPortMapping();
}

module.exports = { testPortMapping };
