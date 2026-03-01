import path from 'path';

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
export const CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];
