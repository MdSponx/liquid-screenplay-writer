import { BlockStyleProps } from '../types';
import { BLOCK_TYPES } from '../constants/editorConstants';

export const getBlockStyle = ({ type, isDarkMode, isSelected }: BlockStyleProps): string => {
  const baseStyles = 'font-mono text-base outline-none break-words transition-colors duration-200 leading-snug';
  const darkModeText = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const selectedStyles = isSelected ? (isDarkMode ? 'bg-accent-500/30' : 'bg-accent-100') : '';

  const styles: Record<typeof BLOCK_TYPES[number], string> = {
    'scene-heading': `${baseStyles} ${darkModeText} ${selectedStyles} w-full uppercase font-bold py-1 relative inline-block`,
    'action': `${baseStyles} ${darkModeText} ${selectedStyles} w-full py-0.5`,
    'character': `${baseStyles} ${darkModeText} ${selectedStyles} w-2/3 uppercase font-semibold py-1 mt-2 mx-auto text-center`,
    'dialogue': `${baseStyles} ${darkModeText} ${selectedStyles} w-2/3 py-0.5 mx-auto`,
    'parenthetical': `${baseStyles} ${darkModeText} ${selectedStyles} w-1/2 italic py-0 mx-auto leading-tight`,
    'transition': `${baseStyles} ${darkModeText} ${selectedStyles} w-full uppercase font-bold py-1 text-right`,
    'text': `${baseStyles} ${darkModeText} ${selectedStyles} w-full py-0.5`,
    'shot': `${baseStyles} ${darkModeText} ${selectedStyles} w-full uppercase font-bold py-1`,
  };

  return styles[type as keyof typeof styles] || `${baseStyles} ${darkModeText} ${selectedStyles}`;
};

export const getBlockMargin = (type: string): string => {
  const margins: Record<typeof BLOCK_TYPES[number], string> = {
    'scene-heading': 'mb-1.5',
    'action': 'mb-1',
    'character': 'mb-1',
    'dialogue': 'mb-1',
    'parenthetical': 'mb-0.25 mt-0',
    'transition': 'mb-1.5',
    'text': 'mb-1',
    'shot': 'mb-1.5',
  };

  return margins[type as keyof typeof margins] || 'mb-1';
};