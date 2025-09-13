import React, { useMemo, useState, useEffect } from 'react';
import { Sale, CartItem } from '../types';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import ReceiptModal from './ReceiptModal';

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
  const [printTrigger, setPrintTrigger] = useState(false);

  const handleCloseModal = () => {
    setSaleToPrint(null);
    setPrintTrigger(false); // Reset trigger on close to allow re-printing
  };

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
                     <div className="flex items-center gap-2">
                        <Button size="sm" variant="primary" onClick={() => {
                            setPrintTrigger(true);
                            setSaleToPrint(sale);
                        }}>
                          Print
                        </Button>
                    </div>
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
      {saleToPrint && <ReceiptModal sale={saleToPrint} onClose={handleCloseModal} shouldPrint={printTrigger} />}
    </div>
  );
};

export default History;
