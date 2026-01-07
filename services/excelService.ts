import { Invoice, BusinessSettings, Product, Category, Customer } from '../types';
import { CurrencyService } from './currencyService';

export class ExcelService {
  /**
   * Generate Excel file from invoice data
   * @param invoice Invoice data
   * @param business Business settings
   * @returns Blob containing Excel file
   */
  static generateInvoiceExcel(
    invoice: Invoice,
    business: BusinessSettings
  ): Blob {
    // Create CSV content (simple Excel-compatible format)
    const rows = [];
    const displayCurrency = CurrencyService.getDisplayCurrency(business.currency);
    
    // Header
    rows.push(['INVOICE REPORT']);
    rows.push(['']);
    rows.push(['Business:', business.name]);
    rows.push(['Address:', business.address]);
    rows.push(['Phone:', business.phone]);
    rows.push(['Invoice #:', invoice.id]);
    rows.push(['Date:', invoice.date]);
    rows.push(['Customer:', invoice.customerName]);
    if (invoice.customerPhone) {
      rows.push(['Customer Phone:', invoice.customerPhone]);
    }
    if (invoice.customerAddress) {
      rows.push(['Customer Address:', invoice.customerAddress]);
    }
    rows.push(['Payment Mode:', invoice.paymentMode || 'Cash']);
    rows.push(['']);
    
    // Items header
    rows.push(['ITEM DETAILS']);
    rows.push(['No.', 'Item Name', 'Quantity', 'Unit', 'Unit Price', 'VAT %', 'Total']);
    
    // Items
    invoice.items.forEach((item, index) => {
      rows.push([
        index + 1,
        item.name,
        item.quantity,
        item.unit,
        item.price.toFixed(2),
        item.vat.toFixed(2),
        (item.price * item.quantity).toFixed(2)
      ]);
    });
    
    rows.push(['']);
    
    // Summary
    rows.push(['SUMMARY']);
    rows.push(['Subtotal:', '', '', '', '', '', displayCurrency + invoice.subtotal.toFixed(2)]);
    rows.push(['VAT:', '', '', '', '', '', displayCurrency + invoice.totalVat.toFixed(2)]);
    
    if (invoice.discount > 0) {
      rows.push(['Discount:', '', '', '', '', '', '-' + displayCurrency + invoice.discount.toFixed(2)]);
    }
    
    rows.push(['Grand Total:', '', '', '', '', '', displayCurrency + invoice.grandTotal.toFixed(2)]);
    rows.push(['Paid Amount:', '', '', '', '', '', displayCurrency + invoice.paidAmount.toFixed(2)]);
    
    const dueOrChangeLabel = invoice.dueAmount > 0 ? 'Due Amount:' : 'Change:';
    const dueOrChangeValue = Math.abs(invoice.dueAmount);
    rows.push([dueOrChangeLabel, '', '', '', '', '', displayCurrency + dueOrChangeValue.toFixed(2)]);
    
    rows.push(['']);
    rows.push(['Generated on:', new Date().toLocaleString()]);
    rows.push(['Software:', 'Labinitial Business Management']);
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
    
    // Create blob with UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    return blob;
  }

  /**
   * Download Excel file
   * @param invoice Invoice data
   * @param business Business settings
   * @param fileName Optional custom file name
   */
  static downloadInvoiceExcel(
    invoice: Invoice,
    business: BusinessSettings,
    fileName?: string
  ): void {
    const blob = this.generateInvoiceExcel(invoice, business);
    const defaultName = `Invoice_${invoice.id}_Report`;
    const finalFileName = fileName || defaultName;
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${finalFileName}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /**
   * Export products to CSV file
   * @param products Array of products
   * @param categories Array of categories (for mapping category IDs to names)
   * @param business Business settings
   * @returns Blob containing CSV file
   */
  static exportProductsToCSV(
    products: Product[],
    categories: Category[],
    business: BusinessSettings
  ): Blob {
    // Create category map for ID to name lookup
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });

    // Create CSV content
    const rows = [];
    
    // Header row
    rows.push(['ID', 'Name', 'Barcode', 'Category', 'Price', 'Purchase Price', 'VAT %', 'Stock', 'Unit', 'Type', 'Image URL']);
    
    // Data rows
    products.forEach(product => {
      const categoryName = categoryMap.get(product.category) || product.category;
      
      rows.push([
        product.id,
        product.name,
        product.barcode || '',
        categoryName,
        product.price.toString(),
        product.purchasePrice?.toString() || '',
        product.vat.toString(),
        product.stock.toString(),
        product.unit,
        product.type || 'product',
        product.image || ''
      ]);
    });
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = cell !== null && cell !== undefined ? cell.toString() : '';
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Create blob with UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    return blob;
  }

  /**
   * Download products CSV file
   * @param products Array of products
   * @param categories Array of categories
   * @param business Business settings
   * @param fileName Optional custom file name
   */
  static downloadProductsCSV(
    products: Product[],
    categories: Category[],
    business: BusinessSettings,
    fileName?: string
  ): void {
    const blob = this.exportProductsToCSV(products, categories, business);
    const defaultName = `Products_Backup_${new Date().toISOString().split('T')[0]}`;
    const finalFileName = fileName || defaultName;
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${finalFileName}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /**
   * Parse CSV file to extract products
   * @param file CSV file
   * @param categories Array of categories (for mapping category names to IDs)
   * @returns Promise with array of parsed products
   */
  static async parseProductsFromCSV(
    file: File,
    categories: Category[]
  ): Promise<Partial<Product>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const lines = content.split('\n');
          
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or has no data rows'));
            return;
          }
          
          // Parse header row
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Create category name to ID map (case-insensitive)
          const categoryNameToId = new Map<string, string>();
          const categoryIdToName = new Map<string, string>();
          categories.forEach(cat => {
            categoryNameToId.set(cat.name.toLowerCase(), cat.id);
            categoryIdToName.set(cat.id, cat.name);
          });
          
          const products: Partial<Product>[] = [];
          
          // Process data rows (skip header row)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            // Parse CSV row (handling quoted values)
            const values: string[] = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            
            // Map values to product properties
            const product: Partial<Product> = {};
            
            // Find column indices
            const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
            const barcodeIndex = headers.findIndex(h => h.toLowerCase() === 'barcode');
            const categoryIndex = headers.findIndex(h => h.toLowerCase() === 'category');
            const priceIndex = headers.findIndex(h => h.toLowerCase() === 'price');
            const purchasePriceIndex = headers.findIndex(h => h.toLowerCase().includes('purchase'));
            const vatIndex = headers.findIndex(h => h.toLowerCase().includes('vat'));
            const stockIndex = headers.findIndex(h => h.toLowerCase() === 'stock');
            const unitIndex = headers.findIndex(h => h.toLowerCase() === 'unit');
            const typeIndex = headers.findIndex(h => h.toLowerCase() === 'type');
            const imageIndex = headers.findIndex(h => h.toLowerCase().includes('image'));
            
            // Set product properties
            if (nameIndex !== -1 && values[nameIndex]) {
              product.name = values[nameIndex];
            }
            
            if (barcodeIndex !== -1) {
              product.barcode = values[barcodeIndex] || '';
            }
            
            if (categoryIndex !== -1 && values[categoryIndex]) {
              const categoryValue = values[categoryIndex];
              
              // Try multiple strategies to find the category
              let categoryId = '';
              
              // Strategy 1: Check if it's already a category ID
              if (categoryIdToName.has(categoryValue)) {
                categoryId = categoryValue;
              }
              // Strategy 2: Check case-insensitive category name match
              else if (categoryNameToId.has(categoryValue.toLowerCase())) {
                categoryId = categoryNameToId.get(categoryValue.toLowerCase())!;
              }
              // Strategy 3: Try to find by partial name match
              else {
                const foundCategory = categories.find(cat => 
                  cat.name.toLowerCase().includes(categoryValue.toLowerCase()) ||
                  categoryValue.toLowerCase().includes(cat.name.toLowerCase())
                );
                if (foundCategory) {
                  categoryId = foundCategory.id;
                }
              }
              
              // If still no match, use the first category or create a placeholder
              if (!categoryId && categories.length > 0) {
                categoryId = categories[0].id;
                console.warn(`Category "${categoryValue}" not found. Using "${categories[0].name}" as default.`);
              } else if (!categoryId) {
                categoryId = 'General';
                console.warn(`Category "${categoryValue}" not found and no categories exist. Using "General".`);
              }
              
              product.category = categoryId;
            } else if (categories.length > 0) {
              // Default to first category if no category specified
              product.category = categories[0].id;
            } else {
              product.category = 'General';
            }
            
            if (priceIndex !== -1 && values[priceIndex]) {
              product.price = parseFloat(values[priceIndex]) || 0;
            }
            
            if (purchasePriceIndex !== -1 && values[purchasePriceIndex]) {
              product.purchasePrice = parseFloat(values[purchasePriceIndex]) || undefined;
            }
            
            if (vatIndex !== -1 && values[vatIndex]) {
              product.vat = parseFloat(values[vatIndex]) || 0;
            }
            
            if (stockIndex !== -1 && values[stockIndex]) {
              product.stock = parseInt(values[stockIndex]) || 0;
            }
            
            if (unitIndex !== -1 && values[unitIndex]) {
              product.unit = values[unitIndex] || 'pc';
            }
            
            if (typeIndex !== -1 && values[typeIndex]) {
              const typeValue = values[typeIndex].toLowerCase();
              product.type = (typeValue === 'service' ? 'service' : 'product') as 'product' | 'service';
            } else {
              product.type = 'product';
            }
            
            if (imageIndex !== -1 && values[imageIndex]) {
              product.image = values[imageIndex] || null;
            }
            
            // Only add product if it has a name
            if (product.name) {
              products.push(product);
            }
          }
          
          resolve(products);
        } catch (error: any) {
          reject(new Error(`Error parsing CSV file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Export customers to CSV file
   * @param customers Array of customers
   * @param business Business settings
   * @returns Blob containing CSV file
   */
  static exportCustomersToCSV(
    customers: Customer[],
    business: BusinessSettings
  ): Blob {
    // Create CSV content
    const rows = [];
    
    // Header row
    rows.push(['ID', 'Name', 'Phone', 'Address', 'Email', 'NID Card', 'Social Security Number', 'Card Number', 'Total Due']);
    
    // Data rows
    customers.forEach(customer => {
      rows.push([
        customer.id,
        customer.name,
        customer.phone,
        customer.address,
        customer.email || '',
        customer.nidCard || '',
        customer.socialSecurityNumber || '',
        customer.cardNumber || '',
        customer.totalDue.toString()
      ]);
    });
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = cell !== null && cell !== undefined ? cell.toString() : '';
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Create blob with UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    return blob;
  }

  /**
   * Download customers CSV file
   * @param customers Array of customers
   * @param business Business settings
   * @param fileName Optional custom file name
   */
  static downloadCustomersCSV(
    customers: Customer[],
    business: BusinessSettings,
    fileName?: string
  ): void {
    const blob = this.exportCustomersToCSV(customers, business);
    const defaultName = `Customers_Backup_${new Date().toISOString().split('T')[0]}`;
    const finalFileName = fileName || defaultName;
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${finalFileName}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /**
   * Parse CSV file to extract customers
   * @param file CSV file
   * @returns Promise with array of parsed customers
   */
  static async parseCustomersFromCSV(
    file: File
  ): Promise<Partial<Customer>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const lines = content.split('\n');
          
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or has no data rows'));
            return;
          }
          
          // Parse header row
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          const customers: Partial<Customer>[] = [];
          
          // Process data rows (skip header row)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            // Parse CSV row (handling quoted values)
            const values: string[] = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            
            // Map values to customer properties
            const customer: Partial<Customer> = {};
            
            // Find column indices
            const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
            const phoneIndex = headers.findIndex(h => h.toLowerCase() === 'phone');
            const addressIndex = headers.findIndex(h => h.toLowerCase() === 'address');
            const emailIndex = headers.findIndex(h => h.toLowerCase() === 'email');
            const nidIndex = headers.findIndex(h => h.toLowerCase().includes('nid'));
            const ssnIndex = headers.findIndex(h => h.toLowerCase().includes('social') || h.toLowerCase().includes('ssn'));
            const cardIndex = headers.findIndex(h => h.toLowerCase().includes('card'));
            const dueIndex = headers.findIndex(h => h.toLowerCase().includes('due'));
            
            // Set customer properties
            if (nameIndex !== -1 && values[nameIndex]) {
              customer.name = values[nameIndex];
            }
            
            if (phoneIndex !== -1 && values[phoneIndex]) {
              customer.phone = values[phoneIndex];
            }
            
            if (addressIndex !== -1) {
              customer.address = values[addressIndex] || '';
            }
            
            if (emailIndex !== -1) {
              customer.email = values[emailIndex] || undefined;
            }
            
            if (nidIndex !== -1) {
              customer.nidCard = values[nidIndex] || undefined;
            }
            
            if (ssnIndex !== -1) {
              customer.socialSecurityNumber = values[ssnIndex] || undefined;
            }
            
            if (cardIndex !== -1) {
              customer.cardNumber = values[cardIndex] || undefined;
            }
            
            if (dueIndex !== -1 && values[dueIndex]) {
              customer.totalDue = parseFloat(values[dueIndex]) || 0;
            } else {
              customer.totalDue = 0;
            }
            
            // Only add customer if it has a name and phone
            if (customer.name && customer.phone) {
              customers.push(customer);
            }
          }
          
          resolve(customers);
        } catch (error) {
          reject(new Error(`Error parsing CSV file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }
}
