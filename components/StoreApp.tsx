import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  LayoutGrid, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Store,
  BrainCircuit,
  Briefcase,
  Tag,
  Shield,
  History
} from 'lucide-react';

import { POSView } from './views/POSView';
import ProductsView from './views/ProductsView';
import CategoriesView from './views/CategoriesView';
import CustomersView from './views/CustomersView';
import InvoicesView from './views/InvoicesView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import EmployeesView from './views/EmployeesView';
import RoleManagementView from './views/RoleManagementView';
import StockHistoryView from './views/StockHistoryView';

import { 
  Product, 
  Customer, 
  Invoice, 
  BusinessSettings, 
  Language,
  UserRole,
  Employee,
  AttendanceRecord,
  SalaryRecord
} from '../types';
import { 
  TRANSLATIONS 
} from '../constants';
import { dataService } from '../services/firebaseService';

const IconMap = {
  pos: ShoppingCart,
  products: LayoutGrid,
  categories: Tag,
  customers: Users,
  employees: Briefcase,
  invoices: FileText,
  reports: BrainCircuit,
  settings: Settings,
  roles: Shield,
  stockHistory: History,
};

// Helper functions to create store-specific initial data
// Returns empty arrays - stores start with no data
const createStoreSpecificProducts = (storeId: string): Product[] => {
  // Only create walk-in customer, no sample products
  return [];
};

const createStoreSpecificCustomers = (storeId: string): Customer[] => {
  // Only create walk-in customer
  return [
    { 
      id: `${storeId}_customer_walkin`, 
      name: 'Walk-in Customer', 
      phone: '', 
      address: '', 
      totalDue: 0 
    }
  ];
};

const createStoreSpecificEmployees = (storeId: string): Employee[] => {
  // No sample employees
  return [];
};

const StoreApp = ({ storeId, onLogout, storeName, userRole: initialUserRole = 'admin' }: { 
  storeId: string, 
  onLogout: () => void, 
  storeName: string,
  userRole?: UserRole 
}) => {
  const [lang, setLang] = useState<Language>('en');
  const [userRole, setUserRole] = useState<UserRole>(initialUserRole);
  const [userName, setUserName] = useState<string>(''); // Store user's actual name
  const [activeTab, setActiveTab] = useState<keyof typeof IconMap>('pos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State with Firebase + Cache
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [business, setBusiness] = useState<BusinessSettings>({
    name: storeName,
    address: 'Dhaka, Bangladesh',
    phone: '+880 1711 000000',
    printFormat: 'thermal', // Changed from 'a4' to 'thermal' to match actual usage
    productViewMode: 'grid',
    currency: '$',
    qrCodeType: 'universal'
  });

  // Debug: Log products state changes
  useEffect(() => {
    console.log(`[StoreApp] products state updated: ${products.length} products`);
    if (products.length > 0) {
      console.log(`[StoreApp] First product in state:`, {
        id: products[0].id,
        name: products[0].name,
        category: products[0].category
      });
    }
  }, [products]);

  // Load initial data based on user role
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      console.log(`[StoreApp] Loading initial data for store: ${storeId}, userRole: ${userRole}`);
      try {
        // Try to get current user's name from StoreUser collection
        try {
          const currentUser = await dataService.getCurrentStoreUser(storeId);
          if (currentUser && currentUser.name) {
            console.log(`[StoreApp] Current user name: ${currentUser.name}`);
            setUserName(currentUser.name);
          } else {
            console.log(`[StoreApp] No user name found, using role-based name`);
            setUserName(userRole === 'admin' ? 'Store Owner' : userRole.charAt(0).toUpperCase() + userRole.slice(1));
          }
        } catch (error) {
          console.log(`[StoreApp] Error fetching user name:`, error);
          setUserName(userRole === 'admin' ? 'Store Owner' : userRole.charAt(0).toUpperCase() + userRole.slice(1));
        }
        
        // Always load products (needed for all roles for POS)
        console.log(`[StoreApp] Attempting to load products for store: ${storeId}`);
        const productsData = await dataService.getProducts(storeId);
        console.log(`[StoreApp] Products loaded successfully: ${productsData.length} products`);
        console.log(`[StoreApp] Setting products state with ${productsData.length} products`);
        if (productsData.length > 0) {
          console.log(`[StoreApp] First product:`, {
            id: productsData[0].id,
            name: productsData[0].name,
            category: productsData[0].category
          });
        }
        setProducts(productsData);
        
        // Load categories (needed for POS)
        console.log(`[StoreApp] Attempting to load categories for store: ${storeId}`);
        const categoriesData = await dataService.getCategories(storeId);
        console.log(`[StoreApp] Categories loaded successfully: ${categoriesData.length} categories`);
        // Note: Categories are used in POSView, but we don't store them in state here
        
        // Load business settings
        console.log(`[StoreApp] Attempting to load business settings for store: ${storeId}`);
        const settingsData = await dataService.getBusinessSettings(storeId);
        console.log(`[StoreApp] Business settings loaded successfully`);
        setBusiness(prev => ({ ...prev, ...settingsData }));
        
        // Load customers for ALL roles (admin, manager, salesman, cashier)
        console.log(`[StoreApp] Loading customers for role: ${userRole}`);
        const customersData = await dataService.getCustomers(storeId);
        console.log(`[StoreApp] Customers loaded: ${customersData.length} customers`);
        setCustomers(customersData);
        
        // Load invoices for ALL roles (admin, manager, salesman, cashier)
        console.log(`[StoreApp] Loading invoices for role: ${userRole}`);
        const invoicesData = await dataService.getInvoices(storeId);
        console.log(`[StoreApp] Invoices loaded: ${invoicesData.length} invoices`);
        setInvoices(invoicesData);
        
        // Load employees, attendance, salaries only for admins
        if (userRole === 'admin') {
          console.log(`[StoreApp] Loading employees, attendance, salaries for admin`);
          const [employeesData, attendanceData, salariesData] = await Promise.all([
            dataService.getEmployees(storeId),
            dataService.getAttendance(storeId),
            dataService.getSalaries(storeId)
          ]);
          console.log(`[StoreApp] Employees: ${employeesData.length}, Attendance: ${attendanceData.length}, Salaries: ${salariesData.length}`);
          setEmployees(employeesData);
          setAttendance(attendanceData);
          setSalaries(salariesData);
        }
        
        // Check if this is a new store (no products in Firebase)
        const isNewStore = productsData.length === 0;
        console.log(`[StoreApp] Is new store? ${isNewStore}`);
        
        if (isNewStore && userRole === 'admin') {
          console.log(`[StoreApp] Initializing new store data for admin`);
          // Only admins can initialize store data
          const storeProducts = createStoreSpecificProducts(storeId);
          const storeCustomers = createStoreSpecificCustomers(storeId);
          const storeEmployees = createStoreSpecificEmployees(storeId);
          
          // Save initial data to Firebase
          await Promise.all([
            ...storeProducts.map(product => dataService.saveProduct(storeId, product)),
            ...storeCustomers.map(customer => dataService.saveCustomer(storeId, customer)),
            ...storeEmployees.map(employee => dataService.saveEmployee(storeId, employee))
          ]);
          
          setProducts(storeProducts);
          setCustomers(storeCustomers);
          setEmployees(storeEmployees);
        }
        
        console.log(`[StoreApp] Initial data loading completed successfully`);
      } catch (error) {
        console.error('[StoreApp] Error loading initial data:', error);
        console.error('[StoreApp] Error details:', error.message, error.code);
        
        // Show error to user instead of falling back to localStorage
        alert(`Failed to load store data: ${error.message}. Please check your internet connection and try again.`);
        
        // Set empty state to prevent UI from showing stale data
        setProducts(createStoreSpecificProducts(storeId));
        setCustomers(createStoreSpecificCustomers(storeId));
        setInvoices([]);
        setEmployees(createStoreSpecificEmployees(storeId));
        setAttendance([]);
        setSalaries([]);
      } finally {
        console.log(`[StoreApp] Setting isLoading to false`);
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Set up real-time subscriptions
    console.log(`[StoreApp] Setting up real-time subscription for products`);
    const unsubscribeProducts = dataService.subscribeToProducts(storeId, (newProducts) => {
      console.log(`[StoreApp] Real-time products update: ${newProducts.length} products`);
      console.log(`[StoreApp] Setting products state from subscription with ${newProducts.length} products`);
      if (newProducts.length > 0) {
        console.log(`[StoreApp] First product from subscription:`, {
          id: newProducts[0].id,
          name: newProducts[0].name,
          category: newProducts[0].category
        });
      }
      setProducts(newProducts);
    });

    // Set up real-time subscription for customers
    console.log(`[StoreApp] Setting up real-time subscription for customers`);
    const unsubscribeCustomers = dataService.subscribeToCustomers(storeId, (newCustomers) => {
      console.log(`[StoreApp] Real-time customers update: ${newCustomers.length} customers`);
      console.log(`[StoreApp] Setting customers state from subscription with ${newCustomers.length} customers`);
      if (newCustomers.length > 0) {
        console.log(`[StoreApp] First customer from subscription:`, {
          id: newCustomers[0].id,
          name: newCustomers[0].name,
          phone: newCustomers[0].phone
        });
      }
      setCustomers(newCustomers);
    });

    // Set up real-time subscription for invoices
    console.log(`[StoreApp] Setting up real-time subscription for invoices`);
    const unsubscribeInvoices = dataService.subscribeToInvoices(storeId, (newInvoices) => {
      console.log(`[StoreApp] Real-time invoices update: ${newInvoices.length} invoices`);
      console.log(`[StoreApp] Setting invoices state from subscription with ${newInvoices.length} invoices`);
      if (newInvoices.length > 0) {
        console.log(`[StoreApp] First invoice from subscription:`, {
          id: newInvoices[0].id,
          date: newInvoices[0].date,
          customerName: newInvoices[0].customerName,
          grandTotal: newInvoices[0].grandTotal
        });
      }
      setInvoices(newInvoices);
    });

    // Cleanup subscriptions on unmount
    return () => {
      console.log(`[StoreApp] Cleaning up subscriptions`);
      unsubscribeProducts();
      unsubscribeCustomers();
      unsubscribeInvoices();
    };
  }, [storeId, userRole]);


  const saveAllCustomers = async (customersToSave: Customer[]) => {
    try {
      for (const customer of customersToSave) {
        await dataService.saveCustomer(storeId, customer);
      }
    } catch (error) {
      console.error('Error saving customers:', error);
    }
  };

  const saveAllInvoices = async (invoicesToSave: Invoice[]) => {
    try {
      // Save invoices without stock update (for existing invoices)
      // Stock should only be deducted when invoice is first created
      for (const invoice of invoicesToSave) {
        await dataService.saveInvoice(storeId, invoice);
      }
    } catch (error) {
      console.error('Error saving invoices:', error);
    }
  };

  const saveAllEmployees = async (employeesToSave: Employee[]) => {
    try {
      for (const employee of employeesToSave) {
        await dataService.saveEmployee(storeId, employee);
      }
    } catch (error) {
      console.error('Error saving employees:', error);
    }
  };

  const saveAllAttendance = async (attendanceToSave: AttendanceRecord[]) => {
    try {
      for (const record of attendanceToSave) {
        await dataService.saveAttendance(storeId, record);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  };

  const saveAllSalaries = async (salariesToSave: SalaryRecord[]) => {
    try {
      for (const record of salariesToSave) {
        await dataService.saveSalary(storeId, record);
      }
    } catch (error) {
      console.error('Error saving salaries:', error);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    try {
      await dataService.deleteInvoice(storeId, invoiceId);
      // Update local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      alert('Invoice deleted successfully!');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert(`Error deleting invoice: ${error.message}`);
    }
  };

  // Note: Products are saved individually in ProductsView when created/edited
  // and via saveInvoiceWithStockUpdate in POSView when sold
  // We don't need to save all products here as it causes unnecessary writes and logs

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveAllCustomers(customers);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [customers, storeId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveAllInvoices(invoices);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [invoices, storeId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveAllEmployees(employees);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [employees, storeId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveAllAttendance(attendance);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [attendance, storeId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveAllSalaries(salaries);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [salaries, storeId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        dataService.saveBusinessSettings(storeId, business).catch(console.error);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [business, storeId, isLoading]);

  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  // Online/offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const SidebarContent = () => {
    const availableMenus = (Object.keys(IconMap) as Array<keyof typeof IconMap>).filter(key => {
      // Role-based menu filtering
      switch (userRole) {
        case 'admin':
          return true; // Admins see everything
          
        case 'manager':
          // Managers see: POS, Products, Categories, Customers, Invoices, Settings
          return ['pos', 'products', 'categories', 'customers', 'invoices', 'settings'].includes(key);
          
        case 'salesman':
          // Salesmen see: POS, Products, Customers, Invoices, Settings
          return ['pos', 'products', 'customers', 'invoices', 'settings'].includes(key);
          
        case 'cashier':
          // Cashiers see: POS, Products, Customers, Settings
          return ['pos', 'products', 'customers', 'settings'].includes(key);
          
        default:
          return false;
      }
    });

    // Add stock history for admin and manager only
    const finalMenus = availableMenus.filter(key => {
      if (key === 'stockHistory') {
        return userRole === 'admin' || userRole === 'manager';
      }
      return true;
    });

    return (
      <>
        <div className="p-4 lg:p-6 flex items-center justify-between lg:justify-start gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white leading-none">Labinitial</span>
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider mt-1">{userRole} Mode</span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto no-scrollbar">
          <ul className="space-y-2 px-2 lg:px-4">
            {finalMenus.map((key) => {
              const Icon = IconMap[key];
              const isActive = activeTab === key;
              return (
                <li key={key}>
                  <button
                    onClick={() => {
                      setActiveTab(key);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium">{t(key)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium">{t('logout')}</span>
          </button>
        </div>
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your store data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm no-print"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out no-print
        lg:translate-x-0 lg:static lg:flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm flex-shrink-0 no-print">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg lg:text-xl font-bold text-gray-800 capitalize">{t(activeTab)}</h2>
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Online/Offline Status Indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            {/* Save Button for Settings Tab */}
            {activeTab === 'settings' && (
              <button 
                onClick={() => {
                  // Save settings to Firebase
                  dataService.saveBusinessSettings(storeId, business).then(() => {
                    alert("Settings Saved!");
                  }).catch(error => {
                    console.error('Error saving settings:', error);
                    alert('Failed to save settings. Please try again.');
                  });
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Save
              </button>
            )}
            
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
              <span className={`cursor-pointer px-2 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`} onClick={() => setLang('en')}>EN</span>
              <span className={`cursor-pointer px-2 py-1 rounded-full text-xs font-bold transition-all ${lang === 'bn' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`} onClick={() => setLang('bn')}>BN</span>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 text-sm lg:text-base">
              {business.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-3 lg:p-6 w-full relative print:p-0 print:bg-white">
          {activeTab === 'pos' && (
            <POSView 
              products={products} 
              customers={customers} 
              setCustomers={setCustomers}
              invoices={invoices}
              setInvoices={setInvoices}
              t={t} 
              onAddInvoice={async (inv) => {
                try {
                  // Save invoice with stock update immediately
                  await dataService.saveInvoiceWithStockUpdate(storeId, inv);
                  
                  // Update local state
                  setInvoices([inv, ...invoices]);
                  if (inv.dueAmount > 0 || inv.dueAmount < 0) {
                    setCustomers(prev => prev.map(c => 
                      c.name === inv.customerName ? { ...c, totalDue: c.totalDue + inv.dueAmount } : c
                    ));
                  }
                  
                  // Don't update local product stock here - real-time subscription will handle it
                  // This prevents double stock deduction display issues
                } catch (error) {
                  console.error('Error saving invoice:', error);
                  alert(`Error creating invoice: ${error.message}`);
                  // Don't update state if save failed
                }
              }}
              business={business}
              userRole={userRole}
              userName={userName}
              storeId={storeId}
            />
          )}
          {activeTab === 'categories' && (userRole === 'admin' || userRole === 'manager') && (
            <CategoriesView 
              storeId={storeId}
              t={t}
              userRole={userRole}
              business={business}
            />
          )}
          {activeTab === 'products' && (
            <ProductsView 
              storeId={storeId}
              t={t} 
              userRole={userRole}
              business={business}
              userName={userName}
            />
          )}
          {activeTab === 'customers' && (
            <CustomersView 
              customers={customers} 
              setCustomers={setCustomers} 
              t={t} 
              userRole={userRole}
              business={business}
            />
          )}
          {activeTab === 'employees' && (
            <EmployeesView 
              employees={employees} 
              setEmployees={setEmployees}
              attendance={attendance}
              setAttendance={setAttendance}
              salaries={salaries}
              setSalaries={setSalaries}
              t={t} 
              business={business}
            />
          )}
          {activeTab === 'invoices' && (
            <InvoicesView 
              invoices={invoices} 
              t={t} 
              business={business}
              storeId={storeId}
              onDeleteInvoice={handleDeleteInvoice}
            />
          )}
          {activeTab === 'reports' && userRole === 'admin' && (
             <ReportsView invoices={invoices} t={t} business={business} />
          )}
          {activeTab === 'settings' && (
             <SettingsView 
               business={business} 
               setBusiness={setBusiness} 
               t={t} 
               userRole={userRole}
               storeId={storeId}
               onSave={() => {
                 // Immediately save settings to Firebase
                 dataService.saveBusinessSettings(storeId, business).catch(error => {
                   console.error('Error saving settings:', error);
                   alert('Failed to save settings. Please try again.');
                 });
               }}
             />
          )}
          {activeTab === 'roles' && userRole === 'admin' && (
             <RoleManagementView 
               storeId={storeId}
               t={t}
               userRole={userRole}
               business={business}
             />
          )}
          {activeTab === 'stockHistory' && (userRole === 'admin' || userRole === 'manager') && (
             <StockHistoryView 
               storeId={storeId}
               t={t}
               userRole={userRole}
               business={business}
             />
          )}
        </main>
      </div>
    </div>
  );
};

export default StoreApp;
