import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, PERMISSIONS } from '../auth';
import { Permission } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

// --- RoleEditor Sidebar Component ---
interface RoleEditorProps {
  roleName: string | null;
  allRoles: string[];
  existingPermissions: Permission[];
  onSave: (roleName: string, permissions: Permission[], originalRoleName?: string) => void;
  onClose: () => void;
}

const RoleEditor: React.FC<RoleEditorProps> = ({ roleName, allRoles, existingPermissions, onSave, onClose }) => {
    const isNewRole = roleName === null;
    const [name, setName] = useState(roleName || '');
    const [permissions, setPermissions] = useState<Set<Permission>>(new Set(existingPermissions));
    const [error, setError] = useState('');

    const isDefaultRole = roleName ? ['admin', 'manager', 'staff'].includes(roleName) : false;

    useEffect(() => {
        setName(roleName || '');
        setPermissions(new Set(existingPermissions));
    }, [roleName, existingPermissions]);
    
    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        setPermissions(prev => {
            const newPermissions = new Set(prev);
            if (checked) {
                newPermissions.add(permission);
            } else {
                newPermissions.delete(permission);
            }
            return newPermissions;
        });
    };

    const handleSave = () => {
        setError('');
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Role name cannot be empty.');
            return;
        }
        if (isNewRole && allRoles.includes(trimmedName.toLowerCase())) {
            setError('A role with this name already exists.');
            return;
        }
        onSave(trimmedName, Array.from(permissions), roleName || undefined);
    };

    const groupedPermissions = useMemo(() => {
        // FIX: The reduce function was rewritten to be more type-safe.
        // By explicitly defining the accumulator's type with reduce<T>(), TypeScript can
        // correctly infer the type of `value`, fixing the 'unknown' type errors.
        type PermissionDetails = typeof PERMISSIONS[keyof typeof PERMISSIONS];
        type GroupedPermission = { key: Permission } & PermissionDetails;
        type PermissionGroups = Record<string, GroupedPermission[]>;

        return Object.entries(PERMISSIONS).reduce<PermissionGroups>((acc, [key, value]) => {
            const group = value.group;
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push({ key: key as Permission, ...value });
            return acc;
        }, {});
    }, []);

    return (
        <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out" style={{transform: 'translateX(0%)'}}>
            <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">{isNewRole ? 'Add New Role' : `Edit Role: ${roleName}`}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <Input
                    label="Role Name"
                    id="role-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isDefaultRole}
                    required
                />
                {isDefaultRole && <p className="text-xs text-gray-500 -mt-4">Default role names cannot be changed.</p>}

                {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group}>
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">{group}</h3>
                        <div className="space-y-4">
                            {perms.map(permission => (
                                <div key={permission.key} className="relative flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            id={permission.key}
                                            checked={permissions.has(permission.key)}
                                            onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor={permission.key} className="font-medium text-gray-800">{permission.name}</label>
                                        <p className="text-gray-500">{permission.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                {error && <p className="text-sm text-red-600 self-center mr-auto">{error}</p>}
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Role</Button>
            </div>
        </div>
    );
};

// --- Main RoleManagement Component ---
interface RoleManagementProps {
  users: User[];
  rolePermissions: Record<Role, Permission[]>;
  addOrUpdateRole: (roleName: string, permissions: Permission[], originalRoleName?: string) => void;
  deleteRole: (roleName: string, reassignToRoleName: string | null) => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ users, rolePermissions, addOrUpdateRole, deleteRole }) => {
  const [sidebarState, setSidebarState] = useState<{ isOpen: boolean; roleName: string | null }>({ isOpen: false, roleName: null });
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; roleName: string | null; userCount: number }>({ isOpen: false, roleName: null, userCount: 0 });
  const [reassignTo, setReassignTo] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  // Effect to automatically hide the confirmation message after a few seconds
  useEffect(() => {
    if (confirmationMessage) {
      const timer = setTimeout(() => {
        setConfirmationMessage('');
      }, 4000); // Hide after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [confirmationMessage]);

  const handleSaveRole = (roleName: string, permissions: Permission[], originalRoleName?: string) => {
    addOrUpdateRole(roleName, permissions, originalRoleName);
    setSidebarState({ isOpen: false, roleName: null });
    setConfirmationMessage(`Role "${roleName}" was saved successfully.`);
  };
  
  const handleOpenDeleteModal = (roleName: string) => {
    const userCount = users.filter(u => u.role === roleName).length;
    if (userCount > 0) {
      const otherRoles = Object.keys(rolePermissions).filter(r => r !== roleName && r !== 'admin');
      setReassignTo(otherRoles[0] || ''); // Default to first available role
      setDeleteModalState({ isOpen: true, roleName, userCount });
    } else {
      if (window.confirm(`Are you sure you want to delete the "${roleName}" role? This action cannot be undone.`)) {
        deleteRole(roleName, null);
      }
    }
  };

  const handleConfirmDeletion = () => {
    if (deleteModalState.roleName) {
      deleteRole(deleteModalState.roleName, reassignTo);
      setDeleteModalState({ isOpen: false, roleName: null, userCount: 0 });
    }
  };
  
  const isDefaultRole = (roleName: string) => ['admin', 'manager', 'staff'].includes(roleName);

  return (
    <div className="flex">
        <div className={`flex-grow transition-all duration-300 ${sidebarState.isOpen ? 'pr-4' : ''}`}>
           {confirmationMessage && (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md shadow-sm" role="alert">
                <p className="font-bold">Success</p>
                <p>{confirmationMessage}</p>
              </div>
            )}
          <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Roles</h2>
                <Button onClick={() => setSidebarState({ isOpen: true, roleName: null })}>Add New Role</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Role Name</th>
                    <th scope="col" className="px-6 py-3">Users</th>
                    <th scope="col" className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(rolePermissions).map(roleName => {
                    const userCount = users.filter(u => u.role === roleName).length;
                    return (
                      <tr key={roleName} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900 capitalize">{roleName}</td>
                        <td className="px-6 py-4">{userCount}</td>
                        <td className="px-6 py-4">
                            {roleName !== 'admin' && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setSidebarState({ isOpen: true, roleName })}>Edit</Button>
                                    {!isDefaultRole(roleName) && (
                                        <Button size="sm" variant="danger" onClick={() => handleOpenDeleteModal(roleName)}>Delete</Button>
                                    )}
                                </div>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {sidebarState.isOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-30" onClick={() => setSidebarState({isOpen: false, roleName: null})}></div>}
        {sidebarState.isOpen && (
            <RoleEditor
                roleName={sidebarState.roleName}
                allRoles={Object.keys(rolePermissions)}
                existingPermissions={sidebarState.roleName ? rolePermissions[sidebarState.roleName] : []}
                onSave={handleSaveRole}
                onClose={() => setSidebarState({ isOpen: false, roleName: null })}
            />
        )}
        
        {deleteModalState.isOpen && deleteModalState.roleName && (
            <Modal isOpen={true} onClose={() => setDeleteModalState({ isOpen: false, roleName: null, userCount: 0 })} title="Cannot Delete Role">
                <div className="space-y-4">
                    <p>The role "<strong>{deleteModalState.roleName}</strong>" cannot be deleted because it is assigned to <strong>{deleteModalState.userCount}</strong> user(s).</p>
                    <p>You must reassign these users to another role before you can delete this one.</p>
                    <div>
                        <label htmlFor="reassign-role" className="block text-sm font-medium text-gray-700 mb-1">Reassign users to:</label>
                        <select
                            id="reassign-role"
                            value={reassignTo}
                            onChange={(e) => setReassignTo(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            {Object.keys(rolePermissions).filter(r => r !== deleteModalState.roleName && r !== 'admin').map(role => (
                                <option key={role} value={role} className="capitalize">{role}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setDeleteModalState({ isOpen: false, roleName: null, userCount: 0 })}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmDeletion} disabled={!reassignTo}>Reassign & Delete</Button>
                    </div>
                </div>
            </Modal>
        )}
    </div>
  );
};

export default RoleManagement;
