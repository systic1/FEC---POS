import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Sale, Customer } from '../types';
import { getSafetyTip } from '../services/geminiService';
import Card from './ui/Card';

interface DashboardProps {
  sales: Sale[];
  customers: Customer[];
}

const Dashboard: React.FC<DashboardProps> = ({ sales, customers }) => {
  const [safetyTip, setSafetyTip] = useState('');

  useEffect(() => {
    getSafetyTip().then(setSafetyTip);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const { totalRevenue, todayRevenue, todaySalesCount, newCustomersToday } = useMemo(() => {
    let totalRevenue = 0;
    let todayRevenue = 0;
    let todaySalesCount = 0;
    let newCustomersToday = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    sales.forEach(sale => {
      totalRevenue += sale.total;
      if (new Date(sale.date) >= todayStart) {
        todayRevenue += sale.total;
        todaySalesCount++;
      }
    });

    customers.forEach(customer => {
        if (customer.waiverSignedOn && new Date(customer.waiverSignedOn) >= todayStart) {
            newCustomersToday++;
        }
    });

    return { totalRevenue, todayRevenue, todaySalesCount, newCustomersToday };
  }, [sales, customers]);

  const chartData = useMemo(() => {
     // Aggregate sales by hour for today
     const hourlySales: { [hour: string]: number } = {};
     for (let i = 8; i < 22; i++) {
        hourlySales[`${i}:00`] = 0;
     }

     sales.forEach(sale => {
         const saleDate = new Date(sale.date);
         if (saleDate.toISOString().split('T')[0] === today) {
             const hour = saleDate.getHours();
             if (hourlySales[`${hour}:00`] !== undefined) {
                hourlySales[`${hour}:00`] += sale.total;
             }
         }
     });

     return Object.entries(hourlySales).map(([name, sales]) => ({ name, sales }));
  }, [sales, today]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* AI Safety Tip */}
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
            <h3 className="font-semibold">Safety Tip of the Day</h3>
            <p>{safetyTip || 'Loading tip...'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <h4 className="text-gray-500 font-medium">Today's Revenue</h4>
          <p className="text-3xl font-bold text-gray-800">₹{todayRevenue.toLocaleString('en-IN')}</p>
        </Card>
        <Card>
          <h4 className="text-gray-500 font-medium">Today's Sales</h4>
          <p className="text-3xl font-bold text-gray-800">{todaySalesCount}</p>
        </Card>
        <Card>
          <h4 className="text-gray-500 font-medium">New Customers Today</h4>
          <p className="text-3xl font-bold text-gray-800">{newCustomersToday}</p>
        </Card>
         <Card>
          <h4 className="text-gray-500 font-medium">Total Revenue</h4>
          <p className="text-3xl font-bold text-gray-800">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Today's Sales by Hour</h2>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales (₹)" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;