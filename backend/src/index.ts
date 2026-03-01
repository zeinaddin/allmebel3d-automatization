import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, ASSETS_DIR, CORS_ORIGINS } from './config';
import { scanAllCatalogs } from './services/catalogScanner';
import { createCatalogsRouter } from './routes/catalogs';
import { createModulesRouter } from './routes/modules';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());

// Scan catalogs from filesystem at startup
console.log(`Scanning catalogs from: ${ASSETS_DIR}`);
const catalogs = scanAllCatalogs(ASSETS_DIR);
console.log(`Found ${catalogs.size} catalog(s)\n`);

// Static file serving for GLB assets
// URL: /assets/Каталог%20Рояль%20Мебелей/С%20-%20Нижние%20модули/С%20300.glb
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

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/catalogs`);
  console.log(`Assets: http://localhost:${PORT}/assets/`);
});
