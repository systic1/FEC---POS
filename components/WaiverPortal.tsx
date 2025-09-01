
import React, { useState, useCallback } from 'react';
import { Customer } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import WaiverForm from './WaiverForm';

const WaiverPortal: React.FC = () => {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const addOrUpdateCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => {
        const index = prev.findIndex(c => c.id === customer.id);
        if (index > -1) {
            const updatedCustomers = [...prev];
            updatedCustomers[index] = customer;
            return updatedCustomers;
        }
        return [...prev, customer];
    });
  }, [setCustomers]);

  const handleWaiverSigned = (customer: Customer) => {
    addOrUpdateCustomer(customer);
    setIsSubmitted(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg">
        <div className="p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Jump India Fun Zone</h1>
            <p className="text-center text-gray-500 mb-8">Waiver & Registration</p>
            {isSubmitted ? (
                <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-2xl font-semibold text-gray-800">Thank You!</h2>
                    <p className="text-gray-600 mt-2">Your waiver has been successfully submitted. You can now proceed to the counter.</p>
                     <button onClick={() => setIsSubmitted(false)} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">
                        Sign Another Waiver
                    </button>
                </div>
            ) : (
                <WaiverForm onWaiverSigned={handleWaiverSigned} />
            )}
        </div>
      </div>
    </div>
  );
};

export default WaiverPortal;
