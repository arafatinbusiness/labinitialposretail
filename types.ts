
export type Language = 'en' | 'bn';

export type UserRole = 'admin' | 'cashier' | 'manager' | 'salesman';

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string; // For UI display
  storeId: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string; // Barcode/SKU for scanning (optional)
  category: string; // Category ID or name (we'll use ID for consistency)
  price: number; // Selling price
  purchasePrice?: number; // Optional purchase price for audit (cost price)
  vat: number; // Percentage
  stock: number;
  unit: string; // e.g., mm, cm, inch, kg, pc
  type: 'product' | 'service';
  image?: string; // URL or Base64 string
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  nidCard?: string;
  socialSecurityNumber?: string;
  cardNumber?: string;
  totalDue: number;
}

export interface CartItem extends Product {
  quantity: number;
  originalPrice: number; // Always store original catalog price
  salePrice: number; // Actual selling price (may be adjusted)
  priceAdjusted: boolean; // Flag to indicate if price was adjusted
  adjustmentReason?: string; // Optional reason for adjustment
  adjustedBy?: string; // User who made adjustment
  adjustmentTimestamp?: string; // When adjustment was made
}

export interface Invoice {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;
  totalVat: number;
  discount: number;
  discountType?: 'value' | 'percentage'; // Type of discount (value or percentage)
  discountPercentage?: number; // Percentage value if discountType is 'percentage'
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  date: string;
  createdAt?: string; // ISO timestamp for exact creation date and time
  status: 'pending' | 'delivered';
  paymentMode?: 'Cash' | 'Card' | 'Pay Later' | 'Deposit';
  createdBy?: {
    name: string; // Name of the person who created the bill
    role: UserRole; // Role: 'admin' | 'cashier' | 'manager' | 'salesman'
  };
  pdfUrl?: string; // URL to PDF in Firebase Storage
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  phone: string;
  salary: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'half_day' | 'leave';
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  monthStr: string; // e.g., "2023-10"
}

export interface BusinessSettings {
  name: string;
  nameArabic?: string;
  address: string;
  addressArabic?: string;
  addressLine2?: string;
  phone: string;
  phoneArabic?: string;
  printFormat: 'a4' | 'thermal';
  productViewMode: 'grid' | 'list';
  currency: string;
  taxId?: string;
  taxLabelArabic?: string;
  taxLabelEnglish?: string;
  cheerfulNotice?: string;
  qrCodeType: 'universal' | 'zatca';
  ownerName?: string; // Owner's name to show in invoices
  stockManagementEnabled?: boolean; // Whether to enable stock tracking and validation
  pdfUploadEnabled?: boolean; // Whether to upload PDFs to Firebase Storage for sharing
  zatcaSettings?: {
    sellerName: string;
    vatRegistrationNumber: string;
    invoiceSerialNumber: string;
    timestamp: string;
    invoiceTotal: number;
    vatTotal: number;
  };
}

export interface Translation {
  [key: string]: {
    en: string;
    bn: string;
  };
}

export interface StoreAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  status: 'active' | 'paused';
  expiryDate: string | null; // ISO Date string or null for unlimited
  joinedDate: string;
  role?: UserRole; // Added for backward compatibility, default 'admin' for store owners
}

export interface StoreUser {
  id: string; // Firebase user ID
  name: string; // User's name
  email: string;
  storeId: string;
  role: UserRole;
  addedBy: string; // Admin who added them
  addedAt: string; // ISO date
  isEmailVerified?: boolean; // Track email verification status
}

export interface UserStoreAssociation {
  userId: string;
  storeId: string;
  role: UserRole;
  storeName: string;
}

export interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  barcode?: string; // Link to product barcode for easy lookup
  changeType: 'add' | 'remove' | 'adjust' | 'initial' | 'sale' | 'return' | 'damage';
  quantity: number; // Positive for add, negative for remove/sale
  previousStock: number;
  newStock: number;
  reason?: string; // "Purchase", "Damage", "Return", "Sale", "Initial", "Adjustment"
  performedBy: string; // User name who made change
  performedByRole: UserRole;
  timestamp: string; // ISO date
  referenceId?: string; // Invoice ID, Purchase Order ID, etc.
  storeId: string;
}
