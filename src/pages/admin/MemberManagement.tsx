import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, UserPlus, MoreHorizontal, ChevronDown, 
  Check, X, Shield, Edit, Trash, Download, Mail, ArrowLeft,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';

interface Member {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'active' | 'inactive';
  invited_by: string;
  invited_at: Timestamp;
  organization_id: string;
  custom_message?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface Organization {
  id: string;
  name: string;
  created_by: string;
}

const MemberManagement: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = ['Admin', 'Editor', 'Viewer', 'Script Supervisor'];
  const statuses = ['pending', 'active', 'inactive'];

  // Fetch organization and members
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        // First get the user's organization
        const orgQuery = query(
          collection(db, 'organizations'),
          where('created_by', '==', user.id)
        );
        const orgSnapshot = await getDocs(orgQuery);
        
        if (orgSnapshot.empty) {
          setError('No organization found');
          setLoading(false);
          return;
        }

        const orgDoc = orgSnapshot.docs[0];
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        setOrganization(orgData);

        // Then fetch members for this organization
        const membersQuery = query(
          collection(db, 'org_members'),
          where('organization_id', '==', orgDoc.id)
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        const membersData = membersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Member[];

        // Fetch user details for each member
        const membersWithDetails = await Promise.all(
          membersData.map(async (member) => {
            try {
              const userDoc = await getDocs(
                query(collection(db, 'users'), where('email', '==', member.email))
              );
              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                return {
                  ...member,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  profileImage: userData.profileImage
                };
              }
              return member;
            } catch (err) {
              console.error('Error fetching user details:', err);
              return member;
            }
          })
        );

        setMembers(membersWithDetails);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const getInitials = (member: Member) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email[0].toUpperCase();
  };

  const getFullName = (member: Member) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return null;
  };

  const filteredMembers = members.filter(member => {
    const fullName = getFullName(member);
    const matchesSearch = (fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         member.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = !selectedRole || member.role === selectedRole;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedMembers(new Set(filteredMembers.map(member => member.id)));
      setShowBulkActions(true);
    }
  };

  const handleSelectMember = (id: string) => {
    const newSelectedMembers = new Set(selectedMembers);
    
    if (newSelectedMembers.has(id)) {
      newSelectedMembers.delete(id);
    } else {
      newSelectedMembers.add(id);
    }
    
    setSelectedMembers(newSelectedMembers);
    setShowBulkActions(newSelectedMembers.size > 0);
  };

  const handleRemoveMember = async (member: Member) => {
    if (!organization) return;

    try {
      await deleteDoc(doc(db, 'org_members', member.id));
      
      // Update local state
      setMembers(prevMembers => prevMembers.filter(m => m.id !== member.id));
      setShowConfirmDialog(false);
      setMemberToRemove(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!organization) return;

    try {
      switch (action) {
        case 'deactivate':
          // Update status to inactive for selected members
          for (const memberId of selectedMembers) {
            await updateDoc(doc(db, 'org_members', memberId), {
              status: 'inactive'
            });
          }
          setMembers(prevMembers => prevMembers.map(member => 
            selectedMembers.has(member.id) ? { ...member, status: 'inactive' } : member
          ));
          break;
        case 'remove':
          // Remove selected members
          for (const memberId of selectedMembers) {
            await deleteDoc(doc(db, 'org_members', memberId));
          }
          setMembers(prevMembers => prevMembers.filter(m => !selectedMembers.has(m.id)));
          break;
      }
      setSelectedMembers(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(`Failed to ${action} members`);
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, 'org_members', editingMember.id), {
        role: editingMember.role,
        status: editingMember.status
      });

      // Update local state
      setMembers(prevMembers => prevMembers.map(member => 
        member.id === editingMember.id ? editingMember : member
      ));

      setShowEditDialog(false);
      setEditingMember(null);
    } catch (err) {
      console.error('Error updating member:', err);
      setError('Failed to update member');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92] dark:text-gray-400">Loading members...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">{t('member_management')}</h1>
                <p className="text-[#577B92] dark:text-gray-400 mt-1">
                  {t('manage_team_members')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/members/invite')}
              className="bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center"
            >
              <UserPlus size={18} className="mr-2" />
              {t('add_member')}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-[#577B92]/10 dark:border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#577B92] dark:text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={t('search_members')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-[#E86F2C]"
                />
              </div>
              <div className="flex space-x-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowRoleFilter(!showRoleFilter)}
                    className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                  >
                    <Filter size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
                    <span>{selectedRole || t('role')}</span>
                    <ChevronDown size={16} className="ml-2 text-[#577B92] dark:text-gray-400" />
                  </button>
                  {showRoleFilter && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setSelectedRole(null);
                            setShowRoleFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          All Roles
                        </button>
                        {roles.map((role) => (
                          <button
                            key={role}
                            onClick={() => {
                              setSelectedRole(role);
                              setShowRoleFilter(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                          >
                            {selectedRole === role && <Check size={16} className="mr-2 text-[#E86F2C]" />}
                            <span>{role}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowStatusFilter(!showStatusFilter)}
                    className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                  >
                    <Filter size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
                    <span>{selectedStatus ? selectedStatus : t('status')}</span>
                    <ChevronDown size={16} className="ml-2 text-[#577B92] dark:text-gray-400" />
                  </button>
                  {showStatusFilter && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setSelectedStatus(null);
                            setShowStatusFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          All Statuses
                        </button>
                        {statuses.map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              setSelectedStatus(status);
                              setShowStatusFilter(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                          >
                            {selectedStatus === status && <Check size={16} className="mr-2 text-[#E86F2C]" />}
                            <span className="capitalize">{status}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <div className="bg-[#1E4D3A]/10 dark:bg-[#1E4D3A]/20 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-[#1E4D3A] dark:text-white font-medium">
                  {selectedMembers.size} members selected
                </span>
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-[#1E4D3A] dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('deactivate')}
                </button>
                <button 
                  onClick={() => handleBulkAction('remove')}
                  className="px-4 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600"
                >
                  {t('remove')}
                </button>
              </div>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#577B92]/10 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      {t('role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      {t('last_active')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage}
                              alt={getFullName(member) || member.email}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-full flex items-center justify-center">
                              <span className="text-[#E86F2C] font-medium">
                                {getInitials(member)}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-[#1E4D3A] dark:text-white">
                              {getFullName(member) || 'No name set'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#577B92] dark:text-gray-400">
                          {member.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield size={16} className="mr-2 text-[#577B92] dark:text-gray-400" />
                          <span className="text-sm text-[#1E4D3A] dark:text-white">{member.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : member.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          <span className="capitalize">{member.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#577B92] dark:text-gray-400">
                        {member.invited_at.toDate().toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => {
                              setEditingMember(member);
                              setShowEditDialog(true);
                            }}
                            className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowConfirmDialog(true);
                            }}
                            className="text-[#577B92] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <Trash size={16} />
                          </button>
                          <div className="relative group">
                            <button className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white">
                              <MoreHorizontal size={16} />
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                              <div className="py-1">
                                <button className="block w-full text-left px-4 py-2 text-sm text-[#1E4D3A] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                                  View Details
                                </button>
                                <button className="block w-full text-left px-4 py-2 text-sm text-[#1E4D3A] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                                  Resend Invite
                                </button>
                                <button className="block w-full text-left px-4 py-2 text-sm text-[#1E4D3A] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                                  Change Role
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredMembers.length === 0 && (
              <div className="text-center py-12">
                <User size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-1">No members found</h3>
                <p className="text-[#577B92] dark:text-gray-400">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button className="flex items-center text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white">
              <Download size={16} className="mr-2" />
              {t('export_member_list')}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Member Dialog */}
      {showEditDialog && editingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">Edit Member</h3>
                <button
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingMember(null);
                  }}
                  className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  {editingMember.profileImage ? (
                    <img
                      src={editingMember.profileImage}
                      alt={getFullName(editingMember) || editingMember.email}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-full flex items-center justify-center">
                      <span className="text-[#E86F2C] text-xl font-medium">
                        {getInitials(editingMember)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-[#1E4D3A] dark:text-white font-medium">
                      {getFullName(editingMember) || 'No name set'}
                    </h4>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">
                      {editingMember.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editingMember.role}
                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editingMember.status}
                    onChange={(e) => setEditingMember({ ...editingMember, status : e.target.value as 'pending' | 'active' | 'inactive' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status} className="capitalize">{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingMember(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditMember}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && memberToRemove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4 text-red-500">
                <Trash size={24} className="mr-2" />
                <h3 className="text-xl font-semibold">{t('remove_member')}</h3>
              </div>
              <p className="text-[#1E4D3A] dark:text-white mb-2">
                Are you sure you want to remove <span className="font-semibold">{memberToRemove.email}</span>?
              </p>
              <p className="text-[#577B92] dark:text-gray-400 text-sm">
                {t('remove_confirm')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowConfirmDialog(false);
                  setMemberToRemove(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => handleRemoveMember(memberToRemove)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;