const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'data', 'predios.csv');

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('predios.csv not found');
    process.exit(1);
  }

  const rows = fs.readFileSync(csvPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const header = rows.shift();
  const counts = new Map();
  const duplicates = new Map();

  rows.forEach((line, index) => {
    const [networkId] = line.split(',', 1);
    if (!networkId) return;
    const next = (counts.get(networkId) || 0) + 1;
    counts.set(networkId, next);
    if (next === 2) {
      duplicates.set(networkId, [index + 2]); // +2 accounts for header + zero index
    } else if (next > 2) {
      duplicates.get(networkId).push(index + 2);
    }
  });

  const dupEntries = Array.from(duplicates.entries()).map(([networkId, lineNumbers]) => ({ networkId, lineNumbers }));
  dupEntries.sort((a, b) => a.networkId.localeCompare(b.networkId));

  console.log(`Total rows: ${rows.length}`);
  console.log(`Unique networks: ${counts.size}`);
  console.log(`Duplicated networks: ${dupEntries.length}`);
  if (dupEntries.length) {
    console.log('Sample duplicates (first 10):');
    dupEntries.slice(0, 10).forEach((entry) => {
      console.log(` - ${entry.networkId} at lines ${entry.lineNumbers.join(', ')}`);
    });
  }
}

main();
