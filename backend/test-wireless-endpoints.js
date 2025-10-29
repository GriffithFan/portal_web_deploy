const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.MERAKI_API_KEY;
if (!apiKey) {
    console.error('MERAKI_API_KEY no encontrado en .env');
    process.exit(1);
}

const headers = {
    "X-Cisco-Meraki-API-Key": apiKey,
    "Accept": "application/json"
};

console.log('Using API Key:', apiKey.substring(0, 10) + '...\n');

const networkId = 'L_688487793034285763';

const endpoints = [
    { name: 'Connection Stats', path: '/wireless/connectionStats?timespan=86400' },
    { name: 'Latency Stats', path: '/wireless/latencyStats?timespan=86400' },
    { name: 'Failed Connections', path: '/wireless/failedConnections?timespan=86400' },
    { name: 'Channel Utilization', path: '/wireless/channelUtilizationHistory?timespan=86400' },
    { name: 'Client Events', path: '/wireless/clientConnectionEvents?timespan=3600' },
    { name: 'Signal Quality History', path: '/wireless/signalQualityHistory?timespan=86400&resolution=300' },
    { name: 'Connection Events', path: '/wireless/connectionEvents?timespan=3600' },
    { name: 'Mesh Stats', path: '/wireless/meshStatuses' }
];

async function testEndpoints() {
    console.log('Probando endpoints de Wireless para detectar microcortes...\n');
    console.log(`Network ID: ${networkId}\n`);
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\nTesting: ${endpoint.name}`);
            console.log(`   URL: /networks/${networkId}${endpoint.path}`);
            
            const response = await axios.get(
                `https://api.meraki.com/api/v1/networks/${networkId}${endpoint.path}`,
                { headers, timeout: 10000 }
            );
            
            console.log('   SUCCESS');
            console.log('   Status:', response.status);
            
            if (response.data) {
                const keys = Array.isArray(response.data) 
                    ? `Array[${response.data.length}]` 
                    : Object.keys(response.data).join(', ');
                console.log('   Data type:', Array.isArray(response.data) ? 'Array' : 'Object');
                console.log('   Keys/Length:', keys);
                
                // Mostrar muestra de datos
                const sample = JSON.stringify(response.data, null, 2);
                if (sample.length > 500) {
                    console.log('   Sample (first 500 chars):', sample.substring(0, 500) + '...');
                } else {
                    console.log('   Data:', sample);
                }
            }
            
        } catch (error) {
            if (error.response) {
                console.log('   FAILED');
                console.log('   Status:', error.response.status);
                console.log('   Error:', error.response.data?.errors?.[0]?.message || error.message);
            } else {
                console.log('   ERROR:', error.message);
            }
        }
    }
    
    console.log('\n\nPruebas completadas');
}

testEndpoints().catch(console.error);
