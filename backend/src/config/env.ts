import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-native-audio-latest',
  jwtSecret: process.env.JWT_SECRET || 'default-super-secret-key-change-me',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  databasePath: process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/mma.db' : path.resolve(process.cwd(), 'data/mma.db')),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

if (!CONFIG.geminiApiKey) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in environment!');
}
