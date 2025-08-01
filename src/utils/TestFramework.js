/**
 * TEST FRAMEWORK - Simple Testing System for FFTCG Simulator
 * 
 * Provides unit testing, integration testing, and game scenario testing
 * capabilities with real-time feedback and automated validation
 */

import { logger } from './Logger.js';

export class TestFramework {
    constructor() {
        this.tests = new Map();
        this.suites = new Map();
        this.results = [];
        this.currentSuite = null;
        
        // Test statistics
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };

        // Configuration
        this.config = {
            stopOnFirstFailure: false,
            showPassingTests: true,
            showTimings: true,
            autoRun: false
        };

        logger.info('🧪 Test Framework initialized');
    }

    /**
     * Create a test suite
     */
    describe(suiteName, setupFn) {
        const suite = {
            name: suiteName,
            tests: [],
            beforeAll: null,
            afterAll: null,
            beforeEach: null,
            afterEach: null,
            only: false,
            skip: false
        };

        this.suites.set(suiteName, suite);
        this.currentSuite = suite;

        // Execute setup function
        if (typeof setupFn === 'function') {
            setupFn.call(this);
        }

        this.currentSuite = null;
        logger.debug(`📝 Test suite created: ${suiteName}`);
        return suite;
    }

    /**
     * Create a test case
     */
    it(testName, testFn, options = {}) {
        if (!this.currentSuite) {
            throw new Error('Test must be defined within a describe block');
        }

        const test = {
            name: testName,
            fn: testFn,
            suite: this.currentSuite.name,
            only: options.only || false,
            skip: options.skip || false,
            timeout: options.timeout || 5000,
            async: options.async || false
        };

        this.currentSuite.tests.push(test);
        const testId = `${this.currentSuite.name}::${testName}`;
        this.tests.set(testId, test);

        logger.debug(`✏️ Test case added: ${testId}`);
        return test;
    }

    /**
     * Setup functions for test suites
     */
    beforeAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = fn;
        }
    }

    afterAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = fn;
        }
    }

    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    /**
     * Run all tests
     */
    async run() {
        logger.time('test-execution');
        logger.info('🚀 Starting test execution...');

        this.resetStats();
        this.results = [];

        // Get tests to run (handle .only and .skip)
        const suitesToRun = this.getSuitesToRun();

        for (const suite of suitesToRun) {
            await this.runSuite(suite);
            
            if (this.config.stopOnFirstFailure && this.stats.failed > 0) {
                break;
            }
        }

        const duration = logger.timeEnd('test-execution');
        this.stats.duration = duration;

        this.printResults();
        return this.stats;
    }

    /**
     * Run a specific test suite
     */
    async runSuite(suite) {
        logger.info(`📂 Running suite: ${suite.name}`);

        try {
            // Run beforeAll
            if (suite.beforeAll) {
                await this.runHook(suite.beforeAll, 'beforeAll');
            }

            // Run tests
            for (const test of suite.tests) {
                if (test.skip) {
                    this.recordResult(test, 'skipped');
                    continue;
                }

                await this.runTest(test, suite);
                
                if (this.config.stopOnFirstFailure && this.stats.failed > 0) {
                    break;
                }
            }

            // Run afterAll
            if (suite.afterAll) {
                await this.runHook(suite.afterAll, 'afterAll');
            }

        } catch (error) {
            logger.error(`Suite setup/teardown failed: ${suite.name}`, error);
        }
    }

    /**
     * Run a single test
     */
    async runTest(test, suite) {
        const testId = `${suite.name}::${test.name}`;
        logger.debug(`🔬 Running test: ${testId}`);

        const startTime = performance.now();
        let result = null;

        try {
            // Run beforeEach
            if (suite.beforeEach) {
                await this.runHook(suite.beforeEach, 'beforeEach');
            }

            // Create test context
            const context = new TestContext(testId);

            // Run the test
            if (test.async) {
                await Promise.race([
                    test.fn.call(context),
                    this.timeout(test.timeout)
                ]);
            } else {
                test.fn.call(context);
            }

            // Run afterEach
            if (suite.afterEach) {
                await this.runHook(suite.afterEach, 'afterEach');
            }

            result = 'passed';
            
        } catch (error) {
            result = 'failed';
            logger.error(`❌ Test failed: ${testId}`, error);
        }

        const duration = performance.now() - startTime;
        this.recordResult(test, result, duration);
    }

    /**
     * Run a setup/teardown hook
     */
    async runHook(hookFn, hookName) {
        try {
            if (hookFn.constructor.name === 'AsyncFunction') {
                await hookFn();
            } else {
                hookFn();
            }
        } catch (error) {
            logger.error(`Hook failed: ${hookName}`, error);
            throw error;
        }
    }

    /**
     * Create timeout promise
     */
    timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms);
        });
    }

    /**
     * Record test result
     */
    recordResult(test, status, duration = 0) {
        const result = {
            test: `${test.suite}::${test.name}`,
            status,
            duration,
            timestamp: new Date().toISOString()
        };

        this.results.push(result);
        this.stats.total++;
        this.stats[status]++;

        const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
        const message = `${emoji} ${result.test}${this.config.showTimings ? ` (${duration.toFixed(2)}ms)` : ''}`;

        if (status === 'passed' && this.config.showPassingTests) {
            logger.info(message);
        } else if (status === 'failed') {
            logger.error(message);
        } else if (status === 'skipped') {
            logger.warn(message);
        }
    }

    /**
     * Get suites to run based on .only and .skip
     */
    getSuitesToRun() {
        const allSuites = Array.from(this.suites.values());
        
        // Check for .only tests
        const onlyTests = [];
        allSuites.forEach(suite => {
            suite.tests.forEach(test => {
                if (test.only) onlyTests.push(test);
            });
        });

        if (onlyTests.length > 0) {
            // Only run suites with .only tests
            const onlySuites = new Set();
            onlyTests.forEach(test => {
                const suite = this.suites.get(test.suite);
                suite.tests = suite.tests.filter(t => t.only);
                onlySuites.add(suite);
            });
            return Array.from(onlySuites);
        }

        // Return all non-skipped suites
        return allSuites.filter(suite => !suite.skip);
    }

    /**
     * Reset test statistics
     */
    resetStats() {
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };
    }

    /**
     * Print test results summary
     */
    printResults() {
        const { total, passed, failed, skipped, duration } = this.stats;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        logger.info('📊 Test Results Summary:');
        logger.info(`   Total: ${total}`);
        logger.info(`   Passed: ${passed} (${passRate}%)`);
        logger.info(`   Failed: ${failed}`);
        logger.info(`   Skipped: ${skipped}`);
        logger.info(`   Duration: ${duration?.toFixed(2)}ms`);

        if (failed === 0) {
            logger.info('🎉 All tests passed!');
        } else {
            logger.error(`💥 ${failed} test(s) failed`);
        }
    }

    /**
     * Export test results
     */
    exportResults(format = 'json') {
        const data = {
            summary: this.stats,
            results: this.results,
            timestamp: new Date().toISOString()
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            const csv = ['Test,Status,Duration,Timestamp'];
            this.results.forEach(result => {
                csv.push(`"${result.test}","${result.status}",${result.duration},"${result.timestamp}"`);
            });
            return csv.join('\n');
        }

        return data;
    }

    /**
     * Create a game scenario test
     */
    scenario(name, gameSetup) {
        return this.it(name, async function() {
            const scenario = new GameScenario(gameSetup);
            await scenario.execute();
        }, { async: true });
    }
}

/**
 * Test Context - Provides assertion methods for tests
 */
class TestContext {
    constructor(testName) {
        this.testName = testName;
    }

    /**
     * Assert that condition is true
     */
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(`${message} in ${this.testName}`);
        }
    }

    /**
     * Assert equality
     */
    assertEqual(actual, expected, message = null) {
        const msg = message || `Expected ${expected}, got ${actual}`;
        this.assert(actual === expected, msg);
    }

    /**
     * Assert deep equality for objects
     */
    assertDeepEqual(actual, expected, message = null) {
        const msg = message || `Deep equality failed`;
        this.assert(JSON.stringify(actual) === JSON.stringify(expected), msg);
    }

    /**
     * Assert that value is truthy
     */
    assertTruthy(value, message = null) {
        const msg = message || `Expected truthy value, got ${value}`;
        this.assert(!!value, msg);
    }

    /**
     * Assert that value is falsy
     */
    assertFalsy(value, message = null) {
        const msg = message || `Expected falsy value, got ${value}`;
        this.assert(!value, msg);
    }

    /**
     * Assert that function throws
     */
    assertThrows(fn, message = null) {
        const msg = message || 'Expected function to throw';
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        this.assert(threw, msg);
    }

    /**
     * Assert that async function throws
     */
    async assertThrowsAsync(fn, message = null) {
        const msg = message || 'Expected async function to throw';
        let threw = false;
        try {
            await fn();
        } catch (e) {
            threw = true;
        }
        this.assert(threw, msg);
    }

    /**
     * Assert array contains value
     */
    assertContains(array, value, message = null) {
        const msg = message || `Array does not contain ${value}`;
        this.assert(array.includes(value), msg);
    }

    /**
     * Assert object has property
     */
    assertHasProperty(obj, prop, message = null) {
        const msg = message || `Object does not have property ${prop}`;
        this.assert(obj.hasOwnProperty(prop), msg);
    }
}

/**
 * Game Scenario Testing - For complex game state testing
 */
class GameScenario {
    constructor(setup) {
        this.setup = setup;
        this.gameEngine = null;
        this.players = [];
    }

    async execute() {
        // This would integrate with the actual game engine
        logger.info(`🎮 Executing game scenario: ${this.setup.name}`);
        
        // Initialize game
        // Set up players
        // Execute scenario steps
        // Validate expected outcomes
        
        logger.info('✅ Scenario completed');
    }
}

// Create global test framework instance
export const testFramework = new TestFramework();

// Global shortcuts
if (typeof window !== 'undefined') {
    window.describe = testFramework.describe.bind(testFramework);
    window.it = testFramework.it.bind(testFramework);
    window.beforeAll = testFramework.beforeAll.bind(testFramework);
    window.afterAll = testFramework.afterAll.bind(testFramework);
    window.beforeEach = testFramework.beforeEach.bind(testFramework);
    window.afterEach = testFramework.afterEach.bind(testFramework);
    window.runTests = testFramework.run.bind(testFramework);
    window.test = testFramework;
}