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
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  upiId?: string;
}

export interface Transaction {
  id: string;
  phone: string;
  guests: Customer[];
  cart: CartItem[];
  discount: { type: 'percentage' | 'fixed'; value: number };
}