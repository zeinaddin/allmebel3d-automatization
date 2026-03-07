import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { CatalogSummary, Tier } from '../types';

export function createCatalogsRouter(): Router {
  const router = Router();

  // GET /api/catalogs — list all catalogs (summary, no modules array)
  router.get('/', async (_req: Request, res: Response) => {
    const catalogs = await prisma.catalog.findMany({
      include: {
        _count: { select: { assets: true } },
        assets: { select: { tier: true }, distinct: ['tier'] },
      },
    });

    const summaries: CatalogSummary[] = catalogs.map((c) => ({
      id: String(c.id),
      name: c.name,
      moduleCount: c._count.assets,
      tiers: c.assets.map((a) => a.tier as Tier),
    }));

    res.json({ catalogs: summaries });
  });

  // GET /api/catalogs/:catalogId — single catalog summary
  router.get('/:catalogId', async (req: Request<{ catalogId: string }>, res: Response) => {
    const id = parseInt(req.params.catalogId, 10);
    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: {
        _count: { select: { assets: true } },
        assets: { select: { tier: true }, distinct: ['tier'] },
      },
    });

    if (!catalog) {
      res.status(404).json({ error: `Catalog "${req.params.catalogId}" not found` });
      return;
    }

    res.json({
      id: String(catalog.id),
      name: catalog.name,
      moduleCount: catalog._count.assets,
      tiers: catalog.assets.map((a) => a.tier as Tier),
    });
  });

  return router;
}
