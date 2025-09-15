import React, { useState } from 'react';
import { User, Role } from '../auth';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface StaffManagementProps {
  users: User[];
  addUser: (user: User) => void;
  deleteUser: (code: string) => void;
  updateUser: (originalCode: string, updatedUser: User) => void;
  availableRoles: string[];
}

const StaffManagement: React.FC<StaffManagementProps> = ({ users, addUser, deleteUser, updateUser, availableRoles }) => {
  const [newUser, setNewUser] = useState({ name: '', role: 'staff' as Role, code: '' });
  const [error, setError] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', role: 'staff' as Role, code: '' });
  const [editError, setEditError] = useState('');


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    setError('');
  };
  
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    setEditError('');
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
  
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditFormData({ name: user.name, role: user.role, code: '' }); // Clear code for security
    setIsEditModalOpen(true);
    setEditError('');
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editFormData.name) {
        setEditError('Name cannot be empty.');
        return;
    }

    if (editFormData.code && editFormData.code.length < 4) {
        setEditError('New access code must be at least 4 characters long.');
        return;
    }

    if (editFormData.code && users.some(u => u.code === editFormData.code && u.code !== editingUser.code)) {
        setEditError('This access code is already in use by another user.');
        return;
    }

    const updatedUser: User = {
      ...editingUser,
      name: editFormData.name,
      role: editFormData.role,
      code: editFormData.code || editingUser.code, // Keep original code if new one isn't provided
    };
    
    updateUser(editingUser.code, updatedUser);

    setIsEditModalOpen(false);
    setEditingUser(null);
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

  const rolesForDropdown = availableRoles.filter(r => r !== 'admin');

  return (
    <div className="space-y-6">
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
                {rolesForDropdown.map(role => (
                    <option key={role} value={role} className="capitalize">{role}</option>
                ))}
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
                    <td className="px-6 py-4 flex items-center gap-2">
                       <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditModal(user)}
                        disabled={user.code === '1111'}
                      >
                        Edit
                      </Button>
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
      
      {editingUser && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit User: ${editingUser.name}`}>
            <form onSubmit={handleUpdateUser} className="space-y-4">
                <Input
                    label="Full Name"
                    id="edit-name"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                />
                <div>
                    <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                        id="edit-role"
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                       {rolesForDropdown.map(role => (
                          <option key={role} value={role} className="capitalize">{role}</option>
                       ))}
                    </select>
                </div>
                <Input
                    label="New Access Code (Optional)"
                    id="edit-code"
                    name="code"
                    type="password"
                    value={editFormData.code}
                    onChange={handleEditInputChange}
                    placeholder="Leave blank to keep current code"
                    minLength={4}
                />
                {editError && <p className="text-sm text-red-600">{editError}</p>}
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Modal>
      )}
    </div>
  );
};

export default StaffManagement;