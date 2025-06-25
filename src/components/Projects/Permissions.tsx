import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, UserPlus, MoreHorizontal, ChevronDown, 
  Check, X, Shield, Edit, Trash, Download, Mail, ArrowLeft,
  User, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ProjectInvitationDialog from './ProjectInvitationDialog';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Member {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'active' | 'inactive';
  invited_by: string;
  invited_at: string;
  organization_id: string;
  custom_message?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  permissions?: {
    writing: boolean;
    elements: boolean;
    schedules: boolean;
    budgets: boolean;
    castCrew: boolean;
    files: boolean;
  };
}

interface Organization {
  id: string;
  name: string;
  created_by: string;
}

interface RolePermissions {
  writing: boolean;
  elements: boolean;
  schedules: boolean;
  budgets: boolean;
  castCrew: boolean;
  files: boolean;
}

const rolePermissions: Record<string, RolePermissions> = {
  'Project Admin': {
    writing: true,
    elements: true,
    schedules: true,
    budgets: true,
    castCrew: true,
    files: true
  },
  'Writer': {
    writing: true,
    elements: true,
    schedules: false,
    budgets: false,
    castCrew: false,
    files: true
  },
  'Director': {
    writing: true,
    elements: true,
    schedules: true,
    budgets: false,
    castCrew: true,
    files: true
  },
  'Assistant Director': {
    writing: true,
    elements: true,
    schedules: true,
    budgets: false,
    castCrew: true,
    files: true
  },
  'Production Manager': {
    writing: false,
    elements: false,
    schedules: true,
    budgets: true,
    castCrew: true,
    files: true
  },
  'Viewer': {
    writing: false,
    elements: false,
    schedules: false,
    budgets: false,
    castCrew: false,
    files: false
  }
};

const Permissions: React.FC<{ project: any }> = ({ project }) => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const { t } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const roles = [
    'Project Admin',
    'Writer',
    'Director',
    'Assistant Director',
    'Production Manager',
    'Viewer'
  ];

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user?.id || !project?.id) return;

      try {
        setLoading(true);
        setError('');

        const membersRef = collection(db, 'project_members');
        const q = query(
          membersRef, 
          where('projectId', '==', project.id)
        );
        const querySnapshot = await getDocs(q);
        
        const membersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          permissions: doc.data().permissions || rolePermissions['Viewer']
        })) as Member[];

        setMembers(membersList);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load project members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user?.id, project?.id]);

  const updateMemberInDb = async (memberId: string, updates: Partial<Member>) => {
    const memberRef = doc(db, 'project_members', memberId);
    await updateDoc(memberRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!user?.id || loading) return;

    try {
      setIsSubmitting(true);
      setError('');

      const updates = {
        role: newRole,
        permissions: rolePermissions[newRole]
      };

      await updateMemberInDb(memberId, updates);

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { 
          ...m, 
          ...updates
        } : m
      ));

      setShowRoleSelector(null);
    } catch (err) {
      console.error('Error updating member role:', err);
      setError('Failed to update member role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = async (memberId: string, permission: keyof RolePermissions) => {
    if (!user?.id || loading) return;

    try {
      setIsSubmitting(true);
      setError('');

      const member = members.find(m => m.id === memberId);
      if (!member?.permissions) return;

      const newPermissions = {
        ...member.permissions,
        [permission]: !member.permissions[permission]
      };

      await updateMemberInDb(memberId, { permissions: newPermissions });

      setMembers(prev => prev.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            permissions: newPermissions
          };
        }
        return m;
      }));
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      setIsSubmitting(true);
      setError('');

      const memberRef = doc(db, 'project_members', memberToDelete.id);
      await updateDoc(memberRef, {
        status: 'inactive',
        lastUpdated: serverTimestamp()
      });

      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Failed to delete member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewInvitation = (newMember: Member) => {
    setMembers(prevMembers => [...prevMembers, newMember]);
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !selectedRole || member.role === selectedRole;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 mr-2" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className={`rounded-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border border-[#577B92]/10 dark:border-gray-700`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <Search size={18} className="text-[#577B92] dark:text-gray-400 mr-2" />
              <input 
                placeholder="Search members..."
                className="bg-transparent outline-none text-[#1E4D3A] dark:text-white placeholder-[#577B92] dark:placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowInviteDialog(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center"
              disabled={isSubmitting}
            >
              <UserPlus size={18} className="mr-2" />
              Invite Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className="px-4 py-3 text-left font-medium text-[#577B92] dark:text-gray-400">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-[#577B92] dark:text-gray-400">Role</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Writing</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Elements</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Schedules</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Budgets</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Cast & Crew</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Files</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-[#577B92] dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {member.profileImage ? (
                          <img
                            src={member.profileImage}
                            alt={member.firstName || member.email}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-full flex items-center justify-center">
                            <span className="text-[#E86F2C] font-medium">
                              {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="ml-3">
                          <div className="font-medium text-[#1E4D3A] dark:text-white">
                            {member.firstName && member.lastName 
                              ? `${member.firstName} ${member.lastName}`
                              : member.email}
                          </div>
                          <div className="text-sm text-[#577B92] dark:text-gray-400">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setShowRoleSelector(member.id)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                            showRoleSelector === member.id
                              ? 'bg-[#E86F2C]/10 text-[#E86F2C]'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="flex items-center">
                            <Shield size={16} className="mr-2" />
                            {member.role}
                          </span>
                          <ChevronDown size={16} />
                        </button>
                        
                        {showRoleSelector === member.id && (
                          <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            {roles.map((role) => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(member.id, role)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                              >
                                {member.role === role && (
                                  <Check size={16} className="mr-2 text-[#E86F2C]" />
                                )}
                                <span>{role}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <PermissionCell 
                      checked={member.permissions?.writing || false} 
                      disabled={false}
                      onChange={() => handlePermissionChange(member.id, 'writing')}
                    />
                    <PermissionCell 
                      checked={member.permissions?.elements || false} 
                      disabled={false}
                      onChange={() => handlePermissionChange(member.id, 'elements')}
                    />
                    <PermissionCell 
                      checked={member.permissions?.schedules || false} 
                      disabled={false}
                      onChange={() => handlePermissionChange(member.id, 'schedules')}
                    />
                    <PermissionCell 
                      checked={member.permissions?.budgets || false} 
                      disabled={false}
                      onChange={() => handlePermissionChange(member.id, 'budgets')}
                    />
                    <PermissionCell 
                      checked={member.permissions?.castCrew || false} 
                      disabled={false}
                      onChange={() => handlePermissionChange(member.id, 'castCrew')}
                    />
                    <PermissionCell 
                      checked={member.permissions?.files || false} 
                      disabled={false}
                      onChange={() => handlePermissionChange(member.id, 'files')}
                    />
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : member.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setMemberToDelete(member);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-[#577B92] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Remove member"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDeleteConfirm && memberToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4 text-red-500">
                <AlertCircle size={24} className="mr-2" />
                <h3 className="text-xl font-semibold">Remove Member</h3>
              </div>
              <p className="text-[#1E4D3A] dark:text-white mb-2">
                Are you sure you want to remove <span className="font-semibold">{memberToDelete.email}</span>?
              </p>
              <p className="text-[#577B92] dark:text-gray-400 text-sm">
                This action cannot be undone. The member will lose access to this project.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMemberToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteMember}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Removing...
                  </>
                ) : (
                  'Remove Member'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteDialog && (
        <ProjectInvitationDialog
          project={project}
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onInviteSent={handleNewInvitation}
        />
      )}
    </div>
  );
};

interface PermissionCellProps {
  checked: boolean;
  disabled: boolean;
  onChange?: () => void;
}

const PermissionCell: React.FC<PermissionCellProps> = ({ checked, disabled, onChange }) => {
  const { isDarkMode } = useDarkMode();
  
  return (
    <td className="px-4 py-3 text-center">
      <div className="flex justify-center">
        <button
          onClick={onChange}
          disabled={disabled}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            checked 
              ? 'bg-[#E86F2C]/10 border-[#E86F2C]' 
              : isDarkMode
                ? 'border-gray-700'
                : 'border-gray-200'
          } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-[#E86F2C] hover:bg-[#E86F2C]/5'}`}
        >
          {checked && <Check size={14} className="text-[#E86F2C]" />}
        </button>
      </div>
    </td>
  );
};

export default Permissions;