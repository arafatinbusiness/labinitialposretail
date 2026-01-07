import React, { useState, useEffect } from 'react';
import { UserPlus, User, Shield, Mail, Trash2, Edit, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { StoreUser, UserRole, BusinessSettings } from '../../types';
import { dataService } from '../../services/firebaseService';

interface RoleManagementViewProps {
  storeId: string;
  t: (key: string) => string;
  userRole: UserRole;
  business: BusinessSettings;
}

const RoleManagementView: React.FC<RoleManagementViewProps> = ({ 
  storeId, 
  t, 
  userRole,
  business 
}) => {
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    email: string;
    role: UserRole;
  }>({
    name: '',
    email: '',
    role: 'cashier'
  });
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'cashier' as UserRole
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load store users
  useEffect(() => {
    const loadStoreUsers = async () => {
      setIsLoading(true);
      try {
        const users = await dataService.getStoreUsers(storeId);
        setStoreUsers(users);
      } catch (error) {
        console.error('Error loading store users:', error);
        setError('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoreUsers();
  }, [storeId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUserData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!newUserData.email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      // In a real implementation, you would:
      // 1. Check if user exists in Firebase Auth
      // 2. Get their UID
      // 3. Add them to storeUsers collection
      
      // For now, we'll simulate with a placeholder ID
      const userId = `user_${Date.now()}`;
      
      await dataService.addStoreUser(
        storeId, 
        userId, 
        newUserData.name,
        newUserData.email, 
        newUserData.role,
        'admin' // In real app, this would be current user's ID
      );

      // Refresh the list
      const updatedUsers = await dataService.getStoreUsers(storeId);
      setStoreUsers(updatedUsers);
      
      setSuccess(`User ${newUserData.name} (${newUserData.email}) added as ${newUserData.role}`);
      setNewUserData({ name: '', email: '', role: 'cashier' });
      setIsAddingUser(false);
    } catch (error) {
      console.error('Error adding user:', error);
      setError('Failed to add user. Make sure the email is valid and user exists.');
    }
  };

  const handleUpdateUser = async (userId: string, updates: { name?: string; email?: string; role?: UserRole }) => {
    try {
      await dataService.updateStoreUser(storeId, userId, updates);
      
      // Update local state
      setStoreUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));
      
      setSuccess('User updated successfully');
      setEditingUserId(null);
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    await handleUpdateUser(userId, { role: newRole });
  };

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from this store?`)) {
      return;
    }

    try {
      await dataService.removeStoreUser(storeId, userId);
      
      // Update local state
      setStoreUsers(prev => prev.filter(user => user.id !== userId));
      
      setSuccess('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      setError('Failed to remove user');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cashier': return 'bg-green-100 text-green-700 border-green-200';
      case 'salesman': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'manager': return <User className="w-4 h-4" />;
      case 'cashier': return <User className="w-4 h-4" />;
      case 'salesman': return <User className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Role Management</h2>
          <p className="text-gray-600 mt-1">Manage user access and permissions for this store</p>
        </div>
        
        {!isAddingUser && (
          <Button onClick={() => setIsAddingUser(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add User Form */}
      {isAddingUser && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Add New User</h3>
            <button 
              onClick={() => {
                setIsAddingUser(false);
                setNewUserData({ email: '', role: 'cashier' });
                setError('');
              }}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="User Name"
                type="text"
                value={newUserData.name}
                onChange={e => setNewUserData({...newUserData, name: e.target.value})}
                placeholder="John Doe"
                required
              />
              
              <Input
                label="User Email"
                type="email"
                value={newUserData.email}
                onChange={e => setNewUserData({...newUserData, email: e.target.value})}
                placeholder="user@example.com"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newUserData.role}
                  onChange={e => setNewUserData({...newUserData, role: e.target.value as UserRole})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                >
                  <option value="cashier">Cashier</option>
                  <option value="salesman">Salesman</option>
                  <option value="manager">Manager</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Only one admin per store (store owner)
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="secondary" 
              onClick={() => {
                setIsAddingUser(false);
                setNewUserData({ name: '', email: '', role: 'cashier' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Store Users ({storeUsers.length})</h3>
          <p className="text-sm text-gray-600 mt-1">
            Users with access to this store and their permissions
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Added</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {storeUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    {editingUserId === user.id ? (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          value={editData.name}
                          onChange={e => setEditData({...editData, name: e.target.value})}
                          placeholder="User Name"
                          className="w-full"
                        />
                        <Input
                          type="email"
                          value={editData.email}
                          onChange={e => setEditData({...editData, email: e.target.value})}
                          placeholder="user@example.com"
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {user.name ? user.name.charAt(0).toUpperCase() : <Mail className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.name || 'No Name'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">ID: {user.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {editingUserId === user.id ? (
                      <select
                        value={editData.role}
                        onChange={e => setEditData({...editData, role: e.target.value as UserRole})}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 w-full"
                      >
                        <option value="cashier">Cashier</option>
                        <option value="salesman">Salesman</option>
                        <option value="manager">Manager</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getRoleColor(user.role)} flex items-center gap-1.5`}>
                          {getRoleIcon(user.role)}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {user.isEmailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  
                  <td className="p-4 text-gray-600 text-sm">
                    {new Date(user.addedAt).toLocaleDateString()}
                  </td>
                  
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingUserId === user.id ? (
                        <>
                          <button
                            onClick={() => {
                              handleUpdateUser(user.id, {
                                name: editData.name,
                                email: editData.email,
                                role: editData.role
                              });
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                            title="Save"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditData({
                                name: user.name,
                                email: user.email,
                                role: user.role
                              });
                              setEditingUserId(user.id);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleRemoveUser(user.id, user.email)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                              title="Remove User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {storeUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <User className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-500 mb-2">No users added yet</p>
                      <p className="text-gray-400 mb-4">Add users to grant them access to this store</p>
                      <Button onClick={() => setIsAddingUser(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add First User
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-600">Admin - Full access</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600">Manager - Limited access</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600">Cashier - POS only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs text-gray-600">Salesman - Sales access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Permissions Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-800 mb-4">📋 Role Permissions Guide - Who Can Do What?</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-lg overflow-hidden border border-blue-100">
            <thead className="bg-blue-100">
              <tr>
                <th className="p-3 text-left font-bold text-blue-800">Feature / Permission</th>
                <th className="p-3 text-center font-bold text-blue-800">Admin</th>
                <th className="p-3 text-center font-bold text-blue-800">Manager</th>
                <th className="p-3 text-center font-bold text-blue-800">Salesman</th>
                <th className="p-3 text-center font-bold text-blue-800">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {/* POS Operations */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">POS - Create Invoices</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
              </tr>
              
              {/* Products */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">View Products</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">Add/Edit/Delete Products</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Categories */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">Manage Categories</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Customers */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">View Customers</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">Add/Edit/Delete Customers</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Invoices */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">View Invoices</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Reports */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">View Reports</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Settings */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">Access Settings</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Role Management */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">Manage Users/Roles</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
              
              {/* Employees */}
              <tr className="hover:bg-blue-50">
                <td className="p-3 font-medium text-gray-700">Manage Employees</td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
                <td className="p-3 text-center"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">✗</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-bold text-blue-700 mb-2">👑 Admin</h4>
            <p className="text-sm text-gray-600 mb-2">Store Owner / Full Access</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Full system control</li>
              <li>• Manage all users & roles</li>
              <li>• Access all reports</li>
              <li>• Configure settings</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-bold text-blue-700 mb-2">👔 Manager</h4>
            <p className="text-sm text-gray-600 mb-2">Store Manager / Limited Admin</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Manage products & categories</li>
              <li>• Manage customers</li>
              <li>• View invoices</li>
              <li>• POS operations</li>
              <li>• ❌ No settings access</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-bold text-blue-700 mb-2">💼 Salesman</h4>
            <p className="text-sm text-gray-600 mb-2">Sales Staff / Customer-Facing</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• POS operations</li>
              <li>• View products & customers</li>
              <li>• Create invoices</li>
              <li>• View invoices</li>
              <li>• ❌ No modifications</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-bold text-blue-700 mb-2">💰 Cashier</h4>
            <p className="text-sm text-gray-600 mb-2">Checkout Staff / POS Only</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• POS operations only</li>
              <li>• Create invoices</li>
              <li>• View products</li>
              <li>• ❌ No customer access</li>
              <li>• ❌ No reports/settings</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-bold text-yellow-800 mb-2">📝 Important Notes:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Cashiers</strong> can only access POS and view products</li>
            <li>• <strong>Salesmen</strong> can view customers but cannot modify them</li>
            <li>• <strong>Managers</strong> can manage products, categories, and customers</li>
            <li>• <strong>Only Admins</strong> can access settings, reports, and user management</li>
            <li>• All roles can create invoices through POS</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoleManagementView;
