import { Sale } from '../types';

const generateReceiptText = (sale: Sale): string => {
  const itemsSummary = sale.items.map(item => `${item.name} - ₹${item.price.toFixed(2)}`).join('\n');
  const message = `
Thank you for your purchase at Jump India!
Receipt No: ${sale.id.slice(-6)}
Date: ${new Date(sale.date).toLocaleDateString()}
--------------------
${itemsSummary}
--------------------
Subtotal: ₹${sale.subtotal.toFixed(2)}
Discount: -₹${sale.discountAmount.toFixed(2)}
GST (18%): ₹${sale.gstAmount.toFixed(2)}
Total: ₹${sale.total.toFixed(2)}
Payment: ${sale.paymentMethod}
`;
  // Trim leading whitespace from each line for clean formatting
  return message.split('\n').map(line => line.trim()).join('\n').trim();
};

/**
 * Simulates sending an SMS receipt. In a real app, this would use a service like Twilio.
 * @param sale The sale object.
 * @param recipientPhone The phone number of the recipient.
 * @returns A promise that resolves to an object indicating success.
 */
export const sendReceiptSms = async (sale: Sale, recipientPhone: string): Promise<{ success: boolean }> => {
  if (!recipientPhone || !/^\d{10,}$/.test(recipientPhone.replace(/\s/g, ''))) {
    console.error("Invalid recipient phone number.");
    return { success: false };
  }

  const textBody = generateReceiptText(sale);

  console.log('--- SIMULATING SMS RECEIPT ---');
  console.log(`Recipient: ${recipientPhone}`);
  console.log('SMS Body:', textBody);
  console.log('------------------------------');

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // In a real app, you would have error handling from your SMS service provider
  return { success: true };
};