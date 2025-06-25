import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Trash, Mail, Upload, X, Check, 
  AlertCircle, Info, Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';

interface InviteData {
  email: string;
  role: string;
  customMessage?: string;
}

interface Organization {
  id: string;
  name: string;
  created_by: string;
}

const MemberInvite: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [invites, setInvites] = useState<InviteData[]>([
    { email: '', role: 'Viewer' }
  ]);
  const [customMessage, setCustomMessage] = useState('');
  const [showRoleSelector, setShowRoleSelector] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<InviteData[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState<Organization | null>(null);

  const roles = ['Admin', 'Editor', 'Viewer', 'Script Supervisor'];

  // Fetch user's organization
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user?.id) return;

      try {
        const q = query(
          collection(db, 'organizations'),
          where('created_by', '==', user.id)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const orgData = querySnapshot.docs[0].data() as Organization;
          setOrganization({ ...orgData, id: querySnapshot.docs[0].id });
        } else {
          setError('No organization found. Please create an organization first.');
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization data');
      }
    };

    fetchOrganization();
  }, [user?.id]);

  const handleAddInvite = () => {
    setInvites([...invites, { email: '', role: 'Viewer' }]);
  };

  const handleRemoveInvite = (index: number) => {
    const newInvites = [...invites];
    newInvites.splice(index, 1);
    setInvites(newInvites);
  };

  const handleEmailChange = (index: number, email: string) => {
    const newInvites = [...invites];
    newInvites[index].email = email;
    setInvites(newInvites);
  };

  const handleRoleChange = (index: number, role: string) => {
    const newInvites = [...invites];
    newInvites[index].role = role;
    setInvites(newInvites);
    setShowRoleSelector(null);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n');
      const parsedData: InviteData[] = rows
        .slice(1) // Skip header row
        .filter(row => row.trim()) // Remove empty rows
        .map(row => {
          const [email, role] = row.split(',').map(cell => cell.trim());
          return { email, role: role || 'Viewer' };
        });
      
      setCsvPreview(parsedData);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = () => {
    setInvites([...invites, ...csvPreview]);
    setShowCsvPreview(false);
    setCsvFile(null);
  };

  const validateEmails = (emails: string[]): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => emailRegex.test(email));
  };

  const sendInviteEmail = async (email: string, role: string) => {
    try {
      // In a real app, you would call your backend API to send emails
      // For now, we'll just simulate email sending
      console.log(`Sending invite email to ${email} for role ${role}`);
      return true;
    } catch (error) {
      console.error('Error sending invite email:', error);
      return false;
    }
  };

  const handleSendInvites = async () => {
    if (!user?.id) {
      setError('You must be logged in to send invites');
      return;
    }

    if (!organization?.id) {
      setError('No organization found. Please create an organization first.');
      return;
    }

    // Validate emails
    const emails = invites.map(invite => invite.email);
    if (!validateEmails(emails)) {
      setError('Please enter valid email addresses');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Create batch of invites
      const inviteBatch = invites.map(async (invite) => {
        // Add to org_members collection
        const memberDoc = await addDoc(collection(db, 'org_members'), {
          email: invite.email,
          role: invite.role,
          status: 'pending',
          organization_id: organization.id,
          invited_by: user.id,
          invited_at: serverTimestamp(),
          custom_message: customMessage || null
        });

        // Send invite email
        await sendInviteEmail(invite.email, invite.role);

        return memberDoc;
      });

      // Wait for all invites to be processed
      await Promise.all(inviteBatch);

      setShowSuccessMessage(true);
      
      // Reset form after success
      setTimeout(() => {
        navigate('/admin/members');
      }, 2000);

    } catch (err) {
      console.error('Error sending invites:', err);
      setError('Failed to send invites. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="company" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigate('/admin/members')}
              className="mr-4 p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} className="text-[#1E4D3A] dark:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Invite Team Members</h1>
              <p className="text-[#577B92] dark:text-gray-400 mt-1">
                Send invitations to collaborate on your projects
              </p>
            </div>
          </div>

          {/* Success Message */}
          {showSuccessMessage && (
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-start">
              <Check size={20} className="text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-300">Invitations Sent Successfully</h3>
                <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                  Your team members will receive an email with instructions to join.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-300">Error</h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#577B92]/10 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#1E4D3A] dark:text-white mb-6">Email Invitations</h2>
            
            {/* Invite Form */}
            <div className="space-y-4 mb-6">
              {invites.map((invite, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#577B92] dark:text-gray-400 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#577B92] dark:text-gray-400" size={18} />
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        placeholder="colleague@example.com"
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-[#E86F2C]"
                        required
                      />
                    </div>
                  </div>
                  <div className="w-40">
                    <label className="block text-sm font-medium text-[#577B92] dark:text-gray-400 mb-1">
                      Role
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRoleSelector(showRoleSelector === index ? null : index)}
                        className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                      >
                        <div className="flex items-center">
                          <Shield size={16} className="mr-2 text-[#577B92] dark:text-gray-400" />
                          <span>{invite.role}</span>
                        </div>
                        <X
                          size={16}
                          className="text-[#577B92] dark:text-gray-400"
                          style={{ transform: 'rotate(45deg)' }}
                        />
                      </button>
                      {showRoleSelector === index && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                          {roles.map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handleRoleChange(index, role)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                            >
                              {invite.role === role && (
                                <Check size={16} className="mr-2 text-[#E86F2C]" />
                              )}
                              <span>{role}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {invites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInvite(index)}
                      className="mt-8 text-[#577B92] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add More Button */}
            <button
              type="button"
              onClick={handleAddInvite}
              className="flex items-center text-[#E86F2C] hover:text-[#E86F2C]/80 mb-6"
            >
              <Plus size={16} className="mr-2" />
              Add Another Invitation
            </button>

            {/* Custom Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-400 mb-1">
                Personalized Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal note to your invitation..."
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-[#E86F2C]"
                rows={4}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start">
              <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-blue-800 dark:text-blue-300 text-sm">
                <p>Invitees will receive an email with a link to join your company.</p>
                <p className="mt-1">They will need to create an account if they don't already have one.</p>
              </div>
            </div>

            {/* Bulk Upload Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-md font-medium text-[#1E4D3A] dark:text-white mb-4">Bulk Invite via CSV</h3>
              
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Upload size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
                  <span className="text-[#577B92] dark:text-gray-400">Upload CSV File</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                </label>
                <a
                  href="#"
                  className="text-[#E86F2C] hover:text-[#E86F2C]/80 text-sm"
                  onClick={(e) => e.preventDefault()}
                >
                  Download Template
                </a>
              </div>
              
              {csvFile && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-lg flex items-center justify-center mr-3">
                      <Mail size={16} className="text-[#E86F2C]" />
                    </div>
                    <div>
                      <p className="text-[#1E4D3A] dark:text-white font-medium">{csvFile.name}</p>
                      <p className="text-[#577B92] dark:text-gray-400 text-sm">
                        {csvPreview.length} email addresses
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCsvFile(null);
                      setShowCsvPreview(false);
                    }}
                    className="text-[#577B92] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CSV Preview Modal */}
          {showCsvPreview && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-2xl w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">
                      Preview CSV Import
                    </h3>
                    <button
                      onClick={() => setShowCsvPreview(false)}
                      className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {csvPreview.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E4D3A] dark:text-white">
                              {item.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E4D3A] dark:text-white">
                              {item.role}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex items-start mb-4">
                    <AlertCircle size={20} className="text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">
                      Please review the data above before importing. Make sure all email addresses are correct and roles are properly assigned.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCsvPreview(false)}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCsv}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white hover:opacity-90"
                  >
                    Import {csvPreview.length} Contacts
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/members')}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendInvites}
              disabled={invites.some(invite => !invite.email) || isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Invites...
                </>
              ) : (
                'Send Invites'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberInvite;