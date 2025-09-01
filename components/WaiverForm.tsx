
import React, { useState, useEffect, useCallback } from 'react';
import { generateWaiverText } from '../services/geminiService';
import { Customer } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import SignaturePad from './SignaturePad';

interface WaiverFormProps {
  onWaiverSigned: (customer: Customer) => void;
  existingCustomer?: Partial<Customer>;
}

const WaiverForm: React.FC<WaiverFormProps> = ({ onWaiverSigned, existingCustomer = {} }) => {
  const [waiverText, setWaiverText] = useState('');
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [customerData, setCustomerData] = useState({
    name: existingCustomer.name || '',
    dob: existingCustomer.dob || '',
    email: existingCustomer.email || '',
    phone: existingCustomer.phone || '',
    guardianName: existingCustomer.guardianName || '',
  });
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    const fetchWaiver = async () => {
      setLoading(true);
      const text = await generateWaiverText();
      setWaiverText(text);
      setLoading(false);
    };
    fetchWaiver();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({ ...prev, [name]: value }));
    if (name === 'dob') {
        const birthDate = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        setIsMinor(age < 18);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !signature) {
      alert('Please agree to the terms and provide a signature.');
      return;
    }
    if (isMinor && !customerData.guardianName) {
      alert('Guardian name is required for minors.');
      return;
    }
    const newCustomer: Customer = {
      id: existingCustomer.id || `cust_${new Date().getTime()}`,
      ...customerData,
      waiverSignedOn: new Date().toISOString(),
      waiverSignature: signature,
      guardianName: isMinor ? customerData.guardianName : null,
    };
    onWaiverSigned(newCustomer);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Customer & Waiver Form</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" id="name" name="name" value={customerData.name} onChange={handleInputChange} required />
          <Input label="Date of Birth" id="dob" name="dob" type="date" value={customerData.dob} onChange={handleInputChange} required />
          <Input label="Email Address" id="email" name="email" type="email" value={customerData.email} onChange={handleInputChange} required />
          <Input label="Phone Number" id="phone" name="phone" type="tel" value={customerData.phone} onChange={handleInputChange} required />
          {isMinor && (
              <Input label="Parent/Guardian Full Name" id="guardianName" name="guardianName" value={customerData.guardianName} onChange={handleInputChange} required />
          )}
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Liability Waiver</h3>
        <div className="h-64 border rounded-md p-4 overflow-y-auto bg-gray-50">
          {loading ? <Spinner /> : <p className="text-sm whitespace-pre-wrap">{waiverText}</p>}
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
        <SignaturePad onSignatureEnd={setSignature} />
      </div>

      <div className="flex items-center mt-4">
        <input id="agree" name="agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
        <label htmlFor="agree" className="ml-2 block text-sm text-gray-900">
          I have read and agree to the terms and conditions of the waiver.
        </label>
      </div>

      <Button type="submit" disabled={!agreed || !signature || loading}>
        Submit Waiver & Save Customer
      </Button>
    </form>
  );
};

export default WaiverForm;
