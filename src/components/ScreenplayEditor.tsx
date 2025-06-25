import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditorState } from '../hooks/useEditorState';
import { useBlockHandlers } from '../hooks/useBlockHandlers';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useScreenplaySave } from '../hooks/useScreenplaySave';
import { useCharacterTracking } from '../hooks/useCharacterTracking';
import { organizeBlocksIntoPages } from '../utils/blockUtils';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, where, updateDoc, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import BlockComponent from './BlockComponent';
import FormatButtons from './ScreenplayEditor/FormatButtons';
import Page from './ScreenplayEditor/Page';
import { useHotkeys } from '../hooks/useHotkeys';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import ScreenplayNavigator from './ScreenplayNavigator';
import type { Block, PersistedEditorState, CharacterDocument, SceneDocument, UniqueSceneHeadingDocument } from '../types';

const ScreenplayEditor: React.FC = () => {
  const { projectId, screenplayId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [documentTitle, setDocumentTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterDocument[]>([]);
  const [uniqueSceneHeadings, setUniqueSceneHeadings] = useState<UniqueSceneHeadingDocument[]>([]);

  const screenplayData = location.state?.screenplayData;
  const initialBlocks = location.state?.blocks || [];

  const {
    state,
    setState,
    addToHistory,
    handleUndo,
    handleRedo,
    updateBlocks,
    selectAllBlocks,
  } = useEditorState();

  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const {
    isSaving,
    hasChanges,
    error: saveError,
    handleSave,
    setHasChanges
  } = useScreenplaySave(projectId || '', screenplayId || '', user?.id || '', state.blocks, state.activeBlock);

  // Initialize character tracking
  const {
    characters: trackedCharacters,
    loading: charactersLoading,
    error: charactersError,
    addCharacter,
    syncCharactersFromBlocks
  } = useCharacterTracking({
    projectId: projectId,
    screenplayId: screenplayId || null,
    blocks: state.blocks,
    userId: user?.id || ''
  });

  // Update characters state when trackedCharacters changes
  useEffect(() => {
    if (trackedCharacters.length > 0) {
      setCharacters(trackedCharacters);
    }
  }, [trackedCharacters]);

  // Fetch unique scene headings
  const fetchUniqueSceneHeadings = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const sceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
      const sceneHeadingsQuery = query(sceneHeadingsRef, orderBy('count', 'desc'), limit(20));
      const snapshot = await getDocs(sceneHeadingsQuery);
      
      const headings = snapshot.docs.map(doc => doc.data() as UniqueSceneHeadingDocument);
      setUniqueSceneHeadings(headings);
      console.log(`Loaded ${headings.length} unique scene headings`);
    } catch (err) {
      console.error('Error fetching unique scene headings:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchUniqueSceneHeadings();
  }, [projectId, fetchUniqueSceneHeadings]);

  const updateEditorState = useCallback(async () => {
    if (!projectId || !screenplayId || !user?.id) {
      console.warn('Cannot update editor state: Missing project ID, screenplay ID, or user ID.');
      return;
    }

    try {
      const editorStateRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/editor/state`);

      const persistedEditorState: PersistedEditorState = {
        activeBlock: state.activeBlock,
        selectedBlocks: Array.from(state.selectedBlocks),
        editingHeader: state.editingHeader,
        header: typeof state.header === 'object'
          ? state.header
          : {
              title: typeof state.header === 'string' ? state.header : documentTitle,
              author: screenplayData?.metadata?.author || user.email,
              contact: ''
            },
        lastModified: new Date()
      };

      await setDoc(editorStateRef, persistedEditorState, { merge: true });
      console.log(`Updated editor state for screenplay ${screenplayId}`);
    } catch (err) {
      console.error('Error updating editor state:', err);
    }
  }, [projectId, screenplayId, user?.id, user?.email, state.activeBlock, state.selectedBlocks, state.header, state.editingHeader, documentTitle, screenplayData]);

  const handleSaveWithEditorState = useCallback(async () => {
    try {
      await updateEditorState();
      return await handleSave();
    } catch (err) {
      console.error('Error saving screenplay:', err);
      return { success: false, error: 'Failed to save screenplay' };
    }
  }, [handleSave, updateEditorState]);

  // Create a wrapper function for setSelectedBlocks that handles both direct values and functions
  const setSelectedBlocks = useCallback((blocksOrFunction: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (typeof blocksOrFunction === 'function') {
      setState(prev => ({ ...prev, selectedBlocks: blocksOrFunction(prev.selectedBlocks) }));
    } else {
      setState(prev => ({ ...prev, selectedBlocks: blocksOrFunction }));
    }
  }, [setState]);

  const {
    handleContentChange,
    handleEnterKey,
    handleKeyDown,
    handleBlockClick,
    handleBlockDoubleClick,
    handleFormatChange,
    handleMouseDown,
  } = useBlockHandlers(
    {
      blocks: state.blocks,
      activeBlock: state.activeBlock,
      textContent: state.textContent,
      selectedBlocks: state.selectedBlocks
    },
    blockRefs,
    addToHistory,
    updateBlocks,
    setSelectedBlocks,
    setHasChanges,
    projectId,
    screenplayId,
    fetchUniqueSceneHeadings
  );

  useAutoScroll(state.activeBlock, state.blocks, blockRefs);

  useHotkeys({
    handleUndo,
    handleRedo,
    selectAllBlocks,
    blocks: state.blocks,
    activeBlock: state.activeBlock,
    handleFormatChange,
  });

  useEffect(() => {
    setHasChanges(true);
  }, [state.blocks, setHasChanges]);

  useEffect(() => {
    const fetchScreenplayContent = async () => {
      if (!projectId || !screenplayId || !user?.id) {
        setError('Missing required parameters: project ID, screenplay ID, or user ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch screenplay metadata first
        const screenplayMetaRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}`);
        const screenplayMetaSnap = await getDoc(screenplayMetaRef);

        if (!screenplayMetaSnap.exists()) {
          setError('Screenplay not found');
          setLoading(false);
          return;
        }
        const currentScreenplayData = screenplayMetaSnap.data();
        setDocumentTitle(currentScreenplayData?.title || 'Untitled Screenplay');

        // Fetch scenes collection to get blocks
        const scenesRef = collection(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`);
        const scenesQuerySnap = await getDocs(query(scenesRef, orderBy('order')));

        let blocks: Block[] = [];

        if (!scenesQuerySnap.empty) {
          const loadedSceneDocuments = scenesQuerySnap.docs.map(doc => doc.data() as SceneDocument);
          
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
          console.log(`No scenes found for screenplay ${screenplayId}, using default blocks.`);
          
          // Generate a unique scene ID for the initial scene heading
          const sceneId = `scene-${uuidv4()}`;
          
          // Generate a unique block ID for the initial action block
          const actionBlockId = `block-${uuidv4()}`;
          
          // Create initial blocks with proper IDs
          blocks = [
            {
              id: sceneId,
              type: 'scene-heading',
              content: 'INT. LOCATION - DAY',
              number: 1
            },
            {
              id: actionBlockId,
              type: 'action',
              content: 'Write your scene description here.'
            }
          ];
          
          // Create the scene document in Firestore
          const sceneDocRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`, sceneId);
          
          const newSceneDoc: SceneDocument = {
            id: sceneId,
            scene_heading: 'INT. LOCATION - DAY',
            blocks: [
              {
                id: actionBlockId,
                type: 'action',
                content: 'Write your scene description here.'
              }
            ],
            order: 0,
            screenplayId: screenplayId,
            projectId: projectId,
            characters_in_this_scene: [],
            elements_in_this_scene: [],
            lastModified: Timestamp.now()
          };
          
          await setDoc(sceneDocRef, newSceneDoc);
        }

        // Fetch characters and elements for suggestions
        console.log(`Fetching characters for project ${projectId}`);
        const charactersRef = collection(db, `projects/${projectId}/characters`);
        const charactersSnap = await getDocs(charactersRef);
        const loadedCharacters = charactersSnap.docs.map(doc => doc.data() as CharacterDocument);
        console.log(`Loaded ${loadedCharacters.length} unique characters:`, loadedCharacters);
        setCharacters(loadedCharacters);

        // Fetch unique scene headings
        const sceneHeadingsRef = collection(db, `projects/${projectId}/unique_scene_headings`);
        const sceneHeadingsQuery = query(sceneHeadingsRef, orderBy('count', 'desc'), limit(20));
        const sceneHeadingsSnap = await getDocs(sceneHeadingsQuery);
        const loadedSceneHeadings = sceneHeadingsSnap.docs.map(doc => doc.data() as UniqueSceneHeadingDocument);
        console.log(`Loaded ${loadedSceneHeadings.length} unique scene headings`);
        setUniqueSceneHeadings(loadedSceneHeadings);

        // Then try to load editor state (for UI state, not for blocks)
        const editorStateRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/editor/state`);
        const editorStateSnap = await getDoc(editorStateRef);

        // Get header content from screenplay data or create default
        let header_content = currentScreenplayData?.header_content || {
          title: currentScreenplayData?.title || '',
          author: currentScreenplayData?.metadata?.author || user.email,
          contact: ''
        };

        if (editorStateSnap.exists()) {
          const editorState = editorStateSnap.data();
          console.log(`Found editor state for screenplay ${screenplayId}`);

          setState(prev => ({
            ...prev,
            blocks: blocks,
            activeBlock: editorState.activeBlock || (blocks.length > 0 ? blocks[0].id : null),
            selectedBlocks: new Set(editorState.selectedBlocks || []),
            header: editorState.header || header_content,
            editingHeader: editorState.editingHeader || false
          }));
        } else {
          console.log(`No editor state found for screenplay ${screenplayId}, creating default state`);

          setState(prev => ({
            ...prev,
            blocks: blocks,
            activeBlock: blocks.length > 0 ? blocks[0].id : null,
            header: header_content
          }));

          // Create default editor state
          const newEditorState: PersistedEditorState = {
            activeBlock: blocks.length > 0 ? blocks[0].id : null,
            selectedBlocks: [],
            editingHeader: false,
            header: header_content,
            lastModified: new Date()
          };

          await setDoc(editorStateRef, newEditorState);
        }
      } catch (err) {
        console.error('Error fetching screenplay data:', err);
        setError('Failed to load screenplay data');
      } finally {
        setLoading(false);
      }
    };

    // Prioritize initialBlocks from location state if available, otherwise fetch from DB
    if (initialBlocks && initialBlocks.length > 0) {
      console.log("Initializing editor with blocks from location state.");
      setState(prev => ({
        ...prev,
        blocks: initialBlocks,
        header: screenplayData?.header_content || { 
          title: screenplayData?.title || 'Untitled Screenplay', 
          author: screenplayData?.metadata?.author || user?.email, 
          contact: '' 
        }
      }));
      
      // Also set characters if available in location state
      if (location.state?.characters) {
        setCharacters(location.state.characters);
      }
      
      // Set unique scene headings if available
      if (location.state?.uniqueSceneHeadings) {
        setUniqueSceneHeadings(location.state.uniqueSceneHeadings);
      }
      
      setDocumentTitle(screenplayData?.title || 'Untitled Screenplay');
      setLoading(false);
    } else {
      fetchScreenplayContent();
    }
  }, [projectId, screenplayId, setState, initialBlocks, screenplayData, user?.id, user?.email]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92] dark:text-gray-400">Loading screenplay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const pages = organizeBlocksIntoPages(state.blocks);

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenplayNavigator
        projectId={projectId}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        documentTitle={documentTitle}
        setDocumentTitle={setDocumentTitle}
        onSave={handleSaveWithEditorState}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />

      <div className="flex-1 overflow-auto screenplay-content relative user-select-text mt-28" data-screenplay-editor="true">
        <div 
          className="max-w-[210mm] mx-auto my-8 screenplay-pages pb-24"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center'
          }}
          data-screenplay-pages="true"
        >
          <div className={`rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <div className="relative user-select-text">
                {pages.map((pageBlocks, pageIndex) => (
                  <Page
                    key={pageIndex}
                    pageIndex={pageIndex}
                    blocks={pageBlocks}
                    isDarkMode={isDarkMode}
                    header={state.header as any}
                    editingHeader={state.editingHeader}
                    onHeaderChange={(newHeader) => setState(prev => ({ 
                      ...prev, 
                      header: { 
                        title: newHeader, 
                        author: (prev.header as any)?.author || user?.email || '', 
                        contact: (prev.header as any)?.contact || '' 
                      } 
                    }))}
                    onEditingHeaderChange={(editingHeader) => setState(prev => ({ ...prev, editingHeader }))}
                    onContentChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    onBlockFocus={(id) => setState(prev => ({ ...prev, activeBlock: id }))}
                    onBlockClick={handleBlockClick}
                    onBlockDoubleClick={handleBlockDoubleClick}
                    onBlockMouseDown={handleMouseDown}
                    selectedBlocks={state.selectedBlocks}
                    activeBlock={state.activeBlock}
                    blockRefs={blockRefs}
                    projectCharacters={characters}
                    projectElements={[]}
                    projectId={projectId}
                    screenplayId={screenplayId}
                    projectUniqueSceneHeadings={uniqueSceneHeadings}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <FormatButtons
          isDarkMode={isDarkMode}
          activeBlock={state.activeBlock}
          onFormatChange={handleFormatChange}
          blocks={state.blocks}
          className="format-buttons"
        />
      </div>

      {saveError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {saveError}
        </div>
      )}
    </div>
  );
};

export default ScreenplayEditor;
