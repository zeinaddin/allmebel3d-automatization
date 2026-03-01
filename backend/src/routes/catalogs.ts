import { Router, Request, Response } from 'express';
import { Catalog, CatalogSummary } from '../types';

export function createCatalogsRouter(catalogs: Map<string, Catalog>): Router {
  const router = Router();

  // GET /api/catalogs — list all catalogs (summary, no modules array)
  router.get('/', (_req: Request, res: Response) => {
    const summaries: CatalogSummary[] = [];
    for (const catalog of catalogs.values()) {
      summaries.push({
        id: catalog.id,
        name: catalog.name,
        moduleCount: catalog.moduleCount,
        tiers: catalog.tiers,
      });
    }
    res.json({ catalogs: summaries });
  });

  // GET /api/catalogs/:catalogId — single catalog summary
  router.get('/:catalogId', (req: Request<{ catalogId: string }>, res: Response) => {
    const catalog = catalogs.get(req.params.catalogId);
    if (!catalog) {
      res.status(404).json({ error: `Catalog "${req.params.catalogId}" not found` });
      return;
    }
    res.json({
      id: catalog.id,
      name: catalog.name,
      moduleCount: catalog.moduleCount,
      tiers: catalog.tiers,
    });
  });

  return router;
}
