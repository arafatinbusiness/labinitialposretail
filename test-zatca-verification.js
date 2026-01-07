/**
 * Test script to verify ZATCA QR code generation
 * This script simulates what happens when generating a ZATCA QR code
 * Run with: node test-zatca-verification.js
 */

// Mock the btoa and atob functions for Node.js
if (typeof btoa === 'undefined') {
  global.btoa = function(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

if (typeof atob === 'undefined') {
  global.atob = function(b64) {
    return Buffer.from(b64, 'base64').toString('binary');
  };
}

/**
 * Simulate the ZATCA QR code generation logic
 */
function generateZATCAQRContent(
  sellerName,
  vatRegistrationNumber,
  invoiceSerialNumber,
  timestamp,
  invoiceId,
  invoiceTotal,
  vatTotal
) {
  console.log('🔍 [ZATCA QR Generation Test] Starting...');
  console.log('📊 Input Data:');
  console.log('  Seller Name:', sellerName);
  console.log('  VAT Registration Number:', vatRegistrationNumber);
  console.log('  Invoice Serial Number:', invoiceSerialNumber || '(empty, will use invoiceId)');
  console.log('  Timestamp:', timestamp);
  console.log('  Invoice ID:', invoiceId);
  console.log('  Invoice Total:', invoiceTotal);
  console.log('  VAT Total:', vatTotal);
  
  // Convert timestamp to ZATCA format (ISO 8601 without milliseconds)
  const zatcaTimestamp = new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
  console.log('  ZATCA Timestamp:', zatcaTimestamp);
  
  // Calculate total with VAT
  const totalWithVat = invoiceTotal + vatTotal;
  console.log('  Total with VAT:', totalWithVat);
  
  // Create TLV (Tag-Length-Value) segments
  const tlvSegments = [];
  
  // Tag 1: Seller's Name (max 100 characters)
  const sellerNameTruncated = sellerName.substring(0, 100);
  const tag1 = `1${sellerNameTruncated.length.toString().padStart(2, '0')}${sellerNameTruncated}`;
  tlvSegments.push(tag1);
  console.log('  Tag 1 (Seller):', tag1);
  
  // Tag 2: VAT Registration Number (15 digits for Saudi Arabia)
  const vatNumber = vatRegistrationNumber.padStart(15, '0').substring(0, 15);
  const tag2 = `2${vatNumber.length.toString().padStart(2, '0')}${vatNumber}`;
  tlvSegments.push(tag2);
  console.log('  Tag 2 (VAT):', tag2);
  
  // Tag 3: Invoice Timestamp (Zulu time, ISO 8601)
  const tag3 = `3${zatcaTimestamp.length.toString().padStart(2, '0')}${zatcaTimestamp}`;
  tlvSegments.push(tag3);
  console.log('  Tag 3 (Timestamp):', tag3);
  
  // Tag 4: Invoice Total (with VAT) - format: 123.45
  const totalStr = totalWithVat.toFixed(2);
  const tag4 = `4${totalStr.length.toString().padStart(2, '0')}${totalStr}`;
  tlvSegments.push(tag4);
  console.log('  Tag 4 (Total):', tag4);
  
  // Tag 5: VAT Total - format: 12.34
  const vatStr = vatTotal.toFixed(2);
  const tag5 = `5${vatStr.length.toString().padStart(2, '0')}${vatStr}`;
  tlvSegments.push(tag5);
  console.log('  Tag 5 (VAT Total):', tag5);
  
  // Tag 6: Invoice Serial Number (use auto-generated invoice ID)
  const serialNumber = invoiceSerialNumber || invoiceId;
  const tag6 = `6${serialNumber.length.toString().padStart(2, '0')}${serialNumber}`;
  tlvSegments.push(tag6);
  console.log('  Tag 6 (Serial):', tag6);
  
  // Tag 7: Invoice ID (use auto-generated invoice ID)
  const tag7 = `7${invoiceId.length.toString().padStart(2, '0')}${invoiceId}`;
  tlvSegments.push(tag7);
  console.log('  Tag 7 (Invoice ID):', tag7);
  
  // Tag 8: Cryptographic Stamp (mock)
  const cryptoStamp = generateMockCryptoStamp(
    sellerNameTruncated,
    vatNumber,
    zatcaTimestamp,
    totalWithVat,
    vatTotal,
    serialNumber
  );
  const tag8 = `8${cryptoStamp.length.toString().padStart(2, '0')}${cryptoStamp}`;
  tlvSegments.push(tag8);
  console.log('  Tag 8 (Crypto Stamp):', tag8.substring(0, 50) + '...');
  
  // Combine all TLV segments
  const tlvString = tlvSegments.join('');
  console.log('📝 TLV String (raw):', tlvString);
  console.log('📏 TLV Length:', tlvString.length, 'characters');
  
  // Convert to Base64 for ZATCA compliance
  const base64Content = btoa(tlvString);
  console.log('🔢 Base64 Encoded:', base64Content);
  console.log('📏 Base64 Length:', base64Content.length, 'characters');
  
  // Decode and verify
  try {
    const decoded = atob(base64Content);
    console.log('✅ Base64 Decode Verification:', decoded === tlvString ? 'PASS' : 'FAIL');
    
    // Parse TLV segments from decoded string
    console.log('📊 Decoded TLV Analysis:');
    let pos = 0;
    let segmentNum = 1;
    while (pos < decoded.length) {
      const tag = decoded.substring(pos, pos + 1);
      const length = parseInt(decoded.substring(pos + 1, pos + 3), 10);
      const value = decoded.substring(pos + 3, pos + 3 + length);
      
      console.log(`    Segment ${segmentNum}: Tag=${tag}, Length=${length}, Value=${value}`);
      
      pos += 3 + length;
      segmentNum++;
    }
  } catch (error) {
    console.error('❌ Base64 Decode Error:', error);
  }
  
  console.log('🎯 [ZATCA QR Generation Test] Complete');
  console.log('---');
  
  return base64Content;
}

/**
 * Generate mock cryptographic stamp
 */
function generateMockCryptoStamp(
  sellerName,
  vatRegistrationNumber,
  timestamp,
  totalWithVat,
  vatTotal,
  invoiceSerialNumber
) {
  // Create the data to hash
  const dataToHash = `${sellerName}|${vatRegistrationNumber}|${timestamp}|${totalWithVat.toFixed(2)}|${vatTotal.toFixed(2)}`;
  
  // Simple hash simulation
  let hash = 0;
  for (let i = 0; i < dataToHash.length; i++) {
    const char = dataToHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Create a hex string that looks like SHA256
  const seed = Math.abs(hash);
  let mockHash = '';
  const hexChars = '0123456789abcdef';
  
  for (let i = 0; i < 64; i++) {
    const pseudoRandom = (seed * (i + 1)) % 16;
    mockHash += hexChars[pseudoRandom];
  }
  
  // Convert hex to Base64
  const hexToBase64 = (hexString) => {
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substr(i, 2), 16));
    }
    
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  };
  
  return hexToBase64(mockHash).substring(0, 88);
}

/**
 * Test cases
 */
console.log('🧪 ZATCA QR Code Verification Tests');
console.log('===================================\n');

// Test Case 1: From your logs
console.log('📋 Test Case 1: From Browser Logs');
const test1Result = generateZATCAQRContent(
  'Arafat Hossain',
  '310122393500003',
  '',
  '2025-12-14T06:53:00.037Z',
  'INV-017',
  51.75,
  6.75
);

console.log('\n📋 Test Case 2: Different Values');
const test2Result = generateZATCAQRContent(
  'Test Business LLC',
  '123456789012345',
  'INV-2024-001',
  '2024-01-15T10:30:00Z',
  'INV-2024-001',
  150.00,
  22.50
);

console.log('\n📋 Test Case 3: Edge Case - Long Seller Name');
const test3Result = generateZATCAQRContent(
  'Very Long Business Name That Should Be Truncated To One Hundred Characters Maximum According To ZATCA Specifications',
  '987654321098765',
  '',
  '2024-12-31T23:59:59Z',
  'INV-999',
  9999.99,
  1499.99
);

console.log('\n🎯 Verification Summary:');
console.log('1. Test 1 Base64:', test1Result.substring(0, 50) + '...');
console.log('2. Test 2 Base64:', test2Result.substring(0, 50) + '...');
console.log('3. Test 3 Base64:', test3Result.substring(0, 50) + '...');

console.log('\n🔍 To verify with ZATCA scanner:');
console.log('1. Copy the Base64 string from Test 1');
console.log('2. Use an online Base64 decoder to verify structure');
console.log('3. Generate QR code with the Base64 content');
console.log('4. Scan with ZATCA scanner app');

console.log('\n📱 Quick QR Code Generation:');
console.log('Visit: https://qrcode.tec-it.com/en');
console.log('Select: "Free Text"');
console.log('Paste: The Base64 string');
console.log('Generate and scan!');
