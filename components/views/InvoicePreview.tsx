import React from 'react';
import QRCode from 'react-qr-code';
import { Invoice, BusinessSettings } from '../../types';

interface InvoicePreviewProps {
  invoice: Invoice;
  business: BusinessSettings;
  isReprint?: boolean;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice, business, isReprint = false }) => {
  const isThermal = business.printFormat === 'thermal';

  return (
    <div className={`flex-1 bg-white overflow-y-auto print:overflow-visible print:h-auto print:z-[100] print:m-0 ${isThermal ? 'w-[80mm] p-3 text-xs print:w-[80mm] print:mx-auto print:block print:relative print:left-auto print:top-auto print:min-h-0' : 'p-6 md:p-8 print:p-8 print:w-full'}`}>
        <div className="text-center mb-4 md:mb-6">
          <h1 className={`${isThermal ? 'text-lg' : 'text-2xl md:text-3xl'} font-extrabold text-black uppercase tracking-widest`}>{business.name}</h1>
          <p className="text-black mt-1">{business.address}</p>
          <p className="text-black">{business.phone}</p>
        </div>

        <div className={`border-t border-b border-gray-200 py-2 md:py-4 mb-4 md:mb-6 ${isThermal ? 'text-center' : ''} text-sm`}>
            <div className={`${isThermal ? 'mb-3' : 'flex flex-col md:flex-row justify-between gap-4'}`}>
                <div className={`${isThermal ? 'mb-2' : ''}`}>
                  <p className="text-black text-[10px] uppercase">Bill To:</p>
                  <p className={`font-bold ${isThermal ? 'text-sm' : 'text-lg'}`}>{invoice.customerName}</p>
                  <p className="text-black">{invoice.customerPhone}</p>
                  {!isThermal && <p className="text-black">{invoice.customerAddress}</p>}
                </div>
                <div className={`${isThermal ? '' : 'text-left md:text-right'}`}>
                  <p className="text-black text-[10px] uppercase">Invoice Info:</p>
                  <p className="font-bold text-black">#{invoice.id}</p>
                  <p className="text-black">{invoice.date}</p>
                  {isReprint && <p className="text-[10px] text-black bg-gray-100 inline-block px-1 mt-1">REPRINT</p>}
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-black ${invoice.status === 'delivered' ? 'bg-gray-100 text-black' : 'bg-gray-100 text-black'}`}>
                        {invoice.status}
                    </span>
                  </div>
                </div>
            </div>
        </div>

        {isThermal ? (
          // Simplified format for thermal reports - no separate Qty column
          <div className="mb-4 md:mb-6">
            <div className="border-b border-gray-300 pb-1 mb-2">
              <h3 className="font-bold text-black text-sm">ITEMS</h3>
            </div>
            <div className="space-y-3">
              {invoice.items.map((item, idx) => {
                const isPriceAdjusted = 'priceAdjusted' in item && item.priceAdjusted;
                const salePrice = 'salePrice' in item ? item.salePrice : item.price;
                const originalPrice = 'originalPrice' in item ? item.originalPrice : item.price;
                
                return (
                  <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-black text-sm">
                        {item.name}
                        {isPriceAdjusted && item.adjustmentReason && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {item.adjustmentReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-black font-bold text-sm">
                        {business.currency}{(salePrice * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <div>
                        {item.quantity} {item.unit} × 
                        {isPriceAdjusted ? (
                          <span className="ml-1">
                            <span className="text-gray-400 line-through mr-1">{business.currency}{originalPrice.toFixed(2)}</span>
                            <span className="text-green-600">{business.currency}{salePrice.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="ml-1">{business.currency}{salePrice.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="font-medium">
                        Total: {business.currency}{(salePrice * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Table format for A4 reports
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left mb-4 md:mb-6 text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 text-black">Item</th>
                  <th className="py-2 text-center text-black">Qty</th>
                  <th className="py-2 text-right text-black">Price</th>
                  <th className="py-2 text-right text-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const isPriceAdjusted = 'priceAdjusted' in item && item.priceAdjusted;
                  const salePrice = 'salePrice' in item ? item.salePrice : item.price;
                  const originalPrice = 'originalPrice' in item ? item.originalPrice : item.price;
                  
                  return (
                    <tr key={idx} className="border-b border-black">
                      <td className="py-2 font-medium text-black">
                        <div>{item.name}</div>
                        {isPriceAdjusted && item.adjustmentReason && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.adjustmentReason}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center">{item.quantity} {item.unit}</td>
                      <td className="py-2 text-right">
                        {isPriceAdjusted ? (
                          <div className="flex flex-col items-end">
                            <span className="text-gray-400 line-through text-xs">{business.currency}{originalPrice.toFixed(2)}</span>
                            <span className="text-green-600 font-medium">{business.currency}{salePrice.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>{business.currency}{salePrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-2 text-right">{business.currency}{(salePrice * item.quantity).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mb-4 md:mb-8">
            <div className={`${isThermal ? 'w-full' : 'w-full md:w-64'} space-y-1 md:space-y-2 ${isThermal ? 'text-sm' : 'text-sm'}`}>
              <div className="flex justify-between"><span>Subtotal:</span> <span className={isThermal ? 'text-sm' : ''}>{business.currency}{invoice.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>VAT:</span> <span className={isThermal ? 'text-sm' : ''}>{business.currency}{invoice.totalVat.toFixed(2)}</span></div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-black"><span>Discount:</span> <span className={isThermal ? 'text-sm' : ''}>-{business.currency}{invoice.discount.toFixed(2)}</span></div>
              )}
              <div className={`flex justify-between font-bold ${isThermal ? 'text-base border-t border-gray-300 pt-2' : 'text-lg border-t border-black pt-2'}`}>
                  <span>{isThermal ? 'Total:' : 'Grand Total:'}</span> <span>{business.currency}{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between ${isThermal ? 'pt-1' : 'pt-2 border-t border-black'}`}>
                  <span>Paid:</span> <span className={isThermal ? 'text-sm' : ''}>{business.currency}{invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between ${isThermal ? 'font-bold text-sm' : 'font-bold'}`}>
                  <span>{invoice.dueAmount > 0 ? 'Due:' : 'Change:'}</span> 
                  <span>{business.currency}{Math.abs(invoice.dueAmount).toFixed(2)}</span>
              </div>
            </div>
        </div>
        
        <div className={`flex items-end justify-between mt-auto pt-4 md:pt-8 ${isThermal ? 'flex-col items-center gap-4 text-center' : ''}`}>
            <div className="text-center">
              <QRCode value={`${business.name}|${invoice.id}|${invoice.grandTotal}`} size={isThermal ? 48 : 64} />
              <p className="text-[10px] text-black mt-1">Scan for details</p>
            </div>
            <div className={isThermal ? 'text-center' : 'text-right'}>
              <p className="font-bold text-lg italic font-serif">Thank You!</p>
              <p className="text-[10px] text-black">Software by Labinitial </p>
            </div>
        </div>
    </div>
  );
};

export default InvoicePreview;
