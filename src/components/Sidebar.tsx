import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart2, Folder, Building, Users, User, LogOut,
  Moon, Sun, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeItem: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem }) => {
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <div className="w-64 bg-[#1E4D3A] dark:bg-gray-900 flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-[#F5F5F2] text-2xl font-semibold tracking-tight font-mukta">LiQid</h1>
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleDarkMode}
            className="p-1.5 text-[#577B92] hover:text-[#F5F5F2] transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-[#577B92] hover:text-[#F5F5F2] transition-colors relative"
          >
            <Bell size={18} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#E86F2C] rounded-full"></span>
          </button>
        </div>
      </div>
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className={`flex items-center px-4 py-3 rounded-lg ${
              activeItem === 'dashboard'
                ? 'text-white bg-[#577B92]/20 dark:bg-gray-800'
                : 'text-[#577B92] dark:text-gray-400 hover:bg-[#577B92]/10 dark:hover:bg-gray-800'
            }`}
          >
            <BarChart2 size={18} className="mr-3" />
            <span>{t('dashboard.title')}</span>
          </Link>
          <Link
            to="/projects"
            className={`flex items-center px-4 py-3 rounded-lg ${
              activeItem === 'projects'
                ? 'text-white bg-[#577B92]/20 dark:bg-gray-800'
                : 'text-[#577B92] dark:text-gray-400 hover:bg-[#577B92]/10 dark:hover:bg-gray-800'
            }`}
          >
            <Folder size={18} className="mr-3" />
            <span>{t('dashboard.navigation.projects')}</span>
          </Link>
          <Link
            to="/admin"
            className={`flex items-center px-4 py-3 rounded-lg ${
              activeItem === 'company'
                ? 'text-white bg-[#577B92]/20 dark:bg-gray-800'
                : 'text-[#577B92] dark:text-gray-400 hover:bg-[#577B92]/10 dark:hover:bg-gray-800'
            }`}
          >
            <Building size={18} className="mr-3" />
            <span>Organization</span>
          </Link>
          <Link
            to="/team"
            className={`flex items-center px-4 py-3 rounded-lg ${
              activeItem === 'team'
                ? 'text-white bg-[#577B92]/20 dark:bg-gray-800'
                : 'text-[#577B92] dark:text-gray-400 hover:bg-[#577B92]/10 dark:hover:bg-gray-800'
            }`}
          >
            <Users size={18} className="mr-3" />
            <span>{t('dashboard.navigation.team')}</span>
          </Link>
          <Link
            to="/profile"
            className={`flex items-center px-4 py-3 rounded-lg ${
              activeItem === 'profile'
                ? 'text-white bg-[#577B92]/20 dark:bg-gray-800'
                : 'text-[#577B92] dark:text-gray-400 hover:bg-[#577B92]/10 dark:hover:bg-gray-800'
            }`}
          >
            <User size={18} className="mr-3" />
            <span>{t('dashboard.navigation.profile')}</span>
          </Link>
        </div>
      </nav>
      <div className="p-4 border-t border-[#577B92]/20 dark:border-gray-700">
        <div className="flex items-center p-2">
          <img
            src={user?.profileImage || "https://i.pravatar.cc/150?img=32"}
            alt="User"
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3">
            <p className="text-sm font-medium text-white">
              {user?.firstName || user?.email || 'User'}
            </p>
            <p className="text-xs text-[#577B92] dark:text-gray-400">Premium Plan</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="ml-auto text-[#577B92] dark:text-gray-400 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
      
      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute left-64 top-16 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Notifications</h3>
            <button className="text-xs text-[#E86F2C] hover:underline">Mark all as read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-start">
                <div className="w-2 h-2 mt-1.5 bg-[#E86F2C] rounded-full mr-2"></div>
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">John commented on your script</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 hours ago</p>
                </div>
              </div>
            </div>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-start">
                <div className="w-2 h-2 mt-1.5 bg-[#E86F2C] rounded-full mr-2"></div>
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">Emma invited you to collaborate</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Yesterday</p>
                </div>
              </div>
            </div>
            <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-start">
                <div className="w-2 h-2 mt-1.5 bg-transparent rounded-full mr-2"></div>
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">Your script was exported successfully</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
            <button className="text-sm text-[#E86F2C] hover:underline">View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;