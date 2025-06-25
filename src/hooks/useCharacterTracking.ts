import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Block, CharacterDocument } from '../types';

interface UseCharacterTrackingProps {
  projectId: string | undefined;
  screenplayId: string | null;
  blocks: Block[];
  userId: string;
}

interface CharacterMap {
  [name: string]: CharacterDocument;
}

// Counter for sequential character IDs
let characterCounter = 1;

export const useCharacterTracking = ({
  projectId,
  screenplayId,
  blocks,
  userId
}: UseCharacterTrackingProps) => {
  const [characters, setCharacters] = useState<CharacterDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characterMap, setCharacterMap] = useState<CharacterMap>({});
  const [processingCharacters, setProcessingCharacters] = useState<Set<string>>(new Set());

  // Generate a clean, sequential character ID
  const generateCharacterId = useCallback((): string => {
    // Format: CH followed by 6 digits with leading zeros
    const formattedCounter = String(characterCounter).padStart(6, '0');
    characterCounter++;
    return `CH${formattedCounter}`;
  }, []);

  // Extract character names from blocks
  const extractCharacterNames = useCallback((blocks: Block[]): string[] => {
    const characterNames = new Set<string>();
    
    blocks.forEach(block => {
      if (block.type === 'character') {
        // Clean up character name (remove parentheticals, etc.)
        const name = block.content.trim().replace(/\([^)]*\)/g, '').trim();
        if (name) {
          characterNames.add(name);
        }
      }
    });
    
    return Array.from(characterNames);
  }, []);

  // Fetch all characters for the project
  const fetchCharacters = useCallback(async () => {
    if (!projectId) return [];

    try {
      setLoading(true);
      setError(null);
      
      const charactersRef = collection(db, `projects/${projectId}/characters`);
      const charactersSnapshot = await getDocs(charactersRef);
      
      const fetchedCharacters = charactersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as CharacterDocument[];
      
      console.log(`Fetched ${fetchedCharacters.length} characters from database`);
      
      // Find the highest character counter to ensure sequential IDs
      fetchedCharacters.forEach(char => {
        if (char.id && char.id.startsWith('CH')) {
          const numPart = char.id.substring(2);
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num >= characterCounter) {
            characterCounter = num + 1;
          }
        }
      });
      
      // Create a map for quick lookups
      const charMap: CharacterMap = {};
      fetchedCharacters.forEach(char => {
        if (char.name_uppercase) {
          charMap[char.name_uppercase] = char;
        }
      });
      
      setCharacters(fetchedCharacters);
      setCharacterMap(charMap);
      
      return fetchedCharacters;
    } catch (err) {
      console.error('Error fetching characters:', err);
      setError('Failed to load characters');
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Update an existing character
  const updateExistingCharacter = useCallback(async (
    character: CharacterDocument, 
    screenplayId: string
  ): Promise<CharacterDocument | null> => {
    if (!projectId) return null;

    try {
      // Only update if the screenplayId isn't already in the list
      if (!character.screenplayIds?.includes(screenplayId)) {
        const screenplayIds = [...(character.screenplayIds || []), screenplayId];
        
        const updatedCharacter = {
          ...character,
          screenplayIds,
          lastUpdated: Timestamp.now()
        };
        
        const characterRef = doc(db, `projects/${projectId}/characters`, character.id);
        await updateDoc(characterRef, {
          screenplayIds,
          lastUpdated: serverTimestamp()
        });
        
        console.log(`Updated character "${character.name}" with new screenplay ID`);
        
        // Update local state
        setCharacters(prev => 
          prev.map(c => c.id === character.id ? updatedCharacter : c)
        );
        
        if (character.name_uppercase) {
          setCharacterMap(prev => ({
            ...prev,
            [character.name_uppercase]: updatedCharacter
          }));
        }
        
        return updatedCharacter;
      }
      
      return character;
    } catch (err) {
      console.error('Error updating character:', err);
      setError('Failed to update character');
      return null;
    }
  }, [projectId]);

  // Add a new character to the database
  const addCharacter = useCallback(async (characterName: string): Promise<CharacterDocument | null> => {
    if (!projectId || !screenplayId || !userId) {
      console.error('Missing required IDs for character creation');
      return null;
    }

    // Normalize the character name
    const normalizedName = characterName.trim();
    if (!normalizedName) return null;
    
    const nameUppercase = normalizedName.toUpperCase();
    
    // Prevent concurrent processing of the same character
    if (processingCharacters.has(nameUppercase)) {
      console.log(`Character "${normalizedName}" is already being processed, skipping`);
      return null;
    }
    
    setProcessingCharacters(prev => new Set(prev).add(nameUppercase));

    try {
      // First check local cache
      if (characterMap[nameUppercase]) {
        console.log(`Character "${normalizedName}" already exists in local cache, updating instead`);
        const result = await updateExistingCharacter(characterMap[nameUppercase], screenplayId);
        setProcessingCharacters(prev => {
          const newSet = new Set(prev);
          newSet.delete(nameUppercase);
          return newSet;
        });
        return result;
      }
      
      // Then check database directly with a query
      const charactersRef = collection(db, `projects/${projectId}/characters`);
      const q = query(charactersRef, where("name_uppercase", "==", nameUppercase));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingChar = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as CharacterDocument;
        console.log(`Character "${normalizedName}" already exists in database, updating instead`);
        
        // Update local cache
        setCharacterMap(prev => ({
          ...prev,
          [nameUppercase]: existingChar
        }));
        
        const result = await updateExistingCharacter(existingChar, screenplayId);
        setProcessingCharacters(prev => {
          const newSet = new Set(prev);
          newSet.delete(nameUppercase);
          return newSet;
        });
        return result;
      }

      // Generate a clean character ID
      const characterId = generateCharacterId();
      
      // Create new character document
      const newCharacter: CharacterDocument = {
        id: characterId,
        name: normalizedName,
        name_uppercase: nameUppercase,
        projectId: projectId,
        screenplayIds: [screenplayId],
        associatedSceneIds: [],
        createdAt: Timestamp.now(),
        createdBy: userId,
        lastUpdated: Timestamp.now()
      };

      // Use setDoc with merge to handle potential concurrent operations
      const characterRef = doc(db, `projects/${projectId}/characters`, characterId);
      await setDoc(characterRef, newCharacter, { merge: true });
      
      console.log(`Added new character "${normalizedName}" to database with ID ${characterId}`);
      
      // Update local state
      setCharacters(prev => {
        // Check if character already exists in the array
        const exists = prev.some(c => c.id === characterId);
        if (exists) return prev;
        return [...prev, newCharacter];
      });
      
      setCharacterMap(prev => ({
        ...prev,
        [nameUppercase]: newCharacter
      }));
      
      setProcessingCharacters(prev => {
        const newSet = new Set(prev);
        newSet.delete(nameUppercase);
        return newSet;
      });
      
      return newCharacter;
    } catch (err) {
      console.error('Error adding character:', err);
      setError('Failed to add character');
      
      setProcessingCharacters(prev => {
        const newSet = new Set(prev);
        newSet.delete(nameUppercase);
        return newSet;
      });
      
      return null;
    }
  }, [projectId, screenplayId, userId, characterMap, processingCharacters, generateCharacterId, updateExistingCharacter]);

  // Delete a character
  const deleteCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    if (!projectId) return false;

    try {
      const characterRef = doc(db, `projects/${projectId}/characters`, characterId);
      await deleteDoc(characterRef);
      
      console.log(`Deleted character with ID ${characterId}`);
      
      // Update local state
      setCharacters(prev => prev.filter(c => c.id !== characterId));
      setCharacterMap(prev => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach(key => {
          if (newMap[key].id === characterId) {
            delete newMap[key];
          }
        });
        return newMap;
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting character:', err);
      setError('Failed to delete character');
      return false;
    }
  }, [projectId]);

  // Rename a character
  const renameCharacter = useCallback(async (
    characterId: string, 
    newName: string
  ): Promise<CharacterDocument | null> => {
    if (!projectId) return null;

    try {
      const character = characters.find(c => c.id === characterId);
      if (!character) {
        console.error(`Character with ID ${characterId} not found`);
        return null;
      }
      
      // Normalize the new name
      const normalizedNewName = newName.trim();
      if (!normalizedNewName) {
        console.error('New character name cannot be empty');
        return null;
      }
      
      const newNameUppercase = normalizedNewName.toUpperCase();
      
      // Check if the new name already exists
      if (characterMap[newNameUppercase] && characterMap[newNameUppercase].id !== characterId) {
        console.error(`Character with name "${normalizedNewName}" already exists`);
        setError(`Character with name "${normalizedNewName}" already exists`);
        return null;
      }
      
      const updatedCharacter = {
        ...character,
        name: normalizedNewName,
        name_uppercase: newNameUppercase,
        lastUpdated: Timestamp.now()
      };
      
      const characterRef = doc(db, `projects/${projectId}/characters`, characterId);
      await updateDoc(characterRef, {
        name: normalizedNewName,
        name_uppercase: newNameUppercase,
        lastUpdated: serverTimestamp()
      });
      
      console.log(`Renamed character from "${character.name}" to "${normalizedNewName}"`);
      
      // Update local state
      setCharacters(prev => 
        prev.map(c => c.id === characterId ? updatedCharacter : c)
      );
      
      // Update character map
      setCharacterMap(prev => {
        const newMap = { ...prev };
        if (character.name_uppercase) {
          delete newMap[character.name_uppercase];
        }
        newMap[newNameUppercase] = updatedCharacter;
        return newMap;
      });
      
      return updatedCharacter;
    } catch (err) {
      console.error('Error renaming character:', err);
      setError('Failed to rename character');
      return null;
    }
  }, [projectId, characters, characterMap]);

  // Sync characters from blocks to database
  const syncCharactersFromBlocks = useCallback(async () => {
    if (!projectId || !screenplayId || !blocks.length) return;

    try {
      const characterNames = extractCharacterNames(blocks);
      console.log(`Found ${characterNames.length} characters in blocks:`, characterNames);
      
      // Process characters sequentially to avoid race conditions
      for (const name of characterNames) {
        const nameUppercase = name.toUpperCase();
        
        // Skip if already being processed
        if (processingCharacters.has(nameUppercase)) {
          continue;
        }
        
        // Check if character already exists in our map
        if (characterMap[nameUppercase]) {
          await updateExistingCharacter(characterMap[nameUppercase], screenplayId);
        } else {
          // Create new character
          await addCharacter(name);
        }
      }
      
      console.log('Character synchronization complete');
    } catch (err) {
      console.error('Error syncing characters:', err);
      setError('Failed to sync characters');
    }
  }, [projectId, screenplayId, blocks, characterMap, processingCharacters, extractCharacterNames, addCharacter, updateExistingCharacter]);

  // Deduplicate characters in the database
  const deduplicateCharacters = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      // Get all characters for the project
      const charactersRef = collection(db, `projects/${projectId}/characters`);
      const charactersSnapshot = await getDocs(charactersRef);
      
      // Group characters by uppercase name
      const charactersByName: Record<string, CharacterDocument[]> = {};
      charactersSnapshot.docs.forEach(doc => {
        const character = { ...doc.data(), id: doc.id } as CharacterDocument;
        const nameUpper = character.name_uppercase;
        
        if (!nameUpper) return;
        
        if (!charactersByName[nameUpper]) {
          charactersByName[nameUpper] = [];
        }
        charactersByName[nameUpper].push(character);
      });
      
      // Find duplicates and merge them
      const batch = writeBatch(db);
      let hasDuplicates = false;
      
      for (const [name, chars] of Object.entries(charactersByName)) {
        if (chars.length > 1) {
          hasDuplicates = true;
          console.log(`Found ${chars.length} duplicates for character "${name}"`);
          
          // Sort by creation date (oldest first)
          chars.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return aTime - bTime;
          });
          
          // Keep the oldest character
          const primary = chars[0];
          const duplicates = chars.slice(1);
          
          // Merge data from duplicates into the primary
          const mergedScreenplayIds = new Set(primary.screenplayIds || []);
          const mergedSceneIds = new Set(primary.associatedSceneIds || []);
          
          duplicates.forEach(dup => {
            (dup.screenplayIds || []).forEach(id => mergedScreenplayIds.add(id));
            (dup.associatedSceneIds || []).forEach(id => mergedSceneIds.add(id));
          });
          
          // Update the primary character
          const primaryRef = doc(db, `projects/${projectId}/characters`, primary.id);
          batch.update(primaryRef, {
            screenplayIds: Array.from(mergedScreenplayIds),
            associatedSceneIds: Array.from(mergedSceneIds),
            lastUpdated: serverTimestamp()
          });
          
          // Delete the duplicates
          for (const dup of duplicates) {
            const dupRef = doc(db, `projects/${projectId}/characters`, dup.id);
            batch.delete(dupRef);
          }
        }
      }
      
      if (hasDuplicates) {
        await batch.commit();
        console.log('Successfully deduplicated characters');
        
        // Refresh characters after deduplication
        await fetchCharacters();
      } else {
        console.log('No duplicate characters found');
      }
      
    } catch (err) {
      console.error('Error deduplicating characters:', err);
      setError('Failed to deduplicate characters');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchCharacters]);

  // Fix malformed character IDs
  const fixMalformedCharacterIds = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      // Get all characters for the project
      const charactersRef = collection(db, `projects/${projectId}/characters`);
      const charactersSnapshot = await getDocs(charactersRef);
      
      const batch = writeBatch(db);
      let fixCount = 0;
      
      // Process each character
      for (const docSnapshot of charactersSnapshot.docs) {
        const character = { ...docSnapshot.data(), id: docSnapshot.id } as CharacterDocument;
        
        // Check for malformed IDs (containing "----" or other patterns)
        if (character.id.includes('----') || character.id.match(/character-.*-{2,}/)) {
          fixCount++;
          
          // Generate a new clean ID
          const newId = generateCharacterId();
          console.log(`Fixing malformed ID: ${character.id} -> ${newId}`);
          
          // Create a new document with the clean ID
          const newCharacterRef = doc(db, `projects/${projectId}/characters`, newId);
          const cleanCharacter = {
            ...character,
            id: newId,
            lastUpdated: serverTimestamp()
          };
          
          // Add the new document and delete the old one
          batch.set(newCharacterRef, cleanCharacter);
          batch.delete(docSnapshot.ref);
        }
      }
      
      if (fixCount > 0) {
        await batch.commit();
        console.log(`Fixed ${fixCount} malformed character IDs`);
        
        // Refresh characters after fixing IDs
        await fetchCharacters();
      } else {
        console.log('No malformed character IDs found');
      }
      
    } catch (err) {
      console.error('Error fixing malformed character IDs:', err);
      setError('Failed to fix malformed character IDs');
    } finally {
      setLoading(false);
    }
  }, [projectId, generateCharacterId, fetchCharacters]);

  // Initial fetch of characters
  useEffect(() => {
    if (projectId) {
      fetchCharacters();
    }
  }, [projectId, fetchCharacters]);

  // Monitor blocks for character changes
  useEffect(() => {
    if (projectId && screenplayId && blocks.length > 0) {
      const characterNames = extractCharacterNames(blocks);
      const characterNamesUppercase = characterNames.map(name => name.toUpperCase());
      
      // Check if we have any new characters that aren't in our map
      const hasNewCharacters = characterNames.some(name => 
        !characterMap[name.toUpperCase()]
      );
      
      if (hasNewCharacters) {
        console.log('Detected new characters in blocks, syncing...');
        syncCharactersFromBlocks();
      }
    }
  }, [projectId, screenplayId, blocks, characterMap, extractCharacterNames, syncCharactersFromBlocks]);

  // Run deduplication and ID fixing on initial load
  useEffect(() => {
    if (projectId && characters.length > 0) {
      deduplicateCharacters();
      fixMalformedCharacterIds();
    }
  }, [projectId, characters.length, deduplicateCharacters, fixMalformedCharacterIds]);

  return {
    characters,
    loading,
    error,
    addCharacter,
    deleteCharacter,
    renameCharacter,
    syncCharactersFromBlocks,
    refreshCharacters: fetchCharacters,
    deduplicateCharacters,
    fixMalformedCharacterIds
  };
};