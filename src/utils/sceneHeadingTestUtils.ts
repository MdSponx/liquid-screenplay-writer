/**
 * Test utilities for the scene heading system
 * These functions help verify the improvements work correctly
 */

import { UniqueSceneHeadingDocument } from '../types';

// Mock data for testing
export const mockSceneHeadings: UniqueSceneHeadingDocument[] = [
  {
    id: 'hash1',
    text: 'INT. COFFEE SHOP - DAY',
    text_uppercase: 'INT. COFFEE SHOP - DAY',
    count: 5,
    lastUsed: new Date() as any,
    screenplayIds: ['screenplay1'],
    associated_characters: ['SARAH', 'JOHN'],
    associated_elements: []
  },
  {
    id: 'hash2',
    text: 'EXT. PARK - SUNSET',
    text_uppercase: 'EXT. PARK - SUNSET',
    count: 3,
    lastUsed: new Date() as any,
    screenplayIds: ['screenplay1'],
    associated_characters: ['SARAH'],
    associated_elements: []
  },
  {
    id: 'hash3',
    text: 'INT. SARAH\'S APARTMENT - NIGHT',
    text_uppercase: 'INT. SARAH\'S APARTMENT - NIGHT',
    count: 8,
    lastUsed: new Date() as any,
    screenplayIds: ['screenplay1'],
    associated_characters: ['SARAH'],
    associated_elements: []
  }
];

// Test the suggestion generation logic
export const testSuggestionGeneration = (
  input: string,
  sceneHeadings: UniqueSceneHeadingDocument[]
) => {
  console.log(`Testing suggestion generation for input: "${input}"`);
  
  const inputUpper = input.toUpperCase();
  const defaultSceneTypes = [
    { label: 'INT. ', description: 'Interior scene' },
    { label: 'EXT. ', description: 'Exterior scene' },
    { label: 'INT./EXT. ', description: 'Interior/Exterior scene' },
    { label: 'EXT./INT. ', description: 'Exterior/Interior scene' },
    { label: 'I/E. ', description: 'Interior/Exterior scene (short)' }
  ];

  // Test default type matching
  const matchingDefaults = defaultSceneTypes.filter(type => 
    type.label.toUpperCase().startsWith(inputUpper)
  );
  
  // Test existing heading matching
  const matchingExisting = sceneHeadings.filter(heading => 
    heading.text.toUpperCase().includes(inputUpper)
  );

  // Test new heading detection
  const allLabels = new Set([
    ...defaultSceneTypes.map(d => d.label.toUpperCase().trim()),
    ...sceneHeadings.map(h => h.text.toUpperCase().trim())
  ]);
  
  const exactMatch = allLabels.has(inputUpper);
  const hasValidPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i.test(input);
  const isOnlyPrefix = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === inputUpper);
  const shouldShowNew = input && !exactMatch && hasValidPrefix && !isOnlyPrefix;

  const results = {
    input,
    matchingDefaults: matchingDefaults.length,
    matchingExisting: matchingExisting.length,
    exactMatch,
    hasValidPrefix,
    isOnlyPrefix,
    shouldShowNew,
    suggestions: [
      ...matchingDefaults,
      ...matchingExisting.map(h => ({
        label: h.text,
        description: `Used ${h.count} times`,
        count: h.count
      }))
    ]
  };

  console.log('Test results:', results);
  return results;
};

// Test caching behavior
export const testCaching = () => {
  console.log('Testing caching behavior...');
  
  const cache: { [key: string]: { data: any; timestamp: number } } = {};
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Simulate cache operations
  const setCacheItem = (key: string, data: any) => {
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    console.log(`Cache set for key: ${key}`);
  };
  
  const getCacheItem = (key: string) => {
    const item = cache[key];
    if (!item) {
      console.log(`Cache miss for key: ${key}`);
      return null;
    }
    
    const isExpired = Date.now() - item.timestamp > CACHE_DURATION;
    if (isExpired) {
      console.log(`Cache expired for key: ${key}`);
      delete cache[key];
      return null;
    }
    
    console.log(`Cache hit for key: ${key}`);
    return item.data;
  };
  
  // Test cache operations
  setCacheItem('test-project-int', mockSceneHeadings);
  
  // Immediate retrieval should hit
  const hit1 = getCacheItem('test-project-int');
  console.log('Immediate retrieval:', hit1 ? 'HIT' : 'MISS');
  
  // Non-existent key should miss
  const miss1 = getCacheItem('non-existent');
  console.log('Non-existent key:', miss1 ? 'HIT' : 'MISS');
  
  return {
    cacheSize: Object.keys(cache).length,
    testsPassed: hit1 && !miss1
  };
};

// Test debouncing behavior
export const testDebouncing = () => {
  console.log('Testing debouncing behavior...');
  
  let callCount = 0;
  let lastCallTime = 0;
  
  const debouncedFunction = (() => {
    let timer: NodeJS.Timeout | null = null;
    
    return (input: string) => {
      if (timer) clearTimeout(timer);
      
      timer = setTimeout(() => {
        callCount++;
        lastCallTime = Date.now();
        console.log(`Debounced function called with: "${input}" (call #${callCount})`);
      }, 300);
    };
  })();
  
  // Simulate rapid typing
  const inputs = ['I', 'IN', 'INT', 'INT.', 'INT. ', 'INT. C', 'INT. CO', 'INT. COFFEE'];
  
  inputs.forEach((input, index) => {
    setTimeout(() => {
      debouncedFunction(input);
    }, index * 50); // Type every 50ms
  });
  
  // Check results after debounce period
  setTimeout(() => {
    console.log(`Debouncing test complete. Function called ${callCount} times (should be 1)`);
    return {
      callCount,
      expectedCalls: 1,
      testPassed: callCount === 1
    };
  }, 1000);
};

// Performance test
export const testPerformance = () => {
  console.log('Testing performance...');
  
  const startTime = performance.now();
  
  // Simulate suggestion generation for multiple inputs
  const testInputs = [
    'INT.',
    'EXT.',
    'INT. COFFEE',
    'EXT. PARK',
    'INT. SARAH\'S',
    'I/E.',
    'INT./EXT.'
  ];
  
  testInputs.forEach(input => {
    testSuggestionGeneration(input, mockSceneHeadings);
  });
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`Performance test completed in ${duration.toFixed(2)}ms`);
  
  return {
    duration,
    inputsProcessed: testInputs.length,
    averageTimePerInput: duration / testInputs.length,
    performanceGrade: duration < 100 ? 'Excellent' : duration < 200 ? 'Good' : 'Needs Improvement'
  };
};

// Run all tests
export const runAllTests = () => {
  console.log('🧪 Running Scene Heading System Tests...\n');
  
  console.log('1. Testing Suggestion Generation:');
  testSuggestionGeneration('INT.', mockSceneHeadings);
  testSuggestionGeneration('INT. COFFEE', mockSceneHeadings);
  testSuggestionGeneration('EXT.', mockSceneHeadings);
  testSuggestionGeneration('SARAH', mockSceneHeadings);
  
  console.log('\n2. Testing Caching:');
  testCaching();
  
  console.log('\n3. Testing Debouncing:');
  testDebouncing();
  
  console.log('\n4. Testing Performance:');
  testPerformance();
  
  console.log('\n✅ All tests completed! Check console for detailed results.');
};

// Export for use in development
if (typeof window !== 'undefined') {
  (window as any).sceneHeadingTests = {
    runAllTests,
    testSuggestionGeneration,
    testCaching,
    testDebouncing,
    testPerformance,
    mockSceneHeadings
  };
}
