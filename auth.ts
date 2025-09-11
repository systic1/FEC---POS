export type Role = 'staff' | 'manager' | 'admin';

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
