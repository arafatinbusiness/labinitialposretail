// Test script for Puppeteer PDF generation in production
// Run with: node test-puppeteer-production.js

const testData = {
  invoice: {
    id: "TEST-PUPPETEER-001",
    date: "2026-01-11",
    customerName: "আরাফাত ইসলাম", // Bengali text
    items: [
      { 
        name: "বাংলা বই", 
        quantity: 2, 
        price: 150, 
        unit: "pcs",
        salePrice: 150
      },
      { 
        name: "English Book", 
        quantity: 1, 
        price: 200, 
        unit: "pcs",
        salePrice: 200
      }
    ],
    subtotal: 500,
    totalVat: 75,
    discount: 0,
    grandTotal: 575,
    paidAmount: 600,
    dueAmount: -25,
    createdBy: {
      name: "Admin User",
      role: "admin"
    }
  },
  business: {
    name: "Test Business",
    nameArabic: "اختبار",
    address: "123 Test Street, Dhaka",
    phone: "+880123456789",
    printFormat: "a4",
    currency: "BDT",
    cheerfulNotice: "Thank you for your business!"
  },
  format: "a4",
  isReprint: false
};

async function testPuppeteerAPI() {
  console.log('🧪 Testing Puppeteer PDF API...');
  
  // Test local API (if running locally with vercel dev)
  const apiUrl = 'http://localhost:3000/api/generate-pdf';
  
  try {
    console.log(`📤 Sending request to: ${apiUrl}`);
    console.log(`📄 Invoice ID: ${testData.invoice.id}`);
    console.log(`👤 Customer: ${testData.invoice.customerName}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const pdfBlob = await response.blob();
      console.log(`✅ PDF generated successfully!`);
      console.log(`📊 PDF size: ${pdfBlob.size} bytes`);
      console.log(`📄 PDF type: ${pdfBlob.type}`);
      
      // Save PDF to file
      const fs = await import('fs');
      const buffer = Buffer.from(await pdfBlob.arrayBuffer());
      fs.writeFileSync('test-puppeteer-output.pdf', buffer);
      console.log(`💾 PDF saved to: test-puppeteer-output.pdf`);
      
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status}`);
      console.error(`📝 Error details: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Make sure:');
      console.error('   1. Server is running: `vercel dev` or `npm run dev`');
      console.error('   2. API route is accessible at /api/generate-pdf');
    }
    
    return false;
  }
}

// Also test production API
async function testProductionAPI() {
  console.log('\n🌐 Testing Production API (if deployed)...');
  
  // Replace with your actual Vercel app URL
  const productionUrl = 'https://your-app.vercel.app/api/generate-pdf';
  
  try {
    console.log(`📤 Testing: ${productionUrl}`);
    const response = await fetch(productionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'connection' }),
    });
    
    console.log(`📥 Production Status: ${response.status}`);
    
    if (response.status === 405) {
      console.log('✅ Production API is accessible (405 is expected for GET/POST mismatch)');
      return true;
    } else if (response.status === 400) {
      console.log('✅ Production API is accessible (400 is expected for missing data)');
      return true;
    } else {
      console.log(`ℹ️  Production response: ${response.status}`);
      return response.status < 500; // Not a server error
    }
  } catch (error) {
    console.error('❌ Production test failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Puppeteer PDF Generation Tests\n');
  
  // Test 1: Local API
  console.log('1️⃣ Testing Local API...');
  const localTest = await testPuppeteerAPI();
  
  if (!localTest) {
    console.log('\n⚠️  Local test failed. Trying alternative approaches...');
    
    // Check if dependencies are installed
    console.log('\n🔍 Checking dependencies...');
    try {
      const { execSync } = await import('child_process');
      const result = execSync('npm list chrome-aws-lambda puppeteer-core 2>/dev/null || echo "Not found"', { encoding: 'utf8' });
      console.log('📦 Dependencies:', result.trim());
    } catch (e) {
      console.log('📦 Cannot check dependencies');
    }
  }
  
  // Test 2: Production API (optional)
  console.log('\n2️⃣ Testing Production API (optional)...');
  await testProductionAPI();
  
  console.log('\n📋 Test Summary:');
  console.log(`   Local API: ${localTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\n🎯 Next Steps:');
  
  if (localTest) {
    console.log('   1. Open test-puppeteer-output.pdf to verify Bengali font rendering');
    console.log('   2. Deploy to Vercel: git push');
    console.log('   3. Test in production with Bengali text');
  } else {
    console.log('   1. Start local server: `vercel dev` or `npm run dev`');
    console.log('   2. Ensure API route is accessible at /api/generate-pdf');
    console.log('   3. Check Vercel function logs for errors');
    console.log('   4. Verify chrome-aws-lambda and puppeteer-core are installed');
  }
  
  console.log('\n🔧 Debugging Tips:');
  console.log('   - Check browser console for [PDFService] logs');
  console.log('   - Look for "Using Puppeteer API for invoice" message');
  console.log('   - Check network tab for API calls to /api/generate-pdf');
  console.log('   - Verify Bengali text appears correctly in generated PDF');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testPuppeteerAPI, testProductionAPI, runTests };