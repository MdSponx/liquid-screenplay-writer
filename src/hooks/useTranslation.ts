import { useState, useEffect } from 'react';
import { translations, Language } from '../locales';

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem('language') as Language;
    return savedLang || 'en'; // Default to English
  });

  const t = (key: string) => {
    const parts = key.split('.');
    let value = translations[currentLanguage];
    
    for (const part of parts) {
      if (value?.[part] === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      value = value[part];
    }
    
    return value;
  };

  const changeLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setCurrentLanguage(lang);
  };

  return { t, currentLanguage, changeLanguage };
};