import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Globe, Shield, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Sidebar from '../../components/Sidebar';

interface AccountSettings {
  emailNotifications: boolean;
  projectUpdates: boolean;
  teamMessages: boolean;
  marketingEmails: boolean;
  language: string;
  region: string;
  profileVisibility: 'public' | 'connections' | 'private';
  showActivity: boolean;
  allowTagging: boolean;
}

const AccountSettings: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<AccountSettings>({
    emailNotifications: true,
    projectUpdates: true,
    teamMessages: true,
    marketingEmails: false,
    language: 'en',
    region: 'us',
    profileVisibility: 'public',
    showActivity: true,
    allowTagging: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;

      try {
        const docRef = doc(db, 'account_settings', user.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AccountSettings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again later.');
      }
    };

    fetchSettings();
  }, [user?.id]);

  const handleToggle = async (setting: keyof AccountSettings) => {
    if (!user?.id || loading) return;

    try {
      setLoading(true);
      setSaveStatus('saving');

      const newSettings = {
        ...settings,
        [setting]: !settings[setting]
      };

      const docRef = doc(db, 'account_settings', user.id);
      await setDoc(docRef, newSettings, { merge: true });

      setSettings(newSettings);
      setSaveStatus('saved');

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = async (name: keyof AccountSettings, value: string) => {
    if (!user?.id || loading) return;

    try {
      setLoading(true);
      setSaveStatus('saving');

      const newSettings = {
        ...settings,
        [name]: value
      };

      const docRef = doc(db, 'account_settings', user.id);
      await setDoc(docRef, newSettings, { merge: true });

      setSettings(newSettings);
      setSaveStatus('saved');

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="profile" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/profile')}
                className="mr-4 p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={20} className="text-[#1E4D3A] dark:text-white" />
              </button>
              <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Account Settings</h1>
            </div>
            {saveStatus === 'saving' && (
              <span className="text-[#577B92] dark:text-gray-400">Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-green-600 dark:text-green-400">Changes saved</span>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {/* Email & Notifications */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4 flex items-center">
                <Bell size={18} className="mr-2" />
                Email & Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-[#1E4D3A] dark:text-white font-medium">Email Notifications</h3>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">Receive notifications via email</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('emailNotifications')}
                    className="text-[#E86F2C]"
                    disabled={loading}
                  >
                    {settings.emailNotifications ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-[#1E4D3A] dark:text-white font-medium">Project Updates</h3>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">Get notified about changes to your projects</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('projectUpdates')}
                    className="text-[#E86F2C]"
                    disabled={loading}
                  >
                    {settings.projectUpdates ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-[#1E4D3A] dark:text-white font-medium">Team Messages</h3>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">Receive notifications for team messages</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('teamMessages')}
                    className="text-[#E86F2C]"
                    disabled={loading}
                  >
                    {settings.teamMessages ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-[#1E4D3A] dark:text-white font-medium">Marketing Emails</h3>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">Receive updates about new features and offers</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('marketingEmails')}
                    className="text-[#E86F2C]"
                    disabled={loading}
                  >
                    {settings.marketingEmails ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Language & Region */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4 flex items-center">
                <Globe size={18} className="mr-2" />
                Language & Region
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSelectChange('language', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    disabled={loading}
                  >
                    <option value="en">English</option>
                    <option value="th">Thai</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Region
                  </label>
                  <select
                    value={settings.region}
                    onChange={(e) => handleSelectChange('region', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    disabled={loading}
                  >
                    <option value="us">United States</option>
                    <option value="th">Thailand</option>
                    <option value="cn">China</option>
                    <option value="uk">United Kingdom</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-4 flex items-center">
                <Shield size={18} className="mr-2" />
                Privacy Controls
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Profile Visibility
                  </label>
                  <select
                    value={settings.profileVisibility}
                    onChange={(e) => handleSelectChange('profileVisibility', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    disabled={loading}
                  >
                    <option value="public">Public - Anyone can view your profile</option>
                    <option value="connections">Connections Only - Only people you're connected with</option>
                    <option value="private">Private - Only you can view your profile</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-[#1E4D3A] dark:text-white font-medium">Show Activity</h3>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">Allow others to see your recent activity</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('showActivity')}
                    className="text-[#E86F2C]"
                    disabled={loading}
                  >
                    {settings.showActivity ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-[#1E4D3A] dark:text-white font-medium">Allow Tagging</h3>
                    <p className="text-[#577B92] dark:text-gray-400 text-sm">Allow others to tag you in posts and comments</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('allowTagging')}
                    className="text-[#E86F2C]"
                    disabled={loading}
                  >
                    {settings.allowTagging ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;