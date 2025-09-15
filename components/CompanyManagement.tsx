import React, { useState } from 'react';
import { User, Role } from '../auth';
import StaffManagement from './StaffManagement';
import RoleManagement from './RoleManagement';
import { Permission } from '../types';

type CompanyView = 'staffs' | 'roles';

interface CompanyManagementProps {
  users: User[];
  addUser: (user: User) => void;
  deleteUser: (code: string) => void;
  updateUser: (originalCode: string, updatedUserData: User) => void;
  rolePermissions: Record<Role, Permission[]>;
  addOrUpdateRole: (roleName: string, permissions: Permission[], originalRoleName?: string) => void;
  deleteRole: (roleName: string, reassignToRoleName: string | null) => void;
  hasPermission: (permission: Permission) => boolean;
}

const CompanyManagement: React.FC<CompanyManagementProps> = (props) => {
  const canManageStaff = props.hasPermission('feature:company:manage_staff');
  const canManageRoles = props.hasPermission('feature:company:manage_roles');
  
  const [activeTab, setActiveTab] = useState<CompanyView>(canManageStaff ? 'staffs' : 'roles');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Company Management</h1>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {canManageStaff && (
            <button
              onClick={() => setActiveTab('staffs')}
              className={`${
                activeTab === 'staffs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              aria-current={activeTab === 'staffs' ? 'page' : undefined}
            >
              Staffs
            </button>
          )}
          {canManageRoles && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`${
                activeTab === 'roles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              aria-current={activeTab === 'roles' ? 'page' : undefined}
            >
              Roles & Permissions
            </button>
          )}
        </nav>
      </div>

      <div>
        {activeTab === 'staffs' && canManageStaff && (
          <StaffManagement 
            users={props.users}
            addUser={props.addUser}
            deleteUser={props.deleteUser}
            updateUser={props.updateUser}
            availableRoles={Object.keys(props.rolePermissions)}
          />
        )}
        {activeTab === 'roles' && canManageRoles && (
          <RoleManagement
            users={props.users}
            rolePermissions={props.rolePermissions}
            addOrUpdateRole={props.addOrUpdateRole}
            deleteRole={props.deleteRole}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;