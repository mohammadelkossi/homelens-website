#!/usr/bin/env tsx

import { scrapeTimeOnMarket } from '../src/scrapeTimeOnMarket';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx bin/tom <RIGHTMOVE_URL>');
    process.exit(1);
  }
  
  const url = args[0];
  
  if (!url.startsWith('http')) {
    console.error('Error: URL must start with http:// or https://');
    process.exit(1);
  }
  
  try {
    const result = await scrapeTimeOnMarket(url);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();



