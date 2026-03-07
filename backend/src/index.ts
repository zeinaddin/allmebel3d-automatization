import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PORT, ASSETS_DIR, UPLOADS_DIR, CORS_ORIGINS } from './config';
import { createCatalogsRouter } from './routes/catalogs';
import { createModulesRouter } from './routes/modules';
import { createGenerateRouter } from './routes/generate';
import adminRouter from './routes/admin';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(compression());
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: '20mb' }));

// Rate limit AI generation endpoint (10 requests per minute)
const generateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Too many generation requests, try again later' },
});

// Static file serving for GLB assets (legacy filesystem paths)
app.use('/assets', express.static(ASSETS_DIR, {
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  },
}));

// Static file serving for uploaded GLB files (new DB-managed)
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  },
}));

// API routes (Prisma-backed)
app.use('/api/catalogs', createCatalogsRouter());
app.use('/api/catalogs', createModulesRouter());

// Admin CRUD routes
app.use('/api/admin', adminRouter);

// AI room generation (fal.ai proxy) — rate limited
app.use('/api', generateLimiter, createGenerateRouter());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running at http://0.0.0.0:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/catalogs`);
  console.log(`Assets: http://localhost:${PORT}/assets/`);
  console.log(`Uploads: http://localhost:${PORT}/uploads/`);
  console.log(`Admin: http://localhost:${PORT}/api/admin/`);
});
