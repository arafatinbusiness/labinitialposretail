// Simple Express server for local API development
// Run this alongside Vite: node api-server.js

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import the actual API handler
const generatePdfModule = await import('./api/generate-pdf.js');
const generatePdfHandler = generatePdfModule.default || generatePdfModule;

// API endpoint
app.post('/api/generate-pdf', async (req, res) => {
  console.log(`[Local API] Received request for PDF generation`);
  
  try {
    // Call the actual handler
    await generatePdfHandler(req, res);
  } catch (error) {
    console.error('[Local API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF API server is running' });
});

// Start server
app.listen(port, () => {
  console.log(`📄 Local PDF API server running at http://localhost:${port}`);
  console.log(`📄 API endpoint: POST http://localhost:${port}/api/generate-pdf`);
  console.log(`📄 Health check: GET http://localhost:${port}/api/health`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📄 Shutting down PDF API server...');
  process.exit(0);
});
