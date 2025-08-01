/**
 * COMPREHENSIVE TEST EXECUTOR - Runs all test suites for the FFTCG Simulator
 * 
 * This script executes:
 * - ImageMapping utility tests
 * - DeckBuilder component tests
 * - Edge case tests for unusual scenarios
 * - FFTCG-specific game logic edge cases
 * - Performance and stress tests
 * - Security and validation tests
 */

import { ImageMappingTestSuite } from './ImageMappingTests.js';
import { DeckBuilderTestSuite } from './DeckBuilderTests.js';
import { EdgeCaseTestSuite } from './EdgeCaseTests.js';
import { GameLogicEdgeCaseTestSuite } from './GameLogicEdgeCases.js';

// Comprehensive test runner
class ComprehensiveTestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.currentSuite = null;
        this.startTime = null;
        this.categories = {
            passed: 0,
            failed: 0,
            warnings: 0,
            skipped: 0
        };
    }

    describe(suiteName, fn) {
        this.currentSuite = suiteName;
        console.group(`🧪 ${suiteName}`);
        try {
            fn();
        } catch (error) {
            console.error(`❌ Suite setup failed: ${error.message}`);
        }
        console.groupEnd();
    }

    it(testName, fn) {
        const test = {
            suite: this.currentSuite,
            name: testName,
            fn,
            timestamp: Date.now()
        };
        this.tests.push(test);
    }

    async run() {
        console.log('🚀 Starting comprehensive test execution...\n');
        this.startTime = performance.now();
        
        // Pre-test system check
        await this.runSystemChecks();
        
        console.log('\n📋 Test Execution Plan:');
        console.log(`   Total tests queued: ${this.tests.length}`);
        console.log(`   Test suites: ${[...new Set(this.tests.map(t => t.suite))].length}`);
        console.log(`   Estimated duration: ${Math.ceil(this.tests.length * 0.1)} seconds\n`);
        
        // Execute tests with progress tracking
        for (let i = 0; i < this.tests.length; i++) {
            const test = this.tests[i];
            const progress = Math.round((i / this.tests.length) * 100);
            
            if (i % 10 === 0) {
                console.log(`📊 Progress: ${progress}% (${i}/${this.tests.length})`);
            }
            
            try {
                const testStartTime = performance.now();
                await test.fn();
                const testEndTime = performance.now();
                const duration = testEndTime - testStartTime;
                
                this.results.push({
                    ...test,
                    status: 'passed',
                    duration: Math.round(duration * 100) / 100,
                    memory: this.getMemoryUsage()
                });
                
                this.categories.passed++;
                
                if (duration > 100) {
                    console.warn(`⚠️  Slow test: ${test.name} (${Math.round(duration)}ms)`);
                    this.categories.warnings++;
                }
                
                console.log(`✅ ${test.name} (${Math.round(duration)}ms)`);
                
            } catch (error) {
                this.results.push({
                    ...test,
                    status: 'failed',
                    error: error.message,
                    stack: error.stack,
                    memory: this.getMemoryUsage()
                });
                
                this.categories.failed++;
                console.error(`❌ ${test.name}: ${error.message}`);
                
                // Continue with other tests even if one fails
            }
        }
        
        // Post-test analysis
        await this.runPostTestAnalysis();
        
        // Generate comprehensive report
        this.generateDetailedReport();
        
        return this.results;
    }

    async runSystemChecks() {
        console.log('🔧 Running pre-test system checks...');
        
        const checks = {
            memory: this.checkMemoryAvailability(),
            performance: this.checkPerformanceAPI(),
            modules: await this.checkModuleAvailability(),
            storage: this.checkStorageAvailability(),
            network: await this.checkNetworkConditions()
        };
        
        console.log('📊 System Status:');
        Object.entries(checks).forEach(([check, status]) => {
            console.log(`   ${status ? '✅' : '❌'} ${check}: ${status ? 'OK' : 'Issue detected'}`);
        });
        
        return checks;
    }

    checkMemoryAvailability() {
        try {
            if ('memory' in performance) {
                const memory = performance.memory;
                const available = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
                console.log(`   Memory: ${Math.round(available / 1024 / 1024)}MB available`);
                return available > 50 * 1024 * 1024; // Need at least 50MB
            }
            return true; // Assume OK if not available
        } catch (e) {
            return true;
        }
    }

    checkPerformanceAPI() {
        return typeof performance !== 'undefined' && 
               typeof performance.now === 'function';
    }

    async checkModuleAvailability() {
        const modules = [
            'js/utils/ImageMapping.js',
            'js/data/fftcg_real_cards.json',
            'js/data/card_image_mapping.json'
        ];
        
        let availableCount = 0;
        for (const module of modules) {
            try {
                const response = await fetch(module);
                if (response.ok) availableCount++;
            } catch (e) {
                console.warn(`   Module ${module} not accessible`);
            }
        }
        
        console.log(`   Modules: ${availableCount}/${modules.length} accessible`);
        return availableCount === modules.length;
    }

    checkStorageAvailability() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }

    async checkNetworkConditions() {
        try {
            const start = performance.now();
            await fetch('data:text/plain,test');
            const end = performance.now();
            const latency = end - start;
            console.log(`   Network latency: ${Math.round(latency)}ms`);
            return latency < 100;
        } catch (e) {
            return false;
        }
    }

    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    async runPostTestAnalysis() {
        console.log('\n🔍 Running post-test analysis...');
        
        // Analyze performance trends
        const testDurations = this.results
            .filter(r => r.duration)
            .map(r => r.duration);
        
        if (testDurations.length > 0) {
            const avgDuration = testDurations.reduce((a, b) => a + b, 0) / testDurations.length;
            const maxDuration = Math.max(...testDurations);
            const slowTests = this.results.filter(r => r.duration > avgDuration * 2);
            
            console.log(`   Average test duration: ${Math.round(avgDuration * 100) / 100}ms`);
            console.log(`   Slowest test: ${Math.round(maxDuration * 100) / 100}ms`);
            console.log(`   Tests slower than average: ${slowTests.length}`);
        }
        
        // Analyze memory usage patterns
        const memoryReadings = this.results
            .filter(r => r.memory && r.memory.used)
            .map(r => r.memory.used);
        
        if (memoryReadings.length > 0) {
            const avgMemory = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;
            const peakMemory = Math.max(...memoryReadings);
            
            console.log(`   Average memory usage: ${Math.round(avgMemory)}MB`);
            console.log(`   Peak memory usage: ${peakMemory}MB`);
        }
        
        // Check for test patterns
        const failurePatterns = this.results
            .filter(r => r.status === 'failed')
            .reduce((patterns, result) => {
                const suite = result.suite;
                patterns[suite] = (patterns[suite] || 0) + 1;
                return patterns;
            }, {});
        
        if (Object.keys(failurePatterns).length > 0) {
            console.log('   Failure patterns by suite:');
            Object.entries(failurePatterns).forEach(([suite, count]) => {
                console.log(`     ${suite}: ${count} failures`);
            });
        }
    }

    generateDetailedReport() {
        const endTime = performance.now();
        const totalDuration = Math.round((endTime - this.startTime) / 10) / 100;
        
        console.log('\n📊 COMPREHENSIVE TEST REPORT');
        console.log('═'.repeat(50));
        
        // Summary statistics
        console.log(`🕒 Execution Time: ${totalDuration} seconds`);
        console.log(`📋 Total Tests: ${this.results.length}`);
        console.log(`✅ Passed: ${this.categories.passed} (${Math.round(this.categories.passed / this.results.length * 100)}%)`);
        console.log(`❌ Failed: ${this.categories.failed} (${Math.round(this.categories.failed / this.results.length * 100)}%)`);
        console.log(`⚠️  Warnings: ${this.categories.warnings}`);
        
        // Suite breakdown
        const suiteResults = this.results.reduce((suites, result) => {
            const suite = result.suite;
            if (!suites[suite]) {
                suites[suite] = { passed: 0, failed: 0, total: 0 };
            }
            suites[suite][result.status]++;
            suites[suite].total++;
            return suites;
        }, {});
        
        console.log('\n📊 Results by Test Suite:');
        Object.entries(suiteResults).forEach(([suite, stats]) => {
            const passRate = Math.round(stats.passed / stats.total * 100);
            const status = stats.failed === 0 ? '✅' : stats.passed > stats.failed ? '⚠️' : '❌';
            console.log(`   ${status} ${suite}: ${stats.passed}/${stats.total} (${passRate}%)`);
        });
        
        // Failed tests detail
        if (this.categories.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(r => r.status === 'failed')
                .forEach(result => {
                    console.log(`   • ${result.suite}: ${result.name}`);
                    console.log(`     Error: ${result.error}`);
                });
        }
        
        // Performance insights
        if (this.categories.warnings > 0) {
            console.log('\n⚠️  Performance Warnings:');
            this.results
                .filter(r => r.duration > 100)
                .forEach(result => {
                    console.log(`   • ${result.name}: ${Math.round(result.duration)}ms`);
                });
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (this.categories.failed === 0) {
            console.log('   🎉 All tests passed! Implementation is solid.');
        } else {
            console.log(`   🔧 Address ${this.categories.failed} failing tests for production readiness.`);
        }
        
        if (this.categories.warnings > 0) {
            console.log(`   ⚡ Optimize ${this.categories.warnings} slow-performing tests.`);
        }
        
        const successRate = this.categories.passed / this.results.length;
        if (successRate >= 0.95) {
            console.log('   ✨ Excellent test coverage and reliability!');
        } else if (successRate >= 0.85) {
            console.log('   👍 Good test reliability, minor improvements needed.');
        } else {
            console.log('   ⚠️  Test reliability needs improvement before production.');
        }
        
        console.log('\n' + '═'.repeat(50));
        
        // Store results for external access
        window.testResults = {
            summary: this.categories,
            details: this.results,
            suites: suiteResults,
            duration: totalDuration,
            timestamp: new Date().toISOString(),
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.categories.failed > 0) {
            recommendations.push({
                type: 'critical',
                message: `Fix ${this.categories.failed} failing tests before production deployment`
            });
        }
        
        if (this.categories.warnings > 5) {
            recommendations.push({
                type: 'performance',
                message: 'Consider optimizing slow-performing operations'
            });
        }
        
        const memoryTests = this.results.filter(r => r.memory);
        if (memoryTests.length > 0) {
            const avgMemory = memoryTests.reduce((sum, r) => sum + r.memory.used, 0) / memoryTests.length;
            if (avgMemory > 100) {
                recommendations.push({
                    type: 'memory',
                    message: 'High memory usage detected, consider optimization'
                });
            }
        }
        
        if (this.categories.passed / this.results.length >= 0.95) {
            recommendations.push({
                type: 'success',
                message: 'Implementation ready for production with excellent test coverage'
            });
        }
        
        return recommendations;
    }
}

// Execute all test suites
async function executeAllTests() {
    console.log('🎯 FFTCG Simulator - Comprehensive Test Execution');
    console.log('Testing all modules, edge cases, and game logic\n');
    
    const runner = new ComprehensiveTestRunner();
    
    try {
        // Initialize all test suites
        console.log('🔧 Initializing test suites...');
        
        // Core functionality tests
        new ImageMappingTestSuite(runner);
        new DeckBuilderTestSuite(runner);
        
        // Edge case and stress tests
        new EdgeCaseTestSuite(runner);
        new GameLogicEdgeCaseTestSuite(runner);
        
        console.log(`✅ Initialized ${runner.tests.length} tests across multiple suites\n`);
        
        // Execute all tests
        const results = await runner.run();
        
        console.log('\n🎉 Test execution completed!');
        return results;
        
    } catch (error) {
        console.error('💥 Critical test execution failure:', error);
        throw error;
    }
}

// Export for manual execution and browser use
window.executeAllTests = executeAllTests;
export { executeAllTests, ComprehensiveTestRunner };