import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { UniqueSceneHeadingDocument } from '../types';

interface SceneTypeSuggestionsProps {
  blockId: string;
  onSelect: (type: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
  projectUniqueSceneHeadings?: UniqueSceneHeadingDocument[];
}

const SceneTypeSuggestions: React.FC<SceneTypeSuggestionsProps> = ({
  blockId,
  onSelect,
  position,
  onClose,
  projectUniqueSceneHeadings = [],
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  // Default suggestions
  const defaultSuggestions = [
    { label: 'INT. ', description: t('interior_scene') },
    { label: 'EXT. ', description: t('exterior_scene') },
    { label: 'INT./EXT. ', description: t('interior_exterior_scene') },
    { label: 'EXT./INT. ', description: t('exterior_interior_scene') },
  ];

  // Combine default suggestions with project-specific ones
  const suggestions = [...defaultSuggestions];
  
  // Add unique scene headings from the project if they exist
  if (projectUniqueSceneHeadings && projectUniqueSceneHeadings.length > 0) {
    // Sort by usage count (descending)
    const sortedSceneHeadings = [...projectUniqueSceneHeadings]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Limit to top 5
    
    // Add to suggestions with a separator
    if (sortedSceneHeadings.length > 0) {
      suggestions.push({ label: '---', description: 'Recently used scene headings' });
      
      sortedSceneHeadings.forEach(heading => {
        suggestions.push({
          label: heading.text,
          description: `Used ${heading.count} ${heading.count === 1 ? 'time' : 'times'}`
        });
      });
    }
  }

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
        if (suggestions[selectedIndex].label !== '---') {
          onSelect(suggestions[selectedIndex].label);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect, selectedIndex, suggestions]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="scene-type-suggestions fixed z-[9999] min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {suggestions.map((suggestion, index) => (
        suggestion.label === '---' ? (
          <div 
            key={`separator-${index}`}
            className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
          >
            {suggestion.description}
          </div>
        ) : (
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
        )
      ))}
    </div>
  );
};

export default SceneTypeSuggestions;