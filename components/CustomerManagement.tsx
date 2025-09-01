
import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { getWaiverStatus } from '../utils/waiverUtils';


interface CustomerManagementProps {
  customers: Customer[];
  addOrUpdateCustomer: (customer: Customer) => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, addOrUpdateCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);


  const filteredCustomers = useMemo(() => {
    return customers.filter(
      customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const viewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalOpen(true);
  }
  
  const openWaiverPortal = () => {
    window.open('/#/waiver', '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Customer Management</h1>
        <Button onClick={openWaiverPortal}>Open Waiver Portal</Button>
      </div>
      <Card>
        <Input
          label="Search Customers"
          id="search"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Name</th>
                <th scope="col" className="px-6 py-3">Email</th>
                <th scope="col" className="px-6 py-3">Phone</th>
                <th scope="col" className="px-6 py-3">Waiver Status</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4">{customer.email}</td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4">
                     {(() => {
                        const status = getWaiverStatus(customer);
                        if (status === 'VALID') {
                            return (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Signed
                                </span>
                            );
                        } else if (status === 'EXPIRED') {
                            return (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    Expired
                                </span>
                            );
                        } else {
                            return (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Not Signed
                                </span>
                            );
                        }
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => viewDetails(customer)} className="font-medium text-blue-600 hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedCustomer && (
        <Modal isOpen={isDetailModalOpen} onClose={() => setDetailModalOpen(false)} title="Customer Details">
            <div className="space-y-4">
                <p><strong>Name:</strong> {selectedCustomer.name}</p>
                <p><strong>Date of Birth:</strong> {selectedCustomer.dob}</p>
                <p><strong>Email:</strong> {selectedCustomer.email}</p>
                <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                {selectedCustomer.guardianName && <p><strong>Guardian:</strong> {selectedCustomer.guardianName}</p>}
                <hr/>
                <h4 className="font-semibold">Waiver Information</h4>
                {(() => {
                    const status = getWaiverStatus(selectedCustomer);
                    if (status === 'VALID') {
                        return (
                            <div>
                                <p><strong>Status:</strong> <span className="text-green-600 font-bold">Signed (Valid)</span></p>
                                <p><strong>Date:</strong> {new Date(selectedCustomer.waiverSignedOn!).toLocaleString()}</p>
                                <p className="mt-2"><strong>Signature:</strong></p>
                                <img src={selectedCustomer.waiverSignature!} alt="signature" className="border rounded-md bg-gray-100"/>
                            </div>
                        );
                    } else if (status === 'EXPIRED') {
                         return (
                             <div>
                                <p><strong>Status:</strong> <span className="text-yellow-600 font-bold">Signed (Expired)</span></p>
                                <p><strong>Date:</strong> {new Date(selectedCustomer.waiverSignedOn!).toLocaleString()}</p>
                                <p className="mt-2 text-sm">Customer needs to re-sign the waiver.</p>
                            </div>
                        );
                    } else {
                         return (
                            <div>
                                <p><strong>Status:</strong> <span className="text-red-600 font-bold">Not Signed</span></p>
                                <p className="mt-2 text-sm">Customer must sign waiver through the public portal.</p>
                            </div>
                         );
                    }
                })()}
            </div>
        </Modal>
      )}

    </div>
  );
};

export default CustomerManagement;
