/**
 * Test script to verify SIMPLIFIED ZATCA QR code generation
 * This matches the Flutter implementation (only 5 tags, no cryptographic stamp)
 * Run with: node test-zatca-simplified.js
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
 * Generate ZATCA QR code content matching Flutter implementation
 * Only includes 5 tags: Seller Name, VAT Number, Timestamp, Total Amount, VAT Amount
 * No cryptographic stamp (Tag 8)
 */
function generateSimplifiedZATCAQRContent(
  sellerName,
  vatRegistrationNumber,
  timestamp,
  totalAmount,
  vatAmount
) {
  console.log('🔍 [Simplified ZATCA QR Generation] Starting...');
  console.log('📊 Input Data:');
  console.log('  Seller Name:', sellerName);
  console.log('  VAT Registration Number:', vatRegistrationNumber);
  console.log('  Timestamp:', timestamp);
  console.log('  Total Amount:', totalAmount);
  console.log('  VAT Amount:', vatAmount);
  
  // Convert timestamp to ZATCA format (ISO 8601 without milliseconds)
  const zatcaTimestamp = new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
  console.log('  ZATCA Timestamp:', zatcaTimestamp);
  
  // Create TLV (Tag-Length-Value) segments - SIMPLIFIED like Flutter
  const tlvSegments = [];
  
  // Tag 1: Seller's Name (max 100 characters)
  const sellerNameTruncated = sellerName.substring(0, 100);
  const tag1 = `1${sellerNameTruncated.length.toString().padStart(2, '0')}${sellerNameTruncated}`;
  tlvSegments.push(tag1);
  console.log('  Tag 1 (Seller):', tag1.substring(0, 50) + '...');
  
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
  const totalStr = totalAmount.toFixed(2);
  const tag4 = `4${totalStr.length.toString().padStart(2, '0')}${totalStr}`;
  tlvSegments.push(tag4);
  console.log('  Tag 4 (Total):', tag4);
  
  // Tag 5: VAT Total - format: 12.34
  const vatStr = vatAmount.toFixed(2);
  const tag5 = `5${vatStr.length.toString().padStart(2, '0')}${vatStr}`;
  tlvSegments.push(tag5);
  console.log('  Tag 5 (VAT Total):', tag5);
  
  // NOTE: Flutter implementation ONLY uses tags 1-5, no tags 6, 7, or 8
  // This is a simplified ZATCA Phase 1 implementation
  
  // Combine all TLV segments
  const tlvString = tlvSegments.join('');
  console.log('📝 TLV String (raw):', tlvString);
  console.log('📏 TLV Length:', tlvString.length, 'characters');
  console.log('🔍 TLV Analysis:');
  
  // Parse and display each segment
  let pos = 0;
  let segmentNum = 1;
  while (pos < tlvString.length) {
    const tag = tlvString.substring(pos, pos + 1);
    const length = parseInt(tlvString.substring(pos + 1, pos + 3), 10);
    const value = tlvString.substring(pos + 3, pos + 3 + length);
    
    console.log(`    Segment ${segmentNum}: Tag=${tag}, Length=${length}, Value=${value}`);
    
    pos += 3 + length;
    segmentNum++;
  }
  
  // Convert to Base64 for ZATCA compliance
  const base64Content = btoa(tlvString);
  console.log('🔢 Base64 Encoded:', base64Content);
  console.log('📏 Base64 Length:', base64Content.length, 'characters');
  
  // Decode and verify
  try {
    const decoded = atob(base64Content);
    console.log('✅ Base64 Decode Verification:', decoded === tlvString ? 'PASS' : 'FAIL');
  } catch (error) {
    console.error('❌ Base64 Decode Error:', error);
  }
  
  console.log('🎯 [Simplified ZATCA QR Generation] Complete');
  console.log('---');
  
  return base64Content;
}

/**
 * Test cases
 */
console.log('🧪 SIMPLIFIED ZATCA QR Code Verification Tests');
console.log('==============================================\n');

// Test Case 1: From your logs (INV-018)
console.log('📋 Test Case 1: From Browser Logs (INV-018)');
const test1Result = generateSimplifiedZATCAQRContent(
  'Arafat Hossain',
  '310122393500003',
  '2025-12-14T06:58:40.852Z',
  58.5, // Total with VAT
  6.75  // VAT Total
);

console.log('\n📋 Test Case 2: Different Values');
const test2Result = generateSimplifiedZATCAQRContent(
  'Test Business LLC',
  '123456789012345',
  '2024-01-15T10:30:00Z',
  172.5,
  22.5
);

console.log('\n📋 Test Case 3: Edge Case - Long Seller Name');
const test3Result = generateSimplifiedZATCAQRContent(
  'Very Long Business Name That Should Be Truncated To One Hundred Characters Maximum According To ZATCA Specifications',
  '987654321098765',
  '2024-12-31T23:59:59Z',
  11499.98,
  1499.99
);

console.log('\n🎯 Verification Summary:');
console.log('1. Test 1 Base64:', test1Result);
console.log('2. Test 2 Base64:', test2Result);
console.log('3. Test 3 Base64:', test3Result);

console.log('\n🔍 Comparison with Flutter Implementation:');
console.log('✅ Only 5 tags (1-5) instead of 8 tags');
console.log('✅ No cryptographic stamp (Tag 8)');
console.log('✅ Simple TLV structure');
console.log('✅ Should work with ZATCA scanners');

console.log('\n📱 How to Test with ZATCA Scanner:');
console.log('1. Copy the Base64 string from Test 1');
console.log('2. Generate QR code at: https://qrcode.tec-it.com/en');
console.log('3. Select "Free Text" and paste the Base64 string');
console.log('4. Scan with ZATCA scanner app');

console.log('\n🔧 Expected TLV Structure:');
console.log('Tag 1: Seller Name (1-100 chars)');
console.log('Tag 2: VAT Registration Number (15 digits)');
console.log('Tag 3: Timestamp (ISO 8601 without milliseconds)');
console.log('Tag 4: Total Amount (with VAT, 2 decimal places)');
console.log('Tag 5: VAT Amount (2 decimal places)');

console.log('\n⚠️  Important Notes:');
console.log('• This is a simplified ZATCA Phase 1 implementation');
console.log('• Flutter app uses this same 5-tag structure');
console.log('• Should work with most ZATCA scanners');
console.log('• For Phase 2 compliance, cryptographic stamp is required');
