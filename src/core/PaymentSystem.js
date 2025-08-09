/**
 * PAYMENT SYSTEM - FFTCG Rule-Compliant CP Management
 * 
 * This module implements the correct FFTCG CP system where:
 * - CP is NOT a persistent resource pool
 * - CP only exists temporarily during payment transactions
 * - CP must be generated and spent immediately for each cost
 * - Excess CP is discarded after payment
 * - No CP carries over between actions, phases, or turns
 */

import { gameDebugger } from '../utils/GameDebugger.js';

export class PaymentSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Payment state (only active during transactions)
        this.paymentState = {
            active: false,
            targetCost: 0,
            targetElement: null,
            generatedCP: {},
            sources: [] // Track what generated the CP for logging
        };
        
        // Available CP sources for the current player
        this.availableSources = {
            backups: [],
            handCards: []
        };
    }

    /**
     * Start a payment transaction for a card or ability
     */
    startPayment(playerIndex, cost, element, cardName) {
        gameDebugger.log('info', `💰 Starting payment for ${cardName}: ${cost} ${element} CP`, {
            playerIndex, cost, element, cardName
        });

        // Reset payment state
        this.paymentState = {
            active: true,
            targetCost: cost,
            targetElement: element,
            generatedCP: this.initializeCPPool(),
            sources: [],
            playerIndex,
            cardName
        };

        // Analyze available CP sources for this player
        this.analyzeAvailableSources(playerIndex);

        return {
            success: true,
            cost,
            element,
            availableSources: this.availableSources
        };
    }

    /**
     * Generate CP from dulling a backup
     */
    generateCPFromBackup(playerIndex, backupId) {
        if (!this.paymentState.active) {
            throw new Error('Cannot generate CP - no payment in progress');
        }

        if (this.paymentState.playerIndex !== playerIndex) {
            throw new Error('Wrong player generating CP');
        }

        const player = this.gameEngine.gameState.players[playerIndex];
        const backup = player.field.backups?.find(b => b.id === backupId);

        if (!backup) {
            throw new Error('Backup not found');
        }

        if (backup.status === 'dull') {
            throw new Error('Backup already dull');
        }

        // Dull the backup
        backup.status = 'dull';

        // Generate 1 CP of backup's element
        const element = backup.element;
        this.paymentState.generatedCP[element] = (this.paymentState.generatedCP[element] || 0) + 1;
        this.paymentState.sources.push({
            type: 'backup',
            cardName: backup.name,
            element: element,
            amount: 1
        });

        gameDebugger.log('info', `💎 Generated 1 ${element} CP from backup ${backup.name}`, {
            generatedCP: this.paymentState.generatedCP,
            totalSources: this.paymentState.sources.length
        });

        return {
            success: true,
            element,
            amount: 1,
            totalGenerated: this.getTotalGeneratedCP()
        };
    }

    /**
     * Generate CP from discarding a card
     */
    generateCPFromDiscard(playerIndex, cardId) {
        if (!this.paymentState.active) {
            throw new Error('Cannot generate CP - no payment in progress');
        }

        if (this.paymentState.playerIndex !== playerIndex) {
            throw new Error('Wrong player generating CP');
        }

        const player = this.gameEngine.gameState.players[playerIndex];
        const cardIndex = player.zones.hand.indexOf(cardId);

        if (cardIndex === -1) {
            throw new Error('Card not in hand');
        }

        const card = this.gameEngine.getCardData(cardId);
        if (!card) {
            throw new Error('Invalid card');
        }

        // Cannot discard Light/Dark cards for CP
        if (card.element === 'light' || card.element === 'dark') {
            throw new Error('Cannot discard Light/Dark cards for CP');
        }

        // Remove from hand and move to break zone
        player.zones.hand.splice(cardIndex, 1);
        player.zones.break.push(cardId);

        // Generate 2 CP of card's element
        const element = card.element;
        this.paymentState.generatedCP[element] = (this.paymentState.generatedCP[element] || 0) + 2;
        this.paymentState.sources.push({
            type: 'discard',
            cardName: card.name,
            element: element,
            amount: 2
        });

        gameDebugger.log('info', `💎 Generated 2 ${element} CP from discarding ${card.name}`, {
            generatedCP: this.paymentState.generatedCP,
            totalSources: this.paymentState.sources.length
        });

        return {
            success: true,
            element,
            amount: 2,
            totalGenerated: this.getTotalGeneratedCP()
        };
    }

    /**
     * Check if payment can be completed
     */
    canCompletePayment() {
        if (!this.paymentState.active) {
            return false;
        }

        const { targetCost, targetElement, generatedCP } = this.paymentState;
        const totalCP = this.getTotalGeneratedCP();

        if (totalCP < targetCost) {
            return false;
        }

        // Check element requirement (need at least 1 CP of target element, except Light/Dark)
        if (targetElement !== 'light' && targetElement !== 'dark') {
            if ((generatedCP[targetElement] || 0) === 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Complete the payment and play the card
     */
    completePayment() {
        if (!this.paymentState.active) {
            throw new Error('No payment in progress');
        }

        if (!this.canCompletePayment()) {
            throw new Error('Cannot complete payment - insufficient CP');
        }

        const { targetCost, targetElement, generatedCP, sources, cardName, playerIndex } = this.paymentState;
        const totalGenerated = this.getTotalGeneratedCP();

        // Calculate spent and excess CP
        const spentCP = targetCost;
        const excessCP = totalGenerated - spentCP;

        gameDebugger.log('info', `💰 Completing payment for ${cardName}`, {
            cost: targetCost,
            element: targetElement,
            generated: totalGenerated,
            spent: spentCP,
            excess: excessCP,
            sources: sources.length
        });

        // Log the transaction
        this.logPaymentTransaction(spentCP, excessCP, sources);

        // Clear payment state (CP is discarded)
        this.clearPaymentState();

        return {
            success: true,
            spent: spentCP,
            excess: excessCP,
            sources
        };
    }

    /**
     * Cancel the current payment (return resources)
     */
    cancelPayment() {
        if (!this.paymentState.active) {
            return;
        }

        const { sources, playerIndex, cardName } = this.paymentState;

        gameDebugger.log('info', `❌ Cancelling payment for ${cardName}`, {
            playerIndex,
            sourcesToRevert: sources.length
        });

        // Revert all CP generation actions
        this.revertCPSources(sources);

        // Clear payment state
        this.clearPaymentState();

        return {
            success: true,
            reverted: sources.length
        };
    }

    /**
     * Get current payment status
     */
    getPaymentStatus() {
        if (!this.paymentState.active) {
            return { active: false };
        }

        const { targetCost, targetElement, cardName } = this.paymentState;
        const generated = this.getTotalGeneratedCP();
        const canComplete = this.canCompletePayment();
        const remaining = Math.max(0, targetCost - generated);

        return {
            active: true,
            cardName,
            targetCost,
            targetElement,
            generated,
            remaining,
            canComplete,
            generatedCP: { ...this.paymentState.generatedCP },
            sources: [...this.paymentState.sources]
        };
    }

    /**
     * Helper: Initialize empty CP pool
     */
    initializeCPPool() {
        return {
            fire: 0,
            ice: 0,
            wind: 0,
            lightning: 0,
            water: 0,
            earth: 0,
            light: 0,
            dark: 0
        };
    }

    /**
     * Helper: Get total generated CP
     */
    getTotalGeneratedCP() {
        return Object.values(this.paymentState.generatedCP).reduce((sum, amount) => sum + amount, 0);
    }

    /**
     * Helper: Analyze available CP sources for player
     */
    analyzeAvailableSources(playerIndex) {
        const player = this.gameEngine.gameState.players[playerIndex];

        // Available backups (not dull)
        this.availableSources.backups = (player.field.backups || []).filter(backup => 
            backup.status !== 'dull'
        );

        // Available hand cards (not Light/Dark)
        this.availableSources.handCards = (player.zones.hand || [])
            .map(cardId => this.gameEngine.getCardData(cardId))
            .filter(card => card && card.element !== 'light' && card.element !== 'dark');

        gameDebugger.log('info', `📊 Available CP sources for player ${playerIndex}`, {
            backups: this.availableSources.backups.length,
            handCards: this.availableSources.handCards.length
        });
    }

    /**
     * Helper: Revert CP generation sources
     */
    revertCPSources(sources) {
        const player = this.gameEngine.gameState.players[this.paymentState.playerIndex];

        sources.forEach(source => {
            if (source.type === 'backup') {
                // Untap the backup
                const backup = player.field.backups?.find(b => b.name === source.cardName);
                if (backup && backup.status === 'dull') {
                    backup.status = 'active';
                    gameDebugger.log('info', `🔄 Untapped backup ${source.cardName}`);
                }
            } else if (source.type === 'discard') {
                // Return card from break zone to hand (if possible)
                const cardIndex = player.zones.break.findIndex(cardId => {
                    const card = this.gameEngine.getCardData(cardId);
                    return card && card.name === source.cardName;
                });
                
                if (cardIndex !== -1) {
                    const cardId = player.zones.break.splice(cardIndex, 1)[0];
                    player.zones.hand.push(cardId);
                    gameDebugger.log('info', `🔄 Returned ${source.cardName} to hand`);
                }
            }
        });
    }

    /**
     * Helper: Clear payment state
     */
    clearPaymentState() {
        gameDebugger.log('info', '🧹 Payment state cleared - all CP discarded');
        
        this.paymentState = {
            active: false,
            targetCost: 0,
            targetElement: null,
            generatedCP: {},
            sources: []
        };

        this.availableSources = {
            backups: [],
            handCards: []
        };
    }

    /**
     * Helper: Log payment transaction
     */
    logPaymentTransaction(spent, excess, sources) {
        const transaction = {
            timestamp: Date.now(),
            spent,
            excess,
            sources: sources.map(s => ({
                type: s.type,
                cardName: s.cardName,
                element: s.element,
                amount: s.amount
            }))
        };

        gameDebugger.log('info', '📄 Payment Transaction Complete', transaction);

        if (excess > 0) {
            gameDebugger.log('warn', `💸 ${excess} CP wasted (discarded after payment)`, { excess });
        }
    }

    /**
     * Get payment summary for UI display
     */
    getPaymentSummary() {
        if (!this.paymentState.active) {
            return null;
        }

        const status = this.getPaymentStatus();
        return {
            cardName: status.cardName,
            cost: `${status.targetCost} ${status.targetElement}`,
            progress: `${status.generated}/${status.targetCost}`,
            canComplete: status.canComplete,
            sources: status.sources.map(s => 
                `${s.cardName} (${s.amount} ${s.element})`
            ).join(', ')
        };
    }
}

// Create singleton instance
export const paymentSystem = new PaymentSystem();