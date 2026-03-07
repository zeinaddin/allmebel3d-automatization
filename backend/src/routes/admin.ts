import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../services/prisma';
import { upload } from '../services/upload';
import { UPLOADS_DIR } from '../config';

const router = Router();

// ────────────────── COMPANIES ──────────────────

router.get('/companies', async (_req: Request, res: Response) => {
  const companies = await prisma.company.findMany({
    include: { _count: { select: { catalogs: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(companies);
});

router.post('/companies', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const company = await prisma.company.create({ data: { name } });
  res.status(201).json(company);
});

router.put('/companies/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { name } = req.body;
  try {
    const company = await prisma.company.update({ where: { id }, data: { name } });
    res.json(company);
  } catch {
    res.status(404).json({ error: 'Company not found' });
  }
});

router.delete('/companies/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    await prisma.company.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Company not found' });
  }
});

// ────────────────── CATALOGS ──────────────────

router.get('/catalogs', async (req: Request, res: Response) => {
  const companyId = req.query.companyId ? parseInt(req.query.companyId as string, 10) : undefined;
  const catalogs = await prisma.catalog.findMany({
    where: companyId ? { companyId } : undefined,
    include: {
      company: { select: { name: true } },
      _count: { select: { assets: true } },
    },
    orderBy: { id: 'asc' },
  });
  res.json(catalogs);
});

router.post('/catalogs', async (req: Request, res: Response) => {
  const { name, companyId } = req.body;
  if (!name || !companyId) {
    res.status(400).json({ error: 'name and companyId are required' });
    return;
  }
  const catalog = await prisma.catalog.create({
    data: { name, companyId: parseInt(companyId, 10) },
  });
  res.status(201).json(catalog);
});

router.put('/catalogs/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { name, companyId } = req.body;
  try {
    const catalog = await prisma.catalog.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(companyId !== undefined && { companyId: parseInt(companyId, 10) }),
      },
    });
    res.json(catalog);
  } catch {
    res.status(404).json({ error: 'Catalog not found' });
  }
});

router.delete('/catalogs/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    await prisma.catalog.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Catalog not found' });
  }
});

// ────────────────── ASSETS ──────────────────

router.get('/assets', async (req: Request, res: Response) => {
  const catalogId = req.query.catalogId ? parseInt(req.query.catalogId as string, 10) : undefined;
  const tier = req.query.tier as string | undefined;
  const subtype = req.query.subtype as string | undefined;

  const assets = await prisma.asset.findMany({
    where: {
      ...(catalogId && { catalogId }),
      ...(tier && { tier }),
      ...(subtype && { subtype }),
    },
    include: {
      catalog: { select: { name: true, company: { select: { name: true } } } },
    },
    orderBy: { id: 'asc' },
  });
  res.json(assets);
});

router.post('/assets', upload.single('glb'), async (req: Request, res: Response) => {
  const { name, code, width, tier, subtype, isCorner, price, description, catalogId } = req.body;

  if (!name || !code || !width || !tier || !subtype || !catalogId) {
    res.status(400).json({ error: 'name, code, width, tier, subtype, catalogId are required' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'GLB file is required' });
    return;
  }

  const glbUrl = `/uploads/${file.filename}`;

  const asset = await prisma.asset.create({
    data: {
      catalogId: parseInt(catalogId, 10),
      name,
      code,
      width: parseInt(width, 10),
      tier,
      subtype,
      isCorner: isCorner === 'true',
      glbUrl,
      price: parseFloat(price || '0'),
      description: description || null,
      annotations: JSON.parse(req.body.annotations || '[]'),
    },
  });
  res.status(201).json(asset);
});

router.put('/assets/:id', upload.single('glb'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { name, code, width, tier, subtype, isCorner, price, description, catalogId } = req.body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (code !== undefined) data.code = code;
  if (width !== undefined) data.width = parseInt(width, 10);
  if (tier !== undefined) data.tier = tier;
  if (subtype !== undefined) data.subtype = subtype;
  if (isCorner !== undefined) data.isCorner = isCorner === 'true';
  if (price !== undefined) data.price = parseFloat(price);
  if (description !== undefined) data.description = description || null;
  if (catalogId !== undefined) data.catalogId = parseInt(catalogId, 10);
  if (req.body.annotations !== undefined) data.annotations = JSON.parse(req.body.annotations);

  // If new GLB file uploaded, update path and clean up old one
  if (req.file) {
    const oldAsset = await prisma.asset.findUnique({ where: { id } });
    if (oldAsset?.glbUrl.startsWith('/uploads/')) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(oldAsset.glbUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    data.glbUrl = `/uploads/${req.file.filename}`;
  }

  try {
    const asset = await prisma.asset.update({ where: { id }, data });
    res.json(asset);
  } catch {
    res.status(404).json({ error: 'Asset not found' });
  }
});

router.delete('/assets/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }

    // Clean up uploaded GLB file
    if (asset.glbUrl.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(asset.glbUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.asset.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Asset not found' });
  }
});

export default router;
