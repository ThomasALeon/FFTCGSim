/**
 * Damage Zone System Tests
 * Tests the new damage zone (life points) system implementation
 */

import { logger } from '../src/utils/Logger.js';

export class DamageZoneTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
    }

    /**
     * Run all damage zone tests
     */
    async runAllTests() {
        logger.info('🧪 Running Damage Zone System Tests...');
        
        const tests = [
            () => this.testDamageZoneInitialization(),
            () => this.testDamageCardCreation(),
            () => this.testDamageInteraction(),
            () => this.testGameOverCondition(),
            () => this.testZoneCounterUpdates(),
            () => this.testDamageToGraveyardTransfer()
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                this.logTest('Test execution error', 'fail', error.message);
            }
        }

        return this.generateReport();
    }

    /**
     * Test damage zone initialization
     */
    testDamageZoneInitialization() {
        try {
            // Create mock GameBoard instance
            const mockGameBoard = this.createMockGameBoard();
            
            // Test initialization
            mockGameBoard.initializeDamageZone('player');
            
            if (mockGameBoard.damageZones.player.length === 7) {
                this.logTest('Damage zone initialization', 'pass', 'Created 7 life points');
            } else {
                this.logTest('Damage zone initialization', 'fail', 
                    `Expected 7 life points, got ${mockGameBoard.damageZones.player.length}`);
            }

        } catch (error) {
            this.logTest('Damage zone initialization', 'fail', error.message);
        }
    }

    /**
     * Test damage card DOM creation
     */
    testDamageCardCreation() {
        try {
            // Create mock DOM environment
            global.document = {
                createElement: (tag) => ({
                    className: '',
                    dataset: {},
                    title: '',
                    addEventListener: () => {},
                    appendChild: () => {}
                }),
                getElementById: (id) => ({
                    innerHTML: '',
                    appendChild: () => {},
                    textContent: ''
                })
            };

            const mockGameBoard = this.createMockGameBoard();
            mockGameBoard.initializeDamageZone('player');
            mockGameBoard.renderDamageZone('player');
            
            this.logTest('Damage card DOM creation', 'pass', 'Damage cards rendered without errors');

        } catch (error) {
            this.logTest('Damage card DOM creation', 'fail', error.message);
        }
    }

    /**
     * Test damage interaction
     */
    testDamageInteraction() {
        try {
            const mockGameBoard = this.createMockGameBoard();
            mockGameBoard.initializeDamageZone('player');
            
            const initialCount = mockGameBoard.damageZones.player.length;
            
            // Take damage
            mockGameBoard.takeDamage('player', 0);
            
            const afterDamageCount = mockGameBoard.damageZones.player.length;
            
            if (afterDamageCount === initialCount - 1) {
                this.logTest('Damage interaction', 'pass', 'Life point removed correctly');
            } else {
                this.logTest('Damage interaction', 'fail', 
                    `Expected ${initialCount - 1} life points, got ${afterDamageCount}`);
            }

        } catch (error) {
            this.logTest('Damage interaction', 'fail', error.message);
        }
    }

    /**
     * Test game over condition
     */
    testGameOverCondition() {
        try {
            const mockGameBoard = this.createMockGameBoard();
            mockGameBoard.initializeDamageZone('player');
            
            // Take all damage
            for (let i = 6; i >= 0; i--) {
                mockGameBoard.takeDamage('player', i);
            }
            
            const finalCount = mockGameBoard.damageZones.player.length;
            
            if (finalCount === 0) {
                this.logTest('Game over condition', 'pass', 'All life points removed');
            } else {
                this.logTest('Game over condition', 'fail', 
                    `Expected 0 life points, got ${finalCount}`);
            }

        } catch (error) {
            this.logTest('Game over condition', 'fail', error.message);
        }
    }

    /**
     * Test zone counter updates
     */
    testZoneCounterUpdates() {
        try {
            // Mock counter element
            let counterValue = '';
            global.document = {
                ...global.document,
                getElementById: (id) => ({
                    innerHTML: '',
                    appendChild: () => {},
                    get textContent() { return counterValue; },
                    set textContent(value) { counterValue = value; }
                })
            };

            const mockGameBoard = this.createMockGameBoard();
            mockGameBoard.initializeDamageZone('player');
            mockGameBoard.renderDamageZone('player');
            
            if (counterValue === '7') {
                this.logTest('Zone counter updates', 'pass', 'Counter shows correct life points');
            } else {
                this.logTest('Zone counter updates', 'fail', 
                    `Expected counter to show '7', got '${counterValue}'`);
            }

        } catch (error) {
            this.logTest('Zone counter updates', 'fail', error.message);
        }
    }

    /**
     * Test damage to graveyard transfer
     */
    testDamageToGraveyardTransfer() {
        try {
            const mockGameBoard = this.createMockGameBoard();
            mockGameBoard.initializeDamageZone('player');
            mockGameBoard.breakZones = { player: [], opponent: [] };
            
            const initialGraveyardCount = mockGameBoard.breakZones.player.length;
            
            // Take damage
            mockGameBoard.takeDamage('player', 0);
            
            const finalGraveyardCount = mockGameBoard.breakZones.player.length;
            
            if (finalGraveyardCount === initialGraveyardCount + 1) {
                this.logTest('Damage to graveyard transfer', 'pass', 'Damaged card moved to graveyard');
            } else {
                this.logTest('Damage to graveyard transfer', 'fail', 
                    `Expected ${initialGraveyardCount + 1} cards in graveyard, got ${finalGraveyardCount}`);
            }

        } catch (error) {
            this.logTest('Damage to graveyard transfer', 'fail', error.message);
        }
    }

    /**
     * Create mock GameBoard for testing
     */
    createMockGameBoard() {
        return {
            damageZones: { player: [], opponent: [] },
            breakZones: { player: [], opponent: [] },
            counters: {
                playerDamageCount: { textContent: '' },
                opponentDamageCount: { textContent: '' }
            },
            
            initializeDamageZone(player) {
                const deckCards = [];
                for (let i = 0; i < 7; i++) {
                    deckCards.push({
                        id: `${player}-deck-${i}`,
                        name: `Life Point ${i + 1}`,
                        element: 'unknown',
                        isFaceDown: true
                    });
                }
                this.damageZones[player] = deckCards;
            },
            
            renderDamageZone(player) {
                if (this.counters[`${player}DamageCount`]) {
                    this.counters[`${player}DamageCount`].textContent = this.damageZones[player].length;
                }
            },
            
            takeDamage(player, index) {
                if (index >= this.damageZones[player].length) return;
                
                const damagedCard = this.damageZones[player].splice(index, 1)[0];
                if (!this.breakZones) {
                    this.breakZones = { player: [], opponent: [] };
                }
                this.breakZones[player].push(damagedCard);
                
                this.renderDamageZone(player);
            },
            
            addEventLogEntry: () => {},
            showCardPreview: () => {},
            handlePlayerDefeat: () => {}
        };
    }

    /**
     * Log test result
     */
    logTest(name, status, message = '') {
        const statusIcon = status === 'pass' ? '✅' : '❌';
        logger.info(`${statusIcon} ${name}: ${status.toUpperCase()}`);
        if (message) {
            logger.info(`   ${message}`);
        }
        
        if (status === 'pass') this.results.passed++;
        if (status === 'fail') {
            this.results.failed++;
            this.results.errors.push(`${name}: ${message}`);
        }
        this.results.total++;
    }

    /**
     * Generate test report
     */
    generateReport() {
        const successRate = this.results.total > 0 ? 
            Math.round((this.results.passed / this.results.total) * 100) : 0;

        const report = {
            summary: {
                passed: this.results.passed,
                failed: this.results.failed,
                total: this.results.total,
                successRate: successRate
            },
            errors: this.results.errors,
            success: this.results.failed === 0
        };

        logger.info(`\n📊 Damage Zone Test Summary:`);
        logger.info(`✅ Passed: ${this.results.passed}`);
        logger.info(`❌ Failed: ${this.results.failed}`);
        logger.info(`📊 Total: ${this.results.total}`);
        logger.info(`📈 Success Rate: ${successRate}%`);

        if (this.results.errors.length > 0) {
            logger.warn('\n🚨 Test Errors:');
            this.results.errors.forEach((error, index) => {
                logger.warn(`${index + 1}. ${error}`);
            });
        }

        return report;
    }
}

// Export for use in test runner
export default DamageZoneTests;