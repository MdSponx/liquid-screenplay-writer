import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Camera, ArrowLeft, FileText
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';

const PersonalInfoEditor: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateUserProfile } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    nickname: user?.nickname || '',
    birthDate: '',
    occupation: user?.occupation || 'screenwriter',
    bio: '',
    email: user?.email || '',
    phone: '',
    location: ''
  });

  const occupations = [
    { id: 'screenwriter', emoji: '✍️', label: 'Screenwriter', description: 'Write and develop screenplays' },
    { id: 'director', emoji: '🎬', label: 'Director', description: 'Direct and oversee film production' },
    { id: 'producer', emoji: '💼', label: 'Producer', description: 'Manage film projects and resources' },
    { id: 'assistant_director', emoji: '📋', label: 'Assistant Director', description: 'Support director and coordinate production' },
    { id: 'cinematographer', emoji: '🎥', label: 'Cinematographer', description: 'Manage camera work and lighting' },
    { id: 'crew', emoji: '🎭', label: 'Crew', description: 'Various production crew roles' },
    { id: 'film_student', emoji: '🎓', label: 'Film Student', description: 'Learning and studying filmmaking' },
    { id: 'institute', emoji: '🏫', label: 'Institute', description: 'Teachers and school administrators' }
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;

      try {
        const docRef = doc(db, 'users', user.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData(prev => ({
            ...prev,
            ...data,
            birthDate: data.birthDate || '',
            bio: data.bio || '',
            phone: data.phone || '',
            location: data.location || ''
          }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data. Please try again later.');
      }
    };

    fetchProfileData();
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOccupationChange = (occupationId: string) => {
    setFormData(prev => ({ ...prev, occupation: occupationId }));
  };

  const handleImageUpload = async (file: File) => {
    if (!user?.id) return null;

    try {
      setUploadingImage(true);
      const storageRef = ref(storage, `profile-images/${user.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setImagePreview(downloadURL);
      return downloadURL;
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      try {
        await updateUserProfile({ profileImage: imageUrl });
      } catch (err) {
        console.error('Error updating profile image:', err);
        setError('Failed to update profile image. Please try again.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user?.id) {
      setError('You must be logged in to update your profile');
      setLoading(false);
      return;
    }

    try {
      const profileRef = doc(db, 'users', user.id);
      await setDoc(profileRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await updateUserProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        nickname: formData.nickname,
        occupation: formData.occupation as any,
        birthDate: formData.birthDate,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location
      });

      navigate('/profile');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
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
            <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Edit Personal Information</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Image */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4">Profile Image</h2>
              <div className="flex items-center">
                <div className="relative">
                  <img 
                    src={imagePreview || "https://i.pravatar.cc/150?img=32"} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full border-4 border-[#E86F2C]"
                  />
                  <button 
                    type="button"
                    onClick={handleProfileImageClick}
                    className="absolute bottom-0 right-0 p-2 bg-[#E86F2C] rounded-full text-white hover:bg-[#E86F2C]/90 disabled:opacity-50"
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploadingImage}
                  />
                </div>
                <div className="ml-6">
                  <p className="text-[#1E4D3A] dark:text-white font-medium">Upload a new photo</p>
                  <p className="text-[#577B92] dark:text-gray-400 text-sm mt-1">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4">Professional Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-4">
                    Occupation
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {occupations.map((occupation) => (
                      <div
                        key={occupation.id}
                        onClick={() => handleOccupationChange(occupation.id)}
                        className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          formData.occupation === occupation.id
                            ? 'border-[#E86F2C] bg-[#E86F2C]/10 transform scale-[1.02]'
                            : 'border-gray-200 dark:border-gray-700 hover:border-[#E86F2C]/50 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="text-4xl mb-3">{occupation.emoji}</div>
                        <div className="text-center">
                          <div className={`font-medium mb-1 ${
                            formData.occupation === occupation.id
                              ? 'text-[#E86F2C]'
                              : 'text-[#1E4D3A] dark:text-white'
                          }`}>
                            {occupation.label}
                          </div>
                          <p className="text-sm text-[#577B92] dark:text-gray-400">
                            {occupation.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                      <FileText size={18} className="text-[#577B92] dark:text-gray-400" />
                    </div>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                      placeholder="Tell us about yourself..."
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity shadow-md flex items-center disabled:opacity-50"
              >
                {loading ? (
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoEditor;