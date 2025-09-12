import React, { useState, useMemo } from 'react';
import { User } from '../../auth';
import { CashDrawerSession, Sale } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface CloseRegisterModalProps {
  onClose: () => void;
  onSessionEnd: (
    closingBalance: number, 
    reason?: string, 
    attachment?: { name: string; type: string; data: string }
  ) => void;
  session: CashDrawerSession;
  sales: Sale[];
  currentUser: User;
}

const fileToBase64 = (file: File): Promise<{ name: string; type: string; data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            name: file.name,
            type: file.type,
            data: reader.result as string
        });
        reader.onerror = error => reject(error);
    });
};

const CloseRegisterModal: React.FC<CloseRegisterModalProps> = ({ onClose, onSessionEnd, session, sales, currentUser }) => {
  const [actualCash, setActualCash] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { totalCashSales, expectedBalance, totalDeposits } = useMemo(() => {
    const sessionSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return new Date(session.openingTime) <= saleDate && (session.closingTime ? saleDate <= new Date(session.closingTime) : true);
    });

    const cashSales = sessionSales
      .filter(sale => sale.paymentMethod === 'Cash')
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const deposits = session.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;

    return {
      totalCashSales: cashSales,
      totalDeposits: deposits,
      expectedBalance: session.openingBalance + cashSales - deposits,
    };
  }, [session, sales]);
  
  const discrepancy = useMemo(() => {
    const counted = parseFloat(actualCash);
    if (isNaN(counted)) return 0;
    // Use Math.round to avoid floating point issues
    return Math.round((counted - expectedBalance) * 100) / 100;
  }, [actualCash, expectedBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(actualCash);
    if (isNaN(counted) || counted < 0) {
      alert('Please enter a valid cash amount.');
      return;
    }
    if (discrepancy !== 0 && !reason.trim()) {
        alert('A reason is required for the cash discrepancy.');
        return;
    }

    setIsSubmitting(true);

    let attachmentData;
    if (attachment) {
        try {
            attachmentData = await fileToBase64(attachment);
        } catch (error) {
            console.error("Error converting file:", error);
            alert("Could not process the attachment. Please try again.");
            setIsSubmitting(false);
            return;
        }
    }
    // Proceed directly without confirmation
    onSessionEnd(counted, reason.trim(), attachmentData);
  };
  
  const canClose = session.openedByUserId === currentUser.code || ['admin', 'manager'].includes(currentUser.role);
  const isSubmitDisabled = !actualCash || (discrepancy !== 0 && !reason.trim());

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
                 <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">Total Deposits:</span>
                    <span className="font-semibold text-red-600">- ₹{totalDeposits.toLocaleString('en-IN')}</span>
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
                 <div className={`flex justify-between font-bold text-lg ${discrepancy < -0.01 ? 'text-red-600' : (discrepancy > 0.01 ? 'text-green-600' : 'text-gray-800')}`}>
                    <span>Discrepancy:</span>
                    <span>
                        {discrepancy.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        {discrepancy !== 0 && (discrepancy > 0 ? ' (Over)' : ' (Short)')}
                    </span>
                </div>
            </div>

            {discrepancy !== 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for Discrepancy (Required)</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g., Mistakenly gave extra change, wrong item keyed in..."
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-1">Attach File (Optional)</label>
                        <input
                            id="attachment"
                            type="file"
                            onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                     </div>
                </div>
            )}


            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isSubmitDisabled || isSubmitting}>
                    {isSubmitting ? 'Processing...' : 'End Shift & Logout'}
                </Button>
            </div>
        </form>
      )}
    </Modal>
  );
};

export default CloseRegisterModal;