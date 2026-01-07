import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  ShoppingCart, 
  History, 
  X, 
  CreditCard, 
  ArrowLeft, 
  Printer, 
  PackageCheck, 
  Edit, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  Link,
  Share2,
  Check,
  Barcode
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import InvoicePreview from './InvoicePreview';
import { Product, Customer, Invoice, CartItem, BusinessSettings, UserRole, Category } from '../../types';
import { dataService } from '../../services/firebaseService';
import { PDFService } from '../../services/pdfService';
import { CurrencyService } from '../../services/currencyService';

const PRODUCTS_PER_PAGE = 40;

export const POSView = ({ 
  products, 
  customers, 
  setCustomers,
  invoices,
  setInvoices,
  t, 
  onAddInvoice,
  business,
  userRole,
  userName,
  storeId
}: { 
  products: Product[], 
  customers: Customer[], 
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  invoices: Invoice[],
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  t: (k: string) => string, 
  onAddInvoice: (i: Invoice) => void,
  business: BusinessSettings,
  userRole: UserRole,
  userName: string,
  storeId: string
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('walk-in');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Checkout States
  const [showConfirm, setShowConfirm] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>(''); 
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Pay Later'>('Cash');

  // Quick Add Customer State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustNID, setNewCustNID] = useState('');
  const [newCustSSN, setNewCustSSN] = useState('');
  const [newCustCard, setNewCustCard] = useState('');

  // Customer Search State
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Invoice Search State
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [searchAllHistory, setSearchAllHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deliveryPayment, setDeliveryPayment] = useState(0);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // Discount type state (percentage or value)
  const [discountType, setDiscountType] = useState<'value' | 'percentage'>('value');

  // Barcode Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 1,
    unit: 'pc',
    vat: 0,
    type: 'product',
    category: ''
  });
  const [barcodeError, setBarcodeError] = useState('');

  // Price adjustment state
  const [priceAdjustmentModal, setPriceAdjustmentModal] = useState<{
    show: boolean;
    item: CartItem | null;
    newPrice: number;
    reason: string;
  }>({
    show: false,
    item: null,
    newPrice: 0,
    reason: ''
  });

  // Stock Deduction Notification State - MOVED TO TOP to fix React hook order
  const [stockDeductionNotification, setStockDeductionNotification] = useState<{
    show: boolean;
    message: string;
    invoiceId: string;
    details: Array<{productName: string, oldStock: number, newStock: number, quantity: number, unit: string}>;
  }>({
    show: false,
    message: '',
    invoiceId: '',
    details: []
  });

  // Auto-hide stock deduction notification after 5 seconds
  useEffect(() => {
    if (stockDeductionNotification.show) {
      const timer = setTimeout(() => {
        setStockDeductionNotification(prev => ({...prev, show: false}));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [stockDeductionNotification.show]);

  // Debug: Log products and categories
  useEffect(() => {
    console.log(`[POSView] Products prop received: ${products.length} products`);
    console.log(`[POSView] Categories state: ${categories.length} categories`);
    console.log(`[POSView] User role: ${userRole}, Store ID: ${storeId}`);
    console.log(`[POSView] Selected category: ${selectedCategory}`);
    console.log(`[POSView] Stock Management Enabled: ${business.stockManagementEnabled !== false}`);
    console.log(`[POSView] Stock Management Status: ${business.stockManagementEnabled !== false ? 'ENABLED (stock will be deducted)' : 'DISABLED (no stock deduction)'}`);
    
    if (products.length > 0) {
      console.log('[POSView] First product sample:', {
        id: products[0].id,
        name: products[0].name,
        category: products[0].category,
        price: products[0].price,
        stock: products[0].stock,
        unit: products[0].unit
      });
    }
    
    if (categories.length > 0) {
      console.log('[POSView] First category sample:', {
        id: categories[0].id,
        name: categories[0].name
      });
    }
  }, [products, categories, userRole, storeId, selectedCategory, business.stockManagementEnabled]);

  // Filter Products
  // Helper function to get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Debug filtered products
  useEffect(() => {
    console.log(`[POSView] Filtered products: ${filteredProducts.length} products`);
    console.log(`[POSView] Total products: ${products.length} products`);
    console.log(`[POSView] Search term: "${search}"`);
  }, [filteredProducts, products, search]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        console.log(`[POSView] Loading categories for store: ${storeId}, userRole: ${userRole}`);
        const categoriesData = await dataService.getCategories(storeId);
        console.log(`[POSView] Categories loaded: ${categoriesData.length} categories`);
        setCategories(categoriesData);
      } catch (error) {
        console.error('[POSView] Error loading categories:', error);
      }
    };

    loadCategories();

    // Subscribe to real-time updates
    const unsubscribe = dataService.subscribeToCategories(storeId, (newCategories) => {
      console.log(`[POSView] Categories subscription update: ${newCategories.length} categories`);
      setCategories(newCategories);
    });

    return () => unsubscribe();
  }, [storeId]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search]);

  const addToCart = (product: Product) => {
    // Check stock only if stock management is enabled (default to true if undefined)
    const stockEnabled = business.stockManagementEnabled !== false;
    
    if (stockEnabled) {
      // Check if product is out of stock
      if (product.stock <= 0) {
        alert(`"${product.name}" is out of stock (Stock: 0). Please add stock before selling.`);
        return;
      }
      
      // Check if adding this would exceed available stock
      const existingInCart = cart.find(item => item.id === product.id);
      const totalInCart = existingInCart ? existingInCart.quantity : 0;
      
      if (totalInCart + 1 > product.stock) {
        alert(`Cannot add more "${product.name}". Available stock: ${product.stock}, Already in cart: ${totalInCart}`);
        return;
      }
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      // Initialize new cart item with price adjustment fields
      return [...prev, { 
        ...product, 
        quantity: 1,
        originalPrice: product.price,
        salePrice: product.price,
        priceAdjusted: false
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };
  
  const setCartQuantity = (id: string, val: number) => {
    const qty = Math.max(1, val);
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Barcode scanning function
  const handleBarcodeScan = async (barcodeValue?: string) => {
    const barcode = barcodeValue?.trim() || search.trim();
    if (!barcode) return;
    
    setIsScanning(true);
    
    try {
      // Find product by barcode
      const product = products.find(p => p.barcode === barcode);
      
      if (product) {
        // Product found, add to cart
        addToCart(product);
        setSearch('');
        setIsScanning(false);
      } else {
        // Product not found, show add product modal
        setScannedBarcode(barcode);
        setNewProductForm({
          name: '',
          barcode: barcode,
          price: 0,
          stock: 1,
          unit: 'pc',
          vat: 0,
          type: 'product',
          category: categories.length > 0 ? categories[0].id : ''
        });
        setShowAddProductModal(true);
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      alert('Error scanning barcode. Please try again.');
      setIsScanning(false);
    }
  };

  // Handle adding new product from barcode scan
  const handleAddNewProduct = async () => {
    if (!newProductForm.name || !newProductForm.price) {
      alert('Please enter product name and price');
      return;
    }

    try {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const productId = `product_${timestamp}_${randomSuffix}`;
      
      const product: Product = {
        id: productId,
        name: newProductForm.name || 'New Product',
        barcode: scannedBarcode,
        category: newProductForm.category || (categories.length > 0 ? categories[0].id : 'General'),
        price: Number(newProductForm.price) || 0,
        purchasePrice: newProductForm.purchasePrice !== undefined ? Number(newProductForm.purchasePrice) : undefined,
        vat: Number(newProductForm.vat) || 0,
        stock: Number(newProductForm.stock) || 1,
        unit: newProductForm.unit || 'pc',
        type: 'product',
        image: newProductForm.image || null
      };

      // Save product with barcode
      await dataService.saveProductWithBarcode(storeId, product, userName, userRole);
      
      // Add to cart
      addToCart(product);
      
      // Close modal and reset
      setShowAddProductModal(false);
      setScannedBarcode('');
      setNewProductForm({
        name: '',
        price: 0,
        stock: 1,
        unit: 'pc',
        vat: 0,
        type: 'product',
        category: ''
      });
      setBarcodeError('');
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      // Handle barcode uniqueness error
      if (error.message && error.message.includes('Barcode')) {
        setBarcodeError(error.message);
      } else {
        alert('Error saving product. Please try again.');
      }
    }
  };

  // Price adjustment functions
  const handlePriceAdjustment = (item: CartItem) => {
    setPriceAdjustmentModal({
      show: true,
      item,
      newPrice: item.salePrice,
      reason: item.adjustmentReason || ''
    });
  };

  const savePriceAdjustment = () => {
    if (!priceAdjustmentModal.item) return;
    
    const { item, newPrice, reason } = priceAdjustmentModal;
    
    // Validate new price
    if (newPrice <= 0) {
      alert('Price must be greater than 0');
      return;
    }
    
    setCart(prev => prev.map(cartItem => {
      if (cartItem.id === item.id) {
        const updatedItem: any = {
          ...cartItem,
          salePrice: newPrice,
          priceAdjusted: newPrice !== cartItem.originalPrice,
          adjustedBy: userName,
          adjustmentTimestamp: new Date().toISOString()
        };
        
        // Only include adjustmentReason if it has a value
        if (reason && reason.trim()) {
          updatedItem.adjustmentReason = reason;
        } else {
          // Remove the field if it exists
          delete updatedItem.adjustmentReason;
        }
        
        return updatedItem;
      }
      return cartItem;
    }));
    
    setPriceAdjustmentModal({
      show: false,
      item: null,
      newPrice: 0,
      reason: ''
    });
  };

  const resetPriceAdjustment = (id: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem: any = {
          ...item,
          salePrice: item.originalPrice,
          priceAdjusted: false
        };
        
        // Remove adjustment fields
        delete updatedItem.adjustmentReason;
        delete updatedItem.adjustedBy;
        delete updatedItem.adjustmentTimestamp;
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculations with proper rounding to avoid floating point issues
  const numericPaidAmount = parseFloat(paidAmount) || 0;
  
  // Helper function for precise currency calculations
  const roundCurrency = (value: number): number => {
    return Math.round(value * 100) / 100;
  };
  
  // Use salePrice for calculations (which may be adjusted)
  const subtotal = roundCurrency(cart.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0));
  const totalVat = roundCurrency(cart.reduce((sum, item) => sum + (item.salePrice * item.quantity * (item.vat / 100)), 0));
  
  // Calculate discount amount based on type
  const discountAmount = discountType === 'percentage' 
    ? roundCurrency(subtotal * discount / 100)
    : roundCurrency(discount);
  
  const grandTotal = Math.max(0, roundCurrency(subtotal + totalVat - discountAmount));
  const dueAmount = roundCurrency(grandTotal - numericPaidAmount);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Initialize checkout - DO NOT pre-fill paid amount
  const handleCheckoutOpen = () => {
    if (cart.length === 0) return;
    setDiscount(0);
    setPaidAmount(''); // Empty by default - user must enter manually
    setPaymentMode('Cash'); // Reset to default payment mode
    setShowConfirm(true);
  };

  const confirmPayment = async (event?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Prevent multiple clicks - more robust check
    if (isProcessingPayment) {
      console.log('Payment already processing, ignoring click');
      return;
    }
    
    setIsProcessingPayment(true);
    console.log('Payment processing started at:', new Date().toISOString());
    
    // Handle walk-in customer specially
    let cust;
    if (selectedCustomer === 'walk-in' || selectedCustomer.includes('_customer_walkin')) {
      // Always use the hardcoded walk-in customer, never the database one
      cust = {
        id: 'walk-in',
        name: 'Walk-in Customer',
        phone: '',
        address: '',
        totalDue: 0  // Walk-in customers never have due amounts
      };
    } else {
      cust = customers.find(c => c.id === selectedCustomer);
      if (!cust) {
        // Fallback to walk-in if customer not found
        cust = {
          id: 'walk-in',
          name: 'Walk-in Customer',
          phone: '',
          address: '',
          totalDue: 0  // Walk-in customers never have due amounts
        };
      }
    }
    
    // Double-check: Ensure walk-in customers always have totalDue = 0
    if (cust.id === 'walk-in' || cust.id.includes('_customer_walkin')) {
      cust.totalDue = 0;
    }
    
    try {
      console.log('Getting next invoice number for store:', storeId);
      // Get sequential invoice number
      const invoiceId = await dataService.getNextInvoiceNumber(storeId);
      console.log('Generated invoice ID:', invoiceId);
      
      const newInvoice: Invoice = {
        id: invoiceId,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerAddress: cust.address,
        items: [...cart],
        subtotal,
        totalVat,
        grandTotal,
        paidAmount: numericPaidAmount,
        dueAmount,
        discount: discountAmount, // Store the actual discount amount (not percentage)
        discountType: discountType, // Store discount type (percentage or value)
        discountPercentage: discountType === 'percentage' ? discount : undefined, // Store percentage if applicable
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        createdAt: new Date().toISOString(), // Exact creation timestamp
        status: 'pending',
        paymentMode: paymentMode,
        createdBy: {
          name: userName, // Use the actual user name fetched from StoreUser
          role: userRole
        }
      };
      
      // Log stock deduction details - MAKE IT MORE VISIBLE
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log('🛒 STOCK DEDUCTION LOG - INVOICE GENERATION');
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log('📄 Invoice ID:', invoiceId);
      console.log('⚙️  Stock Management Enabled:', business.stockManagementEnabled !== false);
      console.log('📦 Cart items to deduct stock from:');
      console.log('────────────────────────────────────────────────────────────────────────────────');
      
      cart.forEach(item => {
        console.log(`📦 ${item.name} (ID: ${item.id}): ${item.quantity} ${item.unit}`);
        
        // Find current product stock from products array
        const product = products.find(p => p.id === item.id);
        if (product) {
          console.log(`   📊 Current stock: ${product.stock} ${product.unit}`);
          if (business.stockManagementEnabled !== false) {
            const newStock = product.stock - item.quantity;
            console.log(`   📉 New stock after deduction: ${newStock} ${product.unit}`);
            console.log(`   🔽 Stock change: -${item.quantity} ${product.unit}`);
          } else {
            console.log(`   ⚠️  Stock management disabled - no stock deduction`);
          }
        } else {
          console.log(`   ❌ Product not found in products array`);
        }
        console.log('────────────────────────────────────────────────────────────────────────────────');
      });
      
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log('✅ END STOCK DEDUCTION LOG');
      console.log('════════════════════════════════════════════════════════════════════════════════');
      
      console.log('PDF Upload Enabled:', business.pdfUploadEnabled !== false);
      
      // OPTIMISTIC UPDATE: Show invoice immediately in UI
      const optimisticInvoice: Invoice = {
        ...newInvoice,
        pdfUrl: undefined // Will be updated if PDF upload succeeds
      };
      
      console.log('Optimistic update: showing invoice immediately in UI');
      onAddInvoice(optimisticInvoice); // UI updates INSTANTLY
      setGeneratedInvoice(optimisticInvoice);
      
      // BACKGROUND SYNC: Save to Firestore in background
      try {
        if (business.pdfUploadEnabled !== false) {
          // PDF upload is enabled (default: true)
          console.log('Background sync: Saving invoice with PDF upload:', newInvoice.id);
          
          // Save invoice with PDF upload to Firebase Storage
          const savedInvoice = await PDFService.generateUploadAndSaveInvoice(
            newInvoice,
            business,
            storeId,
            false // isReprint
          );
          
          console.log('Background sync: Invoice saved with PDF URL:', savedInvoice.pdfUrl);
          
          // Update UI with actual saved invoice (includes PDF URL)
          onAddInvoice(savedInvoice);
          setGeneratedInvoice(savedInvoice);
        } else {
          // PDF upload is disabled - save invoice without PDF
          console.log('Background sync: Saving invoice without PDF upload (fast mode):', newInvoice.id);
          
          // Save invoice with stock update only (no PDF upload)
          await dataService.saveInvoiceWithStockUpdate(storeId, newInvoice);
          
          // Create invoice object without PDF URL for local state
          const savedInvoice = {
            ...newInvoice,
            pdfUrl: undefined
          };
          
          console.log('Background sync: Invoice saved without PDF (fast mode)');
          
          // Update UI with saved invoice
          onAddInvoice(savedInvoice);
          setGeneratedInvoice(savedInvoice);
        }
        
        console.log('Background sync completed successfully');
      } catch (syncError) {
        console.error('Background sync failed:', syncError);
        // Invoice is already shown in UI (optimistic update)
        // We could show a subtle error notification here
        // But don't remove the invoice from UI - it exists locally
        alert(`Invoice created locally but sync failed: ${syncError.message}. Please check your connection.`);
      }
      
      // Show stock deduction notification
      const deductionDetails = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        return {
          productName: item.name,
          oldStock: product ? product.stock : 0,
          newStock: product ? product.stock - item.quantity : 0,
          quantity: item.quantity,
          unit: item.unit
        };
      });
      
      setStockDeductionNotification({
        show: true,
        message: `Stock deducted for invoice ${invoiceId}`,
        invoiceId: invoiceId,
        details: deductionDetails
      });
      
      // Show PDF preview instead of automatically downloading
      // Note: generatedInvoice is already set to optimisticInvoice
      // It will be updated by background sync if successful
      setShowPdfPreviewModal(true);
      setShowConfirm(false);
      setIsProcessingPayment(false);
      console.log('Payment processing completed successfully at:', new Date().toISOString());
      console.log('Invoice shown optimistically, background sync in progress');
    } catch (error) {
      console.error('Error generating invoice number:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Fallback to timestamp-based ID - but ensure unique timestamp
      const timestamp = Date.now();
      // Remove leading zeros from timestamp to avoid unnecessary zeros
      const timestampStr = timestamp.toString();
      // Take last 6 digits but remove any leading zeros
      const lastDigits = timestampStr.slice(-6);
      const timestampId = parseInt(lastDigits, 10).toString(); // Convert to number and back to string to remove leading zeros
      const fallbackInvoice: Invoice = {
        id: `INV-${timestampId}`,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerAddress: cust.address,
        items: [...cart],
        subtotal,
        totalVat,
        grandTotal,
        paidAmount: numericPaidAmount,
        dueAmount,
        discount,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(), // Exact creation timestamp
        status: 'pending',
        paymentMode: paymentMode,
        createdBy: {
          name: userName, // Use the actual user name fetched from StoreUser
          role: userRole
        }
      };
      
      // Log stock deduction details for fallback invoice too
      console.log('=== STOCK DEDUCTION LOG (Fallback Invoice) ===');
      console.log('Invoice ID:', fallbackInvoice.id);
      console.log('Stock Management Enabled:', business.stockManagementEnabled !== false);
      console.log('Cart items to deduct stock from:');
      cart.forEach(item => {
        console.log(`- ${item.name} (ID: ${item.id}): ${item.quantity} ${item.unit}`);
        
        // Find current product stock from products array
        const product = products.find(p => p.id === item.id);
        if (product) {
          console.log(`  Current stock: ${product.stock} ${product.unit}`);
          if (business.stockManagementEnabled !== false) {
            const newStock = product.stock - item.quantity;
            console.log(`  New stock after deduction: ${newStock} ${product.unit}`);
            console.log(`  Stock change: -${item.quantity} ${product.unit}`);
          } else {
            console.log(`  Stock management disabled - no stock deduction`);
          }
        } else {
          console.log(`  Product not found in products array`);
        }
      });
      console.log('=== END STOCK DEDUCTION LOG ===');
      
      console.log('Using fallback invoice ID:', fallbackInvoice.id);
      
      if (business.pdfUploadEnabled !== false) {
        // PDF upload is enabled (default: true)
        try {
          // Try to save fallback invoice with PDF upload
          const savedInvoice = await PDFService.generateUploadAndSaveInvoice(
            fallbackInvoice,
            business,
            storeId,
            false // isReprint
          );
          
          // Update parent component with saved invoice (includes PDF URL)
          onAddInvoice(savedInvoice);
          setGeneratedInvoice(savedInvoice);
          console.log('Fallback invoice saved with PDF URL:', savedInvoice.pdfUrl);
        } catch (pdfError) {
          console.error('Error saving fallback invoice with PDF:', pdfError);
          // If PDF upload fails, just save the invoice without PDF
          onAddInvoice(fallbackInvoice);
          setGeneratedInvoice(fallbackInvoice);
        }
      } else {
        // PDF upload is disabled - save invoice without PDF
        console.log('Saving fallback invoice without PDF upload (fast mode):', fallbackInvoice.id);
        
        // Save invoice with stock update only (no PDF upload)
        await dataService.saveInvoiceWithStockUpdate(storeId, fallbackInvoice);
        
        // Create invoice object without PDF URL for local state
        const savedInvoice = {
          ...fallbackInvoice,
          pdfUrl: undefined
        };
        
        onAddInvoice(savedInvoice);
        setGeneratedInvoice(savedInvoice);
        console.log('Fallback invoice saved without PDF (fast mode)');
      }
      
      // Show PDF preview instead of automatically downloading
      setShowPdfPreviewModal(true);
      setShowConfirm(false);
      setIsProcessingPayment(false);
      console.log('Payment processing completed with fallback at:', new Date().toISOString());
    }
  };

  const handleQuickAddCustomer = () => {
    if (!newCustName || !newCustPhone) return;
    const newId = Date.now().toString();
    const newCustomer: Customer = {
      id: newId,
      name: newCustName,
      phone: newCustPhone,
      address: newCustAddress,
      email: newCustEmail || undefined,
      nidCard: newCustNID || undefined,
      socialSecurityNumber: newCustSSN || undefined,
      cardNumber: newCustCard || undefined,
      totalDue: 0
    };
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomer(newId);
    setShowAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustEmail('');
    setNewCustNID('');
    setNewCustSSN('');
    setNewCustCard('');
  };

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers;
    const term = customerSearchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(term) ||
      customer.phone.toLowerCase().includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term)) ||
      (customer.nidCard && customer.nidCard.toLowerCase().includes(term)) ||
      (customer.socialSecurityNumber && customer.socialSecurityNumber.toLowerCase().includes(term)) ||
      (customer.cardNumber && customer.cardNumber.toLowerCase().includes(term))
    );
  }, [customers, customerSearchTerm]);

  const handleDeliver = () => {
    if (!selectedInvoice) return;
    
    if (selectedInvoice.dueAmount > 0) {
      setDeliveryPayment(selectedInvoice.dueAmount);
      setShowDeliveryModal(true);
    } else {
      updateInvoiceStatus(selectedInvoice.id, 'delivered');
    }
  };

  const updateInvoiceStatus = (id: string, status: 'delivered', additionalPayment: number = 0) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
         return {
           ...inv,
           status: status,
           paidAmount: inv.paidAmount + additionalPayment,
           dueAmount: inv.dueAmount - additionalPayment
         };
      }
      return inv;
    }));
    
    // Also update customer total due - but NOT for walk-in customers
    if (additionalPayment > 0) {
      const invoice = invoices.find(i => i.id === id);
      if (invoice && invoice.customerName !== 'Walk-in Customer') {
        const custName = invoice.customerName;
        setCustomers(prev => prev.map(c => 
          c.name === custName ? { ...c, totalDue: Math.max(0, c.totalDue - additionalPayment) } : c
        ));
      }
    }

    setShowDeliveryModal(false);
    setSelectedInvoice(null);
  };

  const handleClearDue = () => {
    if (userRole !== 'admin') return;
    
    // Don't allow clearing due for walk-in customers
    if (selectedCustomer === 'walk-in' || selectedCustomer.includes('_customer_walkin')) {
      alert('Walk-in customers do not have due amounts to clear.');
      return;
    }
    
    if (confirm("Are you sure you want to clear the due amount for this customer?")) {
      setCustomers(prev => prev.map(c => 
        c.id === selectedCustomer ? { ...c, totalDue: 0 } : c
      ));
    }
  };

  const handleNumPad = (key: string | number) => {
    setPaidAmount(prev => {
      if (key === 'C') return '';
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev ? prev + '.' : '0.';
      }
      if (prev === '0' && key !== '.') return key.toString();
      return prev + key.toString();
    });
  };
  
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearchTerm) return [];
    
    // By default check only last 20,000 invoices for performance if not searching all history
    // Assuming invoices are stored newest first (based on addInvoice logic)
    const searchPool = searchAllHistory ? invoices : invoices.slice(0, 20000);
    const term = invoiceSearchTerm.toLowerCase();
    
    return searchPool.filter(inv => 
           inv.id.toLowerCase().includes(term) ||
           inv.customerName.toLowerCase().includes(term) ||
           (inv.customerPhone && inv.customerPhone.includes(term))
    ).slice(0, 50);
  }, [invoices, invoiceSearchTerm, searchAllHistory]);

  // Generate PDF preview when modal opens
  useEffect(() => {
    const generatePdfPreview = async () => {
      if (showPdfPreviewModal && generatedInvoice && !pdfPreviewUrl) {
        setIsGeneratingPDF(true);
        try {
          const doc = await PDFService.generateInvoicePDFForPreview(
            generatedInvoice, 
            business, 
            generatedInvoice === selectedInvoice, // isReprint if it's a reprint
            storeId
          );
          const pdfDataUrl = PDFService.getPDFAsDataURL(doc);
          setPdfPreviewUrl(pdfDataUrl);
        } catch (error) {
          console.error('Error generating PDF preview:', error);
        } finally {
          setIsGeneratingPDF(false);
        }
      }
    };

    generatePdfPreview();
  }, [showPdfPreviewModal, generatedInvoice, business, storeId, pdfPreviewUrl, selectedInvoice]);

  // Reset when modal closes
  useEffect(() => {
    if (!showPdfPreviewModal) {
      setPdfPreviewUrl(null);
      setGeneratedInvoice(null);
      setIsGeneratingPDF(false);
    }
  }, [showPdfPreviewModal]);

  if (showConfirm) {
    // Handle walk-in customer specially for preview too
    let cust;
    if (selectedCustomer === 'walk-in' || selectedCustomer.includes('_customer_walkin')) {
      // Always use the hardcoded walk-in customer, never the database one
      cust = {
        id: 'walk-in',
        name: 'Walk-in Customer',
        phone: '',
        address: '',
        totalDue: 0
      };
    } else {
      cust = customers.find(c => c.id === selectedCustomer);
      if (!cust) {
        // Fallback to walk-in if customer not found
        cust = {
          id: 'walk-in',
          name: 'Walk-in Customer',
          phone: '',
          address: '',
          totalDue: 0
        };
      }
    }
    
    // For preview, we'll show a placeholder since we don't know the actual ID yet
    const previewInvoice: Invoice = {
      id: 'INV-XXXXXX', // Placeholder, will be replaced with actual sequential ID
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAddress: cust.address || undefined, // Convert empty string to undefined
      items: [...cart],
      subtotal,
      totalVat,
      grandTotal,
      paidAmount: numericPaidAmount,
      dueAmount,
      discount,
      date: new Date().toLocaleDateString(),
      createdAt: new Date().toISOString(), // Include timestamp for preview too
      status: 'pending',
      paymentMode: paymentMode
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 md:p-4 print:static print:bg-white print:p-0 print:block">
        <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-y-auto flex flex-col md:flex-row print:shadow-none print:h-auto print:max-h-none print:overflow-visible print:block">
           {/* Left: Input Fields (No Print) */}
           <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-200 w-full md:w-1/3 space-y-4 no-print order-2 md:order-1">
              <div className="flex justify-between items-center md:block flex-shrink-0">
                 <h2 className="text-xl font-bold md:mb-4">{t('confirm_order')}</h2>
                 <button onClick={() => setShowConfirm(false)} className="md:hidden p-2 text-gray-500"><X /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{CurrencyService.formatAmountWithSpace(subtotal, business.currency)}</span></div>
                    <div className="flex justify-between"><span>VAT:</span> <span>{CurrencyService.formatAmountWithSpace(totalVat, business.currency)}</span></div>
                  </div>

                  {/* Discount Controls */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Discount</label>
                      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setDiscountType('value')}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${discountType === 'value' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          type="button"
                        >
                          Value
                        </button>
                        <button
                          onClick={() => setDiscountType('percentage')}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${discountType === 'percentage' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          type="button"
                        >
                          Percentage
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (value >= 0) {
                            setDiscount(value);
                          }
                        }}
                        className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                        min="0"
                        step={discountType === 'percentage' ? "0.1" : "0.01"}
                      />
                      <div className="absolute right-3 top-2.5 text-gray-500 text-sm">
                        {discountType === 'percentage' ? '%' : business.currency}
                      </div>
                    </div>
                    
                    {/* Discount Calculation Preview */}
                    {discount > 0 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                        {discountType === 'percentage' ? (
                          <>
                            <div>Percentage: {discount}%</div>
                            <div>Discount Amount: {CurrencyService.formatAmountWithSpace(subtotal * discount / 100, business.currency)}</div>
                            <div className="font-medium mt-1">Total after discount: {CurrencyService.formatAmountWithSpace(subtotal - (subtotal * discount / 100) + totalVat, business.currency)}</div>
                          </>
                        ) : (
                          <>
                            <div>Discount Amount: {CurrencyService.formatAmountWithSpace(discount, business.currency)}</div>
                            <div className="font-medium mt-1">Total after discount: {CurrencyService.formatAmountWithSpace(subtotal - discount + totalVat, business.currency)}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Payment Mode Selector */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Cash', 'Card', 'Pay Later'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setPaymentMode(mode);
                            // If Pay Later is selected, set paid amount to 0
                            if (mode === 'Pay Later') {
                              setPaidAmount('0');
                            } else if (paidAmount === '0') {
                              // If switching from Pay Later to another mode, clear the paid amount
                              setPaidAmount('');
                            }
                          }}
                          className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                            paymentMode === mode 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center">
                    <span className="font-bold text-indigo-900">{t('total')}</span>
                    <span className="text-xl font-bold text-indigo-700">{CurrencyService.formatAmountWithSpace(grandTotal, business.currency)}</span>
                  </div>

                  <div className="space-y-2">
                    <Input 
                        label={t('paid_amount')} 
                        type="text"
                        value={paidAmount} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val)) setPaidAmount(val);
                        }}
                    />
                    <div className="grid grid-cols-4 gap-2">
                       {[7, 8, 9, '⌫', 4, 5, 6, 'C', 1, 2, 3, '.', 0, '00'].map((btn, idx) => {
                          return (
                            <button
                                key={idx}
                                onClick={() => handleNumPad(btn)}
                                className={`
                                  h-12 rounded-lg font-bold text-lg transition-colors
                                  ${btn === 'C' ? 'bg-red-100 text-red-600 hover:bg-red-200' : ''}
                                  ${btn === '⌫' ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : ''}
                                  ${typeof btn === 'number' || btn === '.' || btn === '00' ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : ''}
                                `}
                            >
                                {btn}
                            </button>
                          );
                       })}
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg flex justify-between items-center ${dueAmount > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <span className="font-bold">{dueAmount > 0 ? t('due_amount') : t('change_return')}</span>
                    <span className="text-xl font-bold">{CurrencyService.formatAmountWithSpace(Math.abs(dueAmount), business.currency)}</span>
                  </div>
              </div>

              <div className="pt-4 flex flex-col gap-3 flex-shrink-0 border-t border-gray-100 mt-2">
                 <Button 
                   onClick={confirmPayment} 
                   className="py-3 text-lg w-full"
                   disabled={isProcessingPayment || (paymentMode !== 'Pay Later' && (!paidAmount || paidAmount.trim() === ''))}
                 >
                    {isProcessingPayment ? 'Processing...' : `${t('confirm_order')} & ${t('print')}`}
                 </Button>
                 {paymentMode !== 'Pay Later' && (!paidAmount || paidAmount.trim() === '') && (
                   <div className="text-sm text-red-600 text-center">
                     Please enter paid amount or select "Pay Later"
                   </div>
                 )}
                 <Button 
                   variant="secondary" 
                   onClick={() => setShowConfirm(false)} 
                   className="w-full"
                   disabled={isProcessingPayment}
                 >
                    {t('cancel')}
                 </Button>
              </div>
           </div>

           <div className="flex-1 flex justify-center bg-gray-50 overflow-auto print:overflow-visible print:bg-white print:block">
              <InvoicePreview invoice={previewInvoice} business={business} />
           </div>
        </div>
      </div>
    );
  }

  // Handle Selected Invoice Modal
  if (selectedInvoice) {
      return (
         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 print:static print:bg-white print:p-0 print:block">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-[90vh] flex flex-col overflow-hidden animate-scale-in print:shadow-none print:h-auto print:max-h-none print:overflow-visible print:block">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 no-print">
                   <div className="flex items-center gap-2">
                       <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
                       <span className="font-bold text-lg">Invoice #{selectedInvoice.id}</span>
                   </div>
                   <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto relative flex justify-center bg-gray-50 print:overflow-visible print:bg-white print:block print:h-auto">
                   <InvoicePreview invoice={selectedInvoice} business={business} isReprint={true} />
                </div>

                <div className="p-4 border-t bg-gray-50 flex flex-col md:flex-row gap-3 justify-end no-print">
                   <Button variant="secondary" onClick={async () => {
                     setGeneratedInvoice(selectedInvoice);
                     setShowPdfPreviewModal(true);
                   }}><Printer className="w-4 h-4"/> Reprint PDF</Button>
                   {selectedInvoice.status === 'pending' && (
                      <Button onClick={handleDeliver}>
                         <PackageCheck className="w-4 h-4"/> Deliver
                      </Button>
                   )}
                    <Button variant="secondary" onClick={() => {
                        setCart(selectedInvoice.items);
                        setSelectedCustomer(customers.find(c => c.name === selectedInvoice.customerName)?.id || 'walk-in');
                        setSelectedInvoice(null);
                        setInvoiceSearchTerm(''); 
                    }}>
                        <Edit className="w-4 h-4"/> Edit / Load to Cart
                    </Button>
                </div>
            </div>
            {/* Nested Modal for Payment on Delivery */}
            {showDeliveryModal && (
              <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                 <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4 animate-scale-in">
                    <h3 className="text-lg font-bold">Collect Payment</h3>
                    <p className="text-sm text-gray-600">Due Amount: <span className="font-bold text-red-600">{CurrencyService.formatAmountWithSpace(selectedInvoice.dueAmount, business.currency)}</span></p>
                    <Input label="Payment Amount" type="number" value={deliveryPayment} onChange={e => setDeliveryPayment(Number(e.target.value))} />
                    <div className="flex flex-col gap-2 pt-2">
                       <Button onClick={() => updateInvoiceStatus(selectedInvoice.id, 'delivered', Number(deliveryPayment))}>Pay & Deliver</Button>
                       <Button variant="secondary" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'delivered', 0)}>Deliver as Unpaid</Button>
                       <Button variant="danger" onClick={() => setShowDeliveryModal(false)} className="mt-2">Cancel</Button>
                    </div>
                 </div>
              </div>
            )}
         </div>
      );
  }


  // PDF Preview Modal
  if (showPdfPreviewModal && generatedInvoice) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-[90vh] flex flex-col overflow-hidden animate-scale-in">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-gray-800">Invoice PDF Preview</span>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-mono">#{generatedInvoice.id}</span>
            </div>
            <button 
              onClick={() => {
                setShowPdfPreviewModal(false);
                if (generatedInvoice !== selectedInvoice) {
                  // If this was a new invoice from checkout, clear the cart
                  setCart([]);
                }
              }} 
              className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-gray-50">
            {isGeneratingPDF ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-gray-600">Generating PDF preview...</p>
                </div>
              </div>
            ) : pdfPreviewUrl ? (
              <div className="h-full w-full">
                <iframe 
                  src={pdfPreviewUrl} 
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">PDF preview not available</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50 flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowPdfPreviewModal(false);
                  if (generatedInvoice !== selectedInvoice) {
                    setCart([]);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (generatedInvoice) {
                    const doc = await PDFService.generateInvoicePDFForPreview(
                      generatedInvoice, 
                      business, 
                      generatedInvoice === selectedInvoice,
                      storeId
                    );
                    PDFService.printPDFDocument(doc);
                  }
                }}
                disabled={isGeneratingPDF}
              >
                <Printer className="w-4 h-4 mr-2"/> Print
              </Button>
              
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (generatedInvoice) {
                    await PDFService.generateAndSaveInvoicePDF(
                      generatedInvoice, 
                      business, 
                      generatedInvoice === selectedInvoice,
                      storeId
                    );
                  }
                }}
                disabled={isGeneratingPDF}
              >
                <Download className="w-4 h-4 mr-2"/> Download PDF
              </Button>
              
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (generatedInvoice) {
                    await PDFService.exportInvoiceToExcel(generatedInvoice, business);
                  }
                }}
                disabled={isGeneratingPDF}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2"/> Export to Excel
              </Button>
              
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (generatedInvoice) {
                    await PDFService.generateAndSaveA4InvoicePDF(
                      generatedInvoice, 
                      business, 
                      generatedInvoice === selectedInvoice,
                      storeId
                    );
                  }
                }}
                disabled={isGeneratingPDF}
              >
                <FileText className="w-4 h-4 mr-2"/> A4 PDF
              </Button>
              
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (generatedInvoice) {
                    await PDFService.generateAndSaveThermalInvoicePDF(
                      generatedInvoice, 
                      business, 
                      generatedInvoice === selectedInvoice,
                      storeId
                    );
                  }
                }}
                disabled={isGeneratingPDF}
              >
                <FileText className="w-4 h-4 mr-2"/> Thermal PDF
              </Button>
              
              {/* Copy Link Button - Only show if invoice has PDF URL */}
              {generatedInvoice?.pdfUrl && (
                <Button 
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(generatedInvoice.pdfUrl!);
                      setCopyLinkSuccess(true);
                      setTimeout(() => setCopyLinkSuccess(false), 2000);
                    } catch (error) {
                      console.error('Failed to copy link:', error);
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = generatedInvoice.pdfUrl!;
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        setCopyLinkSuccess(true);
                        setTimeout(() => setCopyLinkSuccess(false), 2000);
                      } catch (err) {
                        console.error('Fallback copy failed:', err);
                        alert('Failed to copy link to clipboard');
                      }
                      document.body.removeChild(textArea);
                    }
                  }}
                  disabled={isGeneratingPDF}
                  className={copyLinkSuccess ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                >
                  {copyLinkSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-2"/> Copied!
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2"/> Copy Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-140px)] relative">
      {/* Stock Deduction Notification */}
      {stockDeductionNotification.show && (
        <div className="absolute top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-white rounded-xl shadow-2xl border border-green-200 max-w-md w-full p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-green-700 text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">📦</span>
                Stock Deduction Complete
              </h3>
              <button 
                onClick={() => setStockDeductionNotification(prev => ({...prev, show: false}))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Invoice: <span className="font-mono font-bold">{stockDeductionNotification.invoiceId}</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {stockDeductionNotification.details.map((detail, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="font-medium text-gray-800">{detail.productName}</div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Quantity: {detail.quantity} {detail.unit}</span>
                    <span className="font-mono">
                      <span className="text-gray-500 line-through mr-2">{detail.oldStock}</span>
                      <span className="text-green-600 font-bold">→ {detail.newStock}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Stock change: <span className="font-bold text-red-500">-{detail.quantity} {detail.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              This notification will auto-dismiss in 5 seconds
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomer && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold">{t('quick_add_customer')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder={t('name')} value={newCustName} onChange={e => setNewCustName(e.target.value)} required />
                <Input placeholder={t('phone')} value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} required />
                <div className="md:col-span-2">
                  <Input placeholder={t('address')} value={newCustAddress} onChange={e => setNewCustAddress(e.target.value)} />
                </div>
                <Input placeholder="Email (optional)" type="email" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} />
                <Input placeholder="NID Card (optional)" value={newCustNID} onChange={e => setNewCustNID(e.target.value)} />
                <Input placeholder="Social Security No. (optional)" value={newCustSSN} onChange={e => setNewCustSSN(e.target.value)} />
                <Input placeholder="Card Number (optional)" value={newCustCard} onChange={e => setNewCustCard(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowAddCustomer(false)} className="flex-1">{t('cancel')}</Button>
                <Button onClick={handleQuickAddCustomer} className="flex-1">{t('save')}</Button>
              </div>
           </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-scale-in">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold">Search Customer</h3>
              <button 
                onClick={() => {
                  setShowCustomerSearch(false);
                  setCustomerSearchTerm('');
                }} 
                className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input 
                  className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900" 
                  placeholder="Search by name, phone, email, address, NID, SSN, or card number..."
                  value={customerSearchTerm}
                  onChange={e => setCustomerSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {filteredCustomers.length} customer(s) found
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No customers found</p>
                  <p className="text-sm mt-1">Try a different search term or add a new customer</p>
                  <Button 
                    onClick={() => {
                      setShowCustomerSearch(false);
                      setShowAddCustomer(true);
                    }} 
                    className="mt-4"
                  >
                    + Add New Customer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div 
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedCustomer('walk-in');
                      setShowCustomerSearch(false);
                      setCustomerSearchTerm('');
                    }}
                  >
                    <div className="font-medium text-gray-900">Walk-in Customer</div>
                    <div className="text-xs text-gray-500">No customer details</div>
                  </div>
                  
                  {filteredCustomers.map(customer => (
                    <div 
                      key={customer.id} 
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer.id);
                        setShowCustomerSearch(false);
                        setCustomerSearchTerm('');
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                          {customer.email && <div className="text-xs text-gray-500">{customer.email}</div>}
                          {customer.address && <div className="text-xs text-gray-500">{customer.address}</div>}
                          {customer.nidCard && <div className="text-xs text-gray-500">NID: {customer.nidCard}</div>}
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${customer.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            Due: {CurrencyService.formatAmountWithSpace(customer.totalDue, business.currency)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {customer === customers.find(c => c.id === selectedCustomer) ? '✓ Selected' : 'Click to select'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <Button 
                onClick={() => {
                  setShowCustomerSearch(false);
                  setShowAddCustomer(true);
                }} 
                className="w-full"
              >
                + Add New Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b bg-white mb-2 rounded-lg overflow-hidden shadow-sm">
        <button
          className={`flex-1 py-3 text-sm font-bold transition-colors ${mobileTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
          onClick={() => setMobileTab('products')}
        >
          {t('products')}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold transition-colors ${mobileTab === 'cart' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
          onClick={() => setMobileTab('cart')}
        >
          Cart ({totalItems})
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden relative">
        {/* Left: Cart (Collapsible on Mobile) */}
        <div className={`
           w-full lg:w-1/3 bg-white lg:rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden
           absolute lg:relative inset-0 z-10 lg:z-auto transition-transform duration-300
           ${mobileTab === 'products' ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        `}>
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
            <h2 className="text-xl font-bold">Cart ({totalItems})</h2>
            <button 
              onClick={() => setMobileTab('products')} 
              className="lg:hidden p-2 hover:bg-gray-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Customer Selection */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Customer</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddCustomer(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Quick Add
                </button>
                <button 
                  onClick={() => setShowCustomerSearch(true)}
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 text-left flex justify-between items-center hover:bg-gray-50"
              >
                <span>
                  {selectedCustomer === 'walk-in' 
                    ? 'Walk-in Customer' 
                    : (() => {
                        const cust = customers.find(c => c.id === selectedCustomer);
                        return cust ? `${cust.name} ${cust.phone ? `(${cust.phone})` : ''}` : 'Select Customer';
                      })()
                  }
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>
              {selectedCustomer !== 'walk-in' && userRole === 'admin' && (
                <button 
                  onClick={handleClearDue}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
                  title="Clear due amount"
                >
                  Clear Due
                </button>
              )}
            </div>
            {selectedCustomer !== 'walk-in' && (
              <div className="mt-2 text-xs text-gray-600">
                {(() => {
                  const cust = customers.find(c => c.id === selectedCustomer);
                  return cust ? (
                    <>
                      <div>Phone: {cust.phone || 'N/A'}</div>
                      <div>Address: {cust.address || 'N/A'}</div>
                      {cust.email && <div>Email: {cust.email}</div>}
                      {cust.nidCard && <div>NID: {cust.nidCard}</div>}
                      <div className="font-medium mt-1">Total Due: {CurrencyService.formatAmountWithSpace(cust.totalDue, business.currency)}</div>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Add products from the right</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">{item.quantity} {item.unit} × </span>
                        {item.priceAdjusted ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-400 line-through">{CurrencyService.formatAmountWithSpace(item.originalPrice, business.currency)}</span>
                            <span className="text-sm font-medium text-green-600">→ {CurrencyService.formatAmountWithSpace(item.salePrice, business.currency)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{CurrencyService.formatAmountWithSpace(item.salePrice, business.currency)}</span>
                        )}
                      </div>
                      {item.priceAdjusted && item.adjustmentReason && (
                        <div className="text-xs text-gray-400 mt-1">
                          Reason: {item.adjustmentReason}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{CurrencyService.formatAmountWithSpace(item.salePrice * item.quantity, business.currency)}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                          <span className="text-sm">−</span>
                        </button>
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={e => setCartQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center border rounded py-1 text-sm"
                          min="1"
                        />
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                          <span className="text-sm">+</span>
                        </button>
                        <button 
                          onClick={() => handlePriceAdjustment(item)}
                          className={`p-1 ${item.priceAdjusted ? 'text-yellow-500 hover:text-yellow-700' : 'text-gray-500 hover:text-gray-700'}`}
                          title="Adjust Price"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {item.priceAdjusted && (
                          <button 
                            onClick={() => resetPriceAdjustment(item.id)}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Reset to Original Price"
                          >
                            <span className="text-xs font-bold">↺</span>
                          </button>
                        )}
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {cart.length > 0 && (
            <div className="p-4 border-t bg-white space-y-3 flex-shrink-0">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">{CurrencyService.formatAmountWithSpace(subtotal, business.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT:</span>
                <span className="font-medium">{CurrencyService.formatAmountWithSpace(totalVat, business.currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{CurrencyService.formatAmountWithSpace(grandTotal, business.currency)}</span>
              </div>
              
              <Button 
                onClick={handleCheckoutOpen} 
                className="w-full py-3 text-lg mt-2"
                disabled={cart.length === 0}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Checkout
              </Button>
            </div>
          )}
        </div>

        {/* Right: Products */}
        <div className={`
          flex-1 bg-white lg:rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden
          ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}
        `}>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex-shrink-0 flex flex-col gap-3">
             <div className="flex flex-col md:flex-row gap-3">
                {/* Product Search (with barcode scanning support) */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input 
                      type="text" 
                      placeholder="Search Products or Scan Barcode..." 
                      value={search}
                      onChange={(e) => {
                         const value = e.target.value;
                         setSearch(value);
                         if(invoiceSearchTerm) setInvoiceSearchTerm(''); 
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleBarcodeScan(search);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                  />
                  {search && (
                    <button 
                      onClick={() => {
                        setSearch('');
                        setIsScanning(false);
                      }} 
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4"/>
                    </button>
                  )}
                </div>
                {/* Invoice Search */}
                <div className="relative flex-1 flex flex-col">
                  <div className="relative w-full">
                      <History className="absolute left-3 top-3 text-indigo-500 w-5 h-5" />
                      <input 
                          type="text" 
                          placeholder="Find Invoice (ID, Name)..." 
                          value={invoiceSearchTerm}
                          onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 placeholder-indigo-300"
                      />
                      {invoiceSearchTerm && (
                         <button onClick={() => setInvoiceSearchTerm('')} className="absolute right-3 top-3 text-indigo-400 hover:text-indigo-600"><X className="w-4 h-4"/></button>
                      )}
                  </div>
                  {/* Search Scope Toggle */}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${searchAllHistory ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}>
                           {searchAllHistory && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <input 
                           type="checkbox" 
                           className="hidden" 
                           checked={searchAllHistory} 
                           onChange={(e) => setSearchAllHistory(e.target.checked)} 
                        />
                        <span className="text-[10px] text-gray-500 font-medium select-none group-hover:text-indigo-600">Search All History (Default: Last 20k)</span>
                    </label>
                  </div>
                </div>
             </div>
             
             {/* Category Buttons - Only show if not searching invoices */}
            {!invoiceSearchTerm && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <button 
                  onClick={() => setSelectedCategory('All')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedCategory === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {invoiceSearchTerm ? (
                 <div className="space-y-2">
                    <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-4">Invoice Results ({filteredInvoices.length})</h3>
                    {filteredInvoices.length === 0 ? (
                       <div className="text-center py-10 text-gray-400">No invoices found matching "{invoiceSearchTerm}"</div>
                    ) : (
                       filteredInvoices.map(inv => (
                          <div 
                             key={inv.id} 
                             onClick={() => setSelectedInvoice(inv)}
                             className="p-4 border border-gray-100 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition-all flex justify-between items-center group"
                          >
                             <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800">{inv.id}</span>
                                  <span className="text-xs text-gray-400">| {inv.date}</span>
                                </div>
                                <div className="text-sm text-gray-600">{inv.customerName} - {inv.customerPhone}</div>
                             </div>
                             <div className="text-right">
                                <div className="font-bold text-indigo-600">{CurrencyService.formatAmountWithSpace(inv.grandTotal, business.currency)}</div>
                                <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded inline-block mt-1 ${inv.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{inv.status}</div>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
             ) : (
              filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No products found</p>
                  <p className="text-sm mt-1">Try a different search or category</p>
                </div>
              ) : (
                <>
                  {(business.productViewMode || 'grid') === 'list' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-3 font-medium text-gray-600">Product</th>
                            <th className="p-3 font-medium text-gray-600 hidden md:table-cell">Stock</th>
                            <th className="p-3 font-medium text-gray-600 text-right">Price</th>
                            <th className="p-3 font-medium text-gray-600 text-center">Add</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedProducts.map(product => (
                            <tr key={product.id} className={`group ${business.stockManagementEnabled !== false && product.stock <= 0 ? 'opacity-60' : 'hover:bg-gray-50 cursor-pointer'}`} onClick={() => (business.stockManagementEnabled === false || product.stock > 0) && addToCart(product)}>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                    {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover"/> : <ImageIcon className="w-5 h-5 m-auto text-gray-400"/>}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 line-clamp-1">{product.name}</div>
                                    <div className="text-xs text-gray-500">{getCategoryName(product.category)}</div>
                                    <div className="md:hidden text-[10px] mt-0.5">
                                      <span className={business.stockManagementEnabled !== false && product.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-400'}>
                                        {business.stockManagementEnabled === false ? 'Stock: ∞' : (product.stock <= 0 ? 'Stock: 0, add stock' : `Stock: ${product.stock} ${product.unit}`)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-sm hidden md:table-cell">
                                <span className={business.stockManagementEnabled !== false && product.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-600'}>
                                  {business.stockManagementEnabled === false ? 'Stock: ∞' : (product.stock <= 0 ? 'Stock: 0, add stock' : `${product.stock} ${product.unit}`)}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-indigo-600">
                                {CurrencyService.formatAmountWithSpace(product.price, business.currency)}
                              </td>
                              <td className="p-3 text-center">
                                <button 
                                  className={`p-2 rounded-lg transition-colors ${business.stockManagementEnabled !== false && product.stock <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                                  onClick={() => (business.stockManagementEnabled === false || product.stock > 0) && addToCart(product)}
                                  disabled={business.stockManagementEnabled !== false && product.stock <= 0}
                                  title={business.stockManagementEnabled === false ? 'Add to cart (stock disabled)' : (product.stock <= 0 ? 'Out of stock' : 'Add to cart')}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-20 lg:pb-0">
                      {paginatedProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => (business.stockManagementEnabled === false || product.stock > 0) && addToCart(product)}
                          className={`group p-3 rounded-xl border ${business.stockManagementEnabled !== false && product.stock <= 0 ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-100 hover:border-indigo-500 hover:shadow-lg cursor-pointer'} transition-all bg-white flex flex-col overflow-hidden relative`}
                        >
                          <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-gray-300" />
                            )}
                            <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${product.type === 'service' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                              {product.type}
                            </div>
                            {business.stockManagementEnabled !== false && product.stock <= 0 && (
                              <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center">
                                <span className="text-red-600 font-bold text-sm px-2 py-1 bg-white/90 rounded">Out of Stock</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-start">
                              <span className={`text-xs font-mono mb-1 ${business.stockManagementEnabled !== false && product.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                {business.stockManagementEnabled === false ? 'Stock: ∞' : (product.stock <= 0 ? 'Stock: 0, add stock' : `stk: ${product.stock}`)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-1 leading-tight text-sm md:text-base line-clamp-2">{product.name}</h3>
                            <p className="text-xs text-gray-500 mb-3">{getCategoryName(product.category)}</p>
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-indigo-600 font-bold text-base md:text-lg">{CurrencyService.formatAmountWithSpace(product.price, business.currency)}</span>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors ${business.stockManagementEnabled !== false && product.stock <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                <Plus className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-100 pb-4">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Price Adjustment Modal */}
      {priceAdjustmentModal.show && priceAdjustmentModal.item && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-scale-in">
            <h3 className="text-lg font-bold">Adjust Price</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium text-gray-900">{priceAdjustmentModal.item.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Original Price: <span className="font-medium">{CurrencyService.formatAmountWithSpace(priceAdjustmentModal.item.originalPrice, business.currency)}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Current Sale Price: <span className="font-medium">{CurrencyService.formatAmountWithSpace(priceAdjustmentModal.item.salePrice, business.currency)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">New Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">{business.currency}</span>
                  <input
                    type="number"
                    value={priceAdjustmentModal.newPrice}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 0) {
                        setPriceAdjustmentModal(prev => ({...prev, newPrice: value}));
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter new price"
                    min="0"
                    step="0.01"
                  />
                </div>
                {priceAdjustmentModal.newPrice > 0 && priceAdjustmentModal.item.originalPrice > 0 && (
                  <div className="text-xs text-gray-500">
                    {priceAdjustmentModal.newPrice > priceAdjustmentModal.item.originalPrice ? (
                      <span className="text-red-500">Increase: +{CurrencyService.formatAmountWithSpace(priceAdjustmentModal.newPrice - priceAdjustmentModal.item.originalPrice, business.currency)} (+{(((priceAdjustmentModal.newPrice / priceAdjustmentModal.item.originalPrice) - 1) * 100).toFixed(1)}%)</span>
                    ) : priceAdjustmentModal.newPrice < priceAdjustmentModal.item.originalPrice ? (
                      <span className="text-green-500">Discount: -{CurrencyService.formatAmountWithSpace(priceAdjustmentModal.item.originalPrice - priceAdjustmentModal.newPrice, business.currency)} (-{((1 - (priceAdjustmentModal.newPrice / priceAdjustmentModal.item.originalPrice)) * 100).toFixed(1)}%)</span>
                    ) : (
                      <span className="text-gray-500">No change from original price</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Adjustment Note (Optional)</label>
                <textarea
                  value={priceAdjustmentModal.reason}
                  onChange={(e) => setPriceAdjustmentModal(prev => ({...prev, reason: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Add a note about this price adjustment (optional)"
                  rows={3}
                />
                <div className="text-xs text-gray-400">
                  Leave empty if no note needed. This note will appear on the invoice.
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Adjusted by: <span className="font-medium">{userName}</span> ({userRole})
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="secondary" 
                onClick={() => setPriceAdjustmentModal({show: false, item: null, newPrice: 0, reason: ''})}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={savePriceAdjustment}
                className="flex-1"
              >
                Save Adjustment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal for Barcode Scanning */}
      {showAddProductModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Add New Product</h3>
                <button 
                  onClick={() => {
                    setShowAddProductModal(false);
                    setScannedBarcode('');
                    setNewProductForm({
                      name: '',
                      price: 0,
                      stock: 1,
                      unit: 'pc',
                      vat: 0,
                      type: 'product',
                      category: ''
                    });
                    setBarcodeError('');
                  }} 
                  className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-indigo-700">Scanned Barcode:</span>
                  </div>
                  <div className="font-mono text-lg text-center bg-white p-3 rounded border border-indigo-200">
                    {scannedBarcode}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Product not found with this barcode. Please enter product details to add it to your inventory.
                  </p>
                </div>

                <div className="space-y-3">
                  <Input 
                    label="Product Name" 
                    value={newProductForm.name || ''} 
                    onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} 
                    required 
                    placeholder="Enter product name"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Price" 
                      type="number" 
                      value={newProductForm.price || ''} 
                      onChange={e => setNewProductForm({...newProductForm, price: Number(e.target.value)})} 
                      required 
                      placeholder="0.00"
                    />
                    <Input 
                      label="Stock" 
                      type="number" 
                      value={newProductForm.stock || ''} 
                      onChange={e => setNewProductForm({...newProductForm, stock: Number(e.target.value)})} 
                      required 
                      placeholder="1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Unit" 
                      value={newProductForm.unit || 'pc'} 
                      onChange={e => setNewProductForm({...newProductForm, unit: e.target.value})} 
                      placeholder="pc, kg, etc."
                    />
                    <Input 
                      label="VAT %" 
                      type="number" 
                      value={newProductForm.vat || ''} 
                      onChange={e => setNewProductForm({...newProductForm, vat: Number(e.target.value)})} 
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select 
                      value={newProductForm.category || ''}
                      onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <option value="General">General</option>
                      )}
                    </select>
                  </div>
                  
                  {barcodeError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{barcodeError}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setShowAddProductModal(false);
                      setScannedBarcode('');
                      setNewProductForm({
                        name: '',
                        price: 0,
                        stock: 1,
                        unit: 'pc',
                        vat: 0,
                        type: 'product',
                        category: ''
                      });
                      setBarcodeError('');
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddNewProduct}
                    className="flex-1"
                    disabled={isScanning}
                  >
                    {isScanning ? 'Adding...' : 'Add Product & to Cart'}
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <p>• Product will be added to your inventory with the scanned barcode</p>
                  <p>• Product will be automatically added to cart after creation</p>
                  <p>• You can edit product details later from Products menu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
