import * as fs from 'fs';
import * as path from 'path';

interface CatalogEntry {
  [key: string]: string;
}

function scanTranscriptsDirectory(): CatalogEntry {
  const transcriptsDir = path.join(__dirname, 'transcripts');
  const catalog: CatalogEntry = {};

  // Check if transcripts directory exists
  if (!fs.existsSync(transcriptsDir)) {
    console.error('Transcripts directory not found');
    return catalog;
  }

  // Helper to process a single .json file
  function processJsonFile(filePath: string, relPath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      const source = json.source;
      if (!source || !source.id || !source.domain) {
        console.warn(`Skipping ${relPath}: missing source.id or source.domain`);
        return;
      }
      const key = `${source.domain}-${source.id}`;
      catalog[key] = relPath.replace(/\\/g, '/');
    } catch (e) {
      console.warn(`Failed to parse ${relPath}: ${e}`);
    }
  }

  // Recursively scan the transcripts directory
  function scanDir(dir: string, relDir: string) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const relPath = path.join(relDir, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        scanDir(itemPath, relPath);
      } else if (stats.isFile() && item.endsWith('.json')) {
        processJsonFile(itemPath, `/transcripts/${relPath}`);
      }
    }
  }

  scanDir(transcriptsDir, '');
  return catalog;
}

function main() {
  console.log('Scanning transcripts directory...');
  
  const catalog = scanTranscriptsDirectory();
  
  // Sort the catalog by keys for consistent output
  const sortedCatalog: CatalogEntry = {};
  Object.keys(catalog)
    .sort()
    .forEach(key => {
      sortedCatalog[key] = catalog[key];
    });

  // Write the catalog to a JSON file
  const catalogPath = path.join(__dirname, 'generated-transcript-catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(sortedCatalog, null, 2));
  
  console.log(`Catalog generated with ${Object.keys(sortedCatalog).length} entries`);
  console.log(`Catalog saved to: ${catalogPath}`);
  
  // Print some example entries
  console.log('\nExample entries:');
  const entries = Object.entries(sortedCatalog).slice(0, 5);
  entries.forEach(([key, value]) => {
    console.log(`  "${key}": "${value}"`);
  });
}

if (require.main === module) {
  main();
} 