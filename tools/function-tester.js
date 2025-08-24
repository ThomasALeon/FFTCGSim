/**
 * FUNCTION TESTER - Automated testing for critical functions
 * 
 * This tool automatically tests that critical functions still work
 * after code changes, preventing regressions.
 */

class FunctionTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    /**
     * Add a test for a critical function
     */
    addTest(testName, testFunction, expectedResult = true) {
        this.tests.push({
            name: testName,
            test: testFunction,
            expected: expectedResult,
            critical: true
        });
    }

    /**
     * Add a test that checks if a function exists
     */
    addExistenceTest(functionPath, description = null) {
        const testName = description || `Function exists: ${functionPath}`;
        
        this.addTest(testName, () => {
            try {
                const func = this.getNestedProperty(window, functionPath);
                return typeof func === 'function';
            } catch {
                return false;
            }
        });
    }

    /**
     * Add a test that calls a function with sample data
     */
    addFunctionalTest(functionPath, args = [], expectedType = 'any', description = null) {
        const testName = description || `Function works: ${functionPath}`;
        
        this.addTest(testName, () => {
            try {
                const func = this.getNestedProperty(window, functionPath);
                if (typeof func !== 'function') return false;
                
                const result = func.apply(null, args);
                
                if (expectedType === 'any') return true;
                return typeof result === expectedType;
            } catch (error) {
                console.warn(`Test failed for ${functionPath}:`, error.message);
                return false;
            }
        });
    }

    /**
     * Get nested property from object using dot notation
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    /**
     * Run all tests
     */
    async runTests() {
        console.log(`🧪 Running ${this.tests.length} function tests...`);
        this.results = [];

        for (const test of this.tests) {
            try {
                const startTime = performance.now();
                const result = await test.test();
                const duration = performance.now() - startTime;
                
                const passed = result === test.expected;
                this.results.push({
                    name: test.name,
                    passed,
                    result,
                    expected: test.expected,
                    duration: Math.round(duration * 100) / 100,
                    critical: test.critical,
                    error: null
                });

                const status = passed ? '✅' : '❌';
                console.log(`${status} ${test.name} (${duration.toFixed(2)}ms)`);
                
            } catch (error) {
                this.results.push({
                    name: test.name,
                    passed: false,
                    result: null,
                    expected: test.expected,
                    duration: 0,
                    critical: test.critical,
                    error: error.message
                });

                console.log(`❌ ${test.name} - Error: ${error.message}`);
            }
        }

        return this.generateReport();
    }

    /**
     * Generate test report
     */
    generateReport() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const criticalFailed = this.results.filter(r => !r.passed && r.critical).length;
        
        console.log('\n🧪 TEST RESULTS SUMMARY');
        console.log('=' .repeat(40));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`🚨 Critical Failures: ${criticalFailed}`);

        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.filter(r => !r.passed).forEach(result => {
                const indicator = result.critical ? '🚨' : '⚠️';
                console.log(`  ${indicator} ${result.name}`);
                if (result.error) {
                    console.log(`      Error: ${result.error}`);
                } else {
                    console.log(`      Expected: ${result.expected}, Got: ${result.result}`);
                }
            });
        }

        const overallPass = criticalFailed === 0;
        console.log(overallPass ? '\n✅ All critical tests passed' : '\n🚨 Critical tests failed!');
        
        return {
            passed,
            failed,
            criticalFailed,
            overallPass,
            results: this.results
        };
    }
}

/**
 * FFTCG-specific test suite
 */
class FFTCGTestSuite extends FunctionTester {
    constructor() {
        super();
        this.setupFFTCGTests();
    }

    setupFFTCGTests() {
        // Core application tests
        this.addExistenceTest('app', 'Main app object exists');
        this.addExistenceTest('app.cardDatabase', 'Card database exists');
        this.addExistenceTest('app.deckBuilder', 'Deck builder exists');
        this.addExistenceTest('app.gameEngine', 'Game engine exists');

        // Filter system tests
        this.addExistenceTest('toggleFilter', 'Toggle filter function exists');
        this.addExistenceTest('clearAllDeckBuilderFilters', 'Clear filters function exists');
        this.addExistenceTest('handleOpusSelectChange', 'Opus filter handler exists');
        this.addExistenceTest('handleCostSelectChange', 'Cost filter handler exists');
        this.addExistenceTest('handleCategorySelectChange', 'Category filter handler exists');

        // DeckBuilder.js method tests
        this.addExistenceTest('app.deckBuilder.setSearchFilter', 'Search filter method exists');
        this.addExistenceTest('app.deckBuilder.setSortOrder', 'Sort order method exists');
        this.addExistenceTest('app.deckBuilder.setElementFilter', 'Element filter method exists');
        this.addExistenceTest('app.deckBuilder.setTypeFilter', 'Type filter method exists');
        this.addExistenceTest('app.deckBuilder.setCostFilter', 'Cost filter method exists');
        this.addExistenceTest('app.deckBuilder.setOpusFilter', 'Opus filter method exists');
        this.addExistenceTest('app.deckBuilder.setCategoryFilter', 'Category filter method exists');
        this.addExistenceTest('app.deckBuilder.clearAllFilters', 'Clear all filters method exists');

        // Security validation tests
        this.addExistenceTest('app.security', 'Security module exists');
        this.addExistenceTest('validateCard', 'Card validation exists');
        this.addExistenceTest('validateDeck', 'Deck validation exists');

        // UI element tests
        this.addTest('Card grid element exists', () => {
            return document.getElementById('cardGrid') !== null;
        });

        this.addTest('Filter elements exist', () => {
            const required = ['cardSearch', 'sortSelect', 'opusSelect', 'costSelect', 'categorySelect'];
            return required.every(id => document.getElementById(id) !== null);
        });

        // Functional tests with safe parameters
        this.addFunctionalTest('app.cardDatabase.getAllCards', [], 'object', 'Card database returns cards');
        
        // Test filter functionality (safe calls)
        this.addTest('Search filter works safely', () => {
            try {
                if (window.app?.deckBuilder?.setSearchFilter) {
                    window.app.deckBuilder.setSearchFilter('');
                    return true;
                }
                return false;
            } catch {
                return false;
            }
        });
    }
}

export { FunctionTester, FFTCGTestSuite };

// Make available globally for browser testing
if (typeof window !== 'undefined') {
    window.FunctionTester = FunctionTester;
    window.FFTCGTestSuite = FFTCGTestSuite;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Function Tester - Use FFTCGTestSuite in browser console');
}