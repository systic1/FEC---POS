import React, { useMemo, useState } from 'react';
import { Sale, CartItem } from '../types';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Button from './ui/Button';

// Helper to summarize cart items into a readable string
const summarizeCart = (items: CartItem[]): string => {
  const itemCounts: { [name: string]: number } = {};
  items.forEach(item => {
    itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
  });
  return Object.entries(itemCounts)
    .map(([name, count]) => `${name}${count > 1 ? ` (x${count})` : ''}`)
    .join(', ');
};

// Helper to count unique guests assigned to tickets
const countGuests = (items: CartItem[]): number => {
    const guestIds = new Set<string>();
    items.forEach(item => {
        if ((item.type === 'ticket' || item.type === 'membership') && item.assignedGuestId) {
            guestIds.add(item.assignedGuestId);
        }
    });
    // If no tickets are assigned, but there are add-ons, we can assume at least one guest from the primary customer.
    if (guestIds.size === 0 && items.length > 0) return 1;
    return guestIds.size;
}

const History: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  const today = new Date().toISOString().split('T')[0];
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'total', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return [];
    }

    return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= start && saleDate <= end;
    });
  }, [sales, startDate, endDate]);

  const sortedSales = useMemo(() => {
    const sortableSales = [...filteredSales];
    sortableSales.sort((a, b) => {
        if (sortConfig.key === 'total') {
            if (a.total < b.total) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a.total > b.total) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
        // Default to date sorting
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sortableSales;
  }, [filteredSales, sortConfig]);

  const { totalRevenue, totalGuests } = useMemo(() => {
      const revenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
      const guests = filteredSales.reduce((sum, sale) => sum + countGuests(sale.items), 0);
      return { totalRevenue: revenue, totalGuests: guests };
  }, [filteredSales]);
  
  const groupedItemsForReceipt = useMemo(() => {
    if (!saleToPrint) return [];
    const groups: { [key: string]: { item: CartItem; quantity: number } } = {};
    saleToPrint.items.forEach((item) => {
      const groupKey = `${item.id}-${item.type}`;
      if (groups[groupKey]) {
        groups[groupKey].quantity++;
      } else {
        groups[groupKey] = {
          item,
          quantity: 1,
        };
      }
    });
    return Object.values(groups);
  }, [saleToPrint]);

  const requestSort = (key: 'date' | 'total') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: 'date' | 'total') => {
      if (sortConfig.key !== key) return '↕';
      return sortConfig.direction === 'asc' ? '▲' : '▼';
  };
  
  const handlePrintReceipt = (sale: Sale) => {
    setSaleToPrint(sale);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Transaction History</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <p className="text-sm text-gray-600 md:col-start-1 md:col-span-3">Showing {sortedSales.length} transactions.</p>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h4 className="text-gray-500 font-medium">Total Revenue (Filtered)</h4>
          <p className="text-3xl font-bold text-gray-800">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </Card>
        <Card>
          <h4 className="text-gray-500 font-medium">Total Customers (Filtered)</h4>
          <p className="text-3xl font-bold text-gray-800">{totalGuests}</p>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 cursor-pointer select-none" onClick={() => requestSort('date')}>
                  Time <span className="text-gray-600">{getSortIndicator('date')}</span>
                </th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Service Chosen</th>
                <th scope="col" className="px-6 py-3 text-center">Guests</th>
                <th scope="col" className="px-6 py-3">Payment Type</th>
                <th scope="col" className="px-6 py-3 text-right cursor-pointer select-none" onClick={() => requestSort('total')}>
                  Total (incl. GST) <span className="text-gray-600">{getSortIndicator('total')}</span>
                </th>
                <th scope="col" className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">No sales recorded for the selected date range.</td>
                </tr>
              ) : (
                sortedSales.map(sale => (
                    <tr key={sale.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{sale.customerName}</td>
                      <td className="px-6 py-4">{summarizeCart(sale.items)}</td>
                      <td className="px-6 py-4 text-center">{countGuests(sale.items)}</td>
                      <td className="px-6 py-4">{sale.paymentMethod}</td>
                      <td className="px-6 py-4 text-right font-semibold">₹{sale.total.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handlePrintReceipt(sale)} className="text-blue-600 hover:text-blue-800 p-1" aria-label="Print receipt">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 9a1 1 0 01-1 1H9a1 1 0 110-2h4a1 1 0 011 1zm3-4a1 1 0 00-1-1h-6a1 1 0 100 2h6a1 1 0 001-1z" clipRule="evenodd" />
                           </svg>
                        </button>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {saleToPrint && (
        <Modal isOpen={!!saleToPrint} onClose={() => setSaleToPrint(null)} title="Print Receipt">
            <div className="space-y-6">
                <div id="receipt-to-print" className="font-mono bg-white p-4 border-2 border-dashed border-gray-400 rounded-lg">
                    <div className="text-center">
                        <h3 className="font-bold text-lg">Jump India Fun Zone</h3>
                        <p className="text-xs">Tax Invoice</p>
                        <p className="text-xs">{new Date(saleToPrint.date).toLocaleString()}</p>
                    </div>
                    <hr className="my-2 border-dashed" />
                    <div className="text-xs">
                        <div className="flex font-bold">
                            <span className="flex-grow">Item</span>
                            <span className="w-8 text-center">Qty</span>
                            <span className="w-16 text-right">Price</span>
                        </div>
                        {groupedItemsForReceipt.map(group => (
                            <div key={group.item.id} className="flex">
                                <span className="flex-grow truncate">{group.item.name}</span>
                                <span className="w-8 text-center">{group.quantity}</span>
                                <span className="w-16 text-right">₹{(group.item.price * group.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <hr className="my-2 border-dashed" />
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Subtotal:</span><span>₹{saleToPrint.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Discount:</span><span>-₹{saleToPrint.discountAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>GST @ 18%:</span><span>+₹{saleToPrint.gstAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-base border-t border-dashed pt-1 mt-1"><span>GRAND TOTAL:</span><span>₹{saleToPrint.total.toFixed(2)}</span></div>
                    </div>
                    <p className="text-center text-xs mt-4">Thank you for visiting!</p>
                </div>
                <div className="pt-4 flex justify-between items-center">
                    <Button variant="secondary" onClick={() => setSaleToPrint(null)}>Close</Button>
                    <Button onClick={() => window.print()} className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 9a1 1 0 01-1 1H9a1 1 0 110-2h4a1 1 0 011 1zm3-4a1 1 0 00-1-1h-6a1 1 0 100 2h6a1 1 0 001-1z" clipRule="evenodd" />
                        </svg>
                        Print Receipt
                    </Button>
                </div>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default History;
