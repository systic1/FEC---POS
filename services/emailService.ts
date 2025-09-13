import { Sale } from '../types';

const generateReceiptHtml = (sale: Sale): string => {
  const itemsHtml = sale.items.map(item => `
    <tr>
      <td style="padding: 5px;">${item.name}</td>
      <td style="padding: 5px; text-align: right;">₹${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">Jump India Fun Zone</h2>
        <p style="margin: 0;">Mumbai, India</p>
      </div>
      <hr style="border: none; border-top: 1px dashed #ccc;" />
      <p><strong>Receipt No:</strong> ${sale.id.slice(-6)}</p>
      <p><strong>Date:</strong> ${new Date(sale.date).toLocaleString()}</p>
      <p><strong>Customer:</strong> ${sale.customerName}</p>
      <hr style="border: none; border-top: 1px dashed #ccc;" />
      <table style="width: 100%;">
        <thead>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <hr style="border: none; border-top: 1px dashed #ccc;" />
      <p><strong>Subtotal:</strong> ₹${sale.subtotal.toFixed(2)}</p>
      <p><strong>Discount:</strong> - ₹${sale.discountAmount.toFixed(2)}</p>
      <p><strong>GST (18%):</strong> ₹${sale.gstAmount.toFixed(2)}</p>
      <hr style="border: none; border-top: 1px dashed #ccc;" />
      <h3 style="text-align: right;">Total: ₹${sale.total.toFixed(2)}</h3>
      <hr style="border: none; border-top: 1px dashed #ccc;" />
      <p><strong>Payment Method:</strong> ${sale.paymentMethod}</p>
      ${sale.cashTendered !== undefined ? `<p><strong>Cash Tendered:</strong> ₹${sale.cashTendered.toFixed(2)}</p>` : ''}
      ${sale.changeGiven !== undefined ? `<p><strong>Change Given:</strong> ₹${sale.changeGiven.toFixed(2)}</p>` : ''}
      <div style="text-align: center; margin-top: 20px;">
        <p>Thank you for visiting!</p>
      </div>
    </div>
  `;
};

/**
 * Simulates sending a receipt email. In a real app, this would use a service like SendGrid or Mailgun.
 * @param sale The sale object.
 * @param recipientEmail The email address of the recipient.
 * @returns A promise that resolves to an object indicating success.
 */
export const sendReceiptEmail = async (sale: Sale, recipientEmail: string): Promise<{ success: boolean }> => {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.error("Invalid recipient email address.");
    return { success: false };
  }

  const htmlBody = generateReceiptHtml(sale);

  console.log('--- SIMULATING EMAIL RECEIPT ---');
  console.log(`Recipient: ${recipientEmail}`);
  console.log('Email Subject: Your Jump India Receipt');
  console.log('Email Body (HTML):', htmlBody);
  console.log('---------------------------------');

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  // In a real app, you would have error handling from your email service provider
  return { success: true };
};