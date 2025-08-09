/**
 * Game Debugger - Comprehensive logging and testing for FFTCG game issues
 * 
 * This utility provides:
 * - CP system validation and testing
 * - Turn state validation
 * - Game action logging
 * - Performance monitoring
 * - Automated issue detection
 */

import { Logger } from './Logger.js';

export class GameDebugger {
    constructor() {
        this.logger = new Logger('GameDebugger');
        this.testResults = [];
        this.actionHistory = [];
        this.cpSnapshots = [];
        this.enabled = true; // Can be disabled in production
    }

    /**
     * Enable/disable debugging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.log('debug', `Debugging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Log with debugging context
     */
    log(level, message, data = null) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            stackTrace: level === 'error' ? new Error().stack : null
        };
        
        this.actionHistory.push(logEntry);
        
        // Keep only last 1000 entries
        if (this.actionHistory.length > 1000) {
            this.actionHistory.shift();
        }
        
        console.log(`[GameDebugger:${level.toUpperCase()}] ${message}`, data || '');
        return logEntry;
    }

    /**
     * Test CP system integrity
     */
    testCPSystem(gameState, gameBoard) {
        if (!this.enabled) return { passed: true };
        
        this.log('info', '🧪 Testing CP System Integrity');
        const testResults = {
            passed: true,
            errors: [],
            warnings: [],
            details: {}
        };

        try {
            // Test 1: Verify separate player CP pools
            if (gameState && gameState.players && gameBoard) {
                const player1CP = gameState.players[0]?.cpPool || {};
                const player2CP = gameState.players[1]?.cpPool || {};
                const boardPlayerCP = gameBoard.playerCP || {};
                const boardOpponentCP = gameBoard.opponentCP || {};

                // Check if player CPs are incorrectly sharing values
                const player1Total = Object.values(player1CP).reduce((sum, val) => sum + val, 0);
                const player2Total = Object.values(player2CP).reduce((sum, val) => sum + val, 0);
                const boardPlayerTotal = Object.values(boardPlayerCP).reduce((sum, val) => sum + val, 0);
                const boardOpponentTotal = Object.values(boardOpponentCP).reduce((sum, val) => sum + val, 0);

                testResults.details.cpTotals = {
                    gameEnginePlayer1: player1Total,
                    gameEnginePlayer2: player2Total,
                    gameBoardPlayer: boardPlayerTotal,
                    gameBoardOpponent: boardOpponentTotal
                };

                // Test for CP leakage bug
                if (player1Total > 0 && boardOpponentTotal === boardPlayerTotal && boardPlayerTotal === player1Total) {
                    testResults.passed = false;
                    testResults.errors.push('CP LEAKAGE DETECTED: Opponent receiving same CP as player');
                    this.log('error', '🐛 CP Leakage Bug Detected', testResults.details.cpTotals);
                }

                // Test GameEngine vs GameBoard sync
                if (player1Total !== boardPlayerTotal) {
                    testResults.warnings.push(`CP desync: GameEngine(${player1Total}) vs GameBoard(${boardPlayerTotal})`);
                    this.log('warn', '⚠️ CP Desync Warning', { 
                        gameEngine: player1Total, 
                        gameBoard: boardPlayerTotal 
                    });
                }

                this.log('info', '📊 CP System State', testResults.details.cpTotals);
            }

            // Test 2: Validate CP element restrictions
            this.validateCPElements(gameState, testResults);

        } catch (error) {
            testResults.passed = false;
            testResults.errors.push(`CP Test Error: ${error.message}`);
            this.log('error', '❌ CP System Test Failed', error);
        }

        this.testResults.push({
            test: 'CPSystem',
            timestamp: Date.now(),
            results: testResults
        });

        return testResults;
    }

    /**
     * Validate CP elements match deck composition
     */
    validateCPElements(gameState, testResults) {
        if (!gameState || !gameState.players) return;

        for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex++) {
            const player = gameState.players[playerIndex];
            const playerName = `Player${playerIndex + 1}`;
            
            // Count CP elements vs deck elements
            const cpElements = Object.keys(player.cpPool || {}).filter(element => 
                player.cpPool[element] > 0
            );
            
            // Get deck elements (this would need CardDatabase integration)
            // For now, just log what we have
            testResults.details[`${playerName}ActiveCPElements`] = cpElements;
            
            this.log('info', `📋 ${playerName} Active CP Elements`, cpElements);
        }
    }

    /**
     * Snapshot current CP state for comparison
     */
    snapshotCPState(gameState, gameBoard, action = 'unknown') {
        if (!this.enabled) return;

        const snapshot = {
            timestamp: Date.now(),
            action,
            gameEngine: {
                player1: { ...gameState?.players?.[0]?.cpPool } || {},
                player2: { ...gameState?.players?.[1]?.cpPool } || {}
            },
            gameBoard: {
                player: { ...gameBoard?.playerCP } || {},
                opponent: { ...gameBoard?.opponentCP } || {}
            }
        };

        this.cpSnapshots.push(snapshot);
        
        // Keep only last 50 snapshots
        if (this.cpSnapshots.length > 50) {
            this.cpSnapshots.shift();
        }

        this.log('debug', `📸 CP Snapshot (${action})`, snapshot);
        return snapshot;
    }

    /**
     * Detect and log CP changes
     */
    detectCPChanges() {
        if (!this.enabled || this.cpSnapshots.length < 2) return;

        const current = this.cpSnapshots[this.cpSnapshots.length - 1];
        const previous = this.cpSnapshots[this.cpSnapshots.length - 2];

        const changes = {
            gameEngine: {
                player1: this.compareCPPools(previous.gameEngine.player1, current.gameEngine.player1),
                player2: this.compareCPPools(previous.gameEngine.player2, current.gameEngine.player2)
            },
            gameBoard: {
                player: this.compareCPPools(previous.gameBoard.player, current.gameBoard.player),
                opponent: this.compareCPPools(previous.gameBoard.opponent, current.gameBoard.opponent)
            }
        };

        // Check for suspicious changes
        const hasPlayerChanges = Object.values(changes.gameEngine.player1).some(change => change !== 0);
        const hasOpponentChanges = Object.values(changes.gameEngine.player2).some(change => change !== 0);
        const hasBoardPlayerChanges = Object.values(changes.gameBoard.player).some(change => change !== 0);
        const hasBoardOpponentChanges = Object.values(changes.gameBoard.opponent).some(change => change !== 0);

        if (hasPlayerChanges && hasBoardOpponentChanges && !hasOpponentChanges) {
            this.log('error', '🐛 SUSPICIOUS: Player CP change caused opponent board change', changes);
        }

        if (hasPlayerChanges || hasOpponentChanges || hasBoardPlayerChanges || hasBoardOpponentChanges) {
            this.log('info', '🔄 CP Changes Detected', changes);
        }

        return changes;
    }

    /**
     * Compare two CP pools and return differences
     */
    compareCPPools(oldPool, newPool) {
        const elements = ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'];
        const changes = {};

        elements.forEach(element => {
            const oldValue = oldPool[element] || 0;
            const newValue = newPool[element] || 0;
            changes[element] = newValue - oldValue;
        });

        return changes;
    }

    /**
     * Test AI turn automation
     */
    testAITurnAutomation(gameState) {
        if (!this.enabled) return { passed: true };

        const testResults = {
            passed: true,
            errors: [],
            warnings: [],
            details: {}
        };

        try {
            if (gameState) {
                const currentPlayer = gameState.currentPlayer;
                const isAITurn = gameState.players[currentPlayer]?.isAI;
                const currentPhase = gameState.currentPhase;

                testResults.details = {
                    currentPlayer,
                    isAITurn,
                    currentPhase,
                    priorityPlayer: gameState.priorityPlayer
                };

                if (isAITurn && currentPhase) {
                    // Log AI turn state for monitoring
                    this.log('info', '🤖 AI Turn State', testResults.details);
                    
                    // Check if AI is stuck in a phase
                    const aiPhaseHistory = this.actionHistory
                        .filter(entry => entry.data?.isAITurn)
                        .slice(-10); // Last 10 AI entries

                    if (aiPhaseHistory.length > 5) {
                        const samePhaseCount = aiPhaseHistory.filter(entry => 
                            entry.data?.currentPhase === currentPhase
                        ).length;

                        if (samePhaseCount > 3) {
                            testResults.warnings.push(`AI may be stuck in ${currentPhase} phase`);
                            this.log('warn', '🤖 Possible AI Phase Lock', {
                                phase: currentPhase,
                                count: samePhaseCount
                            });
                        }
                    }
                }
            }
        } catch (error) {
            testResults.passed = false;
            testResults.errors.push(`AI Test Error: ${error.message}`);
            this.log('error', '❌ AI Turn Test Failed', error);
        }

        return testResults;
    }

    /**
     * Validate turn state and transitions
     */
    validateTurnState(gameState) {
        if (!this.enabled) return { passed: true };

        const testResults = {
            passed: true,
            errors: [],
            warnings: [],
            details: {}
        };

        try {
            if (gameState) {
                const phases = ['active', 'draw', 'main1', 'attack', 'main2', 'end'];
                const validPhase = phases.includes(gameState.currentPhase);

                testResults.details = {
                    currentPhase: gameState.currentPhase,
                    currentPlayer: gameState.currentPlayer,
                    turnNumber: gameState.turnNumber,
                    isActive: gameState.isActive,
                    validPhase
                };

                if (!validPhase) {
                    testResults.passed = false;
                    testResults.errors.push(`Invalid phase: ${gameState.currentPhase}`);
                }

                // Check for turn progression issues
                const lastTurnEntry = this.actionHistory
                    .filter(entry => entry.data?.turnNumber)
                    .slice(-1)[0];

                if (lastTurnEntry && lastTurnEntry.data.turnNumber === gameState.turnNumber - 1) {
                    // Turn just changed, validate it
                    this.log('info', '🔄 Turn Transition', {
                        from: lastTurnEntry.data,
                        to: testResults.details
                    });
                }
            }
        } catch (error) {
            testResults.passed = false;
            testResults.errors.push(`Turn State Test Error: ${error.message}`);
            this.log('error', '❌ Turn State Test Failed', error);
        }

        return testResults;
    }

    /**
     * Run all tests and return comprehensive report
     */
    runAllTests(gameState, gameBoard) {
        if (!this.enabled) return { overall: 'disabled' };

        this.log('info', '🧪 Running Comprehensive Game Tests');

        const results = {
            timestamp: Date.now(),
            cpSystem: this.testCPSystem(gameState, gameBoard),
            aiTurnAutomation: this.testAITurnAutomation(gameState),
            turnState: this.validateTurnState(gameState),
            overall: 'passed'
        };

        // Determine overall result
        const hasErrors = Object.values(results).some(result => 
            result && result.errors && result.errors.length > 0
        );

        const hasFailures = Object.values(results).some(result => 
            result && result.passed === false
        );

        if (hasErrors || hasFailures) {
            results.overall = 'failed';
            this.log('error', '❌ Game Tests Failed', results);
        } else {
            results.overall = 'passed';
            this.log('info', '✅ All Game Tests Passed', results);
        }

        return results;
    }

    /**
     * Get debugging report for support
     */
    getDebugReport() {
        return {
            timestamp: Date.now(),
            enabled: this.enabled,
            actionHistoryCount: this.actionHistory.length,
            cpSnapshotCount: this.cpSnapshots.length,
            testResultsCount: this.testResults.length,
            recentActions: this.actionHistory.slice(-20),
            recentCPSnapshots: this.cpSnapshots.slice(-10),
            recentTests: this.testResults.slice(-5)
        };
    }

    /**
     * Clear debugging data
     */
    clearDebugData() {
        this.actionHistory = [];
        this.cpSnapshots = [];
        this.testResults = [];
        this.log('info', '🧹 Debug data cleared');
    }
}

// Create singleton instance
export const gameDebugger = new GameDebugger();