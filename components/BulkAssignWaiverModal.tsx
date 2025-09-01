import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, CartItem } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { getWaiverStatus } from '../utils/waiverUtils';

interface BulkAssignWaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onAssign: (assignments: { [cartIndex: number]: string }) => void;
}

const BulkAssignWaiverModal: React.FC<BulkAssignWaiverModalProps> = ({ isOpen, onClose, transaction, onAssign }) => {
  // State maps CART INDEX to GUEST ID
  const [assignments, setAssignments] = useState<{ [key: number]: string }>({});

  const validGuests = useMemo(() =>
    transaction.guests.filter(g => getWaiverStatus(g) === 'VALID'),
    [transaction.guests]
  );

  // Group tickets by name to display in sections
  const groupedTickets = useMemo(() => {
    const groups: { [name: string]: { item: CartItem; indices: number[] } } = {};
    transaction.cart.forEach((item, index) => {
        if (item.type === 'ticket') {
            if (!groups[item.name]) {
                groups[item.name] = { item, indices: [] };
            }
            groups[item.name].indices.push(index);
        }
    });
    return Object.values(groups);
  }, [transaction.cart]);

  // Initialize state when modal opens, based on current cart assignments
  useEffect(() => {
    if (isOpen) {
      const initialAssignments: { [key: number]: string } = {};
      transaction.cart.forEach((item, index) => {
        if (item.type === 'ticket' && item.assignedGuestId) {
          if (validGuests.some(g => g.id === item.assignedGuestId)) {
            initialAssignments[index] = item.assignedGuestId;
          }
        }
      });
      setAssignments(initialAssignments);
    }
  }, [isOpen, transaction.cart, validGuests]);

  const handleAssign = (guestId: string, ticketGroupIndices: number[]) => {
    setAssignments(prev => {
        const newAssignments = { ...prev };

        // Find an available ticket index within the target group
        const availableIndex = ticketGroupIndices.find(index => !newAssignments[index]);
        if (availableIndex === undefined) return prev; 

        // Un-assign the guest from any other ticket they might be assigned to
        for (const key in newAssignments) {
            if (newAssignments[key] === guestId) {
                delete newAssignments[key];
            }
        }

        // Assign the guest to the new, available slot
        newAssignments[availableIndex] = guestId;

        return newAssignments;
    });
  };

  const handleUnassign = (guestId: string) => {
    setAssignments(prev => {
        const newAssignments = { ...prev };
        for (const key in newAssignments) {
            if (newAssignments[key] === guestId) {
                delete newAssignments[key];
                break; // A guest can only be assigned once
            }
        }
        return newAssignments;
    });
  };

  const handleSubmit = () => {
    onAssign(assignments);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Jumpers" size="md">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
        {groupedTickets.map((group, groupIndex) => {
            const assignedGuestIdsForGroup = new Set(
                group.indices.map(index => assignments[index]).filter(Boolean)
            );
            const availableSlots = group.indices.length - assignedGuestIdsForGroup.size;
          
            return (
              <div key={groupIndex}>
                <h4 className="font-bold text-gray-800 text-lg">{group.item.name}</h4>
                 <p className="text-sm text-gray-500 mb-3">
                  ({group.indices.length - availableSlots} of {group.indices.length} slots assigned)
                </p>
                <div className="space-y-2">
                  {validGuests.map(guest => {
                    const isAssignedToThisGroup = assignedGuestIdsForGroup.has(guest.id);

                    return (
                        <div key={guest.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                            <span className="font-medium text-gray-800">{guest.name}</span>
                            {isAssignedToThisGroup ? (
                                <Button size="sm" variant="danger" onClick={() => handleUnassign(guest.id)} className="w-24 justify-center">
                                    Unassign
                                </Button>
                            ) : (
                                <Button size="sm" variant="success" onClick={() => handleAssign(guest.id, group.indices)} disabled={availableSlots <= 0} className="w-24 justify-center">
                                    Assign
                                </Button>
                            )}
                        </div>
                    );
                  })}
                </div>
              </div>
            );
        })}
         {groupedTickets.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                <p>No jump tickets in the cart to assign.</p>
            </div>
        )}
      </div>
      <div className="pt-6 mt-4 flex justify-end gap-3 border-t">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>Save Assignments</Button>
      </div>
    </Modal>
  );
};

export default BulkAssignWaiverModal;
