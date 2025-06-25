import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown } from 'lucide-react';

interface LandingPageProps {
  onEnter?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', flag: '🇺🇸', label: 'English' },
    { code: 'th', flag: '🇹🇭', label: 'ไทย' },
    { code: 'zh', flag: '🇨🇳', label: '中文' }
  ];

  const navItems = [
    { key: 'about', label: t('landing.about') },
    { key: 'features', label: t('landing.features') },
    { key: 'pricing', label: t('landing.pricing') }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const getTitleFontFamily = () => {
    switch (i18n.language) {
      case 'th':
        return 'Kanit';
      case 'zh':
        return 'Noto Sans SC';
      default:
        return 'Mukta Mahee';
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex relative">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.6)' }}
      >
        <source src="https://firebasestorage.googleapis.com/v0/b/tfda-member-list.firebasestorage.app/o/site%20files%2FLiQid%20Cat%20Nap.mp4?alt=media&token=e2130af9-95fa-4587-bfbd-406a72ad56b6" type="video/mp4" />
      </video>

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 px-4 sm:px-[4%] py-3 sm:py-6 z-50 flex justify-between items-center">
        {/* Navigation Menu */}
        <nav className="hidden sm:block">
          <ul className="flex space-x-4 md:space-x-8">
            {navItems.map((item) => (
              <li key={item.key}>
                <button 
                  className="text-base md:text-lg nav-text-gradient hover:opacity-80 transition-opacity duration-200"
                  style={{ 
                    fontFamily: 'Mukta Mahee', 
                    fontWeight: 200
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Logo for mobile */}
        <div className="sm:hidden text-2xl font-bold text-[#F5F5F2]">
          {t('landing.app_title')}
        </div>

        {/* Language Switcher */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 p-1.5 rounded-lg transition-all duration-200 hover:bg-white/10"
          >
            <span className="text-xl">{currentLanguage.flag}</span>
            <ChevronDown 
              size={18} 
              className={`text-[#F5F5F2] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors duration-200
                    ${i18n.language === lang.code 
                      ? 'bg-gray-50 text-[#1E4D3A]' 
                      : 'text-[#577B92]'}`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center sm:justify-end px-6 sm:pr-[10%] z-10">
        <div className="text-center sm:text-right max-w-2xl">
          <h1 
            className="text-[18vw] sm:text-[15vw] md:text-[8vw] lg:text-[7vw] leading-none font-extrabold tracking-tight text-[#F5F5F2] z-20"
            style={{ 
              fontFamily: getTitleFontFamily(),
              textShadow: '0px 0px 10px rgba(0,0,0,0.3)'
            }}
          >
            {t('landing.app_title')}
          </h1>
          <div className="mt-4 sm:mt-6 lg:mt-8 mb-6 sm:mb-8 lg:mb-12">
            <p className="text-[#F5F5F2] text-sm sm:text-base lg:text-lg opacity-80 leading-relaxed max-w-xl ml-auto">
              <span className="block mb-2">{t('landing.hero_subtitle_1', 'LiQid is a scriptwriting and pre-production tool,')}</span>
              <span className="block mb-2">{t('landing.hero_subtitle_2', 'designed for seamless collaboration')}</span>
              <span className="block">{t('landing.hero_subtitle_3', 'and professional screenplay management.')}</span>
            </p>
          </div>
          <button
            onClick={handleGetStarted}
            className="px-6 sm:px-8 md:px-12 py-2 sm:py-3 md:py-4 text-[#F5F5F2] rounded-full text-base sm:text-lg md:text-xl font-['Noto_Sans_Thai'] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 button-gradient-animation"
          >
            {t('landing.get_started')}
          </button>
        </div>
      </div>

      {/* Studio Commuan Branding and Copyright */}
      <div className="fixed bottom-4 sm:bottom-8 z-50 w-full px-4 sm:px-[10%]">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end space-y-2 sm:space-y-0">
          {/* Studio Commuan */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/tfda-member-list.firebasestorage.app/o/site%20files%2FCommuan_LOGO.png?alt=media&token=84b28ff9-0231-4273-b6e2-390cf6f390c5"
              alt="Studio Commuan"
              className="w-10 h-10 sm:w-16 sm:h-16 object-contain"
              style={{
                animation: 'logoFade 10s ease-in-out infinite'
              }}
            />
            <p className="text-xs sm:text-sm text-left text-[#F5F5F2] max-w-[200px] sm:max-w-[400px] opacity-80">
              {t('landing.studio_description')}
            </p>
          </div>

          {/* Copyright */}
          <p className="text-xs sm:text-sm text-[#F5F5F2] opacity-60">
            {t('landing.copyright')}
          </p>
        </div>
      </div>

      <style>
        {`
          @keyframes logoFade {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }

          .nav-text-gradient {
            background: linear-gradient(
              90deg,
              #E86F2C 0%,
              #c7b81a 33%,
              #E86F2C 66%,
              #c7b81a 100%
            );
            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: navTextGradient 15s linear infinite;
          }

          @keyframes navTextGradient {
            0% { background-position: 0% 50% }
            100% { background-position: 300% 50% }
          }
        `}
      </style>
    </div>
  );
}

export default LandingPage;