import React, { useState, useEffect } from 'react';
import { History, Filter, Download, Search, Calendar, Package, User, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { StockHistory, Product } from '../../types';
import { dataService } from '../../services/firebaseService';

const StockHistoryView = ({ storeId, t, userRole, business }: { 
  storeId: string,
  t: (key: string) => string,
  userRole: string,
  business: any
}) => {
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<StockHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [historyData, productsData] = await Promise.all([
          dataService.getStockHistory(storeId),
          dataService.getProducts(storeId)
        ]);
        
        setStockHistory(historyData);
        setFilteredHistory(historyData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading stock history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Subscribe to real-time updates
    const unsubscribe = dataService.subscribeToStockHistory(storeId, (newHistory) => {
      setStockHistory(newHistory);
      applyFilters(newHistory, selectedProduct, selectedType, dateRange, searchTerm);
    });
    
    return () => unsubscribe();
  }, [storeId]);
  
  // Apply filters
  const applyFilters = (
    history: StockHistory[], 
    productId: string, 
    type: string, 
    dateRange: { start: string; end: string },
    search: string
  ) => {
    let filtered = [...history];
    
    // Filter by product
    if (productId !== 'all') {
      filtered = filtered.filter(item => item.productId === productId);
    }
    
    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(item => item.changeType === type);
    }
    
    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        return itemDate >= dateRange.start;
      });
    }
    
    if (dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        return itemDate <= dateRange.end;
      });
    }
    
    // Filter by search term
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(term) ||
        item.barcode?.toLowerCase().includes(term) ||
        item.performedBy.toLowerCase().includes(term) ||
        item.reason?.toLowerCase().includes(term) ||
        item.referenceId?.toLowerCase().includes(term)
      );
    }
    
    setFilteredHistory(filtered);
  };
  
  useEffect(() => {
    applyFilters(stockHistory, selectedProduct, selectedType, dateRange, searchTerm);
  }, [selectedProduct, selectedType, dateRange, searchTerm, stockHistory]);
  
  // Get product name by ID
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : productId;
  };
  
  // Get change type color and label
  const getChangeTypeInfo = (type: string) => {
    switch (type) {
      case 'add':
        return { color: 'bg-green-100 text-green-800', label: 'Stock Added', icon: '➕' };
      case 'remove':
        return { color: 'bg-red-100 text-red-800', label: 'Stock Removed', icon: '➖' };
      case 'sale':
        return { color: 'bg-blue-100 text-blue-800', label: 'Sale', icon: '💰' };
      case 'initial':
        return { color: 'bg-purple-100 text-purple-800', label: 'Initial Stock', icon: '📦' };
      case 'adjust':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Adjustment', icon: '⚙️' };
      case 'return':
        return { color: 'bg-cyan-100 text-cyan-800', label: 'Return', icon: '↩️' };
      case 'damage':
        return { color: 'bg-orange-100 text-orange-800', label: 'Damage', icon: '⚠️' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: type, icon: '📝' };
    }
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Product', 'Barcode', 'Type', 'Quantity', 'Previous Stock', 'New Stock', 'Reason', 'Performed By', 'Role', 'Reference ID'];
    
    const csvData = filteredHistory.map(item => {
      const date = new Date(item.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${item.productName}"`,
        item.barcode || '',
        getChangeTypeInfo(item.changeType).label,
        item.quantity > 0 ? `+${item.quantity}` : item.quantity.toString(),
        item.previousStock,
        item.newStock,
        `"${item.reason || ''}"`,
        `"${item.performedBy}"`,
        item.performedByRole,
        item.referenceId || ''
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculate summary
  const calculateSummary = () => {
    const summary = {
      totalAdditions: 0,
      totalRemovals: 0,
      netChange: 0,
      uniqueProducts: new Set(filteredHistory.map(item => item.productId)).size,
      uniqueUsers: new Set(filteredHistory.map(item => item.performedBy)).size
    };
    
    filteredHistory.forEach(item => {
      if (item.quantity > 0) {
        summary.totalAdditions += item.quantity;
      } else {
        summary.totalRemovals += Math.abs(item.quantity);
      }
      summary.netChange += item.quantity;
    });
    
    return summary;
  };
  
  const summary = calculateSummary();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock history...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Stock History & Audit</h2>
          <p className="text-gray-600">Track all stock changes and inventory movements</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Additions</p>
              <p className="text-2xl font-bold text-green-600">+{summary.totalAdditions}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">➕</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Removals</p>
              <p className="text-2xl font-bold text-red-600">-{summary.totalRemovals}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">➖</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Change</p>
              <p className={`text-2xl font-bold ${summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.netChange >= 0 ? '+' : ''}{summary.netChange}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <History className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Products Tracked</p>
              <p className="text-2xl font-bold text-purple-600">{summary.uniqueProducts}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Product Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.barcode ? `(${product.barcode})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="add">Stock Added</option>
              <option value="remove">Stock Removed</option>
              <option value="sale">Sale</option>
              <option value="initial">Initial Stock</option>
              <option value="adjust">Adjustment</option>
              <option value="return">Return</option>
              <option value="damage">Damage</option>
            </select>
          </div>
          
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, barcode, user, reason..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Active Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedProduct !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Product: {getProductName(selectedProduct)}
              <button onClick={() => setSelectedProduct('all')} className="ml-2 text-indigo-600 hover:text-indigo-800">×</button>
            </span>
          )}
          {selectedType !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Type: {getChangeTypeInfo(selectedType).label}
              <button onClick={() => setSelectedType('all')} className="ml-2 text-indigo-600 hover:text-indigo-800">×</button>
            </span>
          )}
          {(dateRange.start || dateRange.end) && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Date: {dateRange.start} to {dateRange.end}
              <button onClick={() => setDateRange({ start: '', end: '' })} className="ml-2 text-indigo-600 hover:text-indigo-800">×</button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm('')} className="ml-2 text-indigo-600 hover:text-indigo-800">×</button>
            </span>
          )}
          {(selectedProduct !== 'all' || selectedType !== 'all' || dateRange.start || dateRange.end || searchTerm) && (
            <button
              onClick={() => {
                setSelectedProduct('all');
                setSelectedType('all');
                setDateRange({ start: '', end: '' });
                setSearchTerm('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
      
      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          Showing {filteredHistory.length} of {stockHistory.length} records
          {filteredHistory.length !== stockHistory.length && ' (filtered)'}
        </p>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No stock history found</h3>
            <p className="text-gray-500">Try adjusting your filters or add some stock to products</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-medium text-gray-600">Date & Time</th>
                  <th className="p-4 font-medium text-gray-600">Product</th>
                  <th className="p-4 font-medium text-gray-600">Type</th>
                  <th className="p-4 font-medium text-gray-600">Quantity</th>
                  <th className="p-4 font-medium text-gray-600">Stock Change</th>
                  <th className="p-4 font-medium text-gray-600">Performed By</th>
                  <th className="p-4 font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.map((item) => {
                  const date = new Date(item.timestamp);
                  const typeInfo = getChangeTypeInfo(item.changeType);
                  const isPositive = item.quantity > 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">
                          {date.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {date.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        {item.barcode && (
                          <div className="text-xs text-gray-500 font-mono">{item.barcode}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                          <span className="mr-1">{typeInfo.icon}</span>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{item.quantity}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{item.previousStock}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium">{item.newStock}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{item.performedBy}</div>
                            <div className="text-xs text-gray-500 capitalize">{item.performedByRole}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-700">{item.reason || '—'}</div>
                        {item.referenceId && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            Ref: {item.referenceId}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Pagination/Info */}
      <div className="text-center text-sm text-gray-500">
        <p>Stock history is automatically tracked for all product changes</p>
        <p className="mt-1">Use filters to find specific records or export for detailed analysis</p>
      </div>
    </div>
  );
};

export default StockHistoryView;
