export const BLOCK_HEIGHTS = {
  'scene-heading': 2.5,
  'action': 2,
  'character': 2,
  'parenthetical': 1.8,
  'dialogue': 2,
  'transition': 2.5,
  'text': 2,
  'shot': 2.5,
} as const;

export const MAX_PAGE_HEIGHT = 55;

export const BLOCK_TYPES = [
  'scene-heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'text',
  'shot'
] as const;

export const INITIAL_BLOCKS = [
  {
    type: 'action',
    content: 'Write your scene description here.',
  }
];