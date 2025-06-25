import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Block } from '../../types';
import { BLOCK_TYPES } from '../../constants/editorConstants';

interface FormatButtonsProps {
  isDarkMode: boolean;
  activeBlock: string | null;
  onFormatChange: (type: string) => void;
  blocks: Block[];
  className?: string;
}

const FormatButtons: React.FC<FormatButtonsProps> = ({
  isDarkMode,
  activeBlock,
  onFormatChange,
  blocks,
  className = '',
}) => {
  const { t } = useLanguage();
  const formats = [
    { type: 'scene-heading', emoji: '🎬' },
    { type: 'action', emoji: '🎭' },
    { type: 'character', emoji: '👤' },
    { type: 'parenthetical', emoji: '💭' },
    { type: 'dialogue', emoji: '💬' },
    { type: 'transition', emoji: '🔄' },
    { type: 'text', emoji: '📝' },
    { type: 'shot', emoji: '🎥' },
  ];

  const handleFormatClick = (type: string) => {
    if (!activeBlock) {
      // If no active block, do nothing
      return;
    }
    
    // Apply the format change
    onFormatChange(type);
  };

  return (
    <>
      <div className="h-24" />
      
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 ${className}`}>
        <div 
          className={`rounded-full shadow-lg px-4 py-2 border backdrop-blur-sm
            ${isDarkMode 
              ? 'bg-[#1E4D3A]/90 border-primary-800' 
              : 'bg-white/90 border-gray-200'
            }`}
        >
          <div className="flex items-center space-x-2">
            {formats.map(({ type, emoji }) => {
              const isActiveType =
                activeBlock && blocks.find((b) => b.id === activeBlock)?.type === type;
              return (
                <button
                  key={type}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors duration-200 flex items-center space-x-1.5 ${
                    isActiveType
                      ? 'bg-accent-500 text-white border-accent-600'
                      : isDarkMode
                      ? 'bg-[#1E4D3A] text-[#F5F5F2] border-primary-800 hover:bg-primary-800'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleFormatClick(type)}
                  aria-label={`Format as ${t(type)}`}
                  title={`Format as ${t(type)}`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span>{t(type)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default FormatButtons;