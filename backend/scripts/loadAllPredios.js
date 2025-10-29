#!/usr/bin/env node

/**
 * Script para cargar todos los predios disponibles en el CSV
 * Elimina la necesidad de búsquedas manuales por organizaciones
 * 
 * Uso: node scripts/loadAllPredios.js
 */

const path = require('path');
const fs = require('fs');

// Cargar configuración desde el backend
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getOrganizations, getNetworks } = require('../src/merakiApi');

// Configuración del script
const CSV_PATH = path.join(__dirname, '..', 'data', 'predios.csv');
const BATCH_SIZE = 50; // Procesar en lotes para evitar rate limiting
const DELAY_MS = 200; // Delay entre lotes (5 requests/segundo max Meraki)

// Headers del CSV
const CSV_HEADER = 'network_id,predio_code,predio_name,organization_id,organization_name,region,estado';

/**
 * Extrae código de predio del nombre de la red
 */
function extractPredioCode(networkName) {
  // Patrones comunes para códigos de predio
  const patterns = [
    /(\d{6})/,           // 6 dígitos consecutivos
    /(\d{3}-\d{3})/,     // XXX-XXX
    /(\d{4}-\d{2})/,     // XXXX-XX
    /PRD(\d+)/i,         // PRD seguido de números
    /PREDIO[_\s]*(\d+)/i, // PREDIO_XXX o PREDIO XXX
    /SUC[_\s]*(\d+)/i,   // SUC_XXX o SUC XXX
    /(\d{3,7})/          // Entre 3 y 7 dígitos
  ];

  for (const pattern of patterns) {
    const match = networkName.match(pattern);
    if (match) {
      return match[1].replace(/[-_\s]/g, ''); // Limpiar separadores
    }
  }

  // Si no encuentra patrón, usar primeros caracteres alfanuméricos
  const clean = networkName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  return clean || 'UNKNOWN';
}

/**
 * Determina la región basada en el nombre o organización
 */
function determineRegion(networkName, orgName) {
  const text = `${networkName} ${orgName}`.toLowerCase();
  
  if (text.includes('norte') || text.includes('north')) return 'Norte';
  if (text.includes('sur') || text.includes('south')) return 'Sur';
  if (text.includes('este') || text.includes('east')) return 'Este';
  if (text.includes('oeste') || text.includes('west')) return 'Oeste';
  if (text.includes('centro') || text.includes('center')) return 'Centro';
  if (text.includes('cdmx') || text.includes('ciudad')) return 'CDMX';
  if (text.includes('guadalajara') || text.includes('gdl')) return 'Occidente';
  if (text.includes('monterrey') || text.includes('mty')) return 'Noreste';
  
  return 'Sin asignar';
}

/**
 * Determina el estado operativo basado en el nombre
 */
function determineEstado(networkName) {
  const name = networkName.toLowerCase();
  
  if (name.includes('mant') || name.includes('maintenance')) return 'mantenimiento';
  if (name.includes('test') || name.includes('prueba')) return 'prueba';
  if (name.includes('temp') || name.includes('temporal')) return 'temporal';
  if (name.includes('offline') || name.includes('down')) return 'offline';
  if (name.includes('backup') || name.includes('respaldo')) return 'backup';
  
  return 'activo';
}

/**
 * Procesa una organización y obtiene todas sus redes
 */
async function processOrganization(org, options = {}) {
  const {
    seenNetworkIds,
    seenPredioCodes,
    progressCallback,
  } = options;
  try {
  console.log(`\nProcesando organización: ${org.name} (${org.id})`);
    
    const networks = await getNetworks(org.id);
    console.log(`   → ${networks.length} redes encontradas`);
    
    const predios = [];
    let duplicatesByNetwork = 0;
    let duplicatesByCode = 0;
    
    for (const network of networks) {
      if (seenNetworkIds && seenNetworkIds.has(network.id)) {
        duplicatesByNetwork += 1;
        continue;
      }

      const predioCode = extractPredioCode(network.name);
      const region = determineRegion(network.name, org.name);
      const estado = determineEstado(network.name);
      const normalizedCode = predioCode ? predioCode.toString().toUpperCase() : '';

      if (seenPredioCodes && normalizedCode) {
        const existing = seenPredioCodes.get(normalizedCode);
        if (existing && !existing.has(network.id)) {
          duplicatesByCode += 1;
        }
      }
      
      const predio = {
        network_id: network.id,
        predio_code: predioCode,
        predio_name: network.name,
        organization_id: org.id,
        organization_name: org.name,
        region: region,
        estado: estado
      };
      
      if (seenNetworkIds) {
        seenNetworkIds.add(network.id);
      }
      if (seenPredioCodes && normalizedCode) {
        const codeSet = seenPredioCodes.get(normalizedCode) || new Set();
        codeSet.add(network.id);
        seenPredioCodes.set(normalizedCode, codeSet);
      }
      
      predios.push(predio);
    }
    
    if (progressCallback) {
      progressCallback(org, predios, { duplicatesByNetwork, duplicatesByCode });
    }
    
    return {
      predios,
      duplicatesByNetwork,
      duplicatesByCode
    };
    
  } catch (error) {
    console.error(`Error procesando organización ${org.id}:`, error.message);
    return {
      predios: [],
      duplicatesByNetwork: 0,
      duplicatesByCode: 0
    };
  }
}

/**
 * Delay para respetar rate limits
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Guarda predios en CSV de forma incremental
 */
function formatPredioRow(predio) {
  const safeName = (predio.predio_name || '').replace(/"/g, '""');
  const safeOrgName = (predio.organization_name || '').replace(/"/g, '""');
  return `${predio.network_id},${predio.predio_code},"${safeName}",${predio.organization_id},"${safeOrgName}",${predio.region},${predio.estado}`;
}

function appendToCSV(predios, isFirst = false) {
  const dataDir = path.dirname(CSV_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const content = predios.map(formatPredioRow).join('\n');
  
  if (isFirst) {
    // Primera escritura: crear archivo con header
    fs.writeFileSync(CSV_PATH, `${CSV_HEADER}\n${content}\n`);
  } else {
    // Escrituras siguientes: append
    fs.appendFileSync(CSV_PATH, `${content}\n`);
  }
}

/**
 * Función principal del script
 */
async function loadAllPredios() {
  console.log('Iniciando carga masiva de predios...\n');
  
  const startTime = Date.now();
  let totalPredios = 0;
  let processedOrgs = 0;
  let totalDuplicates = 0;
  let totalCodeCollisions = 0;
  const seenNetworkIds = new Set();
  const seenPredioCodes = new Map();
  
  try {
    // 1. Obtener todas las organizaciones
  console.log('Obteniendo lista de organizaciones...');
  const organizations = await getOrganizations();
  console.log(`Se encontraron ${organizations.length} organizaciones\n`);
    
    // 2. Procesar organizaciones en lotes
    let firstBatch = true;
    
    for (let i = 0; i < organizations.length; i += BATCH_SIZE) {
      const batch = organizations.slice(i, i + BATCH_SIZE);
      
  console.log(`Procesando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(organizations.length/BATCH_SIZE)}...`);
      
      // Procesar lote en paralelo
      const batchPromises = batch.map(org => 
        processOrganization(org, {
          seenNetworkIds,
          seenPredioCodes,
          progressCallback: (org, predios, stats) => {
            const duplicateInfo = [];
            if (stats.duplicatesByNetwork) {
              duplicateInfo.push(`${stats.duplicatesByNetwork} duplicados por network`);
            }
            if (stats.duplicatesByCode) {
              duplicateInfo.push(`${stats.duplicatesByCode} coincidencias de código`);
            }
            const extra = duplicateInfo.length ? ` (omitidos ${duplicateInfo.join(' + ')})` : '';
            console.log(`   ${org.name}: ${predios.length} predios${extra}`);
          }
        })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Recopilar resultados exitosos
      const batchPredios = [];
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batchPredios.push(...result.value.predios);
          totalDuplicates += result.value.duplicatesByNetwork;
          totalCodeCollisions += result.value.duplicatesByCode;
          processedOrgs++;
        } else {
          console.error(`Error en ${batch[index].name}:`, result.reason?.message);
        }
      });
      
      // Guardar lote en CSV
      if (batchPredios.length > 0) {
        appendToCSV(batchPredios, firstBatch);
        totalPredios += batchPredios.length;
        firstBatch = false;
        
  console.log(`Guardados ${batchPredios.length} predios (Total: ${totalPredios})`);
      }
      
      // Delay entre lotes para rate limiting
      if (i + BATCH_SIZE < organizations.length) {
  console.log(`Esperando ${DELAY_MS}ms...`);
        await delay(DELAY_MS);
      }
    }
    
    // 3. Estadísticas finales
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
  console.log('\nCarga completada!');
    console.log('═'.repeat(50));
  console.log(`Estadísticas:`);
    console.log(`   • Organizaciones procesadas: ${processedOrgs}/${organizations.length}`);
    console.log(`   • Total de predios cargados: ${totalPredios}`);
    if (totalDuplicates > 0) {
      console.log(`   • Duplicados omitidos por network_id: ${totalDuplicates}`);
    }
    if (totalCodeCollisions > 0) {
      console.log(`   • Códigos de predio repetidos detectados: ${totalCodeCollisions}`);
    }
    console.log(`   • Tiempo total: ${duration} segundos`);
    console.log(`   • Promedio: ${Math.round(totalPredios/duration)} predios/segundo`);
    console.log(`   • Archivo generado: ${CSV_PATH}`);
    
    // 4. Estadísticas del CSV generado
    if (fs.existsSync(CSV_PATH)) {
      const content = fs.readFileSync(CSV_PATH, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      console.log(`   • Líneas en CSV: ${lines.length - 1} (sin header)`);
      
      // Análisis por región
      const regionCount = {};
      lines.slice(1).forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 5) {
          const region = parts[4];
          regionCount[region] = (regionCount[region] || 0) + 1;
        }
      });
      
  console.log(`\nDistribución por región:`);
      Object.entries(regionCount)
        .sort(([,a], [,b]) => b - a)
        .forEach(([region, count]) => {
          console.log(`   • ${region}: ${count} predios`);
        });
    }
    
  console.log('\nEl sistema ahora puede resolver predios instantáneamente!');
  console.log('Ejemplo: GET /api/resolve-network?q=603005');
    
  } catch (error) {
    console.error('\nError durante la carga:', error.message);
    process.exit(1);
  }
}

/**
 * Función para verificar configuración antes de ejecutar
 */
function validateConfig() {
  if (!process.env.MERAKI_API_KEY) {
    console.error('Error: MERAKI_API_KEY no configurada en .env');
    process.exit(1);
  }
  
  console.log('Configuración validada');
  console.log(`   • API Key: ${process.env.MERAKI_API_KEY.substring(0, 8)}...`);
  console.log(`   • Organizaciones: ${process.env.MERAKI_ORG_ID ? 'Una específica' : 'Todas disponibles'}`);
}

// Ejecutar script si se llama directamente
if (require.main === module) {
  validateConfig();
  loadAllPredios().catch(console.error);
}

module.exports = { loadAllPredios, extractPredioCode, determineRegion, determineEstado };