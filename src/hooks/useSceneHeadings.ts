import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt, doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createSceneHeadingHash } from '../utils/blockUtils';
import { UniqueSceneHeadingDocument } from '../types';

interface UseSceneHeadingsOptions {
  projectId?: string;
  screenplayId?: string;
  enabled?: boolean;
}

interface SceneHeadingCache {
  [key: string]: {
    data: UniqueSceneHeadingDocument[];
    timestamp: number;
    query: string;
  };
}

interface SceneHeadingSuggestion {
  label: string;
  description: string;
  isNew?: boolean;
  count?: number;
  isDefault?: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms

export const useSceneHeadings = (options: UseSceneHeadingsOptions) => {
  const { projectId, screenplayId, enabled = true } = options;
  
  const [allSceneHeadings, setAllSceneHeadings] = useState<UniqueSceneHeadingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  // Cache for search results
  const cacheRef = useRef<SceneHeadingCache>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Default scene type suggestions
  const defaultSceneTypes: SceneHeadingSuggestion[] = [
    { label: 'INT. ', description: 'Interior scene', isDefault: true },
    { label: 'EXT. ', description: 'Exterior scene', isDefault: true },
    { label: 'INT./EXT. ', description: 'Interior/Exterior scene', isDefault: true },
    { label: 'EXT./INT. ', description: 'Exterior/Interior scene', isDefault: true },
    { label: 'I/E. ', description: 'Interior/Exterior scene (short)', isDefault: true }
  ];

  // Clear cache when project changes
  useEffect(() => {
    cacheRef.current = {};
    setAllSceneHeadings([]);
    setLastFetch(0);
  }, [projectId]);

  // Fetch all scene headings for the project
  const fetchAllSceneHeadings = useCallback(async (force = false): Promise<UniqueSceneHeadingDocument[]> => {
    if (!projectId || !enabled) {
      return [];
    }

    const now = Date.now();
    const shouldRefetch = force || (now - lastFetch > CACHE_DURATION);

    if (!shouldRefetch && allSceneHeadings.length > 0) {
      return allSceneHeadings;
    }

    try {
      setLoading(true);
      setError(null);

      const uniqueSceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
      const sceneQuery = query(
        uniqueSceneHeadingsRef,
        orderBy("count", "desc"),
        limit(100)
      );

      console.log(`Fetching all scene headings for project: ${projectId}`);
      const querySnapshot = await getDocs(sceneQuery);
      
      const results = querySnapshot.docs.map(doc => {
        const data = doc.data() as UniqueSceneHeadingDocument;
        return {
          ...data,
          id: doc.id,
        };
      });

      console.log(`Loaded ${results.length} unique scene headings`);
      setAllSceneHeadings(results);
      setLastFetch(now);
      
      return results;
    } catch (error) {
      console.error('Error fetching scene headings:', error);
      setError('Failed to fetch scene headings');
      
      // Try simpler query as fallback
      try {
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

        console.log(`Loaded ${results.length} scene headings with fallback query`);
        setAllSceneHeadings(results);
        setLastFetch(now);
        return results;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, enabled, lastFetch, allSceneHeadings.length]);

  // Search scene headings with caching and debouncing
  const searchSceneHeadings = useCallback(async (
    searchPrefix: string,
    options: { useCache?: boolean; immediate?: boolean } = {}
  ): Promise<UniqueSceneHeadingDocument[]> => {
    const { useCache = true, immediate = false } = options;

    if (!projectId || !enabled) {
      return [];
    }

    const cacheKey = `${projectId}-${searchPrefix.toLowerCase()}`;
    const now = Date.now();

    // Check cache first
    if (useCache && cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log(`Using cached results for: ${searchPrefix}`);
        return cached.data;
      }
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    return new Promise((resolve) => {
      const executeSearch = async () => {
        try {
          const uniqueSceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
          const prefixUpper = searchPrefix.toUpperCase();
          
          const sceneQuery = query(
            uniqueSceneHeadingsRef,
            orderBy("text_uppercase"),
            startAt(prefixUpper),
            endAt(prefixUpper + "\uf8ff"),
            limit(50)
          );

          console.log(`Searching scene headings for prefix: ${searchPrefix}`);
          const querySnapshot = await getDocs(sceneQuery);
          
          const results = querySnapshot.docs.map(doc => {
            const data = doc.data() as UniqueSceneHeadingDocument;
            return {
              ...data,
              id: doc.id,
            };
          });

          // Cache the results
          cacheRef.current[cacheKey] = {
            data: results,
            timestamp: now,
            query: searchPrefix
          };

          console.log(`Found ${results.length} scene headings for prefix: ${searchPrefix}`);
          resolve(results);
        } catch (error) {
          console.error('Error searching scene headings:', error);
          resolve([]);
        }
      };

      if (immediate) {
        executeSearch();
      } else {
        debounceTimerRef.current = setTimeout(executeSearch, DEBOUNCE_DELAY);
      }
    });
  }, [projectId, enabled]);

  // Generate suggestions based on input
  const generateSuggestions = useCallback(async (
    currentInput: string,
    options: { includeDefaults?: boolean; maxResults?: number } = {}
  ): Promise<SceneHeadingSuggestion[]> => {
    const { includeDefaults = true, maxResults = 20 } = options;
    const trimmedInput = currentInput.trim();
    const inputUpper = trimmedInput.toUpperCase();

    let suggestions: SceneHeadingSuggestion[] = [];

    // 1. Add matching default scene types
    if (includeDefaults) {
      const matchingDefaults = defaultSceneTypes.filter(type => 
        type.label.toUpperCase().startsWith(inputUpper)
      );
      suggestions.push(...matchingDefaults);
    }

    // 2. Get existing scene headings
    let existingHeadings: UniqueSceneHeadingDocument[] = [];
    
    if (trimmedInput) {
      // Search with prefix
      const prefixMatch = trimmedInput.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i);
      if (prefixMatch) {
        existingHeadings = await searchSceneHeadings(prefixMatch[0]);
      } else {
        // General search in all headings
        existingHeadings = allSceneHeadings.filter(heading => 
          heading.text.toUpperCase().includes(inputUpper)
        );
      }
    } else {
      // Show most used headings
      existingHeadings = allSceneHeadings.slice(0, 10);
    }

    // 3. Convert to suggestions and sort by relevance
    const existingSuggestions = existingHeadings
      .map(heading => ({
        label: heading.text,
        description: `Used ${heading.count} ${heading.count === 1 ? 'time' : 'times'}`,
        count: heading.count
      }))
      .sort((a, b) => {
        // Prioritize exact matches and prefix matches
        const aStartsWith = a.label.toUpperCase().startsWith(inputUpper);
        const bStartsWith = b.label.toUpperCase().startsWith(inputUpper);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;
        
        // Then sort by usage count
        return (b.count || 0) - (a.count || 0);
      });

    // 4. Add separator if we have both defaults and existing
    if (suggestions.length > 0 && existingSuggestions.length > 0) {
      suggestions.push({ label: '---', description: 'Recently used scene headings' });
    }

    suggestions.push(...existingSuggestions);

    // 5. Add "Create New" option if applicable
    const hasValidPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i.test(trimmedInput);
    const exactMatch = suggestions.some(s => s.label.toUpperCase() === inputUpper);
    const isOnlyPrefix = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === inputUpper);
    
    if (trimmedInput && !exactMatch && hasValidPrefix && !isOnlyPrefix) {
      suggestions.push({ label: '---new---', description: 'Create new' });
      suggestions.push({
        label: trimmedInput,
        description: 'New scene heading',
        isNew: true
      });
    }

    // 6. Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => {
      if (suggestion.label === '---' || suggestion.label === '---new---') return true;
      return self.findIndex(s => s.label.toUpperCase() === suggestion.label.toUpperCase()) === index;
    });

    return uniqueSuggestions.slice(0, maxResults);
  }, [allSceneHeadings, searchSceneHeadings]);

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

  // Helper function to count scene headings currently in the editor
  const countSceneHeadingsInEditor = useCallback(async (): Promise<Record<string, number>> => {
    if (!projectId || !screenplayId) {
      return {};
    }

    try {
      // Fetch current screenplay blocks from scenes collection
      const scenesRef = collection(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`);
      const scenesQuery = query(scenesRef, orderBy('order'));
      const scenesSnapshot = await getDocs(scenesQuery);
      
      const sceneHeadingCounts: Record<string, number> = {};
      
      scenesSnapshot.docs.forEach(doc => {
        const sceneData = doc.data();
        const sceneHeading = sceneData.scene_heading?.trim().toUpperCase();
        
        if (sceneHeading && !isPrefixOnly(sceneHeading)) {
          sceneHeadingCounts[sceneHeading] = (sceneHeadingCounts[sceneHeading] || 0) + 1;
        }
      });
      
      return sceneHeadingCounts;
    } catch (error) {
      console.error('Error counting scene headings in editor:', error);
      return {};
    }
  }, [projectId, screenplayId, isPrefixOnly]);

  // Save or update a scene heading
  const saveSceneHeading = useCallback(async (sceneHeadingText: string): Promise<boolean> => {
    if (!projectId || !screenplayId) {
      console.warn('Missing projectId or screenplayId for saving scene heading');
      return false;
    }

    const trimmedText = sceneHeadingText.trim();
    
    // Prevent saving prefix-only entries
    if (isPrefixOnly(trimmedText)) {
      console.warn('Prevented saving prefix-only scene heading:', trimmedText);
      return false;
    }

    // Ensure we have a complete scene heading
    if (trimmedText.length === 0) {
      console.warn('Cannot save empty scene heading');
      return false;
    }

    try {
      const normalizedText = trimmedText.toUpperCase();
      const sceneHeadingHash = createSceneHeadingHash(normalizedText);
      const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);
      
      // Check if it already exists
      const docSnap = await getDoc(uniqueSceneHeadingRef);
      
      // Get current usage count from the editor
      const editorCounts = await countSceneHeadingsInEditor();
      const currentUsageCount = editorCounts[normalizedText] || 0;
      
      const batch = writeBatch(db);
      
      if (docSnap.exists()) {
        // Update existing scene heading with current editor count
        batch.update(uniqueSceneHeadingRef, {
          count: currentUsageCount,
          lastUsed: serverTimestamp(),
          screenplayIds: arrayUnion(screenplayId)
        });
        console.log(`Updated existing scene heading: ${normalizedText} (count: ${currentUsageCount})`);
      } else {
        // Create new scene heading with current editor count
        batch.set(uniqueSceneHeadingRef, {
          id: sceneHeadingHash,
          text: normalizedText,
          text_uppercase: normalizedText,
          count: currentUsageCount,
          lastUsed: serverTimestamp(),
          screenplayIds: [screenplayId],
          associated_characters: [],
          associated_elements: []
        });
        console.log(`Created new scene heading: ${normalizedText} (count: ${currentUsageCount})`);
      }
      
      await batch.commit();
      
      // Invalidate cache and refresh data
      cacheRef.current = {};
      await fetchAllSceneHeadings(true);
      
      return true;
    } catch (error) {
      console.error('Error saving scene heading:', error);
      setError('Failed to save scene heading');
      return false;
    }
  }, [projectId, screenplayId, fetchAllSceneHeadings, isPrefixOnly, countSceneHeadingsInEditor]);

  // Sync all scene heading counts with current editor state
  const syncSceneHeadingCounts = useCallback(async (): Promise<boolean> => {
    if (!projectId || !screenplayId) {
      console.warn('Missing projectId or screenplayId for syncing scene heading counts');
      return false;
    }

    try {
      // Get current usage counts from the editor
      const editorCounts = await countSceneHeadingsInEditor();
      
      // Get all existing scene heading documents
      const uniqueSceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
      const allHeadingsSnapshot = await getDocs(uniqueSceneHeadingsRef);
      
      const batch = writeBatch(db);
      
      // Update existing documents with current counts
      allHeadingsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const sceneHeadingText = data.text?.toUpperCase();
        const currentCount = editorCounts[sceneHeadingText] || 0;
        
        // Only update if the count has changed
        if (data.count !== currentCount) {
          batch.update(doc.ref, {
            count: currentCount,
            lastUsed: serverTimestamp()
          });
          console.log(`Synced scene heading count: ${sceneHeadingText} (${data.count} -> ${currentCount})`);
        }
      });
      
      // Add any new scene headings that exist in editor but not in database
      for (const [sceneHeadingText, count] of Object.entries(editorCounts)) {
        if (count > 0 && !isPrefixOnly(sceneHeadingText)) {
          const hash = createSceneHeadingHash(sceneHeadingText);
          const exists = allHeadingsSnapshot.docs.some(doc => doc.id === hash);
          
          if (!exists) {
            const newRef = doc(db, `projects/${projectId}/unique_scene_headings`, hash);
            batch.set(newRef, {
              id: hash,
              text: sceneHeadingText,
              text_uppercase: sceneHeadingText,
              count: count,
              lastUsed: serverTimestamp(),
              screenplayIds: [screenplayId],
              associated_characters: [],
              associated_elements: []
            });
            console.log(`Added new scene heading: ${sceneHeadingText} (count: ${count})`);
          }
        }
      }
      
      await batch.commit();
      
      // Invalidate cache and refresh
      cacheRef.current = {};
      await fetchAllSceneHeadings(true);
      
      console.log('Scene heading counts synchronized successfully');
      return true;
    } catch (error) {
      console.error('Error syncing scene heading counts:', error);
      setError('Failed to sync scene heading counts');
      return false;
    }
  }, [projectId, screenplayId, countSceneHeadingsInEditor, isPrefixOnly, fetchAllSceneHeadings]);

  // Batch save multiple scene headings (for optimization) - Updated to use new logic
  const batchSaveSceneHeadings = useCallback(async (sceneHeadingTexts: string[]): Promise<boolean> => {
    if (!projectId || !screenplayId || sceneHeadingTexts.length === 0) {
      return false;
    }

    try {
      // Filter out prefix-only entries
      const validSceneHeadings = sceneHeadingTexts.filter(text => {
        const trimmed = text.trim();
        return trimmed.length > 0 && !isPrefixOnly(trimmed);
      });

      if (validSceneHeadings.length === 0) {
        console.log('No valid scene headings to save (all were prefix-only or empty)');
        return true;
      }

      // Get current usage counts from the editor
      const editorCounts = await countSceneHeadingsInEditor();
      
      const batch = writeBatch(db);
      const updates: Promise<any>[] = [];

      for (const text of validSceneHeadings) {
        const normalizedText = text.trim().toUpperCase();
        const hash = createSceneHeadingHash(normalizedText);
        const ref = doc(db, `projects/${projectId}/unique_scene_headings`, hash);
        const currentUsageCount = editorCounts[normalizedText] || 0;
        
        updates.push(
          getDoc(ref).then(docSnap => {
            if (docSnap.exists()) {
              batch.update(ref, {
                count: currentUsageCount,
                lastUsed: serverTimestamp(),
                screenplayIds: arrayUnion(screenplayId)
              });
            } else {
              batch.set(ref, {
                id: hash,
                text: normalizedText,
                text_uppercase: normalizedText,
                count: currentUsageCount,
                lastUsed: serverTimestamp(),
                screenplayIds: [screenplayId],
                associated_characters: [],
                associated_elements: []
              });
            }
          })
        );
      }

      await Promise.all(updates);
      await batch.commit();
      
      // Invalidate cache and refresh
      cacheRef.current = {};
      await fetchAllSceneHeadings(true);
      
      console.log(`Batch saved ${validSceneHeadings.length} valid scene headings`);
      return true;
    } catch (error) {
      console.error('Error batch saving scene headings:', error);
      setError('Failed to batch save scene headings');
      return false;
    }
  }, [projectId, screenplayId, isPrefixOnly, countSceneHeadingsInEditor, fetchAllSceneHeadings]);

  // Initialize data on mount
  useEffect(() => {
    if (enabled && projectId) {
      fetchAllSceneHeadings();
    }
  }, [enabled, projectId, fetchAllSceneHeadings]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // Data
    sceneHeadings: allSceneHeadings,
    defaultSceneTypes,
    
    // State
    loading,
    error,
    
    // Actions
    fetchAllSceneHeadings,
    searchSceneHeadings,
    generateSuggestions,
    saveSceneHeading,
    batchSaveSceneHeadings,
    syncSceneHeadingCounts,
    
    // Utilities
    refreshCache: () => {
      cacheRef.current = {};
      return fetchAllSceneHeadings(true);
    },
    clearError: () => setError(null)
  };
};
