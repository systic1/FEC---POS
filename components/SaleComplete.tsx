import React, { useState } from 'react';
import { Sale, Customer } from '../types';
import { sendReceiptEmail } from '../services/emailService';
import Button from './ui/Button';
import Input from './ui/Input';
import Spinner from './ui/Spinner';

interface SaleCompleteProps {
  sale: Sale;
  customer: Customer;
  onNewSale: () => void;
}

const SaleComplete: React.FC<SaleCompleteProps> = ({ sale, customer, onNewSale }) => {
  const [recipientEmail, setRecipientEmail] = useState(customer.email || '');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert('Please enter an email address.');
      return;
    }
    setEmailStatus('sending');
    const result = await sendReceiptEmail(sale, recipientEmail);
    if (result.success) {
      setEmailStatus('sent');
    } else {
      setEmailStatus('error');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <h2 className="text-3xl font-bold text-gray-800">Sale Complete!</h2>

        <div className="my-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex justify-between font-bold text-2xl">
            <span>Total Paid:</span>
            <span>₹{sale.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          {sale.changeGiven !== undefined && sale.changeGiven > 0 && (
            <div className="flex justify-between text-lg mt-2 text-blue-600 font-semibold">
              <span>Change Given:</span>
              <span>₹{sale.changeGiven.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Email Receipt</h3>
          <div className="flex items-center gap-2">
            <div className="flex-grow">
                <Input
                  label=""
                  id="email-receipt"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Customer's email address"
                  disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                />
            </div>
            <Button 
                onClick={handleSendEmail} 
                disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                className="w-32"
            >
              {emailStatus === 'sending' && <Spinner />}
              {emailStatus === 'idle' && 'Send Email'}
              {emailStatus === 'sent' && 'Sent!'}
              {emailStatus === 'error' && 'Retry'}
            </Button>
          </div>
          {emailStatus === 'error' && <p className="text-red-500 text-sm">Failed to send email. Please try again.</p>}
           {emailStatus === 'sent' && <p className="text-green-600 text-sm">Receipt successfully sent to {recipientEmail}.</p>}
        </div>

        <div className="mt-8">
          <Button size="lg" className="w-full" onClick={onNewSale}>
            Start New Sale
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaleComplete;