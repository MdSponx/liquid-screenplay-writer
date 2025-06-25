import { useEffect } from 'react';
import { Block } from '../types';

interface HotkeysProps {
  handleUndo: () => void;
  handleRedo: () => void;
  selectAllBlocks: () => void;
  blocks: Block[];
  activeBlock: string | null;
  handleFormatChange: (type: string) => void;
}

export const useHotkeys = ({
  handleUndo,
  handleRedo,
  selectAllBlocks,
  blocks,
  activeBlock,
  handleFormatChange,
}: HotkeysProps) => {
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Get the target element
      const target = e.target as HTMLElement;
      
      // Check if we're in an input or contenteditable
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !e.altKey) {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Select All: Ctrl+A or Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // If we're in a contenteditable, let the browser handle the selection
        if (isContentEditable) {
          // Only prevent default if we're not in a contenteditable
          // This allows normal text selection within a block
          return;
        }
        
        e.preventDefault();
        selectAllBlocks();
        return;
      }
      
      // Format shortcuts (only when in a contenteditable or with an active block)
      if (activeBlock && (isContentEditable || !isInput)) {
        // Bold: Ctrl+B or Cmd+B - Not implemented for screenplay format
        
        // Format shortcuts using number keys (when holding Alt/Option)
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          const formatMap: Record<string, string> = {
            '1': 'scene-heading',
            '2': 'action',
            '3': 'character',
            '4': 'parenthetical',
            '5': 'dialogue',
            '6': 'transition',
            '7': 'text',
            '8': 'shot',
          };
          
          if (formatMap[e.key]) {
            e.preventDefault();
            handleFormatChange(formatMap[e.key]);
            return;
          }
        }
      }
      
      // Delete/Backspace with selection - handled by browser
      
      // Save: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.altKey) {
        e.preventDefault();
        // Implement save functionality if needed
        console.log('Save shortcut triggered');
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleUndo, handleRedo, selectAllBlocks, activeBlock, handleFormatChange, blocks]);
};