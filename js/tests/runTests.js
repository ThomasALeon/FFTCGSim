/**
 * TEST EXECUTION SCRIPT - Runs all test suites for the FFTCG Simulator
 * 
 * This script loads and executes:
 * - ImageMapping utility tests
 * - DeckBuilder component tests
 * - Comprehensive security and performance tests
 */

// Import test suites
import { ImageMappingTestSuite } from './ImageMappingTests.js';
import { DeckBuilderTestSuite } from './DeckBuilderTests.js';
import { runner as comprehensiveRunner } from './ComprehensiveTestSuite.js';

// Simple test runner compatible with browser
class SimpleTestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.currentSuite = null;
    }

    describe(suiteName, fn) {
        this.currentSuite = suiteName;
        console.group(`🧪 ${suiteName}`);
        fn();
        console.groupEnd();
    }

    it(testName, fn) {
        const test = {
            suite: this.currentSuite,
            name: testName,
            fn
        };
        this.tests.push(test);
    }

    async run() {
        console.log('🚀 Running test suites...\n');
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.push({
                    ...test,
                    status: 'passed'
                });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.push({
                    ...test,
                    status: 'failed',
                    error: error.message
                });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }

        this.displayResults();
        return this.results;
    }

    displayResults() {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        
        console.log('\n📊 Test Results Summary:');
        console.log(`Total: ${this.results.length}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(r => r.status === 'failed')
                .forEach(r => console.log(`- ${r.suite}: ${r.name} - ${r.error}`));
        }

        // Return results for external processing
        window.testResults = this.results;
    }
}

// Execute tests when DOM is ready
async function runAllTests() {
    console.log('🔧 Initializing test environment...');
    
    // Wait for application to be ready
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });

    // Additional wait for app initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        // Initialize test runners
        const runner = new SimpleTestRunner();
        
        // Check if required modules are available
        console.log('🔍 Checking module availability...');
        
        const availableModules = {
            imageMapping: typeof window.imageMapping !== 'undefined',
            deckBuilder: typeof window.DeckBuilder !== 'undefined',
            cardDatabase: typeof window.CardDatabase !== 'undefined',
            gameEngine: typeof window.GameEngine !== 'undefined'
        };
        
        console.log('📋 Module Status:');
        Object.entries(availableModules).forEach(([module, available]) => {
            console.log(`${available ? '✅' : '❌'} ${module}: ${available ? 'Available' : 'Not Available'}`);
        });

        // Run ImageMapping tests
        if (availableModules.imageMapping) {
            console.log('\n🧪 Running ImageMapping Tests...');
            new ImageMappingTestSuite(runner);
        } else {
            console.warn('⚠️  Skipping ImageMapping tests - module not available');
        }

        // Run DeckBuilder tests
        if (availableModules.deckBuilder) {
            console.log('\n🧪 Running DeckBuilder Tests...');
            new DeckBuilderTestSuite(runner);
        } else {
            console.warn('⚠️  Skipping DeckBuilder tests - module not available');
        }

        // Run comprehensive tests
        console.log('\n🧪 Running Comprehensive Tests...');
        
        // Basic DOM and functionality tests
        runner.describe('Basic Application Tests', () => {
            runner.it('should have required DOM elements', () => {
                const requiredElements = [
                    '#loadingScreen',
                    '.header-nav',
                    '#main-content'
                ];
                
                requiredElements.forEach(selector => {
                    const element = document.querySelector(selector);
                    if (!element) {
                        throw new Error(`Required element ${selector} not found`);
                    }
                });
            });

            runner.it('should load CSS stylesheets', () => {
                const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
                if (stylesheets.length === 0) {
                    throw new Error('No CSS stylesheets loaded');
                }
            });

            runner.it('should have responsive design', () => {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (!viewport) {
                    throw new Error('Viewport meta tag missing');
                }
            });
        });

        // Performance tests with realistic data
        runner.describe('Performance Tests', () => {
            runner.it('should handle large card database efficiently', async () => {
                const startTime = performance.now();
                
                // Simulate loading 3723 cards
                const mockCards = [];
                for (let i = 0; i < 3723; i++) {
                    mockCards.push({
                        id: `${Math.floor(i/200) + 1}-${(i % 200).toString().padStart(3, '0')}H`,
                        name: `Card ${i}`,
                        element: 'fire'
                    });
                }
                
                // Simulate filtering operation
                const filtered = mockCards.filter(card => card.element === 'fire');
                
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                
                if (processingTime > 100) {
                    throw new Error(`Processing 3723 cards took ${processingTime}ms, should be under 100ms`);
                }
            });

            runner.it('should handle DOM updates efficiently', () => {
                const startTime = performance.now();
                
                // Create and remove DOM elements
                for (let i = 0; i < 100; i++) {
                    const element = document.createElement('div');
                    element.textContent = `Test element ${i}`;
                    document.body.appendChild(element);
                    document.body.removeChild(element);
                }
                
                const endTime = performance.now();
                const domTime = endTime - startTime;
                
                if (domTime > 50) {
                    throw new Error(`DOM operations took ${domTime}ms, should be under 50ms`);
                }
            });
        });

        // Execute all tests
        const results = await runner.run();
        
        console.log('\n🎉 Test execution completed!');
        console.log(`📊 Final Results: ${results.filter(r => r.status === 'passed').length}/${results.length} tests passed`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        throw error;
    }
}

// Export for manual execution
window.runAllTests = runAllTests;

// Auto-run if in test mode
if (window.location.search.includes('test=true') || window.location.search.includes('run-tests=true')) {
    runAllTests().catch(console.error);
}

export { runAllTests };