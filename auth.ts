// FIX: Removed `import { Permission } from './types';` to break the circular dependency.
// The `Permission` type is now defined and exported from this file.

export type Role = string;

export interface User {
  code: string;
  name: string;
  role: Role;
}

// In a real application, this would come from a secure backend.
export const DEFAULT_USERS: User[] = [
  { code: '1111', name: 'Admin User', role: 'admin' },
  { code: '2222', name: 'Manager User', role: 'manager' },
  { code: '3333', name: 'Staff User', role: 'staff' },
];

// FIX: PERMISSIONS is defined as a const object without an explicit type annotation
// to break the circular reference. `as const` provides strong type inference.
export const PERMISSIONS = {
  // Page Access
  'page:dashboard': { name: 'Dashboard', description: 'View main sales and customer analytics.', group: 'Page Access' },
  'page:sale': { name: 'Point of Sale', description: 'Access the main sales screen.', group: 'Page Access' },
  'page:history': { name: 'Sales History', description: 'View and search past sales records.', group: 'Page Access' },
  'page:customers': { name: 'Customers', description: 'Manage customer profiles and waivers.', group: 'Page Access' },
  'page:company': { name: 'Company', description: 'Manage staff and roles.', group: 'Page Access' },
  'page:cashdrawer': { name: 'Cash Drawer', description: 'View cash drawer history.', group: 'Page Access' },

  // Feature Access
  'feature:sale:apply_discount': { name: 'Apply Discount', description: 'Allow user to apply discounts in the POS.', group: 'Features' },
  'feature:cashdrawer:make_deposit': { name: 'Make Cash Deposit', description: 'Allow user to record a cash deposit from the POS.', group: 'Features' },
  'feature:company:manage_staff': { name: 'Manage Staff', description: 'Allow user to add, edit, or delete staff members.', group: 'Features' },
  'feature:company:manage_roles': { name: 'Manage Roles & Permissions', description: 'Allow user to create, edit, or delete roles.', group: 'Features' },
} as const;

// FIX: The `Permission` type is now derived from the keys of the `PERMISSIONS` object
// and exported from here.
export type Permission = keyof typeof PERMISSIONS;