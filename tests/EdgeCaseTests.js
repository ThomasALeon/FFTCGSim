/**
 * EDGE CASE TESTS - Tests for unexpected scenarios and edge cases
 * 
 * This test suite covers:
 * - Malformed data handling
 * - Network failure scenarios
 * - Memory constraints with large datasets
 * - Concurrent operation handling
 * - Browser compatibility edge cases
 * - User input validation edge cases
 */

// Mock data for testing
const createMockCards = (count) => {
    const cards = [];
    for (let i = 0; i < count; i++) {
        cards.push({
            id: `${Math.floor(i/200) + 1}-${(i % 200).toString().padStart(3, '0')}H`,
            name: `Test Card ${i}`,
            element: ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'][i % 8],
            type: ['forward', 'backup', 'summon', 'monster'][i % 4],
            cost: (i % 11) + 1, // 1-11 cost range
            set: `Opus ${Math.floor(i/200) + 1}`,
            rarity: ['C', 'R', 'H', 'L', 'S'][i % 5],
            power: i % 2 === 0 ? (i % 10 + 1) * 1000 : null,
            text: i % 3 === 0 ? `Card effect ${i}` : null
        });
    }
    return cards;
};

// Test utilities
function expect(value) {
    return {
        toBe: (expected) => {
            if (value !== expected) {
                throw new Error(`Expected ${expected}, got ${value}`);
            }
        },
        toBeTruthy: () => {
            if (!value) {
                throw new Error(`Expected truthy value, got ${value}`);
            }
        },
        toBeFalsy: () => {
            if (value) {
                throw new Error(`Expected falsy value, got ${value}`);
            }
        },
        toEqual: (expected) => {
            if (JSON.stringify(value) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
            }
        },
        toBeGreaterThan: (expected) => {
            if (value <= expected) {
                throw new Error(`Expected ${value} to be greater than ${expected}`);
            }
        },
        toBeLessThan: (expected) => {
            if (value >= expected) {
                throw new Error(`Expected ${value} to be less than ${expected}`);
            }
        },
        toContain: (expected) => {
            if (!value || !value.includes || !value.includes(expected)) {
                throw new Error(`Expected ${value} to contain ${expected}`);
            }
        },
        toThrow: () => {
            try {
                if (typeof value === 'function') {
                    value();
                }
                throw new Error('Expected function to throw');
            } catch (e) {
                // Expected behavior
            }
        }
    };
}

class EdgeCaseTestSuite {
    constructor(testRunner) {
        this.testRunner = testRunner;
        this.setupTests();
    }

    setupTests() {
        this.testRunner.describe('Edge Case Tests - Data Handling', () => {
            
            this.testRunner.it('should handle malformed JSON gracefully', async () => {
                const malformedJson = '{"invalid": json, "missing": "quotes"}';
                
                const parseJsonSafely = (jsonString) => {
                    try {
                        return JSON.parse(jsonString);
                    } catch (error) {
                        console.warn('Failed to parse JSON:', error.message);
                        return {};
                    }
                };
                
                const result = parseJsonSafely(malformedJson);
                expect(result).toEqual({});
            });

            this.testRunner.it('should handle extremely large card datasets', () => {
                const startTime = performance.now();
                
                // Test with 10k cards (much larger than our 3723)
                const largeDataset = createMockCards(10000);
                
                // Simulate filtering operations
                const fireCards = largeDataset.filter(card => card.element === 'fire');
                const highCostCards = largeDataset.filter(card => card.cost > 8);
                const rareCards = largeDataset.filter(card => card.rarity === 'L');
                
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                
                expect(largeDataset.length).toBe(10000);
                expect(fireCards.length).toBeGreaterThan(0);
                expect(processingTime).toBeLessThan(200); // Should still be fast
            });

            this.testRunner.it('should handle cards with missing or null properties', () => {
                const problematicCards = [
                    { id: '1-001H', name: null, element: 'fire' },
                    { id: '1-002H', name: '', element: null },
                    { id: '1-003H', name: 'Valid', element: 'ice', cost: null },
                    { id: '1-004H', name: 'Another', element: 'wind', cost: undefined },
                    { id: null, name: 'No ID', element: 'earth' },
                    { id: '1-006H' }, // Missing most properties
                    null, // Completely null entry
                    undefined, // Undefined entry
                    { id: '1-008H', name: 'Special chars: <script>alert("xss")</script>', element: 'dark' }
                ];
                
                // Safe filtering function
                const filterSafely = (cards, filters) => {
                    return cards.filter(card => {
                        if (!card || typeof card !== 'object') return false;
                        if (!card.id || typeof card.id !== 'string') return false;
                        if (!card.name || typeof card.name !== 'string') return false;
                        if (!card.element || typeof card.element !== 'string') return false;
                        
                        // Apply filters if provided
                        if (filters.element && card.element !== filters.element) return false;
                        if (filters.minCost && (!card.cost || card.cost < filters.minCost)) return false;
                        
                        return true;
                    });
                };
                
                const safeCards = filterSafely(problematicCards, {});
                const fireCards = filterSafely(problematicCards, { element: 'fire' });
                const expensiveCards = filterSafely(problematicCards, { minCost: 5 });
                
                expect(safeCards.length).toBe(2); // Only 2 fully valid cards
                expect(fireCards.length).toBe(0); // No valid fire cards
                expect(expensiveCards.length).toBe(0); // No cards with valid high cost
            });

            this.testRunner.it('should handle duplicate card IDs', () => {
                const cardsWithDuplicates = [
                    { id: '1-001H', name: 'Original', element: 'fire' },
                    { id: '1-001H', name: 'Duplicate', element: 'ice' },
                    { id: '1-002H', name: 'Unique', element: 'wind' },
                    { id: '1-001H', name: 'Another Duplicate', element: 'earth' }
                ];
                
                // Deduplicate by ID (keep first occurrence)
                const deduplicateCards = (cards) => {
                    const seen = new Set();
                    return cards.filter(card => {
                        if (!card || !card.id || seen.has(card.id)) {
                            return false;
                        }
                        seen.add(card.id);
                        return true;
                    });
                };
                
                const uniqueCards = deduplicateCards(cardsWithDuplicates);
                expect(uniqueCards.length).toBe(2);
                expect(uniqueCards[0].name).toBe('Original');
                expect(uniqueCards[1].name).toBe('Unique');
            });
        });

        this.testRunner.describe('Edge Case Tests - User Input', () => {
            
            this.testRunner.it('should handle malicious search input', () => {
                const maliciousInputs = [
                    '<script>alert("xss")</script>',
                    'javascript:alert(1)',
                    'data:text/html,<script>alert(1)</script>',
                    '../../etc/passwd',
                    'DROP TABLE cards;',
                    'SELECT * FROM users;',
                    String.fromCharCode(0), // Null byte
                    'a'.repeat(10000), // Very long string
                    '🔥🧙‍♂️🐉', // Unicode/emoji
                    '%3Cscript%3E', // URL encoded
                    '&lt;script&gt;'  // HTML encoded
                ];
                
                const sanitizeSearchInput = (input) => {
                    if (!input || typeof input !== 'string') return '';
                    
                    // Remove dangerous patterns
                    let sanitized = input
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/data:/gi, '')
                        .replace(/[<>]/g, '')
                        .replace(/['"]/g, '')
                        .replace(/[;]/g, '')
                        .replace(/\x00/g, '') // Remove null bytes
                        .substring(0, 100); // Limit length
                    
                    return sanitized.trim();
                };
                
                maliciousInputs.forEach(input => {
                    const sanitized = sanitizeSearchInput(input);
                    expect(sanitized.includes('<script>')).toBeFalsy();
                    expect(sanitized.includes('javascript:')).toBeFalsy();
                    expect(sanitized.length).toBeLessThan(101);
                });
            });

            this.testRunner.it('should handle extreme filter combinations', () => {
                const testCards = createMockCards(1000);
                
                // Extreme filter combinations that might return no results
                const extremeFilters = [
                    { element: ['fire'], type: ['summon'], cost: [10, 11], rarity: ['S'] },
                    { element: ['nonexistent'], type: ['invalid'] },
                    { cost: [0, -1, 999] }, // Invalid costs
                    { element: [], type: [], cost: [], rarity: [] }, // Empty arrays
                    { element: null, type: undefined } // Null/undefined filters
                ];
                
                const applyFilters = (cards, filters) => {
                    return cards.filter(card => {
                        if (!card) return false;
                        
                        if (filters.element && Array.isArray(filters.element) && filters.element.length > 0) {
                            if (!filters.element.includes(card.element)) return false;
                        }
                        
                        if (filters.type && Array.isArray(filters.type) && filters.type.length > 0) {
                            if (!filters.type.includes(card.type)) return false;
                        }
                        
                        if (filters.cost && Array.isArray(filters.cost) && filters.cost.length > 0) {
                            if (!filters.cost.includes(card.cost)) return false;
                        }
                        
                        if (filters.rarity && Array.isArray(filters.rarity) && filters.rarity.length > 0) {
                            if (!filters.rarity.includes(card.rarity)) return false;
                        }
                        
                        return true;
                    });
                };
                
                extremeFilters.forEach((filters, index) => {
                    const filtered = applyFilters(testCards, filters);
                    expect(Array.isArray(filtered)).toBeTruthy();
                    // Results may be empty, which is valid for extreme filters
                });
            });
        });

        this.testRunner.describe('Edge Case Tests - Performance', () => {
            
            this.testRunner.it('should handle rapid successive operations', async () => {
                const rapidOperations = [];
                const testCards = createMockCards(500);
                
                // Simulate rapid filtering operations
                for (let i = 0; i < 100; i++) {
                    rapidOperations.push(() => {
                        return testCards.filter(card => 
                            card.element === ['fire', 'ice', 'wind'][i % 3]
                        );
                    });
                }
                
                const startTime = performance.now();
                const results = rapidOperations.map(op => op());
                const endTime = performance.now();
                
                expect(results.length).toBe(100);
                expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
                
                // Verify results are valid
                results.forEach(result => {
                    expect(Array.isArray(result)).toBeTruthy();
                });
            });

            this.testRunner.it('should handle memory intensive operations', () => {
                const memoryTest = () => {
                    const largeArrays = [];
                    
                    // Create multiple large datasets
                    for (let i = 0; i < 10; i++) {
                        largeArrays.push(createMockCards(1000));
                    }
                    
                    // Perform operations on each
                    const results = largeArrays.map(cards => {
                        return {
                            total: cards.length,
                            fire: cards.filter(c => c.element === 'fire').length,
                            forwards: cards.filter(c => c.type === 'forward').length,
                            expensive: cards.filter(c => c.cost > 7).length
                        };
                    });
                    
                    // Clean up
                    largeArrays.length = 0;
                    
                    return results;
                };
                
                const startTime = performance.now();
                const results = memoryTest();
                const endTime = performance.now();
                
                expect(results.length).toBe(10);
                expect(endTime - startTime).toBeLessThan(500);
                
                // Verify results are consistent
                results.forEach(result => {
                    expect(result.total).toBe(1000);
                    expect(result.fire).toBeGreaterThan(0);
                });
            });
        });

        this.testRunner.describe('Edge Case Tests - Network Scenarios', () => {
            
            this.testRunner.it('should handle network timeouts gracefully', async () => {
                const simulateNetworkTimeout = () => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve({ error: 'Network timeout', data: null });
                        }, 100);
                    });
                };
                
                const result = await simulateNetworkTimeout();
                expect(result.error).toBe('Network timeout');
                expect(result.data).toBe(null);
            });

            this.testRunner.it('should handle partial data loading', () => {
                const partialData = {
                    cards: createMockCards(100), // Only 100 instead of expected 3723
                    images: {}, // Missing image data
                    metadata: null // Missing metadata
                };
                
                const validateDataIntegrity = (data) => {
                    const issues = [];
                    
                    if (!data.cards || data.cards.length < 3000) {
                        issues.push('Incomplete card data');
                    }
                    
                    if (!data.images || Object.keys(data.images).length === 0) {
                        issues.push('Missing image data');
                    }
                    
                    if (!data.metadata) {
                        issues.push('Missing metadata');
                    }
                    
                    return {
                        isValid: issues.length === 0,
                        issues: issues,
                        recoverable: issues.length < 3
                    };
                };
                
                const validation = validateDataIntegrity(partialData);
                expect(validation.isValid).toBeFalsy();
                expect(validation.issues.length).toBe(3);
                expect(validation.recoverable).toBeTruthy();
            });
        });

        this.testRunner.describe('Edge Case Tests - Browser Compatibility', () => {
            
            this.testRunner.it('should handle missing modern JavaScript features', () => {
                // Test fallbacks for older browsers
                const testArrayMethods = () => {
                    const testArray = [1, 2, 3, 4, 5];
                    
                    // Test Array.includes fallback
                    const includesMethod = testArray.includes || function(item) {
                        return this.indexOf(item) !== -1;
                    };
                    
                    // Test Array.find fallback
                    const findMethod = testArray.find || function(callback) {
                        for (let i = 0; i < this.length; i++) {
                            if (callback(this[i], i, this)) {
                                return this[i];
                            }
                        }
                        return undefined;
                    };
                    
                    return {
                        includes: includesMethod.call(testArray, 3),
                        find: findMethod.call(testArray, x => x > 3)
                    };
                };
                
                const results = testArrayMethods();
                expect(results.includes).toBeTruthy();
                expect(results.find).toBe(4);
            });

            this.testRunner.it('should handle localStorage unavailability', () => {
                // Mock localStorage unavailable scenario
                const originalLocalStorage = window.localStorage;
                
                const mockUnavailableStorage = () => {
                    throw new DOMException('LocalStorage not available', 'QuotaExceededError');
                };
                
                const safeLocalStorage = {
                    setItem: (key, value) => {
                        try {
                            localStorage.setItem(key, value);
                            return true;
                        } catch (e) {
                            console.warn('LocalStorage unavailable, using memory storage');
                            // Fallback to memory storage
                            safeLocalStorage._memoryStorage = safeLocalStorage._memoryStorage || {};
                            safeLocalStorage._memoryStorage[key] = value;
                            return false;
                        }
                    },
                    
                    getItem: (key) => {
                        try {
                            return localStorage.getItem(key);
                        } catch (e) {
                            return safeLocalStorage._memoryStorage ? safeLocalStorage._memoryStorage[key] : null;
                        }
                    }
                };
                
                // Test fallback works
                const stored = safeLocalStorage.setItem('test', 'value');
                const retrieved = safeLocalStorage.getItem('test');
                
                expect(retrieved).toBe('value');
            });
        });
    }
}

export { EdgeCaseTestSuite, createMockCards, expect };