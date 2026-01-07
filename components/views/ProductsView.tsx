import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, Grid, List, Barcode, Download, FileUp } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Product, Category, UserRole, BusinessSettings } from '../../types';
import { dataService } from '../../services/firebaseService';
import { CurrencyService } from '../../services/currencyService';
import { ExcelService } from '../../services/excelService';

const ProductsView = ({ storeId, t, userRole, business, userName }: { 
  storeId: string,
  t: (key: string) => string,
  userRole: UserRole,
  business: BusinessSettings,
  userName: string
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(business.productViewMode || 'grid');
  const [isSaving, setIsSaving] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  
  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Load products and categories
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          dataService.getProducts(storeId),
          dataService.getCategories(storeId)
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const unsubscribeProducts = dataService.subscribeToProducts(storeId, (newProducts) => {
      setProducts(newProducts);
    });

    const unsubscribeCategories = dataService.subscribeToCategories(storeId, (newCategories) => {
      setCategories(newCategories);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [storeId]);

  // Pagination calculations
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentProducts = products.slice(startIndex, endIndex);
  
  // Bulk selection helpers
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };
  
  const toggleSelectAll = () => {
    if (isSelectAll) {
      // Deselect all on current page
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        currentProducts.forEach(p => newSet.delete(p.id));
        return newSet;
      });
      setIsSelectAll(false);
    } else {
      // Select all on current page
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        currentProducts.forEach(p => newSet.add(p.id));
        return newSet;
      });
      setIsSelectAll(true);
    }
  };
  
  const selectAllProducts = () => {
    setSelectedProducts(new Set(products.map(p => p.id)));
    setIsSelectAll(true);
  };
  
  const clearSelection = () => {
    setSelectedProducts(new Set());
    setIsSelectAll(false);
  };
  
  // Bulk delete function
  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select products to delete');
      return;
    }
    
    const confirmMessage = selectedProducts.size === 1 
      ? 'Are you sure you want to delete the selected product?'
      : `Are you sure you want to delete ${selectedProducts.size} selected products?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Delete products one by one
      const productIds = Array.from(selectedProducts) as string[];
      let successCount = 0;
      let errorCount = 0;
      
      for (const productId of productIds) {
        try {
          await dataService.deleteProduct(storeId, productId);
          successCount++;
        } catch (error) {
          console.error(`Error deleting product ${productId}:`, error);
          errorCount++;
        }
      }
      
      // Clear selection after deletion
      clearSelection();
      
      // Show results
      if (errorCount === 0) {
        alert(`Successfully deleted ${successCount} product(s)`);
      } else {
        alert(`Deleted ${successCount} product(s), ${errorCount} failed`);
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Error deleting products. Please try again.');
    }
  };
  
  // Bulk export function
  const handleBulkExport = () => {
    if (selectedProducts.size === 0) {
      alert('Please select products to export');
      return;
    }
    
    const selectedProductsList = products.filter(p => selectedProducts.has(p.id));
    
    try {
      ExcelService.downloadProductsCSV(selectedProductsList, categories, business, `Selected_Products_${new Date().toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Error exporting selected products:', error);
      alert('Error exporting products. Please try again.');
    }
  };
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    
    setIsSaving(true);
    setBarcodeError('');

    try {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const productId = editingProduct?.id || `product_${timestamp}_${randomSuffix}`;
      
      const product: Product = {
        id: productId,
        name: formData.name || 'New Product',
        barcode: formData.barcode?.trim() || '', // Barcode field
        category: formData.category || (categories.length > 0 ? categories[0].id : 'General'),
        price: Number(formData.price) || 0,
        purchasePrice: formData.purchasePrice !== undefined ? Number(formData.purchasePrice) : undefined,
        vat: Number(formData.vat) || 0,
        stock: Number(formData.stock) || 0,
        unit: formData.unit || 'pc',
        type: 'product',
        // Ensure image is null instead of undefined if not provided
        image: formData.image || null
      };

      // Use the new saveProductWithBarcode function
      await dataService.saveProductWithBarcode(storeId, product, userName, userRole);
      
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({});
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      // Handle barcode uniqueness error
      if (error.message && error.message.includes('Barcode')) {
        setBarcodeError(error.message);
      } else {
        alert('Error saving product. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
    setIsModalOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await dataService.deleteProduct(storeId, id);
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#3b82f6';
  };

  // Export products to CSV
  const handleExportProducts = () => {
    if (products.length === 0) {
      alert('No products to export');
      return;
    }
    
    try {
      ExcelService.downloadProductsCSV(products, categories, business);
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Error exporting products. Please try again.');
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    
    setImportFile(file);
    setImportError('');
  };

  // Import products from CSV
  const handleImportProducts = async () => {
    if (!importFile) {
      alert('Please select a CSV file first');
      return;
    }
    
    setIsImporting(true);
    setImportError('');
    
    try {
      // Parse CSV file
      const parsedProducts = await ExcelService.parseProductsFromCSV(importFile, categories);
      
      if (parsedProducts.length === 0) {
        throw new Error('No valid products found in the CSV file');
      }
      
      setImportProgress({ current: 0, total: parsedProducts.length });
      
      // Import products one by one
      let successCount = 0;
      let skipCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < parsedProducts.length; i++) {
        const productData = parsedProducts[i];
        
        try {
          // Check for existing products with same barcode OR same name
          const existingByBarcode = productData.barcode ? 
            products.find(p => p.barcode === productData.barcode) : null;
          
          const existingByName = products.find(p => 
            p.name.toLowerCase() === productData.name?.toLowerCase()
          );
          
          // Determine what to do with this product
          let action = 'add'; // 'add', 'skip', or 'update'
          let existingProduct = null;
          
          if (existingByBarcode) {
            // Product with same barcode exists - ask user what to do
            const shouldUpdate = confirm(
              `Product "${productData.name}" has the same barcode "${productData.barcode}" as existing product "${existingByBarcode.name}".\n\n` +
              `Click OK to UPDATE the existing product with new data.\n` +
              `Click Cancel to SKIP this product.`
            );
            
            if (shouldUpdate) {
              action = 'update';
              existingProduct = existingByBarcode;
            } else {
              action = 'skip';
            }
          } else if (existingByName) {
            // Product with same name exists (but different barcode) - ask user what to do
            const shouldUpdate = confirm(
              `Product "${productData.name}" has the same name as existing product.\n\n` +
              `Existing barcode: ${existingByName.barcode || 'None'}\n` +
              `New barcode: ${productData.barcode || 'None'}\n\n` +
              `Click OK to UPDATE the existing product with new data.\n` +
              `Click Cancel to ADD as new product (different barcode).`
            );
            
            if (shouldUpdate) {
              action = 'update';
              existingProduct = existingByName;
            } else {
              action = 'add';
            }
          } else {
            // No duplicates found - add as new product
            action = 'add';
          }
          
          if (action === 'skip') {
            skipCount++;
            continue;
          }
          
          // Create product object
          const product: Product = {
            id: existingProduct?.id || `imported_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: productData.name || 'Imported Product',
            barcode: productData.barcode?.trim() || '',
            category: productData.category || (categories.length > 0 ? categories[0].id : 'General'),
            price: Number(productData.price) || 0,
            purchasePrice: productData.purchasePrice !== undefined ? Number(productData.purchasePrice) : undefined,
            vat: Number(productData.vat) || 0,
            stock: action === 'update' && existingProduct ? 
              (existingProduct.stock + Number(productData.stock || 0)) : // Add to existing stock
              Number(productData.stock) || 0,
            unit: productData.unit || 'pc',
            type: productData.type || 'product',
            image: productData.image || (existingProduct?.image || null)
          };
          
          // Save product
          await dataService.saveProductWithBarcode(storeId, product, userName, userRole);
          
          if (action === 'update') {
            updateCount++;
          } else {
            successCount++;
          }
          
        } catch (error) {
          console.error(`Error importing product ${i + 1}:`, error);
          errorCount++;
        }
        
        // Update progress
        setImportProgress({ current: i + 1, total: parsedProducts.length });
      }
      
      // Show results
      alert(`Import completed!\n\n` +
        `Added: ${successCount} new products\n` +
        `Updated: ${updateCount} existing products\n` +
        `Skipped: ${skipCount} products (duplicates)\n` +
        `Failed: ${errorCount} products`);
      
      // Reset import state
      setImportFile(null);
      setShowImportModal(false);
      setImportProgress(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      console.error('Error importing products:', error);
      setImportError(error.message || 'Error importing products. Please check the CSV format.');
    } finally {
      setIsImporting(false);
    }
  };

  // Download sample CSV template
  const downloadSampleTemplate = () => {
    const sampleProducts: Product[] = [
      {
        id: 'sample_1',
        name: 'Sample Product 1',
        barcode: '123456789012',
        category: categories.length > 0 ? categories[0].id : 'General',
        price: 100,
        purchasePrice: 80,
        vat: 15,
        stock: 50,
        unit: 'pc',
        type: 'product',
        image: ''
      },
      {
        id: 'sample_2',
        name: 'Sample Product 2',
        barcode: '987654321098',
        category: categories.length > 0 ? categories[0].id : 'General',
        price: 200,
        purchasePrice: 150,
        vat: 10,
        stock: 25,
        unit: 'kg',
        type: 'product',
        image: ''
      }
    ];
    
    ExcelService.downloadProductsCSV(sampleProducts, categories, business, 'Product_Import_Template');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">{t('products')}</h2>
         <div className="flex items-center gap-3">
           <div className="flex bg-gray-100 rounded-lg p-1">
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
             >
               <Grid className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
             >
               <List className="w-4 h-4" />
             </button>
           </div>
           
           {/* Import/Export Buttons - Only for admin/manager */}
           {(userRole === 'admin' || userRole === 'manager') && (
             <>
               <Button 
                 variant="secondary" 
                 onClick={handleExportProducts}
                 disabled={products.length === 0}
                 title="Export all products to CSV"
               >
                 <Download className="w-4 h-4"/> Export All
               </Button>
               
               <Button 
                 variant="secondary" 
                 onClick={() => setShowImportModal(true)}
                 title="Import products from CSV"
               >
                 <FileUp className="w-4 h-4"/> Import
               </Button>
               
               <Button onClick={() => { setEditingProduct(null); setFormData({}); setIsModalOpen(true); }}>
                 <Plus className="w-4 h-4"/> {t('add_product')}
               </Button>
             </>
           )}
         </div>
       </div>

       {/* Bulk Actions Bar - Only show when products are selected */}
       {selectedProducts.size > 0 && (userRole === 'admin' || userRole === 'manager') && (
         <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between animate-slide-in">
           <div className="flex items-center gap-3">
             <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
               {selectedProducts.size} product(s) selected
             </div>
             <button 
               onClick={clearSelection}
               className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
             >
               Clear selection
             </button>
           </div>
           
           <div className="flex items-center gap-2">
             <Button 
               variant="secondary" 
               onClick={handleBulkExport}
               size="sm"
               title="Export selected products to CSV"
             >
               <Download className="w-4 h-4"/> Export Selected
             </Button>
             
             <Button 
               variant="danger" 
               onClick={handleBulkDelete}
               size="sm"
               title="Delete selected products"
             >
               <Trash2 className="w-4 h-4"/> Delete Selected
             </Button>
           </div>
         </div>
       )}

       {/* Pagination Controls */}
       {totalItems > 0 && (
         <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
           <div className="flex items-center gap-3">
             <span className="text-sm text-gray-600">
               Showing {startIndex + 1} to {endIndex} of {totalItems} products
             </span>
             <div className="flex items-center gap-2">
               <span className="text-sm text-gray-600">Items per page:</span>
               <select 
                 value={itemsPerPage}
                 onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                 className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               >
                 <option value="50">50</option>
                 <option value="100">100</option>
                 <option value="200">200</option>
                 <option value="500">500</option>
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
               Previous
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
               Next
             </button>
           </div>
         </div>
       )}

       {viewMode === 'list' ? (
         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-gray-50 border-b">
                  <tr>
                     {(userRole === 'admin' || userRole === 'manager') && (
                       <th className="p-4 w-12">
                         <div className="flex items-center">
                           <input
                             type="checkbox"
                             checked={isSelectAll}
                             onChange={toggleSelectAll}
                             className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                             title={isSelectAll ? "Deselect all on this page" : "Select all on this page"}
                           />
                         </div>
                       </th>
                     )}
                     <th className="p-4 font-medium text-gray-600">{t('name')}</th>
                     <th className="p-4 font-medium text-gray-600">{t('category')}</th>
                     <th className="p-4 font-medium text-gray-600">{t('price')}</th>
                     <th className="p-4 font-medium text-gray-600">{t('stock')}</th>
                     {(userRole === 'admin' || userRole === 'manager') && <th className="p-4 font-medium text-gray-600 text-right">Actions</th>}
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {currentProducts.map(p => (
                     <tr key={p.id} className="hover:bg-gray-50">
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <td className="p-4">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(p.id)}
                                onChange={() => toggleProductSelection(p.id)}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                              />
                            </div>
                          </td>
                        )}
                        <td className="p-4">
                       <div>
                         <div className="font-medium">{p.name}</div>
                         {p.barcode && (
                           <div className="text-xs text-gray-500 font-mono mt-1">
                             <Barcode className="w-3 h-3 inline mr-1" />
                             {p.barcode}
                           </div>
                         )}
                       </div>
                     </td>
                        <td className="p-4">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${getCategoryColor(p.category)}20`,
                              color: getCategoryColor(p.category),
                              border: `1px solid ${getCategoryColor(p.category)}40`
                            }}
                          >
                            {getCategoryName(p.category)}
                          </span>
                        </td>
                        <td className="p-4 font-bold">{CurrencyService.formatAmountWithSpace(p.price, business.currency)}</td>
                        <td className="p-4">{p.stock} {p.unit}</td>
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <td className="p-4 text-right">
                             <button onClick={() => openEdit(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded mr-2"><Edit className="w-4 h-4"/></button>
                             <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                          </td>
                        )}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentProducts.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow relative">
                {/* Bulk selection checkbox - top left corner */}
                {(userRole === 'admin' || userRole === 'manager') && (
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(p.id)}
                      onChange={() => toggleProductSelection(p.id)}
                      className="w-5 h-5 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      title={selectedProducts.has(p.id) ? "Deselect product" : "Select product"}
                    />
                  </div>
                )}
                
                {p.image && (
                  <div className="mb-3">
                    <img 
                      src={p.image} 
                      alt={p.name}
                      className="w-full h-40 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <div className="pl-8"> {/* Add padding to prevent text overlap with checkbox */}
                    <h3 className="font-bold text-gray-800 text-lg">{p.name}</h3>
                    {p.barcode && (
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        <Barcode className="w-3 h-3 inline mr-1" />
                        {p.barcode}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-indigo-600">{CurrencyService.formatAmountWithSpace(p.price, business.currency)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${getCategoryColor(p.category)}20`,
                      color: getCategoryColor(p.category),
                      border: `1px solid ${getCategoryColor(p.category)}40`
                    }}
                  >
                    {getCategoryName(p.category)}
                  </span>
                  <span className="text-sm text-gray-600">{p.stock} {p.unit}</span>
                </div>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => openEdit(p)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1"/> Edit
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => handleDelete(p.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-3 h-3 mr-1"/> Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
         </div>
       )}

       {products.length === 0 && (
         <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-6">Add your first product to start selling</p>
            {(userRole === 'admin' || userRole === 'manager') && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4"/> Add First Product
              </Button>
            )}
         </div>
       )}

       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
               <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
               <form onSubmit={handleSubmit} className="space-y-3">
                  <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Barcode/SKU (Optional)
                    </label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={formData.barcode || ''}
                        onChange={e => {
                          setFormData({...formData, barcode: e.target.value});
                          setBarcodeError('');
                        }}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${
                          barcodeError ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Leave empty for auto-generated barcode (001, 002, ...)"
                      />
                    </div>
                    {barcodeError && (
                      <p className="text-sm text-red-600">{barcodeError}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      • Enter manufacturer barcode (e.g., 831730009755) or custom SKU
                      <br />
                      • Leave empty for auto-generated 3-digit barcode (001, 002, 003...)
                      <br />
                      • Barcodes must be unique across all products
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select 
                      value={formData.category || ''}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <option value="General">General (No categories created yet)</option>
                      )}
                    </select>
                    {categories.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Create categories in the Categories menu for better organization
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                       <Input 
                         label="Unit Price (Selling)" 
                         type="number" 
                         value={formData.price || ''} 
                         onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                         required 
                       />
                       <p className="text-xs text-gray-500">
                         Price per unit you sell to customers
                       </p>
                     </div>
                     <div className="space-y-1">
                       <Input 
                         label="Purchase Price (Optional)" 
                         type="number" 
                         value={formData.purchasePrice || ''} 
                         onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} 
                       />
                       <p className="text-xs text-gray-500">
                         Price per unit you buy from supplier
                       </p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <Input label="VAT (%)" type="number" value={formData.vat || ''} onChange={e => setFormData({...formData, vat: Number(e.target.value)})} />
                     <div></div> {/* placeholder for alignment */}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                       <Input 
                         label="Stock" 
                         type="number" 
                         value={formData.stock || ''} 
                         onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
                         required 
                       />
                     </div>
                     <div className="space-y-1">
                       <Input 
                         label="Unit" 
                         value={formData.unit || ''} 
                         onChange={e => setFormData({...formData, unit: e.target.value})} 
                         placeholder="pc, kg, liter, etc."
                       />
                       <p className="text-xs text-gray-500">
                         Measurement unit for unit price (e.g., pc, kg, liter)
                       </p>
                     </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Image
                    </label>
                    
                    {/* Image URL Input */}
                    <Input 
                      label="Image URL (optional)" 
                      value={formData.image || ''} 
                      onChange={e => setFormData({...formData, image: e.target.value})} 
                      placeholder="https://example.com/image.jpg" 
                    />
                    
                    {/* File Upload */}
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Or Upload Image
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  // Show loading state
                                  const originalButtonText = e.target.parentElement?.textContent;
                                  if (e.target.parentElement) {
                                    e.target.parentElement.textContent = 'Uploading...';
                                  }
                                  
                                  // Generate product ID if not editing
                                  const productId = editingProduct?.id || `product_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                                  
                                  // Upload image
                                  const imageUrl = await dataService.uploadProductImage(storeId, productId, file);
                                  
                                  // Update form data with new image URL
                                  setFormData({...formData, image: imageUrl});
                                  
                                  // Reset file input
                                  e.target.value = '';
                                  
                                  // Restore button text
                                  if (e.target.parentElement) {
                                    e.target.parentElement.textContent = originalButtonText || 'Choose File';
                                  }
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  alert('Failed to upload image. Please try again.');
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors">
                            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">Click to upload image</span>
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF up to 5MB</p>
                          </div>
                        </label>
                        
                        {/* Image Preview */}
                        {formData.image && (
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <img 
                                src={formData.image} 
                                alt="Preview" 
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({...formData, image: ''})}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Images are automatically compressed and resized to 800x800px for optimal performance.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                     <Button 
                       type="button" 
                       variant="secondary" 
                       onClick={() => {
                         setIsModalOpen(false);
                         setBarcodeError('');
                       }} 
                       className="flex-1"
                       disabled={isSaving}
                     >
                       {t('cancel')}
                     </Button>
                     <Button 
                       type="submit" 
                       className="flex-1"
                       disabled={isSaving}
                     >
                       {isSaving ? 'Saving...' : t('save')}
                     </Button>
                  </div>
               </form>
            </div>
         </div>
       )}

       {/* Import Products Modal */}
       {showImportModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
               <h3 className="text-xl font-bold mb-4">Import Products from CSV</h3>
               
               <div className="space-y-4">
                 {/* File Selection */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Select CSV File
                   </label>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                     <input
                       type="file"
                       ref={fileInputRef}
                       accept=".csv"
                       onChange={handleFileSelect}
                       className="hidden"
                       id="csvFileInput"
                     />
                     <label htmlFor="csvFileInput" className="cursor-pointer block">
                       <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                       <p className="text-gray-600 font-medium">
                         {importFile ? importFile.name : 'Click to select CSV file'}
                       </p>
                       <p className="text-sm text-gray-500 mt-1">
                         Supports CSV files with product data
                       </p>
                     </label>
                   </div>
                   
                   {importFile && (
                     <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                       <p className="text-sm text-green-700">
                         ✓ File selected: <span className="font-medium">{importFile.name}</span>
                       </p>
                       <p className="text-xs text-green-600 mt-1">
                         Size: {(importFile.size / 1024).toFixed(2)} KB
                       </p>
                     </div>
                   )}
                 </div>
                 
                 {/* Import Progress */}
                 {importProgress && (
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-600">Importing products...</span>
                       <span className="font-medium">
                         {importProgress.current} / {importProgress.total}
                       </span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2">
                       <div 
                         className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                         style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                       ></div>
                     </div>
                   </div>
                 )}
                 
                 {/* Error Message */}
                 {importError && (
                   <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                     <p className="text-sm text-red-700">{importError}</p>
                   </div>
                 )}
                 
                 {/* Instructions */}
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                   <h4 className="font-medium text-blue-800 mb-2">CSV Format Instructions:</h4>
                   <ul className="text-sm text-blue-700 space-y-1">
                     <li>• Required columns: <strong>Name, Category, Price, Stock, Unit</strong></li>
                     <li>• Optional columns: <strong>Barcode, Purchase Price, VAT %, Type, Image URL</strong></li>
                     <li>• Products with duplicate barcodes will be skipped</li>
                     <li>• Category names should match existing categories</li>
                     <li>• Type should be either "product" or "service"</li>
                   </ul>
                 </div>
                 
                 {/* Actions */}
                 <div className="flex gap-3 pt-4">
                   <Button 
                     variant="secondary" 
                     onClick={downloadSampleTemplate}
                     className="flex-1"
                   >
                     Download Template
                   </Button>
                   
                   <Button 
                     variant="secondary" 
                     onClick={() => {
                       setShowImportModal(false);
                       setImportFile(null);
                       setImportError('');
                       setImportProgress(null);
                       if (fileInputRef.current) {
                         fileInputRef.current.value = '';
                       }
                     }}
                     className="flex-1"
                     disabled={isImporting}
                   >
                     Cancel
                   </Button>
                   
                   <Button 
                     onClick={handleImportProducts}
                     className="flex-1"
                     disabled={!importFile || isImporting}
                   >
                     {isImporting ? 'Importing...' : 'Import Products'}
                   </Button>
                 </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default ProductsView;
