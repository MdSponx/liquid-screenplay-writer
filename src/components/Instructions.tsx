import React, { useState, useEffect } from 'react';
import { Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import EnterBehaviorDialog from './EnterBehaviorDialog';

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
  const [showEnterDialog, setShowEnterDialog] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const tips = [
    { emoji: '⌨️', text: t('tip_tab_format') },
    { 
      emoji: '↵', 
      text: t('tip_enter_newline'),
      onClick: () => setShowEnterDialog(true)
    },
    { emoji: '✨', text: t('tip_scene_heading') },
    { emoji: '⌘', text: t('tip_shortcuts') },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const handlePrevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  };

  if (!showInstructions) return null;

  return (
    <>
      <div className="p-4 border-b border-[#577B92]/20">
        <div className="flex justify-between items-center">
          <div className="flex-1 relative h-8">
            {tips.map((tip, index) => (
              <div
                key={index}
                onClick={tip.onClick}
                className={`absolute inset-0 flex items-center transition-all duration-500 transform
                  ${currentTipIndex === index 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4 pointer-events-none'
                  }
                `}
              >
                <div
                  className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm 
                    ${isDarkMode 
                      ? 'text-[#F5F5F2] hover:bg-[#577B92]/20' 
                      : 'text-[#1E4D3A] hover:bg-[#577B92]/10'}
                    ${tip.onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
                  `}
                >
                  <span className="text-base">{tip.emoji}</span>
                  <span>{tip.text}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevTip}
              className={`p-1.5 rounded-full hover:bg-opacity-20 ${
                isDarkMode ? 'hover:bg-[#577B92]/20' : 'hover:bg-[#577B92]/10'
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextTip}
              className={`p-1.5 rounded-full hover:bg-opacity-20 ${
                isDarkMode ? 'hover:bg-[#577B92]/20' : 'hover:bg-[#577B92]/10'
              }`}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full hover:bg-opacity-20 ${
                isDarkMode ? 'hover:bg-[#577B92]/20' : 'hover:bg-[#577B92]/10'
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {showEnterDialog && (
        <EnterBehaviorDialog
          isDarkMode={isDarkMode}
          onClose={() => setShowEnterDialog(false)}
        />
      )}
    </>
  );
};

export default Instructions;