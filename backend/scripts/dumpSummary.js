const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function main() {
  const [, , networkId, timespanArg, outFileArg] = process.argv;
  if (!networkId) {
    console.error('Usage: node scripts/dumpSummary.js <networkId> [timespanSeconds] [outfile]');
    process.exit(1);
  }

  const timespan = Number(timespanArg) || 24 * 3600;
  const outFile = outFileArg
    ? path.resolve(process.cwd(), outFileArg)
    : path.resolve(__dirname, '..', '..', `summary_${networkId}.json`);

  const url = `http://localhost:3000/api/networks/${encodeURIComponent(networkId)}/summary?uplinkTimespan=${timespan}`;

  try {
    console.log(`GET ${url}`);
    const response = await axios.get(url);
    fs.writeFileSync(outFile, JSON.stringify(response.data, null, 2));
    console.log(`Saved summary to ${outFile}`);
  } catch (error) {
    if (error.response) {
      console.error(`HTTP ${error.response.status}:`, error.response.data || error.message);
    } else {
      if (typeof error.toJSON === 'function') {
        console.error(JSON.stringify(error.toJSON(), null, 2));
      } else {
        console.error(error.stack || error.message);
      }
    }
    process.exit(1);
  }
}

main();
