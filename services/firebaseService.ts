import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User,
  sendEmailVerification as firebaseSendEmailVerification
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
  writeBatch
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { StoreAccount, Product, Customer, Invoice, Employee, AttendanceRecord, SalaryRecord, BusinessSettings, Category, StoreUser, UserRole, UserStoreAssociation, StockHistory } from '../types';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnOpHrMlpew2Lz2hkd9QfkBzhYK1WbnhQ",
  authDomain: "business-management-70fd4.firebaseapp.com",
  projectId: "business-management-70fd4",
  storageBucket: "business-management-70fd4.firebasestorage.app",
  messagingSenderId: "818492628648",
  appId: "1:818492628648:web:17e12ff9412176a73eec9d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Collections - New subcollection structure
const STORES_COLLECTION = 'stores';

// Helper functions for subcollection paths
const getStoreDoc = (storeId: string) => doc(db, STORES_COLLECTION, storeId);
const getProductsCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'products');
const getCustomersCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'customers');
const getInvoicesCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'invoices');
const getEmployeesCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'employees');
const getAttendanceCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'attendance');
const getSalariesCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'salaries');
const getCategoriesCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'categories');
const getSettingsDoc = (storeId: string) => doc(db, STORES_COLLECTION, storeId, 'settings', 'store');
const getStoreUsersCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'storeUsers');
const getStockHistoryCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'stockHistory');
const getDailyCountersCollection = (storeId: string) => collection(db, STORES_COLLECTION, storeId, 'dailyCounters');
const getDailyCounterDoc = (storeId: string, date: string) => doc(db, STORES_COLLECTION, storeId, 'dailyCounters', date);

// Helper to remove undefined values from data
const sanitizeData = (data: any): any => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
};

// Cache keys
const getCacheKey = (storeId: string, collectionName: string) => `firebase_cache_${storeId}_${collectionName}`;
const getCacheTimestampKey = (storeId: string, collectionName: string) => `firebase_cache_timestamp_${storeId}_${collectionName}`;

// Cache expiration time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Helper to check if cache is valid
const isCacheValid = (storeId: string, collectionName: string): boolean => {
  const timestampKey = getCacheTimestampKey(storeId, collectionName);
  const timestamp = localStorage.getItem(timestampKey);
  if (!timestamp) return false;
  
  const cacheTime = parseInt(timestamp, 10);
  return Date.now() - cacheTime < CACHE_EXPIRY_MS;
};

// Helper to get from cache
const getFromCache = <T>(storeId: string, collectionName: string): T[] | null => {
  if (!isCacheValid(storeId, collectionName)) {
    return null;
  }
  
  const cacheKey = getCacheKey(storeId, collectionName);
  const cached = localStorage.getItem(cacheKey);
  return cached ? JSON.parse(cached) : null;
};

// Helper to save to cache
const saveToCache = <T>(storeId: string, collectionName: string, data: T[]): void => {
  const cacheKey = getCacheKey(storeId, collectionName);
  const timestampKey = getCacheTimestampKey(storeId, collectionName);
  
  localStorage.setItem(cacheKey, JSON.stringify(data));
  localStorage.setItem(timestampKey, Date.now().toString());
};

// Authentication Service
export const authService = {
  // Sign up a new store
  async signUp(email: string, password: string, storeData: Omit<StoreAccount, 'id' | 'email' | 'password'>): Promise<StoreAccount> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const storeId = userCredential.user.uid;
      
      const store: StoreAccount = {
        id: storeId,
        email,
        password, // Note: In production, you should not store passwords in Firestore
        ...storeData
      };
      
      // Save store to Firestore
      await setDoc(getStoreDoc(storeId), store);
      
      // Also save to localStorage for immediate access
      const existingStores = JSON.parse(localStorage.getItem('store_registry') || '[]');
      localStorage.setItem('store_registry', JSON.stringify([...existingStores, store]));
      
      return store;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  // Sign in - Updated to support multi-user store access
  async signIn(email: string, password: string): Promise<{store: StoreAccount | null, userStores: UserStoreAssociation[]}> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Check if user is a store owner (original store account)
      try {
        const storeDoc = await getDoc(getStoreDoc(userId));
        if (storeDoc.exists()) {
          const store = storeDoc.data() as StoreAccount;
          // Update localStorage with latest store data
          const existingStores = JSON.parse(localStorage.getItem('store_registry') || '[]');
          const updatedStores = existingStores.filter((s: StoreAccount) => s.id !== userId);
          localStorage.setItem('store_registry', JSON.stringify([...updatedStores, store]));
          
          return {
            store: { ...store, role: 'admin' as UserRole },
            userStores: [{ userId, storeId: userId, role: 'admin' as UserRole, storeName: store.name }]
          };
        }
      } catch (error) {
        console.log('User is not a store owner, checking store associations...');
      }
      
      // User is not a store owner, check store associations by EMAIL
      const userStores = await this.getUserStoresByEmail(email);
      
      if (userStores.length === 0) {
        throw new Error('User not associated with any store');
      }
      
      return {
        store: null, // Not a store owner
        userStores
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Get stores associated with a user by email
  async getUserStoresByEmail(userEmail: string): Promise<UserStoreAssociation[]> {
    try {
      // Get all stores
      const storesSnapshot = await getDocs(collection(db, STORES_COLLECTION));
      const userStores: UserStoreAssociation[] = [];
      
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        const storeData = storeDoc.data() as StoreAccount;
        
        // Query storeUsers by email
        const storeUsersQuery = query(
          getStoreUsersCollection(storeId),
          where('email', '==', userEmail)
        );
        
        const storeUsersSnapshot = await getDocs(storeUsersQuery);
        
        for (const storeUserDoc of storeUsersSnapshot.docs) {
          const storeUser = storeUserDoc.data() as StoreUser;
          userStores.push({
            userId: storeUserDoc.id, // The document ID in storeUsers
            storeId,
            role: storeUser.role,
            storeName: storeData.name
          });
        }
      }
      
      return userStores;
    } catch (error) {
      console.error('Error getting user stores by email:', error);
      return [];
    }
  },

  // Get stores associated with a user by userId (for backward compatibility)
  async getUserStores(userId: string): Promise<UserStoreAssociation[]> {
    try {
      // Query all stores where this user is in the storeUsers collection
      const storesQuery = query(
        collection(db, STORES_COLLECTION),
        where('storeUsers', 'array-contains', userId)
      );
      
      const querySnapshot = await getDocs(storesQuery);
      const userStores: UserStoreAssociation[] = [];
      
      for (const storeDoc of querySnapshot.docs) {
        const storeId = storeDoc.id;
        const storeData = storeDoc.data() as StoreAccount;
        
        // Get user's role in this store
        const storeUserDoc = await getDoc(doc(getStoreUsersCollection(storeId), userId));
        if (storeUserDoc.exists()) {
          const storeUser = storeUserDoc.data() as StoreUser;
          userStores.push({
            userId,
            storeId,
            role: storeUser.role,
            storeName: storeData.name
          });
        }
      }
      
      return userStores;
    } catch (error) {
      console.error('Error getting user stores:', error);
      return [];
    }
  },

  // Check if email is verified for current user
  isEmailVerified(): boolean {
    const user = auth.currentUser;
    return user ? user.emailVerified : false;
  },

  // Send email verification
  async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      try {
        console.log(`[Firebase Auth] Sending email verification to: ${user.email}`);
        await firebaseSendEmailVerification(user);
        console.log(`[Firebase Auth] Email verification sent successfully to: ${user.email}`);
      } catch (error: any) {
        console.error(`[Firebase Auth] Error sending email verification:`, error);
        console.error(`[Firebase Auth] Error code: ${error.code}, Message: ${error.message}`);
        throw error;
      }
    } else {
      console.warn('[Firebase Auth] No authenticated user found to send email verification');
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      console.log(`[Firebase Auth] Sending password reset email to: ${email}`);
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      console.log(`[Firebase Auth] Password reset email sent successfully to: ${email}`);
    } catch (error: any) {
      console.error(`[Firebase Auth] Error sending password reset email:`, error);
      console.error(`[Firebase Auth] Error code: ${error.code}, Message: ${error.message}`);
      throw error;
    }
  }
};

// Data Service with caching
export const dataService = {
  // Products
  async getProducts(storeId: string): Promise<Product[]> {
    console.log(`[firebaseService] getProducts called for store: ${storeId}`);
    // Try cache first
    const cached = getFromCache<Product>(storeId, 'products');
    if (cached) {
      console.log(`[firebaseService] Returning ${cached.length} products from cache for store: ${storeId}`);
      return cached;
    }
    
    console.log(`[firebaseService] Cache miss, fetching from Firestore for store: ${storeId}`);
    // Fetch from Firestore subcollection
    try {
      const productsCollection = getProductsCollection(storeId);
      console.log(`[firebaseService] Products collection path: stores/${storeId}/products`);
      const querySnapshot = await getDocs(productsCollection);
      console.log(`[firebaseService] Firestore query successful, got ${querySnapshot.docs.length} products`);
      const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      // Save to cache
      saveToCache(storeId, 'products', products);
      console.log(`[firebaseService] Saved ${products.length} products to cache for store: ${storeId}`);
      
      return products;
    } catch (error) {
      console.error(`[firebaseService] Error fetching products for store ${storeId}:`, error);
      console.error(`[firebaseService] Error details:`, error.message, error.code);
      throw error;
    }
  },

  // Helper function to generate next default barcode
  async generateNextDefaultBarcode(storeId: string): Promise<string> {
    try {
      const products = await this.getProducts(storeId);
      
      // Find all default barcodes (3-digit numbers)
      const defaultBarcodes = products
        .filter(p => p.barcode && /^\d{3}$/.test(p.barcode))
        .map(p => parseInt(p.barcode!, 10))
        .sort((a, b) => b - a); // Descending
      
      const lastDefault = defaultBarcodes.length > 0 ? defaultBarcodes[0] : 0;
      const nextNumber = lastDefault + 1;
      
      // Format as 3-digit zero-padded string
      return nextNumber.toString().padStart(3, '0'); // "001", "002", etc.
    } catch (error) {
      console.error('Error generating next default barcode:', error);
      // Fallback to timestamp-based barcode
      return Date.now().toString().slice(-6);
    }
  },

  // Save product with barcode auto-generation
  async saveProductWithBarcode(storeId: string, product: Product, userName: string, userRole: UserRole): Promise<void> {
    try {
      let finalProduct = { ...product };
      
      // Auto-generate barcode if empty
      if (!finalProduct.barcode || finalProduct.barcode.trim() === '') {
        finalProduct.barcode = await this.generateNextDefaultBarcode(storeId);
      }
      
      // Validate barcode uniqueness
      if (finalProduct.barcode) {
        const products = await this.getProducts(storeId);
        const existingProduct = products.find(p => p.barcode === finalProduct.barcode && p.id !== finalProduct.id);
        if (existingProduct) {
          throw new Error(`Barcode "${finalProduct.barcode}" already exists for product: ${existingProduct.name}`);
        }
      }
      
      // Save the product
      await this.saveProduct(storeId, finalProduct);
      
      // Create stock history record for initial stock
      if (finalProduct.stock > 0) {
        await this.createStockHistory(storeId, {
          productId: finalProduct.id,
          productName: finalProduct.name,
          barcode: finalProduct.barcode,
          changeType: 'initial',
          quantity: finalProduct.stock,
          previousStock: 0,
          newStock: finalProduct.stock,
          reason: 'Initial stock',
          performedBy: userName,
          performedByRole: userRole,
          timestamp: new Date().toISOString(),
          storeId
        });
      }
      
    } catch (error) {
      console.error('Error saving product with barcode:', error);
      throw error;
    }
  },

  // Update product stock with history tracking
  async updateProductStock(storeId: string, productId: string, newStock: number, changeType: StockHistory['changeType'], reason: string, userName: string, userRole: UserRole, referenceId?: string): Promise<void> {
    try {
      const productRef = doc(getProductsCollection(storeId), productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }
      
      const product = productDoc.data() as Product;
      const previousStock = product.stock;
      const stockChange = newStock - previousStock;
      
      // Update product stock
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: new Date().toISOString()
      });
      
      // Update cache
      const cached = getFromCache<Product>(storeId, 'products') || [];
      const updatedCache = cached.map(p => 
        p.id === productId ? { ...p, stock: newStock } : p
      );
      saveToCache(storeId, 'products', updatedCache);
      
      // Create stock history record
      await this.createStockHistory(storeId, {
        productId,
        productName: product.name,
        barcode: product.barcode,
        changeType,
        quantity: stockChange,
        previousStock,
        newStock,
        reason,
        performedBy: userName,
        performedByRole: userRole,
        timestamp: new Date().toISOString(),
        referenceId,
        storeId
      });
      
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  },

  async saveProduct(storeId: string, product: Product): Promise<void> {
    const productRef = doc(getProductsCollection(storeId), product.id);
    const productData = sanitizeData(product);
    
    await setDoc(productRef, productData);
    
    // Update cache
    const cached = getFromCache<Product>(storeId, 'products') || [];
    const updatedCache = cached.filter(p => p.id !== product.id);
    saveToCache(storeId, 'products', [...updatedCache, product]);
  },

  async deleteProduct(storeId: string, productId: string): Promise<void> {
    await deleteDoc(doc(getProductsCollection(storeId), productId));
    
    // Update cache
    const cached = getFromCache<Product>(storeId, 'products') || [];
    const updatedCache = cached.filter(p => p.id !== productId);
    saveToCache(storeId, 'products', updatedCache);
  },

  // Real-time subscription for products
  subscribeToProducts(storeId: string, callback: (products: Product[]) => void): () => void {
    const productsCollection = getProductsCollection(storeId);
    
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      saveToCache(storeId, 'products', products);
      callback(products);
    }, (error: FirestoreError) => {
      console.error('Products subscription error:', error);
    });
    
    return unsubscribe;
  },

  // Stock History Functions
  async getStockHistory(storeId: string, productId?: string, startDate?: string, endDate?: string): Promise<StockHistory[]> {
    try {
      const stockHistoryCollection = getStockHistoryCollection(storeId);
      let stockHistoryQuery = query(stockHistoryCollection);
      
      // Apply filters if provided
      const conditions = [];
      if (productId) {
        conditions.push(where('productId', '==', productId));
      }
      if (startDate) {
        conditions.push(where('timestamp', '>=', startDate));
      }
      if (endDate) {
        conditions.push(where('timestamp', '<=', endDate));
      }
      
      if (conditions.length > 0) {
        stockHistoryQuery = query(stockHistoryCollection, ...conditions);
      }
      
      const querySnapshot = await getDocs(stockHistoryQuery);
      const stockHistory = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as StockHistory));
      
      // Sort by timestamp descending (newest first)
      return stockHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting stock history:', error);
      return [];
    }
  },

  async createStockHistory(storeId: string, history: Omit<StockHistory, 'id'>): Promise<void> {
    try {
      const historyId = `stock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const historyRef = doc(getStockHistoryCollection(storeId), historyId);
      const historyData = sanitizeData({ id: historyId, ...history });
      
      await setDoc(historyRef, historyData);
    } catch (error) {
      console.error('Error creating stock history:', error);
      throw error;
    }
  },

  // Real-time subscription for stock history
  subscribeToStockHistory(storeId: string, callback: (history: StockHistory[]) => void, productId?: string): () => void {
    const stockHistoryCollection = getStockHistoryCollection(storeId);
    let stockHistoryQuery = query(stockHistoryCollection);
    
    if (productId) {
      stockHistoryQuery = query(stockHistoryCollection, where('productId', '==', productId));
    }
    
    const unsubscribe = onSnapshot(stockHistoryQuery, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockHistory));
      callback(history);
    }, (error: FirestoreError) => {
      console.error('Stock history subscription error:', error);
    });
    
    return unsubscribe;
  },

  // Real-time subscription for customers
  subscribeToCustomers(storeId: string, callback: (customers: Customer[]) => void): () => void {
    const customersCollection = getCustomersCollection(storeId);
    
    const unsubscribe = onSnapshot(customersCollection, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      saveToCache(storeId, 'customers', customers);
      callback(customers);
    }, (error: FirestoreError) => {
      console.error('Customers subscription error:', error);
    });
    
    return unsubscribe;
  },

  // Customers
  async getCustomers(storeId: string): Promise<Customer[]> {
    console.log(`[firebaseService] getCustomers called for store: ${storeId}`);
    const cached = getFromCache<Customer>(storeId, 'customers');
    if (cached) {
      console.log(`[firebaseService] Returning ${cached.length} customers from cache for store: ${storeId}`);
      if (cached.length > 0) {
        console.log(`[firebaseService] First cached customer:`, {
          id: cached[0].id,
          name: cached[0].name,
          phone: cached[0].phone
        });
      }
      return cached;
    }
    
    console.log(`[firebaseService] Cache miss, fetching customers from Firestore for store: ${storeId}`);
    try {
      const customersCollection = getCustomersCollection(storeId);
      console.log(`[firebaseService] Customers collection path: stores/${storeId}/customers`);
      const querySnapshot = await getDocs(customersCollection);
      console.log(`[firebaseService] Firestore query successful, got ${querySnapshot.docs.length} customers`);
      const customers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      
      if (customers.length > 0) {
        console.log(`[firebaseService] First customer from Firestore:`, {
          id: customers[0].id,
          name: customers[0].name,
          phone: customers[0].phone
        });
      }
      
      saveToCache(storeId, 'customers', customers);
      console.log(`[firebaseService] Saved ${customers.length} customers to cache for store: ${storeId}`);
      return customers;
    } catch (error) {
      console.error(`[firebaseService] Error fetching customers for store ${storeId}:`, error);
      console.error(`[firebaseService] Error details:`, error.message, error.code);
      throw error;
    }
  },

  async saveCustomer(storeId: string, customer: Customer): Promise<void> {
    const customerRef = doc(getCustomersCollection(storeId), customer.id);
    const customerData = sanitizeData(customer);
    
    await setDoc(customerRef, customerData);
    
    const cached = getFromCache<Customer>(storeId, 'customers') || [];
    const updatedCache = cached.filter(c => c.id !== customer.id);
    saveToCache(storeId, 'customers', [...updatedCache, customer]);
  },

  // Invoices
  async getInvoices(storeId: string): Promise<Invoice[]> {
    const cached = getFromCache<Invoice>(storeId, 'invoices');
    if (cached) {
      return cached;
    }
    
    const invoicesCollection = getInvoicesCollection(storeId);
    const querySnapshot = await getDocs(invoicesCollection);
    const invoices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    
    // Sort by date descending (newest first)
    invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    saveToCache(storeId, 'invoices', invoices);
    return invoices;
  },

  async saveInvoice(storeId: string, invoice: Invoice): Promise<void> {
    const invoiceRef = doc(getInvoicesCollection(storeId), invoice.id);
    const invoiceData = sanitizeData(invoice);
    
    await setDoc(invoiceRef, invoiceData);
    
    const cached = getFromCache<Invoice>(storeId, 'invoices') || [];
    const updatedCache = cached.filter(i => i.id !== invoice.id);
    saveToCache(storeId, 'invoices', [...updatedCache, invoice]);
  },

  /**
   * Save invoice and update product stock
   * This ensures stock is automatically deducted when invoices are created
   * Added safety check to prevent duplicate stock deduction
   * Now respects stockManagementEnabled setting
   * OPTIMIZED: Uses batch writes and parallel reads for maximum performance
   */
  async saveInvoiceWithStockUpdate(storeId: string, invoice: Invoice): Promise<void> {
    try {
      console.log(`[firebaseService] OPTIMIZED: Saving invoice ${invoice.id} with stock update`);
      
      // Check if invoice already exists (to prevent duplicate stock deduction)
      const invoiceRef = doc(getInvoicesCollection(storeId), invoice.id);
      const existingInvoiceDoc = await getDoc(invoiceRef);
      
      if (existingInvoiceDoc.exists()) {
        console.log(`[firebaseService] Invoice ${invoice.id} already exists, skipping stock update`);
        // Just update the invoice without touching stock
        await this.saveInvoice(storeId, invoice);
        return;
      }
      
      // Get business settings to check if stock management is enabled
      const settingsRef = getSettingsDoc(storeId);
      const settingsDoc = await getDoc(settingsRef);
      const stockManagementEnabled = settingsDoc.exists() 
        ? (settingsDoc.data() as BusinessSettings).stockManagementEnabled !== false // Default to true if undefined
        : true; // Default to true if settings don't exist
      
      console.log(`[firebaseService] Stock management enabled: ${stockManagementEnabled}`);
      
      if (stockManagementEnabled) {
        // OPTIMIZATION: Read all product stocks in parallel
        console.log(`[firebaseService] Reading ${invoice.items.length} product stocks in parallel...`);
        const productReadPromises = invoice.items.map(item => 
          getDoc(doc(getProductsCollection(storeId), item.id))
        );
        
        const productDocs = await Promise.all(productReadPromises);
        console.log(`[firebaseService] All product stocks read successfully`);
        
        // Validate all stocks in memory
        for (let i = 0; i < invoice.items.length; i++) {
          const item = invoice.items[i];
          const productDoc = productDocs[i];
          
          if (productDoc.exists()) {
            const product = productDoc.data() as Product;
            if (product.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${item.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
            }
          }
        }
        
        // OPTIMIZATION: Create batch write for all updates
        console.log(`[firebaseService] Creating batch write for ${invoice.items.length} products + invoice`);
        const batch = writeBatch(db);
        
        // Add all product stock updates to batch
        for (let i = 0; i < invoice.items.length; i++) {
          const item = invoice.items[i];
          const productDoc = productDocs[i];
          
          if (productDoc.exists()) {
            const product = productDoc.data() as Product;
            const newStock = product.stock - item.quantity;
            const productRef = doc(getProductsCollection(storeId), item.id);
            
            batch.update(productRef, {
              stock: newStock,
              updatedAt: new Date().toISOString()
            });
            
            console.log(`[firebaseService] Batch update for ${item.name}: ${product.stock} → ${newStock}`);
            
            // Update cache
            const cached = getFromCache<Product>(storeId, 'products') || [];
            const updatedCache = cached.map(p => 
              p.id === item.id ? { ...p, stock: newStock } : p
            );
            saveToCache(storeId, 'products', updatedCache);
          }
        }
        
        // Add invoice save to batch
        const invoiceData = sanitizeData(invoice);
        batch.set(invoiceRef, invoiceData);
        
        // OPTIMIZATION: Single network call for all writes with retry logic
        console.log(`[firebaseService] Committing batch (${invoice.items.length + 1} operations)...`);
        
        // Retry logic with exponential backoff
        const maxRetries = 3;
        let lastError: any = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await batch.commit();
            console.log(`[firebaseService] Batch committed successfully (attempt ${attempt}/${maxRetries})`);
            lastError = null;
            break;
          } catch (error: any) {
            lastError = error;
            console.warn(`[firebaseService] Batch commit failed (attempt ${attempt}/${maxRetries}):`, error.message);
            
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const delayMs = Math.pow(2, attempt - 1) * 1000;
              console.log(`[firebaseService] Retrying in ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }
        
        if (lastError) {
          console.error(`[firebaseService] Batch commit failed after ${maxRetries} attempts:`, lastError);
          throw lastError;
        }
        
        console.log(`[firebaseService] Batch committed successfully`);
        
      } else {
        console.log(`[firebaseService] Stock management disabled, skipping stock validation and updates`);
        
        // Still use batch write for invoice save (even without stock updates)
        const batch = writeBatch(db);
        const invoiceData = sanitizeData(invoice);
        batch.set(invoiceRef, invoiceData);
        await batch.commit();
      }
      
      // Update invoice cache
      const cachedInvoices = getFromCache<Invoice>(storeId, 'invoices') || [];
      const updatedInvoiceCache = cachedInvoices.filter(i => i.id !== invoice.id);
      saveToCache(storeId, 'invoices', [...updatedInvoiceCache, invoice]);
      
      console.log(`[firebaseService] Invoice ${invoice.id} saved successfully ${stockManagementEnabled ? 'with optimized stock updates' : 'without stock updates (stock management disabled)'}`);
    } catch (error) {
      console.error(`[firebaseService] Error saving invoice with stock update:`, error);
      throw error;
    }
  },

  /**
   * ENTERPRISE INVOICE NUMBERING SYSTEM
   * Format: INV-25122025-001 (DDMMYYYY-3 digits)
   * Daily counter resets each day
   * Guaranteed uniqueness with atomic operations
   */
  async getNextInvoiceNumber(storeId: string): Promise<string> {
    console.log(`[firebaseService] ENTERPRISE getNextInvoiceNumber called for store: ${storeId}`);
    
    try {
      // Get current date in DDMMYYYY format
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString();
      const dateKey = `${day}${month}${year}`; // DDMMYYYY
      const dateForDoc = now.toISOString().split('T')[0]; // YYYY-MM-DD for Firestore
      
      console.log(`[firebaseService] Date key: ${dateKey}, Firestore date: ${dateForDoc}`);
      
      // Get or create daily counter
      const counterRef = getDailyCounterDoc(storeId, dateForDoc);
      
      try {
        // Try to get existing counter
        const counterDoc = await getDoc(counterRef);
        let currentNumber = 0;
        
        if (counterDoc.exists()) {
          const counterData = counterDoc.data();
          currentNumber = counterData.lastNumber || 0;
          console.log(`[firebaseService] Existing counter found: ${currentNumber}`);
        } else {
          console.log(`[firebaseService] No counter for today, starting from 0`);
        }
        
        // Calculate next number
        const nextNumber = currentNumber + 1;
        console.log(`[firebaseService] Next invoice number for today: ${nextNumber}`);
        
        // Update counter with merge (preserves other fields if any)
        await setDoc(counterRef, {
          lastNumber: nextNumber,
          date: dateForDoc,
          dateKey: dateKey,
          updatedAt: new Date().toISOString(),
          storeId: storeId
        }, { merge: true });
        
        console.log(`[firebaseService] Daily counter updated to: ${nextNumber}`);
        
        // Format: INV-25122025-001
        const formattedNumber = nextNumber.toString().padStart(3, '0');
        const invoiceId = `INV-${dateKey}-${formattedNumber}`;
        
        console.log(`[firebaseService] Generated ENTERPRISE invoice ID: ${invoiceId}`);
        return invoiceId;
        
      } catch (counterError: any) {
        console.error(`[firebaseService] Error with daily counter:`, counterError);
        
        // Fallback 1: Try to use existing invoices for today
        try {
          console.log(`[firebaseService] Falling back to invoice scan for today`);
          
          const invoices = await this.getInvoices(storeId);
          let highestToday = 0;
          const todayPrefix = `INV-${dateKey}-`;
          
          invoices.forEach(invoice => {
            if (invoice.id.startsWith(todayPrefix)) {
              const match = invoice.id.match(new RegExp(`${todayPrefix}(\\d+)`));
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > highestToday) {
                  highestToday = num;
                }
              }
            }
          });
          
          const nextNumber = highestToday + 1;
          const formattedNumber = nextNumber.toString().padStart(3, '0');
          const invoiceId = `INV-${dateKey}-${formattedNumber}`;
          
          console.log(`[firebaseService] Generated fallback invoice ID: ${invoiceId}`);
          return invoiceId;
          
        } catch (scanError: any) {
          console.error(`[firebaseService] Error scanning invoices:`, scanError);
          
          // Fallback 2: Timestamp-based unique ID
          const timestamp = Date.now();
          const timestampStr = timestamp.toString().slice(-8);
          const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const fallbackId = `INV-${dateKey}-${timestampStr}-${randomPart}`;
          
          console.log(`[firebaseService] Generated timestamp fallback ID: ${fallbackId}`);
          return fallbackId;
        }
      }
      
    } catch (error: any) {
      console.error('[firebaseService] CRITICAL ERROR in enterprise invoice numbering:', error);
      
      // Ultimate fallback: Simple timestamp
      const timestamp = Date.now();
      const fallbackId = `INV-EMG-${timestamp}`;
      console.log(`[firebaseService] Using emergency fallback ID: ${fallbackId}`);
      return fallbackId;
    }
  },

  /**
   * ENTERPRISE: Get today's counter value
   */
  async getTodayInvoiceCounter(storeId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const counterRef = getDailyCounterDoc(storeId, today);
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists()) {
        const counterData = counterDoc.data();
        return counterData.lastNumber || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting today\'s counter:', error);
      return 0;
    }
  },

  /**
   * ENTERPRISE: Fix today's counter by scanning existing invoices
   */
  async fixTodayInvoiceCounter(storeId: string): Promise<number> {
    try {
      console.log(`[firebaseService] Fixing today's invoice counter for store: ${storeId}`);
      
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear().toString();
      const dateKey = `${day}${month}${year}`;
      const dateForDoc = today.toISOString().split('T')[0];
      
      const invoices = await this.getInvoices(storeId);
      let highestToday = 0;
      const todayPrefix = `INV-${dateKey}-`;
      
      // Find highest invoice number for today
      invoices.forEach(invoice => {
        if (invoice.id.startsWith(todayPrefix)) {
          const match = invoice.id.match(new RegExp(`${todayPrefix}(\\d+)`));
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > highestToday) {
              highestToday = num;
            }
          }
        }
      });
      
      console.log(`[firebaseService] Highest invoice number for today (${dateKey}): ${highestToday}`);
      
      // Update today's counter
      const counterRef = getDailyCounterDoc(storeId, dateForDoc);
      await setDoc(counterRef, {
        lastNumber: highestToday,
        date: dateForDoc,
        dateKey: dateKey,
        updatedAt: new Date().toISOString(),
        storeId: storeId,
        fixedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[firebaseService] Today's counter fixed to: ${highestToday}`);
      return highestToday;
      
    } catch (error) {
      console.error('Error fixing today\'s counter:', error);
      return 0;
    }
  },

  /**
   * ENTERPRISE: Get counter for a specific date
   */
  async getDateInvoiceCounter(storeId: string, date: string): Promise<number> {
    try {
      const counterRef = getDailyCounterDoc(storeId, date);
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists()) {
        const counterData = counterDoc.data();
        return counterData.lastNumber || 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error getting counter for date ${date}:`, error);
      return 0;
    }
  },

  /**
   * ENTERPRISE: Get all daily counters (for admin reports)
   */
  async getAllDailyCounters(storeId: string): Promise<Array<{date: string, lastNumber: number, dateKey: string}>> {
    try {
      const countersCollection = getDailyCountersCollection(storeId);
      const querySnapshot = await getDocs(countersCollection);
      
      const counters = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: doc.id,
          lastNumber: data.lastNumber || 0,
          dateKey: data.dateKey || doc.id
        };
      });
      
      // Sort by date descending (newest first)
      return counters.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting all daily counters:', error);
      return [];
    }
  },

  /**
   * ENTERPRISE: Reset counter for a specific date (admin only)
   */
  async resetDateCounter(storeId: string, date: string, startNumber: number = 0): Promise<void> {
    try {
      const counterRef = getDailyCounterDoc(storeId, date);
      
      // Parse date to get dateKey
      const dateObj = new Date(date);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear().toString();
      const dateKey = `${day}${month}${year}`;
      
      await setDoc(counterRef, {
        lastNumber: startNumber,
        date: date,
        dateKey: dateKey,
        updatedAt: new Date().toISOString(),
        storeId: storeId,
        resetAt: new Date().toISOString(),
        resetBy: auth.currentUser?.uid || 'system'
      }, { merge: true });
      
      console.log(`Counter for ${date} reset to ${startNumber}`);
    } catch (error) {
      console.error(`Error resetting counter for date ${date}:`, error);
      throw error;
    }
  },

  /**
   * Get current invoice counter value (legacy - for backward compatibility)
   */
  async getCurrentInvoiceNumber(storeId: string): Promise<number> {
    try {
      const settingsRef = getSettingsDoc(storeId);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as BusinessSettings & { lastInvoiceNumber?: number };
        return settings.lastInvoiceNumber || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting current invoice number:', error);
      return 0;
    }
  },

  // Employees
  async getEmployees(storeId: string): Promise<Employee[]> {
    const cached = getFromCache<Employee>(storeId, 'employees');
    if (cached) {
      return cached;
    }
    
    const employeesCollection = getEmployeesCollection(storeId);
    const querySnapshot = await getDocs(employeesCollection);
    const employees = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    
    saveToCache(storeId, 'employees', employees);
    return employees;
  },

  async saveEmployee(storeId: string, employee: Employee): Promise<void> {
    const employeeRef = doc(getEmployeesCollection(storeId), employee.id);
    const employeeData = sanitizeData(employee);
    
    await setDoc(employeeRef, employeeData);
    
    const cached = getFromCache<Employee>(storeId, 'employees') || [];
    const updatedCache = cached.filter(e => e.id !== employee.id);
    saveToCache(storeId, 'employees', [...updatedCache, employee]);
  },

  // Attendance
  async getAttendance(storeId: string): Promise<AttendanceRecord[]> {
    const cached = getFromCache<AttendanceRecord>(storeId, 'attendance');
    if (cached) {
      return cached;
    }
    
    const attendanceCollection = getAttendanceCollection(storeId);
    const querySnapshot = await getDocs(attendanceCollection);
    const attendance = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    
    saveToCache(storeId, 'attendance', attendance);
    return attendance;
  },

  async saveAttendance(storeId: string, record: AttendanceRecord): Promise<void> {
    const attendanceRef = doc(getAttendanceCollection(storeId), record.id);
    const attendanceData = sanitizeData(record);
    
    await setDoc(attendanceRef, attendanceData);
    
    const cached = getFromCache<AttendanceRecord>(storeId, 'attendance') || [];
    const updatedCache = cached.filter(r => r.id !== record.id);
    saveToCache(storeId, 'attendance', [...updatedCache, record]);
  },

  // Salaries
  async getSalaries(storeId: string): Promise<SalaryRecord[]> {
    const cached = getFromCache<SalaryRecord>(storeId, 'salaries');
    if (cached) {
      return cached;
    }
    
    const salariesCollection = getSalariesCollection(storeId);
    const querySnapshot = await getDocs(salariesCollection);
    const salaries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord));
    
    saveToCache(storeId, 'salaries', salaries);
    return salaries;
  },

  async saveSalary(storeId: string, record: SalaryRecord): Promise<void> {
    const salaryRef = doc(getSalariesCollection(storeId), record.id);
    const salaryData = sanitizeData(record);
    
    await setDoc(salaryRef, salaryData);
    
    const cached = getFromCache<SalaryRecord>(storeId, 'salaries') || [];
    const updatedCache = cached.filter(r => r.id !== record.id);
    saveToCache(storeId, 'salaries', [...updatedCache, record]);
  },

  // Categories
  async getCategories(storeId: string): Promise<Category[]> {
    console.log(`[firebaseService] getCategories called for store: ${storeId}`);
    const cached = getFromCache<Category>(storeId, 'categories');
    if (cached) {
      console.log(`[firebaseService] Returning ${cached.length} categories from cache for store: ${storeId}`);
      return cached;
    }
    
    console.log(`[firebaseService] Cache miss, fetching categories from Firestore for store: ${storeId}`);
    try {
      const categoriesCollection = getCategoriesCollection(storeId);
      console.log(`[firebaseService] Categories collection path: stores/${storeId}/categories`);
      const querySnapshot = await getDocs(categoriesCollection);
      console.log(`[firebaseService] Firestore query successful, got ${querySnapshot.docs.length} categories`);
      const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      
      saveToCache(storeId, 'categories', categories);
      console.log(`[firebaseService] Saved ${categories.length} categories to cache for store: ${storeId}`);
      return categories;
    } catch (error) {
      console.error(`[firebaseService] Error fetching categories for store ${storeId}:`, error);
      console.error(`[firebaseService] Error details:`, error.message, error.code);
      throw error;
    }
  },

  async saveCategory(storeId: string, category: Category): Promise<void> {
    const categoryRef = doc(getCategoriesCollection(storeId), category.id);
    const categoryData = sanitizeData(category);
    
    await setDoc(categoryRef, categoryData);
    
    // Update cache
    const cached = getFromCache<Category>(storeId, 'categories') || [];
    const updatedCache = cached.filter(c => c.id !== category.id);
    saveToCache(storeId, 'categories', [...updatedCache, category]);
  },

  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    await deleteDoc(doc(getCategoriesCollection(storeId), categoryId));
    
    // Update cache
    const cached = getFromCache<Category>(storeId, 'categories') || [];
    const updatedCache = cached.filter(c => c.id !== categoryId);
    saveToCache(storeId, 'categories', updatedCache);
  },

  // Real-time subscription for categories
  subscribeToCategories(storeId: string, callback: (categories: Category[]) => void): () => void {
    const categoriesCollection = getCategoriesCollection(storeId);
    
    const unsubscribe = onSnapshot(categoriesCollection, (snapshot) => {
      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      saveToCache(storeId, 'categories', categories);
      callback(categories);
    }, (error: FirestoreError) => {
      console.error('Categories subscription error:', error);
    });
    
    return unsubscribe;
  },

  // Business Settings
  async getBusinessSettings(storeId: string): Promise<Partial<BusinessSettings>> {
    const settingsDoc = await getDoc(getSettingsDoc(storeId));
    
    if (settingsDoc.exists()) {
      return settingsDoc.data() as BusinessSettings;
    }
    
    // Return empty object if no settings found - let the app use its defaults
    return {};
  },

  async saveBusinessSettings(storeId: string, settings: BusinessSettings): Promise<void> {
    const settingsData = sanitizeData(settings);
    // Use merge: true to preserve existing fields when updating
    await setDoc(getSettingsDoc(storeId), settingsData, { merge: true });
  },

  // Clear cache for a store
  clearCache(storeId: string): void {
    const collections = [
      'products',
      'customers',
      'invoices',
      'employees',
      'attendance',
      'salaries'
    ];
    
    collections.forEach(collectionName => {
      localStorage.removeItem(getCacheKey(storeId, collectionName));
      localStorage.removeItem(getCacheTimestampKey(storeId, collectionName));
    });
  },

  // Store Users Management
  async getStoreUsers(storeId: string): Promise<StoreUser[]> {
    try {
      const storeUsersCollection = getStoreUsersCollection(storeId);
      const querySnapshot = await getDocs(storeUsersCollection);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreUser));
    } catch (error) {
      console.error('Error getting store users:', error);
      return [];
    }
  },

  async addStoreUser(storeId: string, userId: string, name: string, email: string, role: UserRole, addedBy: string): Promise<void> {
    try {
      const storeUserRef = doc(getStoreUsersCollection(storeId), userId);
      const storeUser: StoreUser = {
        id: userId,
        name,
        email,
        storeId,
        role,
        addedBy,
        addedAt: new Date().toISOString(),
        isEmailVerified: false // Will be updated when user verifies email
      };
      
      await setDoc(storeUserRef, storeUser);
      
      // Also update the store document to include this user in an array for easy querying
      const storeRef = getStoreDoc(storeId);
      const storeDoc = await getDoc(storeRef);
      if (storeDoc.exists()) {
        const storeData = storeDoc.data();
        const storeUsers = storeData.storeUsers || [];
        if (!storeUsers.includes(userId)) {
          await updateDoc(storeRef, {
            storeUsers: [...storeUsers, userId]
          });
        }
      }
    } catch (error) {
      console.error('Error adding store user:', error);
      throw error;
    }
  },

  async updateStoreUserRole(storeId: string, userId: string, role: UserRole): Promise<void> {
    try {
      const storeUserRef = doc(getStoreUsersCollection(storeId), userId);
      await updateDoc(storeUserRef, { role });
    } catch (error) {
      console.error('Error updating store user role:', error);
      throw error;
    }
  },

  async updateStoreUser(storeId: string, userId: string, updates: { name?: string; email?: string; role?: UserRole }): Promise<void> {
    try {
      const storeUserRef = doc(getStoreUsersCollection(storeId), userId);
      await updateDoc(storeUserRef, updates);
    } catch (error) {
      console.error('Error updating store user:', error);
      throw error;
    }
  },

  async removeStoreUser(storeId: string, userId: string): Promise<void> {
    try {
      // Remove from storeUsers collection
      await deleteDoc(doc(getStoreUsersCollection(storeId), userId));
      
      // Remove from store document array
      const storeRef = getStoreDoc(storeId);
      const storeDoc = await getDoc(storeRef);
      if (storeDoc.exists()) {
        const storeData = storeDoc.data();
        const storeUsers = storeData.storeUsers || [];
        const updatedStoreUsers = storeUsers.filter((id: string) => id !== userId);
        await updateDoc(storeRef, {
          storeUsers: updatedStoreUsers
        });
      }
    } catch (error) {
      console.error('Error removing store user:', error);
      throw error;
    }
  },

  async getStoreUser(storeId: string, userId: string): Promise<StoreUser | null> {
    try {
      const storeUserDoc = await getDoc(doc(getStoreUsersCollection(storeId), userId));
      if (storeUserDoc.exists()) {
        return storeUserDoc.data() as StoreUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting store user:', error);
      return null;
    }
  },

  async getCurrentStoreUser(storeId: string): Promise<StoreUser | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No authenticated user found');
        return null;
      }
      
      // Try to get by user ID first
      const storeUser = await this.getStoreUser(storeId, currentUser.uid);
      if (storeUser) {
        return storeUser;
      }
      
      // If not found by ID, try to find by email
      const storeUsersCollection = getStoreUsersCollection(storeId);
      const emailQuery = query(storeUsersCollection, where('email', '==', currentUser.email));
      const querySnapshot = await getDocs(emailQuery);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as StoreUser;
      }
      
      console.log(`No store user found for current user (ID: ${currentUser.uid}, Email: ${currentUser.email}) in store ${storeId}`);
      return null;
    } catch (error) {
      console.error('Error getting current store user:', error);
      return null;
    }
  },

  // Image upload functions
  async uploadProductImage(storeId: string, productId: string, file: File): Promise<string> {
    try {
      // Create a compressed version of the image
      const compressedFile = await this.compressImage(file);
      
      // Create storage path: stores/{storeId}/products/{productId}/image.{ext}
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `image.${fileExtension}`;
      const storagePath = `stores/${storeId}/products/${productId}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      // Upload the compressed file
      await uploadBytes(storageRef, compressedFile);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading product image:', error);
      throw error;
    }
  },

  // Invoice PDF upload functions
  async uploadInvoicePDF(storeId: string, invoiceId: string, pdfBlob: Blob): Promise<string> {
    try {
      // Create storage path: stores/{storeId}/invoices/{invoiceId}.pdf
      const storagePath = `stores/${storeId}/invoices/${invoiceId}.pdf`;
      const storageRef = ref(storage, storagePath);
      
      // Upload PDF
      await uploadBytes(storageRef, pdfBlob, {
        contentType: 'application/pdf',
        customMetadata: {
          invoiceId,
          storeId,
          uploadedAt: new Date().toISOString()
        }
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading invoice PDF:', error);
      throw error;
    }
  },

  /**
   * Save invoice with PDF upload to Firebase Storage
   * This creates a shareable link for the invoice PDF
   */
  async saveInvoiceWithPDF(storeId: string, invoice: Invoice, pdfBlob: Blob): Promise<Invoice> {
    try {
      console.log(`[firebaseService] Saving invoice ${invoice.id} with PDF upload`);
      
      // Upload PDF to Firebase Storage
      const pdfUrl = await this.uploadInvoicePDF(storeId, invoice.id, pdfBlob);
      console.log(`[firebaseService] PDF uploaded successfully, URL: ${pdfUrl}`);
      
      // Update invoice with PDF URL
      const invoiceWithPdf = {
        ...invoice,
        pdfUrl
      };
      
      // Save invoice to Firestore
      await this.saveInvoice(storeId, invoiceWithPdf);
      console.log(`[firebaseService] Invoice saved with PDF URL`);
      
      return invoiceWithPdf;
    } catch (error) {
      console.error(`[firebaseService] Error saving invoice with PDF:`, error);
      throw error;
    }
  },

  /**
   * Save invoice with PDF upload and stock update
   * Combines PDF upload with stock management
   */
  async saveInvoiceWithPDFAndStockUpdate(storeId: string, invoice: Invoice, pdfBlob: Blob): Promise<Invoice> {
    try {
      console.log(`[firebaseService] Saving invoice ${invoice.id} with PDF upload and stock update`);
      
      // First, upload PDF to Firebase Storage
      const pdfUrl = await this.uploadInvoicePDF(storeId, invoice.id, pdfBlob);
      console.log(`[firebaseService] PDF uploaded successfully, URL: ${pdfUrl}`);
      
      // Update invoice with PDF URL
      const invoiceWithPdf = {
        ...invoice,
        pdfUrl
      };
      
      // Save invoice with stock update (this will handle stock deduction)
      await this.saveInvoiceWithStockUpdate(storeId, invoiceWithPdf);
      console.log(`[firebaseService] Invoice saved with PDF URL and stock update`);
      
      return invoiceWithPdf;
    } catch (error) {
      console.error(`[firebaseService] Error saving invoice with PDF and stock update:`, error);
      throw error;
    }
  },

  async deleteProductImage(storeId: string, productId: string): Promise<void> {
    try {
      // Try to delete any image file for this product
      const storagePath = `stores/${storeId}/products/${productId}/image`;
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error: any) {
      // If file doesn't exist, that's okay
      if (error.code !== 'storage/object-not-found') {
        console.error('Error deleting product image:', error);
        throw error;
      }
    }
  },

  // Helper function to compress images
  async compressImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Draw image with new dimensions
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with specified quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Could not create blob from canvas'));
                return;
              }
              
              // Create new file with compressed image
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
    });
  }
};

// Migration helper (kept for compatibility, but not needed for new structure)
export const migrationService = {
  async migrateStoreToFirebase(storeId: string, storeData: StoreAccount): Promise<void> {
    // This is now a no-op since we're using the new structure directly
    console.log('Migration not needed for new subcollection structure');
  }
};
