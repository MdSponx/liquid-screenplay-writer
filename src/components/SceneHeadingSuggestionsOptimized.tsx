import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSceneHeadings } from '../hooks/useSceneHeadings';

interface SceneHeadingSuggestionsOptimizedProps {
  blockId: string;
  onSelect: (type: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
  projectId?: string;
  screenplayId?: string;
  currentInput?: string;
  onEnterAction?: () => void;
}

const SceneHeadingSuggestionsOptimized: React.FC<SceneHeadingSuggestionsOptimizedProps> = ({
  blockId,
  onSelect,
  position,
  onClose,
  projectId,
  screenplayId,
  currentInput = '',
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<{label: string, description: string, isNew?: boolean, count?: number}>>([]);
  const [recentlySavedHeading, setRecentlySavedHeading] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Use the centralized scene headings hook
  const {
    loading,
    error,
    generateSuggestions,
    saveSceneHeading,
    clearError
  } = useSceneHeadings({
    projectId,
    screenplayId,
    enabled: true
  });

  // Generate suggestions when input changes
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const newSuggestions = await generateSuggestions(currentInput, {
          includeDefaults: true,
          maxResults: 20
        });
        
        setSuggestions(newSuggestions);
        
        // Find the best match for highlighting
        if (currentInput.trim()) {
          const inputUpper = currentInput.toUpperCase();
          let bestMatchIndex = -1;
          let bestMatchScore = -1;
          
          newSuggestions.forEach((suggestion, index) => {
            if (suggestion.label === '---' || suggestion.label === '---new---') return;
            
            const suggestionUpper = suggestion.label.toUpperCase();
            let score = 0;
            
            // Exact match gets highest score
            if (suggestionUpper === inputUpper) {
              score = 1000;
            }
            // Starts with input gets high score
            else if (suggestionUpper.startsWith(inputUpper)) {
              score = 500 + (inputUpper.length / suggestionUpper.length) * 100;
            }
            // Contains input gets lower score
            else if (suggestionUpper.includes(inputUpper)) {
              score = 100 + (inputUpper.length / suggestionUpper.length) * 50;
            }
            
            // Boost score for new suggestions when they match user input
            if (suggestion.isNew && suggestionUpper.startsWith(inputUpper)) {
              score += 200;
            }
            
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchIndex = index;
            }
          });
          
          if (bestMatchIndex !== -1) {
            setSelectedIndex(bestMatchIndex);
          } else {
            // Fallback to first non-separator item
            const firstValidIndex = newSuggestions.findIndex(s => s.label !== '---' && s.label !== '---new---');
            setSelectedIndex(firstValidIndex !== -1 ? firstValidIndex : 0);
          }
        } else {
          // No input - select first non-separator item
          const firstValidIndex = newSuggestions.findIndex(s => s.label !== '---' && s.label !== '---new---');
          setSelectedIndex(firstValidIndex !== -1 ? firstValidIndex : 0);
        }
      } catch (err) {
        console.error('Error generating suggestions:', err);
      }
    };

    loadSuggestions();
  }, [currentInput, generateSuggestions]);

  // Handle selection of a scene heading
  const handleSelectSuggestion = useCallback(async (suggestion: string) => {
    const trimmedSuggestion = suggestion.trim();
    
    // Check if this is just a prefix selection (INT., EXT., etc.)
    const defaultPrefixes = ['INT. ', 'EXT. ', 'INT./EXT. ', 'EXT./INT. ', 'I/E. '];
    const isPrefixOnly = defaultPrefixes.some(prefix => 
      prefix.trim() === trimmedSuggestion
    );
    
    if (isPrefixOnly) {
      // For prefix-only selections, just insert the prefix and keep cursor active
      onSelect(trimmedSuggestion);
      return; // Don't close suggestions, let user continue typing
    }
    
    // For complete scene headings, save to Firestore if it's not a default type
    const isDefaultType = defaultPrefixes.some(prefix => 
      prefix.trim() === trimmedSuggestion
    );
    
    if (!isDefaultType && trimmedSuggestion.length > 0) {
      const success = await saveSceneHeading(trimmedSuggestion);
      if (success) {
        setRecentlySavedHeading(trimmedSuggestion);
        // Clear the notification after 3 seconds
        setTimeout(() => setRecentlySavedHeading(null), 3000);
      }
    }
    
    // Call the parent's onSelect function with the suggestion
    onSelect(trimmedSuggestion);
    
    // Close the suggestions dropdown
    onClose();
  }, [saveSceneHeading, onSelect, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      // Only handle events if they're targeted at the suggestions or the active block
      const target = e.target as HTMLElement;
      const isFromSuggestions = target.closest('.scene-heading-suggestions-optimized');
      const isFromActiveBlock = target.getAttribute('data-block-id') === blockId;
      
      if (!isFromSuggestions && !isFromActiveBlock) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setSelectedIndex(prev => {
          let nextIndex = (prev + 1) % suggestions.length;
          while (suggestions[nextIndex]?.label === '---' || suggestions[nextIndex]?.label === '---new---') {
            nextIndex = (nextIndex + 1) % suggestions.length;
          }
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setSelectedIndex(prev => {
          let nextIndex = (prev - 1 + suggestions.length) % suggestions.length;
          while (suggestions[nextIndex]?.label === '---' || suggestions[nextIndex]?.label === '---new---') {
            nextIndex = (nextIndex - 1 + suggestions.length) % suggestions.length;
          }
          return nextIndex;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (suggestions.length > 0 && suggestions[selectedIndex] && 
            suggestions[selectedIndex].label !== '---' && 
            suggestions[selectedIndex].label !== '---new---') {
          handleSelectSuggestion(suggestions[selectedIndex].label);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    // Use capture phase to intercept events before they reach other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedIndex, suggestions, handleSelectSuggestion, onClose, blockId]);

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

  // Function to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? 
            <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> : 
            <span key={i}>{part}</span>
        )}
      </>
    );
  };

  // Clear error when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  if (suggestions.length === 0 && !loading && !currentInput) { 
    return null;
  }

  return (
    <div
      ref={popupRef}
      className="scene-heading-suggestions-optimized fixed z-[9999] min-w-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        maxHeight: '300px',
        overflowY: 'auto',
        width: '100%' 
      }}
    >
      {/* Recently saved heading notification */}
      {recentlySavedHeading && (
        <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 border-b border-green-200 dark:border-green-800 flex items-center">
          <span className="text-sm text-green-700 dark:text-green-300">
            Scene heading saved: <strong>{recentlySavedHeading}</strong>
          </span>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="px-3 py-2 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center">
          <span className="text-sm text-red-700 dark:text-red-300">
            {error}
          </span>
        </div>
      )}
      
      {loading ? (
        <div className="p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#E86F2C] border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-gray-700 dark:text-gray-300">Loading suggestions...</span>
        </div>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No scene headings found
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              suggestion.label === '---' || suggestion.label === '---new---' ? (
                <div 
                  key={`separator-${index}`}
                  className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
                >
                  {suggestion.description}
                </div>
              ) : (
                <button
                  key={`suggestion-${index}`}
                  className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
                    ${selectedIndex === index ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                  onClick={() => handleSelectSuggestion(suggestion.label)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {highlightMatch(suggestion.label, currentInput)}
                  </span>
                  <div className="flex items-center gap-2">
                    {suggestion.isNew && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm">
                        NEW
                      </span>
                    )}
                    {suggestion.count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({suggestion.count})
                      </span>
                    )}
                  </div>
                </button>
              )
            ))
          )}
        </>
      )}
    </div>
  );
};

export default SceneHeadingSuggestionsOptimized;
