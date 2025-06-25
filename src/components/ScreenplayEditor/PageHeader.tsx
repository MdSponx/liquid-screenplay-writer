import React, { useEffect, useRef } from 'react';
import { Edit2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PageHeaderProps {
  isDarkMode: boolean;
  header: {
    title: string;
    author: string;
    contact: string;
  };
  pageNumber: number;
  editingHeader: boolean;
  onHeaderChange: (value: string) => void;
  onEditingHeaderChange: (editing: boolean) => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  isDarkMode,
  header,
  pageNumber,
  editingHeader,
  onHeaderChange,
  onEditingHeaderChange,
}) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingHeader && inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [editingHeader]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      onEditingHeaderChange(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!editingHeader) {
      e.preventDefault();
      e.stopPropagation();
      onEditingHeaderChange(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!headerRef.current?.contains(e.relatedTarget as Node)) {
      onEditingHeaderChange(false);
    }
  };

  return (
    <div
      ref={headerRef}
      className={`sticky top-0 z-50 h-[15mm] border-b select-none
        ${isDarkMode ? 'border-primary-800 bg-primary-950/95' : 'border-gray-200 bg-white/95'}
        backdrop-blur-sm`}
    >
      <div
        className={`absolute inset-0 flex items-center px-8 cursor-text
          ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
          ${editingHeader 
            ? (isDarkMode ? 'bg-primary-900/30' : 'bg-accent-50/30') 
            : 'hover:bg-gray-50/50 dark:hover:bg-primary-900/30'
          }`}
        onClick={handleClick}
      >
        <div className="flex-1 relative">
          {editingHeader ? (
            <input
              ref={inputRef}
              type="text"
              value={header.title}
              onChange={(e) => onHeaderChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-full bg-transparent outline-none font-mono text-sm transition-colors duration-200 py-1 px-0
                ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}
                focus:ring-0 focus:ring-offset-0`}
              placeholder={t('click_to_edit_header')}
            />
          ) : (
            <div className="flex items-center justify-between w-full group py-1">
              <span className="min-h-[1.5rem] font-mono text-sm">
                {header.title || t('click_to_edit_header')}
              </span>
              <Edit2 
                size={14} 
                className={`absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              />
            </div>
          )}
        </div>
      </div>
      <div
        className={`absolute right-8 top-1/2 -translate-y-1/2 text-sm font-mono
          ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
      >
        {pageNumber}
      </div>
    </div>
  );
};

export default PageHeader;