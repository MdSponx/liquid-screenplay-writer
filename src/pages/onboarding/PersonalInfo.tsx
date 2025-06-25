import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const PersonalInfo: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { updateUserProfile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update user profile with personal information
      await updateUserProfile({
        firstName,
        lastName,
        nickname,
        // birthDate is not included in the User type, so we don't add it here
      });
      
      // Navigate to the next step in the onboarding process
      navigate('/onboarding/occupation');
    } catch (err) {
      setLoading(false);
      console.error('Failed to save personal information:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E4D3A] to-[#2a6b51] relative">
      <main className="min-h-screen flex items-center justify-center px-4 py-20 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-[#F5F5F2] text-4xl font-semibold tracking-tight font-mukta">LiQid</h1>
          </div>
          <div className="bg-[#F5F5F2] rounded-xl p-8 shadow-lg relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[#1E4D3A]">{t('personal_info')}</h2>
              <div className="flex items-center">
                <div className="w-8 h-1 bg-[#E86F2C] rounded-full mr-1"></div>
                <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
              </div>
            </div>
            <p className="text-[#577B92] mb-6">{t('tell_us_about_yourself')}</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#577B92] mb-1">{t('first_name')}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#1E4D3A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#577B92] mb-1">{t('last_name')}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#1E4D3A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#577B92] mb-1">{t('nickname')}</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#1E4D3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#577B92] mb-1">{t('birth_date')}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#1E4D3A]"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity shadow-md flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    t('next')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 right- 0 right-0 py-6 px-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-[#F5F5F2] opacity-80">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-[#E86F2C]/20 flex items-center justify-center mr-3">
                <User size={16} className="text-[#F5F5F2]" />
              </div>
              <p>{t('developed_by')}</p>
            </div>
            <p>© 2025 LiQid. {t('all_rights_reserved')}</p>
          </div>
        </footer>
      </div>
  );
};

export default PersonalInfo;