import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp, 
  writeBatch, 
  serverTimestamp, 
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid'; 
import { INITIAL_BLOCKS } from '../constants/editorConstants';
import { 
  Block, 
  PersistedEditorState, 
  SceneDocument, 
  UniqueSceneHeadingDocument, 
  CharacterDocument, 
  ElementDocument 
} from '../types';
import { Screenplay } from '../types/screenplay';
import { createSceneHeadingHash, identifyScenes } from '../utils/blockUtils';

interface ScreenplayWithScenes extends Screenplay {
  loadedSceneDocuments?: SceneDocument[];
}

interface ScreenplayDetails {
  screenplayData: ScreenplayWithScenes;
  blocks: Block[];
  editorState: Partial<PersistedEditorState>;
  characters?: CharacterDocument[];
  elements?: ElementDocument[];
  uniqueSceneHeadings?: UniqueSceneHeadingDocument[];
}

export const useScreenplays = (projectId: string) => {
  const [screenplays, setScreenplays] = useState<Screenplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScreenplays = async () => {
      if (!projectId) {
        setError('Project ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching screenplays for project: ${projectId}`);
        const screenplaysRef = collection(db, `projects/${projectId}/screenplays`);
        const querySnapshot = await getDocs(screenplaysRef);

        if (querySnapshot.empty) {
          console.log(`No screenplays found for project: ${projectId}`);
          setScreenplays([]);
          setLoading(false);
          return;
        }

        const screenplayData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Screenplay[];

        screenplayData.sort((a, b) => {
          if (a.metadata?.format !== b.metadata?.format) {
            return (a.metadata?.format === 'Series') ? -1 : 1;
          }

          if (a.metadata?.format === 'Series') {
            const seasonA = a.metadata?.season || 0;
            const seasonB = b.metadata?.season || 0;
            if (seasonA !== seasonB) return seasonA - seasonB;
            return (a.metadata?.episode || 0) - (b.metadata?.episode || 0);
          }

          return (b.lastModified?.toMillis?.() || 0) - (a.lastModified?.toMillis?.() || 0);
        });

        setScreenplays(screenplayData);
      } catch (err) {
        console.error('Error fetching screenplays:', err);
        setError('Failed to load screenplays');
      } finally {
        setLoading(false);
      }
    };

    fetchScreenplays();
  }, [projectId]);

  const loadScreenplayDetails = useCallback(async (screenplayId: string, userId: string = 'unknown'): Promise<ScreenplayDetails | null> => {
    if (!projectId) {
      setError('Project ID is required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Load screenplay metadata
      const screenplayRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}`);
      const screenplaySnap = await getDoc(screenplayRef);

      if (!screenplaySnap.exists()) {
        throw new Error(`Screenplay with ID ${screenplayId} not found in project ${projectId}`);
      }

      const screenplayData = {
        ...screenplaySnap.data(),
        id: screenplayId
      } as Screenplay;

      // --- NEW: Load all Scene Documents for this screenplay ---
      const scenesRef = collection(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`);
      const scenesQuerySnap = await getDocs(query(scenesRef, orderBy('order')));

      let blocks: Block[] = [];
      let loadedSceneDocuments: SceneDocument[] = [];

      if (!scenesQuerySnap.empty) {
        loadedSceneDocuments = scenesQuerySnap.docs.map(doc => doc.data() as SceneDocument);
        
        // Assemble the full blocks array from scene documents
        loadedSceneDocuments.forEach(sceneDoc => {
          // Add the scene heading block itself
          blocks.push({
            id: sceneDoc.id,
            type: 'scene-heading',
            content: sceneDoc.scene_heading,
            number: sceneDoc.order + 1 // Scene numbers typically start from 1
          });
          
          // Add the rest of the blocks in the scene
          blocks = blocks.concat(sceneDoc.blocks);
        });
        
        console.log(`Loaded ${loadedSceneDocuments.length} scenes with total ${blocks.length} blocks.`);
      } else {
        // --- NEW: If no scenes exist, create initial scene ---
        console.log(`No scenes found for screenplay ${screenplayId}, creating initial scene.`);
        
        // Generate a unique scene ID for the initial scene heading
        const initialSceneId = `scene-${uuidv4()}`; 
        
        // Generate a unique block ID for the initial action block
        const actionBlockId = `block-${uuidv4()}`;
        
        // Create initial blocks with proper IDs
        const initialSceneBlocks = [
          {
            id: actionBlockId,
            type: 'action',
            content: 'Write your scene description here.'
          }
        ];

        // Create scene heading text
        const sceneHeadingText = 'INT. LOCATION - DAY';
        
        const sceneDocRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`, initialSceneId);

        const newSceneDoc: SceneDocument = {
          id: initialSceneId,
          scene_heading: sceneHeadingText,
          blocks: initialSceneBlocks,
          order: 0,
          screenplayId: screenplayId,
          projectId: projectId,
          characters_in_this_scene: [],
          elements_in_this_scene: [],
          lastModified: Timestamp.now(),
        };

        const batch = writeBatch(db);
        batch.set(sceneDocRef, newSceneDoc);

        // Also sync to unique_scene_headings
        const uniqueSceneHeadingHashId = createSceneHeadingHash(sceneHeadingText);
        const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, uniqueSceneHeadingHashId);
        batch.set(uniqueSceneHeadingRef, {
          id: uniqueSceneHeadingHashId,
          text: sceneHeadingText,
          count: 1,
          lastUsed: serverTimestamp(),
          screenplayIds: [screenplayId],
          associated_characters: [],
          associated_elements: [],
        }, { merge: true });

        // Update screenplay metadata counts
        batch.update(screenplayRef, {
          total_blocks_in_screenplay: initialSceneBlocks.length + 1, // +1 for scene heading block itself
          total_scenes_in_screenplay: 1,
          lastModified: serverTimestamp()
        });

        // Update project metadata counts
        const projectDocRef = doc(db, 'projects', projectId);
        batch.update(projectDocRef, {
          total_blocks_count: increment(initialSceneBlocks.length + 1),
          total_scenes_count: increment(1),
          updated_at: serverTimestamp()
        });

        await batch.commit();

        // Reconstruct blocks for editor state after batch commit
        blocks.push({ 
          id: initialSceneId, 
          type: 'scene-heading', 
          content: sceneHeadingText,
          number: 1 
        }); // Use sceneId as the ID for scene heading block in editor
        blocks = blocks.concat(initialSceneBlocks);

        loadedSceneDocuments.push(newSceneDoc); // Add new scene to loaded list
      }

      // --- NEW: Pre-load unique characters and elements for suggestions ---
      const charactersRef = collection(db, `projects/${projectId}/characters`);
      const charactersSnap = await getDocs(charactersRef);
      const loadedCharacters = charactersSnap.docs.map(doc => doc.data() as CharacterDocument);
      console.log(`Loaded ${loadedCharacters.length} unique characters.`);

      const elementsRef = collection(db, `projects/${projectId}/elements`);
      const elementsSnap = await getDocs(elementsRef);
      const loadedElements = elementsSnap.docs.map(doc => doc.data() as ElementDocument);
      console.log(`Loaded ${loadedElements.length} unique elements.`);

      // Load unique scene headings
      const sceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
      const sceneHeadingsQuery = query(sceneHeadingsRef, orderBy('count', 'desc'), limit(20));
      const sceneHeadingsSnap = await getDocs(sceneHeadingsQuery);
      const loadedSceneHeadings = sceneHeadingsSnap.docs.map(doc => doc.data() as UniqueSceneHeadingDocument);
      console.log(`Loaded ${loadedSceneHeadings.length} unique scene headings.`);

      // Get header content from screenplay data or create default
      let header_content = screenplayData.header_content || {
        title: screenplayData.title || '',
        author: screenplayData.metadata?.author || userId,
        contact: ''
      };

      // Load editor state for UI state (not for blocks)
      const editorStateRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/editor/state`);
      const editorStateSnap = await getDoc(editorStateRef);
      
      // Construct editor state with default values
      let editorState: Partial<PersistedEditorState> = {
        activeBlock: blocks.length > 0 ? blocks[0].id : null,
        selectedBlocks: [],
        editingHeader: false,
        header: header_content,
        lastModified: new Date()
      };
      
      // Override with saved editor state if it exists
      if (editorStateSnap.exists()) {
        const savedEditorState = editorStateSnap.data() as PersistedEditorState;
        editorState = {
          ...editorState,
          activeBlock: savedEditorState.activeBlock || editorState.activeBlock,
          selectedBlocks: savedEditorState.selectedBlocks || [],
          editingHeader: savedEditorState.editingHeader || false,
          header: savedEditorState.header || header_content,
          lastModified: savedEditorState.lastModified || new Date()
        };
      }

      // Return the combined screenplay data for the editor
      return {
        screenplayData: {
          ...screenplayData,
          loadedSceneDocuments
        },
        blocks,
        editorState,
        characters: loadedCharacters,
        elements: loadedElements,
        uniqueSceneHeadings: loadedSceneHeadings
      };
    } catch (err) {
      console.error(`Error loading screenplay ${screenplayId}:`, err);
      setError(`Failed to load screenplay details: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { 
    screenplays, 
    loading, 
    error, 
    loadScreenplayDetails 
  };
};