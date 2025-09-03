import React, { useState } from 'react';
import { Transaction, Customer } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface PendingOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  activeTransactionId: string | null;
  setActiveTransactionId: (id: string) => void;
  onMerge: (idsToMerge: string[]) => void;
  onDelete: (id: string) => void;
}

const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({ 
    isOpen, 
    onClose, 
    transactions, 
    activeTransactionId,
    setActiveTransactionId,
    onMerge,
    onDelete,
}) => {
  const [selectedToMerge, setSelectedToMerge] = useState<string[]>([]);

  const handleSelectToMerge = (id: string) => {
    setSelectedToMerge(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSwitchActive = (id: string) => {
    setActiveTransactionId(id);
    onClose();
  };

  const handleMergeClick = () => {
    if (selectedToMerge.length > 0 && activeTransactionId) {
        onMerge(selectedToMerge);
        setSelectedToMerge([]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pending & Saved Orders" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
            Here are all incomplete orders. You can switch to an order, merge orders into your current one, or delete them.
        </p>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
          {transactions.map(transaction => {
            const assignedGuestIds = new Set(
                transaction.cart
                    .filter(item => item.type === 'ticket' && item.assignedGuestId)
                    .map(item => item.assignedGuestId!)
            );
            
            let displayGuests: Customer[] = [];
            if (assignedGuestIds.size > 0) {
                displayGuests = transaction.guests.filter(g => assignedGuestIds.has(g.id));
            } else if (transaction.guests.length > 0) {
                displayGuests = [transaction.guests[0]];
            }

            const guestDisplayName = displayGuests.length > 0
                ? `${displayGuests[0].name}${displayGuests.length > 1 ? ` + ${displayGuests.length - 1}` : ''}`
                : 'None';

            return (
              <div 
                key={transaction.id} 
                className={`flex items-center justify-between p-3 border rounded-md transition-colors ${transaction.id === activeTransactionId ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  {transaction.id !== activeTransactionId && (
                      <input 
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedToMerge.includes(transaction.id)}
                          onChange={() => handleSelectToMerge(transaction.id)}
                          aria-label={`Select order for ${transaction.phone} to merge`}
                      />
                  )}
                  <div className="w-8">
                      {transaction.id === activeTransactionId && (
                          <span className="text-blue-600 font-bold text-xs block">ACTIVE</span>
                      )}
                  </div>
                  <div>
                    <p className="font-semibold">{transaction.phone}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.cart.length} items | Guests: {guestDisplayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {transaction.id !== activeTransactionId && (
                      <Button size="sm" variant="secondary" onClick={() => handleSwitchActive(transaction.id)}>
                          Switch To
                      </Button>
                  )}
                  <Button 
                      size="sm"
                      variant="danger" 
                      onClick={() => onDelete(transaction.id)} 
                      className="!p-2"
                      aria-label={`Delete order for ${transaction.phone}`}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                  </Button>
                </div>
              </div>
            )
          })}
          {transactions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No pending orders.</p>}
        </div>

        <div className="pt-4 flex justify-between items-center gap-3">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button 
                variant="primary" 
                onClick={handleMergeClick} 
                disabled={selectedToMerge.length === 0 || !activeTransactionId}
            >
                Merge ({selectedToMerge.length}) Selected with Active Order
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PendingOrdersModal;