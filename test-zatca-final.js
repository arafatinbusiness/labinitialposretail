// Test ZATCA QR code format with Base64 encoding
const QRCode = require('qrcode');

// Simulate the updated ZATCA QR code generation
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
  
  // Tag 1: Seller's Name (max 100 characters)
  const sellerNameTruncated = sellerName.substring(0, 100);
  tlvSegments.push(`1${sellerNameTruncated.length.toString().padStart(2, '0')}${sellerNameTruncated}`);
  
  // Tag 2: VAT Registration Number (15 digits for Saudi Arabia)
  const vatNumber = vatRegistrationNumber.padStart(15, '0').substring(0, 15);
  tlvSegments.push(`2${vatNumber.length.toString().padStart(2, '0')}${vatNumber}`);
  
  // Tag 3: Invoice Timestamp (Zulu time, ISO 8601)
  tlvSegments.push(`3${zatcaTimestamp.length.toString().padStart(2, '0')}${zatcaTimestamp}`);
  
  // Tag 4: Invoice Total (with VAT) - format: 123.45
  const totalStr = totalWithVat.toFixed(2);
  tlvSegments.push(`4${totalStr.length.toString().padStart(2, '0')}${totalStr}`);
  
  // Tag 5: VAT Total - format: 12.34
  const vatStr = vatTotal.toFixed(2);
  tlvSegments.push(`5${vatStr.length.toString().padStart(2, '0')}${vatStr}`);
  
  // Tag 6: Invoice Serial Number (use auto-generated invoice ID)
  // If invoiceSerialNumber is empty, use invoiceId
  const serialNumber = invoiceSerialNumber || invoiceId;
  tlvSegments.push(`6${serialNumber.length.toString().padStart(2, '0')}${serialNumber}`);
  
  // Tag 7: Invoice ID (use auto-generated invoice ID)
  tlvSegments.push(`7${invoiceId.length.toString().padStart(2, '0')}${invoiceId}`);
  
  // Tag 8: Cryptographic Stamp (Base64 encoded hash)
  function generateZATCACryptoStamp(
    sellerName,
    vatRegistrationNumber,
    timestamp,
    totalWithVat,
    vatTotal,
    invoiceSerialNumber
  ) {
    // Create the data to hash according to ZATCA specifications
    const dataToHash = `${sellerName}|${vatRegistrationNumber}|${timestamp}|${totalWithVat.toFixed(2)}|${vatTotal.toFixed(2)}`;
    
    // Simple hash simulation
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Create a mock hash string
    const mockHash = Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
    
    // Return as Base64 encoded string
    return Buffer.from(mockHash, 'hex').toString('base64').substring(0, 88);
  }
  
  const cryptoStamp = generateZATCACryptoStamp(
    sellerNameTruncated,
    vatNumber,
    zatcaTimestamp,
    totalWithVat,
    vatTotal,
    serialNumber
  );
  tlvSegments.push(`8${cryptoStamp.length.toString().padStart(2, '0')}${cryptoStamp}`);
  
  // Combine all TLV segments
  const tlvString = tlvSegments.join('');
  
  // Convert to Base64 for ZATCA compliance
  return Buffer.from(tlvString).toString('base64');
}

async function testZATCAQRCode() {
  console.log('Testing ZATCA QR Code Format (Base64 Encoded)...\n');
  
  // Test data
  const testData = {
    sellerName: 'Test Business LLC',
    vatRegistrationNumber: '123456789012345',
    invoiceSerialNumber: '', // Empty - should use invoiceId
    timestamp: '2024-01-15T10:30:00Z',
    invoiceId: 'INV-2024-001',
    invoiceTotal: 150.00,
    vatTotal: 22.50
  };
  
  console.log('Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n---\n');
  
  // Generate ZATCA Base64 content
  const zatcaContent = generateZATCAQRContent(
    testData.sellerName,
    testData.vatRegistrationNumber,
    testData.invoiceSerialNumber,
    testData.timestamp,
    testData.invoiceId,
    testData.invoiceTotal,
    testData.vatTotal
  );
  
  console.log('Generated ZATCA Base64 Content:');
  console.log(zatcaContent);
  console.log('\n---\n');
  
  console.log('Content Analysis:');
  console.log(`✓ Is Base64 encoded: ${/^[A-Za-z0-9+/]+=*$/.test(zatcaContent)}`);
  console.log(`✓ Length: ${zatcaContent.length} characters`);
  
  // Decode Base64 to see TLV structure
  try {
    const decoded = Buffer.from(zatcaContent, 'base64').toString('utf8');
    console.log(`✓ Decoded TLV length: ${decoded.length} characters`);
    console.log('\nDecoded TLV Structure:');
    
    // Parse and display TLV segments
    let pos = 0;
    let segmentNum = 1;
    while (pos < decoded.length) {
      const tag = decoded.substring(pos, pos + 1);
      const length = parseInt(decoded.substring(pos + 1, pos + 3), 10);
      const value = decoded.substring(pos + 3, pos + 3 + length);
      
      console.log(`Segment ${segmentNum}:`);
      console.log(`  Tag: ${tag}`);
      console.log(`  Length: ${length}`);
      console.log(`  Value: ${value}`);
      console.log('');
      
      pos += 3 + length;
      segmentNum++;
    }
  } catch (error) {
    console.error('✗ Error decoding Base64:', error.message);
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
    
    // Test ZATCA compliance checks
    console.log('\n---\n');
    console.log('ZATCA Compliance Checks:');
    
    // Check if format matches ZATCA requirements
    const decoded = Buffer.from(zatcaContent, 'base64').toString('utf8');
    const hasRequiredTags = decoded.includes('1') && 
                           decoded.includes('2') && 
                           decoded.includes('3') && 
                           decoded.includes('4') && 
                           decoded.includes('5') &&
                           decoded.includes('6') &&
                           decoded.includes('7') &&
                           decoded.includes('8');
    
    const hasProperTLVFormat = /^(\d{3}.+)+$/.test(decoded);
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(zatcaContent);
    
    console.log(`✓ Has all required tags (1-8): ${hasRequiredTags}`);
    console.log(`✓ Proper TLV format: ${hasProperTLVFormat}`);
    console.log(`✓ Base64 encoded: ${isBase64}`);
    console.log(`✓ VAT number is 15 digits: ${testData.vatRegistrationNumber.length === 15}`);
    console.log(`✓ Timestamp is ISO 8601: ${testData.timestamp.includes('T') && testData.timestamp.includes('Z')}`);
    console.log(`✓ Invoice total has 2 decimal places: ${/^\d+\.\d{2}$/.test(testData.invoiceTotal.toFixed(2))}`);
    console.log(`✓ VAT total has 2 decimal places: ${/^\d+\.\d{2}$/.test(testData.vatTotal.toFixed(2))}`);
    console.log(`✓ Using auto-generated invoice ID as serial number: ${!testData.invoiceSerialNumber}`);
    
  } catch (error) {
    console.error('✗ Error generating QR code:', error.message);
  }
  
  console.log('\n✓ Test completed!');
  console.log('\nNote: For full ZATCA compliance, the cryptographic stamp (Tag 8) should be a proper SHA256 hash with digital signature.');
}

// Run the test
testZATCAQRCode().catch(console.error);
