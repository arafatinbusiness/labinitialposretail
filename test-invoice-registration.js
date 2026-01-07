// Test to verify registration number appears on invoice
console.log('🔍 Testing Registration Number on Invoice');
console.log('==========================================\n');

// Mock invoice data
const invoice = {
  id: "INV-020",
  customerName: "Walk-in Customer",
  items: [
    { name: "Product 1", price: 10, quantity: 2, unit: "pc", vat: 10 },
    { name: "Product 2", price: 15, quantity: 1, unit: "pc", vat: 10 }
  ],
  subtotal: 35,
  totalVat: 4.95,
  discount: 2,
  grandTotal: 37.95,
  paidAmount: 40,
  dueAmount: -2.05,
  date: "2025-12-14T07:14:40.305Z",
  status: "delivered",
  paymentMode: "Cash"
};

// Mock business settings WITH registration number
const businessWithRegistration = {
  name: "Arafat Hossain",
  address: "Dhaka, Bangladesh",
  phone: "+880 1711 000000",
  taxId: "310122393500003", // Registration number
  taxLabelEnglish: "VAT",
  taxLabelArabic: "ضريبة القيمة المضافة",
  printFormat: "a4",
  productViewMode: "grid",
  currency: "SR",
  qrCodeType: "zatca",
  zatcaSettings: {
    sellerName: "Arafat Hossain",
    vatRegistrationNumber: "310122393500003",
    invoiceSerialNumber: "INV-001",
    timestamp: "2025-12-14T06:58:40Z",
    invoiceTotal: 58.50,
    vatTotal: 6.75
  }
};

// Mock business settings WITHOUT registration number
const businessWithoutRegistration = {
  ...businessWithRegistration,
  taxId: undefined, // No registration number
  taxLabelEnglish: undefined,
  taxLabelArabic: undefined
};

console.log('🧪 Test 1: Invoice with Registration Number');
console.log('📋 Invoice Details:');
console.log('  Invoice ID:', invoice.id);
console.log('  Customer:', invoice.customerName);
console.log('  Total:', invoice.grandTotal);
console.log('  VAT:', invoice.totalVat);
console.log('');
console.log('📋 Business Settings:');
console.log('  Business Name:', businessWithRegistration.name);
console.log('  Registration Number (taxId):', businessWithRegistration.taxId);
console.log('  Tax Label (English):', businessWithRegistration.taxLabelEnglish);
console.log('  Tax Label (Arabic):', businessWithRegistration.taxLabelArabic);
console.log('');
console.log('📄 Expected on Invoice PDF:');
console.log('  Header should show:');
console.log(`    "${businessWithRegistration.taxLabelEnglish || 'VAT'}: ${businessWithRegistration.taxId}"`);
console.log('');

console.log('🧪 Test 2: Invoice without Registration Number');
console.log('📋 Business Settings:');
console.log('  Business Name:', businessWithoutRegistration.name);
console.log('  Registration Number (taxId):', businessWithoutRegistration.taxId);
console.log('  Tax Label (English):', businessWithoutRegistration.taxLabelEnglish);
console.log('  Tax Label (Arabic):', businessWithoutRegistration.taxLabelArabic);
console.log('');
console.log('📄 Expected on Invoice PDF:');
console.log('  Header should NOT show registration number');
console.log('');

// Test ZATCA QR code generation
console.log('🧪 Test 3: ZATCA QR Code Generation');
console.log('📊 With Registration Number:');
const registrationNumber1 = businessWithRegistration.taxId || businessWithRegistration.zatcaSettings.vatRegistrationNumber;
console.log('  Using Registration Number:', registrationNumber1);
console.log('  Source:', businessWithRegistration.taxId ? 'business.taxId' : 'zatcaSettings.vatRegistrationNumber');
console.log('');

console.log('📊 Without Registration Number:');
const registrationNumber2 = businessWithoutRegistration.taxId || businessWithoutRegistration.zatcaSettings.vatRegistrationNumber;
console.log('  Using Registration Number:', registrationNumber2);
console.log('  Source:', businessWithoutRegistration.taxId ? 'business.taxId' : 'zatcaSettings.vatRegistrationNumber');
console.log('');

// Test PDF header generation logic
console.log('🧪 Test 4: PDF Header Generation Logic');
function generatePDFHeader(business) {
  const headerLines = [];
  
  if (business.taxId) {
    const taxLabel = business.taxLabelArabic || business.taxLabelEnglish || 'VAT';
    headerLines.push(`${taxLabel}: ${business.taxId}`);
  }
  
  return headerLines;
}

console.log('📄 With Registration Number:');
const header1 = generatePDFHeader(businessWithRegistration);
console.log('  Header lines:', header1);
console.log('');

console.log('📄 Without Registration Number:');
const header2 = generatePDFHeader(businessWithoutRegistration);
console.log('  Header lines:', header2);
console.log('');

console.log('🚀 Steps for User:');
console.log('1. Go to Settings → Business Settings');
console.log('2. Scroll down to "Registration/Tax ID" field');
console.log('3. Enter your registration number (e.g., "310122393500003")');
console.log('4. (Optional) Enter Tax Label in English/Arabic');
console.log('5. Click "Save" button');
console.log('6. Create a new invoice');
console.log('7. Generate PDF and check the header');
console.log('8. The registration number should appear on the invoice');
console.log('');
console.log('🔧 Technical Notes:');
console.log('• The registration number is stored in business.taxId');
console.log('• ZATCA QR code uses business.taxId first, falls back to zatcaSettings.vatRegistrationNumber');
console.log('• Invoice PDF shows registration number in header if taxId is set');
console.log('• Settings are saved to Firebase automatically');
console.log('');
console.log('✅ Verification:');
console.log('• Check browser console for "Registration Number (from business.taxId):"');
console.log('• It should show your registration number, not "undefined"');
console.log('• New invoices will use the updated settings');
