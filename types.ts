export interface Customer {
  id: string;
  name: string;
  dob: string;
  email: string;
  phone: string;
  waiverSignedOn: string | null;
  waiverSignature: string | null; // base64 data URL
  guardianName: string | null;
  groupId?: string;
  groupWaiverDate?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  color: string;
  image: React.FC<React.SVGProps<SVGSVGElement>>;
}


export interface TicketType extends Product {
  durationMinutes: number;
}

export interface AddOn extends Product {
}

export interface CartItem {
    id: string;
    name:string;
    price: number;
    type: 'ticket' | 'addon' | 'membership';
    assignedGuestId: string | null;
    assignedGuestName: string | null;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  total: number;
  date: string;
  paymentMethod: 'Cash' | 'Card' | 'GPay' | 'PhonePe' | 'Paytm';
}

export interface Transaction {
  id: string;
  phone: string;
  guests: Customer[];
  cart: CartItem[];
  discount: { type: 'percentage' | 'fixed'; value: number };
}

export interface CashDrawerSession {
  id: string;
  openingTime: string;
  closingTime: string | null;
  openingBalance: number;
  closingBalance: number | null;
  openedByUserId: string; // User's code
  closedByUserId: string | null; // User's code
  status: 'OPEN' | 'CLOSED';
  discrepancyReason?: string;
  discrepancyAttachment?: {
    name: string;
    type: string;
    data: string; // base64 data URL
  };
}