#!/usr/bin/env node

/**
 * Script para actualización incremental del CSV de predios
 * Útil para mantener el CSV actualizado sin regenerar todo
 * 
 * Uso: node scripts/updatePredios.js [organizacion_id]
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getOrganizations, getNetworks } = require('../src/merakiApi');
const { loadAllPredios, extractPredioCode, determineRegion, determineEstado } = require('./loadAllPredios');

const CSV_PATH = path.join(__dirname, '..', 'data', 'predios.csv');
const CSV_HEADER = 'network_id,predio_code,predio_name,organization_id,region,estado';

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function formatCsvRow(predio) {
  const safeName = (predio.predio_name || '').replace(/"/g, '""');
  return `${predio.network_id},${predio.predio_code},"${safeName}",${predio.organization_id},${predio.region},${predio.estado}`;
}

function dedupePrediosCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    console.info('No existe archivo CSV para depurar');
    return;
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim().length);
  if (lines.length < 2) {
    console.info('El CSV no contiene datos para deduplicar');
    return;
  }

  const uniqueByNetwork = new Map();
  let duplicatesByNetwork = 0;
  let duplicatesByCode = 0;
  const codeIndex = new Map();

  for (let i = 1; i < lines.length; i += 1) {
    const tokens = parseCsvLine(lines[i]);
    if (tokens.length < 6) continue;

    const [network_id, predio_code, predio_name, organization_id, region, estado] = tokens;
    if (uniqueByNetwork.has(network_id)) {
      duplicatesByNetwork += 1;
      continue;
    }

    const normalizedCode = (predio_code || '').toUpperCase();
    if (!codeIndex.has(normalizedCode)) {
      codeIndex.set(normalizedCode, new Set());
    }

    const owners = codeIndex.get(normalizedCode);
    if (owners.size && !owners.has(network_id)) {
      duplicatesByCode += 1;
    }
    owners.add(network_id);

    uniqueByNetwork.set(network_id, {
      network_id,
      predio_code,
      predio_name: predio_name.replace(/^"|"$/g, ''),
      organization_id,
      region,
      estado,
    });
  }

  const ordered = Array.from(uniqueByNetwork.values()).sort((a, b) => a.network_id.localeCompare(b.network_id));
  const output = ordered.map(formatCsvRow).join('\n');

  fs.writeFileSync(CSV_PATH, `${CSV_HEADER}\n${output}\n`);

  console.info('Deduplicación completada');
  console.info(`   • Filas originales: ${lines.length - 1}`);
  console.info(`   • Filas deduplicadas: ${ordered.length}`);
  if (duplicatesByNetwork) {
    console.info(`   • Duplicados por network_id eliminados: ${duplicatesByNetwork}`);
  }
  if (duplicatesByCode) {
    console.warn(`   • Advertencia: códigos repetidos detectados: ${duplicatesByCode}`);
  }
}

/**
 * Carga CSV existente en memoria
 */
function loadExistingCSV() {
  if (!fs.existsSync(CSV_PATH)) {
    console.info('No existe CSV previo, creando nuevo...');
    return new Map();
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return new Map();
  }

  const existing = new Map();
  
  // Saltar header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 4) {
      const networkId = parts[0];
      const orgId = parts[3];
      existing.set(networkId, orgId);
    }
  }

  console.info(`CSV existente cargado: ${existing.size} predios`);
  return existing;
}

/**
 * Actualiza una organización específica
 */
async function updateOrganization(orgId) {
  try {
  console.info(`\nActualizando organización: ${orgId}`);
    
    const existing = loadExistingCSV();
    const networks = await getNetworks(orgId);
    
    console.info(`   → ${networks.length} redes encontradas`);
    
    // Identificar cambios
    const newNetworks = [];
    const updatedNetworks = [];
    
    for (const network of networks) {
      if (existing.has(network.id)) {
        updatedNetworks.push(network);
      } else {
        newNetworks.push(network);
      }
    }
    
  console.info(`   → ${newNetworks.length} redes nuevas`);
  console.info(`   → ${updatedNetworks.length} redes existentes`);
    
    if (newNetworks.length === 0 && updatedNetworks.length === 0) {
  console.info('   No hay cambios que procesar');
      return;
    }
    
    // Obtener info de organización para región
    const orgs = await getOrganizations();
    const orgInfo = orgs.find(o => o.id === orgId);
    const orgName = orgInfo ? orgInfo.name : '';
    
    // Procesar redes nuevas
    if (newNetworks.length > 0) {
      const newPredios = newNetworks.map(network => ({
        network_id: network.id,
        predio_code: extractPredioCode(network.name),
        predio_name: network.name,
        organization_id: orgId,
        region: determineRegion(network.name, orgName),
        estado: determineEstado(network.name)
      }));
      
      // Append al CSV
      const content = newPredios.map(p => 
        `${p.network_id},${p.predio_code},"${p.predio_name}",${p.organization_id},${p.region},${p.estado}`
      ).join('\n');
      
    fs.appendFileSync(CSV_PATH, `${content}\n`);
  console.info(`   ${newNetworks.length} nuevos predios añadidos al CSV`);
    }
    
  // Por hacer: actualizar redes modificadas (requiere regenerar CSV completo)
    if (updatedNetworks.length > 0) {
  console.info(`   ${updatedNetworks.length} redes existentes podrían haber cambiado`);
  console.info('   Para actualizar nombres/regiones, ejecuta regeneración completa');
    }
    
  } catch (error) {
  console.error(`Error actualizando organización ${orgId}:`, error.message);
  }
}

/**
 * Verificar nuevas organizaciones
 */
async function checkNewOrganizations() {
  try {
  console.info('\nVerificando nuevas organizaciones...');
    
    const existing = loadExistingCSV();
    const existingOrgs = new Set();
    
    existing.forEach((orgId, networkId) => {
      existingOrgs.add(orgId);
    });
    
    const allOrgs = await getOrganizations();
    const newOrgs = allOrgs.filter(org => !existingOrgs.has(org.id));
    
    if (newOrgs.length === 0) {
  console.info('   No hay organizaciones nuevas');
      return;
    }
    
  console.info(`   ${newOrgs.length} organizaciones nuevas encontradas:`);
    newOrgs.forEach(org => console.info(`      → ${org.name} (${org.id})`));
    
  console.info('\nPara cargar estas organizaciones, ejecuta:');
    newOrgs.forEach(org => {
      console.info(`   node scripts/updatePredios.js ${org.id}`);
    });
    
  } catch (error) {
  console.error('Error verificando organizaciones:', error.message);
  }
}

/**
 * Estadísticas rápidas del CSV
 */
function showStats() {
  if (!fs.existsSync(CSV_PATH)) {
  console.log('No existe archivo CSV');
    return;
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const stats = fs.statSync(CSV_PATH);
  const totalPredios = lines.length - 1; // Excluir header
  
  console.info('\nEstadísticas actuales:');
  console.info(`   • Total predios: ${totalPredios}`);
  console.info(`   • Última modificación: ${stats.mtime.toLocaleString()}`);
  console.info(`   • Tamaño archivo: ${Math.round(stats.size / 1024)} KB`);
  
  // Contar organizaciones únicas
  const orgs = new Set();
  lines.slice(1).forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 4) {
      orgs.add(parts[3]);
    }
  });
  
  console.info(`   • Organizaciones: ${orgs.size}`);
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.info('Actualizador de Predios CSV\n');
  
  const passiveCommands = new Set([undefined, 'stats', 'dedupe']);

  if (!process.env.MERAKI_API_KEY && !passiveCommands.has(command)) {
  console.error('Error: MERAKI_API_KEY no configurada');
    process.exit(1);
  }
  
  try {
    if (command === 'stats') {
      showStats();
    } else if (command === 'check') {
      await checkNewOrganizations();
    } else if (command === 'full') {
      // Regeneración completa
  console.info('Iniciando regeneración completa...');
      const { loadAllPredios } = require('./loadAllPredios');
      await loadAllPredios();
    } else if (command === 'dedupe') {
      dedupePrediosCsv();
    } else if (command && command.length > 5) {
      // Actualizar organización específica
      await updateOrganization(command);
    } else {
      // Mostrar ayuda
  console.info('Uso del script:');
    console.info('');
    console.info('  node scripts/updatePredios.js stats           # Mostrar estadísticas');
    console.info('  node scripts/updatePredios.js check           # Verificar nuevas organizaciones');
    console.info('  node scripts/updatePredios.js [org_id]        # Actualizar organización específica');
    console.info('  node scripts/updatePredios.js full            # Regeneración completa');
    console.info('  node scripts/updatePredios.js dedupe          # Eliminar duplicados del CSV');
    console.info('');
  console.info('Estadísticas actuales:');
      showStats();
    }
    
  } catch (error) {
  console.error('Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { updateOrganization, checkNewOrganizations, showStats, dedupePrediosCsv };