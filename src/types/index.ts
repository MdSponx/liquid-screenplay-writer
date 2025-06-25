import { MutableRefObject } from 'react';
import { Timestamp } from 'firebase/firestore';

export interface Block {
  id: string;
  type: string;
  content: string;
  number?: number;
}

export interface ScreenplayEditorProps {
  isDarkMode: boolean;
  zoomLevel: number;
}

export interface BlockComponentProps {
  block: Block;
  isDarkMode: boolean;
  onContentChange: (id: string, content: string, type?: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, blockId: string) => void;
  onFocus: (id: string) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onDoubleClick?: (id: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  isActive: boolean;
  blockRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export interface BlockStyleProps {
  type: string;
  isDarkMode: boolean;
  isSelected: boolean;
}

// Client-side editor state that includes history (not persisted to Firestore)
export interface EditorState {
  blocks: Block[];
  activeBlock: string | null;
  selectedBlocks: Set<string>;
  textContent: Record<string, string>;
  header: {
    title: string;
    author: string;
    contact: string;
  };
  editingHeader: boolean;
  undoStack: Block[][];
  redoStack: Block[][];
}

// Persisted editor state (saved to Firestore)
export interface PersistedEditorState {
  activeBlock: string | null;
  selectedBlocks: string[];
  header: {
    title: string;
    author: string;
    contact: string;
  };
  editingHeader: boolean;
  lastModified: Date;
}

export interface BlockHandlers {
  handleContentChange: (id: string, content: string, type?: string) => void;
  handleEnterKey: (blockId: string, element: HTMLDivElement) => string;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, blockId: string) => void;
  handleBlockClick: (id: string, e: React.MouseEvent) => void;
  handleBlockDoubleClick: (id: string, e: React.MouseEvent) => void;
  handleFormatChange: (type: string) => void;
  handleMouseDown: (id: string, e: React.MouseEvent) => void;
}

// New interfaces for Firestore document structures

export interface SceneDocument {
  id: string; // Corresponds to Scene Heading Block ID
  scene_heading: string;
  blocks: Block[]; // Blocks within this specific scene
  order: number; // Order of scene in screenplay
  screenplayId: string;
  projectId: string;
  characters_in_this_scene: string[]; // Character IDs present in this scene
  elements_in_this_scene: string[]; // Element IDs present in this scene
  lastModified: Timestamp;
}

export interface UniqueSceneHeadingDocument {
  id: string; // Hash of scene heading text (e.g., using SHA-256)
  text: string;
  text_uppercase?: string; // NEW FIELD: Uppercase version for querying
  count: number; // Number of times this unique scene heading is used in the project
  lastUsed: Timestamp;
  screenplayIds: string[]; // List of screenplay IDs using this scene heading
  associated_characters: string[]; // Character IDs often associated with this scene heading
  associated_elements: string[]; // Element IDs often associated with this scene heading
}

export interface CharacterDocument {
  id: string; // Unique ID for the character
  name: string; // e.g., "SARAH"
  name_uppercase?: string; // Uppercase version for case-insensitive matching
  full_name?: string; // e.g., "Sarah Connor"
  description?: string;
  role?: string;
  gender?: string;
  age?: string;
  screenplayIds: string[]; // List of screenplay IDs this character appears in
  associatedSceneIds: string[]; // List of scene IDs this character appears in
  projectId: string; // Parent Project ID
  createdAt?: Timestamp; // When the character was created
  createdBy?: string; // User ID who created the character
  lastUpdated?: Timestamp; // When the character was last updated
}

export interface ElementDocument {
  id: string; // Unique ID for the element
  name: string;
  type: 'Prop' | 'Location' | 'Costume' | 'Sound' | 'Visual Effect' | 'Other';
  description?: string;
  screenplayIds: string[]; // List of screenplay IDs this element appears in
  associatedSceneIds: string[]; // List of scene IDs this element appears in
  projectId: string; // Parent Project ID
}
