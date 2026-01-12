import React, { useState, useEffect } from 'react';
import { History, Filter, Download, Search, Calendar, Package, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
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
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago (optimized for performance)
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllRecords, setShowAllRecords] = useState(false); // Toggle for showing all records
  const [performanceWarning, setPerformanceWarning] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Load data with server-side filtering
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setPerformanceWarning('');
      try {
        // Use server-side filtering for better performance
        // Only fetch records within the date range (or all if showAllRecords is true)
        const fetchStartDate = showAllRecords ? undefined : dateRange.start;
        const fetchEndDate = showAllRecords ? undefined : dateRange.end;
        const fetchProductId = selectedProduct !== 'all' ? selectedProduct : undefined;
        
        const [historyData, productsData] = await Promise.all([
          dataService.getStockHistory(storeId, fetchProductId, fetchStartDate, fetchEndDate),
          dataService.getProducts(storeId)
        ]);
        
        setStockHistory(historyData);
        
        // Apply additional client-side filters (type and search)
        let filtered = [...historyData];
        
        // Filter by type (if not 'all')
        if (selectedType !== 'all') {
          filtered = filtered.filter(item => item.changeType === selectedType);
        }
        
        // Filter by search term
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(item => 
            item.productName.toLowerCase().includes(term) ||
            item.barcode?.toLowerCase().includes(term) ||
            item.performedBy.toLowerCase().includes(term) ||
            item.reason?.toLowerCase().includes(term) ||
            item.referenceId?.toLowerCase().includes(term)
          );
        }
        
        // Ensure sorting by date descending (newest first)
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setFilteredHistory(filtered);
        setProducts(productsData);
        
        // Performance warnings
        if (historyData.length > 1000) {
          setPerformanceWarning(`⚠️ Loaded ${historyData.length} records. Consider using date filters for better performance.`);
        } else if (historyData.length > 5000) {
          setPerformanceWarning(`⚠️⚠️ Loaded ${historyData.length} records. Performance may be slow. Use date filters to reduce records.`);
        }
        
      } catch (error) {
        console.error('Error loading stock history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Subscribe to real-time updates with product filter if selected
    const unsubscribe = dataService.subscribeToStockHistory(
      storeId, 
      (newHistory) => {
        setStockHistory(newHistory);
        applyFilters(newHistory, selectedProduct, selectedType, dateRange, searchTerm);
      },
      selectedProduct !== 'all' ? selectedProduct : undefined
    );
    
    return () => unsubscribe();
  }, [storeId, selectedProduct, dateRange, showAllRecords]);
  
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
    
    // Filter by date range - FIXED: Use Date objects for accurate comparison
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        
        // Check start date
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          startDate.setHours(0, 0, 0, 0); // Start of day
          if (itemDate < startDate) {
            return false;
          }
        }
        
        // Check end date
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999); // End of day
          if (itemDate > endDate) {
            return false;
          }
        }
        
        return true;
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
    
    // Ensure sorting by date descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredHistory(filtered);
  };
  
  useEffect(() => {
    applyFilters(stockHistory, selectedProduct, selectedType, dateRange, searchTerm);
    // Reset to first page when filters change
    setCurrentPage(1);
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

  // Format date as dd-mm-yyyy
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format time as HH:MM:SS (24-hour format)
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Product', 'Barcode', 'Type', 'Quantity', 'Unit', 'Previous Stock', 'New Stock', 'Reason', 'Performed By', 'Role', 'Reference ID'];
    
    const csvData = filteredHistory.map(item => {
      const date = new Date(item.timestamp);
      return [
        formatDate(date),
        formatTime(date),
        `"${item.productName}"`,
        item.barcode || '',
        getChangeTypeInfo(item.changeType).label,
        item.quantity > 0 ? `+${item.quantity}` : item.quantity.toString(),
        item.unit || 'pc', // Include unit, default to 'pc'
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
  
  // Pagination calculations
  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredHistory.slice(startIndex, endIndex);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
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
        
        {/* Performance Warning & Show All Toggle */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {performanceWarning && (
            <div className="flex-1">
              <div className={`p-3 rounded-lg ${performanceWarning.includes('⚠️⚠️') ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm ${performanceWarning.includes('⚠️⚠️') ? 'text-red-700' : 'text-yellow-700'}`}>
                  {performanceWarning}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAllRecords(!showAllRecords);
                if (!showAllRecords) {
                  // When showing all records, clear date range
                  setDateRange({ start: '', end: '' });
                } else {
                  // When going back to filtered view, set to last 7 days
                  setDateRange({
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                showAllRecords 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showAllRecords ? 'Show Last 7 Days' : 'Show All Records'}
            </button>
            
            <button
              onClick={() => {
                setDateRange({
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end: new Date().toISOString().split('T')[0]
                });
                setShowAllRecords(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Last 30 Days
            </button>
            
            <button
              onClick={() => {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateRange({
                  start: firstDayOfMonth.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                });
                setShowAllRecords(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              This Month
            </button>
          </div>
        </div>
      </div>
      
      {/* Results Count & Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {totalItems} records
            {filteredHistory.length !== stockHistory.length && ' (filtered)'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4 inline" /> Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="text-gray-400">...</span>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Next <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
      </div>
      
      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {currentItems.length === 0 ? (
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
                  <th className="p-4 font-medium text-gray-600">
                    <div className="flex items-center gap-1">
                      Date & Time
                      <span className="text-indigo-600" title="Sorted by date (newest first)">↓</span>
                    </div>
                  </th>
                  <th className="p-4 font-medium text-gray-600">Product</th>
                  <th className="p-4 font-medium text-gray-600">Type</th>
                  <th className="p-4 font-medium text-gray-600">Quantity</th>
                  <th className="p-4 font-medium text-gray-600">Unit</th>
                  <th className="p-4 font-medium text-gray-600">Stock Change</th>
                  <th className="p-4 font-medium text-gray-600">Performed By</th>
                  <th className="p-4 font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentItems.map((item) => {
                  const date = new Date(item.timestamp);
                  const typeInfo = getChangeTypeInfo(item.changeType);
                  const isPositive = item.quantity > 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(date)}
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
                        <span className="text-sm text-gray-700">
                          {item.unit || 'pc'} {/* Default to 'pc' if unit is not available */}
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
