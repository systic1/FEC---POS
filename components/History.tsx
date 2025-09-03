import React, { useMemo, useState } from 'react';
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
        if ((item.type === 'ticket' || item.type === 'membership') && item.assignedGuestId) {
            guestIds.add(item.assignedGuestId);
        }
    });
    // If no tickets are assigned, but there are add-ons, we can assume at least one guest from the primary customer.
    if (guestIds.size === 0 && items.length > 0) return 1;
    return guestIds.size;
}

const History: React.FC<HistoryProps> = ({ sales }) => {
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'total', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales.filter(sale => new Date(sale.date) >= today);
  }, [sales]);

  const sortedTodaySales = useMemo(() => {
    const sortableSales = [...todaySales];
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
  }, [todaySales, sortConfig]);

  const { totalRevenue, totalGuests } = useMemo(() => {
      const revenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      const guests = todaySales.reduce((sum, sale) => sum + countGuests(sale.items), 0);
      return { totalRevenue: revenue, totalGuests: guests };
  }, [todaySales]);

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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Today's Transaction History</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h4 className="text-gray-500 font-medium">Today's Total Revenue</h4>
          <p className="text-3xl font-bold text-gray-800">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </Card>
        <Card>
          <h4 className="text-gray-500 font-medium">Total Customers Today</h4>
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
              </tr>
            </thead>
            <tbody>
              {sortedTodaySales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">No sales recorded today.</td>
                </tr>
              ) : (
                sortedTodaySales.map(sale => {
                  const uniqueAssignedGuests = Array.from(new Set(
                    sale.items
                        .filter(item => (item.type === 'ticket' || item.type === 'membership') && item.assignedGuestName)
                        .map(item => item.assignedGuestName!)
                  ));

                  let customerDisplayName = sale.customerName.split(' +')[0].trim();
                  const guestCountForDisplay = countGuests(sale.items);

                  if (uniqueAssignedGuests.length > 0) {
                      const primaryName = sale.customerName.split(' +')[0].trim();
                      const primaryIsJumper = uniqueAssignedGuests.includes(primaryName);
                      const displayNameToShow = primaryIsJumper ? primaryName : uniqueAssignedGuests[0];
                      
                      customerDisplayName = `${displayNameToShow}${uniqueAssignedGuests.length > 1 ? ` + ${uniqueAssignedGuests.length - 1}` : ''}`;
                  }

                  return (
                    <tr key={sale.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{customerDisplayName}</td>
                      <td className="px-6 py-4">{summarizeCart(sale.items)}</td>
                      <td className="px-6 py-4 text-center">{guestCountForDisplay}</td>
                      <td className="px-6 py-4">{sale.paymentMethod}</td>
                      <td className="px-6 py-4 text-right font-semibold">₹{sale.total.toLocaleString('en-IN')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default History;