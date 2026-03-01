import fs from 'fs';
import path from 'path';
import { Catalog, Module } from '../types';
import { parseFilename, tierFromDirPath, slugify } from './moduleParser';

/**
 * Recursively find all .glb files in a directory.
 * Returns relative paths from the given root.
 */
function findGlbFiles(dir: string, rootDir: string): string[] {
  const results: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGlbFiles(fullPath, rootDir));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
      results.push(path.relative(rootDir, fullPath));
    }
  }

  return results;
}

/**
 * Scan a single catalog directory and return a Catalog object.
 */
function scanCatalog(catalogDir: string, catalogName: string, assetsRoot: string): Catalog {
  const glbFiles = findGlbFiles(catalogDir, assetsRoot);
  const modules: Module[] = [];
  const tiersSet = new Set<string>();

  for (const relPath of glbFiles) {
    const filename = path.basename(relPath);
    const dirPart = path.dirname(relPath);

    // The category directory is the subdirectory within the catalog
    // e.g., "Каталог Рояль Мебелей/С - Нижние модули/мойка/СМ 601(мойка).glb"
    // categoryDir parts after the catalog name
    const pathParts = dirPart.split(path.sep);
    // pathParts[0] is the catalog name, rest is the category path
    const categoryParts = pathParts.slice(1);
    const categoryDir = categoryParts.join('/') || 'root';

    // Determine tier from the full directory path
    const fullDirName = categoryParts.join(' ');
    const tier = tierFromDirPath(fullDirName || filename);

    // Parse the filename
    const parsed = parseFilename(filename);

    // Build unique module ID: code + width (+ annotation suffix for uniqueness)
    let moduleId = `${parsed.code}-${parsed.width}`;
    // Check for duplicates and make unique
    const existing = modules.filter(m => m.id === moduleId);
    if (existing.length > 0) {
      if (parsed.annotations.length > 0) {
        moduleId += '-' + parsed.annotations[0].replace(/\s+/g, '-').toLowerCase();
      } else {
        moduleId += '-' + (existing.length + 1);
      }
    }

    tiersSet.add(tier);

    modules.push({
      id: moduleId,
      code: parsed.code,
      name: parsed.name,
      width: parsed.width,
      tier,
      subtype: parsed.subtype,
      isCorner: parsed.isCorner,
      annotations: parsed.annotations,
      glbPath: relPath,
      categoryDir,
    });
  }

  return {
    id: slugify(catalogName),
    name: catalogName,
    modules,
    moduleCount: modules.length,
    tiers: [...tiersSet] as any[],
  };
}

/**
 * Scan the entire assets directory. Each top-level subdirectory is a catalog.
 * Returns a Map of catalogId → Catalog.
 */
export function scanAllCatalogs(assetsDir: string): Map<string, Catalog> {
  const catalogs = new Map<string, Catalog>();

  if (!fs.existsSync(assetsDir)) {
    console.warn(`Assets directory not found: ${assetsDir}`);
    return catalogs;
  }

  const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip hidden directories
    if (entry.name.startsWith('.')) continue;

    const catalogDir = path.join(assetsDir, entry.name);
    const catalog = scanCatalog(catalogDir, entry.name, assetsDir);

    if (catalog.modules.length > 0) {
      catalogs.set(catalog.id, catalog);
      console.log(`  Scanned catalog "${catalog.name}": ${catalog.moduleCount} modules, tiers: [${catalog.tiers.join(', ')}]`);
    } else {
      console.warn(`  Skipping empty catalog: "${entry.name}"`);
    }
  }

  return catalogs;
}
