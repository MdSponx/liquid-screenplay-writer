import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSceneHeadings } from '../hooks/useSceneHeadings';

interface SceneHeadingSuggestionsImprovedProps {
  blockId: string;
  onSelect: (type: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
  projectId?: string;
  screenplayId?: string;
  currentInput?: string;
  onEnterAction?: () => void;
}

interface SuggestionItem {
  label: string;
  description: string;
  isNew?: boolean;
  count?: number;
  isDefault?: boolean;
  priority?: number;
}

const SceneHeadingSuggestionsImproved: React.FC<SceneHeadingSuggestionsImprovedProps> = ({
  blockId,
  onSelect,
  position,
  onClose,
  projectId,
  screenplayId,
  currentInput = '',
  onEnterAction,
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
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
        const rawSuggestions = await generateSuggestions(currentInput, {
          includeDefaults: true,
          maxResults: 15
        });
        
        // Process suggestions to simplify status indicators
        const processedSuggestions = rawSuggestions
          .filter(s => s.label !== '---' && s.label !== '---new---') // Remove separators
          .map((suggestion, index) => {
            // Assign priority for sorting
            let priority = 0;
            const inputUpper = currentInput.toUpperCase();
            const suggestionUpper = suggestion.label.toUpperCase();
            
            // Highest priority: new entries that match user input
            if (suggestion.isNew && suggestionUpper.startsWith(inputUpper)) {
              priority = 1000;
            }
            // High priority: exact matches
            else if (suggestionUpper === inputUpper) {
              priority = 900;
            }
            // Medium-high priority: starts with input
            else if (suggestionUpper.startsWith(inputUpper)) {
              priority = 800 + (suggestion.count || 0);
            }
            // Medium priority: contains input
            else if (suggestionUpper.includes(inputUpper)) {
              priority = 700 + (suggestion.count || 0);
            }
            // Lower priority: defaults and frequently used
            else if (suggestion.isDefault) {
              priority = 600;
            }
            else {
              priority = 500 + (suggestion.count || 0);
            }
            
            return {
              ...suggestion,
              priority
            };
          })
          .sort((a, b) => b.priority - a.priority) // Sort by priority descending
          .slice(0, 10); // Limit to 10 suggestions to reduce visual noise
        
        setSuggestions(processedSuggestions);
        
        // Auto-select the best match (first item after sorting)
        if (processedSuggestions.length > 0) {
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Error generating suggestions:', err);
      }
    };

    loadSuggestions();
  }, [currentInput, generateSuggestions]);

  // Handle selection of a scene heading with immediate synchronous processing
  const handleSelectSuggestion = useCallback(async (suggestion: string) => {
    const trimmedSuggestion = suggestion.trim();
    
    // Check if this is just a prefix selection (INT., EXT., etc.)
    const defaultPrefixes = ['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.', 'I/E.'];
    const isPrefixOnly = defaultPrefixes.some(prefix => 
      prefix === trimmedSuggestion
    );
    
    if (isPrefixOnly) {
      // For prefix-only selections, just insert the prefix with space and keep cursor active
      onSelect(trimmedSuggestion + ' ');
      return; // Don't close suggestions, let user continue typing
    }
    
    // For complete scene headings, immediately close suggestions to prevent multiple events
    onClose();
    
    // Process the selection synchronously
    try {
      // Save to Firestore if it's not a default type (but don't await to avoid delays)
      const isDefaultType = defaultPrefixes.some(prefix => 
        prefix === trimmedSuggestion
      );
      
      if (!isDefaultType && trimmedSuggestion.length > 0) {
        // Fire and forget - don't await to prevent delays
        saveSceneHeading(trimmedSuggestion).catch(err => 
          console.error('Error saving scene heading:', err)
        );
      }
      
      // Call the parent's onSelect function with the suggestion
      onSelect(trimmedSuggestion);
      
      // Note: We don't automatically create action blocks here anymore
      // The user should press Enter after the cursor is positioned at the end
      // This gives them the option to either:
      // 1. Type more text to modify the scene heading
      // 2. Press Enter to create an action block
    } catch (error) {
      console.error('Error in handleSelectSuggestion:', error);
      // Still call onSelect even if there's an error
      onSelect(trimmedSuggestion);
    }
  }, [saveSceneHeading, onSelect, onClose, onEnterAction]);

  // Enhanced keyboard navigation with proper event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      const target = e.target as HTMLElement;
      const isFromActiveBlock = target.getAttribute('data-block-id') === blockId;
      
      // Only handle if this is from the active block
      if (!isFromActiveBlock) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex].label);
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
            <span key={i} className="bg-yellow-200 dark:bg-yellow-800 font-medium">{part}</span> : 
            <span key={i}>{part}</span>
        )}
      </>
    );
  };

  // Get single status indicator for each suggestion
  const getStatusIndicator = (suggestion: SuggestionItem) => {
    // Priority: NEW > usage count > default indicator
    if (suggestion.isNew) {
      return (
        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
          NEW
        </span>
      );
    }
    
    if (suggestion.count && suggestion.count > 1) {
      return (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {suggestion.count}×
        </span>
      );
    }
    
    return null;
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
      className="scene-heading-suggestions-improved fixed z-[9999] min-w-[300px] max-w-[400px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        maxHeight: '280px',
        overflowY: 'auto',
      }}
    >
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
          <div className="w-4 h-4 border-2 border-[#E86F2C] border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-gray-700 dark:text-gray-300 text-sm">Loading...</span>
        </div>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No scene headings found
            </div>
          ) : (
            <>
              {/* Header with instruction */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Press Enter to select • ↑↓ to navigate
                </span>
              </div>
              
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0
                    ${selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : ''}`}
                  onClick={() => handleSelectSuggestion(suggestion.label)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm">
                      {highlightMatch(suggestion.label, currentInput)}
                    </div>
                    {suggestion.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {suggestion.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center ml-3">
                    {getStatusIndicator(suggestion)}
                  </div>
                </button>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SceneHeadingSuggestionsImproved;
