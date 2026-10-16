import { readFile, writeFile } from 'node:fs/promises';
import { reviewFixture } from './fixtures/permitted-review.mjs';
// Usage: node scripts/create-permit-qa-packet.mjs <output.json>
// This fixture must only be imported into a local/isolated development wallet.
if (!process.argv[2]) throw Error('Specify an output path for the synthetic QA packet.');
const trip = reviewFixture(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
const logo = await readFile(new URL('../src/assets/drivers-lounge-logo.png', import.meta.url));
const documents = trip.permits.flatMap(p => p.documents.map(d => ({ ...d, size: logo.length, data: 'data:image/png;base64,' + logo.toString('base64') })));
await writeFile(process.argv[2], JSON.stringify({ schema: 'dl-permit-packet/v1', trip, documents }));
console.log('Synthetic QA packet created. Import strips all confirmations. Not for driving.');
