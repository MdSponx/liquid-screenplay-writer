import { 
  isPrefixOnly, 
  validateSceneHeading, 
  normalizeSceneHeading, 
  extractPrefix, 
  hasContentBeyondPrefix, 
  getValidPrefixes, 
  filterValidSceneHeadings 
} from '../sceneHeadingValidation';

describe('Scene Heading Validation', () => {
  describe('isPrefixOnly', () => {
    test('should return true for prefix-only entries', () => {
      expect(isPrefixOnly('INT.')).toBe(true);
      expect(isPrefixOnly('EXT.')).toBe(true);
      expect(isPrefixOnly('INT./EXT.')).toBe(true);
      expect(isPrefixOnly('EXT./INT.')).toBe(true);
      expect(isPrefixOnly('I/E.')).toBe(true);
      
      // Test with whitespace
      expect(isPrefixOnly(' INT. ')).toBe(true);
      expect(isPrefixOnly('  EXT.  ')).toBe(true);
      
      // Test case insensitive
      expect(isPrefixOnly('int.')).toBe(true);
      expect(isPrefixOnly('ext.')).toBe(true);
    });

    test('should return false for complete scene headings', () => {
      expect(isPrefixOnly('INT. LIVING ROOM - DAY')).toBe(false);
      expect(isPrefixOnly('EXT. HOUSE - NIGHT')).toBe(false);
      expect(isPrefixOnly('INT./EXT. CAR - DAY')).toBe(false);
      expect(isPrefixOnly('EXT./INT. BUILDING - NIGHT')).toBe(false);
      expect(isPrefixOnly('I/E. OFFICE - DAY')).toBe(false);
    });

    test('should return false for invalid prefixes', () => {
      expect(isPrefixOnly('INTERIOR')).toBe(false);
      expect(isPrefixOnly('EXTERIOR')).toBe(false);
      expect(isPrefixOnly('FADE IN:')).toBe(false);
      expect(isPrefixOnly('')).toBe(false);
    });
  });

  describe('validateSceneHeading', () => {
    test('should validate complete scene headings', () => {
      const validHeadings = [
        'INT. LIVING ROOM - DAY',
        'EXT. HOUSE - NIGHT',
        'INT./EXT. CAR - DAY',
        'EXT./INT. BUILDING - NIGHT',
        'I/E. OFFICE - DAY'
      ];

      validHeadings.forEach(heading => {
        const result = validateSceneHeading(heading);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    test('should reject prefix-only entries', () => {
      const prefixOnlyHeadings = ['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.', 'I/E.'];

      prefixOnlyHeadings.forEach(heading => {
        const result = validateSceneHeading(heading);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Cannot save prefix-only scene headings (INT., EXT., etc.)');
      });
    });

    test('should reject empty scene headings', () => {
      const emptyHeadings = ['', '   ', '\t', '\n'];

      emptyHeadings.forEach(heading => {
        const result = validateSceneHeading(heading);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Scene heading cannot be empty');
      });
    });

    test('should reject scene headings without valid prefix', () => {
      const invalidHeadings = [
        'LIVING ROOM - DAY',
        'FADE IN:',
        'JOHN walks into the room',
        'INTERIOR HOUSE'
      ];

      invalidHeadings.forEach(heading => {
        const result = validateSceneHeading(heading);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Scene heading must start with a valid prefix (INT., EXT., etc.)');
      });
    });
  });

  describe('normalizeSceneHeading', () => {
    test('should normalize scene headings to uppercase and trim whitespace', () => {
      expect(normalizeSceneHeading('int. living room - day')).toBe('INT. LIVING ROOM - DAY');
      expect(normalizeSceneHeading('  EXT. house - night  ')).toBe('EXT. HOUSE - NIGHT');
      expect(normalizeSceneHeading('\tINT./EXT. car - day\n')).toBe('INT./EXT. CAR - DAY');
    });
  });

  describe('extractPrefix', () => {
    test('should extract valid prefixes', () => {
      expect(extractPrefix('INT. LIVING ROOM - DAY')).toBe('INT.');
      expect(extractPrefix('EXT. HOUSE - NIGHT')).toBe('EXT.');
      expect(extractPrefix('INT./EXT. CAR - DAY')).toBe('INT./EXT.');
      expect(extractPrefix('EXT./INT. BUILDING - NIGHT')).toBe('EXT./INT.');
      expect(extractPrefix('I/E. OFFICE - DAY')).toBe('I/E.');
    });

    test('should handle case insensitive input', () => {
      expect(extractPrefix('int. living room - day')).toBe('INT.');
      expect(extractPrefix('ext. house - night')).toBe('EXT.');
    });

    test('should return null for invalid prefixes', () => {
      expect(extractPrefix('LIVING ROOM - DAY')).toBe(null);
      expect(extractPrefix('FADE IN:')).toBe(null);
      expect(extractPrefix('')).toBe(null);
    });
  });

  describe('hasContentBeyondPrefix', () => {
    test('should return true for complete scene headings', () => {
      expect(hasContentBeyondPrefix('INT. LIVING ROOM - DAY')).toBe(true);
      expect(hasContentBeyondPrefix('EXT. HOUSE - NIGHT')).toBe(true);
      expect(hasContentBeyondPrefix('INT./EXT. CAR')).toBe(true);
    });

    test('should return false for prefix-only entries', () => {
      expect(hasContentBeyondPrefix('INT.')).toBe(false);
      expect(hasContentBeyondPrefix('EXT.')).toBe(false);
      expect(hasContentBeyondPrefix('INT./EXT.')).toBe(false);
      expect(hasContentBeyondPrefix('INT.   ')).toBe(false); // Only whitespace after prefix
    });

    test('should return false for invalid prefixes', () => {
      expect(hasContentBeyondPrefix('LIVING ROOM - DAY')).toBe(false);
      expect(hasContentBeyondPrefix('FADE IN:')).toBe(false);
    });
  });

  describe('getValidPrefixes', () => {
    test('should return all valid prefixes', () => {
      const prefixes = getValidPrefixes();
      expect(prefixes).toEqual(['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.', 'I/E.']);
    });
  });

  describe('filterValidSceneHeadings', () => {
    test('should filter out invalid scene headings', () => {
      const sceneHeadings = [
        'INT. LIVING ROOM - DAY',        // Valid
        'EXT.',                          // Invalid - prefix only
        'EXT. HOUSE - NIGHT',           // Valid
        'LIVING ROOM - DAY',            // Invalid - no prefix
        'INT./EXT. CAR - DAY',          // Valid
        '',                             // Invalid - empty
        'I/E.',                         // Invalid - prefix only
        'I/E. OFFICE - DAY'             // Valid
      ];

      const filtered = filterValidSceneHeadings(sceneHeadings);
      expect(filtered).toEqual([
        'INT. LIVING ROOM - DAY',
        'EXT. HOUSE - NIGHT',
        'INT./EXT. CAR - DAY',
        'I/E. OFFICE - DAY'
      ]);
    });

    test('should return empty array for all invalid headings', () => {
      const invalidHeadings = ['INT.', 'EXT.', '', 'LIVING ROOM', 'FADE IN:'];
      const filtered = filterValidSceneHeadings(invalidHeadings);
      expect(filtered).toEqual([]);
    });

    test('should return all headings if all are valid', () => {
      const validHeadings = [
        'INT. LIVING ROOM - DAY',
        'EXT. HOUSE - NIGHT',
        'INT./EXT. CAR - DAY'
      ];
      const filtered = filterValidSceneHeadings(validHeadings);
      expect(filtered).toEqual(validHeadings);
    });
  });
});
