// Controlador de predios - gestión del catálogo CSV
const { 
  findPredio, 
  searchPredios, 
  getStats, 
  refreshCache 
} = require('../prediosManager');
const { 
  syncPrediosCsv, 
  getLastRunSummary 
} = require('../prediosUpdater');
const { logger, logAdmin } = require('../config/logger');

/**
 * Buscar predios con filtros
 */
exports.searchPredios = (req, res) => {
  try {
    const filters = {};
    
    if (req.query.region) filters.region = req.query.region;
    if (req.query.estado) filters.estado = req.query.estado;
    if (req.query.organization_id) filters.organization_id = req.query.organization_id;
    if (req.query.q) filters.search = req.query.q;
    
    const results = searchPredios(filters);
    res.json({ predios: results, total: results.length });
  } catch (error) {
    logger.error('Error searching predios:', { error: error.message });
    res.status(500).json({ error: 'Error buscando predios' });
  }
};

/**
 * Obtener estadísticas del catálogo
 */
exports.getStats = (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting predios stats:', { error: error.message });
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

/**
 * Refrescar caché en memoria desde CSV
 */
exports.refreshCache = (req, res) => {
  try {
    const predios = refreshCache();
    const uniqueCount = Array.from(predios.keys()).filter(k => k.startsWith('L_')).length;
    
    logAdmin('cache_refreshed', { count: uniqueCount });
    
    res.json({ 
      success: true, 
      message: `Cache refrescado. ${uniqueCount} predios cargados.`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error refreshing predios cache:', { error: error.message });
    res.status(500).json({ error: 'Error refrescando cache' });
  }
};

/**
 * Sincronizar CSV desde Meraki API
 */
exports.syncPredios = async (req, res) => {
  try {
    const summary = await syncPrediosCsv({ force: req.body?.force === true });
    
    logAdmin('predios_synced', { 
      total: summary.totalPredios,
      organizations: summary.totalOrganizations
    });
    
    res.json(summary);
  } catch (error) {
    logger.error('Error syncing predios:', { error: error.message });
    res.status(500).json({ error: 'Error sincronizando predios' });
  }
};

/**
 * Sincronizar con Server-Sent Events (streaming)
 */
exports.syncPrediosStream = async (req, res) => {
  // Configurar SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { getOrganizations, getNetworks } = require('../merakiApi');
    const path = require('path');
    const fs = require('fs');
    
    const CSV_PATH = path.join(__dirname, '..', '..', 'data', 'predios.csv');
    const CSV_HEADER = 'network_id,predio_code,predio_name,organization_id,organization_name,region,estado';
    
    // Funciones helper para extracción de datos
    const extractPredioCode = (networkName) => {
      const patterns = [
        /(\d{6})/,
        /(\d{3}-\d{3})/,
        /(\d{4}-\d{2})/,
        /PRD(\d+)/i,
        /PREDIO[_\s]*(\d+)/i,
        /SUC[_\s]*(\d+)/i,
        /(\d{3,7})/
      ];
      
      for (const pattern of patterns) {
        const match = networkName.match(pattern);
        if (match) {
          return match[1].replace(/[-_\s]/g, '');
        }
      }
      
      const clean = networkName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
      return clean || 'UNKNOWN';
    };
    
    const determineRegion = (networkName, orgName) => {
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
    };
    
    const determineEstado = (networkName) => {
      const name = networkName.toLowerCase();
      
      if (name.includes('mant') || name.includes('maintenance')) return 'mantenimiento';
      if (name.includes('test') || name.includes('prueba')) return 'prueba';
      if (name.includes('temp') || name.includes('temporal')) return 'temporal';
      if (name.includes('offline') || name.includes('down')) return 'offline';
      if (name.includes('backup') || name.includes('respaldo')) return 'backup';
      
      return 'activo';
    };
    
    sendProgress({ type: 'start', message: 'Iniciando sincronización...' });
    
    // Obtener organizaciones
    sendProgress({ type: 'phase', phase: 'organizations', message: 'Obteniendo organizaciones...' });
    const organizations = await getOrganizations();
    const totalOrgs = organizations.length;
    
    sendProgress({
      type: 'organizations',
      total: totalOrgs,
      message: `${totalOrgs} organizaciones encontradas`
    });
    
    // Preparar CSV
    const dataDir = path.dirname(CSV_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(CSV_PATH, `${CSV_HEADER}\n`);
    
    let totalPredios = 0;
    let processedOrgs = 0;
    const seenNetworkIds = new Set();
    
    // Procesar cada organización
    for (const org of organizations) {
      try {
        sendProgress({
          type: 'progress',
          current: processedOrgs + 1,
          total: totalOrgs,
          percentage: Math.round(((processedOrgs + 1) / totalOrgs) * 100),
          organization: org.name,
          message: `Procesando ${org.name}...`
        });
        
        const networks = await getNetworks(org.id);
        const predios = [];
        
        for (const network of networks) {
          if (seenNetworkIds.has(network.id)) continue;
          
          const predioCode = extractPredioCode(network.name);
          const region = determineRegion(network.name, org.name);
          const estado = determineEstado(network.name);
          
          const safeName = (network.name || '').replace(/"/g, '""');
          const safeOrgName = (org.name || '').replace(/"/g, '""');
          const row = `${network.id},${predioCode},"${safeName}",${org.id},"${safeOrgName}",${region},${estado}`;
          
          predios.push(row);
          seenNetworkIds.add(network.id);
        }
        
        if (predios.length > 0) {
          fs.appendFileSync(CSV_PATH, predios.join('\n') + '\n');
          totalPredios += predios.length;
        }
        
        processedOrgs++;
        
        sendProgress({
          type: 'org-complete',
          organization: org.name,
          predios: predios.length,
          totalPredios,
          message: `${org.name}: ${predios.length} predios`
        });
        
      } catch (error) {
        sendProgress({
          type: 'error',
          organization: org.name,
          message: `Error en ${org.name}: ${error.message}`
        });
      }
    }
    
    // Finalizar
    logAdmin('predios_sync_stream_completed', { 
      totalOrganizations: totalOrgs,
      processedOrganizations: processedOrgs,
      totalPredios 
    });
    
    sendProgress({
      type: 'complete',
      totalOrganizations: totalOrgs,
      processedOrganizations: processedOrgs,
      totalPredios,
      message: `Completado: ${totalPredios} predios catalogados`
    });
    
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    sendProgress({
      type: 'fatal-error',
      message: `Error fatal: ${error.message}`
    });
    res.end();
  }
};

/**
 * Obtener resumen de última sincronización
 */
exports.getLastSync = (req, res) => {
  const summary = getLastRunSummary();
  
  if (!summary) {
    return res.status(404).json({ error: 'Sin ejecuciones previas' });
  }
  
  res.json(summary);
};

/**
 * Buscar predio por código
 */
exports.getPredioByCode = (req, res) => {
  try {
    const { code } = req.params;
    const predio = findPredio(code);
    
    if (!predio) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    res.json(predio);
  } catch (error) {
    logger.error('Error finding predio:', { error: error.message, code: req.params.code });
    res.status(500).json({ error: 'Error buscando predio' });
  }
};
