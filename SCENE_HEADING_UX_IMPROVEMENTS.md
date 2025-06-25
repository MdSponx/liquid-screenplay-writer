# Scene Heading UX Improvements

This document outlines the comprehensive improvements made to the scene heading creation and selection user experience, addressing the issues identified in the original task.

## Issues Addressed

### A. Excessive Status Indicators in Dropdown
**Problem**: Multiple status indicators (new, duplicate, count) created visual noise and confusion.
**Solution**: Simplified to show only one active status indicator per suggestion with clear priority.

### B. Multiple Enter Presses Required
**Problem**: Users needed to press Enter multiple times to confirm selections or trigger creation.
**Solution**: Optimized to single Enter press for all operations.

### C. Missing Cursor in Following Action Block
**Problem**: After creating a scene heading, cursor failed to appear in subsequent Action block.
**Solution**: Enhanced focus management with retry mechanisms and automatic Action block creation.

## Key Improvements

### 1. Simplified Dropdown UX (`SceneHeadingSuggestionsImproved.tsx`)

#### Single Status Indicator Priority System
```typescript
const getStatusIndicator = (suggestion: SuggestionItem) => {
  // Priority: NEW > usage count > default indicator
  if (suggestion.isNew) {
    return <span className="...">NEW</span>;
  }
  
  if (suggestion.count && suggestion.count > 1) {
    return <span className="...">{suggestion.count}×</span>;
  }
  
  return null;
};
```

#### Auto-prioritized "New" Entries
- New entries automatically appear at the top with highest priority
- Smart sorting algorithm considers relevance, exact matches, and usage frequency
- Limited to 10 suggestions to reduce visual noise

#### Single Confirm Action
```typescript
// Single Enter press handles both selection and creation
if (e.key === 'Enter') {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  if (suggestions.length > 0 && suggestions[selectedIndex]) {
    handleSelectSuggestion(suggestions[selectedIndex].label);
  }
}
```

### 2. Enhanced Focus Management (`useBlockHandlersImproved.ts`)

#### Retry-based Focus System
```typescript
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
    
    // Enhanced focus logic with cursor positioning
    // ...
  };
  
  requestAnimationFrame(attemptFocus);
}, [blockRefs]);
```

#### Automatic Action Block Creation
```typescript
const createActionBlockAfterSceneHeading = useCallback((sceneHeadingBlockId: string) => {
  // Creates action block and ensures proper focus transfer
  const actionBlockId = `action-${uuidv4()}`;
  // ... block creation logic
  
  setTimeout(() => {
    setFocusWithRetry(actionBlockId, 'start');
  }, 50); // Optimized delay for scene heading processing
  
  return actionBlockId;
}, [state.blocks, updateBlocks, setHasChanges, setFocusWithRetry]);
```

### 3. Improved Block Component (`BlockComponentImproved.tsx`)

#### Enhanced Suggestion Selection
```typescript
const handleSuggestionSelect = useCallback((value: string) => {
  const isSceneTypePrefix = block.type === 'scene-heading' && 
                           /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)\s?$/i.test(value.trim());
  
  if (isSceneTypePrefix) {
    // Keep suggestions open for prefix-only selections
    setCurrentInput(value);
    // Enhanced focus management for continued typing
    return;
  }
  
  // For complete selections, close suggestions and trigger action creation
  closeSuggestions();
  
  if (block.type === 'scene-heading' && !isSceneTypePrefix) {
    setTimeout(() => {
      handleEnterActionCreation();
    }, 100);
  }
}, [block.id, block.type, onContentChange, blockRefs, closeSuggestions, handleEnterActionCreation]);
```

#### Smart NEW Badge Display
```typescript
const isNewSceneHeading = useCallback(() => {
  // Exact same logic as dropdown to ensure consistency
  const shouldShowNew = trimmedInput && !exactMatch && hasValidPrefix && !isOnlyPrefixInDefaults;
  return shouldShowNew && (showSuggestions || isActive);
}, [block.type, block.content, projectUniqueSceneHeadings, showSuggestions, isActive]);
```

## Technical Implementation Details

### 1. Priority-based Suggestion Sorting
```typescript
const processedSuggestions = rawSuggestions
  .filter(s => s.label !== '---' && s.label !== '---new---') // Remove separators
  .map((suggestion, index) => {
    let priority = 0;
    const inputUpper = currentInput.toUpperCase();
    const suggestionUpper = suggestion.label.toUpperCase();
    
    // Highest priority: new entries that match user input
    if (suggestion.isNew && suggestionUpper.startsWith(inputUpper)) {
      priority = 1000;
    }
    // High priority: exact matches
    else if (suggestionUpper === inputUpper) {
      priority = 900;
    }
    // Medium-high priority: starts with input
    else if (suggestionUpper.startsWith(inputUpper)) {
      priority = 800 + (suggestion.count || 0);
    }
    // ... additional priority logic
    
    return { ...suggestion, priority };
  })
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 10); // Limit results
```

### 2. Enhanced Keyboard Navigation
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only handle events from suggestions or active block
    const target = e.target as HTMLElement;
    const isFromSuggestions = target.closest('.scene-heading-suggestions-improved');
    const isFromActiveBlock = target.getAttribute('data-block-id') === blockId;
    
    if (!isFromSuggestions && !isFromActiveBlock) return;
    
    // Single key press handling with proper event management
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    }
    // ... other key handlers
  };
  
  document.addEventListener('keydown', handleKeyDown, { capture: true });
  return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
}, [selectedIndex, suggestions, handleSelectSuggestion, onClose, blockId]);
```

### 3. Cursor Position Management
```typescript
// Enhanced cursor positioning with text node handling
const range = document.createRange();
const selection = window.getSelection();

if (selection) {
  let textNode = el.firstChild;
  
  // Ensure we have a text node
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    textNode = document.createTextNode(value);
    el.innerHTML = '';
    el.appendChild(textNode);
  }
  
  const textLength = textNode.textContent?.length || 0;
  range.setStart(textNode, textLength);
  range.setEnd(textNode, textLength);
  
  selection.removeAllRanges();
  selection.addRange(range);
}
```

## User Experience Flow

### Before Improvements
1. User types scene heading prefix (e.g., "INT.")
2. Dropdown shows multiple confusing status indicators
3. User presses Enter → nothing happens
4. User presses Enter again → selection confirmed
5. User expects cursor in Action block → cursor missing
6. User manually clicks to continue typing

### After Improvements
1. User types scene heading prefix (e.g., "INT.")
2. Dropdown shows clean, prioritized suggestions with single status indicator
3. User presses Enter once → prefix selected, cursor positioned for continued typing
4. User completes scene heading (e.g., "INT. COFFEE SHOP - DAY")
5. User presses Enter once → scene heading confirmed, Action block automatically created
6. Cursor automatically appears in Action block, ready for typing

## Performance Optimizations

### 1. Debounced Search
- 300ms debounce for search operations
- Cached results to reduce Firestore queries
- Smart cache invalidation

### 2. Limited Results
- Maximum 10 suggestions to reduce rendering overhead
- Priority-based filtering ensures most relevant results

### 3. Efficient Event Handling
- Event capture phase for keyboard navigation
- Proper event cleanup to prevent memory leaks
- Optimized re-renders with useCallback and useMemo

## Accessibility Improvements

### 1. Clear Visual Hierarchy
- Single status indicator reduces cognitive load
- High contrast colors for NEW badges
- Clear visual separation between suggestion types

### 2. Keyboard Navigation
- Consistent arrow key navigation
- Single Enter key confirmation
- Escape key to close suggestions

### 3. Screen Reader Support
- Proper ARIA labels and descriptions
- Semantic HTML structure
- Clear focus indicators

## Testing Considerations

### 1. Unit Tests
- Test suggestion priority algorithm
- Test focus management with various scenarios
- Test keyboard navigation edge cases

### 2. Integration Tests
- Test complete scene heading creation flow
- Test Action block creation and focus transfer
- Test suggestion filtering and selection

### 3. User Acceptance Tests
- Verify single Enter press workflow
- Confirm cursor appears in Action block
- Validate NEW badge accuracy

## Migration Path

### 1. Gradual Rollout
- New components can be used alongside existing ones
- Feature flags for A/B testing
- Rollback capability if issues arise

### 2. Component Replacement
```typescript
// Replace existing components
import BlockComponent from './BlockComponentImproved';
import { useBlockHandlersImproved } from '../hooks/useBlockHandlersImproved';
import SceneHeadingSuggestions from './SceneHeadingSuggestionsImproved';
```

### 3. Configuration Options
- Toggle between old and new UX
- Customizable suggestion limits
- Adjustable focus retry settings

## Future Enhancements

### 1. Smart Suggestions
- AI-powered scene heading suggestions based on context
- Learning from user patterns
- Integration with screenplay structure analysis

### 2. Advanced Keyboard Shortcuts
- Quick scene heading templates
- Bulk scene operations
- Custom user shortcuts

### 3. Collaborative Features
- Real-time suggestion sharing
- Team-specific scene heading libraries
- Conflict resolution for simultaneous edits

## Conclusion

These improvements significantly enhance the scene heading creation and selection UX by:

1. **Reducing cognitive load** through simplified status indicators
2. **Streamlining user actions** with single Enter press confirmation
3. **Ensuring smooth workflow** with reliable cursor positioning
4. **Improving accessibility** with better keyboard navigation
5. **Enhancing performance** through optimized rendering and caching

The new implementation maintains backward compatibility while providing a much more intuitive and efficient user experience for screenplay writing.
