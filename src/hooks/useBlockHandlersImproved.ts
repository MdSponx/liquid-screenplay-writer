import { useCallback, useRef, useEffect } from 'react';
import { Block, BlockHandlers } from '../types';
import { BLOCK_TYPES } from '../constants/editorConstants';
import { 
  detectFormat, 
  getNextBlockType, 
  updateBlockNumbers,
  createSceneHeadingHash
} from '../utils/blockUtils';
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc, setDoc, updateDoc, collection, arrayUnion, serverTimestamp, writeBatch, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MultiBlockSelection {
  startBlock: string | null;
  startOffset: number;
  endBlock: string | null;
  endOffset: number;
  selectedText: string;
}

export const useBlockHandlersImproved = (
  state: {
    blocks: Block[];
    activeBlock: string | null;
    textContent: Record<string, string>;
    selectedBlocks: Set<string>;
  },
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  addToHistory: (blocks: Block[]) => void,
  updateBlocks: (blocks: Block[]) => void,
  setSelectedBlocks: (blocks: Set<string> | ((prev: Set<string>) => Set<string>)) => void,
  setHasChanges?: (hasChanges: boolean) => void,
  projectId?: string,
  screenplayId?: string,
  onSceneHeadingUpdate?: () => Promise<void>
): BlockHandlers => {
  const lastKeyPressTime = useRef<number>(0);
  const lastClickedBlock = useRef<string | null>(null);
  const isDragging = useRef(false);
  const dragStartBlock = useRef<string | null>(null);
  const dragEndBlock = useRef<string | null>(null);
  const isTextSelection = useRef(false);
  const selectionStartBlock = useRef<string | null>(null);
  const selectionStartOffset = useRef<number>(0);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const multiBlockSelection = useRef<MultiBlockSelection>({
    startBlock: null,
    startOffset: 0,
    endBlock: null,
    endOffset: 0,
    selectedText: ''
  });

  // Enhanced focus management utility
  const setFocusWithRetry = useCallback((blockId: string, cursorPosition: 'start' | 'end' | number = 'start', maxRetries = 3) => {
    let retryCount = 0;
    
    const attemptFocus = () => {
      const el = blockRefs.current[blockId];
      if (!el) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(attemptFocus, 10 * retryCount); // Exponential backoff
        }
        return;
      }

      // Ensure element is focusable
      if (!el.hasAttribute('contenteditable')) {
        el.setAttribute('contenteditable', 'true');
      }

      // Focus the element
      el.focus();

      // Set cursor position with enhanced reliability
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (!selection) return;

        // Ensure there's content to work with
        if (!el.firstChild) {
          const textNode = document.createTextNode('');
          el.appendChild(textNode);
        }

        let textNode = el.firstChild;
        
        // Find the first text node if the first child isn't a text node
        while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
          textNode = textNode.firstChild || textNode.nextSibling;
        }

        if (!textNode) {
          // Create a text node if none exists
          textNode = document.createTextNode('');
          el.appendChild(textNode);
        }

        const textContent = textNode.textContent || '';
        let position = 0;

        if (cursorPosition === 'end') {
          position = textContent.length;
        } else if (cursorPosition === 'start') {
          position = 0;
        } else if (typeof cursorPosition === 'number') {
          position = Math.min(cursorPosition, textContent.length);
        }

        range.setStart(textNode, position);
        range.setEnd(textNode, position);
        
        selection.removeAllRanges();
        selection.addRange(range);

        // Verify focus was successful
        if (document.activeElement !== el && retryCount < maxRetries) {
          retryCount++;
          setTimeout(attemptFocus, 10 * retryCount);
        }
      } catch (error) {
        console.error('Error setting cursor position:', error);
        // Fallback: just focus the element
        el.focus();
      }
    };

    // Use requestAnimationFrame for better timing
    requestAnimationFrame(attemptFocus);
  }, [blockRefs]);

  // Enhanced action block creation after scene heading
  const createActionBlockAfterSceneHeading = useCallback((sceneHeadingBlockId: string) => {
    const currentIndex = state.blocks.findIndex(b => b.id === sceneHeadingBlockId);
    if (currentIndex === -1) return null;

    const actionBlockId = `action-${uuidv4()}`;
    const actionBlock: Block = {
      id: actionBlockId,
      type: 'action',
      content: '',
    };

    const updatedBlocks = [...state.blocks];
    updatedBlocks.splice(currentIndex + 1, 0, actionBlock);
    
    updateBlocks(updateBlockNumbers(updatedBlocks));
    
    if (setHasChanges) {
      setHasChanges(true);
    }

    // Enhanced focus management for action block
    setTimeout(() => {
      setFocusWithRetry(actionBlockId, 'start');
    }, 50); // Slightly longer delay for scene heading processing

    return actionBlockId;
  }, [state.blocks, updateBlocks, setHasChanges, setFocusWithRetry]);

  // Find Block ID from a DOM node
  const findBlockIdFromNode = (node: Node | null): string | null => {
    if (!node) return null;
    
    let current = node;
    while (current && !(current instanceof HTMLElement && current.hasAttribute('data-block-id'))) {
      if (current.parentElement) {
        current = current.parentElement;
      } else {
        return null;
      }
    }
    
    return current instanceof HTMLElement ? current.getAttribute('data-block-id') : null;
  };

  const handleEnterKey = useCallback((blockId: string, element: HTMLDivElement): string => {
    const selection = window.getSelection();
    if (!selection) return blockId;

    const range = selection.getRangeAt(0);
    const currentBlock = state.blocks.find((b) => b.id === blockId);
    if (!currentBlock) return blockId;

    const content = element.textContent || '';
    const caretPos = range.startOffset;
    const textBefore = content.substring(0, caretPos);
    const textAfter = content.substring(caretPos);

    const now = Date.now();
    const isDoubleEnter = now - lastKeyPressTime.current < 500;
    lastKeyPressTime.current = now;

    addToHistory(state.blocks);

    // Special handling for transitions: immediately create a new scene heading block
    if (currentBlock.type === 'transition') {
        const newSceneId = `scene-${uuidv4()}`;
        
        const newBlock: Block = {
            id: newSceneId,
            type: 'scene-heading',
            content: '',
        };

        const updatedBlocks = [...state.blocks];
        const currentIndex = state.blocks.findIndex((b) => b.id === blockId);
        
        if (textBefore.trim() !== '') {
          updatedBlocks[currentIndex] = {
            ...currentBlock,
            content: textBefore.trim().toUpperCase(),
          };
        } else {
          updatedBlocks[currentIndex] = {
            ...currentBlock,
            content: currentBlock.content.trim().toUpperCase(),
          };
        }

        updatedBlocks.splice(currentIndex + 1, 0, newBlock);
        updateBlocks(updateBlockNumbers(updatedBlocks));

        if (setHasChanges) {
            setHasChanges(true);
        }

        setTimeout(() => {
            setFocusWithRetry(newBlock.id, 'start');
        }, 0);
        return newBlock.id;
    }

    // ========== CHARACTER BLOCK LOGIC ==========
    if (currentBlock.type === 'character') {
        const currentIndex = state.blocks.findIndex(b => b.id === blockId);
        if (currentIndex === -1) return blockId;

        // Check if the character block is empty
        if (textBefore.trim() === '' && textAfter.trim() === '') {
            // Empty character block - check what's next to toggle between dialogue and action
            const nextBlock = state.blocks[currentIndex + 1];
            let newBlockType: string;
            
            if (nextBlock && nextBlock.type === 'dialogue') {
                newBlockType = 'action';
            } else {
                newBlockType = 'dialogue';
            }

            const newBlockId = `block-${uuidv4()}`;
            const newBlock: Block = {
                id: newBlockId,
                type: newBlockType,
                content: '',
            };

            const updatedBlocks = [...state.blocks];
            updatedBlocks.splice(currentIndex, 1, newBlock); // Replace character block
            
            updateBlocks(updateBlockNumbers(updatedBlocks));
            if (setHasChanges) {
                setHasChanges(true);
            }

            setTimeout(() => {
                setFocusWithRetry(newBlock.id, 'start');
            }, 0);
            return newBlock.id;
        }

        // Character block with content
        if (isDoubleEnter) {
            // Double enter: create action block
            const newBlockId = `block-${uuidv4()}`;
            const newBlock: Block = {
                id: newBlockId,
                type: 'action',
                content: textAfter.trim(),
            };

            const updatedBlocks = [...state.blocks];
            updatedBlocks[currentIndex] = {
                ...currentBlock,
                content: textBefore.trim().toUpperCase(),
            };
            updatedBlocks.splice(currentIndex + 1, 0, newBlock);
            
            updateBlocks(updateBlockNumbers(updatedBlocks));
            if (setHasChanges) {
                setHasChanges(true);
            }

            setTimeout(() => {
                setFocusWithRetry(newBlock.id, 'start');
            }, 0);
            return newBlock.id;
        } else {
            // Single enter: create dialogue block
            const newBlockId = `block-${uuidv4()}`;
            const newBlock: Block = {
                id: newBlockId,
                type: 'dialogue',
                content: textAfter.trim(),
            };

            const updatedBlocks = [...state.blocks];
            updatedBlocks[currentIndex] = {
                ...currentBlock,
                content: textBefore.trim().toUpperCase(),
            };
            updatedBlocks.splice(currentIndex + 1, 0, newBlock);
            
            updateBlocks(updateBlockNumbers(updatedBlocks));
            if (setHasChanges) {
                setHasChanges(true);
            }

            setTimeout(() => {
                setFocusWithRetry(newBlock.id, 'start');
            }, 0);
            return newBlock.id;
        }
    }
    // ========== END CHARACTER BLOCK LOGIC ==========

    // Double Enter in dialogue creates an action block immediately
    if (isDoubleEnter && currentBlock.type === 'dialogue' && textBefore.trim() === '') {
        const currentIndex = state.blocks.findIndex(b => b.id === blockId);
        if (currentIndex === -1) return blockId;

        const newBlockId = `block-${uuidv4()}`;
        const newBlock: Block = {
            id: newBlockId,
            type: 'action',
            content: textAfter.trim(),
        };

        const updatedBlocks = [...state.blocks];
        if (textBefore.trim() === '' && textAfter.trim() === '') {
          updatedBlocks.splice(currentIndex, 1, newBlock);
        } else {
          updatedBlocks[currentIndex] = {
              ...currentBlock,
              content: textBefore.trim(),
          };
          updatedBlocks.splice(currentIndex + 1, 0, newBlock);
        }
        
        updateBlocks(updateBlockNumbers(updatedBlocks));
        if (setHasChanges) {
          setHasChanges(true);
        }

        setTimeout(() => {
            setFocusWithRetry(newBlock.id, 'start');
        }, 0);
        return newBlock.id;
    }

    if (currentBlock.type === 'parenthetical') {
      const updatedBlocks = [...state.blocks];
      const currentIndex = state.blocks.findIndex((b) => b.id === blockId);

      let finalContent = textBefore;
      if (finalContent.startsWith('(') && !finalContent.endsWith(')')) {
        finalContent += ')';
      } else if (!finalContent.startsWith('(') && finalContent.endsWith(')')) {
        finalContent = `(${finalContent}`;
      }
      
      updatedBlocks[currentIndex] = {
          ...currentBlock,
          content: finalContent,
      };

      const newBlockId = `block-${uuidv4()}`;
      const newBlock: Block = {
          id: newBlockId,
          type: 'dialogue',
          content: textAfter.replace(/^\)/, '').trim(),
      };

      updatedBlocks.splice(currentIndex + 1, 0, newBlock);
      updateBlocks(updateBlockNumbers(updatedBlocks));
      if (setHasChanges) {
          setHasChanges(true);
      }

      setTimeout(() => {
          setFocusWithRetry(newBlock.id, 'start');
      }, 0);
      return newBlock.id;
    }

    const nextBlockType = getNextBlockType(currentBlock.type, textBefore, false);
    
    const newBlockId = nextBlockType === 'scene-heading' 
      ? `scene-${uuidv4()}` 
      : `block-${uuidv4()}`;
    
    const currentIndex = state.blocks.findIndex((b) => b.id === blockId);
    const updatedBlocks = [...state.blocks];

    updatedBlocks[currentIndex] = {
      ...currentBlock,
      content: textBefore,
    };

    const newBlock: Block = {
      id: newBlockId,
      type: nextBlockType,
      content: textAfter,
    };

    updatedBlocks.splice(currentIndex + 1, 0, newBlock);
    updateBlocks(updateBlockNumbers(updatedBlocks));
    if (setHasChanges) {
      setHasChanges(true);
    }

    // Enhanced focus management based on block type
    setTimeout(() => {
      if (newBlock.type === 'scene-heading') {
        // For scene headings, set cursor to end and trigger suggestions
        setFocusWithRetry(newBlock.id, 'end');
        
        // Trigger focus event for scene heading suggestions after a brief delay
        setTimeout(() => {
          const el = blockRefs.current[newBlock.id];
          if (el) {
            el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
          }
        }, 100);
      } else {
        // For other block types (especially action blocks), set cursor to start
        setFocusWithRetry(newBlock.id, 'start');
      }
    }, 0);

    return newBlock.id;
  }, [state.blocks, addToHistory, updateBlocks, setHasChanges, setFocusWithRetry, blockRefs]);

  const handleFormatChange = useCallback((type: string) => {
    if (state.activeBlock) {
      addToHistory(state.blocks);
      const currentBlock = state.blocks.find((b) => b.id === state.activeBlock);
      if (!currentBlock) return;

      const selection = window.getSelection();
      const activeElement = blockRefs.current[state.activeBlock];
      let cursorPosition = 0;
      let hasSelection = false;
      let selectionStart = 0;
      let selectionEnd = 0;

      if (selection && selection.rangeCount > 0 && activeElement) {
        const range = selection.getRangeAt(0);
        if (range.startContainer.parentNode === activeElement || range.startContainer === activeElement) {
          cursorPosition = range.startOffset;
          hasSelection = !range.collapsed;
          selectionStart = range.startOffset;
          selectionEnd = range.endOffset;
        }
      }

      let newContent = currentBlock.content;
      let newBlockId = currentBlock.id;

      if (type === 'scene-heading' && currentBlock.type !== 'scene-heading') {
          newBlockId = `scene-${uuidv4()}`;
          if (newContent.trim() === '') {
              newContent = '';
          } else {
              newContent = newContent.toUpperCase();
          }
      } else if (type === 'scene-heading' && currentBlock.type === 'scene-heading') {
          newContent = newContent.toUpperCase();
      }
      
      else if (type === 'parenthetical') {
        const content = currentBlock.content.trim();
        if (content === '' || content === '()') {
          newContent = '()';
          cursorPosition = 1;
          selectionStart = 1;
          selectionEnd = 1;
        } else if (!content.startsWith('(') || !content.endsWith(')')) {
          newContent = `(${content.replace(/^\(|\)$/g, '')})`;
          cursorPosition = Math.min(cursorPosition + 1, newContent.length - 1);
          selectionStart = Math.min(selectionStart + 1, newContent.length - 1);
          selectionEnd = Math.min(selectionEnd + 1, newContent.length - 1);
        }
      } 
      else if (currentBlock.type === 'parenthetical' && type !== 'parenthetical') {
        newContent = currentBlock.content.replace(/^\(|\)$/g, '').trim();
        cursorPosition = Math.max(0, cursorPosition - 1);
        selectionStart = Math.max(0, selectionStart - 1);
        selectionEnd = Math.max(0, selectionEnd - 1);
      }

      if (type === 'character' && currentBlock.type !== 'character') {
        newContent = newContent.toUpperCase();
      }
      
      if (type === 'transition' && currentBlock.type !== 'transition') {
        if (newContent.trim() === '') {
          newContent = '';
        } else {
          newContent = newContent.toUpperCase();
          if (!newContent.endsWith('TO:') && !/^FADE (IN|OUT)|^DISSOLVE/i.test(newContent)) {
            newContent = newContent + ' TO:';
          }
        }
      } else if (type === 'transition' && currentBlock.type === 'transition') {
          newContent = newContent.toUpperCase();
      }

      if (setHasChanges) {
        setHasChanges(true);
      }

      const updatedBlocks = state.blocks.map((block) => {
        if (block.id === state.activeBlock) {
          return {
            ...block,
            id: newBlockId,
            type: type,
            content: newContent
          };
        }
        return block;
      });

      updateBlocks(updateBlockNumbers(updatedBlocks));

      setTimeout(() => {
        const el = blockRefs.current[newBlockId];
        if (!el) return;

        el.focus();

        if ((type === 'scene-heading' || type === 'transition' || type === 'shot') && newContent.trim() === '') {
          el.dispatchEvent(new FocusEvent('focus'));
          return;
        }

        try {
          const range = document.createRange();
          const textNode = el.firstChild || el;
          
          if (hasSelection) {
            const contentLengthRatio = newContent.length / currentBlock.content.length;
            const adjustedStart = Math.min(Math.round(selectionStart * contentLengthRatio), newContent.length);
            const adjustedEnd = Math.min(Math.round(selectionEnd * contentLengthRatio), newContent.length);
            
            range.setStart(textNode, adjustedStart);
            range.setEnd(textNode, adjustedEnd);
          } else {
            const adjustedPosition = Math.min(cursorPosition, newContent.length);
            range.setStart(textNode, adjustedPosition);
            range.collapse(true);
          }
          
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (err) {
          console.error("Error restoring cursor/selection:", err);
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }, 0);
    }
  }, [state.activeBlock, state.blocks, addToHistory, updateBlocks, setHasChanges]);

  const handleContentChange = useCallback(async (id: string, newContent: string, forcedType?: string) => {
    const currentBlockIndex = state.blocks.findIndex(b => b.id === id);
    const currentBlock = state.blocks[currentBlockIndex];
    
    if (!currentBlock) return;

    if (newContent.trim() === '' && state.blocks.length > 1 && !forcedType) {
      addToHistory(state.blocks);
      const updatedBlocks = state.blocks.filter((_, index) => index !== currentBlockIndex);
      updateBlocks(updatedBlocks);
      if (setHasChanges) {
        setHasChanges(true);
      }
      return;
    }
    
    addToHistory(state.blocks);
    if (setHasChanges) {
      setHasChanges(true);
    }

    let updatedBlocks = [...state.blocks];
    let blockToFocusId: string | null = null;
    
    let effectiveType = forcedType;
    if (!effectiveType) {
        const detectedFormat = detectFormat(newContent);
        effectiveType = detectedFormat || currentBlock.type;
    }

    updatedBlocks[currentBlockIndex] = {
      ...updatedBlocks[currentBlockIndex],
      content: newContent,
      type: effectiveType,
    };

    // Special handling for scene-heading creation/update from content change
    if (effectiveType === 'scene-heading' && projectId && screenplayId) {
        const sceneHeadingText = newContent.trim().toUpperCase();
        
        // Helper function to check if text is a prefix-only entry
        const isPrefixOnly = (text: string): boolean => {
            const trimmedText = text.trim().toUpperCase();
            const prefixPatterns = [
                'INT.',
                'EXT.',
                'INT./EXT.',
                'EXT./INT.',
                'I/E.'
            ];
            return prefixPatterns.includes(trimmedText);
        };

        // Only save to unique_scene_headings if it's not a prefix-only entry and not empty
        if (sceneHeadingText.length > 0 && !isPrefixOnly(sceneHeadingText)) {
            const sceneHeadingHash = createSceneHeadingHash(sceneHeadingText);
            const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);

            try {
                // Helper function to count scene headings currently in the editor
                const countSceneHeadingsInEditor = async (): Promise<Record<string, number>> => {
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
                };

                // Get current usage count from the editor
                const editorCounts = await countSceneHeadingsInEditor();
                const currentUsageCount = editorCounts[sceneHeadingText] || 0;

                const uniqueSceneHeadingSnap = await getDoc(uniqueSceneHeadingRef);
                const batch = writeBatch(db);
                
                if (uniqueSceneHeadingSnap.exists()) {
                    // Update existing scene heading with current editor count
                    batch.update(uniqueSceneHeadingRef, {
                        count: currentUsageCount,
                        lastUsed: serverTimestamp(),
                        screenplayIds: arrayUnion(screenplayId)
                    });
                    console.log(`Updated existing scene heading: ${sceneHeadingText} (count: ${currentUsageCount})`);
                } else {
                    // Create new scene heading with current editor count
                    batch.set(uniqueSceneHeadingRef, {
                        id: sceneHeadingHash,
                        text: sceneHeadingText,
                        text_uppercase: sceneHeadingText,
                        count: currentUsageCount,
                        lastUsed: serverTimestamp(),
                        screenplayIds: [screenplayId],
                        associated_characters: [],
                        associated_elements: []
                    });
                    console.log(`Created new scene heading: ${sceneHeadingText} (count: ${currentUsageCount})`);
                }
                
                await batch.commit();
                
                // Call the callback to refresh scene headings in the parent component
                if (onSceneHeadingUpdate) {
                    await onSceneHeadingUpdate();
                }
            } catch (firestoreError) {
                console.error("Error updating unique_scene_headings in handleContentChange:", firestoreError);
            }
        } else if (sceneHeadingText.length > 0 && isPrefixOnly(sceneHeadingText)) {
            console.log(`Skipped saving prefix-only scene heading: ${sceneHeadingText}`);
        }
    }
    
    if (effectiveType === 'character' && currentBlock.type !== 'character' && newContent.trim()) {
      const dialogueBlockId = `block-${uuidv4()}`;
      const dialogueBlock: Block = {
          id: dialogueBlockId,
          type: 'dialogue',
          content: '',
      };
      updatedBlocks.splice(currentBlockIndex + 1, 0, dialogueBlock);
      blockToFocusId = dialogueBlockId;
    }

    updateBlocks(updateBlockNumbers(updatedBlocks));
    
    if (blockToFocusId) {
      setTimeout(() => {
        setFocusWithRetry(blockToFocusId!, 'start');
      }, 0);
    }
  }, [state.blocks, addToHistory, updateBlocks, setHasChanges, projectId, screenplayId, onSceneHeadingUpdate, setFocusWithRetry]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, blockId: string) => {
    const el = e.target as HTMLDivElement;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'c') {
        if (multiBlockSelection.current.startBlock && 
            multiBlockSelection.current.endBlock && 
            multiBlockSelection.current.startBlock !== multiBlockSelection.current.endBlock &&
            multiBlockSelection.current.selectedText) {
          e.preventDefault();
          handleCopyMultiBlockSelection();
        }
        return;
      }
      
      if (e.key === 'x') {
        if (multiBlockSelection.current.startBlock && 
            multiBlockSelection.current.endBlock && 
            multiBlockSelection.current.startBlock !== multiBlockSelection.current.endBlock &&
            multiBlockSelection.current.selectedText) {
          e.preventDefault();
          handleCutMultiBlockSelection();
        }
        return;
      }
    }

    if (setHasChanges) {
      setHasChanges(true);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnterKey(blockId, el);
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const currentBlock = state.blocks.find((b) => b.id === blockId);
      if (!currentBlock) return;

      const currentIndex = BLOCK_TYPES.indexOf(currentBlock.type as any);
      const nextType = BLOCK_TYPES[(currentIndex + 1) % BLOCK_TYPES.length];

      handleFormatChange(nextType);
    }

    if (e.key === 'Backspace' && el.textContent === '') {
      e.preventDefault();
      e.stopPropagation();

      if (state.blocks.length <= 1) {
        return;
      }

      const currentIndex = state.blocks.findIndex((b) => b.id === blockId);
      if (currentIndex > 0) {
        addToHistory(state.blocks);
        
        const previousBlock = state.blocks[currentIndex - 1];
        const updatedBlocks = state.blocks.filter((b) => b.id !== blockId);
        updateBlocks(updatedBlocks);

        setTimeout(() => {
          setFocusWithRetry(previousBlock.id, 'end');
        }, 0);
      }
    }
  }, [state.blocks, handleEnterKey, handleFormatChange, addToHistory, updateBlocks, setHasChanges, setFocusWithRetry]);

  const handleCopyMultiBlockSelection = useCallback(() => {
    if (!multiBlockSelection.current.startBlock || 
        !multiBlockSelection.current.endBlock || 
        !multiBlockSelection.current.selectedText) {
      return;
    }

    const selectedText = multiBlockSelection.current.selectedText;
    const formattedText = selectedText;
    
    navigator.clipboard.writeText(formattedText).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }, []);

  const handleCutMultiBlockSelection = useCallback(() => {
    if (!multiBlockSelection.current.startBlock || 
        !multiBlockSelection.current.endBlock || 
        !multiBlockSelection.current.selectedText) {
      return;
    }

    handleCopyMultiBlockSelection();
    addToHistory(state.blocks);
    
    const startIdx = state.blocks.findIndex(b => b.id === multiBlockSelection.current.startBlock);
    const endIdx = state.blocks.findIndex(b => b.id === multiBlockSelection.current.endBlock);
    
    if (startIdx === -1 || endIdx === -1) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    multiBlockSelection.current = {
      startBlock: null,
      startOffset: 0,
      endBlock: null,
      endOffset: 0,
      selectedText: ''
    };
  }, [addToHistory, handleCopyMultiBlockSelection, state.blocks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (multiBlockSelection.current.startBlock && 
            multiBlockSelection.current.endBlock && 
            multiBlockSelection.current.startBlock !== multiBlockSelection.current.endBlock &&
            multiBlockSelection.current.selectedText) {
            
          if (e.key === 'c') {
            handleCopyMultiBlockSelection();
          }
          
          if (e.key === 'x') {
            handleCutMultiBlockSelection();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyMultiBlockSelection, handleCutMultiBlockSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || 
          e.key === 'Shift' || e.key === 'Tab' || 
          e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        return;
      }

      if (state.selectedBlocks.size > 0) {
        setSelectedBlocks(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedBlocks, setSelectedBlocks]);

  const handleBlockClick = useCallback((id: string, e: React.MouseEvent) => {
    if (isTextSelection.current) return;

    if (!isDragging.current) {
      lastClickedBlock.current = id;
    }
  }, []);

  const handleBlockDoubleClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedBlock.current) {
      const startIdx = state.blocks.findIndex(b => b.id === lastClickedBlock.current);
      const endIdx = state.blocks.findIndex(b => b.id === id);
      const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      
      const newSelection = new Set<string>();
      for (let i = start; i <= end; i++) {
        newSelection.add(state.blocks[i].id);
      }
      setSelectedBlocks(newSelection);
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedBlocks((prev: Set<string>) => {
        const newSelection = new Set(prev);
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          newSelection.add(id);
        }
        return newSelection;
      });
    } else {
      setSelectedBlocks(new Set([id]));
    }
  }, [state.blocks, setSelectedBlocks]);

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const isContentEditable = target.hasAttribute('contenteditable');
    
    lastMousePosition.current = { x: e.clientX, y: e.clientY };

    if (isContentEditable) {
      isTextSelection.current = true;
      selectionStartBlock.current = id;
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        selectionStartOffset.current = range.startOffset;
        
        multiBlockSelection.current = {
          startBlock: id,
          startOffset: range.startOffset,
          endBlock: id,
          endOffset: range.startOffset,
          selectedText: ''
        };
      }
      return;
    }

    e.preventDefault();
    isDragging.current = true;
    dragStartBlock.current = id;
    dragEndBlock.current = id;
  }, []);

  return {
    handleContentChange,
    handleEnterKey,
    handleKeyDown,
    handleBlockClick,
    handleBlockDoubleClick,
    handleFormatChange,
    handleMouseDown,
  };
};
