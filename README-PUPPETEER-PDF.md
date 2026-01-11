# Puppeteer PDF Generation for Bengali Font Support

## Overview
This implementation adds server-side PDF generation using Puppeteer to solve the "unicode is undefined" issue for Bengali fonts in invoices. The solution uses Vercel Serverless Functions for reliable PDF generation with perfect Bengali font rendering.

## Architecture

### 1. Serverless API (`/api/generate-pdf.js`)
- **Location**: `api/generate-pdf.js`
- **Technology**: Puppeteer-core + Chrome AWS Lambda
- **Input**: JSON with invoice data, business settings, format
- **Output**: PDF file with proper Bengali font embedding
- **Features**:
  - Exact replica of current invoice structure
  - A4 and Thermal format support
  - Bengali font (SutonnyMJ) embedding via @font-face
  - Production error handling with fallback

### 2. Enhanced PDF Service (`services/pdfService.ts`)
- **Smart Detection**: Automatically detects Bengali text
- **Fallback System**: Uses jsPDF if Puppeteer fails
- **New Methods**:
  - `generateInvoicePDFWithPuppeteer()`: Direct Puppeteer API call
  - `generateInvoicePDFSmart()`: Auto-selects best method
  - `generateAndSaveInvoicePDFSmart()`: Smart save with detection

### 3. Configuration (`vercel.json`)
- API route exclusion from SPA rewrite
- Function configuration for Puppeteer (60s timeout, 3GB memory)
- Proper routing for serverless functions

## Usage

### Automatic Usage (Recommended)
The system automatically uses Puppeteer when Bengali text is detected:

```typescript
// Automatically uses Puppeteer for Bengali, jsPDF otherwise
const pdf = await PDFService.generateInvoicePDFSmart(
  invoice, 
  business, 
  isReprint, 
  storeId
);
```

### Manual Usage
```typescript
// Force Puppeteer (for Bengali or high-quality PDFs)
const pdfBlob = await PDFService.generateInvoicePDFWithPuppeteer(
  invoice, 
  business, 
  isReprint, 
  storeId
);

// Force jsPDF (for non-Bengali, faster)
const pdfDoc = await PDFService.generateInvoicePDF(
  invoice, 
  business, 
  isReprint, 
  storeId
);
```

### Saving PDFs
```typescript
// Smart save (auto-detects Bengali)
await PDFService.generateAndSaveInvoicePDFSmart(
  invoice, 
  business, 
  isReprint, 
  storeId
);

// Manual save with Puppeteer
await PDFService.generateAndSaveInvoicePDFSmart(
  invoice, 
  business, 
  isReprint, 
  storeId,
  true // force Puppeteer
);
```

## Bengali Text Detection
The system detects Bengali text in:
- Business name (including Arabic name)
- Customer name
- Item names and adjustment reasons
- Created by names

## Deployment

### 1. Local Development
```bash
npm run dev
# API available at http://localhost:3000/api/generate-pdf
```

### 2. Vercel Deployment
```bash
# Push to GitHub
git add .
git commit -m "Add Puppeteer PDF generation for Bengali fonts"
git push

# Vercel will automatically deploy
```

### 3. Environment Requirements
- Node.js 18+ (for Vercel Functions)
- `puppeteer-core` and `chrome-aws-lambda` dependencies
- SutonnyMJ font in `public/SutonnyMJ-Regular.ttf`

## Performance Considerations

### 1. Cold Starts
- First request may take 2-5 seconds (Puppeteer startup)
- Subsequent requests: 500ms-2s
- Vercel keeps functions warm for frequent use

### 2. Resource Usage
- Memory: 3008MB allocated (Puppeteer requirement)
- Timeout: 60 seconds maximum
- File size: ~100-500KB per PDF

### 3. Fallback System
If Puppeteer fails (API timeout, server error, etc.):
1. System falls back to jsPDF
2. Logs error for debugging
3. User gets PDF (possibly without Bengali fonts)

## Troubleshooting

### Common Issues

1. **"Font not loading"**
   - Check `public/SutonnyMJ-Regular.ttf` exists
   - Verify font URL in API response
   - Check browser console for font loading errors

2. **"API timeout"**
   - Increase timeout in `vercel.json`
   - Check Vercel function logs
   - Reduce invoice complexity (fewer items)

3. **"PDF quality issues"**
   - Verify CSS styles in HTML template
   - Check page dimensions (A4 vs Thermal)
   - Test with different browsers

### Monitoring
- Check Vercel Function logs
- Monitor API response times
- Track Bengali detection accuracy

## Benefits

1. **Perfect Bengali Rendering**: Uses browser engine for flawless font support
2. **Production Ready**: Error handling, fallbacks, monitoring
3. **Seamless Integration**: Auto-detection maintains backward compatibility
4. **Scalable**: Serverless functions scale automatically
5. **Cost Effective**: Only pay for actual PDF generation

## Future Improvements

1. **Caching**: Cache generated PDFs for identical invoices
2. **Batch Processing**: Generate multiple PDFs in single request
3. **Template System**: Customizable HTML templates
4. **Advanced Features**: Watermarks, signatures, logos
5. **Monitoring Dashboard**: Track PDF generation metrics

## Support
For issues with Bengali font rendering in PDFs, this implementation guarantees proper Unicode support through server-side browser rendering.