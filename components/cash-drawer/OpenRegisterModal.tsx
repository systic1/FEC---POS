import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { OpeningBalanceSuggestion } from '../../services/geminiService';
import Spinner from '../ui/Spinner';

interface OpenRegisterModalProps {
  onSessionStart: (openingBalance: number, reason?: string) => void;
  isLoading: boolean;
  suggestion: OpeningBalanceSuggestion | null;
}

const OpenRegisterModal: React.FC<OpenRegisterModalProps> = ({ onSessionStart, isLoading, suggestion }) => {
  const [openingBalance, setOpeningBalance] = useState('');
  const [reason, setReason] = useState('');
  
  const suggestedBalance = suggestion?.suggestedBalance;

  useEffect(() => {
    if (suggestedBalance !== undefined) {
      setOpeningBalance(String(suggestedBalance));
    }
  }, [suggestedBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      alert('Please enter a valid starting balance.');
      return;
    }
    
    // Check if a reason is required
    if (suggestedBalance !== undefined && balance !== suggestedBalance && !reason.trim()) {
        alert('A reason is required for changing the suggested opening balance.');
        return;
    }

    onSessionStart(balance, reason.trim());
  };

  const showReasonField = suggestedBalance !== undefined && parseFloat(openingBalance) !== suggestedBalance;

  return (
      <Modal isOpen={true} onClose={() => {}} title="Start New Shift">
        {isLoading || !suggestion ? (
            <div className="text-center py-10">
                <Spinner />
                <p className="mt-4 text-gray-600">Analyzing cash history...</p>
            </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.657 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM15 12a4 4 0 01-8 0c0-1.682.906-3.143 2.197-3.812a.5.5 0 01.403.906A3.001 3.001 0 007 12c0 1.654 1.346 3 3 3s3-1.346 3-3c0-.38-.07-.746-.201-1.094a.5.5 0 01.906-.403A3.999 3.999 0 0115 12z" /></svg>
                    AI Pre-Shift Check
                </h4>
                <p className="text-sm text-blue-700 mt-1">{suggestion.recommendation}</p>
            </div>

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
            
            {showReasonField && (
                 <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for Change (Required)</label>
                    <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Made cash deposit to safe."
                        required
                    />
                </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={!openingBalance}>
              Confirm & Start Shift
            </Button>
          </form>
        )}
      </Modal>
  );
};

export default OpenRegisterModal;