import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Plus, Edit, Trash, Check, X, 
  AlertCircle, Info, ChevronDown, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Sidebar from '../../components/Sidebar';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isDefault: boolean;
  isSystem: boolean;
  permissions: string[];
}

const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      name: 'Admin',
      description: 'Full access to all features and settings',
      memberCount: 3,
      isDefault: false,
      isSystem: true,
      permissions: ['all']
    },
    {
      id: '2',
      name: 'Editor',
      description: 'Can edit and manage projects, but cannot change company settings',
      memberCount: 12,
      isDefault: true,
      isSystem: true,
      permissions: ['projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'members.view']
    },
    {
      id: '3',
      name: 'Viewer',
      description: 'Read-only access to projects',
      memberCount: 8,
      isDefault: false,
      isSystem: true,
      permissions: ['projects.view']
    },
    {
      id: '4',
      name: 'Script Supervisor',
      description: 'Can edit scripts and manage screenplay formatting',
      memberCount: 5,
      isDefault: false,
      isSystem: false,
      permissions: ['projects.view', 'projects.edit', 'screenplay.edit', 'screenplay.format']
    }
  ]);

  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'projects.view', name: 'View Projects', description: 'Can view projects', category: 'Projects' },
    { id: 'projects.create', name: 'Create Projects', description: 'Can create new projects', category: 'Projects' },
    { id: 'projects.edit', name: 'Edit Projects', description: 'Can edit existing projects', category: 'Projects' },
    { id: 'projects.delete', name: 'Delete Projects', description: 'Can delete projects', category: 'Projects' },
    { id: 'members.view', name: 'View Members', description: 'Can view team members', category: 'Members' },
    { id: 'members.invite', name: 'Invite Members', description: 'Can invite new team members', category: 'Members' },
    { id: 'members.manage', name: 'Manage Members', description: 'Can manage team members', category: 'Members' },
    { id: 'screenplay.edit', name: 'Edit Screenplays', description: 'Can edit screenplay content', category: 'Screenplay' },
    { id: 'screenplay.format', name: 'Format Screenplays', description: 'Can change screenplay formatting', category: 'Screenplay' },
    { id: 'company.settings', name: 'Company Settings', description: 'Can change company settings', category: 'Company' },
    { id: 'billing.view', name: 'View Billing', description: 'Can view billing information', category: 'Billing' },
    { id: 'billing.manage', name: 'Manage Billing', description: 'Can manage billing and subscriptions', category: 'Billing' }
  ]);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Projects', 'Members', 'Screenplay']));
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRole, setNewRole] = useState<Omit<Role, 'id'>>({
    name: '',
    description: '',
    memberCount: 0,
    isDefault: false,
    isSystem: false,
    permissions: []
  });

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleToggleCategory = (category: string) => {
    const newExpandedCategories = new Set(expandedCategories);
    if (newExpandedCategories.has(category)) {
      newExpandedCategories.delete(category);
    } else {
      newExpandedCategories.add(category);
    }
    setExpandedCategories(newExpandedCategories);
  };

  const handleTogglePermission = (permissionId: string) => {
    if (!editingRole && !showCreateRole) return;
    
    const targetRole = editingRole ? { ...editingRole } : { ...newRole };
    const newPermissions = [...targetRole.permissions];
    
    if (permissionId === 'all') {
      if (newPermissions.includes('all')) {
        // Remove all permissions
        newPermissions.length = 0;
      } else {
        // Add all permissions
        newPermissions.length = 0;
        newPermissions.push('all');
      }
    } else {
      // If we're adding a specific permission, remove 'all' if it exists
      if (newPermissions.includes('all')) {
        newPermissions.splice(newPermissions.indexOf('all'), 1);
        // Add all other permissions except the one we're toggling
        permissions.forEach(p => {
          if (p.id !== permissionId) {
            newPermissions.push(p.id);
          }
        });
      }
      
      const index = newPermissions.indexOf(permissionId);
      if (index === -1) {
        newPermissions.push(permissionId);
        
        // Check if we now have all permissions
        const allPermIds = permissions.map(p => p.id);
        const hasAllPerms = allPermIds.every(id => newPermissions.includes(id));
        if (hasAllPerms) {
          newPermissions.length = 0;
          newPermissions.push('all');
        }
      } else {
        newPermissions.splice(index, 1);
      }
    }
    
    if (editingRole) {
      setEditingRole({ ...targetRole, permissions: newPermissions });
    } else {
      setNewRole({ ...targetRole, permissions: newPermissions });
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role });
  };

  const handleSaveRole = () => {
    if (editingRole) {
      const updatedRoles = roles.map(role => 
        role.id === editingRole.id ? editingRole : role
      );
      setRoles(updatedRoles);
      setEditingRole(null);
    }
  };

  const handleCreateRole = () => {
    if (!newRole.name) return;
    
    const newRoleWithId: Role = {
      ...newRole,
      id: Date.now().toString(),
    };
    
    setRoles([...roles, newRoleWithId]);
    setShowCreateRole(false);
    setNewRole({
      name: '',
      description: '',
      memberCount: 0,
      isDefault: false,
      isSystem: false,
      permissions: []
    });
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    
    const updatedRoles = roles.filter(role => role.id !== roleToDelete.id);
    setRoles(updatedRoles);
    setShowDeleteConfirm(false);
    setRoleToDelete(null);
  };

  const handleSetDefaultRole = (roleId: string) => {
    const updatedRoles = roles.map(role => ({
      ...role,
      isDefault: role.id === roleId
    }));
    setRoles(updatedRoles);
  };

  const hasPermission = (role: Role, permissionId: string) => {
    return role.permissions.includes('all') || role.permissions.includes(permissionId);
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="company" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/admin')}
                className="mr-4 p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={20} className="text-[#1E4D3A] dark:text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Role Management</h1>
                <p className="text-[#577B92] dark:text-gray-400 mt-1">
                  Define roles and permissions for your team members
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowCreateRole(true)}
              className="bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center"
            >
              <Plus size={18} className="mr-2" />
              Create Role
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start">
            <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-blue-800 dark:text-blue-300 text-sm">
              <p>Roles define what team members can do within your company.</p>
              <p className="mt-1">System roles cannot be deleted, but you can customize their permissions.</p>
            </div>
          </div>

          {/* Roles List */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#577B92]/10 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Default
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-lg flex items-center justify-center mr-3">
                            <Shield size={16} className="text-[#E86F2C]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#1E4D3A] dark:text-white">
                              {role.name}
                            </div>
                            {role.isSystem && (
                              <span className="text-xs text-[#577B92] dark:text-gray-400">
                                System Role
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#577B92] dark:text-gray-400 max-w-xs">
                          {role.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users size={16} className="text-[#577B92] dark:text-gray-400 mr-2" />
                          <span className="text-sm text-[#1E4D3A] dark:text-white">{role.memberCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.isDefault ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Default
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultRole(role.id)}
                            className="text-xs text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                          >
                            Set as Default
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleEditRole(role)}
                            className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                          >
                            <Edit size={16} />
                          </button>
                          {!role.isSystem && (
                            <button 
                              onClick={() => handleDeleteRole(role)}
                              className="text-[#577B92] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            >
                              <Trash size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">
                  Edit Role: {editingRole.name}
                </h3>
                <button
                  onClick={() => setEditingRole(null)}
                  className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    disabled={editingRole.isSystem}
                  />
                  {editingRole.isSystem && (
                    <p className="mt-1 text-xs text-[#577B92] dark:text-gray-400">
                      System role names cannot be changed
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingRole.description}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium text-[#1E4D3A] dark:text-white mb-4">Permissions</h4>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <input
                      type="checkbox"
                      id="permission-all"
                      checked={editingRole.permissions.includes('all')}
                      onChange={() => handleTogglePermission('all')}
                      className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                    />
                    <label htmlFor="permission-all" className="ml-2 text-[#1E4D3A] dark:text-white font-medium">
                      All Permissions
                    </label>
                    <span className="ml-2 text-xs text-[#577B92] dark:text-gray-400">
                      (Full access to all features)
                    </span>
                  </div>
                  
                  <div className="max-h-[40vh] overflow-y-auto">
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <button
                          onClick={() => handleToggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <span className="font-medium text-[#1E4D3A] dark:text-white">{category}</span>
                          {expandedCategories.has(category) ? (
                            <ChevronDown size={16} className="text-[#577B92] dark:text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-[#577B92] dark:text-gray-400" />
                          )}
                        </button>
                        
                        {expandedCategories.has(category) && (
                          <div className="px-4 pb-4 space-y-3">
                            {categoryPermissions.map((permission) => (
                              <div key={permission.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`permission-${permission.id}`}
                                  checked={hasPermission(editingRole, permission.id)}
                                  onChange={() => handleTogglePermission(permission.id)}
                                  disabled={editingRole.permissions.includes('all')}
                                  className="h-4 w-4 mt-1 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                                />
                                <label htmlFor={`permission-${permission.id}`} className="ml-2">
                                  <div className="text-sm text-[#1E4D3A] dark:text-white">
                                    {permission.name}
                                  </div>
                                  <div className="text-xs text-[#577B92] dark:text-gray-400">
                                    {permission.description}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white hover:opacity-90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">
                  Create New Role
                </h3>
                <button
                  onClick={() => setShowCreateRole(false)}
                  className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                    placeholder="e.g., Production Manager"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newRole.description}
                    onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                    placeholder="Describe what this role can do"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium text-[#1E4D3A] dark:text-white mb-4">Permissions</h4>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <input
                      type="checkbox"
                      id="new-permission-all"
                      checked={newRole.permissions.includes('all')}
                      onChange={() => handleTogglePermission('all')}
                      className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                    />
                    <label htmlFor="new-permission-all" className="ml-2 text-[#1E4D3A] dark:text-white font-medium">
                      All Permissions
                    </label>
                    <span className="ml-2 text-xs text-[#577B92] dark:text-gray-400">
                      (Full access to all features)
                    </span>
                  </div>
                  
                  <div className="max-h-[40vh] overflow-y-auto">
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <button
                          onClick={() => handleToggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <span className="font-medium text-[#1E4D3A] dark:text-white">{category}</span>
                          {expandedCategories.has(category) ? (
                            <ChevronDown size={16} className="text-[#577B92] dark:text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-[#577B92] dark:text-gray-400" />
                          )}
                        </button>
                        
                        {expandedCategories.has(category) && (
                          <div className="px-4 pb-4 space-y-3">
                            {categoryPermissions.map((permission) => (
                              <div key={permission.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`new-permission-${permission.id}`}
                                  checked={newRole.permissions.includes('all') || newRole.permissions.includes(permission.id)}
                                  onChange={() => handleTogglePermission(permission.id)}
                                  disabled={newRole.permissions.includes('all')}
                                  className="h-4 w-4 mt-1 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                                />
                                <label htmlFor={`new-permission-${permission.id}`} className="ml-2">
                                  <div className="text-sm text-[#1E4D3A] dark:text-white">
                                    {permission.name}
                                  </div>
                                  <div className="text-xs text-[#577B92] dark:text-gray-400">
                                    {permission.description}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center mb-6">
                <input
                  type="checkbox"
                  id="default-role"
                  checked={newRole.isDefault}
                  onChange={(e) => setNewRole({ ...newRole, isDefault: e.target.checked })}
                  className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                />
                <label htmlFor="default-role" className="ml-2 text-[#1E4D3A] dark:text-white">
                  Make this the default role for new members
                </label>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button
            
                onClick={() => setShowCreateRole(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={!newRole.name}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white hover:opacity-90 disabled:opacity-50"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && roleToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4 text-red-500">
                <AlertCircle size={24} className="mr-2" />
                <h3 className="text-xl font-semibold">Delete Role</h3>
              </div>
              <p className="text-[#1E4D3A] dark:text-white mb-2">
                Are you sure you want to delete the <span className="font-semibold">{roleToDelete.name}</span> role?
              </p>
              <p className="text-[#577B92] dark:text-gray-400 text-sm">
                This action cannot be undone. Members with this role will need to be reassigned.
              </p>
              {roleToDelete.memberCount > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg flex items-start">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    This role is currently assigned to {roleToDelete.memberCount} members. You'll need to reassign them to another role.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRoleToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteRole}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;