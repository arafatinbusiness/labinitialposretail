import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  try {
    const { invoice, business, format = 'a4', isReprint = false } = req.body;
    
    // Validate required data
    if (!invoice || !business) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Missing required data: invoice and business are required'
      });
    }

    console.log(`[PDF API] Generating PDF for invoice ${invoice.id}, format: ${format}, business: ${business.name}`);
    
    // Launch browser with Vercel-compatible configuration
    console.log('[PDF API] Launching Chrome with Puppeteer...');
    let browser;
    try {
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
      console.log('[PDF API] Chrome launched successfully');
    } catch (chromeError) {
      console.error('[PDF API] Chrome launch failed:', chromeError);
      return res.status(500).json({
        error: 'Chrome failed to launch',
        message: chromeError.message,
        details: 'Check Vercel function logs for more details'
      });
    }
    
    const page = await browser.newPage();
    
    // Generate HTML from template
    const html = generateInvoiceHTML(invoice, business, format, isReprint);
    
    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Configure PDF options based on format
    const pdfOptions = {
      format: format === 'thermal' ? { width: '80mm', height: '297mm' } : 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    };
    
    // Generate PDF
    const pdf = await page.pdf(pdfOptions);
    
    await browser.close();
    
    console.log(`[PDF API] PDF generated successfully for invoice ${invoice.id}, size: ${pdf.length} bytes`);
    
    // Return PDF with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.id}_${format}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.send(pdf);
    
  } catch (error) {
    console.error('[PDF API] Error generating PDF:', error);
    
    // Return detailed error for debugging (in production, you might want to be less verbose)
    res.status(500).json({
      error: 'PDF generation failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Helper function to generate invoice HTML
function generateInvoiceHTML(invoice, business, format, isReprint) {
  const invoiceDate = new Date(invoice.date);
  const dateStr = invoiceDate.toLocaleDateString();
  const timeStr = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Format currency
  const formatCurrency = (amount) => {
    return `${business.currency === 'BDT' ? '৳' : '$'} ${amount.toFixed(2)}`;
  };
  
  // Generate items table rows
  const itemsRows = invoice.items.map(item => {
    const salePrice = item.salePrice !== undefined ? item.salePrice : item.price;
    const total = salePrice * item.quantity;
    const adjustmentReason = item.adjustmentReason || '';
    
    return `
      <tr>
        <td>${item.name}${adjustmentReason ? `<br><small>(${adjustmentReason})</small>` : ''}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td>${salePrice.toFixed(2)}</td>
        <td>${formatCurrency(total)}</td>
      </tr>
    `;
  }).join('');
  
  // Generate summary items
  const summaryItems = [
    { label: 'Subtotal:', value: invoice.subtotal },
    { label: 'VAT:', value: invoice.totalVat },
  ];
  
  if (invoice.discount > 0) {
    summaryItems.push({ label: 'Discount:', value: -invoice.discount });
  }
  
  summaryItems.push({ label: 'Grand Total:', value: invoice.grandTotal });
  summaryItems.push({ label: 'Paid:', value: invoice.paidAmount });
  
  const dueOrChangeLabel = invoice.dueAmount > 0 ? 'Due:' : 'Change:';
  const dueOrChangeValue = Math.abs(invoice.dueAmount);
  summaryItems.push({ label: dueOrChangeLabel, value: dueOrChangeValue });
  
  const summaryRows = summaryItems.map(item => `
    <tr>
      <td>${item.label}</td>
      <td>${formatCurrency(Math.abs(item.value))}</td>
    </tr>
  `).join('');
  
  // Base URL for fonts and assets
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoice.id}</title>
      <style>
        @font-face {
          font-family: 'SutonnyMJ';
          src: url('${baseUrl}/SutonnyMJ-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${format === 'thermal' ? "'SutonnyMJ', Arial, sans-serif" : "Arial, sans-serif"};
          font-size: ${format === 'thermal' ? '9px' : '12px'};
          line-height: 1.4;
          color: #000;
          padding: ${format === 'thermal' ? '8mm' : '10mm'};
          max-width: ${format === 'thermal' ? '80mm' : '210mm'};
          margin: 0 auto;
        }
        
        .bengali {
          font-family: 'SutonnyMJ', Arial, sans-serif;
        }
        
        .invoice-header {
          text-align: center;
          margin-bottom: ${format === 'thermal' ? '6mm' : '10mm'};
        }
        
        .reprint {
          color: #999;
          font-size: 10px;
          margin-bottom: 4mm;
        }
        
        .business-name-arabic {
          font-size: ${format === 'thermal' ? '12px' : '16px'};
          margin-bottom: ${format === 'thermal' ? '4mm' : '6mm'};
        }
        
        .business-name {
          font-size: ${format === 'thermal' ? '16px' : '20px'};
          font-weight: bold;
          margin-bottom: ${format === 'thermal' ? '6mm' : '8mm'};
        }
        
        .invoice-id {
          font-size: ${format === 'thermal' ? '12px' : '16px'};
          margin-bottom: ${format === 'thermal' ? '4mm' : '6mm'};
        }
        
        .business-info {
          font-size: ${format === 'thermal' ? '8px' : '10px'};
          margin-bottom: ${format === 'thermal' ? '3mm' : '5mm'};
          line-height: 1.6;
        }
        
        .customer-info {
          font-size: ${format === 'thermal' ? '8px' : '10px'};
          margin-bottom: ${format === 'thermal' ? '4mm' : '6mm'};
          line-height: 1.6;
        }
        
        .separator {
          border-top: 0.2mm solid #000;
          margin: ${format === 'thermal' ? '3mm 0' : '4mm 0'};
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: ${format === 'thermal' ? '4mm' : '6mm'};
        }
        
        .items-table th {
          text-align: left;
          font-weight: bold;
          border-bottom: 0.1mm solid #000;
          padding: ${format === 'thermal' ? '1mm 0' : '2mm 0'};
        }
        
        .items-table td {
          padding: ${format === 'thermal' ? '1mm 0' : '2mm 0'};
          border-bottom: 0.1mm solid #ddd;
        }
        
        .items-table td:last-child {
          text-align: right;
        }
        
        .summary-table {
          width: 100%;
          margin-bottom: ${format === 'thermal' ? '4mm' : '6mm'};
        }
        
        .summary-table td {
          padding: ${format === 'thermal' ? '1mm 0' : '2mm 0'};
        }
        
        .summary-table td:last-child {
          text-align: right;
          font-weight: bold;
        }
        
        .grand-total {
          border-top: 0.3mm solid #000;
          font-weight: bold;
        }
        
        .footer {
          text-align: center;
          margin-top: ${format === 'thermal' ? '6mm' : '10mm'};
          font-size: ${format === 'thermal' ? '8px' : '10px'};
        }
        
        .thank-you {
          font-size: ${format === 'thermal' ? '10px' : '12px'};
          font-weight: bold;
          font-style: italic;
          margin: ${format === 'thermal' ? '4mm 0' : '6mm 0'};
        }
        
        .software-by {
          font-size: ${format === 'thermal' ? '6px' : '8px'};
          color: #666;
          margin-top: ${format === 'thermal' ? '3mm' : '5mm'};
        }
        
        .cheerful-notice {
          font-size: ${format === 'thermal' ? '8px' : '10px'};
          margin-top: ${format === 'thermal' ? '3mm' : '5mm'};
          color: #333;
        }
        
        .qr-section {
          text-align: center;
          margin-top: ${format === 'thermal' ? '4mm' : '6mm'};
        }
        
        .qr-code {
          width: ${format === 'thermal' ? '20mm' : '30mm'};
          height: ${format === 'thermal' ? '20mm' : '30mm'};
          margin: 0 auto;
        }
        
        .qr-text {
          font-size: ${format === 'thermal' ? '6px' : '8px'};
          color: #666;
          margin-top: 1mm;
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        ${isReprint ? '<div class="reprint">REPRINT</div>' : ''}
        
        <div class="invoice-header">
          ${business.nameArabic ? `<div class="business-name-arabic bengali">${business.nameArabic}</div>` : ''}
          <div class="business-name">${business.name}</div>
          <div class="invoice-id">#${invoice.id}</div>
          
          <div class="business-info">
            ${business.address ? `<div>${business.address}</div>` : ''}
            ${business.phone ? `<div>Phone: ${business.phone}</div>` : ''}
          </div>
          
          <div class="customer-info">
            <div>Date: ${dateStr} | Time: ${timeStr}</div>
            <div>Customer: ${invoice.customerName}</div>
            ${invoice.createdBy ? `<div>Created by: ${invoice.createdBy.name} (${invoice.createdBy.role.toUpperCase()})</div>` : ''}
            ${invoice.customerPhone ? `<div>Phone: ${invoice.customerPhone}</div>` : ''}
          </div>
        </div>
        
        <div class="separator"></div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        
        <div class="separator"></div>
        
        <table class="summary-table">
          <tbody>
            ${summaryRows}
          </tbody>
        </table>
        
        <div class="footer">
          <div>Scan QR for details</div>
          <div class="thank-you">Thank You!</div>
          <div class="software-by">Software by Labinitial</div>
          ${business.cheerfulNotice ? `<div class="cheerful-notice">${business.cheerfulNotice}</div>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}