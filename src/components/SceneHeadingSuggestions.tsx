import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { UniqueSceneHeadingDocument } from '../types';
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createSceneHeadingHash } from '../utils/blockUtils';
import { v4 as uuidv4 } from 'uuid';

interface SceneHeadingSuggestionsProps {
  blockId: string;
  onSelect: (type: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
  projectId?: string;
  screenplayId?: string;
  currentInput?: string;
  projectUniqueSceneHeadings?: UniqueSceneHeadingDocument[];
  onEnterAction?: () => void; // New prop for handling Enter key action insertion
}

const SceneHeadingSuggestions: React.FC<SceneHeadingSuggestionsProps> = ({
  blockId,
  onSelect,
  position,
  onClose,
  projectId,
  screenplayId,
  currentInput = '',
  projectUniqueSceneHeadings = [],
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Array<{label: string, description: string, isNew?: boolean, count?: number}>>([]);
  const [loading, setLoading] = useState(false);
  const [allUniqueSceneHeadings, setAllUniqueSceneHeadings] = useState<UniqueSceneHeadingDocument[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recentlySavedHeading, setRecentlySavedHeading] = useState<string | null>(null);

  // Default scene type suggestions
  const defaultSceneTypes = [
    { label: 'INT. ', description: t('interior_scene') },
    { label: 'EXT. ', description: t('exterior_scene') },
    { label: 'INT./EXT. ', description: t('interior_exterior_scene') },
    { label: 'EXT./INT. ', description: t('exterior_interior_scene') },
    { label: 'I/E. ', description: t('interior_exterior_scene_short') }
  ];

  // Fetch unique scene headings from Firestore
  const fetchUniqueSceneHeadings = useCallback(async (searchPrefix?: string): Promise<UniqueSceneHeadingDocument[]> => {
    if (!projectId) {
      console.warn('No projectId provided for fetching scene headings');
      return projectUniqueSceneHeadings; // Fallback to props data
    }

    try {
      const uniqueSceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
      
      let sceneQuery;
      if (searchPrefix) {
        // Use text_uppercase field for case-insensitive search
        const prefixUpper = searchPrefix.toUpperCase();
        sceneQuery = query(
          uniqueSceneHeadingsRef,
          orderBy("text_uppercase"),
          startAt(prefixUpper),
          endAt(prefixUpper + "\uf8ff"),
          limit(50)
        );
      } else {
        // If no prefix, fetch all sorted by count
        sceneQuery = query(
          uniqueSceneHeadingsRef,
          orderBy("count", "desc"),
          limit(100)
        );
      }

      console.log(`Fetching scene headings for project: ${projectId}, prefix: ${searchPrefix || 'all'}`);
      const querySnapshot = await getDocs(sceneQuery);
      
      const results = querySnapshot.docs.map(doc => {
        const data = doc.data() as UniqueSceneHeadingDocument;
        return {
          ...data,
          id: doc.id,
        };
      });

      console.log(`Found ${results.length} unique scene headings`);
      return results;
    } catch (error) {
      console.error('Error fetching unique scene headings:', error);
      
      // Fallback to simpler query if the first one fails
      try {
        console.log('Trying simple query without orderBy...');
        const simpleQuery = query(
          collection(db, `projects/${projectId}/unique_scene_headings`),
          limit(100)
        );
        const querySnapshot = await getDocs(simpleQuery);
        
        const results = querySnapshot.docs.map(doc => {
          const data = doc.data() as UniqueSceneHeadingDocument;
          return {
            ...data,
            id: doc.id,
          };
        });

        console.log(`Found ${results.length} scene headings with simple query`);
        return results;
      } catch (simpleError) {
        console.error('Simple query also failed:', simpleError);
        return projectUniqueSceneHeadings; // Fallback to props data
      }
    }
  }, [projectId, projectUniqueSceneHeadings]);

  // Save a new scene heading to Firestore
  const saveSceneHeading = useCallback(async (sceneHeadingText: string) => {
    if (!projectId || !screenplayId) {
      console.warn('Missing projectId or screenplayId for saving scene heading');
      return;
    }

    try {
      const sceneHeadingHash = createSceneHeadingHash(sceneHeadingText);
      const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);
      
      // Check if it already exists
      const docSnap = await getDoc(uniqueSceneHeadingRef);
      
      if (docSnap.exists()) {
        // Update existing scene heading
        await updateDoc(uniqueSceneHeadingRef, {
          count: docSnap.data().count + 1,
          lastUsed: serverTimestamp(),
          screenplayIds: arrayUnion(screenplayId)
        });
        console.log(`Updated existing scene heading: ${sceneHeadingText}`);
      } else {
        // Create new scene heading
        await setDoc(uniqueSceneHeadingRef, {
          id: sceneHeadingHash,
          text: sceneHeadingText,
          text_uppercase: sceneHeadingText.toUpperCase(),
          count: 1,
          lastUsed: serverTimestamp(),
          screenplayIds: [screenplayId],
          associated_characters: [],
          associated_elements: []
        });
        console.log(`Created new scene heading: ${sceneHeadingText}`);
      }
      
      // Set recently saved heading to update UI
      setRecentlySavedHeading(sceneHeadingText);
      
      // Refresh the scene headings list
      const updatedHeadings = await fetchUniqueSceneHeadings();
      setAllUniqueSceneHeadings(updatedHeadings);
      
      return true;
    } catch (error) {
      console.error('Error saving scene heading:', error);
      return false;
    }
  }, [projectId, screenplayId, fetchUniqueSceneHeadings]);

  // Initial load of all scene headings
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const allHeadings = await fetchUniqueSceneHeadings();
        setAllUniqueSceneHeadings(allHeadings);
      } catch (error) {
        console.error('Error loading initial scene headings:', error);
        setAllUniqueSceneHeadings(projectUniqueSceneHeadings);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchUniqueSceneHeadings, projectUniqueSceneHeadings]);

  // Main filtering logic with debouncing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      
      const trimmedInput = currentInput.trim();
      const inputUpper = trimmedInput.toUpperCase();

      let suggestions: Array<{label: string, description: string, isNew?: boolean, count?: number}> = [];
      let scenePrefix = ''; // To store detected scene prefix like "INT. "

      // 1. Determine scene prefix from current input
      const prefixMatch = trimmedInput.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i);
      if (prefixMatch) {
        scenePrefix = prefixMatch[0].toUpperCase();
      }

      // 2. Add default scene types that match the current input
      const matchingDefaultTypes = defaultSceneTypes.filter(type => 
          type.label.toUpperCase().startsWith(inputUpper)
      );
      suggestions.push(...matchingDefaultTypes);

      // 3. Get existing unique scene headings
      let existingMatches: typeof suggestions = [];
      let headingsToFilter = allUniqueSceneHeadings;

      // If we have a scene prefix, fetch additional data from Firestore
      if (scenePrefix && projectId) {
        try {
          console.log(`Fetching additional scene headings for prefix: ${scenePrefix}`);
          const additionalHeadings = await fetchUniqueSceneHeadings(scenePrefix);
          
          // Combine without duplicates
          const combinedHeadings = [...headingsToFilter];
          additionalHeadings.forEach(newHeading => {
            const exists = combinedHeadings.some(existing => 
              existing.text.toUpperCase() === newHeading.text.toUpperCase()
            );
            if (!exists) {
              combinedHeadings.push(newHeading);
            }
          });
          
          headingsToFilter = combinedHeadings;
        } catch (error) {
          console.error('Error fetching additional scene headings:', error);
        }
      }

      // Filter existing scene headings
      if (scenePrefix) {
        // Filter by prefix
        existingMatches = headingsToFilter
          .filter(heading => heading.text.toUpperCase().startsWith(scenePrefix))
          .sort((a, b) => b.count - a.count) // Sort by frequency
          .map(heading => ({
              label: heading.text,
              description: `${t('used')} ${heading.count} ${heading.count === 1 ? t('time') : t('times')}`,
              count: heading.count
          }));
      } else if (trimmedInput) {
        // General search
        existingMatches = headingsToFilter
          .filter(heading => heading.text.toUpperCase().includes(inputUpper))
          .sort((a, b) => b.count - a.count)
          .map(heading => ({
              label: heading.text,
              description: `${t('used')} ${heading.count} ${heading.count === 1 ? t('time') : t('times')}`,
              count: heading.count
          }));
      } else {
        // Show most used scene headings
        existingMatches = headingsToFilter
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(heading => ({
              label: heading.text,
              description: `${t('used')} ${heading.count} ${heading.count === 1 ? t('time') : t('times')}`,
              count: heading.count
          }));
      }

      // Add separator and existing scene headings if applicable
      if (existingMatches.length > 0) {
        if (matchingDefaultTypes.length > 0 || !trimmedInput) {
            if (!suggestions.some(s => s.label === '---')) {
                suggestions.push({ label: '---', description: t('recently_used_scene_headings') });
            }
        }
        suggestions.push(...existingMatches);
      }

      // Remove duplicates and maintain order
      const finalFilteredSuggestionsMap = new Map<string, typeof suggestions[0]>();
      for (const s of suggestions) {
          if (s.label === '---') {
              if (!finalFilteredSuggestionsMap.has('---')) {
                  finalFilteredSuggestionsMap.set('---', s);
              }
          } else {
              const key = s.label.toUpperCase().trim();
              if (finalFilteredSuggestionsMap.has(key)) {
                  const existing = finalFilteredSuggestionsMap.get(key)!;
                  if (s.count !== undefined && (existing.count === undefined || s.count > existing.count)) {
                      finalFilteredSuggestionsMap.set(key, s);
                  }
              } else {
                  finalFilteredSuggestionsMap.set(key, s);
              }
          }
      }
      
      let finalSuggestionsArray = Array.from(finalFilteredSuggestionsMap.values());

      // Sort suggestions - prioritize similar matches
      finalSuggestionsArray.sort((a, b) => {
          const aIsSeparator = a.label === '---';
          const bIsSeparator = b.label === '---';
          const aIsDefault = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === a.label.toUpperCase().trim());
          const bIsDefault = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === b.label.toUpperCase().trim());

          // Separators always go to their designated position
          if (aIsSeparator && !bIsSeparator) return -1;
          if (bIsSeparator && !aIsSeparator) return 1;
          if (aIsSeparator && bIsSeparator) return 0;

          // Default types come first
          if (aIsDefault && !bIsDefault) return -1;
          if (bIsDefault && !aIsDefault) return 1;

          // Sort by relevance to input
          if (trimmedInput) {
            const aUpper = a.label.toUpperCase();
            const bUpper = b.label.toUpperCase();
            const aStartsWith = aUpper.startsWith(inputUpper);
            const bStartsWith = bUpper.startsWith(inputUpper);
            
            if (aStartsWith && !bStartsWith) return -1;
            if (bStartsWith && !aStartsWith) return 1;
          }

          // Sort by usage count for existing headings
          if (a.count !== undefined && b.count !== undefined && a.count !== b.count) {
              return b.count - a.count;
          }
          return a.label.localeCompare(b.label);
      });

      // 4. Add "Create New" option at the bottom if applicable
      const allLabelsUpper = new Set(finalSuggestionsArray.map(s => s.label.toUpperCase()));
      const exactMatch = allLabelsUpper.has(inputUpper);
      
      const hasValidPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i.test(trimmedInput);
      const isOnlyPrefixInDefaults = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === inputUpper);
      
      if (trimmedInput && !exactMatch && hasValidPrefix && !isOnlyPrefixInDefaults) {
          // Add separator before new option
          finalSuggestionsArray.push({ label: '---new---', description: t('create_new') });
          
          // Add new suggestion at the bottom
          finalSuggestionsArray.push({
              label: trimmedInput,
              description: t('new_scene_heading'),
              isNew: true
          });
      }

      setFilteredSuggestions(finalSuggestionsArray);
      
      // Improved highlight behavior - find the best match for user input
      if (trimmedInput) {
        // First, try to find exact match or best prefix match
        let bestMatchIndex = -1;
        let bestMatchScore = -1;
        
        finalSuggestionsArray.forEach((s, index) => {
          if (s.label === '---') return;
          
          const suggestionUpper = s.label.toUpperCase();
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
          if (s.isNew && suggestionUpper.startsWith(inputUpper)) {
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
          const firstValidIndex = finalSuggestionsArray.findIndex(s => s.label !== '---' && s.label !== '---new---');
          setSelectedIndex(firstValidIndex !== -1 ? firstValidIndex : 0);
        }
      } else {
        // No input - select first non-separator item
        const firstValidIndex = finalSuggestionsArray.findIndex(s => s.label !== '---' && s.label !== '---new---');
        setSelectedIndex(firstValidIndex !== -1 ? firstValidIndex : 0);
      }

      setLoading(false);
    }, 300); // Debounce 300ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentInput, allUniqueSceneHeadings, projectId, fetchUniqueSceneHeadings, t]);

  // Helper function to check if text is a prefix-only entry
  const isPrefixOnly = useCallback((text: string): boolean => {
    const trimmedText = text.trim().toUpperCase();
    const prefixPatterns = [
      'INT.',
      'EXT.',
      'INT./EXT.',
      'EXT./INT.',
      'I/E.'
    ];
    return prefixPatterns.includes(trimmedText);
  }, []);

  // Handle selection of a scene heading - improved flow with prefix detection
  const handleSelectSuggestion = useCallback(async (suggestion: string) => {
    const trimmedSuggestion = suggestion.trim();
    
    // Check if this is just a prefix selection (INT., EXT., etc.)
    const isPrefix = isPrefixOnly(trimmedSuggestion);
    
    if (isPrefix) {
      // For prefix-only selections, just insert the prefix and keep cursor active
      // Don't save to Firestore and don't close suggestions
      onSelect(trimmedSuggestion);
      return; // Don't close suggestions, let user continue typing
    }
    
    // For complete scene headings, save to Firestore if it's not empty and not prefix-only
    if (trimmedSuggestion.length > 0 && !isPrefixOnly(trimmedSuggestion)) {
      await saveSceneHeading(trimmedSuggestion);
    }
    
    // Call the parent's onSelect function with the suggestion
    onSelect(trimmedSuggestion);
    
    // Close the suggestions dropdown
    onClose();
  }, [saveSceneHeading, onSelect, onClose, isPrefixOnly]);

  // Keyboard navigation with improved event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredSuggestions.length === 0) return;

      // Only handle events if they're targeted at the suggestions or the active block
      const target = e.target as HTMLElement;
      const isFromSuggestions = target.closest('.scene-heading-suggestions');
      const isFromActiveBlock = target.getAttribute('data-block-id') === blockId;
      
      if (!isFromSuggestions && !isFromActiveBlock) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setSelectedIndex(prev => {
          let nextIndex = (prev + 1) % filteredSuggestions.length;
          while (filteredSuggestions[nextIndex]?.label === '---' || filteredSuggestions[nextIndex]?.label === '---new---') {
            nextIndex = (nextIndex + 1) % filteredSuggestions.length;
          }
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setSelectedIndex(prev => {
          let nextIndex = (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length;
          while (filteredSuggestions[nextIndex]?.label === '---' || filteredSuggestions[nextIndex]?.label === '---new---') {
            nextIndex = (nextIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
          }
          return nextIndex;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (filteredSuggestions.length > 0 && filteredSuggestions[selectedIndex] && 
            filteredSuggestions[selectedIndex].label !== '---' && 
            filteredSuggestions[selectedIndex].label !== '---new---') {
          handleSelectSuggestion(filteredSuggestions[selectedIndex].label);
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
  }, [selectedIndex, filteredSuggestions, handleSelectSuggestion, onClose, blockId]);

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

  if (filteredSuggestions.length === 0 && !loading && !currentInput) { 
    return null;
  }

  return (
    <div
      ref={popupRef}
      className="scene-heading-suggestions fixed z-[9999] min-w-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
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
      
      {loading ? (
        <div className="p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#E86F2C] border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-gray-700 dark:text-gray-300">{t('loading_suggestions')}</span>
        </div>
      ) : (
        <>
          {filteredSuggestions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {t('no_scene_headings_found')}
            </div>
          ) : (
            filteredSuggestions.map((suggestion, index) => (
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

export default SceneHeadingSuggestions;
