// Script to reset invoice counter
// Run this in browser console when logged in as admin

const storeId = 'YOUR_STORE_ID_HERE'; // Replace with actual store ID

async function resetInvoiceCounter(startNumber = 1) {
  try {
    const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    // Initialize Firebase if not already done
    const firebaseConfig = {
      apiKey: "AIzaSyAnOpHrMlpew2Lz2hkd9QfkBzhYK1WbnhQ",
      authDomain: "business-management-70fd4.firebaseapp.com",
      projectId: "business-management-70fd4",
      storageBucket: "business-management-70fd4.firebasestorage.app",
      messagingSenderId: "818492628648",
      appId: "1:818492628648:web:17e12ff9412176a73eec9d"
    };
    
    // Get Firestore instance
    const db = getFirestore();
    
    // Reset counter
    const counterRef = doc(db, 'stores', storeId, 'counters', 'invoice');
    await setDoc(counterRef, { 
      lastNumber: startNumber - 1, // Set to one less so next will be startNumber
      initializedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reset: true
    });
    
    console.log(`✅ Invoice counter reset to start at ${startNumber}`);
    console.log(`Next invoice will be: INV-${startNumber.toString().padStart(6, '0')}`);
    
  } catch (error) {
    console.error('❌ Error resetting counter:', error);
  }
}

// Also add a function to check current counter
async function checkInvoiceCounter() {
  try {
    const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const firebaseConfig = {
      apiKey: "AIzaSyAnOpHrMlpew2Lz2hkd9QfkBzhYK1WbnhQ",
      authDomain: "business-management-70fd4.firebaseapp.com",
      projectId: "business-management-70fd4",
      storageBucket: "business-management-70fd4.firebasestorage.app",
      messagingSenderId: "818492628648",
      appId: "1:818492628648:web:17e12ff9412176a73eec9d"
    };
    
    const db = getFirestore();
    const counterRef = doc(db, 'stores', storeId, 'counters', 'invoice');
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      const data = counterDoc.data();
      console.log('📊 Current counter:', data);
      console.log(`Next invoice: INV-${(data.lastNumber + 1).toString().padStart(6, '0')}`);
    } else {
      console.log('📊 Counter does not exist. Next invoice will start at INV-000001');
    }
    
  } catch (error) {
    console.error('❌ Error checking counter:', error);
  }
}

// Add to global scope
window.resetInvoiceCounter = resetInvoiceCounter;
window.checkInvoiceCounter = checkInvoiceCounter;

console.log('📝 Invoice counter utilities loaded:');
console.log('1. checkInvoiceCounter() - Check current counter value');
console.log('2. resetInvoiceCounter(startNumber) - Reset counter (default: 1)');
console.log('⚠️  Remember to set storeId variable at the top of the script!');
