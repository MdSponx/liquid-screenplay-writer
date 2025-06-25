/**
 * Scene Heading Validation Utilities
 * 
 * This module provides utilities for validating scene headings according to the updated requirements:
 * 1. Prevent prefix-only entries (INT., EXT., etc.) from being saved
 * 2. Ensure unique text fields in documents
 * 3. Count usage only from current editor state
 */

/**
 * Check if a scene heading text is a prefix-only entry
 */
export const isPrefixOnly = (text: string): boolean => {
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

/**
 * Validate a scene heading before saving
 */
export const validateSceneHeading = (text: string): { isValid: boolean; reason?: string } => {
  const trimmedText = text.trim();
  
  // Check if empty
  if (trimmedText.length === 0) {
    return { isValid: false, reason: 'Scene heading cannot be empty' };
  }
  
  // Check if prefix-only
  if (isPrefixOnly(trimmedText)) {
    return { isValid: false, reason: 'Cannot save prefix-only scene headings (INT., EXT., etc.)' };
  }
  
  // Check if it has a valid prefix
  const hasValidPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i.test(trimmedText);
  if (!hasValidPrefix) {
    return { isValid: false, reason: 'Scene heading must start with a valid prefix (INT., EXT., etc.)' };
  }
  
  return { isValid: true };
};

/**
 * Normalize scene heading text for consistent storage
 */
export const normalizeSceneHeading = (text: string): string => {
  return text.trim().toUpperCase();
};

/**
 * Extract scene heading prefix from text
 */
export const extractPrefix = (text: string): string | null => {
  const match = text.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i);
  return match ? match[0].toUpperCase() : null;
};

/**
 * Check if scene heading has content beyond the prefix
 */
export const hasContentBeyondPrefix = (text: string): boolean => {
  const prefix = extractPrefix(text);
  if (!prefix) return false;
  
  const contentAfterPrefix = text.substring(prefix.length).trim();
  return contentAfterPrefix.length > 0;
};

/**
 * Get all valid scene heading prefixes
 */
export const getValidPrefixes = (): string[] => {
  return ['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.', 'I/E.'];
};

/**
 * Filter scene headings to remove invalid entries
 */
export const filterValidSceneHeadings = (sceneHeadings: string[]): string[] => {
  return sceneHeadings.filter(heading => {
    const validation = validateSceneHeading(heading);
    return validation.isValid;
  });
};
