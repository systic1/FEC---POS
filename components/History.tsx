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

const ReceiptModal: React.FC<{ sale: Sale, onClose: () => void }> = ({ sale, onClose }) => {
    const handlePrint = () => {
        // The print styles in index.html will handle showing only the receipt
        window.print();
    };

    return (
        <Modal isOpen={!!sale} onClose={onClose} title="Print Receipt" size="sm">
            <div id="receipt-to-print" className="p-4 bg-white text-black font-mono text-sm">
                <div className="text-center mb-4">
                    <h2 className="font-bold text-lg">Jump India Fun Zone</h2>
                    <p>Mumbai, India</p>
                    <p>GSTIN: XXXXXXXXXXXXXXX</p>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span>{sale.id.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(sale.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{sale.customerName}</span>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div>
                    <div className="flex font-bold">
                        <span className="flex-1">Item</span>
                        <span className="w-20 text-right">Price</span>
                    </div>
                    {sale.items.map((item, index) => (
                        <div key={index} className="flex">
                            <span className="flex-1 pr-2">{item.name}</span>
                            <span className="w-20 text-right">₹{item.price.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>- ₹{sale.discountAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{sale.gstAmount.toFixed(2)}</span>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span>₹{sale.total.toFixed(2)}</span>
                </div>
                <hr className="my-2 border-dashed border-black" />
                 <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span>{sale.paymentMethod}</span>
                </div>
                {sale.upiId && (
                    <div className="flex justify-between">
                        <span>UPI ID:</span>
                        <span>{sale.upiId}</span>
                    </div>
                )}
                <div className="text-center mt-4">
                    <p>Thank you for visiting!</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 print:hidden">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handlePrint}>Print</Button>
            </div>
        </Modal>
    );
};

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

    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= start && saleDate <= end;
    });

    filtered.sort((a, b) => {
        const valA = sortConfig.key === 'date' ? new Date(a.date).getTime() : a.total;
        const valB = sortConfig.key === 'date' ? new Date(b.date).getTime() : b.total;

        if (valA < valB) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return filtered;
  }, [sales, startDate, endDate, sortConfig]);

  const requestSort = (key: 'date' | 'total') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: 'date' | 'total') => {
      if (sortConfig.key !== key) return '↕';
      return sortConfig.direction === 'asc' ? '↑' : '↓';
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales History</h1>
      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
            <Input 
                label="Start Date"
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
            />
            <Input 
                label="End Date"
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
            />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('date')}>
                  Date & Time {getSortIndicator('date')}
                </th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Guests</th>
                <th scope="col" className="px-6 py-3">Items</th>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('total')}>
                  Total {getSortIndicator('total')}
                </th>
                <th scope="col" className="px-6 py-3">Payment Method</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{new Date(sale.date).toLocaleString()}</td>
                  <td className="px-6 py-4">{sale.customerName}</td>
                  <td className="px-6 py-4">{countGuests(sale.items)}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={summarizeCart(sale.items)}>
                    {summarizeCart(sale.items)}
                  </td>
                  <td className="px-6 py-4 font-bold">₹{sale.total.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">{sale.paymentMethod}</td>
                   <td className="px-6 py-4">
                    <Button size="sm" variant="secondary" onClick={() => setSaleToPrint(sale)}>
                      Receipt
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">No sales found for the selected date range.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {saleToPrint && <ReceiptModal sale={saleToPrint} onClose={() => setSaleToPrint(null)} />}
    </div>
  );
};

export default History;
