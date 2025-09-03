
import React, { useState, useEffect, useCallback } from 'react';
import { generateWaiverText } from '../services/geminiService';
import { Customer } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import SignaturePad from './SignaturePad';

interface WaiverFormProps {
  onWaiverSubmit: (customer: Omit<Customer, 'id'>) => void;
  participantData: Partial<Customer>;
  allCustomers: Customer[];
  isSubmitting: boolean;
}

const WaiverForm: React.FC<WaiverFormProps> = ({ onWaiverSubmit, participantData, allCustomers, isSubmitting }) => {
  const [waiverText, setWaiverText] = useState('');
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState(participantData.waiverSignature || '');
  const [customerData, setCustomerData] = useState({
    name: participantData.name || '',
    dob: participantData.dob || '',
    email: participantData.email || '',
    phone: participantData.phone || '',
    guardianName: participantData.guardianName || '',
  });
  const [isMinor, setIsMinor] = useState(false);
  
  useEffect(() => {
     setCustomerData({
        name: participantData.name || '',
        dob: participantData.dob || '',
        email: participantData.email || '',
        phone: participantData.phone || '',
        guardianName: participantData.guardianName || '',
     });
     setSignature(participantData.waiverSignature || '');
     setAgreed(!!participantData.waiverSignature);
     if (participantData.dob) {
        setIsMinor(calculateAge(participantData.dob) < 18);
     } else {
        setIsMinor(false);
     }
  }, [participantData]);


  useEffect(() => {
    const fetchWaiver = async () => {
      setLoading(true);
      const text = await generateWaiverText();
      setWaiverText(text);
      setLoading(false);
    };
    fetchWaiver();
  }, []);

  const calculateAge = (dob: string): number => {
      if (!dob) return 0;
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({ ...prev, [name]: value }));
    if (name === 'dob') {
        setIsMinor(calculateAge(value) < 18);
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
    
    // As per user request: unique phone number for adults
    if (!isMinor) {
        const phoneExists = allCustomers.some(c => c.phone === customerData.phone && c.id !== participantData.id);
        if (phoneExists) {
            alert('This phone number is already registered to another adult. Each adult must have a unique phone number.');
            return;
        }
    }

    const newCustomerData: Omit<Customer, 'id'> = {
      ...customerData,
      waiverSignedOn: new Date().toISOString(),
      waiverSignature: signature,
      guardianName: isMinor ? customerData.guardianName : null,
    };
    onWaiverSubmit(newCustomerData);
  };

  const isFormLocked = !!participantData.waiverSignedOn;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isFormLocked && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-4" role="alert">
              <p className="font-bold">Completed</p>
              <p>This waiver is complete. To make changes, please ask a staff member.</p>
          </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" id="name" name="name" value={customerData.name} onChange={handleInputChange} required disabled={isFormLocked} />
          <Input label="Date of Birth" id="dob" name="dob" type="date" value={customerData.dob} onChange={handleInputChange} required disabled={isFormLocked} />
          <Input label="Email Address" id="email" name="email" type="email" value={customerData.email} onChange={handleInputChange} required disabled={isFormLocked} />
          <Input label="Phone Number" id="phone" name="phone" type="tel" value={customerData.phone} onChange={handleInputChange} required disabled={isFormLocked} />
          {isMinor && (
              <Input label="Parent/Guardian Full Name" id="guardianName" name="guardianName" value={customerData.guardianName} onChange={handleInputChange} required disabled={isFormLocked} />
          )}
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Liability Waiver</h3>
        <div className="h-64 border rounded-md p-4 overflow-y-auto bg-gray-50">
          {loading ? <Spinner /> : <p className="text-sm whitespace-pre-wrap">{waiverText}</p>}
        </div>
      </div>
      
      {!isFormLocked && (
        <>
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

            <Button type="submit" disabled={!agreed || !signature || loading || isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Participant'}
            </Button>
        </>
      )}
    </form>
  );
};

export default WaiverForm;