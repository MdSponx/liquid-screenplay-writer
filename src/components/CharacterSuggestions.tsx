import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { CharacterDocument } from '../types';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle } from 'lucide-react';

interface CharacterSuggestionsProps {
  blockId: string;
  onSelect: (value: string) => void;
  position: { x: number; y: number };
  onClose: () => void; // This prop is called to close the suggestions
  projectCharacters: CharacterDocument[];
  projectId?: string;
  currentInput?: string;
}

const CharacterSuggestions: React.FC<CharacterSuggestionsProps> = ({
  blockId,
  onSelect,
  position,
  onClose, // Destructure onClose prop
  projectCharacters,
  projectId,
  currentInput = '',
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCharacters, setFilteredCharacters] = useState<CharacterDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCharacterAdded, setNewCharacterAdded] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch characters from Firestore directly (for robustness, but debounce handles loading)
  const fetchCharactersFromFirestore = async (searchTerm: string): Promise<CharacterDocument[]> => {
    if (!projectId) return [];
    
    setError(null); 
    
    try {
      const charactersRef = collection(db, `projects/${projectId}/characters`);
      let characterQuery;
      if (searchTerm) {
        const searchTermUpper = searchTerm.toUpperCase();
        characterQuery = query(
          charactersRef,
          where("name_uppercase", ">=", searchTermUpper),
          where("name_uppercase", "<=", searchTermUpper + "\uf8ff"),
          limit(10)
        );
      } else {
        characterQuery = query(
          charactersRef,
          orderBy("name_uppercase"), 
          limit(10)
        );
      }
      
      const querySnapshot = await getDocs(characterQuery);
      return querySnapshot.docs.map(doc => doc.data() as CharacterDocument);
    } catch (err) {
      console.error('Error fetching characters from Firestore:', err);
      setError('Failed to load character suggestions');
      return [];
    }
  };

  // Function to select a character (called by Enter key or mouse click)
  const handleSelectCharacter = useCallback((character: CharacterDocument) => {
    console.log('Character selected:', character);
    
    if (character.id === 'new-character-suggestion') {
      setNewCharacterAdded(character.name);
      setTimeout(() => setNewCharacterAdded(null), 3000); // Clear message after 3 seconds
    } else {
      setNewCharacterAdded(null); // Clear message if an existing character is selected
    }
    
    onSelect(character.name); // Notify parent component of selection
    onClose(); // Always call onClose prop to close the suggestions after selection
  }, [onSelect, onClose]);

  // Main effect to filter and set suggestions (with debouncing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setNewCharacterAdded(null); // Clear success message when input changes

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true); 
      setError(null); 

      const input = currentInput.trim();
      let charactersToFilter = [...projectCharacters]; 

      if (input.length > 0) {
        try {
          const firestoreCharacters = await fetchCharactersFromFirestore(input);
          firestoreCharacters.forEach(fsChar => {
            if (!charactersToFilter.some(propChar => propChar.id === fsChar.id)) {
              charactersToFilter.push(fsChar);
            }
          });
        } catch (fetchError) {
          console.error("Error merging Firestore characters:", fetchError);
        }
      }
      
      let filtered = charactersToFilter;

      if (input) {
        const inputUpper = input.toUpperCase();
        filtered = charactersToFilter.filter(character => 
          character.name.toUpperCase().includes(inputUpper)
        );
        
        filtered.sort((a, b) => {
          const aNameUpper = a.name.toUpperCase();
          const bNameUpper = b.name.toUpperCase();
          
          if (aNameUpper === inputUpper && bNameUpper !== inputUpper) return -1;
          if (bNameUpper === inputUpper && aNameUpper !== inputUpper) return 1;
          
          if (aNameUpper.startsWith(inputUpper) && !bNameUpper.startsWith(inputUpper)) return -1;
          if (bNameUpper.startsWith(inputUpper) && !aNameUpper.startsWith(inputUpper)) return 1;
          
          return a.name.localeCompare(b.name);
        });
      }
      
      const exactMatch = filtered.some(character => 
        character.name.toUpperCase() === input.toUpperCase() && character.id !== 'new-character-suggestion'
      );
      
      if (input && !exactMatch) {
        filtered.push({
          id: 'new-character-suggestion', 
          name: input,
          name_uppercase: input.toUpperCase(),
          projectId: projectId || '',
          screenplayIds: [],
          associatedSceneIds: []
        });
      }
      
      setFilteredCharacters(filtered);
      setSelectedIndex(0);
      setIsLoading(false); 
    }, 300);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentInput, projectCharacters, projectId]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCharacters.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCharacters.length) % filteredCharacters.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCharacters.length > 0) {
          const selectedCharacter = filteredCharacters[selectedIndex];
          handleSelectCharacter(selectedCharacter);
        }
      } else if (e.key === 'Escape') {
        onClose(); // Call onClose prop to close suggestions
        setNewCharacterAdded(null); // Clear message
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedIndex, filteredCharacters, handleSelectCharacter]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ensure the click did not originate from inside the popupRef
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose(); // Call onClose prop
        setNewCharacterAdded(null); // Clear message
      }
    };

    // Use mousedown to capture clicks for closing
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  if (filteredCharacters.length === 0 && !isLoading && !error) {
    return null;
  }

  // Separate existing characters from the "Create New" option
  const existingCharacters = filteredCharacters.filter(char => char.id !== 'new-character-suggestion');
  const createNewOption = filteredCharacters.find(char => char.id === 'new-character-suggestion');

  return (
    <div
      ref={popupRef}
      className="character-suggestions absolute z-[9999] min-w-[240px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      // Removed onMouseDown/onMouseUp from here. The handleClickOutside will handle clicks outside the popupRef.
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        maxHeight: '300px',
        overflowY: 'auto',
        width: '100%'
      }}
    >
      {/* Success message for newly added character */}
      {newCharacterAdded && (
        <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 border-b border-green-200 dark:border-green-800 flex items-center">
          <CheckCircle size={16} className="text-green-600 dark:text-green-400 mr-2" />
          <span className="text-sm text-green-700 dark:text-green-300">
            {t('new_character_added_message')}
          </span>
        </div>
      )}
      
      {isLoading && filteredCharacters.length === 0 ? (
        <div className="p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#E86F2C] border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">{t('loading_characters')}</span>
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Existing characters section */}
          {existingCharacters.length > 0 && (
            <div className="existing-characters">
              <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 font-medium">
                {t('existing_characters')}
              </div>
              {existingCharacters.map((character, index) => (
                <button
                  key={character.id}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
                    ${selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  onClick={() => handleSelectCharacter(character)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {highlightMatch(character.name, currentInput)}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {/* Create new option */}
          {createNewOption && (
            <div className="create-new-option">
              {existingCharacters.length > 0 && (
                <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 font-medium">
                  {t('create_new')}
                </div>
              )}
              <button
                className={`w-full px-4 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 bg-green-50 dark:bg-green-900/20
                  ${selectedIndex === filteredCharacters.length - 1 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                onClick={() => handleSelectCharacter(createNewOption)}
                onMouseEnter={() => setSelectedIndex(filteredCharacters.length - 1)}
              >
                <div className="flex-1">
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {highlightMatch(createNewOption.name, currentInput)}
                  </span>
                  <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full">
                    {t('new')}
                  </span>
                </div>
              </button>
            </div>
          )}
           {/* If no characters and not loading and no "New" option, display "No results" */}
           {!isLoading && filteredCharacters.length === 0 && !createNewOption && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {t('no_results')}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default CharacterSuggestions;
