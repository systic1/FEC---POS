
import { Customer } from '../types';

/**
 * Checks if a customer's waiver is signed and not expired.
 * A waiver is valid for 1 year.
 * @param customer The customer to check.
 * @returns 'VALID' | 'EXPIRED' | 'NONE'
 */
export const getWaiverStatus = (customer: Customer): 'VALID' | 'EXPIRED' | 'NONE' => {
  if (!customer.waiverSignedOn) {
    return 'NONE';
  }

  const signedDate = new Date(customer.waiverSignedOn);
  // Create a new date for expiry calculation to avoid mutating the original signedDate
  const expiryDate = new Date(signedDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  if (new Date() < expiryDate) {
    return 'VALID';
  } else {
    return 'EXPIRED';
  }
};
