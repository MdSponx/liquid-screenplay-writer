import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, FileText, Folder, Building, Users, Mail, Phone, MapPin, Calendar,
  Upload, X, Camera, Plus, Check, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';

interface UserProfile {
  firstName: string;
  lastName: string;
  nickname?: string;
  occupation: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  birthDate?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Organization {
  id: string;
  name: string;
  role: string;
  initials: string;
  isPrimary: boolean;
  logo?: string;
  description?: string;
  address?: string;
}

const ProfileOverview: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    role: 'Member',
    description: '',
    address: '',
    logo: '',
    logoFile: null
  });
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState('');

  const fetchOrganizations = async () => {
    if (!user?.id) return;

    try {
      const q = query(collection(db, 'organizations'), where('created_by', '==', user.id));
      const querySnapshot = await getDocs(q);
      const orgs: Organization[] = [];
      querySnapshot.forEach((doc) => {
        orgs.push({ id: doc.id, ...doc.data() } as Organization);
      });
      setOrganizations(orgs);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const docRef = doc(db, 'users', user.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfileData(docSnap.data() as UserProfile);
        }

        await fetchOrganizations();
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const stats = [
    { title: 'Active Projects', value: 12, icon: <Folder size={18} className="text-[#E86F2C]" /> },
    { title: 'Scripts', value: 24, icon: <FileText size={18} className="text-[#E86F2C]" /> },
    { title: 'Collaborators', value: 47, icon: <Users size={18} className="text-[#E86F2C]" /> }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getOccupationLabel = (occupation: string) => {
    const labels: Record<string, string> = {
      screenwriter: 'Screenwriter',
      director: 'Director',
      producer: 'Producer',
      assistant_director: 'Assistant Director',
      cinematographer: 'Cinematographer',
      crew: 'Crew',
      film_student: 'Film Student',
      institute: 'Institute'
    };
    return labels[occupation] || occupation;
  };

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

    setNewOrganization(prev => ({ ...prev, logoFile: file }));
  };

  const handleCreateOrganization = async () => {
    if (!user?.id || !newOrganization.name.trim()) return;
    
    try {
      setIsSubmitting(true);
      setError('');

      let logoUrl = '';
      if (newOrganization.logoFile) {
        const storageRef = ref(storage, `organization-logos/${user.id}/${Date.now()}-${newOrganization.logoFile.name}`);
        await uploadBytes(storageRef, newOrganization.logoFile);
        logoUrl = await getDownloadURL(storageRef);
      }

      const orgData = {
        name: newOrganization.name,
        role: newOrganization.role,
        initials: newOrganization.name.split(' ').map(word => word[0]).join('').toUpperCase(),
        description: newOrganization.description,
        address: newOrganization.address,
        logo: logoUrl,
        created_by: user.id,
        created_at: new Date().toISOString(),
        isPrimary: organizations.length === 0
      };

      const docRef = await addDoc(collection(db, 'organizations'), orgData);

      await fetchOrganizations();

      setNewOrganization({ 
        name: '', 
        role: 'Member', 
        description: '', 
        address: '', 
        logo: '',
        logoFile: null 
      });
      setPreviewLogo(null);
      setShowCreateDialog(false);

    } catch (err) {
      console.error('Error creating organization:', err);
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92] dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="profile" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Profile Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center">
              <img 
                src={user?.profileImage || "https://i.pravatar.cc/150?img=32"} 
                alt="Profile" 
                className="w-20 h-20 rounded-full border-4 border-[#577B92]"
              />
              <div className="ml-6">
                <h2 className="text-[#1E4D3A] dark:text-white text-2xl font-semibold">
                  {profileData?.firstName} {profileData?.lastName}
                  {profileData?.nickname && (
                    <span className="text-[#577B92] dark:text-gray-400 text-lg ml-2">
                      ({profileData.nickname})
                    </span>
                  )}
                </h2>
                <p className="text-[#577B92] dark:text-gray-300">
                  {getOccupationLabel(profileData?.occupation || 'screenwriter')}
                </p>
                {profileData?.bio && (
                  <p className="text-[#577B92] dark:text-gray-400 mt-2 text-sm max-w-xl">
                    {profileData.bio}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={() => navigate('/profile/edit')}
              className="bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Edit Profile
            </button>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 shadow-sm p-6 rounded-xl border border-[#577B92]/10 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[#1E4D3A] dark:text-gray-200">{stat.title}</h3>
                  {stat.icon}
                </div>
                <p className="text-3xl text-[#1E4D3A] dark:text-white font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Account Details */}
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl p-8 mb-8 border border-[#577B92]/10 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl text-[#1E4D3A] dark:text-white font-semibold">Account Details</h3>
              <button 
                onClick={() => navigate('/profile/account')}
                className="px-4 py-1.5 rounded-lg bg-[#E86F2C]/10 text-[#E86F2C] hover:bg-[#E86F2C]/20 transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start">
                <Mail className="mt-0.5 mr-3 text-[#577B92] dark:text-gray-400" size={18} />
                <div>
                  <p className="text-[#577B92] dark:text-gray-400 mb-1">Email</p>
                  <p className="text-[#1E4D3A] dark:text-white">{profileData?.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="mt-0.5 mr-3 text-[#577B92] dark:text-gray-400" size={18} />
                <div>
                  <p className="text-[#577B92] dark:text-gray-400 mb-1">Phone</p>
                  <p className="text-[#1E4D3A] dark:text-white">
                    {profileData?.phone || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="mt-0.5 mr-3 text-[#577B92] dark:text-gray-400" size={18} />
                <div>
                  <p className="text-[#577B92] dark:text-gray-400 mb-1">Location</p>
                  <p className="text-[#1E4D3A] dark:text-white">
                    {profileData?.location || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar className="mt-0.5 mr-3 text-[#577B92] dark:text-gray-400" size={18} />
                <div>
                  <p className="text-[#577B92] dark:text-gray-400 mb-1">Member Since</p>
                  <p className="text-[#1E4D3A] dark:text-white">
                    {profileData?.createdAt ? formatDate(profileData.createdAt) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Affiliations */}
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl p-8 border border-[#577B92]/10 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl text-[#1E4D3A] dark:text-white font-semibold">Organization Affiliations</h3>
              <button 
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-1.5 rounded-lg bg-[#E86F2C]/10 text-[#E86F2C] hover:bg-[#E86F2C]/20 transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="space-y-4">
              {organizations.length > 0 ? (
                organizations.map(org => (
                  <div 
                    key={org.id}
                    className="flex items-center justify-between p-4 bg-[#F5F5F2] dark:bg-gray-800 rounded-lg border border-[#577B92]/10 dark:border-gray-700"
                  >
                    <div className="flex items-center">
                      {org.logo ? (
                        <img 
                          src={org.logo} 
                          alt={org.name} 
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#577B92] rounded-lg flex items-center justify-center text-[#F5F5F2]">
                          {org.initials}
                        </div>
                      )}
                      <div className="ml-4">
                        <p className="text-[#1E4D3A] dark:text-white">{org.name}</p>
                        <p className="text-[#577B92] dark:text-gray-400 text-sm">{org.role}</p>
                      </div>
                    </div>
                    {org.isPrimary ? (
                      <span className="px-3 py-1 bg-[#E86F2C]/20 text-[#E86F2C] rounded-full text-sm">Primary</span>
                    ) : (
                      <span className="px-3 py-1 bg-[#577B92]/10 text-[#577B92] dark:text-gray-300 rounded-full text-sm">Active</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-[#F5F5F2] dark:bg-gray-800 rounded-lg border border-dashed border-[#577B92]/50 dark:border-gray-600">
                  <Building size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-3" />
                  <h4 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-2">No Organizations</h4>
                  <p className="text-[#577B92] dark:text-gray-400 text-sm max-w-sm mx-auto">
                    You haven't joined any organizations yet. Create or join an organization to collaborate with others.
                  </p>
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center"
                  >
                    <Plus size={18} className="mr-2" />
                    Create Organization
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Organization Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">Create New Organization</h3>
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setPreviewLogo(null);
                    setNewOrganization({ 
                      name: '', 
                      role: 'Member', 
                      description: '', 
                      address: '', 
                      logo: '',
                      logoFile: null 
                    });
                    setError('');
                  }}
                  className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-start">
                  <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={newOrganization.name}
                    onChange={(e) => setNewOrganization({...newOrganization, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Enter organization name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Organization Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E86F2C] transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {previewLogo ? (
                        <img src={previewLogo} alt="Organization logo" className="w-full h-full object-cover rounded-lg" />
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
                      {previewLogo ? 'Click to change logo' : 'Upload organization logo (optional)'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newOrganization.description}
                    onChange={(e) => setNewOrganization({...newOrganization, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Brief description of the organization"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newOrganization.address}
                    onChange={(e) => setNewOrganization({...newOrganization, address: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Organization address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Your Role
                  </label>
                  <select
                    value={newOrganization.role}
                    onChange={(e) => setNewOrganization({...newOrganization, role: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Manager</option>
                    <option value="Producer">Producer</option>
                    <option value="Writer">Writer</option>
                    <option value="Member">Member</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowCreateDialog(false);
                  setPreviewLogo(null);
                  setNewOrganization({ 
                    name: '', 
                    role: 'Member', 
                    description: '', 
                    address: '', 
                    logo: '',
                    logoFile: null 
                  });
                  setError('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateOrganization}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center"
                disabled={!newOrganization.name.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileOverview;