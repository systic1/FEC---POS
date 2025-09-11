import React, { useState, useMemo } from 'react';
import { User } from '../../auth';
import { CashDrawerSession, Sale } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface CloseRegisterModalProps {
  onClose: () => void;
  onSessionEnd: (closingBalance: number) => void;
  session: CashDrawerSession;
  sales: Sale[];
  currentUser: User;
}

const CloseRegisterModal: React.FC<CloseRegisterModalProps> = ({ onClose, onSessionEnd, session, sales, currentUser }) => {
  const [actualCash, setActualCash] = useState('');

  const { totalCashSales, expectedBalance } = useMemo(() => {
    const sessionSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return new Date(session.openingTime) <= saleDate && (session.closingTime ? saleDate <= new Date(session.closingTime) : true);
    });

    const cashSales = sessionSales
      .filter(sale => sale.paymentMethod === 'Cash')
      .reduce((sum, sale) => sum + sale.total, 0);

    return {
      totalCashSales: cashSales,
      expectedBalance: session.openingBalance + cashSales,
    };
  }, [session, sales]);
  
  const discrepancy = useMemo(() => {
    const counted = parseFloat(actualCash);
    if (isNaN(counted)) return 0;
    return counted - expectedBalance;
  }, [actualCash, expectedBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(actualCash);
    if (isNaN(counted) || counted < 0) {
      alert('Please enter a valid cash amount.');
      return;
    }
    const confirmMessage = `You are about to close the register.\n\nDiscrepancy: ₹${discrepancy.toFixed(2)}\n\nThis will log you out. Are you sure?`;
    if (window.confirm(confirmMessage)) {
      onSessionEnd(counted);
    }
  };
  
  const canClose = session.openedByUserId === currentUser.code || ['admin', 'manager'].includes(currentUser.role);

  return (
    <Modal isOpen={true} onClose={onClose} title="End Shift & Close Register">
      {!canClose ? (
          <div className="text-center">
             <h3 className="text-lg font-bold text-red-600">Permission Denied</h3>
             <p className="mt-2 text-gray-600">This register was opened by another user. Only they or a manager can close this session.</p>
             <Button onClick={onClose} className="mt-4">Go Back</Button>
          </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">Opening Balance (Float):</span>
                    <span className="font-semibold text-gray-800">₹{session.openingBalance.toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">Total Cash Sales:</span>
                    <span className="font-semibold text-gray-800">₹{totalCashSales.toLocaleString('en-IN')}</span>
                </div>
                <hr/>
                <div className="flex justify-between font-bold text-base">
                    <span>Expected in Drawer:</span>
                    <span>₹{expectedBalance.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <Input
                label="Actual Cash Counted"
                id="actual-cash"
                type="number"
                step="0.01"
                placeholder="Enter total cash amount"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                required
                autoFocus
            />

            <div className="p-4 bg-blue-50 rounded-lg">
                 <div className={`flex justify-between font-bold text-lg ${discrepancy < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>Discrepancy:</span>
                    <span>
                        {discrepancy.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        {discrepancy !== 0 && (discrepancy > 0 ? ' (Over)' : ' (Short)')}
                    </span>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={!actualCash}>End Shift & Logout</Button>
            </div>
        </form>
      )}
    </Modal>
  );
};

export default CloseRegisterModal;