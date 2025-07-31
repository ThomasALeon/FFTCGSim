/**
 * GAME LOGIC EDGE CASES - Tests for FFTCG-specific edge cases
 * 
 * This test suite covers FFTCG-specific edge cases:
 * - Invalid deck compositions
 * - Unusual card interactions
 * - Edge cases in CP management
 * - Corner cases in combat resolution
 * - Set-specific card validation
 */

import { createMockCards, expect } from './EdgeCaseTests.js';

class GameLogicEdgeCaseTestSuite {
    constructor(testRunner) {
        this.testRunner = testRunner;
        this.setupTests();
    }

    setupTests() {
        this.testRunner.describe('FFTCG Game Logic Edge Cases - Deck Validation', () => {
            
            this.testRunner.it('should handle decks with invalid card counts', () => {
                const validateDeckSize = (cards) => {
                    const errors = [];
                    
                    if (!Array.isArray(cards)) {
                        errors.push('Deck must be an array');
                        return { isValid: false, errors };
                    }
                    
                    if (cards.length < 50) {
                        errors.push(`Deck too small: ${cards.length} cards (minimum 50)`);
                    } else if (cards.length > 50) {
                        errors.push(`Deck too large: ${cards.length} cards (maximum 50)`);
                    }
                    
                    return {
                        isValid: errors.length === 0,
                        errors
                    };
                };
                
                // Test various invalid sizes
                const testCases = [
                    { cards: [], expectedError: 'too small' },
                    { cards: Array(49).fill('1-001H'), expectedError: 'too small' },
                    { cards: Array(51).fill('1-001H'), expectedError: 'too large' },
                    { cards: Array(100).fill('1-001H'), expectedError: 'too large' },
                    { cards: null, expectedError: 'must be an array' },
                    { cards: undefined, expectedError: 'must be an array' }
                ];
                
                testCases.forEach(testCase => {
                    const result = validateDeckSize(testCase.cards);
                    expect(result.isValid).toBeFalsy();
                    expect(result.errors.some(error => 
                        error.toLowerCase().includes(testCase.expectedError.toLowerCase())
                    )).toBeTruthy();
                });
                
                // Test valid deck
                const validDeck = Array(50).fill('1-001H');
                const validResult = validateDeckSize(validDeck);
                expect(validResult.isValid).toBeTruthy();
            });

            this.testRunner.it('should enforce 3-copy limit per card', () => {
                const validateCopyLimit = (cards) => {
                    const cardCounts = {};
                    const errors = [];
                    
                    cards.forEach(cardId => {
                        if (!cardId) return;
                        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
                    });
                    
                    Object.entries(cardCounts).forEach(([cardId, count]) => {
                        if (count > 3) {
                            errors.push(`Too many copies of ${cardId}: ${count} (maximum 3)`);
                        }
                    });
                    
                    return {
                        isValid: errors.length === 0,
                        errors,
                        cardCounts
                    };
                };
                
                // Test invalid decks with too many copies
                const invalidDecks = [
                    Array(50).fill('1-001H'), // 50 copies of same card
                    [...Array(4).fill('1-001H'), ...Array(46).fill('1-002H')], // 4 copies of one card
                    [...Array(10).fill('special-card'), ...Array(40).fill('1-003H')] // 10 copies
                ];
                
                invalidDecks.forEach(deck => {
                    const result = validateCopyLimit(deck);
                    expect(result.isValid).toBeFalsy();
                    expect(result.errors.length).toBeGreaterThan(0);
                });
                
                // Test valid deck
                const validDeck = [
                    ...Array(3).fill('1-001H'),
                    ...Array(3).fill('1-002H'),
                    ...Array(3).fill('1-003H'),
                    ...Array(41).fill('1-004H').map((card, i) => `${card}-${i}`) // Unique IDs
                ];
                const validResult = validateCopyLimit(validDeck);
                expect(validResult.isValid).toBeTruthy();
            });

            this.testRunner.it('should handle unusual set combinations', () => {
                const problematicSets = [
                    'Boss Deck Chaos', // Special boss deck
                    'Legacy Collection', // Reprint set
                    'Hidden Hope', // Crystal Dominion block
                    'Promotional Cards', // Promo set
                    '', // Empty set name
                    null, // Null set
                    'Unknown Set 99' // Non-existent set
                ];
                
                const validateSetLegality = (cards) => {
                    const bannedSets = ['Boss Deck Chaos']; // Boss cards not legal in constructed
                    const warnings = [];
                    const errors = [];
                    
                    const setCounts = {};
                    cards.forEach(card => {
                        if (!card || !card.set) {
                            warnings.push('Card with missing set information');
                            return;
                        }
                        
                        setCounts[card.set] = (setCounts[card.set] || 0) + 1;
                        
                        if (bannedSets.includes(card.set)) {
                            errors.push(`Illegal card from banned set: ${card.set}`);
                        }
                    });
                    
                    return {
                        isValid: errors.length === 0,
                        errors,
                        warnings,
                        setCounts
                    };
                };
                
                const testCards = problematicSets.map((setName, i) => ({
                    id: `${i+1}-001H`,
                    name: `Test Card ${i}`,
                    set: setName
                }));
                
                const result = validateSetLegality(testCards);
                expect(result.errors.length).toBeGreaterThan(0); // Should have boss deck error
                expect(result.warnings.length).toBeGreaterThan(0); // Should have missing set warnings
            });
        });

        this.testRunner.describe('FFTCG Game Logic Edge Cases - CP Management', () => {
            
            this.testRunner.it('should handle invalid CP costs', () => {
                const validateCPCost = (cost, element) => {
                    const errors = [];
                    
                    // Validate cost
                    if (typeof cost !== 'number' || cost < 0) {
                        errors.push('Invalid cost: must be non-negative number');
                    } else if (cost > 11) {
                        errors.push('Invalid cost: maximum cost is 11');
                    }
                    
                    // Validate element
                    const validElements = ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'];
                    if (!element || !validElements.includes(element.toLowerCase())) {
                        errors.push('Invalid element');
                    }
                    
                    return {
                        isValid: errors.length === 0,
                        errors
                    };
                };
                
                const invalidCosts = [
                    { cost: -1, element: 'fire' },
                    { cost: 12, element: 'ice' },
                    { cost: null, element: 'wind' },
                    { cost: undefined, element: 'lightning' },
                    { cost: 'five', element: 'water' },
                    { cost: 5, element: 'invalid' },
                    { cost: 5, element: null },
                    { cost: 999, element: 'fire' }
                ];
                
                invalidCosts.forEach(testCase => {
                    const result = validateCPCost(testCase.cost, testCase.element);
                    expect(result.isValid).toBeFalsy();
                });
                
                // Valid costs
                const validCosts = [
                    { cost: 0, element: 'fire' },
                    { cost: 1, element: 'ice' },
                    { cost: 11, element: 'light' }
                ];
                
                validCosts.forEach(testCase => {
                    const result = validateCPCost(testCase.cost, testCase.element);
                    expect(result.isValid).toBeTruthy();
                });
            });

            this.testRunner.it('should handle CP overflow scenarios', () => {
                const manageCPPool = (currentCP, generation, expenditure) => {
                    const maxCP = 999; // Theoretical maximum
                    const newCP = { ...currentCP };
                    
                    // Add generated CP
                    Object.entries(generation).forEach(([element, amount]) => {
                        if (amount > 0) {
                            newCP[element] = Math.min((newCP[element] || 0) + amount, maxCP);
                        }
                    });
                    
                    // Subtract spent CP
                    Object.entries(expenditure).forEach(([element, amount]) => {
                        if (amount > 0) {
                            newCP[element] = Math.max((newCP[element] || 0) - amount, 0);
                        }
                    });
                    
                    return newCP;
                };
                
                const startingCP = { fire: 5, ice: 3, wind: 0 };
                
                // Test CP overflow
                const massiveGeneration = { fire: 1000, ice: 500 };
                const resultAfterGeneration = manageCPPool(startingCP, massiveGeneration, {});
                
                expect(resultAfterGeneration.fire).toBe(999); // Capped at maximum
                expect(resultAfterGeneration.ice).toBe(500); // Normal addition
                
                // Test CP underflow
                const massiveExpenditure = { fire: 1000, wind: 50 };
                const resultAfterExpenditure = manageCPPool(startingCP, {}, massiveExpenditure);
                
                expect(resultAfterExpenditure.fire).toBe(0); // Can't go below 0
                expect(resultAfterExpenditure.wind).toBe(0); // Can't go below 0
            });
        });

        this.testRunner.describe('FFTCG Game Logic Edge Cases - Card Interactions', () => {
            
            this.testRunner.it('should handle cards with unusual power values', () => {
                const validatePowerValue = (power) => {
                    const warnings = [];
                    const errors = [];
                    
                    if (power === null || power === undefined) {
                        return { isValid: true, warnings: ['Card has no power (likely Backup/Summon)'] };
                    }
                    
                    if (typeof power !== 'number') {
                        errors.push('Power must be a number');
                        return { isValid: false, errors, warnings };
                    }
                    
                    if (power < 0) {
                        errors.push('Power cannot be negative');
                    } else if (power === 0) {
                        warnings.push('Card has 0 power (unusual but valid)');
                    } else if (power > 20000) {
                        warnings.push('Card has extremely high power (over 20,000)');
                    } else if (power % 1000 !== 0) {
                        warnings.push('Power not in standard 1000-increment format');
                    }
                    
                    return {
                        isValid: errors.length === 0,
                        errors,
                        warnings
                    };
                };
                
                const unusualPowers = [
                    null, // Backup/Summon
                    0, // Zero power
                    500, // Non-standard increment
                    1500, // Non-standard increment
                    25000, // Extremely high
                    -1000, // Negative (invalid)
                    'high', // Non-numeric (invalid)
                    NaN // Not a number (invalid)
                ];
                
                unusualPowers.forEach(power => {
                    const result = validatePowerValue(power);
                    // Should handle all cases without throwing errors
                    expect(result).toBeTruthy();
                    expect(Array.isArray(result.warnings) || Array.isArray(result.errors)).toBeTruthy();
                });
            });

            this.testRunner.it('should handle complex card text parsing', () => {
                const problematicCardTexts = [
                    '', // Empty text
                    null, // Null text
                    'Simple effect', // Normal text
                    'When this card enters the field, choose 1 Forward opponent controls. Deal it 7000 damage.', // Long effect
                    'Cost[2]: Choose 1 Forward. It gains +1000 power until the end of the turn.', // Cost effect
                    'Auto-ability: When this card is played, draw 1 card.', // Auto-ability
                    '[Damage 3] Choose 1 Forward opponent controls. Deal it 8000 damage.', // Damage requirement
                    '【EX BURST】Choose 1 Forward. Deal it damage equal to the number of cards in your hand times 1000.', // EX Burst with Japanese brackets
                    'This card cannot be chosen by Summons or abilities.', // Protection effect
                    'Card text with "quotes" and (parentheses) and [brackets]', // Special characters
                    'Multi-line\neffect\ntext', // Line breaks
                    'Effect with <html> tags that should not be interpreted', // HTML-like content
                    'a'.repeat(1000) // Extremely long text
                ];
                
                const parseCardText = (text) => {
                    if (!text || typeof text !== 'string') {
                        return { 
                            isEmpty: true, 
                            effects: [], 
                            hasEXBurst: false 
                        };
                    }
                    
                    // Sanitize HTML-like content
                    const sanitized = text.replace(/<[^>]*>/g, '');
                    
                    // Extract effects (simplified parsing)
                    const effects = [];
                    if (sanitized.includes('Auto-ability')) effects.push('auto');
                    if (sanitized.includes('Cost[')) effects.push('activated');
                    if (sanitized.includes('[Damage')) effects.push('damage_requirement');
                    
                    return {
                        isEmpty: sanitized.trim().length === 0,
                        effects,
                        hasEXBurst: sanitized.includes('EX BURST') || sanitized.includes('【EX BURST】'),
                        textLength: sanitized.length,
                        sanitizedText: sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized
                    };
                };
                
                problematicCardTexts.forEach(text => {
                    const result = parseCardText(text);
                    expect(result).toBeTruthy();
                    expect(typeof result.isEmpty).toBe('boolean');
                    expect(Array.isArray(result.effects)).toBeTruthy();
                    expect(typeof result.hasEXBurst).toBe('boolean');
                });
            });
        });

        this.testRunner.describe('FFTCG Game Logic Edge Cases - Set-Specific Validation', () => {
            
            this.testRunner.it('should handle Opus-specific card numbering', () => {
                const validateCardNumbering = (cardId, setName) => {
                    const errors = [];
                    const warnings = [];
                    
                    if (!cardId || typeof cardId !== 'string') {
                        errors.push('Invalid card ID');
                        return { isValid: false, errors, warnings };
                    }
                    
                    // Parse standard format: "X-YYYH" where X is opus number, YYY is card number, H is rarity
                    const standardMatch = cardId.match(/^(\d+)-(\d{3})([CRHL])$/);
                    if (standardMatch) {
                        const [, opusNum, cardNum, rarity] = standardMatch;
                        
                        // Check opus number consistency with set name
                        if (setName && setName.startsWith('Opus ')) {
                            const expectedOpus = setName.replace('Opus ', '').trim();
                            const romanToArabic = {
                                'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5',
                                'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10',
                                'XI': '11', 'XII': '12', 'XIII': '13', 'XIV': '14', 'XV': '15',
                                'XVI': '16', 'XVII': '17', 'XVIII': '18', 'XIX': '19', 'XX': '20'
                            };
                            
                            const expectedOpusNumber = romanToArabic[expectedOpus] || expectedOpus;
                            if (opusNum !== expectedOpusNumber) {
                                warnings.push(`Opus number mismatch: ID has ${opusNum}, set name suggests ${expectedOpusNumber}`);
                            }
                        }
                        
                        // Check card number range (typically 001-200+ per set)
                        const cardNumber = parseInt(cardNum);
                        if (cardNumber > 300) {
                            warnings.push(`Unusually high card number: ${cardNumber}`);
                        }
                        
                        return { isValid: true, errors, warnings, format: 'standard' };
                    }
                    
                    // Handle special sets with different formats
                    const specialFormats = [
                        /^B\d+-\d{3}[CRHL]$/, // Boss deck format
                        /^P-\d{3}$/, // Promo format
                        /^L\d+-\d{3}[CRHL]$/, // Legacy format
                    ];
                    
                    const matchingFormat = specialFormats.some(format => format.test(cardId));
                    if (matchingFormat) {
                        return { isValid: true, errors, warnings, format: 'special' };
                    }
                    
                    errors.push(`Unrecognized card ID format: ${cardId}`);
                    return { isValid: false, errors, warnings };
                };
                
                const testCases = [
                    { id: '1-001H', set: 'Opus I', shouldBeValid: true },
                    { id: '19-150L', set: 'Opus XIX', shouldBeValid: true },
                    { id: '2-001H', set: 'Opus I', shouldBeValid: true, expectWarning: true }, // Mismatch
                    { id: 'B1-001H', set: 'Boss Deck Chaos', shouldBeValid: true },
                    { id: 'P-001', set: 'Promotional Cards', shouldBeValid: true },
                    { id: 'invalid-format', set: 'Opus I', shouldBeValid: false },
                    { id: '', set: 'Opus I', shouldBeValid: false },
                    { id: null, set: 'Opus I', shouldBeValid: false }
                ];
                
                testCases.forEach(testCase => {
                    const result = validateCardNumbering(testCase.id, testCase.set);
                    
                    if (testCase.shouldBeValid) {
                        expect(result.isValid).toBeTruthy();
                    } else {
                        expect(result.isValid).toBeFalsy();
                    }
                    
                    if (testCase.expectWarning) {
                        expect(result.warnings.length).toBeGreaterThan(0);
                    }
                });
            });

            this.testRunner.it('should handle cross-set interactions', () => {
                const checkCrossSetInteractions = (cards) => {
                    const setGroups = {};
                    const interactions = [];
                    
                    // Group cards by set
                    cards.forEach(card => {
                        if (!card.set) return;
                        if (!setGroups[card.set]) setGroups[card.set] = [];
                        setGroups[card.set].push(card);
                    });
                    
                    // Check for potential synergies or conflicts
                    const sets = Object.keys(setGroups);
                    if (sets.length > 10) {
                        interactions.push({
                            type: 'warning',
                            message: `Deck spans many sets (${sets.length}), may lack focus`
                        });
                    }
                    
                    // Check for known problematic combinations
                    const hasOpusI = sets.includes('Opus I');
                    const hasLatestSet = sets.some(set => set.includes('XX') || set.includes('XIX'));
                    
                    if (hasOpusI && hasLatestSet) {
                        interactions.push({
                            type: 'info',
                            message: 'Deck combines early and late sets - power level may vary'
                        });
                    }
                    
                    return {
                        setCount: sets.length,
                        interactions,
                        setDistribution: Object.fromEntries(
                            Object.entries(setGroups).map(([set, cards]) => [set, cards.length])
                        )
                    };
                };
                
                const mixedSetDeck = [
                    { id: '1-001H', set: 'Opus I' },
                    { id: '19-001H', set: 'Opus XIX' },
                    { id: 'B1-001H', set: 'Boss Deck Chaos' },
                    { id: 'L1-001H', set: 'Legacy Collection' },
                    { id: '2-001H', set: 'Opus II' },
                    // Add more cards from different sets
                    ...Array(15).fill(null).map((_, i) => ({
                        id: `${i+3}-001H`,
                        set: `Opus ${['III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'][i] || i+3}`
                    }))
                ];
                
                const result = checkCrossSetInteractions(mixedSetDeck);
                expect(result.setCount).toBeGreaterThan(5);
                expect(result.interactions.length).toBeGreaterThan(0);
                expect(result.setDistribution).toBeTruthy();
            });
        });
    }
}

export { GameLogicEdgeCaseTestSuite };