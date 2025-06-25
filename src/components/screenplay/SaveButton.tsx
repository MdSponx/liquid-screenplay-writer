import React from 'react';
import { Save } from 'lucide-react';

interface SaveButtonProps {
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  className?: string;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  onSave,
  isSaving,
  hasChanges,
  className = ''
}) => {
  // For use in the ScreenplayNavigator
  const isNavigatorButton = className === '';
  
  if (isNavigatorButton) {
    return (
      <button
        onClick={onSave}
        disabled={isSaving || !hasChanges}
        className={`p-2 rounded-lg transition-colors duration-200 relative
          ${
            hasChanges
              ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
              : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
          }
          ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Save document"
      >
        {isSaving ? (
          <div className="w-[18px] h-[18px] border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save size={18} />
        )}
        {hasChanges && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#E86F2C] rounded-full" />
        )}
      </button>
    );
  }
  
  // For use as a floating button elsewhere
  return (
    <button
      onClick={onSave}
      disabled={isSaving || !hasChanges}
      className={`fixed bottom-8 right-8 p-4 rounded-full shadow-lg transition-all duration-200 ${
        hasChanges
          ? 'bg-[#E86F2C] hover:bg-[#E86F2C]/90 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
      } ${className}`}
    >
      {isSaving ? (
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <Save size={24} />
      )}
    </button>
  );
};

export default SaveButton;