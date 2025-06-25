import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ShotTypeSuggestionsProps {
  blockId: string;
  onSelect: (type: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

const ShotTypeSuggestions: React.FC<ShotTypeSuggestionsProps> = ({
  blockId,
  onSelect,
  position,
  onClose,
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { label: 'WIDE SHOT - ', description: t('wide_shot_desc') },
    { label: 'CLOSE UP - ', description: t('close_up_desc') },
    { label: 'MEDIUM SHOT - ', description: t('medium_shot_desc') },
    { label: 'TRACKING SHOT - ', description: t('tracking_shot_desc') },
    { label: 'POV SHOT - ', description: t('pov_shot_desc') },
    { label: 'AERIAL SHOT - ', description: t('aerial_shot_desc') },
    { label: 'DOLLY SHOT - ', description: t('dolly_shot_desc') },
    { label: 'ESTABLISHING SHOT - ', description: t('establishing_shot_desc') },
    { label: 'EXTREME CLOSE UP - ', description: t('extreme_close_up_desc') },
    { label: 'CRANE SHOT - ', description: t('crane_shot_desc') },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(suggestions[selectedIndex].label);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect, selectedIndex, suggestions]);

  return (
    <div
      ref={popupRef}
      className="shot-type-suggestions fixed z-[9999] min-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.label}
          className={`w-full px-4 py-2 text-left flex flex-col hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
            ${selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
          onClick={() => onSelect(suggestion.label)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
            {suggestion.label}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {suggestion.description}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ShotTypeSuggestions;