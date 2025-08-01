/**
 * IMAGE MAPPING TESTS - Tests for the consolidated ImageMapping utility
 * 
 * Tests cover:
 * - Basic functionality
 * - Singleton behavior
 * - Error handling
 * - Edge cases and unexpected scenarios
 */

import { imageMapping } from '../src/utils/ImageMapping.js';
import { logger } from '../src/utils/Logger.js';

// Mock fetch for testing
const originalFetch = window.fetch;

function mockFetch(data, shouldFail = false) {
    window.fetch = jest.fn(() => {
        if (shouldFail) {
            return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(data)
        });
    });
}

function restoreFetch() {
    window.fetch = originalFetch;
}

// Simple jest-like functions for browser testing
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
        toBeNull: () => {
            if (value !== null) {
                throw new Error(`Expected null, got ${value}`);
            }
        }
    };
}

// Test suite
class ImageMappingTestSuite {
    constructor(testRunner) {
        this.testRunner = testRunner;
        this.setupTests();
    }

    setupTests() {
        this.testRunner.describe('ImageMapping Utility Tests', () => {
            
            this.testRunner.it('should be a singleton', async () => {
                const instance1 = imageMapping;
                const instance2 = imageMapping;
                expect(instance1).toBe(instance2);
            });

            this.testRunner.it('should load card image mapping successfully', async () => {
                const mockData = {
                    "1-001H": {
                        "name": "Test Card",
                        "image": "test-url.jpg",
                        "source": "materia-hunter"
                    }
                };

                // Clear cache first
                imageMapping.clearCache();
                
                // Mock successful fetch
                mockFetch(mockData);
                
                const result = await imageMapping.loadCardImageMapping();
                expect(result).toEqual(mockData);
                expect(imageMapping.isLoaded).toBe(true);
                
                restoreFetch();
            });

            this.testRunner.it('should handle network errors gracefully', async () => {
                imageMapping.clearCache();
                
                // Mock failed fetch
                mockFetch(null, true);
                
                const result = await imageMapping.loadCardImageMapping();
                expect(result).toEqual({});
                expect(imageMapping.isLoaded).toBe(true);
                
                restoreFetch();
            });

            this.testRunner.it('should return cached data on subsequent calls', async () => {
                const mockData = { "test": "data" };
                
                imageMapping.clearCache();
                mockFetch(mockData);
                
                const result1 = await imageMapping.loadCardImageMapping();
                const result2 = await imageMapping.loadCardImageMapping();
                
                expect(result1).toEqual(result2);
                expect(window.fetch).toHaveBeenCalledTimes(1);
                
                restoreFetch();
            });

            this.testRunner.it('should get card image mapping correctly', async () => {
                const mockData = {
                    "1-001H": {
                        "name": "Test Card",
                        "image": "test-url.jpg",
                        "source": "materia-hunter"
                    }
                };

                imageMapping.clearCache();
                mockFetch(mockData);
                await imageMapping.loadCardImageMapping();
                
                const mapping = imageMapping.getCardImageMapping("1-001H");
                expect(mapping).toEqual(mockData["1-001H"]);
                
                restoreFetch();
            });

            this.testRunner.it('should return null for non-existent card mappings', async () => {
                const mockData = {};
                
                imageMapping.clearCache();
                mockFetch(mockData);
                await imageMapping.loadCardImageMapping();
                
                const mapping = imageMapping.getCardImageMapping("non-existent");
                expect(mapping).toBeNull();
                
                restoreFetch();
            });

            this.testRunner.it('should correctly identify cards with real images', async () => {
                const mockData = {
                    "1-001H": {
                        "name": "Test Card",
                        "image": "test-url.jpg",
                        "source": "materia-hunter"
                    },
                    "1-002H": {
                        "name": "Test Card 2",
                        "source": "materia-hunter"
                        // No image property
                    }
                };

                imageMapping.clearCache();
                mockFetch(mockData);
                await imageMapping.loadCardImageMapping();
                
                expect(imageMapping.hasRealImage("1-001H")).toBeTruthy();
                expect(imageMapping.hasRealImage("1-002H")).toBeFalsy();
                expect(imageMapping.hasRealImage("non-existent")).toBeFalsy();
                
                restoreFetch();
            });

            this.testRunner.it('should handle concurrent loading requests', async () => {
                const mockData = { "test": "concurrent" };
                
                imageMapping.clearCache();
                mockFetch(mockData);
                
                // Start multiple concurrent loads
                const promises = [
                    imageMapping.loadCardImageMapping(),
                    imageMapping.loadCardImageMapping(),
                    imageMapping.loadCardImageMapping()
                ];
                
                const results = await Promise.all(promises);
                
                // All should return the same data
                results.forEach(result => {
                    expect(result).toEqual(mockData);
                });
                
                // Should only have called fetch once
                expect(window.fetch).toHaveBeenCalledTimes(1);
                
                restoreFetch();
            });

            this.testRunner.it('should clear cache properly', async () => {
                const mockData = { "test": "cache" };
                
                imageMapping.clearCache();
                mockFetch(mockData);
                await imageMapping.loadCardImageMapping();
                
                expect(imageMapping.isLoaded).toBe(true);
                
                imageMapping.clearCache();
                
                expect(imageMapping.isLoaded).toBe(false);
                expect(imageMapping.cardImageMapping).toBeNull();
                expect(imageMapping.loadPromise).toBeNull();
                
                restoreFetch();
            });

            this.testRunner.it('should handle malformed JSON gracefully', async () => {
                imageMapping.clearCache();
                
                // Mock fetch that returns malformed JSON
                window.fetch = jest.fn(() => Promise.resolve({
                    ok: true,
                    json: () => Promise.reject(new Error('Invalid JSON'))
                }));
                
                const result = await imageMapping.loadCardImageMapping();
                expect(result).toEqual({});
                expect(imageMapping.isLoaded).toBe(true);
                
                restoreFetch();
            });

            this.testRunner.it('should handle HTTP 404 responses', async () => {
                imageMapping.clearCache();
                
                // Mock 404 response
                window.fetch = jest.fn(() => Promise.resolve({
                    ok: false,
                    status: 404
                }));
                
                const result = await imageMapping.loadCardImageMapping();
                expect(result).toEqual({});
                expect(imageMapping.isLoaded).toBe(true);
                
                restoreFetch();
            });

            // Edge case tests
            this.testRunner.it('should handle empty card IDs', async () => {
                const mockData = {};
                
                imageMapping.clearCache();
                mockFetch(mockData);
                await imageMapping.loadCardImageMapping();
                
                expect(imageMapping.getCardImageMapping("")).toBeNull();
                expect(imageMapping.getCardImageMapping(null)).toBeNull();
                expect(imageMapping.getCardImageMapping(undefined)).toBeNull();
                
                restoreFetch();
            });

            this.testRunner.it('should handle calls before loading', () => {
                imageMapping.clearCache();
                
                // These should not throw errors
                const mapping = imageMapping.getCardImageMapping("1-001H");
                const hasImage = imageMapping.hasRealImage("1-001H");
                
                expect(mapping).toBeNull();
                expect(hasImage).toBeFalsy();
            });

        });
    }
}

export { ImageMappingTestSuite };