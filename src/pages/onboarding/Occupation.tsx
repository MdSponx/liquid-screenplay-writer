import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

type Occupation = 'screenwriter' | 'director' | 'producer' | 'assistant_director' | 'cinematographer' | 'crew';

const Occupation: React.FC = () => {
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { updateUserProfile } = useAuth();

  const occupations = [
    { id: 'screenwriter', label: t('screenwriter'), icon: '✍️' },
    { id: 'director', label: t('director'), icon: '🎬' },
    { id: 'producer', label: t('producer'), icon: '💼' },
    { id: 'assistant_director', label: t('assistant_director'), icon: '📋' },
    { id: 'cinematographer', label: t('cinematographer'), icon: '🎥' },
    { id: 'crew', label: t('crew'), icon: '🎭' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupation) return;
    
    setLoading(true);

    try {
      await updateUserProfile({
        occupation,
      });
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      console.error('Failed to save occupation:', err);
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
              <h2 className="text-2xl font-semibold text-[#1E4D3A]">{t('your_occupation')}</h2>
              <div className="flex items-center">
                <div className="w-8 h-1 bg-[#E86F2C] rounded-full mr-1"></div>
                <div className="w-8 h-1 bg-[#E86F2C] rounded-full"></div>
              </div>
            </div>
            <p className="text-[#577B92] mb-6">{t('select_your_role')}</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                {occupations.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                      occupation === item.id
                        ? 'border-[#E86F2C] bg-[#E86F2C]/10'
                        : 'border-gray-200 hover:border-[#E86F2C]/50'
                    }`}
                    onClick={() => setOccupation(item.id as Occupation)}
                  >
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="text-center">
                      <input
                        type="radio"
                        id={item.id}
                        name="occupation"
                        value={item.id}
                        checked={occupation === item.id}
                        onChange={() => setOccupation(item.id as Occupation)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={item.id}
                        className={`text-sm font-medium ${
                          occupation === item.id ? 'text-[#1E4D3A]' : 'text-[#577B92]'
                        }`}
                      >
                        {item.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/onboarding/personal-info')}
                  className="flex items-center justify-center px-6 py-3 rounded-full border border-gray-300 text-[#577B92] hover:bg-gray-50 relative z-10"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={!occupation || loading}
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity shadow-md flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    t('complete')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 right-0 py-6 px-8">
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

export default Occupation;