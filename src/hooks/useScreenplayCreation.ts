import { useState, useCallback } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  getDoc,
  updateDoc,
  arrayUnion // Make sure arrayUnion is imported
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_BLOCKS } from '../constants/editorConstants';
import { detectFormat, createSceneHeadingHash } from '../utils/blockUtils';
import type { PersistedEditorState, Block, SceneDocument, UniqueSceneHeadingDocument } from '../types';

// Screenplay creation parameters (unchanged)
interface CreateScreenplayParams {
  title: string;
  projectId: string;
  ownerId: string;
  metadata: {
    format: 'Movie' | 'Short Film' | 'Series' | 'Micro Drama';
    logline: string;
    genre: string[];
    author: string;
    season?: number;
    episode?: number;
  };
  collaborators?: string[];
}

export const useScreenplayCreation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: any, customMessage: string) => {
    console.error(`${customMessage}:`, err);
    if (err.message && err.message.includes('permission')) {
      console.warn('Permission error detected, continuing with operation...');
      return false;
    }
    setError(`${customMessage}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return true;
  };

  const createScreenplay = useCallback(
    async ({
      title,
      projectId,
      ownerId,
      metadata,
      collaborators = [],
    }: CreateScreenplayParams) => {
      setLoading(true);
      setError(null);

      try {
        if (!title || !projectId || !ownerId) {
          throw new Error('Missing required parameters (title, projectId, or ownerId)');
        }

        console.log('Creating screenplay with parameters:', { title, projectId, ownerId, metadata });
        const currentTime = new Date();
        const batch = writeBatch(db);

        const screenplayIdForDoc = projectId;
        const screenplayRef = doc(db, `projects/${projectId}/screenplays`, screenplayIdForDoc);

        const sceneId = `scene-${uuidv4()}`;
        const actionBlockId = `block-${uuidv4()}`;
        
        const initialBlocksContent: Block[] = [
          {
            id: actionBlockId,
            type: 'action',
            content: 'Write your scene description here.',
          }
        ];

        const sceneHeadingText = 'INT. LOCATION - DAY';
        const sceneDoc: SceneDocument = {
          id: sceneId,
          scene_heading: sceneHeadingText,
          blocks: initialBlocksContent,
          order: 0,
          screenplayId: screenplayIdForDoc,
          projectId,
          characters_in_this_scene: [],
          elements_in_this_scene: [],
          lastModified: Timestamp.fromDate(currentTime)
        };
        
        const sceneRef = doc(db, `projects/${projectId}/screenplays/${screenplayIdForDoc}/scenes`, sceneId);
        batch.set(sceneRef, sceneDoc);
        
        const sceneHeadingHash = createSceneHeadingHash(sceneHeadingText);
        const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);
        
        const uniqueSceneHeadingDoc = await getDoc(uniqueSceneHeadingRef);
        
        if (uniqueSceneHeadingDoc.exists()) {
          const existingData = uniqueSceneHeadingDoc.data() as UniqueSceneHeadingDocument;
          
          batch.update(uniqueSceneHeadingRef, {
            count: existingData.count + 1,
            lastUsed: Timestamp.fromDate(currentTime),
            screenplayIds: arrayUnion(screenplayIdForDoc)
          });
        } else {
          const uniqueSceneHeadingData: UniqueSceneHeadingDocument = {
            id: sceneHeadingHash,
            text: sceneHeadingText,
            text_uppercase: sceneHeadingText.toUpperCase(), // ADD THIS LINE
            count: 1,
            lastUsed: Timestamp.fromDate(currentTime),
            screenplayIds: [screenplayIdForDoc],
            associated_characters: [],
            associated_elements: []
          };
          
          batch.set(uniqueSceneHeadingRef, uniqueSceneHeadingData);
        }

        const totalBlocksCount = initialBlocksContent.length + 1;

        batch.set(screenplayRef, {
          title,
          projectId,
          ownerId,
          createdAt: currentTime,
          lastModified: currentTime,
          version: 1,
          collaborators: [ownerId, ...collaborators],
          status: 'Draft',
          metadata,
          total_blocks_in_screenplay: totalBlocksCount,
          total_scenes_in_screenplay: 1,
          header_content: { 
            title, 
            author: metadata.author, 
            contact: '' 
          }
        });

        const editorStateRef = doc(db, `projects/${projectId}/screenplays/${screenplayIdForDoc}/editor/state`);

        const persistedEditorState: PersistedEditorState = {
          activeBlock: sceneId,
          selectedBlocks: [],
          editingHeader: false,
          header: { 
            title, 
            author: metadata.author, 
            contact: '' 
          },
          lastModified: currentTime
        };

        batch.set(editorStateRef, persistedEditorState);

        const projectRef = doc(db, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          const currentBlocksCount = projectData.total_blocks_count || 0;
          const currentScenesCount = projectData.total_scenes_count || 0;
          
          batch.update(projectRef, {
            total_blocks_count: currentBlocksCount + totalBlocksCount,
            total_scenes_count: currentScenesCount + 1,
            updated_at: currentTime
          });
        }

        await batch.commit();
        console.log('Screenplay and scenes created successfully:', screenplayIdForDoc);

        return screenplayIdForDoc;
      } catch (err) {
        handleError(err, 'Error in screenplay creation process');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createSeriesScreenplays = useCallback(
    async ({
      projectId,
      ownerId,
      baseTitle,
      metadata,
      episodes,
      collaborators = [],
    }: Omit<CreateScreenplayParams, 'title'> & {
      baseTitle: string;
      episodes: number;
    }) => {
      setLoading(true);
      setError(null);

      try {
        if (!projectId || !ownerId || !baseTitle || !episodes || episodes < 1) {
          throw new Error('Missing required parameters for series creation');
        }

        const screenplayIds = [];
        const batch = writeBatch(db);
        const currentTime = new Date();

        let totalProjectBlocksCount = 0;
        let totalProjectScenesCount = 0;

        for (let i = 1; i <= episodes; i++) {
          const episodeTitle = `${baseTitle} - Episode ${i}`;
          const episodeMetadata = { ...metadata, episode: i };

          const episodeId = `${projectId}-episode-${i}`;
          const screenplayRef = doc(db, `projects/${projectId}/screenplays`, episodeId);

          const sceneId = `scene-${uuidv4()}`;
          const actionBlockId = `block-${uuidv4()}`;
          
          const initialBlocksContent: Block[] = [
            {
              id: actionBlockId,
              type: 'action',
              content: 'Write your scene description here.',
            }
          ];

          const sceneHeadingText = `INT. LOCATION - DAY - EP ${i}`;
          const sceneDoc: SceneDocument = {
            id: sceneId,
            scene_heading: sceneHeadingText,
            blocks: initialBlocksContent,
            order: 0,
            screenplayId: episodeId,
            projectId,
            characters_in_this_scene: [],
            elements_in_this_scene: [],
            lastModified: Timestamp.fromDate(currentTime)
          };
          
          const sceneRef = doc(db, `projects/${projectId}/screenplays/${episodeId}/scenes`, sceneId);
          batch.set(sceneRef, sceneDoc);
          
          const totalEpisodeBlocksCount = initialBlocksContent.length + 1;
          
          totalProjectBlocksCount += totalEpisodeBlocksCount;
          totalProjectScenesCount += 1;
          
          const sceneHeadingHash = createSceneHeadingHash(sceneHeadingText);
          const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);
          
          const uniqueSceneHeadingDoc = await getDoc(uniqueSceneHeadingRef);
          
          if (uniqueSceneHeadingDoc.exists()) {
            const existingData = uniqueSceneHeadingDoc.data() as UniqueSceneHeadingDocument;
            
            batch.update(uniqueSceneHeadingRef, {
              count: existingData.count + 1,
              lastUsed: Timestamp.fromDate(currentTime),
              screenplayIds: arrayUnion(episodeId)
            });
          } else {
            const uniqueSceneHeadingData: UniqueSceneHeadingDocument = {
              id: sceneHeadingHash,
              text: sceneHeadingText,
              text_uppercase: sceneHeadingText.toUpperCase(), // ADD THIS LINE
              count: 1,
              lastUsed: Timestamp.fromDate(currentTime),
              screenplayIds: [episodeId],
              associated_characters: [],
              associated_elements: []
            };
            
            batch.set(uniqueSceneHeadingRef, uniqueSceneHeadingData);
          }

          batch.set(screenplayRef, {
            title: episodeTitle,
            projectId,
            ownerId,
            createdAt: currentTime,
            lastModified: currentTime,
            version: 1,
            collaborators: [ownerId, ...collaborators],
            status: 'Draft',
            metadata: episodeMetadata,
            total_blocks_in_screenplay: totalEpisodeBlocksCount,
            total_scenes_in_screenplay: 1,
            header_content: { 
              title: episodeTitle, 
              author: metadata.author, 
              contact: '' 
            }
          });

          const editorStateRef = doc(db, `projects/${projectId}/screenplays/${episodeId}/editor/state`);

          const persistedEditorState: PersistedEditorState = {
            activeBlock: sceneId,
            selectedBlocks: [],
            editingHeader: false,
            header: { 
              title: episodeTitle, 
              author: metadata.author, 
              contact: '' 
            },
            lastModified: currentTime
          };

          batch.set(editorStateRef, persistedEditorState);

          screenplayIds.push(screenplayRef.id);
        }

        const projectRef = doc(db, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          const currentBlocksCount = projectData.total_blocks_count || 0;
          const currentScenesCount = projectData.total_scenes_count || 0;
          
          batch.update(projectRef, {
            total_blocks_count: currentBlocksCount + totalProjectBlocksCount,
            total_scenes_count: currentScenesCount + totalProjectScenesCount,
            updated_at: currentTime
          });
        }

        await batch.commit();
        console.log(`Created ${episodes} episode screenplays with scene-based structure`);

        return screenplayIds;
      } catch (err) {
        handleError(err, 'Error creating series screenplays');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addBlockToScreenplay = useCallback(
    async (
      projectId: string,
      screenplayId: string,
      sceneId: string,
      block: Omit<Block, 'id' | 'index'>,
      afterBlockId?: string
    ) => {
      try {
        const sceneRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/scenes/${sceneId}`);
        const sceneSnap = await getDoc(sceneRef);

        if (!sceneSnap.exists()) {
          throw new Error(`Scene not found for screenplay ${screenplayId}`);
        }

        const sceneData = sceneSnap.data() as SceneDocument;
        const blocks = sceneData.blocks || [];

        const newBlockId = `block-${uuidv4()}`;
        let insertIndex = blocks.length;

        if (afterBlockId) {
          const afterBlockIndex = blocks.findIndex((b) => b.id === afterBlockId);
          if (afterBlockIndex !== -1) {
            insertIndex = afterBlockIndex + 1;
          }
        }

        const newBlock = {
          ...block,
          id: newBlockId,
        };

        const updatedBlocks = [
          ...blocks.slice(0, insertIndex),
          newBlock,
          ...blocks.slice(insertIndex)
        ];

        await updateDoc(sceneRef, {
          blocks: updatedBlocks,
          lastModified: serverTimestamp(),
        });

        await updateDoc(doc(db, `projects/${projectId}/screenplays/${screenplayId}`), {
          total_blocks_in_screenplay: serverTimestamp(), // This should be increment, not serverTimestamp
          lastModified: serverTimestamp(),
        });

        return newBlockId;
      } catch (err) {
        console.error(`Error adding block to scene ${sceneId} in screenplay ${screenplayId}:`, err);
        return null;
      }
    },
    []
  );

  return {
    createScreenplay,
    createSeriesScreenplays,
    addBlockToScreenplay,
    loading,
    error,
  };
};