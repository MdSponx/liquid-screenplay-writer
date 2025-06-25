import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ElementDocument } from '../types';

interface ElementSuggestionsProps {
  blockId: string;
  onSelect: (elementName: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
  projectElements: ElementDocument[];
  elementTypeFilter?: 'Prop' | 'Location' | 'Costume' | 'Sound' | 'Visual Effect' | 'Other';
  currentInput?: string;
}

const ElementSuggestions: React.FC<ElementSuggestionsProps> = ({
  blockId,
  onSelect,
  position,
  onClose,
  projectElements,
  elementTypeFilter,
  currentInput = '',
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredElements, setFilteredElements] = useState<ElementDocument[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);

  // Get icon for element type
  const getElementIcon = (type: string): string => {
    switch (type) {
      case 'Prop': return '🧰';
      case 'Location': return '🏠';
      case 'Costume': return '👕';
      case 'Sound': return '🔊';
      case 'Visual Effect': return '✨';
      default: return '📦';
    }
  };

  // Filter elements based on current input and type filter
  useEffect(() => {
    const input = currentInput.trim().toUpperCase();
    let filtered = [...projectElements];
    
    // Apply type filter if specified
    if (elementTypeFilter) {
      filtered = filtered.filter(element => element.type === elementTypeFilter);
    }
    
    // Apply text filter if there's input
    if (input) {
      filtered = filtered.filter(element => 
        element.name.toUpperCase().includes(input)
      );
    }
    
    // Add a "Create new element" option if input doesn't match exactly
    const exactMatch = filtered.some(element => 
      element.name.toUpperCase() === input
    );
    
    if (input && !exactMatch) {
      filtered.push({
        id: 'new',
        name: input,
        type: elementTypeFilter || 'Prop',
        projectId: '',
        screenplayIds: [],
        associatedSceneIds: []
      });
    }
    
    // Sort by frequency of use (if we had that data)
    // For now, just alphabetical
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    setFilteredElements(filtered);
    setSelectedIndex(0);
  }, [currentInput, projectElements, elementTypeFilter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFromActiveBlock = target.getAttribute('data-block-id') === blockId;
      
      // Only handle if this is from the active block
      if (!isFromActiveBlock) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev + 1) % filteredElements.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev - 1 + filteredElements.length) % filteredElements.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (filteredElements.length > 0) {
          onSelect(filteredElements[selectedIndex].name);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // Use capture phase to ensure we get the event before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [blockId, onClose, onSelect, selectedIndex, filteredElements]);

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

  if (filteredElements.length === 0) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      className="element-suggestions fixed z-[9999] min-w-[240px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {filteredElements.map((element, index) => (
        <button
          key={element.id}
          className={`w-full px-4 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
            ${selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
          onClick={() => onSelect(element.name)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="text-xl mr-2">{getElementIcon(element.type)}</span>
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {element.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {element.type}
              {element.id === 'new' && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                  {t('new')}
                </span>
              )}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ElementSuggestions;
