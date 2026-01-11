// Test script to verify Puppeteer Bengali PDF generation
import { PDFService } from './services/pdfService.js';

// Mock invoice with Bengali text
const testInvoice = {
  id: 'TEST-BENGALI-001',
  date: new Date().toISOString(),
  customerName: 'আরাফাত ইসলাম', // Bengali name
  customerPhone: '+8801842701601',
  subtotal: 100,
  totalVat: 15,
  discount: 0,
  grandTotal: 115,
  paidAmount: 115,
  dueAmount: 0,
  items: [
    {
      name: 'বাংলা বই', // Bengali item name
      quantity: 2,
      unit: 'pcs',
      price: 50,
      salePrice: 50
    }
  ],
  createdBy: {
    name: 'আরাফাত', // Bengali name
    role: 'admin'
  }
};

const testBusiness = {
  name: 'আমার দোকান', // Bengali business name
  nameArabic: 'متجري',
  address: 'ঢাকা, বাংলাদেশ',
  phone: '+8801842701601',
  currency: 'BDT',
  printFormat: 'a4',
  cheerfulNotice: 'ধন্যবাদ! আবার আসবেন।' // Bengali notice
};

async function testPuppeteerPDF() {
  console.log('🧪 Testing Puppeteer PDF generation with Bengali text...');
  
  try {
    // Test 1: Check if invoice contains Bengali
    console.log('1. Checking Bengali detection...');
    console.log('   Customer name:', testInvoice.customerName);
    console.log('   Business name:', testBusiness.name);
    console.log('   Item name:', testInvoice.items[0].name);
    
    // Test 2: Try to generate PDF with Puppeteer
    console.log('\n2. Attempting to generate PDF with Puppeteer...');
    
    // Note: This will only work if the API route is accessible
    // In local development, you need to run `vercel dev` or deploy to Vercel
    
    const pdfBlob = await PDFService.generateInvoicePDFWithPuppeteer(
      testInvoice,
      testBusiness,
      false // isReprint
    );
    
    console.log('✅ Puppeteer PDF generated successfully!');
    console.log('   Size:', pdfBlob.size, 'bytes');
    console.log('   Type:', pdfBlob.type);
    
    // Test 3: Test smart detection
    console.log('\n3. Testing smart detection...');
    
    const smartResult = await PDFService.generateInvoicePDFSmart(
      testInvoice,
      testBusiness,
      false // isReprint
    );
    
    if (smartResult instanceof Blob) {
      console.log('✅ Smart detection correctly used Puppeteer (Blob returned)');
    } else {
      console.log('❌ Smart detection used jsPDF instead of Puppeteer');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      console.log('\n💡 API route may not be accessible.');
      console.log('   For local development:');
      console.log('   1. Run: npx vercel dev');
      console.log('   2. Or deploy to Vercel and test in production');
      console.log('   3. Or check if development server is running on correct port');
    }
    
    return false;
  }
}

// Also test non-Bengali invoice
async function testNonBengaliPDF() {
  console.log('\n🧪 Testing non-Bengali invoice (should use jsPDF)...');
  
  const nonBengaliInvoice = {
    ...testInvoice,
    customerName: 'John Smith',
    items: [{ ...testInvoice.items[0], name: 'English Book' }]
  };
  
  const nonBengaliBusiness = {
    ...testBusiness,
    name: 'My Shop'
  };
  
  try {
    const result = await PDFService.generateInvoicePDFSmart(
      nonBengaliInvoice,
      nonBengaliBusiness,
      false
    );
    
    if (result && typeof result.save === 'function') {
      console.log('✅ Correctly used jsPDF for non-Bengali invoice');
    } else {
      console.log('⚠️  Unexpected result type for non-Bengali invoice');
    }
  } catch (error) {
    console.error('❌ Non-Bengali test failed:', error.message);
  }
}

// Run tests
(async () => {
  console.log('🚀 Starting Puppeteer PDF Generation Tests\n');
  
  const puppeteerTest = await testPuppeteerPDF();
  
  if (puppeteerTest) {
    await testNonBengaliPDF();
  }
  
  console.log('\n📋 Test Summary:');
  console.log('   - Puppeteer implementation:', puppeteerTest ? '✅ READY' : '❌ NEEDS SETUP');
  console.log('   - Next steps:');
  console.log('     1. Deploy to Vercel: git push');
  console.log('     2. Create invoice with Bengali text');
  console.log('     3. Check browser console for "[PDFService] Using Puppeteer API" message');
  console.log('     4. Verify PDF has perfect Bengali font rendering');
})();