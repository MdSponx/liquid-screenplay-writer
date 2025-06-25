import React from 'react';
import type { CollaboratorCursor } from '../../types';

interface CollaboratorCursorsProps {
  cursors: CollaboratorCursor[];
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  cursors,
  blockRefs
}) => {
  return (
    <>
      {cursors.map((cursor) => {
        const block = blockRefs.current[cursor.position.blockId];
        if (!block) return null;

        const blockRect = block.getBoundingClientRect();
        const range = document.createRange();
        const textNode = block.firstChild || block;

        try {
          range.setStart(textNode, Math.min(cursor.position.offset, textNode.textContent?.length || 0));
          const cursorRect = range.getBoundingClientRect();

          return (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none"
              style={{
                left: cursorRect.left - blockRect.left,
                top: cursorRect.top - blockRect.top,
                height: cursorRect.height
              }}
            >
              <div 
                className="w-0.5 h-full animate-pulse"
                style={{
                  backgroundColor: `hsl(${hashCode(cursor.userId) % 360}, 70%, 50%)`
                }}
              />
              <div 
                className="absolute top-0 left-2 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                style={{
                  backgroundColor: `hsl(${hashCode(cursor.userId) % 360}, 70%, 50%)`
                }}
              >
                {cursor.userId}
              </div>
            </div>
          );
        } catch (err) {
          console.error('Failed to render cursor:', err);
          return null;
        }
      })}
    </>
  );
};

// Simple hash function for consistent colors
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export default CollaboratorCursors;