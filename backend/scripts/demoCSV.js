#!/usr/bin/env node

/**
 * Script de demostración del sistema CSV de predios
 * Muestra cómo usar las funciones del prediosManager
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { 
  findPredio, 
  searchPredios, 
  getNetworkIdForPredio, 
  getPredioInfoForNetwork,
  getStats 
} = require('../src/prediosManager');

/**
 * Demostración de búsquedas
 */
async function demoSearches() {
  console.log('Demostración del Sistema de Predios CSV\n');
  
  // 1. Búsqueda por código de predio
  console.log('1) Búsqueda por código de predio:');
  const predioEjemplo = findPredio('PRD001');
  if (predioEjemplo) {
  console.log(`   Encontrado: ${predioEjemplo.predio_name} (${predioEjemplo.network_id})`);
  } else {
  console.log('   No encontrado - usar código real después de cargar CSV');
  }
  
  // 2. Búsqueda por network ID
  console.log('\n2) Búsqueda por Network ID:');
  const networkEjemplo = findPredio('L_123456789012345678');
  if (networkEjemplo) {
  console.log(`   Encontrado: ${networkEjemplo.predio_name} en ${networkEjemplo.region}`);
  } else {
  console.log('   No encontrado - usar Network ID real después de cargar CSV');
  }
  
  // 3. Búsqueda por texto
  console.log('\n3) Búsqueda por texto:');
  const resultadosTexto = searchPredios({ search: 'centro' });
  console.log(`   ${resultadosTexto.length} predios contienen "centro"`);
  if (resultadosTexto.length > 0) {
    resultadosTexto.slice(0, 3).forEach(p => {
      console.log(`      → ${p.predio_name} (${p.predio_code})`);
    });
    if (resultadosTexto.length > 3) {
      console.log(`      ... y ${resultadosTexto.length - 3} más`);
    }
  }
  
  // 4. Búsqueda por región
  console.log('\n4) Búsqueda por región:');
  const resultadosNorte = searchPredios({ region: 'Norte' });
  console.log(`   ${resultadosNorte.length} predios en región Norte`);
  
  // 5. Búsqueda por estado
  console.log('\n5) Búsqueda por estado:');
  const resultadosActivos = searchPredios({ estado: 'activo' });
  console.log(`   ${resultadosActivos.length} predios en estado activo`);
  
  // 6. Búsqueda combinada
  console.log('\n6) Búsqueda combinada (Norte + Activo):');
  const resultadosCombinados = searchPredios({ 
    region: 'Norte', 
    estado: 'activo' 
  });
  console.log(`   ${resultadosCombinados.length} predios Norte + Activo`);
  
  // 7. Estadísticas generales
  console.log('\n7) Estadísticas del CSV:');
  try {
    const stats = getStats();
  console.log(`   Total de predios: ${stats.total}`);
    
  console.log('\n   Por región:');
    Object.entries(stats.porRegion).forEach(([region, count]) => {
      console.log(`      → ${region}: ${count} predios`);
    });
    
  console.log('\n   Por estado:');
    Object.entries(stats.porEstado).forEach(([estado, count]) => {
      console.log(`      → ${estado}: ${count} predios`);
    });
    
  console.log('\n   Por organización:');
    const topOrgs = Object.entries(stats.porOrganizacion)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    topOrgs.forEach(([orgId, count]) => {
      console.log(`      → ${orgId}: ${count} predios`);
    });
    
  } catch (error) {
  console.log('   CSV no cargado aún. Ejecuta: npm run load-predios');
  }
}

/**
 * Ejemplos de uso en endpoints
 */
function demoEndpointUsage() {
  console.log('\n\nEjemplos de uso en endpoints API:\n');
  
  console.log('Resolver predio por código:');
  console.log('   GET /api/resolve-network?q=603005');
  console.log('   GET /api/resolve-network?q=PRD001');
  
  console.log('\nBuscar predios:');
  console.log('   GET /api/predios/search?q=centro');
  console.log('   GET /api/predios/search?region=Norte');
  console.log('   GET /api/predios/search?estado=activo');
  console.log('   GET /api/predios/search?q=sucursal&region=Sur');
  
  console.log('\nObtener predio específico:');
  console.log('   GET /api/predios/PRD001');
  console.log('   GET /api/predios/L_123456789012345678');
  
  console.log('\nAdministración (requiere x-admin-key):');
  console.log('   GET /api/predios/stats');
  console.log('   POST /api/predios/refresh');
  
  console.log('\nRendimiento optimizado:');
  console.log('   • Búsqueda instantánea por código/ID');
  console.log('   • Sin consultas a API de Meraki para resolución');
  console.log('   • Datos enriquecidos con región y estado');
  console.log('   • Cache automático con detección de cambios');
}

/**
 * Casos de uso típicos
 */
function demoUseCases() {
  console.log('\n\nCasos de uso típicos:\n');
  
  console.log('Caso 1: Técnico busca predio "603005"');
  console.log('   Antes: Recorrer 45 organizaciones → 5-10 segundos');
  console.log('   Ahora: Búsqueda directa en CSV → <100ms');
  
  console.log('\nCaso 2: Dashboard carga múltiples predios');
  console.log('   Antes: N consultas API → rate limiting');
  console.log('   Ahora: Datos pre-cargados → instantáneo');
  
  console.log('\nCaso 3: Filtrar predios por región/estado');
  console.log('   Antes: No disponible sin consultas masivas');
  console.log('   Ahora: Filtros instantáneos → reportes rápidos');
  
  console.log('\nCaso 4: Autocompletado de predios');
  console.log('   Antes: Imposible sin impacto en rendimiento');
  console.log('   Ahora: Búsqueda de texto → UX mejorado');
}

/**
 * Función principal
 */
async function main() {
  await demoSearches();
  demoEndpointUsage();
  demoUseCases();
  
  console.log('\nPara cargar el CSV con tus datos reales:');
  console.log('   cd backend && npm run load-predios');
  console.log('\nEl sistema estará optimizado para 20,000+ predios.');
}

// Ejecutar demostración
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { demoSearches, demoEndpointUsage, demoUseCases };