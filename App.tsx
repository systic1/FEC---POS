


import React, { useState, useCallback } from 'react';
import { Customer, Sale } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Dashboard from './components/Dashboard';
import PointOfSale from './components/PointOfSale';
import CustomerManagement from './components/CustomerManagement';
import History from './components/History';
import { MOCK_CUSTOMERS } from './constants';

type View = 'dashboard' | 'sale' | 'history' | 'customers';

const App: React.FC = () => {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', MOCK_CUSTOMERS);
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', []);
  const [activeView, setActiveView] = useState<View>('sale');

  const addSale = useCallback((sale: Sale) => {
    setSales(prev => [...prev, sale]);
  }, [setSales]);

  const addOrUpdateCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => {
        const index = prev.findIndex(c => c.id === customer.id);
        if (index > -1) {
            const updatedCustomers = [...prev];
            updatedCustomers[index] = customer;
            return updatedCustomers;
        }
        return [...prev, customer];
    });
  }, [setCustomers]);

  const Sidebar: React.FC<{ setView: (view: View) => void; currentView: View }> = ({ setView, currentView }) => {
    const navItems: { id: View; label: string; icon: JSX.Element }[] = [
      { id: 'dashboard', label: 'Search', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
      { id: 'sale', label: 'Entry', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
      { id: 'history', label: 'History', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { id: 'customers', label: 'Membership', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
    ];
  
    return (
      <aside className="w-24 bg-gray-900 text-gray-300 flex flex-col items-center py-4 space-y-4">
        <div className="text-2xl font-bold text-white">JUMP</div>
        <nav className="flex-grow w-full">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id)}
                  disabled={item.id === 'dashboard'}
                  className={`w-full flex flex-col items-center justify-center py-3 transition-colors duration-200 relative ${currentView === item.id ? 'text-white' : 'hover:bg-gray-800 hover:text-white'} disabled:opacity-50 disabled:hover:bg-transparent`}
                >
                  {currentView === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full"></div>}
                  <div className={`p-2 rounded-lg ${currentView === item.id ? 'bg-emerald-500' : ''}`}>
                    {item.icon}
                  </div>
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    );
  };

  const renderView = () => {
    switch(activeView) {
      case 'dashboard':
        return <Dashboard sales={sales} customers={customers} />;
      case 'sale':
        return <PointOfSale sales={sales} customers={customers} addSale={addSale} addOrUpdateCustomer={addOrUpdateCustomer} />;
      case 'history':
        return <History sales={sales} />;
      case 'customers':
        return <CustomerManagement customers={customers} addOrUpdateCustomer={addOrUpdateCustomer}/>;
      default:
        return <Dashboard sales={sales} customers={customers} />;
    }
  }

  return (
    <div className="flex bg-slate-100 h-screen overflow-hidden">
      <Sidebar setView={setActiveView} currentView={activeView} />
      <main className="flex-1 min-h-screen overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;