import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { Module, Tier, Subtype } from '../types';

/** Map a Prisma Asset row → Module shape for frontend backward compatibility */
function assetToModule(a: {
  id: number;
  name: string;
  code: string;
  width: number;
  tier: string;
  subtype: string;
  isCorner: boolean;
  annotations: unknown;
  glbUrl: string;
  price: { toNumber?: () => number } | number;
  description: string | null;
}): Module {
  return {
    id: String(a.id),
    code: a.code,
    name: a.name,
    width: a.width,
    tier: a.tier as Tier,
    subtype: a.subtype as Subtype,
    isCorner: a.isCorner,
    annotations: (a.annotations as string[]) || [],
    glbPath: a.glbUrl,
    categoryDir: '',
    price: typeof a.price === 'number' ? a.price : (a.price?.toNumber?.() ?? 0),
    description: a.description,
  };
}

export function createModulesRouter(): Router {
  const router = Router();

  // GET /api/catalogs/:catalogId/modules — list modules with optional filters
  router.get('/:catalogId/modules', async (req: Request<{ catalogId: string }>, res: Response) => {
    const catalogId = parseInt(req.params.catalogId, 10);

    const catalog = await prisma.catalog.findUnique({ where: { id: catalogId } });
    if (!catalog) {
      res.status(404).json({ error: `Catalog "${req.params.catalogId}" not found` });
      return;
    }

    const where: Record<string, unknown> = { catalogId };

    const tier = req.query.tier as string | undefined;
    if (tier) where.tier = tier;

    const subtype = req.query.subtype as string | undefined;
    if (subtype) where.subtype = subtype;

    const minWidth = req.query.minWidth ? parseInt(req.query.minWidth as string, 10) : undefined;
    const maxWidth = req.query.maxWidth ? parseInt(req.query.maxWidth as string, 10) : undefined;
    if (minWidth !== undefined && !isNaN(minWidth)) where.width = { ...(where.width as object || {}), gte: minWidth };
    if (maxWidth !== undefined && !isNaN(maxWidth)) where.width = { ...(where.width as object || {}), lte: maxWidth };

    const isCorner = req.query.isCorner as string | undefined;
    if (isCorner !== undefined) where.isCorner = isCorner === 'true';

    const assets = await prisma.asset.findMany({ where, orderBy: { id: 'asc' } });
    const modules = assets.map(assetToModule);

    res.json({
      catalogId: String(catalog.id),
      catalogName: catalog.name,
      total: modules.length,
      modules,
    });
  });

  // GET /api/catalogs/:catalogId/modules/:moduleId — single module
  router.get('/:catalogId/modules/:moduleId', async (req: Request<{ catalogId: string; moduleId: string }>, res: Response) => {
    const id = parseInt(req.params.moduleId, 10);
    const asset = await prisma.asset.findUnique({ where: { id } });

    if (!asset || asset.catalogId !== parseInt(req.params.catalogId, 10)) {
      res.status(404).json({ error: `Module "${req.params.moduleId}" not found` });
      return;
    }

    res.json(assetToModule(asset));
  });

  return router;
}
