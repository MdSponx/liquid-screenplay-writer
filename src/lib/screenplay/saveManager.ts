import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  segmentBlocksIntoScenes, 
  createSceneHeadingHash, 
  extractCharacterNames
} from '../../utils/blockUtils';
import type { 
  Block, 
  PersistedEditorState, 
  SceneDocument, 
  UniqueSceneHeadingDocument,
  CharacterDocument,
  ElementDocument
} from '../../types';
import type { Screenplay, SaveResult } from '../../types/screenplay';
import { v4 as uuidv4 } from 'uuid';

export class ScreenplaySaveManager {
  private screenplay: Screenplay;
  private userId: string;
  private changeBuffer: Map<string, Block[]>;

  constructor(screenplay: Screenplay, userId: string) {
    this.screenplay = screenplay;
    this.userId = userId;
    this.changeBuffer = new Map();
  }

  public getProjectId(): string {
    return this.screenplay.projectId;
  }

  public updateProjectId(projectId: string): void {
    if (projectId && this.screenplay.projectId !== projectId) {
      console.log(`Updating screenplay projectId from ${this.screenplay.projectId} to ${projectId}`);
      this.screenplay.projectId = projectId;
    }
  }

  public bufferChanges(blocks: Block[]): void {
    this.changeBuffer.set('main', blocks);
  }

  public async saveScreenplay(): Promise<SaveResult> {
    try {
      const screenplayId = this.screenplay.id;
      const projectId = this.screenplay.projectId;

      if (!projectId) {
        console.error('Project ID is missing in screenplay object');
        return {
          success: false,
          error: 'Project ID is required'
        };
      }

      if (!screenplayId) {
        console.error('Screenplay ID is missing in screenplay object');
        return {
          success: false,
          error: 'Screenplay ID is required'
        };
      }

      console.log(`Saving screenplay ${screenplayId} in project ${projectId}`);

      const blocksToSave = this.changeBuffer.get('main') || [];

      if (blocksToSave.length === 0) {
        console.log('No changes to save');
        return { success: true };
      }

      // 1. Fetch existing scenes from Firestore
      const scenesRef = collection(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`);
      const scenesSnapshot = await getDocs(scenesRef);
      
      // Create a map of existing scenes for easy lookup
      const existingScenes = new Map<string, SceneDocument>();
      scenesSnapshot.docs.forEach(doc => {
        existingScenes.set(doc.id, doc.data() as SceneDocument);
      });

      // 2. Segment current blocks into scenes
      const newlySegmentedScenes = segmentBlocksIntoScenes(blocksToSave);
      
      // Set projectId and screenplayId on all scenes
      newlySegmentedScenes.forEach(scene => {
        scene.projectId = projectId;
        scene.screenplayId = screenplayId;
      });

      // 3. Initialize batch operations
      const batch = writeBatch(db);
      
      // 4. Track changes for metadata updates
      let totalBlocksCount = 0;
      const updatedSceneIds = new Set<string>();
      const deletedSceneIds = new Set<string>();
      const updatedSceneHeadings = new Map<string, string>(); // hash -> text
      const updatedCharacters = new Set<string>();

      // 5. Process each new scene
      for (const newScene of newlySegmentedScenes) {
        const sceneId = newScene.id;
        updatedSceneIds.add(sceneId);
        totalBlocksCount += newScene.blocks.length + 1; // +1 for scene heading block
        
        // 5a. Extract characters from this scene
        const characterNames = extractCharacterNames(newScene.blocks);
        
        // 5b. Sync characters to scene
        const characterIds: string[] = [];
        for (const characterName of characterNames) {
          // Check if character exists in project - case insensitive search
          const charactersRef = collection(db, `projects/${projectId}/characters`);
          const characterQuery = query(
            charactersRef, 
            where("name_uppercase", "==", characterName.toUpperCase())
          );
          const characterSnapshot = await getDocs(characterQuery);
          
          let characterId: string;
          
          if (characterSnapshot.empty) {
            // Create new character
            characterId = `character-${uuidv4()}`;
            const characterDoc: CharacterDocument = {
              id: characterId,
              name: characterName,
              name_uppercase: characterName.toUpperCase(),
              screenplayIds: [screenplayId],
              associatedSceneIds: [sceneId],
              projectId: projectId
            };
            
            const characterRef = doc(db, `projects/${projectId}/characters`, characterId);
            batch.set(characterRef, characterDoc);
          } else {
            // Update existing character
            const characterDoc = characterSnapshot.docs[0];
            characterId = characterDoc.id;
            
            batch.update(doc(db, `projects/${projectId}/characters`, characterId), {
              screenplayIds: arrayUnion(screenplayId),
              associatedSceneIds: arrayUnion(sceneId)
            });
          }
          
          characterIds.push(characterId);
          updatedCharacters.add(characterId);
        }
        
        // 5c. Update scene document
        newScene.characters_in_this_scene = characterIds;
        newScene.elements_in_this_scene = []; // Empty array - no automatic element detection
        newScene.lastModified = new Date();
        
        const sceneRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`, sceneId);
        batch.set(sceneRef, newScene);
        
        // 5d. Sync unique scene heading
        const sceneHeadingText = newScene.scene_heading;
        const sceneHeadingHash = createSceneHeadingHash(sceneHeadingText);
        updatedSceneHeadings.set(sceneHeadingHash, sceneHeadingText);
        
        const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);
        const uniqueSceneHeadingSnap = await getDoc(uniqueSceneHeadingRef);
        
        if (uniqueSceneHeadingSnap.exists()) {
          // Update existing unique scene heading
          batch.update(uniqueSceneHeadingRef, {
            lastUsed: serverTimestamp(),
            screenplayIds: arrayUnion(screenplayId),
            associated_characters: arrayUnion(...characterIds)
          });
        } else {
          // Create new unique scene heading
          const uniqueSceneHeadingDoc: UniqueSceneHeadingDocument = {
            id: sceneHeadingHash,
            text: sceneHeadingText,
            text_uppercase: sceneHeadingText.toUpperCase(), // ADD THIS LINE
            count: 1,
            lastUsed: new Date(),
            screenplayIds: [screenplayId],
            associated_characters: characterIds,
            associated_elements: []
          };
          
          batch.set(uniqueSceneHeadingRef, uniqueSceneHeadingDoc);
        }
      }

      // 6. Identify and handle deleted scenes
      for (const [sceneId, sceneData] of existingScenes.entries()) {
        if (!updatedSceneIds.has(sceneId)) {
          // Scene was deleted
          deletedSceneIds.add(sceneId);
          
          // Delete scene document
          const sceneRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/scenes`, sceneId);
          batch.delete(sceneRef);
          
          // Update unique scene heading
          const sceneHeadingHash = createSceneHeadingHash(sceneData.scene_heading);
          const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);
          
          // Remove this screenplay from the unique scene heading's screenplayIds
          batch.update(uniqueSceneHeadingRef, {
            screenplayIds: arrayRemove(screenplayId)
          });
          
          // Update characters and elements
          for (const characterId of sceneData.characters_in_this_scene) {
            const characterRef = doc(db, `projects/${projectId}/characters`, characterId);
            batch.update(characterRef, {
              associatedSceneIds: arrayRemove(sceneId)
            });
          }
          
          for (const elementId of sceneData.elements_in_this_scene) {
            const elementRef = doc(db, `projects/${projectId}/elements`, elementId);
            batch.update(elementRef, {
              associatedSceneIds: arrayRemove(sceneId)
            });
          }
        }
      }

      // 7. Update screenplay metadata
      const screenplayRef = doc(db, `projects/${projectId}/screenplays`, screenplayId);
      batch.update(screenplayRef, {
        total_blocks_in_screenplay: totalBlocksCount,
        total_scenes_in_screenplay: newlySegmentedScenes.length,
        lastModified: serverTimestamp(),
        version: increment(1)
      });

      // 8. Update project metadata
      const projectRef = doc(db, 'projects', projectId);
      
      let netBlockChange = totalBlocksCount;
      let netSceneChange = newlySegmentedScenes.length;
      
      for (const sceneId of deletedSceneIds) {
        const deletedScene = existingScenes.get(sceneId);
        if (deletedScene) {
          netBlockChange -= (deletedScene.blocks.length + 1);
          netSceneChange -= 1;
        }
      }
      
      batch.update(projectRef, {
        total_blocks_count: increment(netBlockChange),
        total_scenes_count: increment(netSceneChange),
        updated_at: serverTimestamp()
      });

      // 9. Update editor state (without blocks)
      const editorStateRef = doc(db, `projects/${projectId}/screenplays/${screenplayId}/editor/state`);
      const editorStateSnap = await getDoc(editorStateRef);
      
      if (editorStateSnap.exists()) {
        const currentEditorState = editorStateSnap.data() as PersistedEditorState;
        
        batch.update(editorStateRef, {
          lastModified: serverTimestamp()
        });
      }

      // 10. Commit all changes
      await batch.commit();
      console.log(`Successfully saved screenplay ${screenplayId} with ${newlySegmentedScenes.length} scenes and ${totalBlocksCount} blocks`);
      
      this.changeBuffer.clear();
      return { success: true };
    } catch (err) {
      console.error('Failed to save screenplay:', err);
      return {
        success: false,
        error: 'Failed to save screenplay'
      };
    }
  }

  public cleanup(): void {
    this.changeBuffer.clear();
  }
}