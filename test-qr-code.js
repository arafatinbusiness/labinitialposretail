// Test script to verify QR code generation
const QRCode = require('qrcode');

async function testQRCodeGeneration() {
  console.log('Testing QR code generation...\n');
  
  // Test 1: Universal QR code
  const universalUrl = 'https://inventoryinvoice.labinitial.com/invoice/store123/inv456';
  console.log('Test 1: Universal QR Code');
  console.log('URL:', universalUrl);
  
  try {
    const dataUrl = await QRCode.toDataURL(universalUrl, {
      width: 128,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('✓ QR code generated successfully');
    console.log('Data URL length:', dataUrl.length, 'characters');
    console.log('Data URL starts with:', dataUrl.substring(0, 50) + '...');
  } catch (error) {
    console.error('✗ Error generating QR code:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: ZATCA QR code (simplified)
  const zatcaData = {
    seller_name: 'Test Business',
    vat_registration_number: '123456789',
    invoice_serial_number: 'INV-2024-001',
    invoice_id: 'inv456',
    timestamp: '2024-01-15T10:30:00Z',
    invoice_total: '150.00',
    vat_total: '22.50',
    total_with_vat: '172.50'
  };
  
  const zatcaContent = JSON.stringify(zatcaData);
  console.log('Test 2: ZATCA QR Code');
  console.log('ZATCA Data:', zatcaData);
  console.log('JSON Content:', zatcaContent);
  
  try {
    const zatcaDataUrl = await QRCode.toDataURL(zatcaContent, {
      width: 128,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('✓ ZATCA QR code generated successfully');
    console.log('Data URL length:', zatcaDataUrl.length, 'characters');
  } catch (error) {
    console.error('✗ Error generating ZATCA QR code:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 3: QR code size comparison
  console.log('Test 3: QR Code Size Comparison');
  const testUrls = [
    'https://inventoryinvoice.labinitial.com/invoice/store123/inv456',
    'https://inventoryinvoice.labinitial.com/invoice/store789/inv999',
    JSON.stringify({invoice_id: 'inv456', store_id: 'store123', timestamp: '2024-01-15'})
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    const dataUrl = await QRCode.toDataURL(url, { width: 128, margin: 1 });
    console.log(`URL ${i + 1}: ${url.substring(0, 50)}${url.length > 50 ? '...' : ''}`);
    console.log(`  Size: ${dataUrl.length} characters`);
  }
  
  console.log('\n✓ All tests completed!');
}

// Run the test
testQRCodeGeneration().catch(console.error);
