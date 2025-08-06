// Import dependencies
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimiter from '../server/middleware/rateLimiter.mjs';
import apiRoutes from '../server/routes/apiRoutes.mjs';
import notFoundHandler from '../server/utils/notFoundHandler.mjs';
import errorHandler from '../server/utils/errorHandler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFolderPath = path.join(__dirname, '..', 'data');
const apiDefinitionPath = path.join(__dirname, '..', 'docs', 'api-definition.yaml');
const publicFolderPath = path.join(__dirname, '..', 'server', 'public');
const publicHtmlFilePath = path.join(__dirname, '..', 'server', 'public', 'docs.html');

// Create Express app
const app = express();

// Disable the X-Powered-By header
app.disable('x-powered-by');

// Enable CORS
app.use(cors());

// Serve documentation files
app.use('/docs/api-definition.yaml', express.static(apiDefinitionPath));
app.use('/', express.static(publicFolderPath));

// Handle docs route specifically
app.get('/docs', (req, res) => {
    res.sendFile(publicHtmlFilePath);
});

// Handle root route to redirect to docs
app.get('/', (req, res) => {
    res.sendFile(publicHtmlFilePath);
});

// Setup other routes
app.use(rateLimiter);
app.use('/data', express.static(dataFolderPath));
app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// Export the app for Vercel
export default app;
