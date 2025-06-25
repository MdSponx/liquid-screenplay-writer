import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  updateDoc,
  increment,
  collection,
  query,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ScreenplaySaveManager } from '../lib/screenplay/saveManager';
import { segmentBlocksIntoScenes } from '../utils/blockUtils';
import type { Block, PersistedEditorState, SceneDocument } from '../types';
import type { SaveResult } from '../types/screenplay';

export const useScreenplaySave = (
  projectId: string | undefined,
  screenplayId: string | null,
  userId: string,
  blocks: Block[],
  activeBlock: string | null
) => {
  // Reference to the save manager
  const saveManagerRef = useRef<ScreenplaySaveManager | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate required parameters
  useEffect(() => {
    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    if (!screenplayId) {
      setError('Screenplay ID is required');
      return;
    }

    if (!userId) {
      setError('User ID is required');
      return;
    }

    // Clear error if all required parameters are present
    setError(null);
  }, [projectId, screenplayId, userId]);

  // Initialize save manager when component mounts
  useEffect(() => {
    const initializeSaveManager = async () => {
      if (!projectId || !userId || !screenplayId) {
        console.warn('Missing required parameters for save manager initialization');
        return;
      }
      
      try {
        console.log(`Initializing save manager with projectId: ${projectId}, screenplayId: ${screenplayId}`);
        
        // Get the screenplay data
        const screenplayRef = doc(db, `projects/${projectId}/screenplays`, screenplayId);
        const screenplaySnap = await getDoc(screenplayRef);
        
        if (screenplaySnap.exists()) {
          const screenplayData = screenplaySnap.data();
          
          // Ensure the screenplay data has the correct IDs
          const screenplay = {
            ...screenplayData,
            id: screenplayId,
            projectId: projectId
          };
          
          // Create a new save manager instance
          saveManagerRef.current = new ScreenplaySaveManager(screenplay, userId);
          console.log('Save manager initialized with existing screenplay data');
        } else {
          console.log('Screenplay not found, creating default save manager');
          
          // Create a default screenplay data object with explicit IDs
          const defaultScreenplayData = {
            id: screenplayId,
            title: 'Untitled Screenplay',
            projectId: projectId,
            ownerId: userId,
            collaborators: [userId],
            status: 'Draft',
            metadata: {
              format: 'Movie',
              author: userId
            },
            total_blocks_in_screenplay: 0,
            total_scenes_in_screenplay: 0,
            header_content: {
              title: 'Untitled Screenplay',
              author: userId,
              contact: ''
            }
          };
          
          // Create a new save manager instance with the default screenplay
          saveManagerRef.current = new ScreenplaySaveManager(defaultScreenplayData, userId);
        }
        
        // Buffer initial blocks if available
        if (saveManagerRef.current && blocks.length > 0) {
          saveManagerRef.current.bufferChanges(blocks);
        }
      } catch (err) {
        console.error('Error initializing save manager:', err);
        setError('Failed to initialize save manager');
      }
    };
    
    initializeSaveManager();
    
    // Cleanup save manager on unmount
    return () => {
      if (saveManagerRef.current) {
        saveManagerRef.current.cleanup();
        saveManagerRef.current = null;
      }
    };
  }, [projectId, userId, screenplayId, blocks]);

  // Watch for changes to mark content as unsaved
  useEffect(() => {
    setHasChanges(true);
    
    // Buffer changes in save manager
    if (saveManagerRef.current && blocks.length > 0) {
      saveManagerRef.current.bufferChanges(blocks);
    }
  }, [blocks]);

  const handleSave = useCallback(async (): Promise<SaveResult> => {
    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }

    if (!screenplayId) {
      return { success: false, error: 'Screenplay ID is required' };
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsSaving(true);
    setError(null);

    try {
      // If we have a save manager, use it
      if (saveManagerRef.current) {
        console.log(`Using save manager to save screenplay ${screenplayId} in project ${projectId}`);
        
        // Ensure the save manager has the correct project ID
        saveManagerRef.current.updateProjectId(projectId);
        
        const result = await saveManagerRef.current.saveScreenplay();
        
        if (result.success) {
          setHasChanges(false);
        } else {
          setError(result.error || 'Failed to save screenplay');
        }
        
        return result;
      }
      
      // Fallback to direct save if save manager is not available
      console.log(`Save manager not available, using direct save for screenplay ${screenplayId} in project ${projectId}`);
      
      // Segment blocks into scenes
      const scenes = segmentBlocksIntoScenes(blocks);
      
      // Set projectId and screenplayId on all scenes
      scenes.forEach(scene => {
        scene.projectId = projectId;
        scene.screenplayId = screenplayId;
        scene.lastModified = new Date();
      });
      
      // Save each scene
      for (const scene of scenes) {
        const sceneRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`, scene.id);
        await setDoc(sceneRef, scene, { merge: true });
      }
      
      // Update screenplay metadata
      const screenplayRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}`);
      await updateDoc(screenplayRef, {
        total_blocks_in_screenplay: blocks.length,
        total_scenes_in_screenplay: scenes.length,
        lastModified: serverTimestamp(),
        version: increment(1)
      });
      
      // Update editor state (without blocks)
      const editorStateRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/editor/state`);
      const editorStateSnap = await getDoc(editorStateRef);
      
      const persistedEditorState: Partial<PersistedEditorState> = {
        activeBlock: activeBlock,
        selectedBlocks: [],
        editingHeader: false,
        lastModified: new Date()
      };
      
      if (editorStateSnap.exists()) {
        await updateDoc(editorStateRef, persistedEditorState);
      } else {
        await setDoc(editorStateRef, {
          ...persistedEditorState,
          header: { 
            title: 'Untitled Screenplay', 
            author: userId, 
            contact: '' 
          }
        });
      }

      setHasChanges(false);
      return { success: true };
    } catch (err) {
      console.error('Error saving screenplay:', err);
      const errorMessage = 'Failed to save screenplay';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, [projectId, screenplayId, userId, blocks, activeBlock]);

  return {
    isSaving,
    hasChanges,
    error,
    handleSave,
    setHasChanges
  };
};