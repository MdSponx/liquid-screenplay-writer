import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { BlockComponentProps, CharacterDocument, ElementDocument } from '../types';
import { getBlockStyle, getBlockMargin } from '../utils/styleUtils';
import SceneHeadingSuggestions from './SceneHeadingSuggestions';
import TransitionSuggestions from './TransitionSuggestions';
import ShotTypeSuggestions from './ShotTypeSuggestions';
import CharacterSuggestions from './CharacterSuggestions';
import ElementSuggestions from './ElementSuggestions';

interface ExtendedBlockComponentProps extends BlockComponentProps {
  projectCharacters?: CharacterDocument[];
  projectElements?: ElementDocument[];
  projectId?: string;
  screenplayId?: string;
  projectUniqueSceneHeadings?: any[];
}

const BlockComponent: React.FC<ExtendedBlockComponentProps> = ({
  block,
  isDarkMode,
  onContentChange,
  onKeyDown,
  onFocus,
  onClick,
  onMouseDown,
  onDoubleClick,
  isSelected,
  isActive,
  blockRefs,
  projectCharacters = [],
  projectElements = [],
  projectId,
  screenplayId,
  projectUniqueSceneHeadings = [],
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState<{ x: number; y: number } | null>(null);
  const [suggestionType, setSuggestionType] = useState<'scene' | 'transition' | 'shot' | 'character' | 'element' | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  const [recentlySavedHeadings, setRecentlySavedHeadings] = useState<Set<string>>(new Set());
  const ignoreBlurRef = useRef(false);
  const suggestionClosingRef = useRef(false); // เพิ่ม ref เพื่อป้องกันการเปิด suggestions ใหม่ทันทีหลังปิด

  // Track when scene headings are updated to remove NEW badge
  useEffect(() => {
    if (block.type === 'scene-heading' && block.content.trim()) {
      const trimmedContent = block.content.trim().toUpperCase();
      
      // Check if this scene heading now exists in the project's unique scene headings
      const nowExistsInProject = projectUniqueSceneHeadings.some(heading => 
        heading.text.toUpperCase().trim() === trimmedContent
      );
      
      // If it now exists and wasn't marked as recently saved, mark it as recently saved
      if (nowExistsInProject && !recentlySavedHeadings.has(trimmedContent)) {
        setRecentlySavedHeadings(prev => new Set([...prev, trimmedContent]));
        
        // Clear the recently saved flag after a delay to allow for UI updates
        setTimeout(() => {
          setRecentlySavedHeadings(prev => {
            const newSet = new Set(prev);
            newSet.delete(trimmedContent);
            return newSet;
          });
        }, 2000); // Clear after 2 seconds
      }
    }
  }, [block.type, block.content, projectUniqueSceneHeadings, recentlySavedHeadings]);

  // Function to check if the current scene heading is new - NO useCallback to avoid stale closures
  const isNewSceneHeading = () => {
    if (block.type !== 'scene-heading') return false;
    
    const trimmedInput = block.content.trim();
    if (!trimmedInput) return false;
    
    // Use the EXACT same logic as SceneHeadingSuggestions component
    const inputUpper = trimmedInput.toUpperCase();
    
    // Default scene type suggestions (same as dropdown)
    const defaultSceneTypes = [
      { label: 'INT. ' },
      { label: 'EXT. ' },
      { label: 'INT./EXT. ' },
      { label: 'EXT./INT. ' },
      { label: 'I/E. ' }
    ];
    
    // Create suggestions array like dropdown does - include ALL existing scene headings
    const allLabelsUpper = new Set();
    
    // Add default scene types
    defaultSceneTypes.forEach(type => {
      allLabelsUpper.add(type.label.toUpperCase().trim());
    });
    
    // Add existing scene headings
    projectUniqueSceneHeadings.forEach(heading => {
      allLabelsUpper.add(heading.text.toUpperCase().trim());
    });
    
    // Check exact match
    const exactMatch = allLabelsUpper.has(inputUpper);
    
    // Check valid prefix
    const hasValidPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i.test(trimmedInput);
    
    // Check if it's only a prefix in defaults
    const isOnlyPrefixInDefaults = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === inputUpper);
    
    // EXACT same condition as dropdown: show NEW badge if input exists, no exact match, has valid prefix, and not just a default prefix
    const shouldShowNew = trimmedInput && !exactMatch && hasValidPrefix && !isOnlyPrefixInDefaults;
    
    // Show when suggestions are active OR when the block is active (to match dropdown timing)
    const result = shouldShowNew && (showSuggestions || isActive);
    
    // Debug logging
    console.log('Badge Debug:', {
      blockId: block.id,
      trimmedInput,
      inputUpper,
      exactMatch,
      hasValidPrefix,
      isOnlyPrefixInDefaults,
      shouldShowNew,
      showSuggestions,
      isActive,
      result
    });
    
    return result;
  };


  const updateSuggestionsPosition = () => {
    if (!contentElement) return;

    const blockRect = contentElement.getBoundingClientRect();
    
    setSuggestionsPosition({
      x: 0,
      y: blockRect.height
    });
  };

  // ฟังก์ชันปิด suggestions แบบ clean
  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSuggestionType(null);
    setSuggestionsPosition(null);
    suggestionClosingRef.current = true;
    
    // รีเซ็ต flag หลังจากหน่วงเวลาสั้นๆ
    setTimeout(() => {
      suggestionClosingRef.current = false;
    }, 100);
  }, []);

  useEffect(() => {
    if (isActive && !suggestionClosingRef.current) {
      const content = block.content;
      
      if (block.type === 'scene-heading') {
        updateSuggestionsPosition();
        setSuggestionType('scene');
        setCurrentInput(content);
        setShowSuggestions(true);
      } else if (block.type === 'transition' && !content.trim()) {
        updateSuggestionsPosition();
        setSuggestionType('transition');
        setShowSuggestions(true);
      } else if (block.type === 'shot' && !content.trim()) {
        updateSuggestionsPosition();
        setSuggestionType('shot');
        setShowSuggestions(true);
      } else if (block.type === 'character') {
        updateSuggestionsPosition();
        setSuggestionType('character');
        setCurrentInput(content);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [block.type, block.content, isActive]);

  const handleFocus = () => {
    onFocus(block.id);
    
    // ไม่เปิด suggestions ใหม่ถ้าเพิ่งปิดไป
    if (suggestionClosingRef.current) return;
    
    if (block.type === 'scene-heading') {
      updateSuggestionsPosition();
      setSuggestionType('scene');
      setCurrentInput(block.content);
      setShowSuggestions(true);
    } else if (block.type === 'transition' && !block.content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('transition');
      setShowSuggestions(true);
    } else if (block.type === 'shot' && !block.content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('shot');
      setShowSuggestions(true);
    } else if (block.type === 'character') {
      updateSuggestionsPosition();
      setSuggestionType('character');
      setCurrentInput(block.content);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionSelect = useCallback((value: string) => {
    console.log(`Selected suggestion: "${value}" for block type: ${block.type}`);
    
    // Check if this is a scene heading prefix selection
    const isSceneTypePrefix = block.type === 'scene-heading' && 
                             /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)\s?$/i.test(value.trim());
    
    // Update content first
    onContentChange(block.id, value, block.type);
    
    // For prefix-only selections, keep suggestions open and maintain focus
    if (isSceneTypePrefix) {
      // Don't close suggestions for prefix-only selections
      // Just update the current input and maintain focus
      setCurrentInput(value);
      
      // Set focus and cursor position without closing suggestions
      setTimeout(() => {
        const el = blockRefs.current[block.id];
        if (el) {
          el.focus();
          
          // Place cursor at the end of the text
          const range = document.createRange();
          const selection = window.getSelection();
          
          if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
            const textLength = el.firstChild.textContent?.length || 0;
            range.setStart(el.firstChild, textLength);
            range.setEnd(el.firstChild, textLength);
          } else {
            // Create text node if it doesn't exist
            const textNode = document.createTextNode(value);
            el.appendChild(textNode);
            range.setStart(textNode, value.length);
            range.setEnd(textNode, value.length);
          }
          
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }, 0);
      
      return; // Don't close suggestions
    }
    
    // For complete selections, close suggestions and set focus
    closeSuggestions();
    
    // Set focus and cursor position with simplified approach
    setTimeout(() => {
      const el = blockRefs.current[block.id];
      if (el) {
        el.focus();
        
        // Use a simpler approach for cursor positioning
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          
          // Find the text node or create one
          let textNode = el.firstChild;
          if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            textNode = document.createTextNode(value);
            el.innerHTML = '';
            el.appendChild(textNode);
          }
          
          // Set cursor at the end
          const textLength = textNode.textContent?.length || 0;
          range.setStart(textNode, textLength);
          range.setEnd(textNode, textLength);
          selection.addRange(range);
        }
      }
    }, 10); // Slightly longer delay for stability
  }, [block.id, block.type, onContentChange, blockRefs, closeSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // If suggestions are showing and this is a navigation/selection key, let suggestions handle it
    if (showSuggestions && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
      // Don't prevent default here - let the suggestions component handle it
      // The suggestions component will prevent default and stop propagation
      return;
    }
    
    // For all other keys, pass to parent component
    onKeyDown(e, block.id);
    
    // Update current input for suggestion filtering
    if (showSuggestions) {
      // Use setTimeout to get the updated content after the key event
      setTimeout(() => {
        const content = e.currentTarget.textContent || '';
        setCurrentInput(content);
        updateSuggestionsPosition();
      }, 0);
    }
  };

  const handleInput = () => {
    const content = contentElement?.textContent || '';
    setCurrentInput(content);
    
    // ไม่เปิด suggestions ใหม่ถ้าเพิ่งปิดไป
    if (suggestionClosingRef.current) return;
    
    if (block.type === 'scene-heading') {
      updateSuggestionsPosition();
      setSuggestionType('scene');
      setShowSuggestions(true);
    } else if (block.type === 'transition' && !content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('transition');
      setShowSuggestions(true);
    } else if (block.type === 'shot' && !content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('shot');
      setShowSuggestions(true);
    } else if (block.type === 'character') {
      updateSuggestionsPosition();
      setSuggestionType('character');
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (ignoreBlurRef.current) {
      return;
    }
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('.scene-heading-suggestions, .transition-suggestions, .shot-type-suggestions, .character-suggestions, .element-suggestions')) {
      onContentChange(block.id, e.currentTarget.textContent || '');
      closeSuggestions();
    }
  };

  const handleDoubleClickInternal = (e: React.MouseEvent) => {
    if (onDoubleClick) {
      onDoubleClick(block.id, e);
    }
  };

  return (
    <div 
      className={`relative screenplay-block block-container ${getBlockMargin(block.type)} ${
        isSelected ? 'selecting' : ''
      } ${isSelected ? 'multi-selected' : ''}`}
      onClick={(e) => onClick(block.id, e)}
      onMouseDown={(e) => onMouseDown(block.id, e)}
      onDoubleClick={handleDoubleClickInternal}
      data-block-id={block.id}
      data-active={isActive}
      data-selected={isSelected}
      data-block-type={block.type}
    >
      {block.type === 'scene-heading' && (
        <div
          className={`absolute inset-0 ${
            isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
          } rounded`}
          style={{
            transform: 'translateY(2px)',
            height: '1.75rem',
          }}
        />
      )}
      {block.type === 'scene-heading' && block.number && (
        <div
          className={`absolute -left-8 top-1/2 -translate-y-1/2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {block.number}
        </div>
      )}
      <div
        ref={(el) => {
          if (blockRefs && blockRefs.current) {
            blockRefs.current[block.id] = el;
          }
          setContentElement(el);
        }}
        contentEditable
        suppressContentEditableWarning
        className={`block-editor ${getBlockStyle({ type: block.type, isDarkMode, isSelected })} ${
          isSelected ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100') : ''
        }`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        data-block-id={block.id}
        style={{
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text',
          userSelect: 'text',
        }}
      >
        {block.content}
      </div>
      {block.type === 'dialogue' && block.number && (
        <div
          className={`absolute -right-8 top-1/2 -translate-y-1/2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {block.number}
        </div>
      )}
      
      {/* NEW badge for new scene headings */}
      {isNewSceneHeading() && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm">
            NEW
          </span>
        </div>
      )}
      
      
      
      {/* Suggestions based on block type */}
      {showSuggestions && suggestionsPosition && (
        <>
          {suggestionType === 'scene' && (
            <SceneHeadingSuggestions
              blockId={block.id}
              onSelect={handleSuggestionSelect}
              position={suggestionsPosition}
              onClose={closeSuggestions}
              projectId={projectId}
              screenplayId={screenplayId}
              currentInput={currentInput}
              projectUniqueSceneHeadings={projectUniqueSceneHeadings}
            />
          )}
          
          {suggestionType === 'transition' && (
            <TransitionSuggestions
              blockId={block.id}
              onSelect={handleSuggestionSelect}
              position={suggestionsPosition}
              onClose={closeSuggestions}
            />
          )}
          
          {suggestionType === 'shot' && (
            <ShotTypeSuggestions
              blockId={block.id}
              onSelect={handleSuggestionSelect}
              position={suggestionsPosition}
              onClose={closeSuggestions}
            />
          )}
          
          {suggestionType === 'character' && (
            <CharacterSuggestions
              blockId={block.id}
              onSelect={handleSuggestionSelect}
              position={suggestionsPosition}
              onClose={closeSuggestions}
              projectCharacters={projectCharacters}
              projectId={projectId}
              currentInput={currentInput}
            />
          )}

          {suggestionType === 'element' && projectElements && (
            <ElementSuggestions
              blockId={block.id}
              onSelect={handleSuggestionSelect}
              position={suggestionsPosition}
              onClose={closeSuggestions}
              projectElements={projectElements}
              currentInput={currentInput}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BlockComponent;
