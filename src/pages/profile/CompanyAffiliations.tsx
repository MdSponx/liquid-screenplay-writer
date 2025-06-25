import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Building, Users, X, Check, AlertCircle, Upload
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Sidebar from '../../components/Sidebar';

interface Company {
  id: string;
  name: string;
  role: string;
  initials: string;
  isPrimary: boolean;
  logo?: string;
  description?: string;
  address?: string;
}

interface Invitation {
  id: string;
  companyName: string;
  role: string;
  initials: string;
  invitedBy: string;
  date: string;
}

const CompanyAffiliations: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<Company[]>([
    { 
      id: '1', 
      name: 'Screenplay Productions', 
      role: 'Director of Development', 
      initials: 'SP', 
      isPrimary: true 
    },
    { 
      id: '2', 
      name: 'Writers Guild', 
      role: 'Member', 
      initials: 'WG', 
      isPrimary: false 
    }
  ]);

  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: '1',
      companyName: 'Movie Production Ltd',
      role: 'Writer',
      initials: 'MP',
      invitedBy: 'John Director',
      date: '2025-01-10'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    role: 'Owner',
    description: '',
    address: '',
    logo: ''
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [companyToLeave, setCompanyToLeave] = useState<Company | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const handleCreateCompany = () => {
    if (!newCompany.name.trim()) return;

    const company: Company = {
      id: Date.now().toString(),
      name: newCompany.name,
      role: newCompany.role,
      initials: newCompany.name.split(' ').map(word => word[0]).join('').toUpperCase(),
      isPrimary: companies.length === 0, // Make primary if it's the first company
      description: newCompany.description,
      address: newCompany.address,
      logo: previewLogo || undefined
    };

    setCompanies([...companies, company]);
    setNewCompany({ name: '', role: 'Owner', description: '', address: '', logo: '' });
    setPreviewLogo(null);
    setShowCreateModal(false);
  };

  const handleLeaveCompany = () => {
    if (!companyToLeave) return;
    
    // Remove the company
    const updatedCompanies = companies.filter(c => c.id !== companyToLeave.id);
    
    // If the company was primary, make another one primary if available
    if (companyToLeave.isPrimary && updatedCompanies.length > 0) {
      updatedCompanies[0].isPrimary = true;
    }
    
    setCompanies(updatedCompanies);
    setCompanyToLeave(null);
    setShowLeaveModal(false);
  };

  const handleSetPrimary = (id: string) => {
    setCompanies(companies.map(company => ({
      ...company,
      isPrimary: company.id === id
    })));
  };

  const handleAcceptInvitation = (id: string) => {
    const invitation = invitations.find(inv => inv.id === id);
    if (!invitation) return;

    // Add to companies
    const newCompany: Company = {
      id: Date.now().toString(),
      name: invitation.companyName,
      role: invitation.role,
      initials: invitation.initials,
      isPrimary: companies.length === 0 // Make primary if it's the first company
    };

    setCompanies([...companies, newCompany]);
    
    // Remove from invitations
    setInvitations(invitations.filter(inv => inv.id !== id));
  };

  const handleDeclineInvitation = (id: string) => {
    setInvitations(invitations.filter(inv => inv.id !== id));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewLogo(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="profile" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigate('/profile')}
              className="mr-4 p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} className="text-[#1E4D3A] dark:text-white" />
            </button>
            <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Company Affiliations</h1>
          </div>

          <div className="space-y-8">
            {/* Your Companies */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white flex items-center">
                  <Building size={18} className="mr-2" />
                  Your Companies
                </h2>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Create Company
                </button>
              </div>

              {companies.length > 0 ? (
                <div className="space-y-4">
                  {companies.map(company => (
                    <div 
                      key={company.id}
                      className="flex items-center justify-between p-4 bg-[#F5F5F2] dark:bg-gray-800 rounded-lg border border-[#577B92]/10 dark:border-gray-700"
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-[#577B92] rounded-lg flex items-center justify-center text-[#F5F5F2] text-lg font-bold">
                          {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            company.initials
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-[#1E4D3A] dark:text-white font-medium">{company.name}</p>
                          <p className="text-[#577B92] dark:text-gray-400 text-sm">{company.role}</p>
                          {company.address && (
                            <p className="text-[#577B92] dark:text-gray-400 text-xs mt-1">{company.address}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {company.isPrimary ? (
                          <span className="px-3 py-1 bg-[#E86F2C]/20 text-[#E86F2C] rounded-full text-sm">Primary</span>
                        ) : (
                          <button 
                            onClick={() => handleSetPrimary(company.id)}
                            className="px-3 py-1 bg-[#577B92]/10 text-[#577B92] dark:text-gray-300 rounded-full text-sm hover:bg-[#577B92]/20"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setCompanyToLeave(company);
                            setShowLeaveModal(true);
                          }}
                          className="p-1.5 text-[#577B92] hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-[#F5F5F2] dark:bg-gray-800 rounded-lg">
                  <Building size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-3" />
                  <p className="text-[#1E4D3A] dark:text-white font-medium">No companies yet</p>
                  <p className="text-[#577B92] dark:text-gray-400 text-sm mt-1">Create a company or accept invitations</p>
                </div>
              )}
            </div>

            {/* Pending Invitations */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-6 flex items-center">
                <Users size={18} className="mr-2" />
                Pending Invitations
              </h2>

              {invitations.length > 0 ? (
                <div className="space-y-4">
                  {invitations.map(invitation => (
                    <div 
                      key={invitation.id}
                      className="p-4 bg-[#F5F5F2] dark:bg-gray-800 rounded-lg border border-[#577B92]/10 dark:border-gray-700"
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-[#577B92] rounded-lg flex items-center justify-center text-[#F5F5F2] font-bold">
                          {invitation.initials}
                        </div>
                        <div className="ml-3">
                          <p className="text-[#1E4D3A] dark:text-white font-medium">{invitation.companyName}</p>
                          <p className="text-[#577B92] dark:text-gray-400 text-sm">
                            {invitation.role} • Invited by {invitation.invitedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
                        >
                          <Check size={16} className="mr-1" />
                          Accept
                        </button>
                        <button 
                          onClick={() => handleDeclineInvitation(invitation.id)}
                          className="flex-1 py-2 rounded-lg border border-[#577B92] text-[#577B92] dark:border-gray-600 dark:text-gray-300 hover:bg-[#577B92]/10 transition-colors flex items-center justify-center"
                        >
                          <X size={16} className="mr-1" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-[#F5F5F2] dark:bg-gray-800 rounded-lg">
                  <Users size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-3" />
                  <p className="text-[#1E4D3A] dark:text-white font-medium">No pending invitations</p>
                  <p className="text-[#577B92] dark:text-gray-400 text-sm mt-1">You'll see invitations here when someone invites you</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white mb-4">Create New Company</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Enter company name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Company Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E86F2C] transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {previewLogo ? (
                        <img src={previewLogo} alt="Company logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Upload size={24} className="text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <div className="text-sm text-[#577B92] dark:text-gray-400">
                      {previewLogo ? 'Click to change logo' : 'Upload company logo (optional)'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Company Description
                  </label>
                  <textarea
                    value={newCompany.description}
                    onChange={(e) => setNewCompany({...newCompany, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Brief description of the company"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Company address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Your Role
                  </label>
                  <select
                    value={newCompany.role}
                    onChange={(e) => setNewCompany({...newCompany, role: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Manager</option>
                    <option value="Producer">Producer</option>
                    <option value="Writer">Writer</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setPreviewLogo(null);
                  setNewCompany({ name: '', role: 'Owner', description: '', address: '', logo: '' });
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCompany}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity"
                disabled={!newCompany.name.trim()}
              >
                Create Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Company Modal */}
      {showLeaveModal && companyToLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4 text-red-500">
                <AlertCircle size={24} className="mr-2" />
                <h3 className="text-xl font-semibold">Leave Company</h3>
              </div>
              <p className="text-[#1E4D3A] dark:text-white mb-2">
                Are you sure you want to leave <span className="font-semibold">{companyToLeave.name}</span>?
              </p>
              <p className="text-[#577B92] dark:text-gray-400 text-sm">
                {companyToLeave.isPrimary 
                  ? "This is your primary company. If you leave, another company will be set as primary if available."
                  : "You will no longer have access to this company's projects and resources."}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowLeaveModal(false);
                  setCompanyToLeave(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleLeaveCompany}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600"
              >
                Leave Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAffiliations;