import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface InstructionsProps {
  isDarkMode: boolean;
  showInstructions: boolean;
  onClose: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({
  isDarkMode,
  showInstructions,
  onClose,
}) => {
  const { t } = useLanguage();

  if (!showInstructions) return null;

  return (
    <div
      className={`p-3 rounded-t-lg border-b flex justify-between items-center ${
        isDarkMode
          ? 'bg-gray-700 text-blue-300 border-gray-600'
          : 'bg-blue-50 text-blue-600 border-gray-200'
      }`}
    >
      <p className="text-sm">{t('editor_instruction')}</p>
      <button
        onClick={onClose}
        className={`p-1 rounded hover:bg-opacity-20 ${
          isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-blue-200'
        }`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Instructions;