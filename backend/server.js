const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');
const { verifyToken } = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');

const authController = require('./controllers/auth');
const licenseController = require('./controllers/license');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse request bodies
app.use(express.json());

// Apply global rate limiting to all API requests
app.use('/api', rateLimiter(200, 15 * 60 * 1000)); // 200 requests per 15 minutes per IP

// Serve static admin dashboard
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Serve extension files statically for preview/testing
app.use('/extension', express.static(path.join(__dirname, '../extension')));
app.use('/icons', express.static(path.join(__dirname, '../icons')));

// API Routes
// Authentication
app.post('/api/auth/login', authController.login);
app.get('/api/auth/profile', verifyToken, authController.getProfile);
app.post('/api/auth/change-password', verifyToken, authController.changePassword);

// Licensing Operations
app.post('/api/license/verify', rateLimiter(30, 60 * 1000), licenseController.verifyLicense); // limit key-verifying to 30 requests/min
app.get('/api/license/list', verifyToken, licenseController.listLicenses);
app.get('/api/license/stats', verifyToken, licenseController.getStats);
app.post('/api/license/create', verifyToken, licenseController.createLicense);
app.patch('/api/license/update/:id', verifyToken, licenseController.updateLicense);

// Fallback for Admin SPA to serve index.html
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Root Redirect to Admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// Initialize database and start listening
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`Licensing & AI API Server running on port ${PORT}`);
      console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
      console.log(`=========================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database. Server not started.', err);
    process.exit(1);
  });
