require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.MERAKI_API_KEY;
const NETWORK_ID = 'L_689050742987692853'; // Predio 600006
const BASE_URL = 'https://api.meraki.com/api/v1';

(async () => {
  try {
    console.log('Testing failedConnections endpoint...');
    console.log(`Network: ${NETWORK_ID}`);
    console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
    
    const response = await axios.get(
      `${BASE_URL}/networks/${NETWORK_ID}/wireless/failedConnections`,
      {
        headers: {
          'X-Cisco-Meraki-API-Key': API_KEY,
          'Content-Type': 'application/json'
        },
        params: {
          timespan: 86400
        }
      }
    );
    
  console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\nData Type:', typeof response.data);
    console.log('Is Array:', Array.isArray(response.data));
    
    if (Array.isArray(response.data)) {
  console.log(`\nTotal failures: ${response.data.length}`);
      
      // Agrupar por serial
      const bySerial = {};
      response.data.forEach(f => {
        if (f.serial) {
          bySerial[f.serial] = (bySerial[f.serial] || 0) + 1;
        }
      });
      
      console.log('\nFailures por AP:');
      Object.entries(bySerial)
        .sort((a, b) => b[1] - a[1])
        .forEach(([serial, count]) => {
          console.log(`  ${serial}: ${count} failures`);
        });
      
      // Mostrar primeros 3 ejemplos
  console.log('\nPrimeros 3 failures:');
      response.data.slice(0, 3).forEach((f, i) => {
        console.log(`\n${i + 1}.`, JSON.stringify(f, null, 2));
      });
    } else {
      console.log('\nResponse is not an array!');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
  console.error('\nError:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();
