import React, { useState } from 'react';
import { Mail, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Project } from '../../types/project';

interface ProjectInvitationDialogProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent?: (newMember: any) => void;
}

const rolePermissions = {
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

const ProjectInvitationDialog: React.FC<ProjectInvitationDialogProps> = ({
  project,
  isOpen,
  onClose,
  onInviteSent
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Writer',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!user?.id || !inviteForm.email.trim()) return;

    try {
      setIsSubmitting(true);
      setError('');

      // Query users collection for the invitee's details
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', inviteForm.email.trim()));
      const userSnapshot = await getDocs(userQuery);

      let firstName = undefined;
      let lastName = undefined;
      let profileImage = undefined;

      // If user exists, get their details
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        firstName = userData.firstName;
        lastName = userData.lastName;
        profileImage = userData.profileImage;
      }

      // Create project member invitation
      const memberData = {
        projectId: project.id,
        userId: null,
        email: inviteForm.email,
        role: inviteForm.role,
        isOwner: false,
        permissions: rolePermissions[inviteForm.role as keyof typeof rolePermissions],
        invitedAt: serverTimestamp(),
        joinedAt: null,
        lastUpdated: serverTimestamp(),
        updatedBy: user.id,
        status: 'pending',
        message: inviteForm.message || null,
        firstName,
        lastName,
        profileImage
      };

      const docRef = await addDoc(collection(db, 'project_members'), memberData);

      // Call the callback with the new member data
      if (onInviteSent) {
        onInviteSent({
          id: docRef.id,
          ...memberData,
          invitedAt: new Date(),
          lastUpdated: new Date()
        });
      }

      // Reset form and close dialog
      setInviteForm({
        email: '',
        role: 'Writer',
        message: ''
      });
      onClose();

    } catch (err) {
      console.error('Error creating invitation:', err);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'} shadow-lg`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-[#1E4D3A] dark:text-white">Invite New Member</h3>
            <button
              onClick={() => {
                onClose();
                setInviteForm({ email: '', role: 'Writer', message: '' });
                setError('');
              }}
              className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 mr-2" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#577B92] dark:text-gray-400" />
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-[#1E4D3A]'
                  } focus:outline-none focus:border-[#E86F2C]`}
                  placeholder="colleague@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-[#1E4D3A]'
                } focus:outline-none focus:border-[#E86F2C]`}
              >
                <option value="Writer">Writer</option>
                <option value="Director">Director</option>
                <option value="Assistant Director">Assistant Director</option>
                <option value="Production Manager">Production Manager</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Message (Optional)
              </label>
              <textarea
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-[#1E4D3A]'
                } focus:outline-none focus:border-[#E86F2C]`}
                rows={3}
                placeholder="Add a personal message to your invitation..."
              />
            </div>
          </div>
        </div>

        <div className={`p-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end space-x-3`}>
          <button
            onClick={() => {
              onClose();
              setInviteForm({ email: '', role: 'Writer', message: '' });
              setError('');
            }}
            className={`px-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-[#577B92] hover:bg-gray-50'
            }`}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!inviteForm.email.trim() || isSubmitting}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectInvitationDialog;