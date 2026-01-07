#!/usr/bin/env node

/**
 * Script to delete all invoices across all stores in Firebase Firestore
 * 
 * WARNING: This will permanently delete ALL invoices from ALL stores.
 * Use with extreme caution!
 * 
 * Usage: node delete-all-invoices.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Firebase configuration
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this from Firebase Console

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'business-management-70fd4'
});

const db = admin.firestore();

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllInvoices() {
  console.log('🚨 WARNING: This script will delete ALL invoices from ALL stores! 🚨\n');
  console.log('This action cannot be undone.\n');
  
  // Ask for confirmation
  rl.question('Are you sure you want to continue? Type "DELETE ALL" to confirm: ', async (answer) => {
    if (answer !== 'DELETE ALL') {
      console.log('❌ Operation cancelled.');
      rl.close();
      return;
    }
    
    console.log('\n⏳ Starting invoice deletion process...\n');
    
    try {
      // Get all stores
      const storesSnapshot = await db.collection('stores').get();
      
      if (storesSnapshot.empty) {
        console.log('No stores found.');
        rl.close();
        return;
      }
      
      console.log(`Found ${storesSnapshot.size} stores.\n`);
      
      let totalInvoicesDeleted = 0;
      let totalStoresProcessed = 0;
      
      // Process each store
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        const storeName = storeDoc.data().name || storeId;
        
        console.log(`Processing store: ${storeName} (${storeId})`);
        
        // Get all invoices for this store
        const invoicesRef = db.collection('stores').doc(storeId).collection('invoices');
        const invoicesSnapshot = await invoicesRef.get();
        
        if (invoicesSnapshot.empty) {
          console.log(`  No invoices found for store ${storeName}\n`);
          totalStoresProcessed++;
          continue;
        }
        
        console.log(`  Found ${invoicesSnapshot.size} invoices to delete`);
        
        // Delete all invoices in batches
        const batchSize = 500;
        const batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;
        
        for (const invoiceDoc of invoicesSnapshot.docs) {
          currentBatch.delete(invoiceDoc.ref);
          operationCount++;
          
          if (operationCount === batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
          }
        }
        
        // Add the last batch if it has operations
        if (operationCount > 0) {
          batches.push(currentBatch);
        }
        
        // Commit all batches
        for (let i = 0; i < batches.length; i++) {
          console.log(`  Committing batch ${i + 1}/${batches.length}...`);
          await batches[i].commit();
        }
        
        totalInvoicesDeleted += invoicesSnapshot.size;
        totalStoresProcessed++;
        
        console.log(`  ✅ Deleted ${invoicesSnapshot.size} invoices from store ${storeName}\n`);
      }
      
      console.log('='.repeat(50));
      console.log('✅ DELETION COMPLETE!');
      console.log(`📊 Summary:`);
      console.log(`   Stores processed: ${totalStoresProcessed}`);
      console.log(`   Total invoices deleted: ${totalInvoicesDeleted}`);
      console.log('='.repeat(50));
      
    } catch (error) {
      console.error('❌ Error during deletion:', error);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

// Alternative: Simple script without Firebase Admin SDK (using localStorage)
function deleteLocalStorageInvoices() {
  console.log('🗑️  Deleting invoices from localStorage...\n');
  
  // Get all keys from localStorage
  const keysToDelete = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    // Delete invoice cache for all stores
    if (key && key.includes('firebase_cache_') && key.includes('_invoices')) {
      keysToDelete.push(key);
    }
    
    // Also delete the timestamp keys
    if (key && key.includes('firebase_cache_timestamp_') && key.includes('_invoices')) {
      keysToDelete.push(key);
    }
  }
  
  // Delete all found keys
  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
    console.log(`  Deleted: ${key}`);
  });
  
  // Also clear store_registry invoices
  const storeRegistry = JSON.parse(localStorage.getItem('store_registry') || '[]');
  if (storeRegistry.length > 0) {
    console.log('\n⚠️  Note: Store registry contains store accounts, not invoices.');
    console.log('   Invoices are stored in Firebase Firestore, not localStorage.');
  }
  
  console.log('\n✅ localStorage invoice cache cleared.');
  console.log('\n⚠️  IMPORTANT: This only clears the cache.');
  console.log('   To delete actual invoices from Firebase, use the Firebase Admin script.');
}

// Check if we should use localStorage method
if (process.argv.includes('--local')) {
  deleteLocalStorageInvoices();
} else {
  // Check if service account file exists
  const fs = require('fs');
  if (!fs.existsSync('./serviceAccountKey.json')) {
    console.log('❌ serviceAccountKey.json not found.');
    console.log('\nTo delete invoices from Firebase:');
    console.log('1. Download serviceAccountKey.json from Firebase Console');
    console.log('   (Project Settings > Service Accounts > Generate New Private Key)');
    console.log('2. Save it in the project root as serviceAccountKey.json');
    console.log('3. Run: node delete-all-invoices.js');
    console.log('\nTo clear localStorage cache only:');
    console.log('   Run: node delete-all-invoices.js --local');
    process.exit(1);
  }
  
  deleteAllInvoices();
}
