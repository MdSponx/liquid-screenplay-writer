import React from 'react';
import { Edit2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PageFooterProps {
  isDarkMode: boolean;
  footer: string;
  editingFooter: boolean;
  onFooterChange: (value: string) => void;
  onEditingFooterChange: (editing: boolean) => void;
}

const PageFooter: React.FC<PageFooterProps> = ({
  isDarkMode,
  footer,
  editingFooter,
  onFooterChange,
  onEditingFooterChange,
}) => {
  const { t } = useLanguage();

  return (
    <div
      className={`sticky bottom-0 h-[10mm] border-t ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`absolute inset-x-0 h-full flex items-center px-8 cursor-text 
          ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
          ${editingFooter 
            ? (isDarkMode ? 'bg-gray-700/50' : 'bg-blue-50/50') 
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
          }`}
        onClick={() => !editingFooter && onEditingFooterChange(true)}
      >
        {editingFooter ? (
          <input
            type="text"
            value={footer}
            onChange={(e) => onFooterChange(e.target.value)}
            onBlur={() => onEditingFooterChange(false)}
            onKeyDown={(e) => e.key === 'Enter' && onEditingFooterChange(false)}
            className={`w-full bg-transparent outline-none font-mono text-sm transition-colors duration-200
              ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}
              focus:ring-0 focus:ring-offset-0`}
            placeholder={t('click_to_edit_footer')}
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between w-full group">
            <span className="min-h-[1.5rem] font-mono text-sm">
              {footer || t('click_to_edit_footer')}
            </span>
            <Edit2 
              size={14} 
              className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200
                ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PageFooter;