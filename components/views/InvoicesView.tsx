import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Printer,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  Trash2
} from 'lucide-react';
import Button from '../ui/Button';
import InvoicePreview from './InvoicePreview';
import { Invoice, BusinessSettings } from '../../types';
import { PDFService } from '../../services/pdfService';
import { CurrencyService } from '../../services/currencyService';

type SortConfig = {
  key: keyof Invoice | 'date';
  direction: 'asc' | 'desc';
};

const ITEMS_PER_PAGE = 25;

const InvoicesView = ({ invoices, t, business, storeId, onDeleteInvoice }: { 
  invoices: Invoice[], 
  t: (key: string) => string, 
  business: BusinessSettings, 
  storeId: string,
  onDeleteInvoice?: (invoiceId: string) => Promise<void>
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // --- Handlers ---

  const handleSort = (key: keyof Invoice) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Invoice) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600" /> 
      : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  };

  // --- Data Processing ---

  const filteredAndSortedInvoices = useMemo(() => {
    // 1. Filter
    let result = invoices.filter(inv => 
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerPhone && inv.customerPhone.includes(searchTerm))
    );

    // 2. Sort
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchTerm, sortConfig]);

  // 3. Paginate
  const totalPages = Math.ceil(filteredAndSortedInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredAndSortedInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Generate PDF preview when user switches to PDF Preview tab
  useEffect(() => {
    const generatePdfPreview = async () => {
      if (selectedInvoice && showPdfPreview && !pdfPreviewUrl) {
        setIsGeneratingPDF(true);
        try {
          const doc = await PDFService.generateInvoicePDFForPreview(
            selectedInvoice, 
            business, 
            true, 
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
  }, [selectedInvoice, business, storeId, showPdfPreview, pdfPreviewUrl]);

  // Reset when invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      setPdfPreviewUrl(null);
      setShowPdfPreview(false);
      setIsGeneratingPDF(false);
    }
  }, [selectedInvoice]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h2 className="text-2xl font-bold text-gray-800">{t('invoices')}</h2>
         
         {/* Search Bar */}
         <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input 
              className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900" 
              placeholder="Search by ID, Name or Phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 border-b">
                  <tr>
                     <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('id')}>
                        <div className="flex items-center gap-2 font-medium text-gray-600">ID {getSortIcon('id')}</div>
                     </th>
                     <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('customerName')}>
                        <div className="flex items-center gap-2 font-medium text-gray-600">Customer {getSortIcon('customerName')}</div>
                     </th>
                     <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-2 font-medium text-gray-600">Date {getSortIcon('date')}</div>
                     </th>
                     <th className="p-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('grandTotal')}>
                        <div className="flex items-center justify-end gap-2 font-medium text-gray-600">Total {getSortIcon('grandTotal')}</div>
                     </th>
                     <th className="p-4 text-right hidden md:table-cell cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paidAmount')}>
                        <div className="flex items-center justify-end gap-2 font-medium text-gray-600">Paid {getSortIcon('paidAmount')}</div>
                     </th>
                     <th className="p-4 text-right hidden md:table-cell cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('dueAmount')}>
                        <div className="flex items-center justify-end gap-2 font-medium text-gray-600">Due {getSortIcon('dueAmount')}</div>
                     </th>
                     <th className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                        <div className="flex items-center justify-center gap-2 font-medium text-gray-600">Status {getSortIcon('status')}</div>
                     </th>
                     <th className="p-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {paginatedInvoices.map(inv => (
                     <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="p-4 font-mono font-medium text-indigo-600">#{inv.id.slice(-6)}</td>
                        <td className="p-4">
                           <div className="font-medium text-gray-900">{inv.customerName}</div>
                           <div className="text-xs text-gray-400">{inv.customerPhone}</div>
                        </td>
                        <td className="p-4 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="p-4 text-right font-bold text-gray-900">{CurrencyService.formatAmountWithSpace(inv.grandTotal, business.currency)}</td>
                        <td className="p-4 text-right hidden md:table-cell text-gray-600">{CurrencyService.formatAmountWithSpace(inv.paidAmount, business.currency)}</td>
                        <td className="p-4 text-right hidden md:table-cell">
                           {inv.dueAmount > 0 ? (
                              <span className="text-red-600 font-bold">{CurrencyService.formatAmountWithSpace(inv.dueAmount, business.currency)}</span>
                           ) : (
                              <span className="text-green-600 font-bold">0.00</span>
                           )}
                        </td>
                        <td className="p-4 text-center">
                           <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${inv.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                              {inv.status}
                           </span>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex justify-end gap-1">
                             <button 
                               onClick={() => setSelectedInvoice(inv)}
                               className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                               title="View Details"
                             >
                                <Eye className="w-4 h-4"/>
                             </button>
                             {onDeleteInvoice && (
                               <button 
                                 onClick={() => {
                                   if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
                                     onDeleteInvoice(inv.id);
                                   }
                                 }}
                                 className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                 title="Delete Invoice"
                               >
                                  <Trash2 className="w-4 h-4"/>
                               </button>
                             )}
                           </div>
                        </td>
                     </tr>
                  ))}
                  {paginatedInvoices.length === 0 && (
                     <tr><td colSpan={8} className="p-12 text-center text-gray-400">No invoices found matching your criteria.</td></tr>
                  )}
               </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
             <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                   Showing <span className="font-bold">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedInvoices.length)}</span> of <span className="font-bold">{filteredAndSortedInvoices.length}</span> results
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <ChevronLeft className="w-4 h-4" />
                   </button>
                   <span className="px-4 py-2 bg-white border rounded-lg text-sm font-medium flex items-center">
                      Page {currentPage} of {totalPages}
                   </span>
                   <button 
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                     className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
             </div>
          )}
       </div>

       {/* Detail Modal */}
       {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 print:static print:bg-white print:p-0 print:block">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-[90vh] flex flex-col overflow-hidden animate-scale-in print:shadow-none print:h-auto print:max-h-none print:overflow-visible print:block">
                 <div className="p-4 border-b flex justify-between items-center bg-gray-50 no-print">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-gray-800">Invoice Details</span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-mono">#{selectedInvoice.id}</span>
                    </div>
                    <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                 </div>

                 {/* Tabs for Preview/PDF */}
                 <div className="border-b bg-gray-50 no-print">
                   <div className="flex">
                     <button 
                       className={`px-4 py-2 font-medium ${!showPdfPreview ? 'bg-white border-t border-l border-r rounded-t-lg text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                       onClick={() => setShowPdfPreview(false)}
                     >
                       HTML Preview
                     </button>
                     <button 
                       className={`px-4 py-2 font-medium flex items-center gap-2 ${showPdfPreview ? 'bg-white border-t border-l border-r rounded-t-lg text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                       onClick={() => setShowPdfPreview(true)}
                     >
                       {isGeneratingPDF ? (
                         <>
                           <Loader2 className="w-4 h-4 animate-spin" />
                           Generating PDF...
                         </>
                       ) : (
                         'PDF Preview'
                       )}
                     </button>
                   </div>
                 </div>

                 <div className="flex-1 overflow-y-auto relative bg-gray-50 print:overflow-visible print:bg-white print:block print:h-auto">
                   {!showPdfPreview ? (
                     <div className="flex justify-center p-4">
                       <InvoicePreview invoice={selectedInvoice} business={business} isReprint={true} />
                     </div>
                   ) : isGeneratingPDF ? (
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

                 <div className="p-4 border-t bg-gray-50 flex flex-wrap justify-between gap-3 no-print">
                   <div className="flex gap-2">
                     <Button 
                       variant="secondary" 
                       onClick={() => setSelectedInvoice(null)}
                     >
                       Cancel
                     </Button>
                   </div>
                   
                   <div className="flex flex-wrap gap-2">
                     <Button 
                       variant="secondary"
                       onClick={async () => {
                         if (selectedInvoice) {
                           const doc = await PDFService.generateInvoicePDFForPreview(selectedInvoice, business, true, storeId);
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
                         if (selectedInvoice) {
                           await PDFService.generateAndSaveInvoicePDF(selectedInvoice, business, true, storeId);
                         }
                       }}
                       disabled={isGeneratingPDF}
                     >
                       <Download className="w-4 h-4 mr-2"/> Download PDF
                     </Button>
                     
                     <Button 
                       variant="secondary"
                       onClick={async () => {
                         if (selectedInvoice) {
                           await PDFService.exportInvoiceToExcel(selectedInvoice, business);
                         }
                       }}
                     >
                       <FileSpreadsheet className="w-4 h-4 mr-2"/> Export to Excel
                     </Button>
                     
                     <Button 
                       variant="secondary"
                       onClick={async () => {
                         if (selectedInvoice) {
                           await PDFService.generateAndSaveA4InvoicePDF(selectedInvoice, business, true, storeId);
                         }
                       }}
                       disabled={isGeneratingPDF}
                     >
                       <FileText className="w-4 h-4 mr-2"/> A4 PDF
                     </Button>
                     
                     <Button 
                       variant="secondary"
                       onClick={async () => {
                         if (selectedInvoice) {
                           await PDFService.generateAndSaveThermalInvoicePDF(selectedInvoice, business, true, storeId);
                         }
                       }}
                       disabled={isGeneratingPDF}
                     >
                       <FileText className="w-4 h-4 mr-2"/> Thermal PDF
                     </Button>
                   </div>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default InvoicesView;
