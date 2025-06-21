// config.js
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

const config = {
    port: process.env.PORT || 5000,
    databaseUrl: process.env.DATABASE_URL || 'sqlite://path_to_your_db',
    secretKey: process.env.SECRET_KEY || 'your_secret_key',
    apiRateLimit: process.env.API_RATE_LIMIT || 200
};

// دالة فتح قاعدة البيانات
export const getDatabase = async () => {
    return await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });
};

export default config;
