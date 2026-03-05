import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PORT, ASSETS_DIR, CORS_ORIGINS } from './config';
import { scanAllCatalogs } from './services/catalogScanner';
import { createCatalogsRouter } from './routes/catalogs';
import { createModulesRouter } from './routes/modules';
import { createGenerateRouter } from './routes/generate';
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

// Scan catalogs from filesystem at startup
console.log(`Scanning catalogs from: ${ASSETS_DIR}`);
const catalogs = scanAllCatalogs(ASSETS_DIR);
console.log(`Found ${catalogs.size} catalog(s)\n`);

// Static file serving for GLB assets
app.use('/assets', express.static(ASSETS_DIR, {
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  },
}));

// API routes
app.use('/api/catalogs', createCatalogsRouter(catalogs));
app.use('/api/catalogs', createModulesRouter(catalogs));

// AI room generation (fal.ai proxy) — rate limited
app.use('/api', generateLimiter, createGenerateRouter());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    catalogs: catalogs.size,
    totalModules: Array.from(catalogs.values()).reduce((sum, c) => sum + c.moduleCount, 0),
  });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running at http://0.0.0.0:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/catalogs`);
  console.log(`Assets: http://localhost:${PORT}/assets/`);
});
