import path from 'path';

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const ASSETS_DIR = process.env.ASSETS_DIR || path.resolve(__dirname, '..', 'assets');
export const FAL_API_KEY = process.env.FAL_API_KEY || '7dceeb12-981a-4ae0-b129-2de67ace7e51:39cd7466a2c548e854bb1021bffbf0d3';

export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/allmebel3d';

export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads');

export const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
