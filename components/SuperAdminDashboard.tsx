import React, { useState, useEffect } from 'react';
import { 
  UserCog, 
  LogOut, 
  Search, 
  Lock, 
  Unlock, 
  Infinity as InfinityIcon,
  FileText,
  Users,
  DollarSign,
  Store,
  Calendar,
  Filter,
  TrendingUp,
  Download
} from 'lucide-react';
import { StoreAccount } from '../types';
import { dataService } from '../services/firebaseService';

interface StoreAnalytics {
  storeId: string;
  storeName: string;
  invoiceCount: number;
  customerCount: number;
  totalProfit: number;
  lastUpdated: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const SuperAdminDashboard = ({ 
  stores, 
  setStores, 
  onLogout 
}: { 
  stores: StoreAccount[], 
  setStores: React.Dispatch<React.SetStateAction<StoreAccount[]>>, 
  onLogout: () => void 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [storeAnalytics, setStoreAnalytics] = useState<StoreAnalytics[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Fetch analytics for all stores
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const analytics: StoreAnalytics[] = [];
        
        for (const store of stores) {
          try {
            // Try to fetch invoices for the store
            let allInvoices = [];
            try {
              allInvoices = await dataService.getInvoices(store.id);
            } catch (invoiceError) {
              console.warn(`Could not fetch invoices for store ${store.id}:`, invoiceError.message);
              // Use empty array if permission denied
              allInvoices = [];
            }
            
            // Filter invoices by date range
            const invoices = allInvoices.filter(invoice => {
              const invoiceDate = new Date(invoice.date);
              const startDate = new Date(dateRange.startDate);
              const endDate = new Date(dateRange.endDate);
              endDate.setHours(23, 59, 59, 999); // Include entire end date
              return invoiceDate >= startDate && invoiceDate <= endDate;
            });
            
            // Try to fetch customers for the store
            let customers = [];
            try {
              customers = await dataService.getCustomers(store.id);
            } catch (customerError) {
              console.warn(`Could not fetch customers for store ${store.id}:`, customerError.message);
              // Use empty array if permission denied
              customers = [];
            }
            
            // Calculate total profit from invoices
            const totalProfit = invoices.reduce((sum, invoice) => {
              return sum + (invoice.totalAmount || 0);
            }, 0);
            
            analytics.push({
              storeId: store.id,
              storeName: store.name,
              invoiceCount: invoices.length,
              customerCount: customers.length,
              totalProfit,
              lastUpdated: new Date().toISOString()
            });
          } catch (error) {
            console.error(`Error fetching analytics for store ${store.id}:`, error);
            // Add placeholder data if fetch fails
            analytics.push({
              storeId: store.id,
              storeName: store.name,
              invoiceCount: 0,
              customerCount: 0,
              totalProfit: 0,
              lastUpdated: new Date().toISOString()
            });
          }
        }
        
        setStoreAnalytics(analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    if (stores.length > 0) {
      fetchAnalytics();
    }
  }, [stores, dateRange]);

  const toggleStatus = (id: string) => {
    setStores(stores.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s));
  };

  const updateExpiry = (id: string, days: number | 'unlimited') => {
    setStores(stores.map(s => {
      if (s.id !== id) return s;
      if (days === 'unlimited') return { ...s, expiryDate: null };
      
      const current = s.expiryDate && new Date(s.expiryDate) > new Date() ? new Date(s.expiryDate) : new Date();
      current.setDate(current.getDate() + days);
      return { ...s, expiryDate: current.toISOString().split('T')[0] };
    }));
  };

  const filteredStores = stores.filter(s => 
     s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalInvoices = storeAnalytics.reduce((sum, a) => sum + a.invoiceCount, 0);
  const totalCustomers = storeAnalytics.reduce((sum, a) => sum + a.customerCount, 0);
  const totalProfit = storeAnalytics.reduce((sum, a) => sum + a.totalProfit, 0);
  const activeStores = stores.filter(s => s.status === 'active').length;
  const pausedStores = stores.filter(s => s.status === 'paused').length;

  const getStoreAnalytics = (storeId: string) => {
    return storeAnalytics.find(a => a.storeId === storeId) || {
      storeId,
      storeName: '',
      invoiceCount: 0,
      customerCount: 0,
      totalProfit: 0,
      lastUpdated: ''
    };
  };

  const exportAnalytics = () => {
    const csvContent = [
      ['Store Name', 'Email', 'Status', 'Invoices', 'Customers', 'Total Profit', 'Last Updated'],
      ...stores.map(store => {
        const analytics = getStoreAnalytics(store.id);
        return [
          store.name,
          store.email,
          store.status,
          analytics.invoiceCount.toString(),
          analytics.customerCount.toString(),
          `$${analytics.totalProfit.toFixed(2)}`,
          new Date(analytics.lastUpdated).toLocaleDateString()
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2 font-bold text-xl">
           <UserCog className="w-6 h-6 text-indigo-400" />
           <span>Super Admin Dashboard</span>
        </div>
        <button onClick={onLogout} className="text-gray-300 hover:text-white flex items-center gap-2">
           <LogOut className="w-4 h-4"/> Logout
        </button>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
           {/* Analytics Header */}
           <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div>
                 <h2 className="text-xl font-bold text-gray-800">Store Analytics Dashboard</h2>
                 <p className="text-gray-600 text-sm">Monitor all store activities and performance metrics</p>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                   <Calendar className="w-4 h-4 text-gray-500" />
                   <input
                     type="date"
                     value={dateRange.startDate}
                     onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                     className="bg-transparent text-sm outline-none"
                   />
                   <span className="text-gray-400">to</span>
                   <input
                     type="date"
                     value={dateRange.endDate}
                     onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                     className="bg-transparent text-sm outline-none"
                   />
                   <Filter className="w-4 h-4 text-gray-500" />
                 </div>
                 
                 <button
                   onClick={exportAnalytics}
                   className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                 >
                   <Download className="w-4 h-4" />
                   Export CSV
                 </button>
               </div>
             </div>

             {/* Summary Stats */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
               <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-blue-700 font-medium">Total Stores</p>
                     <p className="text-2xl font-bold text-blue-900">{stores.length}</p>
                   </div>
                   <Store className="w-8 h-8 text-blue-600 opacity-70" />
                 </div>
               </div>
               
               <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-emerald-700 font-medium">Total Invoices</p>
                     <p className="text-2xl font-bold text-emerald-900">{totalInvoices}</p>
                   </div>
                   <FileText className="w-8 h-8 text-emerald-600 opacity-70" />
                 </div>
               </div>
               
               <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-purple-700 font-medium">Total Customers</p>
                     <p className="text-2xl font-bold text-purple-900">{totalCustomers}</p>
                   </div>
                   <Users className="w-8 h-8 text-purple-600 opacity-70" />
                 </div>
               </div>
               
               <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-amber-700 font-medium">Total Profit</p>
                     <p className="text-2xl font-bold text-amber-900">${totalProfit.toFixed(2)}</p>
                   </div>
                   <DollarSign className="w-8 h-8 text-amber-600 opacity-70" />
                 </div>
               </div>
               
               <div className="bg-gradient-to-r from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-rose-700 font-medium">Active Stores</p>
                     <p className="text-2xl font-bold text-rose-900">{activeStores}/{stores.length}</p>
                   </div>
                   <TrendingUp className="w-8 h-8 text-rose-600 opacity-70" />
                 </div>
               </div>
             </div>

             {loadingAnalytics && (
               <div className="text-center py-8">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 <p className="text-gray-500 mt-2">Loading analytics...</p>
               </div>
             )}
           </div>

           {/* Store Analytics Table */}
           <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                 <h2 className="font-bold text-gray-700">Store Analytics & Management</h2>
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                       placeholder="Search stores..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                    />
                 </div>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                       <tr>
                          <th className="p-4">Store Name</th>
                          <th className="p-4">Login (Email)</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Invoices</th>
                          <th className="p-4">Customers</th>
                          <th className="p-4">Total Profit</th>
                          <th className="p-4">Subscription Expires</th>
                          <th className="p-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {filteredStores.map(store => {
                          const isExpired = store.expiryDate && new Date(store.expiryDate) < new Date();
                          const analytics = getStoreAnalytics(store.id);
                          
                          return (
                            <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                               <td className="p-4 font-medium text-gray-800">{store.name}</td>
                               <td className="p-4 text-gray-600">{store.email}</td>
                               <td className="p-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${store.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                     {store.status}
                                  </span>
                               </td>
                               <td className="p-4">
                                 <div className="flex items-center gap-2">
                                   <FileText className="w-4 h-4 text-gray-400" />
                                   <span className="font-medium">{analytics.invoiceCount}</span>
                                 </div>
                               </td>
                               <td className="p-4">
                                 <div className="flex items-center gap-2">
                                   <Users className="w-4 h-4 text-gray-400" />
                                   <span className="font-medium">{analytics.customerCount}</span>
                                 </div>
                               </td>
                               <td className="p-4">
                                 <div className="flex items-center gap-2">
                                   <DollarSign className="w-4 h-4 text-gray-400" />
                                   <span className="font-medium text-emerald-600">${analytics.totalProfit.toFixed(2)}</span>
                                 </div>
                               </td>
                               <td className="p-4">
                                  {store.expiryDate ? (
                                     <span className={isExpired ? 'text-red-500 font-bold' : 'text-gray-600'}>
                                        {store.expiryDate} {isExpired && '(Expired)'}
                                     </span>
                                  ) : (
                                     <span className="flex items-center gap-1 text-indigo-600 font-bold"><InfinityIcon className="w-4 h-4"/> Unlimited</span>
                                  )}
                               </td>
                               <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                     <button 
                                        onClick={() => toggleStatus(store.id)}
                                        className={`p-2 rounded-lg transition-colors ${store.status === 'active' ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                                        title={store.status === 'active' ? 'Pause Store' : 'Activate Store'}
                                     >
                                        {store.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                     </button>
                                     
                                     <div className="h-6 w-px bg-gray-200 mx-1"></div>

                                     <button onClick={() => updateExpiry(store.id, 7)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600 font-medium">+7 Days</button>
                                     <button onClick={() => updateExpiry(store.id, 30)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600 font-medium">+1 Mo</button>
                                     <button onClick={() => updateExpiry(store.id, 'unlimited')} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="Set Unlimited">
                                        <InfinityIcon className="w-4 h-4" />
                                     </button>
                                  </div>
                               </td>
                            </tr>
                          );
                       })}
                       {filteredStores.length === 0 && (
                          <tr><td colSpan={8} className="p-8 text-center text-gray-400">No stores found.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Date Range Info */}
           <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
             <div className="flex items-center gap-2 text-blue-700 text-sm">
               <Calendar className="w-4 h-4" />
               <span>Analytics shown for period: <strong>{dateRange.startDate}</strong> to <strong>{dateRange.endDate}</strong></span>
             </div>
             <p className="text-blue-600 text-xs mt-1">
               Data includes invoices, customers, and profit calculations within the selected date range.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
