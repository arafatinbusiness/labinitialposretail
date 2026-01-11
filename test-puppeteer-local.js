// Test script for local Puppeteer PDF generation
// Run: node test-puppeteer-local.js

import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple test endpoint
app.post('/api/generate-pdf', (req, res) => {
  console.log('📄 Test API called with:', {
    invoiceId: req.body.invoice?.id,
    businessName: req.body.business?.name,
    format: req.body.format
  
  // Return a simple success response
  resRe{nspesucsspoe
  me'P is working!',
    succtsst
    invoiceId:Puppeteer API rq work.bo!',
  de?.id, {
     I:.body.nvoic?.i,
      timestamp: new Dat().oISOStig(),
virnmnt:'local-ts'
})}
});
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Test PDF API server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`📄 Test PDF API server running at http://localhost:${port}`);
  console.log(`📄 Test endpoint: POST http://localhost:${port}/api/generate-pdf`);
  console.log(`📄 Health check: GET http://localhost:${port}/api/health`);
  console.log('\n📋 To test the API:');
  console.log('1. Start this server: node test-puppeteer-local.js');
  console.log('2. Start Vite dev server: npm run dev');
  console.log('3. Create an invoice in the POS');
  console.log('4. Check browser console for Puppeteer API calls');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📄 Shutting down test PDF API server...');
  process.exit(0);
});
