import React, { useMemo } from 'react';
import { Sale, CartItem } from '../types';
import Card from './ui/Card';

interface HistoryProps {
  sales: Sale[];
}

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
        if (item.type === 'ticket' && item.assignedGuestId) {
            guestIds.add(item.assignedGuestId);
        }
    });
    // If no tickets are assigned, but there are add-ons, we can assume at least one guest.
    if (guestIds.size === 0 && items.length > 0) return 1;
    return guestIds.size;
}

const History: React.FC<HistoryProps> = ({ sales }) => {
  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales
      .filter(sale => new Date(sale.date) >= today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by most recent first
  }, [sales]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Today's Transaction History</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Time</th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Service Chosen</th>
                <th scope="col" className="px-6 py-3 text-center">Guests</th>
                <th scope="col" className="px-6 py-3">Payment Type</th>
                <th scope="col" className="px-6 py-3 text-right">Total (incl. GST)</th>
              </tr>
            </thead>
            <tbody>
              {todaySales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">No sales recorded today.</td>
                </tr>
              ) : (
                todaySales.map(sale => (
                  <tr key={sale.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{sale.customerName}</td>
                    <td className="px-6 py-4">{summarizeCart(sale.items)}</td>
                    <td className="px-6 py-4 text-center">{countGuests(sale.items)}</td>
                    <td className="px-6 py-4">{sale.paymentMethod}</td>
                    <td className="px-6 py-4 text-right font-semibold">₹{sale.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default History;
