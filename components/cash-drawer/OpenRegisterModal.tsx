import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface OpenRegisterModalProps {
  onSessionStart: (openingBalance: number) => void;
}

const OpenRegisterModal: React.FC<OpenRegisterModalProps> = ({ onSessionStart }) => {
  const [openingBalance, setOpeningBalance] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance);
    if (!isNaN(balance) && balance >= 0) {
      onSessionStart(balance);
    } else {
      alert('Please enter a valid starting balance.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Modal isOpen={true} onClose={() => {}} title="Start New Shift">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-gray-600">To begin, please count the cash in your drawer and enter the starting amount (float).</p>
            <Input
              label="Opening Balance (₹)"
              id="opening-balance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="e.g., 5000"
              required
              autoFocus
            />
            <Button type="submit" className="w-full" size="lg" disabled={!openingBalance}>
              Start Shift
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default OpenRegisterModal;
