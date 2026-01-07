import React, { useState, useRef } from 'react';
import { UserPlus, Download, FileUp } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Customer, UserRole, BusinessSettings } from '../../types';
import { ExcelService } from '../../services/excelService';

const CustomersView = ({ customers, setCustomers, t, userRole, business }: { 
  customers: Customer[], 
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>, 
  t: (key: string) => string,
  userRole: UserRole,
  business: BusinessSettings
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: formData.name || 'New Customer',
      phone: formData.phone || '',
      address: formData.address || '',
      email: formData.email || undefined,
      nidCard: formData.nidCard || undefined,
      socialSecurityNumber: formData.socialSecurityNumber || undefined,
      cardNumber: formData.cardNumber || undefined,
      totalDue: 0
    };
    setCustomers(prev => [...prev, newCustomer]);
    setIsModalOpen(false);
    setFormData({});
  };

  // Export customers to CSV
  const handleExportCustomers = () => {
    if (customers.length === 0) {
      alert('No customers to export');
      return;
    }
    
    try {
      ExcelService.downloadCustomersCSV(customers, business);
    } catch (error) {
      console.error('Error exporting customers:', error);
      alert('Error exporting customers. Please try again.');
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

  // Import customers from CSV
  const handleImportCustomers = async () => {
    if (!importFile) {
      alert('Please select a CSV file first');
      return;
    }
    
    setIsImporting(true);
    setImportError('');
    
    try {
      // Parse CSV file
      const parsedCustomers = await ExcelService.parseCustomersFromCSV(importFile);
      
      if (parsedCustomers.length === 0) {
        throw new Error('No valid customers found in the CSV file');
      }
      
      setImportProgress({ current: 0, total: parsedCustomers.length });
      
      // Import customers one by one
      let successCount = 0;
      let skipCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < parsedCustomers.length; i++) {
        const customerData = parsedCustomers[i];
        
        try {
          // Check for existing customers with same phone number
          const existingByPhone = customers.find(c => c.phone === customerData.phone);
          
          // Determine what to do with this customer
          let action = 'add'; // 'add', 'skip', or 'update'
          let existingCustomer = null;
          
          if (existingByPhone) {
            // Customer with same phone exists - ask user what to do
            const shouldUpdate = confirm(
              `Customer "${customerData.name}" has the same phone "${customerData.phone}" as existing customer "${existingByPhone.name}".\n\n` +
              `Click OK to UPDATE the existing customer with new data.\n` +
              `Click Cancel to SKIP this customer.`
            );
            
            if (shouldUpdate) {
              action = 'update';
              existingCustomer = existingByPhone;
            } else {
              action = 'skip';
            }
          } else {
            // No duplicates found - add as new customer
            action = 'add';
          }
          
          if (action === 'skip') {
            skipCount++;
            continue;
          }
          
          // Create customer object
          const customer: Customer = {
            id: existingCustomer?.id || Date.now().toString() + '_' + i,
            name: customerData.name || 'Imported Customer',
            phone: customerData.phone || '',
            address: customerData.address || '',
            email: customerData.email || undefined,
            nidCard: customerData.nidCard || undefined,
            socialSecurityNumber: customerData.socialSecurityNumber || undefined,
            cardNumber: customerData.cardNumber || undefined,
            totalDue: existingCustomer?.totalDue || 0
          };
          
          // Add customer to state
          if (action === 'update') {
            setCustomers(prev => prev.map(c => 
              c.id === existingCustomer?.id ? customer : c
            ));
            updateCount++;
          } else {
            setCustomers(prev => [...prev, customer]);
            successCount++;
          }
          
        } catch (error) {
          console.error(`Error importing customer ${i + 1}:`, error);
          errorCount++;
        }
        
        // Update progress
        setImportProgress({ current: i + 1, total: parsedCustomers.length });
      }
      
      // Show results
      alert(`Import completed!\n\n` +
        `Added: ${successCount} new customers\n` +
        `Updated: ${updateCount} existing customers\n` +
        `Skipped: ${skipCount} customers (duplicates)\n` +
        `Failed: ${errorCount} customers`);
      
      // Reset import state
      setImportFile(null);
      setShowImportModal(false);
      setImportProgress(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      console.error('Error importing customers:', error);
      setImportError(error.message || 'Error importing customers. Please check the CSV format.');
    } finally {
      setIsImporting(false);
    }
  };

  // Download sample CSV template
  const downloadSampleTemplate = () => {
    const sampleCustomers: Customer[] = [
      {
        id: 'sample_1',
        name: 'Sample Customer 1',
        phone: '+8801712345678',
        address: '123 Main Street, Dhaka',
        email: 'customer1@example.com',
        nidCard: '1234567890123',
        socialSecurityNumber: 'SSN123456',
        cardNumber: 'CARD001',
        totalDue: 0
      },
      {
        id: 'sample_2',
        name: 'Sample Customer 2',
        phone: '+8801812345679',
        address: '456 Market Road, Chittagong',
        email: 'customer2@example.com',
        nidCard: '9876543210987',
        socialSecurityNumber: 'SSN654321',
        cardNumber: 'CARD002',
        totalDue: 0
      }
    ];
    
    ExcelService.downloadCustomersCSV(sampleCustomers, business, 'Customer_Import_Template');
  };

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">{t('customers')}</h2>
         <div className="flex items-center gap-3">
           {/* Import/Export Buttons */}
           <Button 
             variant="secondary" 
             onClick={handleExportCustomers}
             disabled={customers.length === 0}
             title="Export all customers to CSV"
           >
             <Download className="w-4 h-4"/> Export
           </Button>
           
           <Button 
             variant="secondary" 
             onClick={() => setShowImportModal(true)}
             title="Import customers from CSV"
           >
             <FileUp className="w-4 h-4"/> Import
           </Button>
           
           <Button onClick={() => setIsModalOpen(true)}>
             <UserPlus className="w-4 h-4"/> Add Customer
           </Button>
         </div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
             <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-lg text-gray-800">{c.name}</h3>
                   <p className="text-gray-500 text-sm">{c.phone}</p>
                   <p className="text-gray-400 text-xs mt-1">{c.address}</p>
                   {c.email && <p className="text-gray-400 text-xs">Email: {c.email}</p>}
                   {c.nidCard && <p className="text-gray-400 text-xs">NID: {c.nidCard}</p>}
                </div>
                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                   <span className="text-sm text-gray-500">Due Amount</span>
                   <span className={`font-bold ${c.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`}>{business.currency}{c.totalDue}</span>
                </div>
             </div>
          ))}
       </div>

       {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-4">Add Customer</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                     <Input label="Phone" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                     <div className="md:col-span-2">
                       <Input label="Address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                     </div>
                     <Input label="Email (optional)" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                     <Input label="NID Card (optional)" value={formData.nidCard || ''} onChange={e => setFormData({...formData, nidCard: e.target.value})} />
                     <Input label="Social Security No. (optional)" value={formData.socialSecurityNumber || ''} onChange={e => setFormData({...formData, socialSecurityNumber: e.target.value})} />
                     <Input label="Card Number (optional)" value={formData.cardNumber || ''} onChange={e => setFormData({...formData, cardNumber: e.target.value})} />
                   </div>
                   <div className="flex gap-3 mt-6">
                      <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">{t('cancel')}</Button>
                      <Button type="submit" className="flex-1">{t('save')}</Button>
                   </div>
                </form>
             </div>
          </div>
       )}

       {/* Import Customers Modal */}
       {showImportModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
               <h3 className="text-xl font-bold mb-4">Import Customers from CSV</h3>
               
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
                         Supports CSV files with customer data
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
                       <span className="text-gray-600">Importing customers...</span>
                       <span className="font-medium">
                         {importProgress.current} / {importProgress.total}
                       </span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2">
                       <div 
                         className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                         style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                       />
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
                     <li>• Required columns: <strong>Name, Phone, Address</strong></li>
                     <li>• Optional columns: <strong>Email, NID Card, Social Security Number, Card Number, Total Due</strong></li>
                     <li>• Customers with duplicate phone numbers will be skipped or updated</li>
                     <li>• Phone numbers must be unique</li>
                     <li>• Address can be empty but recommended</li>
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
                     onClick={handleImportCustomers}
                     className="flex-1"
                     disabled={!importFile || isImporting}
                   >
                     {isImporting ? 'Importing...' : 'Import Customers'}
                   </Button>
                 </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default CustomersView;
