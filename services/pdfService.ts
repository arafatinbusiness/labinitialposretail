import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Invoice, BusinessSettings } from '../types';
import { ExcelService } from './excelService';
import { CurrencyService } from './currencyService';
import { PUBLIC_INVOICE_BASE_URL } from '../constants';

export class PDFService {
  /**
   * Generate QR code data URL for invoice
   */
  static async generateQRCodeDataUrl(
    storeId: string,
    invoiceId: string,
    business: BusinessSettings,
    invoiceTotal?: number,
    vatTotal?: number
  ): Promise<string> {
      try {
        let qrContent = `${PUBLIC_INVOICE_BASE_URL}/invoice/${storeId}/${invoiceId}`;
        if (business.qrCodeType === 'zatca' && business.zatcaSettings) {
             const zatca = business.zatcaSettings;
             qrContent = this.generateZATCAQRContent(
                zatca.sellerName,
                business.taxId || zatca.vatRegistrationNumber,
                zatca.invoiceSerialNumber,
                new Date().toISOString(),
                invoiceId,
                invoiceTotal || 0,
                vatTotal || 0
             );
        }
        return await QRCode.toDataURL(qrContent, { width: 150, margin: 0, color: { dark: '#000000', light: '#FFFFFF' } });
    } catch (e) { return ''; }
  }

  private static generateZATCAQRContent(
    sellerName: string,
    vatRegistrationNumber: string,
    invoiceSerialNumber: string,
    timestamp: string,
    invoiceId: string,
    invoiceTotal: number,
    vatTotal: number
  ): string {
    // Convert timestamp to ZATCA format (ISO 8601 without milliseconds)
    const date = new Date(timestamp);
    const isoString = date.toISOString();
    // Remove milliseconds and ensure Zulu time format
    const zatcaTimestamp = isoString.replace(/\.\d{3}Z$/, 'Z');
    const totalWithVat = invoiceTotal + vatTotal;
    
    // Create TLV data array (similar to Flutter implementation)
    const tlvData: number[] = [];
    
    // Helper function to create TLV segments
    const createTLV = (tag: number, value: string): void => {
      const valueBytes = new TextEncoder().encode(value);
      tlvData.push(tag);
      tlvData.push(valueBytes.length);
      tlvData.push(...valueBytes);
    };
    
    // Tag 1: Seller's Name (max 100 characters)
    const sellerNameTruncated = sellerName.substring(0, 100);
    createTLV(1, sellerNameTruncated);
    
    // Tag 2: VAT Registration Number (15 digits for Saudi Arabia)
    let vatNumber: string;
    if (vatRegistrationNumber.length === 15) {
      vatNumber = vatRegistrationNumber;
    } else if (vatRegistrationNumber.length < 15) {
      vatNumber = vatRegistrationNumber.padStart(15, '0').substring(0, 15);
    } else {
      vatNumber = vatRegistrationNumber.substring(0, 15);
    }
    createTLV(2, vatNumber);
    
    // Tag 3: Invoice Timestamp (Zulu time, ISO 8601)
    createTLV(3, zatcaTimestamp);
    
    // Tag 4: Invoice Total (with VAT) - format: 123.45
    createTLV(4, totalWithVat.toFixed(2));
    
    // Tag 5: VAT Total - format: 12.34
    createTLV(5, vatTotal.toFixed(2));
    
    // Note: Flutter implementation only uses Tags 1-5 (Phase 1)
    // This is compatible with ZATCA Phase 1 requirements
    // For Phase 2, you would need Tags 6-8 with proper cryptographic signature
    
    // Convert to Base64
    const byteArray = new Uint8Array(tlvData);
    let binary = '';
    for (let i = 0; i < byteArray.length; i++) {
      binary += String.fromCharCode(byteArray[i]);
    }
    
    return btoa(binary);
  }

  /**
   * Generate A4 format invoice PDF
   */
  static async generateA4InvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const margin = 10; // Increased from 2 to 10 for better top margin
    const pageWidth = 210;
    let yPos = margin;

    // Add header
    if (isReprint) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('REPRINT', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 8; // Increased from 6 to 8
    }
    
    if (business.nameArabic) {
      doc.setFontSize(16);
      doc.text(business.nameArabic, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10; // Increased from 8 to 10
    }
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(business.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12; // Increased from 10 to 12
    
    doc.setFontSize(16);
    doc.text(`#${invoice.id}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    if (business.address) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(business.address, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    if (business.phone) {
      doc.text(`Phone: ${business.phone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Customer info
    const invoiceDate = new Date(invoice.date);
    const dateStr = invoiceDate.toLocaleDateString();
    const timeStr = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    doc.text(`Date: ${dateStr} | Time: ${timeStr}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Customer: ${invoice.customerName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    // Show who created the bill
    if (invoice.createdBy) {
      const createdByText = `Created by: ${invoice.createdBy.name} (${invoice.createdBy.role.toUpperCase()})`;
      doc.text(createdByText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    yPos += 4;
    doc.setLineWidth(0.2);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;
    
    // Table for items
    const tableHeaders = [['Item', 'Qty', 'Price', 'Total']];
    const tableData = invoice.items.map((item: any) => {
      const isPriceAdjusted = item.priceAdjusted === true;
      const salePrice = item.salePrice !== undefined ? item.salePrice : item.price;
      const originalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
      const adjustmentReason = item.adjustmentReason || '';
      
      // Create item name with adjustment reason if available
      let itemName = item.name;
      if (isPriceAdjusted && adjustmentReason) {
        itemName += `\n(${adjustmentReason})`;
      }
      
      // Create price display - just show the sale price (adjusted price) without currency
      const displayCurrency = CurrencyService.getDisplayCurrency(business.currency);
      const priceDisplay = salePrice.toFixed(2); // No currency prefix
      
      return [
        itemName,
        `${item.quantity} ${item.unit}`,
        priceDisplay,
        `${displayCurrency} ${(salePrice * item.quantity).toFixed(2)}` // Currency with space
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: false,
        textColor: [0, 0, 0],
        fontSize: 10,
        fontStyle: 'bold',
        lineWidth: 0.2,
        lineColor: [0, 0, 0]
      },
      bodyStyles: { 
        fontSize: 10,
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - (margin * 2),
      styles: { 
        overflow: 'linebreak', 
        cellWidth: 'auto',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 3;
    
    // Summary section
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
    
    summaryItems.forEach((item, index) => {
      const isTotal = item.label === 'Grand Total:';
      const fontSize = isTotal ? 11 : 10;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
      
      doc.text(item.label, margin, yPos);
      const displayCurrency = CurrencyService.getDisplayCurrency(business.currency);
      const valueText = `${item.value >= 0 ? '' : '-'}${displayCurrency} ${Math.abs(item.value).toFixed(2)}`;
      doc.text(valueText, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 5;
      
      if (isTotal) {
        doc.setLineWidth(0.3);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        yPos += 2;
      }
      
      if (item.label === 'Paid:') {
        doc.setLineWidth(0.1);
        doc.line(margin, yPos - 1, pageWidth - margin, yPos - 1);
        yPos += 2;
      }
    });
    
    yPos += 3;
    
    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan QR for details', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Thank You!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Software by Labinitial', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    if (business.cheerfulNotice) {
      doc.setFontSize(10);
      doc.text(business.cheerfulNotice, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Add QR code if storeId is provided
    if (storeId) {
      try {
        yPos += 4;
        const qrCodeDataUrl = await this.generateQRCodeDataUrl(
          storeId, 
          invoice.id, 
          business,
          invoice.grandTotal,
          invoice.totalVat
        );
        
        if (qrCodeDataUrl) {
          const qrSize = 30;
          const qrX = (pageWidth - qrSize) / 2;
          doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
          yPos += qrSize + 2;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('Scan to verify invoice', pageWidth / 2, yPos, { align: 'center' });
          
          yPos += 4;
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          const qrUrl = `${PUBLIC_INVOICE_BASE_URL.replace('https://', '')}/invoice/${storeId}/${invoice.id}`;
          doc.text(qrUrl, pageWidth / 2, yPos, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      } catch (error) {
        console.error('Error adding QR code to PDF:', error);
      }
    }
    
    return doc;
  }

  /**
   * Generate thermal format invoice PDF with automatic page breaks for many items
   */
  static async generateThermalInvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] as [number, number],
      compress: true
    });

    const margin = 8;
    const pageWidth = 80;
    const pageHeight = 297;
    const maxY = pageHeight - margin; // Maximum Y position before needing new page
    let yPos = margin;
    let currentPage = 1;

    // Helper function to add new page
    const addNewPage = () => {
      doc.addPage([80, 297] as [number, number], 'portrait');
      currentPage++;
      yPos = margin;
      
      // Add continuation header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`CONTINUED - Page ${currentPage}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice #${invoice.id}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.text(`Customer: ${invoice.customerName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3;
    };

    // Add header only on first page
    if (isReprint) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('REPRINT', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    }
    
    if (business.nameArabic) {
      doc.setFontSize(12);
      doc.text(business.nameArabic, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(business.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text(`#${invoice.id}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    if (business.address) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(business.address, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    
    if (business.phone) {
      doc.text(`Phone: ${business.phone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    
    // Customer info
    const invoiceDate = new Date(invoice.date);
    const dateStr = invoiceDate.toLocaleDateString();
    const timeStr = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    doc.text(`Date: ${dateStr} | Time: ${timeStr}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`Customer: ${invoice.customerName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    
    // Show who created the bill
    if (invoice.createdBy) {
      const createdByText = `Created by: ${invoice.createdBy.name} (${invoice.createdBy.role.toUpperCase()})`;
      doc.text(createdByText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    
    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    
    yPos += 3;
    doc.setLineWidth(0.2);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;
    
    // Items in simplified format
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMS', margin, yPos);
    yPos += 5;
    
    // Process items with page break logic
    invoice.items.forEach((item: any, index) => {
      // Check if we need a new page before adding this item
      // Each item takes about 8-12mm depending on adjustment reason
      const itemHeight = item.adjustmentReason ? 12 : 8;
      if (yPos + itemHeight > maxY - 30) { // Leave room for summary section
        addNewPage();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ITEMS (continued)', margin, yPos);
        yPos += 5;
      }
      
      const isPriceAdjusted = item.priceAdjusted === true;
      const salePrice = item.salePrice !== undefined ? item.salePrice : item.price;
      const originalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
      const adjustmentReason = item.adjustmentReason || '';
      
      let itemName = item.name;
      const maxNameLength = 35;
      if (itemName.length > maxNameLength) {
        itemName = itemName.substring(0, maxNameLength - 3) + '...';
      }
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(itemName, margin, yPos);
      
      // Add adjustment reason below item name if available
      if (isPriceAdjusted && adjustmentReason) {
        doc.setFontSize(7);
        doc.text(`(${adjustmentReason})`, margin, yPos + 3);
        doc.setFontSize(9);
      }
      
      // Create price details - just show the sale price (adjusted price) without currency prefix for unit price
      const displayCurrency = CurrencyService.getDisplayCurrency(business.currency);
      const priceDetails = `${item.quantity} ${item.unit} x ${salePrice.toFixed(2)} = ${displayCurrency} ${(salePrice * item.quantity).toFixed(2)}`;
      
      doc.text(priceDetails, pageWidth - margin, yPos + 4, { align: 'right' });
      
      yPos += (item.adjustmentReason ? 10 : 8);
      
      if (index < invoice.items.length - 1) {
        doc.setLineWidth(0.1);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        doc.setDrawColor(0, 0, 0);
        yPos += 2;
      }
    });
    
    yPos += 5;
    
    // Check if we need a new page for summary section
    // Summary section takes about 50mm (5 lines × 5mm each + spacing)
    if (yPos + 50 > maxY) {
      addNewPage();
    }
    
    // Summary section
    const summaryItems = [
      { label: 'Subtotal:', value: invoice.subtotal },
      { label: 'VAT:', value: invoice.totalVat },
    ];
    
    if (invoice.discount > 0) {
      summaryItems.push({ label: 'Discount:', value: -invoice.discount });
    }
    
    summaryItems.push({ label: 'Total:', value: invoice.grandTotal });
    summaryItems.push({ label: 'Paid:', value: invoice.paidAmount });
    
    const dueOrChangeLabel = invoice.dueAmount > 0 ? 'Due:' : 'Change:';
    const dueOrChangeValue = Math.abs(invoice.dueAmount);
    summaryItems.push({ label: dueOrChangeLabel, value: dueOrChangeValue });
    
    summaryItems.forEach((item, index) => {
      const isTotal = item.label === 'Total:';
      doc.setFontSize(10);
      doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
      
      doc.text(item.label, margin, yPos);
      const displayCurrency = CurrencyService.getDisplayCurrency(business.currency);
      const valueText = `${item.value >= 0 ? '' : '-'}${displayCurrency} ${Math.abs(item.value).toFixed(2)}`;
      doc.text(valueText, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 5;
      
      if (isTotal) {
        doc.setLineWidth(0.3);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        yPos += 2;
      }
    });
    
    yPos += 3;
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan QR for details', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank You!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Software by Labinitial', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    if (business.cheerfulNotice) {
      doc.setFontSize(8);
      doc.text(business.cheerfulNotice, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Add QR code if storeId is provided
    if (storeId) {
      try {
        yPos += 4;
        
        // Check if we need a new page for QR code
        // QR code takes about 30mm (20mm size + spacing + text)
        if (yPos + 30 > maxY) {
          addNewPage();
        }
        
        const qrCodeDataUrl = await this.generateQRCodeDataUrl(
          storeId, 
          invoice.id, 
          business,
          invoice.grandTotal,
          invoice.totalVat
        );
        
        if (qrCodeDataUrl) {
          const qrSize = 20;
          const qrX = (pageWidth - qrSize) / 2;
          doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
          yPos += qrSize + 2;
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text('Scan to verify', pageWidth / 2, yPos, { align: 'center' });
        }
      } catch (error) {
        console.error('Error adding QR code to PDF:', error);
      }
    }
    
    return doc;
  }

  /**
   * Original wrapper method for backward compatibility
   * Generates invoice PDF based on business.printFormat setting
   */
  static async generateInvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<jsPDF> {
    if (business.printFormat === 'thermal') {
      return await this.generateThermalInvoicePDF(invoice, business, isReprint, storeId);
    } else {
      return await this.generateA4InvoicePDF(invoice, business, isReprint, storeId);
    }
  }

  /**
   * Generate invoice PDF for preview (returns PDF document without saving)
   */
  static async generateInvoicePDFForPreview(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<jsPDF> {
    return await this.generateInvoicePDF(invoice, business, isReprint, storeId);
  }

  /**
   * Generate A4 invoice PDF for preview (returns PDF document without saving)
   */
  static async generateA4InvoicePDFForPreview(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<jsPDF> {
    return await this.generateA4InvoicePDF(invoice, business, isReprint, storeId);
  }

  /**
   * Generate thermal invoice PDF for preview (returns PDF document without saving)
   */
  static async generateThermalInvoicePDFForPreview(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<jsPDF> {
    return await this.generateThermalInvoicePDF(invoice, business, isReprint, storeId);
  }

  /**
   * Generate and save invoice PDF (original method for backward compatibility)
   */
  static async generateAndSaveInvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<void> {
    const doc = await this.generateInvoicePDF(invoice, business, isReprint, storeId);
    const fileName = `${invoice.id}_${isReprint ? 'reprint' : 'invoice'}.pdf`;
    doc.save(fileName);
  }

  /**
   * Generate and save A4 invoice PDF
   */
  static async generateAndSaveA4InvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<void> {
    const doc = await this.generateA4InvoicePDF(invoice, business, isReprint, storeId);
    const fileName = `${invoice.id}_a4_${isReprint ? 'reprint' : 'invoice'}.pdf`;
    doc.save(fileName);
  }

  /**
   * Generate and save thermal invoice PDF
   */
  static async generateAndSaveThermalInvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    isReprint: boolean = false,
    storeId?: string
  ): Promise<void> {
    const doc = await this.generateThermalInvoicePDF(invoice, business, isReprint, storeId);
    const fileName = `${invoice.id}_thermal_${isReprint ? 'reprint' : 'invoice'}.pdf`;
    doc.save(fileName);
  }

  /**
   * Save PDF document with given filename
   */
  static savePDFDocument(doc: jsPDF, fileName: string): void {
    doc.save(fileName);
  }

  /**
   * Open PDF in new window for printing
   */
  static printPDFDocument(doc: jsPDF): void {
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  /**
   * Get PDF as Blob for preview
   */
  static getPDFAsBlob(doc: jsPDF): Blob {
    return doc.output('blob');
  }

  /**
   * Get PDF as Data URL for preview
   */
  static getPDFAsDataURL(doc: jsPDF): string {
    return doc.output('dataurlstring');
  }

  /**
   * Export invoice to Excel
   */
  static async exportInvoiceToExcel(invoice: Invoice, business: BusinessSettings): Promise<void> {
    ExcelService.downloadInvoiceExcel(invoice, business);
  }

  /**
   * Generate table PDF report
   */
  static generateTablePDF(business: BusinessSettings, productPerformance: any[], reportRange: string): void {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const margin = 10;
      const pageWidth = 297; // A4 landscape width
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${business.name} - Product Performance Report`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const rangeText = reportRange === 'all' ? 'All Time' : 
                       reportRange === 'today' ? 'Today' :
                       reportRange === 'week' ? 'Last 7 Days' :
                       reportRange === 'month' ? 'Last 30 Days' : 'Custom Range';
      doc.text(`Report Period: ${rangeText}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      const dateStr = new Date().toLocaleDateString();
      doc.text(`Generated: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Table headers
      const headers = [
        ['SL', 'Product Name', 'Purchase Price', 'Selling Price', 'Profit/Unit', 'Profit %', 'Quantity Sold', 'Total Profit']
      ];

      // Table data
      const tableData = productPerformance.map((product, index) => [
        (index + 1).toString(),
        product.name,
        CurrencyService.formatAmountWithSpace(product.cost, business.currency),
        CurrencyService.formatAmountWithSpace(product.price, business.currency),
        CurrencyService.formatAmountWithSpace(product.price - product.cost, business.currency),
        `${((product.price - product.cost) / product.price * 100).toFixed(1)}%`,
        product.qty.toString(),
        CurrencyService.formatAmountWithSpace(product.totalProfit, business.currency)
      ]);

      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        bodyStyles: { 
          fontSize: 9,
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin },
        styles: { 
          overflow: 'linebreak',
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 12 }, // SL
          1: { cellWidth: 45 }, // Product Name
          2: { cellWidth: 25 }, // Purchase Price
          3: { cellWidth: 25 }, // Selling Price
          4: { cellWidth: 22 }, // Profit/Unit
          5: { cellWidth: 22 }, // Profit %
          6: { cellWidth: 22 }, // Quantity Sold
          7: { cellWidth: 25 }, // Total Profit
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Summary
      const totalProfit = productPerformance.reduce((sum, p) => sum + p.totalProfit, 0);
      const totalQuantity = productPerformance.reduce((sum, p) => sum + p.qty, 0);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Products: ${productPerformance.length}`, margin, yPos);
      doc.text(`Total Quantity Sold: ${totalQuantity}`, margin + 70, yPos);
      doc.text(`Total Profit: ${CurrencyService.formatAmountWithSpace(totalProfit, business.currency)}`, margin + 140, yPos);
      yPos += 15;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Generated by Business Management System', pageWidth / 2, 200, { align: 'center' });

      // Save PDF
      const fileName = `Product_Performance_Report_${reportRange}_${dateStr.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating table PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  }

  /**
   * Generate ledger PDF report
   */
  static generateLedgerPDF(business: BusinessSettings, ledgerData: any[], reportRange: string): void {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const margin = 10;
      const pageWidth = 297;
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${business.name} - Sales Ledger Report`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const rangeText = reportRange === 'all' ? 'All Time' : 
                       reportRange === 'today' ? 'Today' :
                       reportRange === 'week' ? 'Last 7 Days' :
                       reportRange === 'month' ? 'Last 30 Days' : 'Custom Range';
      doc.text(`Report Period: ${rangeText}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      const dateStr = new Date().toLocaleDateString();
      doc.text(`Generated: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Table headers
      const headers = [
        ['SL', 'Date', 'Net Sales', 'Cash', 'Card', 'Pay Later', 'Due Amount']
      ];

      // Table data
      const tableData = ledgerData.map((day, index) => [
        (index + 1).toString(),
        new Date(day.date).toLocaleDateString(),
        CurrencyService.formatAmountWithSpace(day.net, business.currency),
        CurrencyService.formatAmountWithSpace(day.cash, business.currency),
        CurrencyService.formatAmountWithSpace(day.card, business.currency),
        CurrencyService.formatAmountWithSpace(day.due, business.currency),
        CurrencyService.formatAmountWithSpace(day.due, business.currency)
      ]);

      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        bodyStyles: { 
          fontSize: 9,
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin },
        styles: { 
          overflow: 'linebreak',
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 12 }, // SL
          1: { cellWidth: 35 }, // Date
          2: { cellWidth: 35 }, // Net Sales
          3: { cellWidth: 35 }, // Cash
          4: { cellWidth: 35 }, // Card
          5: { cellWidth: 35 }, // Pay Later
          6: { cellWidth: 35 }, // Due Amount
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Summary
      const totalNet = ledgerData.reduce((sum, d) => sum + d.net, 0);
      const totalCash = ledgerData.reduce((sum, d) => sum + d.cash, 0);
      const totalCard = ledgerData.reduce((sum, d) => sum + d.card, 0);
      const totalDue = ledgerData.reduce((sum, d) => sum + d.due, 0);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Days: ${ledgerData.length}`, margin, yPos);
      doc.text(`Total Net Sales: ${CurrencyService.formatAmountWithSpace(totalNet, business.currency)}`, margin + 70, yPos);
      doc.text(`Total Cash: ${CurrencyService.formatAmountWithSpace(totalCash, business.currency)}`, margin + 140, yPos);
      yPos += 7;
      doc.text(`Total Card: ${CurrencyService.formatAmountWithSpace(totalCard, business.currency)}`, margin, yPos);
      doc.text(`Total Due: ${CurrencyService.formatAmountWithSpace(totalDue, business.currency)}`, margin + 70, yPos);
      yPos += 15;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Generated by Business Management System', pageWidth / 2, 200, { align: 'center' });

      // Save PDF
      const fileName = `Sales_Ledger_Report_${reportRange}_${dateStr.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating ledger PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  }

  /**
   * Generate customer report PDF
   */
  static generateCustomerReportPDF(business: BusinessSettings, customerReportData: any[], reportRange: string): void {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const margin = 10;
      const pageWidth = 297;
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${business.name} - Customer Purchase Report`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const rangeText = reportRange === 'all' ? 'All Time' : 
                       reportRange === 'today' ? 'Today' :
                       reportRange === 'week' ? 'Last 7 Days' :
                       reportRange === 'month' ? 'Last 30 Days' : 'Custom Range';
      doc.text(`Report Period: ${rangeText}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      const dateStr = new Date().toLocaleDateString();
      doc.text(`Generated: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Table headers
      const headers = [
        ['SL', 'Customer Name', 'Phone', 'Total Purchases', 'Items Purchased', 'Payment Methods', 'Total Spent', 'Paid', 'Due']
      ];

      // Table data
      const tableData = customerReportData.map((customer, index) => [
        (index + 1).toString(),
        customer.name,
        customer.phone || 'N/A',
        customer.purchaseCount.toString(),
        customer.items.slice(0, 3).join(', ') + (customer.items.length > 3 ? ` (+${customer.items.length - 3} more)` : ''),
        customer.paymentMethods.join(', '),
        CurrencyService.formatAmountWithSpace(customer.grandTotal, business.currency),
        CurrencyService.formatAmountWithSpace(customer.paidAmount, business.currency),
        CurrencyService.formatAmountWithSpace(customer.dueAmount, business.currency)
      ]);

      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        bodyStyles: { 
          fontSize: 9,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          cellPadding: 3
        },
        margin: { left: margin, right: margin },
        styles: { 
          overflow: 'linebreak',
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 12 }, // SL
          1: { cellWidth: 35 }, // Customer Name
          2: { cellWidth: 30 }, // Phone
          3: { cellWidth: 20 }, // Total Purchases
          4: { cellWidth: 45 }, // Items Purchased
          5: { cellWidth: 30 }, // Payment Methods
          6: { cellWidth: 30 }, // Total Spent
          7: { cellWidth: 25 }, // Paid
          8: { cellWidth: 25 }, // Due
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Summary
      const totalCustomers = customerReportData.length;
      const totalPurchases = customerReportData.reduce((sum, c) => sum + c.purchaseCount, 0);
      const totalSpent = customerReportData.reduce((sum, c) => sum + c.grandTotal, 0);
      const totalPaid = customerReportData.reduce((sum, c) => sum + c.paidAmount, 0);
      const totalDue = customerReportData.reduce((sum, c) => sum + c.dueAmount, 0);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Customers: ${totalCustomers}`, margin, yPos);
      doc.text(`Total Purchases: ${totalPurchases}`, margin + 70, yPos);
      doc.text(`Total Spent: ${CurrencyService.formatAmountWithSpace(totalSpent, business.currency)}`, margin + 140, yPos);
      yPos += 7;
      doc.text(`Total Paid: ${CurrencyService.formatAmountWithSpace(totalPaid, business.currency)}`, margin, yPos);
      doc.text(`Total Due: ${CurrencyService.formatAmountWithSpace(totalDue, business.currency)}`, margin + 70, yPos);
      yPos += 15;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Generated by Business Management System', pageWidth / 2, 200, { align: 'center' });

      // Save PDF
      const fileName = `Customer_Report_${reportRange}_${dateStr.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating customer report PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  }

  /**
   * Generate and upload invoice PDF to Firebase Storage
   * This creates a shareable link for the invoice
   */
  static async generateAndUploadInvoicePDF(
    invoice: Invoice,
    business: BusinessSettings,
    storeId: string,
    isReprint: boolean = false
  ): Promise<string> {
    try {
      console.log(`[PDFService] Generating and uploading PDF for invoice ${invoice.id}`);
      
      // Generate PDF document
      const doc = await this.generateInvoicePDF(invoice, business, isReprint, storeId);
      
      // Convert PDF to blob
      const pdfBlob = this.getPDFAsBlob(doc);
      
      // Import dataService dynamically to avoid circular dependencies
      const { dataService } = await import('./firebaseService');
      
      // Upload PDF to Firebase Storage and get URL
      const pdfUrl = await dataService.uploadInvoicePDF(storeId, invoice.id, pdfBlob);
      
      console.log(`[PDFService] PDF uploaded successfully for invoice ${invoice.id}, URL: ${pdfUrl}`);
      return pdfUrl;
    } catch (error) {
      console.error(`[PDFService] Error generating and uploading PDF for invoice ${invoice.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate, upload PDF and save invoice with PDF URL
   * This is a complete solution that handles both PDF generation and invoice saving
   */
  static async generateUploadAndSaveInvoice(
    invoice: Invoice,
    business: BusinessSettings,
    storeId: string,
    isReprint: boolean = false
  ): Promise<Invoice> {
    try {
      console.log(`[PDFService] Generating, uploading and saving invoice ${invoice.id}`);
      
      // Generate PDF document
      const doc = await this.generateInvoicePDF(invoice, business, isReprint, storeId);
      
      // Convert PDF to blob
      const pdfBlob = this.getPDFAsBlob(doc);
      
      // Import dataService dynamically to avoid circular dependencies
      const { dataService } = await import('./firebaseService');
      
      // Save invoice with PDF upload and stock update
      const savedInvoice = await dataService.saveInvoiceWithPDFAndStockUpdate(storeId, invoice, pdfBlob);
      
      console.log(`[PDFService] Invoice ${invoice.id} saved with PDF URL: ${savedInvoice.pdfUrl}`);
      return savedInvoice;
    } catch (error) {
      console.error(`[PDFService] Error generating, uploading and saving invoice ${invoice.id}:`, error);
      throw error;
    }
  }
}
