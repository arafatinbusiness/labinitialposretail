import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice, BusinessSettings } from '../../types';

// Mock Firebase service for public access
const mockFirebaseService = {
  async getInvoice(storeId: string, invoiceId: string): Promise<Invoice | null> {
    try {
      const key = `store_${storeId}_invoices`;
      const invoicesJson = localStorage.getItem(key);
      if (invoicesJson) {
        const invoices: Invoice[] = JSON.parse(invoicesJson);
        return invoices.find(inv => inv.id === invoiceId) || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  },

  async getBusinessSettings(storeId: string): Promise<BusinessSettings> {
    try {
      const key = `store_${storeId}_business`;
      const settingsJson = localStorage.getItem(key);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }
      return {
        name: 'Business Name',
        address: 'Business Address',
        phone: '+880 1711 000000',
        printFormat: 'a4',
        productViewMode: 'grid',
        currency: '$',
        qrCodeType: 'universal'
      };
    } catch (error) {
      console.error('Error fetching business settings:', error);
      return {
        name: 'Business Name',
        address: 'Business Address',
        phone: '+880 1711 000000',
        printFormat: 'a4',
        productViewMode: 'grid',
        currency: '$',
        qrCodeType: 'universal'
      };
    }
  }
};

const PublicInvoiceView = () => {
  const { storeId, invoiceId } = useParams<{ storeId: string; invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!storeId || !invoiceId) {
        setError('Invalid invoice URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const [invoiceData, settingsData] = await Promise.all([
          mockFirebaseService.getInvoice(storeId, invoiceId),
          mockFirebaseService.getBusinessSettings(storeId)
        ]);

        if (!invoiceData) {
          setError('Invoice not found');
          setLoading(false);
          return;
        }

        setInvoice(invoiceData);
        setBusiness(settingsData);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice. Please check the URL or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [storeId, invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (!invoice || !business) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-gray-600 mt-1">{business.address}</p>
              {business.phone && <p className="text-gray-600">Phone: {business.phone}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-indigo-600">INVOICE</h2>
              <p className="text-gray-700 font-mono mt-1">#{invoice.id}</p>
              <p className="text-gray-600 text-sm mt-1">
                {new Date(invoice.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Bill To</h3>
            <div className="space-y-2">
              <p className="text-gray-800 font-medium">{invoice.customerName}</p>
              {invoice.customerPhone && <p className="text-gray-600">Phone: {invoice.customerPhone}</p>}
              {invoice.customerAddress && <p className="text-gray-600">Address: {invoice.customerAddress}</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Mode:</span>
                <span className="font-medium">{invoice.paymentMode || 'Cash'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${invoice.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-bold text-gray-700">Item</th>
                  <th className="p-4 text-left font-bold text-gray-700">Quantity</th>
                  <th className="p-4 text-left font-bold text-gray-700">Price</th>
                  <th className="p-4 text-left font-bold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">VAT: {item.vat}%</div>
                    </td>
                    <td className="p-4 text-gray-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-4 text-gray-700">
                      {business.currency}{item.price.toFixed(2)}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {business.currency}{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="max-w-md ml-auto">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{business.currency}{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT</span>
                <span className="font-medium">{business.currency}{invoice.totalVat.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-red-600">-{business.currency}{invoice.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Grand Total</span>
                <span className="text-indigo-600">{business.currency}{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid Amount</span>
                <span className="font-medium">{business.currency}{invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between ${invoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span className="font-medium">{invoice.dueAmount > 0 ? 'Due Amount' : 'Change'}</span>
                <span className="font-bold">{business.currency}{Math.abs(invoice.dueAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>This is a verified invoice from inventoryinvoice.labinitial.com</p>
          <p className="mt-1">Invoice ID: {invoice.id} | Store ID: {storeId}</p>
          <p className="mt-4">Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
