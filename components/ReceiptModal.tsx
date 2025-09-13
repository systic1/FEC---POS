import React, { useEffect } from 'react';
import { Sale } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  shouldPrint: boolean;
}


const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, shouldPrint }) => {
    const handlePrint = () => {
        // The print styles in index.html will handle showing only the receipt
        window.print();
    };

    useEffect(() => {
        if (shouldPrint) {
            // Use a small timeout to ensure the modal content is fully rendered before printing
            const timer = setTimeout(() => {
                handlePrint();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [shouldPrint, sale]);

    return (
        <Modal isOpen={!!sale} onClose={onClose} title="Print Receipt" size="sm">
            <div id="receipt-to-print" className="p-4 bg-white text-black font-mono text-xs mx-auto max-w-xs">
                <div className="text-center mb-4">
                    <h2 className="font-bold text-lg">Jump India Fun Zone</h2>
                    <p>Mumbai, India</p>
                    <p>GSTIN: XXXXXXXXXXXXXXX</p>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span>{sale.id.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(sale.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{sale.customerName}</span>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div>
                    <div className="flex font-bold">
                        <span className="flex-1">Item</span>
                        <span className="w-20 text-right">Price</span>
                    </div>
                    {sale.items.map((item, index) => (
                        <div key={index} className="flex">
                            <span className="flex-1 pr-2">{item.name}</span>
                            <span className="w-20 text-right">₹{item.price.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>- ₹{sale.discountAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{sale.gstAmount.toFixed(2)}</span>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span>₹{sale.total.toFixed(2)}</span>
                </div>
                <hr className="my-2 border-dashed border-black" />
                 <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span>{sale.paymentMethod}</span>
                </div>
                <div className="text-center mt-4">
                    <p>Thank you for visiting!</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 print:hidden">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                <Button variant="primary" onClick={handlePrint}>Print Again</Button>
            </div>
        </Modal>
    );
};

export default ReceiptModal;
