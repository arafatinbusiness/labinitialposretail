
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  FileText, 
  Banknote, 
  CreditCard, 
  Clock, 
  Percent,
  Download,
  Target,
  Table as TableIcon,
  LayoutDashboard,
  FileSpreadsheet,
  FileJson,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Phone,
  Copy,
  Search,
  CheckCircle,
  Plus
} from 'lucide-react';
import { Invoice, BusinessSettings, CartItem } from '../../types';
import { PDFService } from '../../services/pdfService';
import Input from '../ui/Input';
import { CurrencyService } from '../../services/currencyService';

const ReportsView = ({ invoices, t, business }: { invoices: Invoice[], t: (key: string) => string, business: BusinessSettings }) => {
  const [reportRange, setReportRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [viewMode, setViewMode] = useState<'dashboard' | 'table' | 'ledger' | 'customer_report'>('dashboard');
  const [customerSearch, setCustomerSearch] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Filter based on range
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    
    // Get today's date in local timezone (YYYY-MM-DD)
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfToday = todayLocal.toISOString().split('T')[0];
    
    // Alternative: Use locale date string (en-CA gives YYYY-MM-DD)
    const todayLocale = now.toLocaleDateString('en-CA');
    
    console.log(`[ReportsView] Filtering invoices: total=${invoices.length}, range=${reportRange}`);
    console.log(`[ReportsView] Current date (local): ${now.toString()}`);
    console.log(`[ReportsView] Today start (ISO): ${startOfToday}`);
    console.log(`[ReportsView] Today start (locale): ${todayLocale}`);
    
    // Debug: Show all invoices with their dates
    invoices.forEach((inv, i) => {
      const invDate = new Date(inv.date);
      console.log(`[ReportsView] Invoice ${i+1}: id=${inv.id}, date=${inv.date}, parsed local=${invDate.toLocaleDateString()}, parsed ISO=${invDate.toISOString().split('T')[0]}`);
    });
    
    const filtered = invoices.filter(inv => {
      console.log(`[ReportsView] Checking invoice: id=${inv.id}, date=${inv.date}, customer=${inv.customerName}, total=${inv.grandTotal}`);
      
      if (reportRange === 'today') {
        // Get invoice date in local timezone
        const invoiceDate = new Date(inv.date);
        const invoiceDateLocal = invoiceDate.toISOString().split('T')[0];
        const invoiceDateLocale = invoiceDate.toLocaleDateString('en-CA');
        
        console.log(`[ReportsView] Today filter details:`);
        console.log(`  - Invoice date string: ${inv.date}`);
        console.log(`  - Invoice date local (ISO): ${invoiceDateLocal}`);
        console.log(`  - Invoice date local (locale): ${invoiceDateLocale}`);
        console.log(`  - Today start (ISO): ${startOfToday}`);
        console.log(`  - Today start (locale): ${todayLocale}`);
        
        // Try multiple comparison methods to handle timezone issues
        const matches = 
          inv.date === startOfToday || 
          inv.date === todayLocale ||
          invoiceDateLocal === startOfToday ||
          invoiceDateLocal === todayLocale ||
          invoiceDateLocale === startOfToday ||
          invoiceDateLocale === todayLocale;
        
        console.log(`[ReportsView] Today filter result: ${matches}`);
        return matches;
      }
      if (reportRange === 'week') {
        const weekAgo = new Date(todayLocal);
        weekAgo.setDate(todayLocal.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        const matches = inv.date >= weekAgoStr;
        console.log(`[ReportsView] Week filter: invoice date ${inv.date} >= ${weekAgoStr} ? ${matches}`);
        return matches;
      }
      if (reportRange === 'month') {
        const monthAgo = new Date(todayLocal);
        monthAgo.setMonth(todayLocal.getMonth() - 1);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        const matches = inv.date >= monthAgoStr;
        console.log(`[ReportsView] Month filter: invoice date ${inv.date} >= ${monthAgoStr} ? ${matches}`);
        return matches;
      }
      if (reportRange === 'custom' && customRange.start && customRange.end) {
        const matches = inv.date >= customRange.start && inv.date <= customRange.end;
        console.log(`[ReportsView] Custom filter: ${inv.date} between ${customRange.start} and ${customRange.end} ? ${matches}`);
        return matches;
      }
      console.log(`[ReportsView] All filter: including invoice`);
      return true;
    });
    
    console.log(`[ReportsView] Filtered invoices: ${filtered.length} invoices`);
    if (filtered.length > 0) {
      filtered.forEach((inv, i) => {
        console.log(`[ReportsView] Filtered invoice ${i+1}: ${inv.id} - ${inv.date} - ${inv.customerName} - ${inv.grandTotal}`);
      });
    } else {
      console.log(`[ReportsView] WARNING: No invoices matched the filter!`);
      console.log(`[ReportsView] Possible issues:`);
      console.log(`  1. Invoice dates don't match today's date format`);
      console.log(`  2. Invoices have different date format than YYYY-MM-DD`);
      console.log(`  3. Timezone issues with date comparison`);
      console.log(`  4. No invoices exist in the system`);
      console.log(`[ReportsView] Try switching to "All" filter to see all invoices`);
    }
    
    return filtered;
  }, [invoices, reportRange, customRange]);

  // Aggregate product-level profit data
  const productPerformance = useMemo(() => {
    const map: Record<string, { name: string, cost: number, price: number, qty: number, totalProfit: number }> = {};
    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!map[item.id]) {
          map[item.id] = { name: item.name, cost: item.purchasePrice || 0, price: item.price, qty: 0, totalProfit: 0 };
        }
        map[item.id].qty += item.quantity;
        const profitPerUnit = item.price - (item.purchasePrice || 0);
        map[item.id].totalProfit += profitPerUnit * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filteredInvoices]);

  // Aggregate Customer-level Report Data
  const customerReportData = useMemo(() => {
    const map: Record<string, { 
      name: string, 
      phone: string, 
      purchaseCount: number, 
      items: string[], 
      grandTotal: number, 
      paidAmount: number, 
      dueAmount: number,
      paymentMethods: Set<string>
    }> = {};

    filteredInvoices.forEach(inv => {
      const key = `${inv.customerName}-${inv.customerPhone || 'none'}`;
      if (!map[key]) {
        map[key] = { 
          name: inv.customerName, 
          phone: inv.customerPhone || '', 
          purchaseCount: 0, 
          items: [], 
          grandTotal: 0, 
          paidAmount: 0, 
          dueAmount: 0,
          paymentMethods: new Set()
        };
      }
      
      const entry = map[key];
      entry.purchaseCount += 1;
      entry.grandTotal += inv.grandTotal;
      entry.paidAmount += inv.paidAmount;
      entry.dueAmount += inv.dueAmount;
      
      // Normalize payment mode for display
      const paymentMode = inv.paymentMode?.toLowerCase() || '';
      if (paymentMode.includes('cash')) {
        entry.paymentMethods.add('cash');
      } else if (paymentMode.includes('card')) {
        entry.paymentMethods.add('card');
      } else if (paymentMode) {
        entry.paymentMethods.add(paymentMode);
      }
      
      inv.items.forEach(item => {
        if (!entry.items.includes(item.name)) {
          entry.items.push(item.name);
        }
      });
    });

    return Object.values(map)
      .filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
        c.phone.includes(customerSearch)
      )
      .map(c => ({ ...c, paymentMethods: Array.from(c.paymentMethods) }))
      .sort((a, b) => b.grandTotal - a.grandTotal);
  }, [filteredInvoices, customerSearch]);

  // Daily Sales Ledger Data
  const ledgerData = useMemo(() => {
    const map: Record<string, { date: string, net: number, cash: number, card: number, due: number }> = {};
    filteredInvoices.forEach(inv => {
      const date = inv.date;
      if (!map[date]) map[date] = { date, net: 0, cash: 0, card: 0, due: 0 };
      map[date].net += inv.grandTotal;
      
      // Handle different payment mode formats (case-insensitive)
      const paymentMode = inv.paymentMode?.toLowerCase() || '';
      if (paymentMode.includes('cash')) {
        // Calculate net cash kept (after change given)
        const changeGiven = inv.dueAmount < 0 ? -inv.dueAmount : 0;
        const netCash = inv.paidAmount - changeGiven;
        map[date].cash += netCash;
      } else if (paymentMode.includes('card')) {
        // For card payments, no change is given
        map[date].card += inv.paidAmount;
      }
      // Only include positive due amounts in ledger
      if (inv.dueAmount > 0) {
        map[date].due += inv.dueAmount;
      }
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredInvoices]);

  // Logic for Copying Phone Numbers
  const copyPhoneNumbers = () => {
    const numbers = customerReportData
      .map(c => c.phone)
      .filter(p => p && p.trim().length > 5)
      .join(', ');
    
    if (numbers) {
      navigator.clipboard.writeText(numbers);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // CSV Export for Customer Report
  const exportCustomerCSV = () => {
    const headers = ["SL", "Customer Name", "Phone", "Total Purchases", "Items", "Total Spent", "Paid", "Due"];
    const rows = customerReportData.map((c, i) => [
      i + 1, c.name, c.phone, c.purchaseCount, c.items.join('|'), c.grandTotal, c.paidAmount, c.dueAmount
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Customer_Purchase_Report_${reportRange}.csv`);
    link.click();
  };

  // Calculate sales and profit correctly with validation for extreme values
  const grossSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      // Validate invoice total is reasonable (less than 1 billion)
      const invoiceTotal = inv.grandTotal || 0;
      if (invoiceTotal > 1000000000) { // 1 billion threshold
        console.warn(`Invoice ${inv.id} has extreme value: ${invoiceTotal}`);
        return sum; // Skip this invoice as it's likely an error
      }
      return sum + invoiceTotal;
    }, 0);
  }, [filteredInvoices]);
  
  const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);
  const netSales = grossSales - totalDiscounts;
  
  // Calculate total cost more accurately with validation
  const totalCost = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      // Skip invoices with extreme values
      if (inv.grandTotal > 1000000000) {
        return sum;
      }
      return sum + inv.items.reduce((itemSum, item) => {
        const cost = item.purchasePrice || 0;
        // Validate cost is reasonable (less than 100,000 per unit)
        if (cost > 100000) {
          console.warn(`Product ${item.name} has extreme cost: ${cost}`);
          return itemSum; // Skip this item
        }
        return itemSum + (cost * item.quantity);
      }, 0);
    }, 0);
  }, [filteredInvoices]);
  
  const grossProfit = netSales - totalCost;
  const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  
  // Calculate cash/card/pay later distribution correctly
  const totalCash = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      const paymentMode = inv.paymentMode?.toLowerCase() || '';
      if (!paymentMode.includes('cash')) return sum;
      
      // Calculate net cash kept (after change given)
      // If dueAmount is negative, that's change given to customer
      // Net cash = paidAmount - changeGiven
      // changeGiven = max(0, -dueAmount)
      const changeGiven = inv.dueAmount < 0 ? -inv.dueAmount : 0;
      const netCash = inv.paidAmount - changeGiven;
      
      return sum + netCash;
    }, 0);
  }, [filteredInvoices]);
  
  const totalCard = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      const paymentMode = inv.paymentMode?.toLowerCase() || '';
      if (!paymentMode.includes('card')) return sum;
      
      // For card payments, no change is given
      // Net card amount = paidAmount (cards don't get change)
      return sum + inv.paidAmount;
    }, 0);
  }, [filteredInvoices]);
  
  // Pay Later should only include positive due amounts (amounts customers owe)
  // Negative due amounts represent change given (overpayment)
  const totalPayLater = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      // Only include positive due amounts (customers owe money)
      return inv.dueAmount > 0 ? sum + inv.dueAmount : sum;
    }, 0);
  }, [filteredInvoices]);
  
  // Calculate total payments (cash + card) for percentage calculations
  const totalPayments = totalCash + totalCard;
  
  // Calculate percentages based on net sales (not individual payment amounts)
  const cashPercentage = netSales > 0 ? (totalCash / netSales) * 100 : 0;
  const cardPercentage = netSales > 0 ? (totalCard / netSales) * 100 : 0;
  const payLaterPercentage = netSales > 0 ? (totalPayLater / netSales) * 100 : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12 px-1 sm:px-0">
      {/* Navigation Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">{business.name} {t('reports')}</h2>
             <p className="text-slate-500 text-sm mt-1 font-medium flex items-center gap-2">
               <Calendar className="w-4 h-4 text-indigo-400"/> {t(reportRange)} Summary
             </p>
           </div>
           <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
              {(['today', 'week', 'month', 'all', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setReportRange(r)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${reportRange === r ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {t(r)}
                </button>
              ))}
           </div>
        </div>

        {reportRange === 'custom' && (
          <div className="bg-white p-4 sm:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-end gap-4 animate-scale-in">
             <div className="flex-1">
               <Input label="Start Date" type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
             </div>
             <div className="flex-1">
               <Input label="End Date" type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
             </div>
             <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-2xl text-indigo-400">
               <Target className="w-6 h-6"/>
             </div>
          </div>
        )}

        {/* View Selection Tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
           {[
             { id: 'dashboard', icon: LayoutDashboard, label: t('insights') },
             { id: 'table', icon: TableIcon, label: t('detailed_analysis') },
             { id: 'ledger', icon: Layers, label: t('sales_ledger') },
             { id: 'customer_report', icon: UserCheck, label: t('customer_report') }
           ].map(v => (
             <button
               key={v.id}
               onClick={() => setViewMode(v.id as any)}
               className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl transition-all whitespace-nowrap ${viewMode === v.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
             >
               <v.icon className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-wider hidden md:block">{v.label}</span>
             </button>
           ))}
        </div>
      </div>

      {/* INSIGHTS VIEW */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <MetricCard label={t('gross_sales')} value={grossSales} currency={business.currency} icon={<TrendingUp />} color="indigo" />
            <MetricCard label={t('gross_profit')} value={grossProfit} currency={business.currency} icon={<Wallet />} color="emerald" />
            <MetricCard label={t('profit_margin')} value={profitMargin} suffix="%" icon={<Percent />} color="amber" />
            <MetricCard label={t('invoices')} value={filteredInvoices.length} icon={<FileText />} color="slate" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-10 flex flex-col">
              <h3 className="text-xl font-black text-slate-900 mb-8">Revenue Breakdown</h3>
              <div className="space-y-4 flex-1">
                <SummaryLine label={t('gross_sales')} value={grossSales} currency={business.currency} />
                <SummaryLine label="Adjustments" value={totalDiscounts} currency={business.currency} isNegative />
                <div className="border-t-2 border-dashed border-slate-100 my-4"></div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-5 bg-slate-900 rounded-2xl sm:rounded-[2rem] px-6 sm:px-8 text-white gap-2">
                  <span className="font-black text-sm uppercase opacity-60 tracking-widest">{t('net_sales')}</span>
                  <span className="text-2xl font-black text-indigo-400">{CurrencyService.formatAmountWithSpace(netSales, business.currency)}</span>
                </div>
                <SummaryLine label={t('cost_of_goods')} value={totalCost} currency={business.currency} isMuted />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-5 px-6 sm:px-8 bg-emerald-50 rounded-2xl sm:rounded-[2rem] border-2 border-emerald-500/10 gap-2">
                  <span className="font-black text-emerald-900 text-sm uppercase tracking-widest">{t('recurring_profit')}</span>
                  <span className="text-2xl font-black text-emerald-700">{CurrencyService.formatAmountWithSpace(grossProfit, business.currency)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-10 space-y-6">
              <h3 className="text-xl font-black text-slate-900">Collection Insights</h3>
              <div className="space-y-4">
                <TenderLine label={t('cash')} value={totalCash} total={netSales} currency={business.currency} icon={<Banknote />} color="blue" />
                <TenderLine label={t('card')} value={totalCard} total={netSales} currency={business.currency} icon={<CreditCard />} color="violet" />
                <TenderLine label={t('pay_later')} value={totalPayLater} total={netSales} currency={business.currency} icon={<Clock />} color="rose" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE VIEWS (DETAILED/LEDGER/CUSTOMER) */}
      {(viewMode === 'table' || viewMode === 'ledger' || viewMode === 'customer_report') && (
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-scale-in flex flex-col">
           {/* Dynamic Table Toolbar */}
           <div className="p-6 sm:p-8 border-b flex flex-col gap-6 bg-slate-50/50">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                    {viewMode === 'table' ? t('detailed_analysis') : 
                     viewMode === 'ledger' ? t('sales_ledger') : 
                     t('customer_report')}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Professional Business Ledger</p>
                </div>
                
                {viewMode === 'customer_report' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                      <input 
                        className="pl-9 pr-4 py-2.5 border rounded-xl w-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" 
                        placeholder="Search Name/Phone..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={copyPhoneNumbers}
                      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-md active:scale-95 ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {copySuccess ? <CheckCircle className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                      {copySuccess ? 'Copied' : t('copy_numbers')}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 w-full">
                 <button 
                  onClick={() => {
                    if (viewMode === 'table') {
                       // Professional Table Export
                    } else if (viewMode === 'customer_report') {
                       exportCustomerCSV();
                    }
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                 >
                   <FileSpreadsheet className="w-4 h-4"/> EXCEL (CSV)
                 </button>
                 <button 
                  onClick={() => {
                    if (viewMode === 'table') PDFService.generateTablePDF(business, productPerformance, reportRange);
                    if (viewMode === 'ledger') PDFService.generateLedgerPDF(business, ledgerData, reportRange);
                    if (viewMode === 'customer_report') PDFService.generateCustomerReportPDF(business, customerReportData, reportRange);
                  }} 
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-rose-700 transition-all active:scale-95"
                 >
                   <FileJson className="w-4 h-4"/> PRO PDF
                 </button>
              </div>
           </div>

           <div className="overflow-x-auto no-scrollbar relative flex-1">
             <div className="min-w-max">
               {viewMode === 'table' && (
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                       <th className="p-4 sm:p-6">{t('sl_no')}</th>
                       <th className="p-4 sm:p-6">{t('product_name')}</th>
                       <th className="p-4 sm:p-6 text-right">{t('purchase_price')}</th>
                       <th className="p-4 sm:p-6 text-right">{t('selling_price')}</th>
                       <th className="p-4 sm:p-6 text-right font-black text-emerald-600">{t('profit_per_unit')}</th>
                       <th className="p-4 sm:p-6 text-center">{t('profit_percent')}</th>
                       <th className="p-4 sm:p-6 text-center">{t('selling_qty')}</th>
                       <th className="p-4 sm:p-6 text-right bg-emerald-50 text-emerald-600 font-black">{t('total_profit')}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {productPerformance.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 sm:p-6 text-slate-400 font-bold">#{idx + 1}</td>
                          <td className="p-4 sm:p-6 font-black text-slate-800">{p.name}</td>
                          <td className="p-4 sm:p-6 text-right font-mono text-slate-400">{CurrencyService.getDisplayCurrency(business.currency)}{p.cost.toFixed(2)}</td>
                          <td className="p-4 sm:p-6 text-right font-mono text-slate-900 font-bold">{CurrencyService.getDisplayCurrency(business.currency)}{p.price.toFixed(2)}</td>
                          <td className="p-4 sm:p-6 text-right font-mono text-emerald-600 font-bold">+{CurrencyService.getDisplayCurrency(business.currency)}{(p.price - p.cost).toFixed(2)}</td>
                          <td className="p-4 sm:p-6 text-center">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black">{((p.price - p.cost)/p.price * 100).toFixed(1)}%</span>
                          </td>
                          <td className="p-4 sm:p-6 text-center font-black">{p.qty}</td>
                          <td className="p-4 sm:p-6 text-right bg-emerald-50/20 text-xl font-black text-emerald-600 font-mono">{CurrencyService.getDisplayCurrency(business.currency)}{p.totalProfit.toLocaleString()}</td>
                        </tr>
                     ))}
                   </tbody>
                 </table>
               )}

               {viewMode === 'ledger' && (
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                       <th className="p-4 sm:p-6">{t('sl_no')}</th>
                       <th className="p-4 sm:p-6">{t('date')}</th>
                       <th className="p-4 sm:p-6 text-right font-black text-slate-900">{t('net_sales')}</th>
                       <th className="p-4 sm:p-6 text-right text-blue-600 font-black">{t('cash')}</th>
                       <th className="p-4 sm:p-6 text-right text-violet-600 font-black">{t('card')}</th>
                       <th className="p-4 sm:p-6 text-right text-rose-600 font-black">{t('pay_later')}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {ledgerData.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 sm:p-6 text-slate-400 font-bold">#{idx + 1}</td>
                          <td className="p-4 sm:p-6 font-black text-slate-800">{new Date(d.date).toLocaleDateString()}</td>
                          <td className="p-4 sm:p-6 text-right font-mono font-black text-slate-900">{CurrencyService.getDisplayCurrency(business.currency)}{d.net.toLocaleString()}</td>
                          <td className="p-4 sm:p-6 text-right font-mono font-bold text-blue-600">{CurrencyService.getDisplayCurrency(business.currency)}{d.cash.toLocaleString()}</td>
                          <td className="p-4 sm:p-6 text-right font-mono font-bold text-violet-600">{CurrencyService.getDisplayCurrency(business.currency)}{d.card.toLocaleString()}</td>
                          <td className="p-4 sm:p-6 text-right font-mono font-bold text-rose-600">{CurrencyService.getDisplayCurrency(business.currency)}{d.due.toLocaleString()}</td>
                        </tr>
                     ))}
                   </tbody>
                 </table>
               )}

               {viewMode === 'customer_report' && (
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                       <th className="p-4 sm:p-6">{t('sl_no')}</th>
                       <th className="p-4 sm:p-6">{t('name')}</th>
                       <th className="p-4 sm:p-6">{t('phone')}</th>
                       <th className="p-4 sm:p-6 text-center">{t('total_purchases')}</th>
                       <th className="p-4 sm:p-6 w-auto sm:w-64">{t('items_purchased')}</th>
                       <th className="p-4 sm:p-6 text-center">Methods</th>
                       <th className="p-4 sm:p-6 text-right font-black text-slate-900">Total Spent</th>
                       <th className="p-4 sm:p-6 text-right text-emerald-600 font-black">Paid</th>
                       <th className="p-4 sm:p-6 text-right text-rose-600 font-black">Due</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {customerReportData.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors align-top">
                          <td className="p-4 sm:p-6 text-slate-400 font-bold pt-6">#{idx + 1}</td>
                          <td className="p-4 sm:p-6 font-black text-slate-900 pt-6 truncate max-w-[100px] sm:max-w-[150px]">{c.name}</td>
                          <td className="p-4 sm:p-6 font-mono text-slate-500 pt-6">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-indigo-400"/> {c.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="p-4 sm:p-6 text-center font-black pt-6">{c.purchaseCount}</td>
                          <td className="p-4 sm:p-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-full sm:max-w-[200px]">
                              {c.items.slice(0, 3).map((item, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase truncate">{item}</span>
                              ))}
                              {c.items.length > 3 && (
                                <button className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black flex items-center gap-1 hover:bg-indigo-600 hover:text-white transition-all">
                                  <Plus className="w-2 h-2"/> {c.items.length - 3} More
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-4 sm:p-6 text-center pt-6">
                            <div className="flex justify-center gap-1.5">
                              {c.paymentMethods.map(m => (
                                <div key={m} className={`w-3 h-3 rounded-full shadow-inner ${m === 'cash' ? 'bg-blue-500' : m === 'card' ? 'bg-violet-500' : 'bg-rose-500'}`} title={m.toUpperCase()}/>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 sm:p-6 text-right font-mono font-black text-slate-900 pt-6">{CurrencyService.getDisplayCurrency(business.currency)}{c.grandTotal.toLocaleString()}</td>
                          <td className="p-4 sm:p-6 text-right font-mono font-bold text-emerald-600 pt-6">{CurrencyService.getDisplayCurrency(business.currency)}{c.paidAmount.toLocaleString()}</td>
                          <td className="p-4 sm:p-6 text-right font-mono font-bold text-rose-600 pt-6">{CurrencyService.getDisplayCurrency(business.currency)}{c.dueAmount.toLocaleString()}</td>
                        </tr>
                     ))}
                     {customerReportData.length === 0 && (
                       <tr><td colSpan={9} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">No customer data matches the criteria.</td></tr>
                     )}
                   </tbody>
                 </table>
               )}
             </div>
           </div>

           {/* Performance Sticky Footer */}
           <div className="bg-slate-900 text-white p-6 sm:p-10 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5">
                    <TrendingUp className="text-indigo-400 w-7 h-7"/>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em]">Aggregated Period Earnings</p>
                    <h4 className="text-xl sm:text-2xl font-black">Heaven Profit Pulse</h4>
                 </div>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-3xl sm:text-5xl font-black text-emerald-400 font-mono tracking-tighter drop-shadow-lg">
                  {CurrencyService.formatAmountWithSpace(grossProfit, business.currency)}
                </span>
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-1">Net Earnings After All Expenses</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Specialized Internal UI Components ---
const MetricCard = ({ label, value, currency, suffix, icon, color }: any) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };
  return (
    <div className={`bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border ${colors[color]} shadow-sm hover:shadow-xl transition-all group overflow-hidden relative`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${colors[color]} transition-transform group-hover:scale-110`}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 sm:w-7 h-7" })}
        </div>
        <span className="text-[10px] font-black uppercase opacity-50 tracking-[0.1em] text-right ml-4 leading-relaxed max-w-[80px]">{label}</span>
      </div>
      <div className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900 truncate">
        {CurrencyService.getDisplayCurrency(currency)}{value.toLocaleString(undefined, { minimumFractionDigits: typeof value === 'number' && value % 1 !== 0 ? 2 : 0 })}{suffix}
      </div>
    </div>
  );
};

const SummaryLine = ({ label, value, currency, isNegative, isMuted }: any) => (
  <div className="flex justify-between items-center py-2.5 gap-2 border-b border-slate-50 last:border-0">
    <span className={`${isMuted ? 'text-slate-400 italic text-xs' : 'text-slate-500 font-bold text-sm'} truncate`}>{label}</span>
    <span className={`font-black text-lg whitespace-nowrap ${isNegative ? 'text-rose-500' : 'text-slate-900'}`}>
      {isNegative ? '-' : ''}{CurrencyService.getDisplayCurrency(currency)}{value.toLocaleString()}
    </span>
  </div>
);

const TenderLine = ({ label, value, total, currency, icon, color }: any) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorMap: any = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <div className="flex items-center gap-5 p-5 sm:p-7 rounded-2xl sm:rounded-[2rem] border border-slate-50 hover:bg-slate-50 transition-all group">
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0 ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 sm:w-7 h-7" })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest truncate mb-1">{label} Distribution</div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 truncate">{CurrencyService.getDisplayCurrency(currency)}{value.toLocaleString()}</div>
      </div>
      <div className="text-right font-black text-xl sm:text-2xl text-slate-300 whitespace-nowrap ml-4 group-hover:text-slate-900 transition-colors">{percentage.toFixed(0)}%</div>
    </div>
  );
};

export default ReportsView;
