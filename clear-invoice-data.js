#!/usr/bin/env node

/**
 * Script to clear invoice data from localStorage and provide instructions
 * for deleting invoices from Firebase Firestore.
 * 
 * This script helps fix the issue with extreme invoice values in reports.
 */

import { createInterface } from 'readline';
import { stdin as input, stdout as output } from 'process';

// Create readline interface
const rl = createInterface({ input, output });

console.log('📊 Invoice Data Cleanup Tool');
console.log('='.repeat(50));

async function main() {
  console.log('\nThis tool will help you fix invoice data issues:');
  console.log('1. Clear localStorage invoice cache');
  console.log('2. Provide instructions to delete problematic invoices');
  console.log('3. Help reset report calculations\n');
  
  rl.question('Choose option (1-3) or "all" for everything: ', async (option) => {
    if (option === '1' || option === 'all') {
      clearLocalStorageCache();
    }
    
    if (option === '2' || option === 'all') {
      showFirebaseDeletionInstructions();
    }
    
    if (option === '3' || option === 'all') {
      showReportFixInstructions();
    }
    
    if (!['1', '2', '3', 'all'].includes(option)) {
      console.log('❌ Invalid option. Please run the script again.');
    }
    
    rl.close();
  });
}

function clearLocalStorageCache() {
  console.log('\n🗑️  Clearing localStorage invoice cache...');
  
  // This would run in browser context, but we'll provide instructions
  console.log('\nTo clear localStorage cache in your browser:');
  console.log('1. Open your browser developer tools (F12)');
  console.log('2. Go to the "Application" or "Storage" tab');
  console.log('3. Find "Local Storage" and click on your website URL');
  console.log('4. Look for keys containing:');
  console.log('   - firebase_cache_*_invoices');
  console.log('   - firebase_cache_timestamp_*_invoices');
  console.log('5. Delete these keys');
  console.log('\nAlternatively, run this in browser console:');
  console.log(`
    // Clear all invoice cache
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('_invoices')) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    console.log('Cleared ' + keys.length + ' invoice cache keys');
  `);
}

function showFirebaseDeletionInstructions() {
  console.log('\n🔥 Instructions to delete invoices from Firebase:');
  console.log('='.repeat(50));
  
  console.log('\nMETHOD 1: Using Firebase Console (Recommended)');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Select your project: "business-management-70fd4"');
  console.log('3. Go to Firestore Database in the left menu');
  console.log('4. Navigate to the "stores" collection');
  console.log('5. For each store document:');
  console.log('   - Click on the store document');
  console.log('   - Go to the "invoices" subcollection');
  console.log('   - Select all invoices (check the checkbox at top)');
  console.log('   - Click "Delete"');
  console.log('   - Confirm deletion');
  
  console.log('\nMETHOD 2: Using Firebase CLI');
  console.log('1. Install Firebase CLI: npm install -g firebase-tools');
  console.log('2. Login: firebase login');
  console.log('3. Run this command to delete all invoices:');
  console.log(`
    firebase firestore:delete --project=business-management-70fd4 --recursive stores
    # This will delete ALL data including stores - USE WITH CAUTION!
  `);
  
  console.log('\nMETHOD 3: Delete only problematic invoices (with extreme values)');
  console.log('1. In Firebase Console Firestore, go to stores > [storeId] > invoices');
  console.log('2. Look for invoices with grandTotal > 1000000 (1 million)');
  console.log('3. These are likely the problematic invoices');
  console.log('4. Delete only these invoices');
  
  console.log('\n⚠️  WARNING: Deleting invoices will remove all sales history!');
  console.log('   Consider backing up important data first.');
}

function showReportFixInstructions() {
  console.log('\n📈 Fixing Report Calculations:');
  console.log('='.repeat(50));
  
  console.log('\nThe ReportsView component has been updated to:');
  console.log('1. Skip invoices with extreme values (> 1 billion)');
  console.log('2. Handle case-insensitive payment modes (Cash/cash)');
  console.log('3. Fix time period filtering (Today/Week/Month)');
  console.log('4. Calculate gross profit correctly');
  
  console.log('\nAfter deleting problematic invoices:');
  console.log('1. The reports should show correct values');
  console.log('2. Cash/Card distribution will update in real-time');
  console.log('3. Gross sales and profit will be accurate');
  
  console.log('\nTo test the fix:');
  console.log('1. Create a new test invoice with normal values');
  console.log('2. Go to Reports view');
  console.log('3. Check if values are reasonable');
  console.log('4. Try different time periods (Today, This Week, This Month)');
}

// Check if we're in a browser-like environment
if (typeof window !== 'undefined' && window.localStorage) {
  // We're in a browser context
  console.log('Browser environment detected...');
  clearLocalStorageCache();
} else {
  // We're in Node.js context
  main();
}
