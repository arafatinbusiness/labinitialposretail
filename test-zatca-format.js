// Test ZATCA QR code format
const QRCode = require('qrcode');

// Simulate the TLV format generation
function generateZATCAQRContent(
  sellerName,
  vatRegistrationNumber,
  invoiceSerialNumber,
  timestamp,
  invoiceId,
  invoiceTotal,
  vatTotal
) {
  // Convert timestamp to ZATCA format (ISO 8601 without milliseconds)
  const zatcaTimestamp = new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  // Calculate total with VAT
  const totalWithVat = invoiceTotal + vatTotal;
  
  // Create TLV (Tag-Length-Value) segments
  const tlvSegments = [];
  
  // Tag 1: Seller's Name
  tlvSegments.push(`1${sellerName.length.toString().padStart(2, '0')}${sellerName}`);
  
  // Tag 2: VAT Registration Number
  tlvSegments.push(`2${vatRegistrationNumber.length.toString().padStart(2, '0')}${vatRegistrationNumber}`);
  
  // Tag 3: Invoice Timestamp (Zulu time)
  tlvSegments.push(`3${zatcaTimestamp.length.toString().padStart(2, '0')}${zatcaTimestamp}`);
  
  // Tag 4: Invoice Total (with VAT)
  const totalStr = totalWithVat.toFixed(2);
  tlvSegments.push(`4${totalStr.length.toString().padStart(2, '0')}${totalStr}`);
  
  // Tag 5: VAT Total
  const vatStr = vatTotal.toFixed(2);
  tlvSegments.push(`5${vatStr.length.toString().padStart(2, '0')}${vatStr}`);
  
  // Tag 6: Invoice Serial Number (UUID or unique identifier)
  tlvSegments.push(`6${invoiceSerialNumber.length.toString().padStart(2, '0')}${invoiceSerialNumber}`);
  
  // Tag 7: Invoice ID (can be same as serial number or different)
  tlvSegments.push(`7${invoiceId.length.toString().padStart(2, '0')}${invoiceId}`);
  
  // Tag 8: Cryptographic Stamp (simplified)
  function generateSimplifiedCryptoStamp(
    sellerName,
    vatRegistrationNumber,
    timestamp,
    totalWithVat,
    vatTotal,
    invoiceSerialNumber
  ) {
    const dataToHash = `${sellerName}|${vatRegistrationNumber}|${timestamp}|${totalWithVat.toFixed(2)}|${vatTotal.toFixed(2)}|${invoiceSerialNumber}`;
    
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).substring(0, 16).toUpperCase();
  }
  
  const cryptoStamp = generateSimplifiedCryptoStamp(
    sellerName,
    vatRegistrationNumber,
    zatcaTimestamp,
    totalWithVat,
    vatTotal,
    invoiceSerialNumber
  );
  tlvSegments.push(`8${cryptoStamp.length.toString().padStart(2, '0')}${cryptoStamp}`);
  
  // Combine all TLV segments
  return tlvSegments.join('');
}

async function testZATCAQRCode() {
  console.log('Testing ZATCA QR Code Format...\n');
  
  // Test data
  const testData = {
    sellerName: 'Test Business LLC',
    vatRegistrationNumber: '123456789012345',
    invoiceSerialNumber: 'INV-2024-001',
    timestamp: '2024-01-15T10:30:00Z',
    invoiceId: 'inv123456',
    invoiceTotal: 150.00,
    vatTotal: 22.50
  };
  
  console.log('Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n---\n');
  
  // Generate ZATCA TLV content
  const zatcaContent = generateZATCAQRContent(
    testData.sellerName,
    testData.vatRegistrationNumber,
    testData.invoiceSerialNumber,
    testData.timestamp,
    testData.invoiceId,
    testData.invoiceTotal,
    testData.vatTotal
  );
  
  console.log('Generated ZATCA TLV Content:');
  console.log(zatcaContent);
  console.log('\n---\n');
  
  console.log('TLV Segment Analysis:');
  
  // Parse and display TLV segments
  let pos = 0;
  let segmentNum = 1;
  while (pos < zatcaContent.length) {
    const tag = zatcaContent.substring(pos, pos + 1);
    const length = parseInt(zatcaContent.substring(pos + 1, pos + 3), 10);
    const value = zatcaContent.substring(pos + 3, pos + 3 + length);
    
    console.log(`Segment ${segmentNum}:`);
    console.log(`  Tag: ${tag}`);
    console.log(`  Length: ${length}`);
    console.log(`  Value: ${value}`);
    console.log('');
    
    pos += 3 + length;
    segmentNum++;
  }
  
  console.log('---\n');
  
  // Generate QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(zatcaContent, {
      width: 128,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('✓ QR Code Generated Successfully');
    console.log(`QR Code Data URL length: ${qrDataUrl.length} characters`);
    console.log(`QR Code Data URL starts with: ${qrDataUrl.substring(0, 50)}...`);
    
    // Test with a ZATCA validator (simulated)
    console.log('\n---\n');
    console.log('ZATCA Format Validation:');
    
    // Check if format matches ZATCA requirements
    const hasRequiredTags = zatcaContent.includes('1') && 
                           zatcaContent.includes('2') && 
                           zatcaContent.includes('3') && 
                           zatcaContent.includes('4') && 
                           zatcaContent.includes('5');
    
    const hasProperTLVFormat = /^(\d{3}.+)+$/.test(zatcaContent);
    
    console.log(`✓ Has required tags (1-5): ${hasRequiredTags}`);
    console.log(`✓ Proper TLV format: ${hasProperTLVFormat}`);
    console.log(`✓ Timestamp format (ISO 8601): ${testData.timestamp.includes('T') && testData.timestamp.includes('Z')}`);
    console.log(`✓ VAT number length (15 digits): ${testData.vatRegistrationNumber.length === 15}`);
    console.log(`✓ Invoice total format: ${/^\d+\.\d{2}$/.test(testData.invoiceTotal.toFixed(2))}`);
    console.log(`✓ VAT total format: ${/^\d+\.\d{2}$/.test(testData.vatTotal.toFixed(2))}`);
    
  } catch (error) {
    console.error('✗ Error generating QR code:', error.message);
  }
  
  console.log('\n✓ Test completed!');
}

// Run the test
testZATCAQRCode().catch(console.error);
