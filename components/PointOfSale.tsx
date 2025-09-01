
import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Sale, CartItem, Product, Transaction } from '../types';
import { TICKET_TYPES, ADD_ONS } from '../constants';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import BulkAssignWaiverModal from './BulkAssignWaiverModal';
import PendingOrdersModal from './PendingOrdersModal';
import { getWaiverStatus } from '../utils/waiverUtils';
import useLocalStorage from '../hooks/useLocalStorage';
import { getTransactionSuggestion } from '../services/geminiService';
import Spinner from './ui/Spinner';


interface PointOfSaleProps {
  sales: Sale[];
  customers: Customer[];
  addSale: (sale: Sale) => void;
  addOrUpdateCustomer: (customer: Customer) => void;
}

const ProductCard: React.FC<{ product: Product; onClick: () => void; disabled: boolean }> = ({ product, onClick, disabled }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`bg-white rounded-lg shadow-sm border-t-4 p-3 text-center flex flex-col items-center justify-between transition-transform transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed border-${product.color}`}
    >
        <product.image className={`w-12 h-12 mb-2 text-${product.color}`} />
        <span className="font-semibold text-gray-700 text-sm">{product.name}</span>
        <span className="text-gray-500 text-xs mt-1">₹{product.price > 0 ? product.price : 'N/A'}</span>
    </button>
);


const PointOfSale: React.FC<PointOfSaleProps> = ({ sales, customers, addSale }) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchMessage, setSearchMessage] = useState<{type: 'error' | 'info', text: string} | null>(null);
  
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('pendingTransactions', []);
  const [activeTransactionId, setActiveTransactionId] = useLocalStorage<string | null>('activeTransactionId', null);

  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isAssignWaiverModalOpen, setAssignWaiverModalOpen] = useState(false);
  const [isPendingOrdersModalOpen, setPendingOrdersModalOpen] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('UPI');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isSuggestionLoading, setSuggestionLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update time every minute
    return () => clearInterval(timer);
  }, []);

  const activeTransaction = useMemo(() => {
    return transactions.find(t => t.id === activeTransactionId) || null;
  }, [transactions, activeTransactionId]);

  useEffect(() => {
    if (activeTransaction && activeTransaction.guests.length > 0) {
      setSuggestionLoading(true);
      setAiSuggestion(''); // Clear previous suggestion
      getTransactionSuggestion(activeTransaction, sales)
        .then(setAiSuggestion)
        .catch(err => {
            console.error(err);
            setAiSuggestion('Could not load suggestion.');
        })
        .finally(() => setSuggestionLoading(false));
    } else {
      setAiSuggestion('');
    }
  }, [activeTransaction, sales]);

  const updateActiveTransaction = (updatedTransaction: Partial<Transaction>) => {
    if (!activeTransactionId) return;
    setTransactions(prev => 
      prev.map(t => t.id === activeTransactionId ? { ...t, ...updatedTransaction } : t)
    );
  };

  const resetAfterSale = () => {
    setTransactions(prev => prev.filter(t => t.id !== activeTransactionId));
    setActiveTransactionId(null);
  }

  const handleCustomerSearch = () => {
    if (!customerSearch.trim()) return;
    setSearchMessage(null);
    const searchTerm = customerSearch.toLowerCase().trim();
    
    const foundCustomer = customers.find(c => c.phone === searchTerm || c.name.toLowerCase().includes(searchTerm));

    if (!foundCustomer) {
        setSearchMessage({type: 'error', text: 'Customer not found. Please ask them to sign the waiver.'});
        return;
    }

    const phone = foundCustomer.phone;
    const existingTransaction = transactions.find(t => t.phone.split(' & ').includes(phone));

    if (existingTransaction) {
        setActiveTransactionId(existingTransaction.id);
        setSearchMessage({type: 'info', text: `Switched to existing transaction for ${phone}.`});
    } else {
        // If the current active transaction is empty, just reuse it for the new customer.
        if (activeTransaction && activeTransaction.cart.length === 0) {
            const allMembers = customers.filter(c => c.phone === phone);
            updateActiveTransaction({ phone, guests: allMembers, cart: [] });
            setSearchMessage({type: 'info', text: `Transaction started for ${phone}.`});
        } else {
            // Create a new transaction
            const newTransactionId = `trans_${new Date().getTime()}`;
            const allMembers = customers.filter(c => c.phone === phone);
            const newTransaction: Transaction = {
                id: newTransactionId,
                phone: phone,
                guests: allMembers,
                cart: [],
            };
            setTransactions(prev => [...prev, newTransaction]);
            setActiveTransactionId(newTransactionId);
            setSearchMessage({type: 'info', text: `Current order saved. New transaction started for ${phone}.`});
        }
    }
    setCustomerSearch('');
  };
  
  const addToCart = (item: Product, type: 'ticket' | 'addon') => {
    if (!activeTransaction) return;

    let assignedGuestId: string | null = null;
    let assignedGuestName: string | null = null;

    // Auto-assign logic for tickets
    if (type === 'ticket') {
        const assignedGuestIds = new Set(
            activeTransaction.cart
                .filter(cartItem => cartItem.type === 'ticket' && cartItem.assignedGuestId)
                .map(cartItem => cartItem.assignedGuestId!)
        );
        
        // Find the first guest with a valid waiver who is not already assigned.
        const availableGuest = activeTransaction.guests.find(
            guest => getWaiverStatus(guest) === 'VALID' && !assignedGuestIds.has(guest.id)
        );

        if (availableGuest) {
            assignedGuestId = availableGuest.id;
            assignedGuestName = availableGuest.name;
        }
    }

    const newCartItem: CartItem = { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        type, 
        assignedGuestId, 
        assignedGuestName
    };
    
    updateActiveTransaction({ cart: [...activeTransaction.cart, newCartItem] });
  };
  
  const handleAddOneToCart = (itemId: string) => {
    if (!activeTransaction) return;
    const itemToAdd = [...TICKET_TYPES, ...ADD_ONS].find(p => p.id === itemId);
    if (itemToAdd) {
        const type = TICKET_TYPES.some(t => t.id === itemId) ? 'ticket' : 'addon';
        addToCart(itemToAdd, type);
    }
  };

  const handleRemoveOneFromCart = (itemId: string) => {
    if (!activeTransaction) return;
    const itemIndexToRemove = activeTransaction.cart.findIndex(cartItem => cartItem.id === itemId);
    if (itemIndexToRemove > -1) {
      const newCart = [...activeTransaction.cart];
      newCart.splice(itemIndexToRemove, 1);
      updateActiveTransaction({ cart: newCart });
    }
  };

  const total = useMemo(() => {
    return activeTransaction?.cart.reduce((sum, item) => sum + item.price, 0) || 0;
  }, [activeTransaction]);
  
  const handleBulkAssignWaiver = (assignments: { [key: number]: string }) => {
    if (!activeTransaction) return;
    const newCart = [...activeTransaction.cart];

    // First, clear all existing ticket assignments. This handles un-assigning.
    for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].type === 'ticket') {
            newCart[i].assignedGuestId = null;
            newCart[i].assignedGuestName = null;
        }
    }

    // Now, apply the new assignments from the modal.
    Object.entries(assignments).forEach(([cartIndexStr, guestId]) => {
        const cartIndex = parseInt(cartIndexStr, 10);
        const guest = activeTransaction.guests.find(g => g.id === guestId);
        if (newCart[cartIndex] && guest) {
            newCart[cartIndex].assignedGuestId = guest.id;
            newCart[cartIndex].assignedGuestName = guest.name;
        }
    });

    updateActiveTransaction({ cart: newCart });
    setAssignWaiverModalOpen(false);
  };

  const handleCheckout = () => {
    if (!activeTransaction || activeTransaction.cart.length === 0) {
        alert("Cart is empty.");
        return;
    }
    setCheckoutModalOpen(true);
  };

  const handleProcessPayment = () => {
    if (!activeTransaction || activeTransaction.guests.length === 0) return;
    const newSale: Sale = {
        id: `sale_${new Date().getTime()}`,
        customerId: activeTransaction.guests[0].id, // Primary guest
        customerName: `${activeTransaction.guests[0].name}${activeTransaction.guests.length > 1 ? ` & group` : ''}`,
        items: activeTransaction.cart,
        total,
        date: new Date().toISOString(),
        paymentMethod
    };
    addSale(newSale);
    setCheckoutModalOpen(false);
    resetAfterSale();
  }

  const canCheckout = useMemo(() => {
    if (!activeTransaction || activeTransaction.cart.length === 0 || activeTransaction.guests.length === 0) return false;
    // Every ticket must be assigned to a guest with a valid waiver
    return activeTransaction.cart.every(item => {
        if (item.type === 'addon') return true;
        if (!item.assignedGuestId) return false;
        const guest = activeTransaction.guests.find(g => g.id === item.assignedGuestId);
        return guest && getWaiverStatus(guest) === 'VALID';
    });
  }, [activeTransaction]);

  const groupedCart = useMemo(() => {
    if (!activeTransaction) return [];
    const groups: { [key: string]: { item: CartItem; quantity: number; itemsWithIndices: { item: CartItem; index: number }[] } } = {};
    activeTransaction.cart.forEach((item, index) => {
      const groupKey = `${item.id}-${item.type}`;
      if (groups[groupKey]) {
        groups[groupKey].quantity++;
        groups[groupKey].itemsWithIndices.push({ item, index });
      } else {
        groups[groupKey] = {
          item,
          quantity: 1,
          itemsWithIndices: [{ item, index }],
        };
      }
    });
    return Object.values(groups);
  }, [activeTransaction]);

  const handleMergeTransactions = (idsToMerge: string[]) => {
    if (!activeTransaction) return;
    const transactionsToMerge = transactions.filter(t => idsToMerge.includes(t.id));
    if (transactionsToMerge.length === 0) return;

    let mergedGuests = [...activeTransaction.guests];
    let mergedCart = [...activeTransaction.cart];
    let mergedPhones = activeTransaction.phone.split(' & ');

    transactionsToMerge.forEach(t => {
      mergedCart = mergedCart.concat(t.cart);
      t.guests.forEach(g => {
        if (!mergedGuests.some(mg => mg.id === g.id)) {
          mergedGuests.push(g);
        }
      });
      mergedPhones.push(t.phone);
    });
    
    const uniquePhones = [...new Set(mergedPhones)];

    updateActiveTransaction({
      guests: mergedGuests,
      cart: mergedCart,
      phone: uniquePhones.join(' & ')
    });

    setTransactions(prev => prev.filter(t => !idsToMerge.includes(t.id)));
    setPendingOrdersModalOpen(false);
  };
  
  const handleDeleteTransaction = (idToDelete: string) => {
    if (idToDelete === activeTransactionId) {
        setActiveTransactionId(null);
    }
    setTransactions(prev => prev.filter(t => t.id !== idToDelete));
  };
  
  const primaryGuest = useMemo(() => activeTransaction?.guests[0] || null, [activeTransaction]);
  const otherGuests = useMemo(() => activeTransaction?.guests.slice(1) || [], [activeTransaction]);
  const lastVisit = useMemo(() => {
    if (!activeTransaction || activeTransaction.guests.length === 0) return 'N/A';
    
    const guestIds = new Set(activeTransaction.guests.map(g => g.id));
    const customerSales = sales
        .filter(s => guestIds.has(s.customerId))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    return customerSales.length > 0 ? new Date(customerSales[0].date).toLocaleDateString() : 'First Visit';
  }, [sales, activeTransaction]);


  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
             <div className="text-gray-900 font-bold text-xl">
               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
             <Button 
                size="sm" 
                variant="secondary"
                onClick={() => setPendingOrdersModalOpen(true)} 
                disabled={transactions.length === 0}
              >
                Pending Orders ({transactions.filter(t => t.id !== activeTransactionId).length})
            </Button>
          </div>
          <div className="flex-1 max-w-lg mx-4">
             <Input 
                label="" 
                id="search-customer" 
                placeholder="Find or start transaction by name/phone..." 
                type="search" 
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setSearchMessage(null); }}
                onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
             />
             {searchMessage && <p className={`text-xs mt-1 ${searchMessage.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>{searchMessage.text}</p>}
          </div>
        </header>
        
        {/* Product Grid */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
           <section>
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Jump Tickets ({TICKET_TYPES.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {TICKET_TYPES.map(ticket => (
                    <ProductCard key={ticket.id} product={ticket} onClick={() => addToCart(ticket, 'ticket')} disabled={!activeTransaction} />
                ))}
              </div>
           </section>
           <section className="mt-8">
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Add-ons ({ADD_ONS.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {ADD_ONS.map(addon => (
                    <ProductCard key={addon.id} product={addon} onClick={() => addToCart(addon, 'addon')} disabled={!activeTransaction} />
                ))}
              </div>
           </section>
        </main>
      </div>
      
      {/* Right Panel: Cart */}
      <aside className="w-96 bg-gray-50 border-l flex flex-col">
        <div className="p-4 flex items-center justify-between gap-2 border-b">
            <Button size="sm" variant="secondary" className="w-full !bg-white !text-emerald-600 border border-emerald-500 hover:!bg-emerald-50">Redeem membership</Button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeTransaction && primaryGuest ? (
                <div className="space-y-4">
                    {/* Customer Detail Card */}
                    <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Customer Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-500">Name:</span>
                                <span className="font-bold text-gray-800">{primaryGuest.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-500">Last Visit:</span>
                                <span className="text-gray-700">{lastVisit}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-500">Waiver:</span>
                                {(() => {
                                    const status = getWaiverStatus(primaryGuest);
                                    const statusClasses = {
                                        VALID: 'bg-green-100 text-green-800',
                                        EXPIRED: 'bg-yellow-100 text-yellow-800',
                                        NONE: 'bg-red-100 text-red-800',
                                    };
                                    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusClasses[status]}`}>{status}</span>
                                })()}
                            </div>
                            {otherGuests.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-500">Other Guests:</span>
                                    <span className="text-gray-700 ml-2">{otherGuests.map(g => g.name).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Suggestion Card */}
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            AI Assistant
                        </h4>
                        <div className="text-sm text-blue-700 mt-2 min-h-[40px]">
                            {isSuggestionLoading ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Spinner />
                                    <span>Generating tip...</span>
                                </div>
                            ) : (
                                <p>{aiSuggestion}</p>
                            )}
                        </div>
                    </div>
                     <hr/>
                </div>
            ) : null}
            
            {!activeTransaction || activeTransaction.cart.length === 0 ? (
                <div className="text-center text-gray-500 pt-16">
                    <p>{activeTransaction ? 'Your cart is empty' : 'Search for a customer to begin'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {groupedCart.some(g => g.item.type === 'ticket') && (
                       <Button size="sm" variant="secondary" className="w-full" onClick={() => setAssignWaiverModalOpen(true)}>Assign Jumpers</Button>
                    )}
                    {groupedCart.map((group) => (
                        <div key={`${group.item.id}-${group.item.type}`} className="p-2 bg-white rounded-md shadow-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm">{group.item.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleRemoveOneFromCart(group.item.id)} className="text-gray-400 hover:text-red-600 w-6 h-6 rounded-full flex items-center justify-center">-</button>
                              <span className="font-bold w-4 text-center">{group.quantity}</span>
                              <button onClick={() => handleAddOneToCart(group.item.id)} className="text-gray-400 hover:text-green-600 w-6 h-6 rounded-full flex items-center justify-center">+</button>
                              <span className="text-sm w-16 text-right">₹{group.item.price * group.quantity}</span>
                            </div>
                          </div>
                          {group.item.type === 'ticket' && (
                            <div className="pl-2 mt-2 pt-2 border-t border-gray-100 space-y-1">
                              {group.itemsWithIndices.map(({ item }, subIndex) => (
                                <div key={`${item.id}-${subIndex}`} className="flex justify-between items-center text-xs">
                                  <span className="text-gray-600">Jumper {subIndex + 1}:</span>
                                  {item.assignedGuestName ?
                                    <span className="font-medium text-green-800 bg-green-100 px-2 py-0.5 rounded-full">{item.assignedGuestName}</span>
                                    : <span className="font-medium text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full">Not Assigned</span>
                                  }
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="p-4 border-t bg-white">
            <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total</span>
                <span>₹{total}</span>
            </div>
            <Button className="w-full" onClick={handleCheckout} disabled={!canCheckout}>
               Pay
            </Button>
        </div>
      </aside>

      {/* Modals */}
      {activeTransaction && (
        <BulkAssignWaiverModal
          isOpen={isAssignWaiverModalOpen}
          onClose={() => setAssignWaiverModalOpen(false)}
          transaction={activeTransaction}
          onAssign={handleBulkAssignWaiver}
        />
      )}

      <PendingOrdersModal
        isOpen={isPendingOrdersModalOpen}
        onClose={() => setPendingOrdersModalOpen(false)}
        transactions={transactions}
        activeTransactionId={activeTransactionId}
        setActiveTransactionId={setActiveTransactionId}
        onMerge={handleMergeTransactions}
        onDelete={handleDeleteTransaction}
      />


      <Modal isOpen={isCheckoutModalOpen} onClose={() => setCheckoutModalOpen(false)} title="Complete Payment">
        <div className="space-y-4">
            <p>Paying for: <span className="font-semibold">{activeTransaction?.guests.map(g => g.name).join(', ')}</span></p>
            <p className="text-3xl font-bold">Total Amount: ₹{total}</p>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="flex gap-4">
                    {(['UPI', 'Card', 'Cash'] as const).map(method => (
                        <button key={method} onClick={() => setPaymentMethod(method)} className={`px-4 py-2 rounded-md border ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>
                            {method}
                        </button>
                    ))}
                </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setCheckoutModalOpen(false)}>Cancel</Button>
                <Button variant="success" onClick={handleProcessPayment}>Confirm Payment</Button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default PointOfSale;