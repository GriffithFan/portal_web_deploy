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
const NETWORK_ID = process.argv[2] || 'L_689050742987694452'; // Predio 603005 por defecto

async function testPortMapping() {
  console.log('Iniciando prueba de mapeo de puertos appliance...\n');
  
  try {
    const url = `${BASE_URL}/api/networks/${NETWORK_ID}/summary`;
  console.log(`Consultando: ${url}`);
    
    const response = await axios.get(url);
    const summary = response.data;
    
  console.log('Respuesta recibida\n');
    
    // Validar estructura
    if (!summary.applianceStatus || !Array.isArray(summary.applianceStatus)) {
      console.log('No se encontró la sección applianceStatus');
      return;
    }
    
    if (summary.applianceStatus.length === 0) {
      console.log('No hay appliances en este network');
      return;
    }
    
    // Iterar sobre appliances
    summary.applianceStatus.forEach((appliance, index) => {
  console.log(`\nAppliance ${index + 1}:`);
      console.log(`   Serial: ${appliance.device?.serial || 'N/A'}`);
      console.log(`   Model: ${appliance.device?.model || 'N/A'}`);
      console.log(`   Status: ${appliance.device?.status || 'N/A'}`);
      
      if (!appliance.uplinks || !Array.isArray(appliance.uplinks)) {
        console.log('   Sin uplinks');
        return;
      }
      
  console.log(`\n   Uplinks (${appliance.uplinks.length}):`);
      
      let mappedCount = 0;
      appliance.uplinks.forEach((uplink) => {
        const hasPortNumber = uplink.portNumber !== undefined && uplink.portNumber !== null;
  const icon = hasPortNumber ? '[OK]' : '[NO]';

  console.log(`   ${icon} ${uplink.interface || 'Unknown'}`);
        console.log(`      - Status: ${uplink.status || 'N/A'}`);
        console.log(`      - Port Number: ${uplink.portNumber !== undefined ? uplink.portNumber : 'NO MAPEADO'}`);
        console.log(`      - Mapping Source: ${uplink._mappingSource || 'N/A'}`);
        console.log(`      - IP: ${uplink.ip || 'N/A'}`);
        
        if (hasPortNumber) {
          mappedCount++;
        }
      });
      
  console.log(`\n   Resultado: ${mappedCount}/${appliance.uplinks.length} uplinks mapeados`);
      
      if (mappedCount === 0) {
        console.log('   ATENCIÓN: Ningún uplink tiene portNumber asignado');
        console.log('   Posibles causas:');
        console.log('   - Modelo no soportado en MODEL_PORT_LAYOUTS');
        console.log('   - Sin puertos uplink activos en switch');
        console.log('   - Error en la función enrichApplianceUplinksWithPortMapping');
      } else if (mappedCount === appliance.uplinks.length) {
        console.log('   ÉXITO: Todos los uplinks están mapeados correctamente');
      } else {
        console.log('   PARCIAL: Solo algunos uplinks están mapeados');
      }
    });
    
    console.log('\n\nPrueba completada');
    
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
