import path from 'path';

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const ASSETS_DIR = process.env.ASSETS_DIR || path.resolve(__dirname, '..', 'assets');
export const FAL_API_KEY = process.env.FAL_API_KEY || '';

export const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
