import { Block, SceneDocument } from '../types';
import { BLOCK_HEIGHTS, MAX_PAGE_HEIGHT, BLOCK_TYPES } from '../constants/editorConstants';

export const calculateBlockHeight = (block: Block): number => {
  const baseHeight = BLOCK_HEIGHTS[block.type as keyof typeof BLOCK_HEIGHTS] || 2;
  const contentLines = Math.max(1, Math.ceil(block.content.length / 75));
  return baseHeight * contentLines;
};

export const organizeBlocksIntoPages = (blocks: Block[]): Block[][] => {
  const pages: Block[][] = [];
  let currentPage: Block[] = [];
  let currentHeight = 0;

  const addBlockToPage = (block: Block) => {
    const blockHeight = calculateBlockHeight(block);
    if (currentHeight + blockHeight > MAX_PAGE_HEIGHT && currentPage.length > 0) {
      pages.push([...currentPage]);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(block);
    currentHeight += blockHeight;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];

    if (block.type === 'character' && nextBlock && 
       (nextBlock.type === 'dialogue' || nextBlock.type === 'parenthetical')) {
      const combinedHeight = calculateBlockHeight(block) + calculateBlockHeight(nextBlock);
      
      if (currentHeight + combinedHeight > MAX_PAGE_HEIGHT) {
        if (currentPage.length > 0) {
          pages.push([...currentPage]);
          currentPage = [];
          currentHeight = 0;
        }
      }
      addBlockToPage(block);
      continue;
    }

    addBlockToPage(block);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

/**
 * Detects the format of a block based on its content
 * @param text The text content to analyze
 * @returns The detected block type or null if no specific format is detected
 */
export const detectFormat = (text: string): string | null => {
  const trimmed = text.trim();
  
  // Scene heading detection - INT. EXT. INT/EXT. I/E.
  if (/^(INT|EXT|INT\/EXT|I\/E)\.?\s/i.test(trimmed)) {
    return 'scene-heading';
  }
  
  // Transition detection - ends with TO: or starts with FADE/DISSOLVE
  if (/TO:$/.test(trimmed) || /^FADE (IN|OUT)|^DISSOLVE/i.test(trimmed)) {
    return 'transition';
  }
  
  // Character detection - all uppercase with optional parentheses
  // More precise regex that excludes common words and requires at least 2 characters
  if (/^[A-Z][A-Z\s.()]*$/.test(trimmed) && 
      trimmed.length >= 2 && 
      !['THE', 'AND', 'OR', 'BUT', 'IF', 'A', 'AN', 'TO', 'IN', 'ON', 'AT', 'BY', 'FOR'].includes(trimmed)) {
    return 'character';
  }
  
  // Parenthetical detection - starts and ends with parentheses and has content inside
  if (trimmed.startsWith('(') && trimmed.endsWith(')') && trimmed.length > 2) {
    return 'parenthetical';
  }
  
  // Shot detection - starts with specific shot types
  if (/^(WIDE SHOT|CLOSE UP|MEDIUM SHOT|TRACKING SHOT|POV SHOT|AERIAL SHOT|DOLLY SHOT|ESTABLISHING SHOT|EXTREME CLOSE UP|CRANE SHOT)/i.test(trimmed)) {
    return 'shot';
  }
  
  return null;
};

export const getNextBlockType = (currentType: string, content: string, isDoubleEnter: boolean): string => {
  // Check if the content is just INT. or EXT. without additional text
  const isScenePrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)$/i.test(content.trim());
  
  // If it's a scene heading with just INT. or EXT., keep it as scene heading
  if (currentType === 'scene-heading' && isScenePrefix) {
    return 'scene-heading';
  }

  // If it's a scene heading with more content, proceed to action
  if (currentType === 'scene-heading') {
    return 'action';
  }

  const detectedFormat = detectFormat(content);
  if (detectedFormat) return detectedFormat;

  switch (currentType) {
    case 'action':
      return 'character';
    case 'character':
      return 'dialogue';
    case 'parenthetical':
      return 'dialogue';
    case 'dialogue':
      return isDoubleEnter ? 'action' : 'character';
    case 'transition':
      return 'scene-heading';
    case 'shot':
      return 'action';
    default:
      return 'action';
  }
};

/**
 * Updates block numbers for scene headings and dialogue blocks
 * @param blocks Array of blocks to update
 * @returns Updated blocks with correct numbering
 */
export const updateBlockNumbers = (blocks: Block[]): Block[] => {
  let sceneCount = 0;
  let dialogueCount = 0;

  return blocks.map((block) => {
    if (block.type === 'scene-heading') {
      sceneCount++;
      return { ...block, number: sceneCount };
    }
    if (block.type === 'dialogue') {
      dialogueCount++;
      return { ...block, number: dialogueCount };
    }
    return { ...block, number: undefined };
  });
};

/**
 * Extracts character names from blocks
 * @param blocks Array of blocks to analyze
 * @returns Array of unique character names
 */
export const extractCharacterNames = (blocks: Block[]): string[] => {
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
};

/**
 * Creates a simple hash for scene headings
 * @param text The scene heading text to hash
 * @returns A string hash
 */
export const createSceneHeadingHash = (text: string): string => {
  // Use a simple hash function
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Identifies scenes in a list of blocks
 * @param blocks Array of blocks to analyze
 * @returns Array of scene indices
 */
export const identifyScenes = (blocks: Block[]): { sceneHeadingIndex: number, nextSceneIndex: number }[] => {
  const scenes: { sceneHeadingIndex: number, nextSceneIndex: number }[] = [];
  
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'scene-heading') {
      const sceneHeadingIndex = i;
      
      // Find the next scene heading or end of blocks
      let nextSceneIndex = blocks.length;
      for (let j = i + 1; j < blocks.length; j++) {
        if (blocks[j].type === 'scene-heading') {
          nextSceneIndex = j;
          break;
        }
      }
      
      scenes.push({ sceneHeadingIndex, nextSceneIndex });
      
      // Skip to the next scene heading
      if (nextSceneIndex < blocks.length) {
        i = nextSceneIndex - 1;
      }
    }
  }
  
  return scenes;
};

/**
 * Segments blocks into scene documents
 * @param blocks Array of blocks to segment
 * @returns Array of scene documents
 */
export const segmentBlocksIntoScenes = (blocks: Block[]): SceneDocument[] => {
  const scenes: SceneDocument[] = [];
  let currentSceneBlocks: Block[] = [];
  let currentSceneHeading: Block | null = null;
  let sceneOrder = 0;

  blocks.forEach((block) => {
    if (block.type === 'scene-heading') {
      // If we have a previous scene, add it to the scenes array
      if (currentSceneHeading) {
        scenes.push({
          id: currentSceneHeading.id,
          scene_heading: currentSceneHeading.content,
          blocks: currentSceneBlocks,
          order: sceneOrder++,
          screenplayId: '', // Will be populated by caller
          projectId: '',    // Will be populated by caller
          characters_in_this_scene: [], // Will be populated during save
          elements_in_this_scene: [],   // Will be populated during save
          lastModified: new Date()
        });
        currentSceneBlocks = [];
      }
      
      // Start a new scene
      currentSceneHeading = block;
    } else if (currentSceneHeading) {
      // Add block to current scene
      currentSceneBlocks.push(block);
    } else {
      // If we have blocks before any scene heading, create an implicit scene
      currentSceneHeading = {
        id: `scene-${block.id}`,
        type: 'scene-heading',
        content: 'INT. LOCATION - DAY'
      };
      currentSceneBlocks.push(block);
    }
  });

  // Add the last scene if it exists
  if (currentSceneHeading) {
    scenes.push({
      id: currentSceneHeading.id,
      scene_heading: currentSceneHeading.content,
      blocks: currentSceneBlocks,
      order: sceneOrder,
      screenplayId: '',
      projectId: '',
      characters_in_this_scene: [],
      elements_in_this_scene: [],
      lastModified: new Date()
    });
  }

  return scenes;
};