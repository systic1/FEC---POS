import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Sale, CartItem, Product, Transaction } from '../types';
import { TICKET_TYPES, ADD_ONS, MEMBERSHIP_TYPES } from '../constants';
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
  
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'GPay' | 'PhonePe' | 'Paytm'>('GPay');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isSuggestionLoading, setSuggestionLoading] = useState(false);

  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState({ type: 'fixed', value: '' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update time every minute
    return () => clearInterval(timer);
  }, []);
  

  const activeTransaction = useMemo(() => {
    return transactions.find(t => t.id === activeTransactionId) || null;
  }, [transactions, activeTransactionId]);

  const activeGuestsInCart = useMemo(() => {
    if (!activeTransaction) return [];
    const assignedGuestIds = new Set(
        activeTransaction.cart
            .filter(item => item.type === 'ticket' && item.assignedGuestId)
            .map(item => item.assignedGuestId!)
    );
    // If tickets are assigned, the active guests are those assigned.
    if (assignedGuestIds.size > 0) {
        return activeTransaction.guests.filter(g => assignedGuestIds.has(g.id));
    }
    // If no tickets assigned (e.g. only addons), default to the primary guest of the transaction.
    return activeTransaction.guests.length > 0 ? [activeTransaction.guests[0]] : [];
  }, [activeTransaction]);

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

  const handleCustomerSearch = (term?: string) => {
    const searchTerm = (term || customerSearch).trim();
    if (!searchTerm) return;
    setSearchMessage(null);
    
    let groupGuests: Customer[] = [];
    let groupPhone: string | null = null;
    
    // Search by Group ID first
    if (searchTerm.toUpperCase().startsWith('JMP-')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        groupGuests = customers.filter(c => c.groupId === searchTerm.toUpperCase() && c.groupWaiverDate && new Date(c.groupWaiverDate) >= today);
        if (groupGuests.length > 0) {
            groupPhone = groupGuests[0].phone; // Use first member's phone for display
        }
    } else {
        // Search by phone or name
        const foundCustomer = customers.find(c => c.phone === searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (foundCustomer) {
            // Check if this customer is part of a recent group waiver
            if (foundCustomer.groupId && foundCustomer.groupWaiverDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (new Date(foundCustomer.groupWaiverDate) >= today) {
                    groupGuests = customers.filter(c => c.groupId === foundCustomer.groupId);
                    groupPhone = foundCustomer.phone;
                }
            }
            // If not in a recent group, just load this customer and their phone-linked family
            if (groupGuests.length === 0) {
                groupGuests = customers.filter(c => c.phone === foundCustomer.phone);
                groupPhone = foundCustomer.phone;
            }
        }
    }

    if (groupGuests.length === 0) {
        setSearchMessage({type: 'error', text: 'Customer or group not found. Please ask them to sign the waiver.'});
        return;
    }

    const primaryPhone = groupPhone!;
    const existingTransaction = transactions.find(t => t.phone.split(' & ').includes(primaryPhone));

    if (existingTransaction) {
        setActiveTransactionId(existingTransaction.id);
        setSearchMessage({type: 'info', text: `Switched to existing transaction for ${primaryPhone}.`});
    } else {
        // If the current active transaction is empty, just reuse it for the new customer.
        if (activeTransaction && activeTransaction.cart.length === 0) {
            updateActiveTransaction({ phone: primaryPhone, guests: groupGuests, cart: [], discount: { type: 'fixed', value: 0 } });
            setSearchMessage({type: 'info', text: `Transaction started for group.`});
        } else {
            // Create a new transaction
            const newTransactionId = `trans_${new Date().getTime()}`;
            const newTransaction: Transaction = {
                id: newTransactionId,
                phone: primaryPhone,
                guests: groupGuests,
                cart: [],
                discount: { type: 'fixed', value: 0 },
            };
            setTransactions(prev => [...prev, newTransaction]);
            setActiveTransactionId(newTransactionId);
            setSearchMessage({type: 'info', text: `Current order saved. New transaction started for group.`});
        }
    }
    setCustomerSearch('');
  };
  
  const addToCart = (item: Product, type: 'ticket' | 'addon' | 'membership') => {
    if (!activeTransaction) return;

    let assignedGuestId: string | null = null;
    let assignedGuestName: string | null = null;

    // Auto-assign logic for tickets & memberships
    if (type === 'ticket' || type === 'membership') {
        const assignedGuestIds = new Set(
            activeTransaction.cart
                .filter(cartItem => (cartItem.type === 'ticket' || cartItem.type === 'membership') && cartItem.assignedGuestId)
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
    const itemToAdd = [...TICKET_TYPES, ...ADD_ONS, ...MEMBERSHIP_TYPES].find(p => p.id === itemId);
    if (itemToAdd) {
        let type: 'ticket' | 'addon' | 'membership' = 'addon';
        if (TICKET_TYPES.some(t => t.id === itemId)) {
            type = 'ticket';
        } else if (MEMBERSHIP_TYPES.some(m => m.id === itemId)) {
            type = 'membership';
        }
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
  
  const { subtotal, discountAmount, gstAmount, grandTotal } = useMemo(() => {
    if (!activeTransaction) {
      return { subtotal: 0, discountAmount: 0, gstAmount: 0, grandTotal: 0 };
    }
    const sub = activeTransaction.cart.reduce((sum, item) => sum + item.price, 0);
    let discAmount = 0;
    if (activeTransaction.discount.type === 'percentage') {
      discAmount = sub * (activeTransaction.discount.value / 100);
    } else {
      discAmount = activeTransaction.discount.value;
    }
    discAmount = Math.min(sub, discAmount); // Discount can't be more than subtotal

    const totalAfterDiscount = sub - discAmount;
    const gst = totalAfterDiscount * 0.18; // 18% GST
    const total = totalAfterDiscount + gst;

    return {
      subtotal: sub,
      discountAmount: discAmount,
      gstAmount: gst,
      grandTotal: total,
    };
  }, [activeTransaction]);

  const handleBulkAssignWaiver = (assignments: { [key: number]: string }) => {
    if (!activeTransaction) return;
    const newCart = [...activeTransaction.cart];

    // First, clear all existing ticket assignments. This handles un-assigning.
    for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].type === 'ticket' || newCart[i].type === 'membership') {
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
    if (!activeTransaction || !canCheckout) return;
    
    const saleGuests = activeGuestsInCart.length > 0 ? activeGuestsInCart : (activeTransaction.guests.length > 0 ? [activeTransaction.guests[0]] : []);
    
    if (saleGuests.length === 0) return;

    const primarySaleGuest = saleGuests[0];
    
    const newSale: Omit<Sale, 'id'> & {id: string} = {
        id: `sale_${new Date().getTime()}`,
        customerId: primarySaleGuest.id, // Primary guest from the active ones
        customerName: `${primarySaleGuest.name}${saleGuests.length > 1 ? ` + ${saleGuests.length - 1}` : ''}`,
        items: activeTransaction.cart,
        subtotal,
        discountAmount,
        gstAmount,
        total: grandTotal,
        date: new Date().toISOString(),
        paymentMethod,
    };
    addSale(newSale);
    setCheckoutModalOpen(false);
    resetAfterSale();
  }
  
  const handleApplyDiscount = () => {
    const value = parseFloat(discountInput.value);
    if (!isNaN(value) && value >= 0) {
        updateActiveTransaction({
            discount: {
                type: discountInput.type as 'fixed' | 'percentage',
                value: value,
            },
        });
        setIsApplyingDiscount(false);
        setDiscountInput({ type: 'fixed', value: '' });
    }
  };

  const handleRemoveDiscount = () => {
      updateActiveTransaction({
          discount: { type: 'fixed', value: 0 },
      });
      setIsApplyingDiscount(false);
  };

  const canCheckout = useMemo(() => {
    if (!activeTransaction || activeTransaction.cart.length === 0 || activeTransaction.guests.length === 0) return false;
    // Every ticket or membership must be assigned to a guest with a valid waiver
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
                placeholder="Find group by Group Code, phone, or name..." 
                type="search" 
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setSearchMessage(null); }}
                onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
             />
          </div>
          {searchMessage && <p className={`text-xs mt-1 text-center ${searchMessage.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>{searchMessage.text}</p>}
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
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Memberships ({MEMBERSHIP_TYPES.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {MEMBERSHIP_TYPES.map(membership => (
                    <ProductCard key={membership.id} product={membership} onClick={() => addToCart(membership, 'membership')} disabled={!activeTransaction} />
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
                                    <span className="font-medium text-gray-500">Other Guests ({otherGuests.length}):</span>
                                    <span className="text-gray-700 ml-2 text-right block truncate">{otherGuests.map(g => g.name).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Suggestion Card */}
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.657 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM15 12a4 4 0 01-8 0c0-1.682.906-3.143 2.197-3.812a.5.5 0 01.403.906A3.001 3.001 0 007 12c0 1.654 1.346 3 3 3s3-1.346 3-3c0-.38-.07-.746-.201-1.094a.5.5 0 01.906-.403A3.999 3.999 0 0115 12z" />
                            </svg>
                            AI Assistant
                        </h4>
                        <div className="text-sm text-blue-700 min-h-[40px]">
                            {isSuggestionLoading ? <Spinner /> : <p>{aiSuggestion || 'No suggestions at the moment.'}</p>}
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-3">
                        {groupedCart.map(({ item, quantity, itemsWithIndices }) => (
                            <div key={`${item.id}-${item.type}`} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">₹{item.price.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleRemoveOneFromCart(item.id)} className="w-6 h-6 rounded-full bg-gray-200 text-gray-700">-</button>
                                        <span className="font-bold w-6 text-center">{quantity}</span>
                                        <button onClick={() => handleAddOneToCart(item.id)} className="w-6 h-6 rounded-full bg-gray-200 text-gray-700">+</button>
                                    </div>
                                </div>
                                {(item.type === 'ticket' || item.type === 'membership') && (
                                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                                        {itemsWithIndices.map(({ item: singleItem, index }) => (
                                            <div key={index}>
                                                {singleItem.assignedGuestName ? (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full">Assigned to: {singleItem.assignedGuestName}</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">Not Assigned</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                     <Button 
                        variant="secondary" 
                        className="w-full !bg-white border"
                        onClick={() => setAssignWaiverModalOpen(true)}
                    >
                        Assign/Edit Jumpers
                    </Button>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <p className="font-semibold">No Active Transaction</p>
                    <p className="text-sm mt-2">Search for a customer or group to begin a new sale.</p>
                </div>
            )}
        </div>
        
        {/* Footer with totals and checkout */}
        {activeTransaction && (
            <div className="p-4 border-t bg-white">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Discount</span>
                        {discountAmount > 0 ? (
                             <div className="flex items-center gap-2">
                                <span>- ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                <button onClick={handleRemoveDiscount} className="text-red-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ) : (
                             <Button size="sm" variant="secondary" onClick={() => setIsApplyingDiscount(true)}>Apply Discount</Button>
                        )}
                    </div>
                    <div className="flex justify-between">
                        <span>GST (18%)</span>
                        <span>₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <hr/>
                    <div className="flex justify-between font-bold text-lg text-gray-800">
                        <span>Grand Total</span>
                        <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div className="mt-4">
                    {!canCheckout && activeTransaction.cart.length > 0 && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md mb-2">
                            All jump tickets and memberships must be assigned to a guest with a valid waiver before checkout.
                        </div>
                    )}
                    <Button 
                        size="lg" 
                        variant="success" 
                        className="w-full"
                        onClick={handleCheckout}
                        disabled={!canCheckout}
                    >
                        Checkout (₹{grandTotal.toFixed(2)})
                    </Button>
                </div>
            </div>
        )}
      </aside>

      {/* Modals */}
      {isCheckoutModalOpen && (
        <Modal isOpen={isCheckoutModalOpen} onClose={() => setCheckoutModalOpen(false)} title="Complete Payment">
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-center">Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                <div className="flex justify-center gap-2 flex-wrap">
                    {(['GPay', 'PhonePe', 'Paytm', 'Card', 'Cash'] as const).map(method => (
                        <Button key={method} variant={paymentMethod === method ? 'primary' : 'secondary'} onClick={() => setPaymentMethod(method)}>
                            {method}
                        </Button>
                    ))}
                </div>
                <div className="mt-6 flex justify-end">
                     <Button size="lg" variant="success" onClick={handleProcessPayment} className="w-full">
                        Process Payment
                    </Button>
                </div>
            </div>
        </Modal>
      )}

      {isAssignWaiverModalOpen && activeTransaction && (
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
          setActiveTransactionId={(id) => setActiveTransactionId(id)}
          onMerge={handleMergeTransactions}
          onDelete={handleDeleteTransaction}
      />
      
      <Modal isOpen={isApplyingDiscount} onClose={() => setIsApplyingDiscount(false)} title="Apply Discount">
          <div className="space-y-4">
              <div className="flex items-center gap-4">
                <select 
                    value={discountInput.type} 
                    onChange={e => setDiscountInput(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="fixed">Fixed (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                </select>
                <Input 
                    label="Discount Value" 
                    id="discount-value" 
                    type="number" 
                    value={discountInput.value} 
                    onChange={e => setDiscountInput(prev => ({...prev, value: e.target.value}))}
                    placeholder="e.g. 100 or 10"
                />
              </div>
              <Button onClick={handleApplyDiscount} className="w-full">Apply Discount</Button>
          </div>
      </Modal>

    </div>
  );
};

export default PointOfSale;