import React, { useState, useMemo } from 'react';
import { User } from '../../auth';
import { CashDrawerSession, Sale } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface CashDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeposit: (amount: number, notes?: string) => void;
  session: CashDrawerSession;
  sales: Sale[];
  currentUser: User;
}

const CashDepositModal: React.FC<CashDepositModalProps> = ({ isOpen, onClose, onConfirmDeposit, session, sales }) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const expectedCashInDrawer = useMemo(() => {
    const sessionSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return new Date(session.openingTime) <= saleDate && (session.closingTime ? saleDate <= new Date(session.closingTime) : true);
    });

    const cashSales = sessionSales
      .filter(sale => sale.paymentMethod === 'Cash')
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const totalDeposits = session.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;

    return session.openingBalance + cashSales - totalDeposits;
  }, [session, sales]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid, positive amount to deposit.');
      return;
    }
    if (depositAmount > expectedCashInDrawer) {
      setError(`Cannot deposit more than the expected cash in the drawer (₹${expectedCashInDrawer.toLocaleString()}).`);
      return;
    }

    onConfirmDeposit(depositAmount, notes);
  };
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setAmount(e.target.value);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Cash Deposit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-gray-100 rounded-lg">
            <div className="flex justify-between font-bold text-base">
                <span>Expected Cash in Drawer:</span>
                <span>₹{expectedCashInDrawer.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">This is the amount the system expects to be in the cash register right now.</p>
        </div>

        <Input
          label="Amount to Deposit"
          id="deposit-amount"
          type="number"
          step="0.01"
          placeholder="e.g., 5000"
          value={amount}
          onChange={handleAmountChange}
          required
          autoFocus
        />

        <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., End of day deposit, mid-day safe drop..."
            />
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!amount}>Confirm Deposit</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CashDepositModal;