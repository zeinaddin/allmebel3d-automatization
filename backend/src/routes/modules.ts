import { Router, Request, Response } from 'express';
import { Catalog, Module, Tier, Subtype } from '../types';

export function createModulesRouter(catalogs: Map<string, Catalog>): Router {
  const router = Router();

  // GET /api/catalogs/:catalogId/modules — list modules with optional filters
  // Query params: tier, subtype, minWidth, maxWidth, isCorner
  router.get('/:catalogId/modules', (req: Request<{ catalogId: string }>, res: Response) => {
    const catalog = catalogs.get(req.params.catalogId);
    if (!catalog) {
      res.status(404).json({ error: `Catalog "${req.params.catalogId}" not found` });
      return;
    }

    let modules = catalog.modules;

    // Filter by tier
    const tier = req.query.tier as string | undefined;
    if (tier) {
      modules = modules.filter(m => m.tier === tier);
    }

    // Filter by subtype
    const subtype = req.query.subtype as string | undefined;
    if (subtype) {
      modules = modules.filter(m => m.subtype === subtype);
    }

    // Filter by width range
    const minWidth = req.query.minWidth ? parseInt(req.query.minWidth as string, 10) : undefined;
    const maxWidth = req.query.maxWidth ? parseInt(req.query.maxWidth as string, 10) : undefined;
    if (minWidth !== undefined && !isNaN(minWidth)) {
      modules = modules.filter(m => m.width >= minWidth);
    }
    if (maxWidth !== undefined && !isNaN(maxWidth)) {
      modules = modules.filter(m => m.width <= maxWidth);
    }

    // Filter by corner
    const isCorner = req.query.isCorner as string | undefined;
    if (isCorner !== undefined) {
      const cornerBool = isCorner === 'true';
      modules = modules.filter(m => m.isCorner === cornerBool);
    }

    res.json({
      catalogId: catalog.id,
      catalogName: catalog.name,
      total: modules.length,
      modules,
    });
  });

  // GET /api/catalogs/:catalogId/modules/:moduleId — single module
  router.get('/:catalogId/modules/:moduleId', (req: Request<{ catalogId: string; moduleId: string }>, res: Response) => {
    const catalog = catalogs.get(req.params.catalogId);
    if (!catalog) {
      res.status(404).json({ error: `Catalog "${req.params.catalogId}" not found` });
      return;
    }

    const module = catalog.modules.find(m => m.id === req.params.moduleId);
    if (!module) {
      res.status(404).json({ error: `Module "${req.params.moduleId}" not found` });
      return;
    }

    res.json(module);
  });

  return router;
}
