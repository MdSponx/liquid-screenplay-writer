import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, Settings, Building, BarChart2, 
  UserPlus, Shield, Calendar, Mail, Phone, MapPin, 
  ChevronRight, ArrowUpRight, Plus, Search, Edit, X,
  Info, UserCog, Folder
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';

interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  isPrimary: boolean;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Organization>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  // Fetch primary organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const q = query(
          collection(db, 'organizations'), 
          where('created_by', '==', user.id),
          where('isPrimary', '==', true)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const orgData = querySnapshot.docs[0].data() as Organization;
          setOrganization({ ...orgData, id: querySnapshot.docs[0].id });
          setEditForm(orgData);
          setPreviewLogo(orgData.logo || null);
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [user?.id]);

  const companyStats = [
    { title: t('active_projects'), value: 24, icon: <FileText size={18} className="text-[#E86F2C]" />, change: '+12%' },
    { title: t('members'), value: 156, icon: <Users size={18} className="text-[#E86F2C]" />, change: '+8%' },
    { title: 'Storage Used', value: '68%', icon: <Building size={18} className="text-[#E86F2C]" />, progress: 68 }
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewLogo(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    try {
      const storageRef = ref(storage, `organization-logos/${user?.id}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setEditForm(prev => ({ ...prev, logo: downloadURL }));
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Failed to upload logo');
    }
  };

  const handleSaveChanges = async () => {
    if (!organization?.id || !user?.id) return;

    try {
      setIsSubmitting(true);
      setError('');

      const updatedData = {
        ...editForm,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, 'organizations', organization.id), updatedData);
      setOrganization(prev => prev ? { ...prev, ...updatedData } : null);
      setShowEditDialog(false);
    } catch (err) {
      console.error('Error updating organization:', err);
      setError('Failed to update organization details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92] dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="company" />

      <div className="flex-1 overflow-hidden bg-[#F5F5F2] dark:bg-gray-800 flex flex-col">
        <div className="p-8 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Organization Console</h1>
          <p className="text-[#577B92] dark:text-gray-400 mt-1">
            {t('manage_settings')}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-8">
          <button
            onClick={() => navigate('/admin')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'overview'
                ? 'text-[#E86F2C] border-[#E86F2C]'
                : 'text-[#577B92] dark:text-gray-400 border-transparent hover:text-[#1E4D3A] dark:hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <Info size={16} className="mr-2" />
              Overview
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/members')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'members'
                ? 'text-[#E86F2C] border-[#E86F2C]'
                : 'text-[#577B92] dark:text-gray-400 border-transparent hover:text-[#1E4D3A] dark:hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <Users size={16} className="mr-2" />
              Members
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/roles')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'roles'
                ? 'text-[#E86F2C] border-[#E86F2C]'
                : 'text-[#577B92] dark:text-gray-400 border-transparent hover:text-[#1E4D3A] dark:hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <UserCog size={16} className="mr-2" />
              Roles
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/projects')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'projects'
                ? 'text-[#E86F2C] border-[#E86F2C]'
                : 'text-[#577B92] dark:text-gray-400 border-transparent hover:text-[#1E4D3A] dark:hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <Folder size={16} className="mr-2" />
              Projects
            </div>
          </button>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {companyStats.map((stat, index) => (
                <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#577B92] dark:text-gray-400 font-medium">{stat.title}</h3>
                    <div className="w-10 h-10 bg-[#E86F2C]/10 dark:bg-[#E86F2C]/20 rounded-lg flex items-center justify-center">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#1E4D3A] dark:text-white text-2xl font-semibold">{stat.value}</span>
                    {stat.change && (
                      <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                        <ArrowUpRight size={16} className="mr-1" />
                        <span>{stat.change}</span>
                      </div>
                    )}
                  </div>
                  {stat.progress && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                      <div 
                        className="bg-[#E86F2C] dark:bg-[#E86F2C] h-2.5 rounded-full" 
                        style={{ width: `${stat.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Organization Profile Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm border border-[#577B92]/10 dark:border-gray-700 mb-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-[#1E4D3A] dark:bg-[#E86F2C] rounded-xl flex items-center justify-center overflow-hidden">
                    {organization?.logo ? (
                      <img src={organization.logo} alt="Organization Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building size={32} className="text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white mb-2">
                      {organization?.name || '-'}
                    </h2>
                    <p className="text-[#577B92] dark:text-gray-400">Created • {organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditForm(organization || {});
                    setShowEditDialog(true);
                  }}
                  className="bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Edit Profile
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[#577B92] dark:text-gray-400 font-medium mb-2">Description</h4>
                    <p className="text-[#1E4D3A] dark:text-white">
                      {organization?.description || '-'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[#577B92] dark:text-gray-400 font-medium mb-2">Primary Contact</h4>
                    <div className="flex items-center space-x-2">
                      <Mail size={16} className="text-[#577B92] dark:text-gray-400" />
                      <p className="text-[#1E4D3A] dark:text-white">{organization?.email || '-'}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone size={16} className="text-[#577B92] dark:text-gray-400" />
                      <p className="text-[#1E4D3A] dark:text-white">{organization?.phone || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[#577B92] dark:text-gray-400 font-medium mb-2">{t('address')}</h4>
                    <div className="flex items-start space-x-2">
                      <MapPin size={16} className="text-[#577B92] dark:text-gray-400 mt-1" />
                      <p className="text-[#1E4D3A] dark:text-white">{organization?.address || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[#577B92] dark:text-gray-400 font-medium mb-2">Website</h4>
                    <p className="text-[#1E4D3A] dark:text-white">{organization?.website || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-[#577B92] dark:text-gray-400 font-medium mb-2">Last Updated</h4>
                    <p className="text-[#1E4D3A] dark:text-white">
                      {organization?.updated_at ? new Date(organization.updated_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Organization Dialog - Full Height with Scroll */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">Edit Organization Profile</h3>
                <button
                  onClick={() => {
                    setShowEditDialog(false);
                    setError('');
                    setPreviewLogo(organization?.logo || null);
                  }}
                  className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              {error && (
                <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Organization Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E86F2C] transition-colors overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {previewLogo ? (
                        <img src={previewLogo} alt="Organization logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building size={24} className="text-gray-400 dark:text-gray-500" />
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
                      {previewLogo ? 'Click to change logo' : 'Upload organization logo'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="https://"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <textarea
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => {
                    setShowEditDialog(false);
                    setError('');
                    setPreviewLogo(organization?.logo || null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveChanges}
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
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;