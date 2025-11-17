// Definición de rutas principales de la API
// 
// ARQUITECTURA ACTUAL:
// - Rutas de Meraki (topología, organizaciones, networks, etc) definidas inline en este archivo
// - Rutas modulares separadas en backend/src/routes/ (admin, auth, predios, networks, organizations, debug)
// - Actualmente solo admin.routes está montado aquí (para gestión de técnicos)
// - Las rutas REST legacy se mantienen aquí para compatibilidad (no reorganizar sin testing profundo)
//
const express = require('express');
const router = express.Router();

// Importar middleware y dependencias
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Importar rutas modulares
const adminRoutes = require('./routes/admin.routes');

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ mensaje: 'Token no proporcionado' });
  jwt.verify(token, process.env.JWT_SECRETO, (err, usuario) => {
    if (err) return res.status(403).json({ mensaje: 'Token inválido' });
    req.usuario = usuario;
    next();
  });
}

// Ruta para obtener la topología de un predio buscando la organización
router.get('/meraki/topologia-predio/:id_predio', verificarToken, async (req, res) => {
  const idPredio = req.params.id_predio;
  // Log para depuración: mostrar el valor recibido
  console.log(`Valor recibido en id_predio: '${idPredio}' (tipo: ${typeof idPredio})`);
  try {
    // 1. Obtener todas las organizaciones
    const orgs = await axios.get('https://api.meraki.com/api/v1/organizations', {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    // 2. Buscar en cada organización la network con el id solicitado
    for (const org of orgs.data) {
      const networks = await axios.get(`https://api.meraki.com/api/v1/organizations/${org.id}/networks`, {
        headers: {
          'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
        }
      });
      // Log para depuración avanzada: mostrar id_predio y todos los network.id
      console.log(`Organización: ${org.name} (${org.id}) - Networks:`);
      networks.data.forEach(n => {
        const idPredioStr = String(idPredio).trim();
        const networkIdStr = String(n.id).trim();
        const comparacion = idPredioStr === networkIdStr;
        console.log(`  Network: ${n.name} - ID: '${networkIdStr}' (tipo: ${typeof n.id}) | id_predio: '${idPredioStr}' | Coincide: ${comparacion}`);
      });
      // Buscar por ID o por nombre de network
      const idPredioStr = String(idPredio).trim();
      let network = networks.data.find(n => String(n.id).trim() === idPredioStr);
      if (!network) {
        network = networks.data.find(n => n.name && n.name.trim().toLowerCase() === idPredioStr.toLowerCase());
        if (network) {
          console.log(`Predio encontrado por nombre: ${network.name} - ID: ${network.id}`);
        }
      }
      if (network) {
        console.log(`Predio encontrado: ${network.name} - ID: ${network.id} - Tipo: ${network.type || 'desconocido'}`);
        // 3. Consultar la topología de la network
        try {
          const topologia = await axios.get(`https://api.meraki.com/api/v1/networks/${network.id}/topology`, {
            headers: {
              'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
            }
          });
          console.log('Topología recibida:', JSON.stringify(topologia.data));
          return res.json(topologia.data);
        } catch (errTopologia) {
          if (errTopologia.response) {
            console.error('Error Meraki Topología:', {
              status: errTopologia.response.status,
              data: errTopologia.response.data
            });
            return res.status(500).json({ mensaje: 'Error Meraki Topología', status: errTopologia.response.status, data: errTopologia.response.data });
          } else {
            console.error('Error Meraki Topología (sin respuesta):', errTopologia.message);
            return res.status(500).json({ mensaje: 'Error Meraki Topología', error: errTopologia.message });
          }
        }
      }
    }
    console.log('Predio no encontrado en ninguna organización');
    res.status(404).json({ mensaje: 'Predio no encontrado en ninguna organización' });
  } catch (error) {
    console.error('Error al consultar topología:', error);
    res.status(500).json({ mensaje: 'Error al consultar topología', error: error.message });
  }
});

// Ruta para obtener organizaciones desde Meraki
router.get('/meraki/organizaciones', verificarToken, async (req, res) => {
  try {
    const respuesta = await axios.get('https://api.meraki.com/api/v1/organizations', {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json(respuesta.data);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar Meraki', error: error.message });
  }
});

// Ruta para obtener la topología de un predio específico
router.get('/meraki/topologia/:id_predio', verificarToken, async (req, res) => {
  const idPredio = req.params.id_predio;
  try {
    const respuesta = await axios.get(`https://api.meraki.com/api/v1/organizations/${idPredio}/topology`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json(respuesta.data);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar topología', error: error.message });
  }
});

// Ruta de prueba
router.get('/prueba', (req, res) => {
  res.json({ mensaje: 'Ruta de prueba funcionando' });
});

// Login endpoint implementation is in servidor.js as POST /api/login

// Aquí se agregarán más rutas para usuarios, Meraki, etc.

// Wireless Controllers by Device de una organización
router.get('/meraki/org-wireless-controllers-by-device/:org_id', verificarToken, async (req, res) => {
  const orgId = req.params.org_id;
  try {
    const respuesta = await axios.get(`https://api.meraki.com/api/v1/organizations/${orgId}/wireless/devices/wirelessControllers/byDevice`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json(respuesta.data);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar wireless controllers by device', error: error.message });
  }
});

// Wireless Controller Connections de una organización
router.get('/meraki/org-wireless-connections/:org_id', verificarToken, async (req, res) => {
  const orgId = req.params.org_id;
  try {
    const respuesta = await axios.get(`https://api.meraki.com/api/v1/organizations/${orgId}/wirelessController/connections`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json(respuesta.data);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar wireless controller connections', error: error.message });
  }
});

// Access Points de una network
router.get('/meraki/network-access-points/:network_id', verificarToken, async (req, res) => {
  const networkId = req.params.network_id;
  try {
    const respuesta = await axios.get(`https://api.meraki.com/api/v1/networks/${networkId}/devices`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    // Filtrar solo access points (modelos que empiezan con MR)
    const aps = respuesta.data.filter(d => d.model && d.model.startsWith('MR'));
    res.json(aps);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar access points', error: error.message });
  }
});

// Switches de una network
router.get('/meraki/network-switches/:network_id', verificarToken, async (req, res) => {
  const networkId = req.params.network_id;
  try {
    const respuesta = await axios.get(`https://api.meraki.com/api/v1/networks/${networkId}/devices`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    // Filtrar solo switches (modelos que empiezan con MS)
    const switches = respuesta.data.filter(d => d.model && d.model.startsWith('MS'));
    res.json(switches);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar switches', error: error.message });
  }
});

// Appliance status de una network
router.get('/meraki/network-appliance-status/:network_id', verificarToken, async (req, res) => {
  const networkId = req.params.network_id;
  try {
    // Buscar el primer appliance (modelo que empieza con MX)
    const devices = await axios.get(`https://api.meraki.com/api/v1/networks/${networkId}/devices`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    const appliance = devices.data.find(d => d.model && d.model.startsWith('MX'));
    if (!appliance) {
      return res.status(404).json({ mensaje: 'No se encontró appliance (MX) en la network' });
    }
    // Obtener status del appliance
    const status = await axios.get(`https://api.meraki.com/api/v1/devices/${appliance.serial}/uplink`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json({ appliance, uplink: status.data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar appliance status', error: error.message });
  }
});

// Ruta para listar todas las networks de todas las organizaciones
router.get('/meraki/all-networks', verificarToken, async (req, res) => {
  try {
    const orgs = await axios.get('https://api.meraki.com/api/v1/organizations', {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    let allNetworks = [];
    for (const org of orgs.data) {
      const networks = await axios.get(`https://api.meraki.com/api/v1/organizations/${org.id}/networks`, {
        headers: {
          'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
        }
      });
      networks.data.forEach(n => {
        let tipo = 'desconocido';
        if (Array.isArray(n.productTypes) && n.productTypes.length > 0) {
          tipo = n.productTypes.join(', ');
        } else if (n.type) {
          tipo = n.type;
        }
        allNetworks.push({
          orgName: org.name,
          orgId: org.id,
          name: n.name,
          id: n.id,
          type: tipo
        });
      });
    }
    res.json(allNetworks);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar todas las networks', error: error.message });
  }
});

// Ruta para consultar los detalles de una network
router.get('/meraki/network-info/:network_id', verificarToken, async (req, res) => {
  const networkId = req.params.network_id;
  const url = `https://api.meraki.com/api/v1/networks/${networkId}`;
  console.log('Consultando info para networkId:', networkId);
  console.log('URL Meraki:', url);
  try {
    const respuesta = await axios.get(url, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    let tipo = 'desconocido';
    if (Array.isArray(respuesta.data.productTypes) && respuesta.data.productTypes.length > 0) {
      tipo = respuesta.data.productTypes.join(', ');
    } else if (respuesta.data.type) {
      tipo = respuesta.data.type;
    }
    res.json({
      ...respuesta.data,
      type: tipo
    });
  } catch (error) {
    console.error('Error Meraki:', error.response?.data || error.message);
    res.status(500).json({ mensaje: 'Error al consultar info de la network', error: error.message, meraki: error.response?.data });
  }
});

// Ruta para consultar los dispositivos de una network
router.get('/meraki/network-devices/:network_id', verificarToken, async (req, res) => {
  const networkId = req.params.network_id;
  const url = `https://api.meraki.com/api/v1/networks/${networkId}/devices`;
  console.log('Consultando dispositivos para networkId:', networkId);
  console.log('URL Meraki:', url);
  try {
    const respuesta = await axios.get(url, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json(respuesta.data);
  } catch (error) {
    console.error('Error Meraki:', error.response?.data || error.message);
    res.status(500).json({ mensaje: 'Error al consultar dispositivos de la network', error: error.message, meraki: error.response?.data });
  }
});

// Ruta para consultar las organizaciones y permisos de la API key
router.get('/meraki/api-key-info', verificarToken, async (req, res) => {
  try {
    const respuesta = await axios.get('https://api.meraki.com/api/v1/organizations', {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    res.json({ organizaciones: respuesta.data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar organizaciones con la API key', error: error.message });
  }
});

// Ruta para listar todas las networks de una organización (nombre, ID y tipo)
router.get('/meraki/networks/:org_id', verificarToken, async (req, res) => {
  const orgId = req.params.org_id;
  try {
    const respuesta = await axios.get(`https://api.meraki.com/api/v1/organizations/${orgId}/networks`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    // Mostrar nombre, id y tipo usando productTypes si existe
    const listado = respuesta.data.map(n => {
      let tipo = 'desconocido';
      if (Array.isArray(n.productTypes) && n.productTypes.length > 0) {
        tipo = n.productTypes.join(', ');
      } else if (n.type) {
        tipo = n.type;
      }
      return {
        name: n.name,
        id: n.id,
        type: tipo
      };
    });
    res.json(listado);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar networks', error: error.message });
  }
});
// Nuevo endpoint: información de network + topología
router.get('/meraki/network-topology/:network_id', verificarToken, async (req, res) => {
  const networkId = req.params.network_id;
  try {
    // Obtener info de la network
    const info = await axios.get(`https://api.meraki.com/api/v1/networks/${networkId}`, {
      headers: {
        'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
      }
    });
    let tipo = 'desconocido';
    if (Array.isArray(info.data.productTypes) && info.data.productTypes.length > 0) {
      tipo = info.data.productTypes.join(', ');
    } else if (info.data.type) {
      tipo = info.data.type;
    }
    // Obtener topología L2
    let topologiaL2 = null;
    try {
      const topoRes = await axios.get(`https://api.meraki.com/api/v1/networks/${networkId}/topology/linkLayer`, {
        headers: {
          'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
        }
      });
      topologiaL2 = topoRes.data;
    } catch (errTopo) {
      topologiaL2 = { error: errTopo.response?.data || errTopo.message };
    }
    // Obtener topología L3
    let topologiaL3 = null;
    try {
      const topoResL3 = await axios.get(`https://api.meraki.com/api/v1/networks/${networkId}/topology/networkLayer`, {
        headers: {
          'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY
        }
      });
      topologiaL3 = topoResL3.data;
    } catch (errTopoL3) {
      topologiaL3 = { error: errTopoL3.response?.data || errTopoL3.message };
    }
    res.json({
      orgName: info.data.organizationName || '',
      orgId: info.data.organizationId || '',
      name: info.data.name,
      id: info.data.id,
      type: tipo,
      topologyL2: topologiaL2,
      topologyL3: topologiaL3
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar network/topología', error: error.message });
  }
});

// Mount admin routes for technician management
router.use(adminRoutes);

module.exports = router;
