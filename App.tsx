import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Customer, Sale, CashDrawerSession, CashDeposit } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Dashboard from './components/Dashboard';
import PointOfSale from './components/PointOfSale';
import CustomerManagement from './components/CustomerManagement';
import History from './components/History';
import StaffManagement from './components/StaffManagement';
import { MOCK_CUSTOMERS } from './constants';
import Login from './components/Login';
import { User, Role, DEFAULT_USERS } from './auth';
import OpenRegisterModal from './components/cash-drawer/OpenRegisterModal';
import CloseRegisterModal from './components/cash-drawer/CloseRegisterModal';
import CashDrawerHistory from './components/cash-drawer/CashDrawerHistory';
import { getOpeningBalanceSuggestion, OpeningBalanceSuggestion } from './services/geminiService';
import CashDepositModal from './components/cash-drawer/CashDepositModal';

type View = 'dashboard' | 'sale' | 'history' | 'customers' | 'staff' | 'cashdrawer';

// Define which roles can access which views
const viewPermissions: Record<View, Role[]> = {
  dashboard: ['admin'],
  sale: ['staff', 'manager', 'admin'],
  history: ['manager', 'admin'],
  customers: ['manager', 'admin'],
  staff: ['admin'],
  cashdrawer: ['manager', 'admin'],
};


const App: React.FC = () => {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', MOCK_CUSTOMERS);
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', []);
  const [users, setUsers] = useLocalStorage<User[]>('users', DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  const [cashDrawerSessions, setCashDrawerSessions] = useLocalStorage<CashDrawerSession[]>('cashDrawerSessions', []);
  
  const [isClosingRegister, setIsClosingRegister] = useState(false);
  const [isOpeningRegister, setIsOpeningRegister] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  
  const [openingSuggestion, setOpeningSuggestion] = useState<OpeningBalanceSuggestion | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  const activeCashDrawerSession = useMemo(() => 
    cashDrawerSessions.find(s => s.status === 'OPEN'),
  [cashDrawerSessions]);

  const getDefaultView = (role: Role | undefined): View => {
    if (!role) return 'sale'; 
    if (viewPermissions.sale.includes(role)) return 'sale';
    if (viewPermissions.history.includes(role)) return 'history';
    if (viewPermissions.customers.includes(role)) return 'customers';
    if (viewPermissions.dashboard.includes(role)) return 'dashboard';
    if (viewPermissions.staff.includes(role)) return 'staff';
    if (viewPermissions.cashdrawer.includes(role)) return 'cashdrawer';
    return 'sale'; 
  };
  
  const [activeView, setActiveView] = useState<View>(() => getDefaultView(currentUser?.role));

  const prepareToOpenRegister = async () => {
    setIsOpeningRegister(true);
    setIsSuggestionLoading(true);

    const sortedClosedSessions = cashDrawerSessions
      .filter(s => s.status === 'CLOSED' && s.closingBalance !== null && s.closingTime)
      .sort((a, b) => new Date(b.closingTime!).getTime() - new Date(a.closingTime!).getTime());
    
    const lastClosingBalance = sortedClosedSessions[0]?.closingBalance || null;
    const lastClosingTime = sortedClosedSessions[0]?.closingTime || null;
    const historicalOpeningBalances = cashDrawerSessions
      .slice(-5) // get last 5 for context
      .map(s => s.openingBalance);

    const suggestion = await getOpeningBalanceSuggestion(lastClosingBalance, lastClosingTime, historicalOpeningBalances);
    setOpeningSuggestion(suggestion);
    setIsSuggestionLoading(false);
  };
  
  useEffect(() => {
    // If a user is logged in, is not an admin, and has no active session, prompt to open one.
    if (currentUser && currentUser.role !== 'admin' && !activeCashDrawerSession) {
        prepareToOpenRegister();
    } else {
        setIsOpeningRegister(false);
    }
  }, [currentUser, activeCashDrawerSession, cashDrawerSessions]);


  const authenticateUser = (code: string): User | null => {
    return users.find(user => user.code === code) || null;
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveView(getDefaultView(user.role));
  };
  
  const handleLogout = () => {
     setCurrentUser(null);
  };

  const startCashDrawerSession = (openingBalance: number, reason?: string) => {
    if (!currentUser) return;
    const newSession: CashDrawerSession = {
        id: `session_${new Date().getTime()}`,
        openingTime: new Date().toISOString(),
        closingTime: null,
        openingBalance,
        ...(reason && { openingBalanceDiscrepancyReason: reason }),
        closingBalance: null,
        openedByUserId: currentUser.code,
        closedByUserId: null,
        status: 'OPEN',
        deposits: [],
    };
    setCashDrawerSessions(prev => [...prev, newSession]);
    setIsOpeningRegister(false);
    setOpeningSuggestion(null);
  };

  const endCashDrawerSession = (
    closingBalance: number, 
    reason?: string, 
    attachment?: { name: string; type: string; data: string; }
  ) => {
    if (!currentUser || !activeCashDrawerSession) return;
    setCashDrawerSessions(prev => 
        prev.map(s => 
            s.id === activeCashDrawerSession.id 
            ? {
                ...s,
                status: 'CLOSED' as const,
                closingTime: new Date().toISOString(),
                closingBalance,
                closedByUserId: currentUser.code,
                ...(reason && { discrepancyReason: reason }),
                ...(attachment && { discrepancyAttachment: attachment }),
            }
            : s
        )
    );
    setIsClosingRegister(false);
    setCurrentUser(null); // Log out after closing register
  };

  const addCashDeposit = (amount: number, notes?: string) => {
    if (!currentUser || !activeCashDrawerSession) return;
    const newDeposit: CashDeposit = {
      id: `dep_${new Date().getTime()}`,
      amount,
      timestamp: new Date().toISOString(),
      userId: currentUser.code,
      ...(notes && { notes }),
    };

    setCashDrawerSessions(prev =>
      prev.map(s =>
        s.id === activeCashDrawerSession.id
          ? { ...s, deposits: [...(s.deposits || []), newDeposit] }
          : s
      )
    );
    setIsDepositModalOpen(false);
  };

  const addSale = useCallback((sale: Sale) => {
    if (!activeCashDrawerSession && sale.paymentMethod === 'Cash') {
        alert("Cannot process cash sale. No active cash register session.");
        return;
    }
    setSales(prev => [...prev, sale]);
  }, [setSales, activeCashDrawerSession]);

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

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const deleteUser = (code: string) => {
    setUsers(prev => prev.filter(user => user.code !== code));
  };
  
  const updateUser = (originalCode: string, updatedUserData: User) => {
    setUsers(prev => prev.map(user => user.code === originalCode ? updatedUserData : user));
  };

  const Sidebar: React.FC<{ 
    setView: (view: View) => void; 
    currentView: View; 
    user: User;
  }> = ({ setView, currentView, user }) => {
    const allNavItems: { id: View; label: string; icon: JSX.Element }[] = [
      { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
      { id: 'sale', label: 'Entry', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
      { id: 'history', label: 'History', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { id: 'customers', label: 'Customers', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
      { id: 'cashdrawer', label: 'Cash Drawer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
      { id: 'staff', label: 'Staff', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    ];
    
    const navItems = allNavItems.filter(item => viewPermissions[item.id].includes(user.role));
  
    return (
      <aside className="w-24 bg-gray-900 text-gray-300 flex flex-col items-center py-4 space-y-4">
        <div className="text-2xl font-bold text-white">JUMP</div>
        <nav className="flex-grow w-full">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id)}
                  className={`w-full flex flex-col items-center justify-center py-3 transition-colors duration-200 relative ${currentView === item.id ? 'text-white' : 'hover:bg-gray-800 hover:text-white'} disabled:opacity-50`}
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
        <div className="w-full px-2">
            <div className="text-center mb-2">
                <p className="text-xs font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
            {user.role === 'admin' ? (
                <button
                    onClick={handleLogout}
                    className="w-full flex flex-col items-center justify-center py-3 transition-colors duration-200 hover:bg-red-800 hover:text-white rounded-md"
                    aria-label="Logout"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xs mt-1">Logout</span>
                </button>
            ) : (
                 activeCashDrawerSession && (
                    <button
                        onClick={() => setIsClosingRegister(true)}
                        className="w-full flex flex-col items-center justify-center py-3 transition-colors duration-200 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md"
                        aria-label="End Shift"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs mt-1">End Shift</span>
                    </button>
                 )
            )}
        </div>
      </aside>
    );
  };

  const renderView = () => {
    if (!currentUser || !viewPermissions[activeView].includes(currentUser.role)) {
        return (
            <div className="p-8 text-center flex items-center justify-center h-full">
                <div>
                    <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    switch(activeView) {
      case 'dashboard':
        return <Dashboard sales={sales} customers={customers} />;
      case 'sale':
        return <PointOfSale sales={sales} customers={customers} addSale={addSale} addOrUpdateCustomer={addOrUpdateCustomer} activeCashDrawerSession={activeCashDrawerSession} currentUser={currentUser} onMakeDeposit={() => setIsDepositModalOpen(true)} />;
      case 'history':
        return <History sales={sales} />;
      case 'customers':
        return <CustomerManagement customers={customers} addOrUpdateCustomer={addOrUpdateCustomer}/>;
      case 'staff':
        return <StaffManagement users={users} addUser={addUser} deleteUser={deleteUser} updateUser={updateUser} />;
      case 'cashdrawer':
        return <CashDrawerHistory sessions={cashDrawerSessions} users={users} sales={sales} />;
      default:
        return <Dashboard sales={sales} customers={customers} />;
    }
  }
  
  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} authenticate={authenticateUser} />;
  }

  return (
    <div className="flex bg-slate-100 h-screen overflow-hidden">
      <Sidebar setView={setActiveView} currentView={activeView} user={currentUser} />
      <main className="flex-1 min-h-screen overflow-y-auto">
        {renderView()}
      </main>

      {isOpeningRegister && (
        <OpenRegisterModal 
            onSessionStart={startCashDrawerSession}
            isLoading={isSuggestionLoading}
            suggestion={openingSuggestion}
        />
      )}
  
      {isClosingRegister && (
        <CloseRegisterModal 
            onClose={() => setIsClosingRegister(false)}
            onSessionEnd={endCashDrawerSession}
            session={activeCashDrawerSession!}
            sales={sales}
            currentUser={currentUser}
        />
      )}
       {isDepositModalOpen && activeCashDrawerSession && (
        <CashDepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          onConfirmDeposit={addCashDeposit}
          session={activeCashDrawerSession}
          sales={sales}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default App;