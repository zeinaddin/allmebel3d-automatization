import { PrismaClient } from '@prisma/client';
import { scanAllCatalogs } from '../src/services/catalogScanner';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const assetsDir = path.resolve(__dirname, '..', 'assets');
  console.log(`Seeding from: ${assetsDir}`);

  const catalogs = scanAllCatalogs(assetsDir);

  // Create default company
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Рояль Мебелей' },
  });
  console.log(`Company: ${company.name} (id=${company.id})`);

  for (const [_catalogId, catalog] of catalogs) {
    // Create catalog
    const dbCatalog = await prisma.catalog.create({
      data: {
        name: catalog.name,
        companyId: company.id,
      },
    });
    console.log(`  Catalog: ${dbCatalog.name} (id=${dbCatalog.id})`);

    // Create assets (modules)
    for (const mod of catalog.modules) {
      await prisma.asset.create({
        data: {
          catalogId: dbCatalog.id,
          name: mod.name,
          code: mod.code,
          width: mod.width,
          tier: mod.tier,
          subtype: mod.subtype,
          isCorner: mod.isCorner,
          glbUrl: mod.glbPath,
          price: 0,
          description: null,
          annotations: mod.annotations,
        },
      });
    }
    console.log(`    → ${catalog.modules.length} assets imported`);
  }

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
