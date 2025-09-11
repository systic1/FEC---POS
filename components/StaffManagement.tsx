import React, { useState } from 'react';
import { User, Role } from '../auth';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';

interface StaffManagementProps {
  users: User[];
  addUser: (user: User) => void;
  deleteUser: (code: string) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ users, addUser, deleteUser }) => {
  const [newUser, setNewUser] = useState({ name: '', role: 'staff' as Role, code: '' });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.code || !newUser.role) {
      setError('All fields are required.');
      return;
    }
    if (users.some(user => user.code === newUser.code)) {
      setError('This access code is already in use. Please choose another.');
      return;
    }
    if (newUser.code.length < 4) {
      setError('Access code must be at least 4 characters long.');
      return;
    }

    addUser(newUser);
    setNewUser({ name: '', role: 'staff', code: '' });
    setError('');
  };

  const handleDeleteUser = (code: string) => {
    if (code === '1111') {
        alert('The primary admin account cannot be deleted.');
        return;
    }
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUser(code);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Staff Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User Form */}
        <Card className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Add New Staff</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <Input
              label="Full Name"
              id="name"
              name="name"
              value={newUser.name}
              onChange={handleInputChange}
              required
            />
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                id="role"
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <Input
              label="Access Code"
              id="code"
              name="code"
              type="password"
              value={newUser.code}
              onChange={handleInputChange}
              required
              minLength={4}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Add User</Button>
          </form>
        </Card>

        {/* User List */}
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Existing Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Access Code</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.code} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 capitalize">{user.role}</td>
                    <td className="px-6 py-4 font-mono">****</td>
                    <td className="px-6 py-4">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteUser(user.code)}
                        disabled={user.code === '1111'}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffManagement;
