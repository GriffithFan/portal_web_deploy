const axios = require('axios');

(async () => {
  try {
    console.log('Conectando a http://localhost:3000/api/networks/L_772247187042890134/summary?quick=true');
    const resp = await axios.get('http://localhost:3000/api/networks/L_772247187042890134/summary?quick=true', {
      timeout: 30000
    });
    
    console.log('Respuesta recibida, status:', resp.status);
    
    const aps = resp.data.accessPointsDetailed || [];
    console.log(`Total APs: ${aps.length}`);
    
    if (aps.length > 0) {
      console.log('\nPrimeros 3 APs:');
      aps.slice(0, 3).forEach(ap => {
        console.log(`  - ${ap.name} (${ap.serial})`);
        console.log(`    Has wireless: ${!!ap.wireless}`);
        if (ap.wireless) {
          console.log(`    History length: ${ap.wireless.history?.length || 0}`);
        }
      });
    }
    
    const apWithHistory = aps.filter(ap => ap.wireless?.history?.length > 0);
    console.log(`\nAPs with history: ${apWithHistory.length}`);
    
    if (apWithHistory.length > 0) {
      const sample = apWithHistory[0];
      console.log(`\nSample AP: ${sample.name} (${sample.serial})`);
      console.log(`History samples: ${sample.wireless.history.length}`);
      console.log(`\nFirst 3 samples:`);
      console.log(JSON.stringify(sample.wireless.history.slice(0, 3), null, 2));
      
      const failures = sample.wireless.history.filter(h => h.signalQuality <= 20);
      console.log(`\nMicrocut samples (signalQuality <= 20): ${failures.length}`);
      
      // Mostrar distribución de signalQuality
      const distribution = {};
      sample.wireless.history.forEach(h => {
        const qual = h.signalQuality || 0;
        distribution[qual] = (distribution[qual] || 0) + 1;
      });
      console.log('\nSignal Quality Distribution:');
      Object.entries(distribution).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([qual, count]) => {
        console.log(`  ${qual}: ${count} samples`);
      });
    }
  } catch(err) {
    console.error('Error completo:', err);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
})();
