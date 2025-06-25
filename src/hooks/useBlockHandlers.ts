import { useCallback, useRef, useEffect } from 'react';
import { Block, BlockHandlers } from '../types';
import { BLOCK_TYPES } from '../constants/editorConstants';
import { 
  detectFormat, 
  getNextBlockType, 
  updateBlockNumbers,
  createSceneHeadingHash // Import the hash utility
} from '../utils/blockUtils';
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc, setDoc, updateDoc, collection, arrayUnion, serverTimestamp, writeBatch } from 'firebase/firestore'; // Added writeBatch to imports
import { db } from '../lib/firebase'; // Import db instance

interface MultiBlockSelection {
  startBlock: string | null;
  startOffset: number;
  endBlock: string | null;
  endOffset: number;
  selectedText: string;
}

export const useBlockHandlers = (
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
            const el = blockRefs.current[newBlock.id];
            if (el) {
                el.focus();
                el.dispatchEvent(new FocusEvent('focus'));
            }
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
                const el = blockRefs.current[newBlock.id];
                if (el) {
                    el.focus();
                    const range = document.createRange();
                    const textNode = el.firstChild || el;
                    range.setStart(textNode, 0);
                    range.collapse(true);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
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
                const el = blockRefs.current[newBlock.id];
                if (el) {
                    el.focus();
                    const range = document.createRange();
                    const textNode = el.firstChild || el;
                    range.setStart(textNode, 0);
                    range.collapse(true);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
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
                const el = blockRefs.current[newBlock.id];
                if (el) {
                    el.focus();
                    const range = document.createRange();
                    const textNode = el.firstChild || el;
                    range.setStart(textNode, 0);
                    range.collapse(true);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
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
            const el = blockRefs.current[newBlock.id];
            if (el) {
                el.focus();
                const range = document.createRange();
                const textNode = el.firstChild || el;
                range.setStart(textNode, 0);
                range.collapse(true);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
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
          const el = blockRefs.current[newBlock.id];
          if (el) {
              el.focus();
              const range = document.createRange();
              const textNode = el.firstChild || el;
              range.setStart(textNode, 0);
              range.collapse(true);
              const selection = window.getSelection();
              if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(range);
              }
          }
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

    setTimeout(() => {
      const el = blockRefs.current[newBlock.id];
      if (el) {
        el.focus();
        
        if (newBlock.type === 'scene-heading') {
          // ========== SCENE HEADING CURSOR FIX ==========
          // Set cursor to end of text instead of beginning
          const range = document.createRange();
          const textNode = el.firstChild || el;
          const textLength = textAfter.length;
          range.setStart(textNode, textLength);
          range.collapse(true);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          // Trigger focus event for scene heading suggestions
          el.dispatchEvent(new FocusEvent('focus'));
          // ========== END SCENE HEADING CURSOR FIX ==========
        } else {
          // ========== ACTION BLOCK CURSOR FIX ==========
          // For action blocks and other types, ensure proper cursor positioning
          const range = document.createRange();
          
          // Ensure there's a text node to work with
          if (!el.firstChild) {
            const textNode = document.createTextNode(textAfter || '');
            el.appendChild(textNode);
          }
          
          const textNode = el.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            // Set cursor at the beginning for action blocks
            range.setStart(textNode, 0);
            range.collapse(true);
          } else {
            // Fallback: set cursor at the beginning of the element
            range.setStart(el, 0);
            range.collapse(true);
          }
          
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          // Ensure the element maintains focus
          el.focus();
          // ========== END ACTION BLOCK CURSOR FIX ==========
        }
      }
    }, 0);

    return newBlock.id;
  }, [state.blocks, addToHistory, updateBlocks, setHasChanges]);

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
        const sceneHeadingHash = createSceneHeadingHash(sceneHeadingText);
        const uniqueSceneHeadingRef = doc(db, `projects/${projectId}/unique_scene_headings`, sceneHeadingHash);

        try {
            const uniqueSceneHeadingSnap = await getDoc(uniqueSceneHeadingRef);
            const batch = writeBatch(db);
            if (uniqueSceneHeadingSnap.exists()) {
                const existingData = uniqueSceneHeadingSnap.data();
                batch.update(uniqueSceneHeadingRef, {
                    count: (existingData.count || 0) + 1,
                    lastUsed: serverTimestamp(),
                    screenplayIds: arrayUnion(screenplayId)
                });
            } else {
                batch.set(uniqueSceneHeadingRef, {
                    id: sceneHeadingHash,
                    text: sceneHeadingText,
                    text_uppercase: sceneHeadingText.toUpperCase(),
                    count: 1,
                    lastUsed: serverTimestamp(),
                    screenplayIds: [screenplayId],
                    associated_characters: [],
                    associated_elements: []
                });
            }
            await batch.commit();
            
            // Call the callback to refresh scene headings in the parent component
            if (onSceneHeadingUpdate) {
                await onSceneHeadingUpdate();
            }
        } catch (firestoreError) {
            console.error("Error updating unique_scene_headings in handleContentChange:", firestoreError);
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
        const el = blockRefs.current[blockToFocusId!];
        if (el) {
          el.focus();
          const range = document.createRange();
          const textNode = el.firstChild || el;
          range.setStart(textNode, 0);
          range.collapse(true);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }, 0);
    }
  }, [state.blocks, addToHistory, updateBlocks, setHasChanges, projectId, screenplayId, onSceneHeadingUpdate]);

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
        const prevEl = blockRefs.current[previousBlock.id];

        const updatedBlocks = state.blocks.filter((b) => b.id !== blockId);
        updateBlocks(updatedBlocks);

        if (prevEl) {
          prevEl.focus();
          const range = document.createRange();
          
          if (!prevEl.firstChild) {
            prevEl.textContent = '';
          }
          
          const textNode = prevEl.firstChild || prevEl;
          const position = previousBlock.content.length;
          
          try {
            range.setStart(textNode, position);
            range.setEnd(textNode, position);
            
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } catch (err) {
            range.selectNodeContents(prevEl);
            range.collapse(false);
            
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    }
  }, [state.blocks, handleEnterKey, handleFormatChange, addToHistory, updateBlocks, setHasChanges]);

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
