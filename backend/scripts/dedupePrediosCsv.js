const path = require('path');

const { dedupeCsvFile } = require('../src/prediosUpdater');
const { loadPrediosFromCSV } = require('../src/prediosManager');

async function main() {
  try {
    const beforeMap = loadPrediosFromCSV();
    const beforeCount = new Set();
    beforeMap.forEach((predio) => {
      if (predio?.network_id) {
        beforeCount.add(predio.network_id);
      }
    });

    const result = dedupeCsvFile();
    const afterMap = loadPrediosFromCSV();
    const afterCount = new Set();
    afterMap.forEach((predio) => {
      if (predio?.network_id) {
        afterCount.add(predio.network_id);
      }
    });

    console.log('Predios dedupe summary');
    console.log('=======================');
    console.log(`Unique networks before: ${beforeCount.size}`);
    console.log(`Unique networks after:  ${afterCount.size}`);
    console.log(`Rows removed:          ${result.removed}`);
    console.log(`Rows retained:         ${result.retained}`);
  } catch (error) {
    console.error('Failed to dedupe predios.csv:', error.message);
    process.exitCode = 1;
  }
}

main();
