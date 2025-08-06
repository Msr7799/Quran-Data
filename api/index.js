// Import dependencies
const path = require('path');
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Disable the X-Powered-By header
app.disable('x-powered-by');

// Enable CORS
app.use(cors());

// Define paths
const dataFolderPath = path.join(__dirname, '..', 'data');
const apiDefinitionPath = path.join(__dirname, '..', 'docs', 'api-definition.yaml');
const publicFolderPath = path.join(__dirname, '..', 'server', 'public');
const publicHtmlFilePath = path.join(__dirname, '..', 'server', 'public', 'docs.html');

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

// Basic rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    message: {
        success: false,
        error: '🛑 Rate Limit Exceeded.',
        message: 'معذرة، لقد تجاوزت الحد المسموح من الطلبات. حاول مجدداً بعد قليل.',
        retry_after: '15 دقيقة'
    }
});

app.use(limiter);
app.use('/data', express.static(dataFolderPath));

// Simple API routes handler
app.get('/api/surahs', (req, res) => {
    res.json({
        success: true,
        message: 'API is working! Surahs endpoint',
        note: 'This is a basic response. Full API functionality requires the complete routes module.'
    });
});

app.get('/api/surah/:id', (req, res) => {
    res.json({
        success: true,
        message: `API is working! Surah ${req.params.id} endpoint`,
        note: 'This is a basic response. Full API functionality requires the complete routes module.'
    });
});

// Catch-all for other API routes
app.use('/api/*', (req, res) => {
    res.json({
        success: true,
        message: 'API endpoint exists but needs full implementation',
        endpoint: req.originalUrl,
        note: 'This is a basic response. Full API functionality requires the complete routes module.'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'المسار المطلوب غير موجود',
        path: req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'حدث خطأ في الخادم'
    });
});

// Export the app for Vercel
module.exports = app;
