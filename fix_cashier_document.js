// Script to fix cashier document ID issue
// This script assumes you have Firebase Admin SDK access

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  // Or use service account key
  // credential: admin.credential.cert('./service-account-key.json')
});

const db = admin.firestore();

async function fixCashierDocument() {
  const storeId = 'f1xTNTV7MpNIZeoAgpTfHOHnkig1';
  const oldUserId = 'user_1766215060133';
  
  // You need to find the actual auth UID for the cashier
  // Check Firebase Authentication console for user with email:
  // arafatbusinessaihelp@gmail.com
  const actualAuthUid = 'REPLACE_WITH_ACTUAL_AUTH_UID'; // <-- IMPORTANT: Replace this!
  
  if (actualAuthUid === 'REPLACE_WITH_ACTUAL_AUTH_UID') {
    console.error('ERROR: You must replace actualAuthUid with the real Firebase Authentication UID');
    console.error('To find the auth UID:');
    console.error('1. Go to Firebase Console > Authentication > Users');
    console.error('2. Find user with email: arafatbusinessaihelp@gmail.com');
    console.error('3. Copy the User UID');
    return;
  }
  
  try {
    // Get the old document
    const oldDocRef = db.collection('stores').doc(storeId)
      .collection('storeUsers').doc(oldUserId);
    
    const oldDoc = await oldDocRef.get();
    
    if (!oldDoc.exists) {
      console.error(`Document not found at: stores/${storeId}/storeUsers/${oldUserId}`);
      return;
    }
    
    console.log('Old document data:', oldDoc.data());
    
    // Create new document with actual auth UID as document ID
    const newDocRef = db.collection('stores').doc(storeId)
      .collection('storeUsers').doc(actualAuthUid);
    
    // Copy all data from old document
    const newData = {
      ...oldDoc.data(),
      // Ensure id field matches the new document ID
      id: actualAuthUid,
      // Add a field to track this was migrated
      migratedFrom: oldUserId,
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await newDocRef.set(newData);
    
    console.log(`✅ Successfully created new document at: stores/${storeId}/storeUsers/${actualAuthUid}`);
    console.log('New document data:', newData);
    
    // Optional: Delete old document
    // await oldDocRef.delete();
    // console.log(`🗑️ Deleted old document: stores/${storeId}/storeUsers/${oldUserId}`);
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. The cashier should now be able to access the store');
    console.log('2. Test cashier login and POS access');
    console.log('3. If everything works, you can delete the old document');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
fixCashierDocument();
