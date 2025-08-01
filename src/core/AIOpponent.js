/**
 * AI OPPONENT SYSTEM
 * 
 * Provides AI decision-making for practice mode games.
 * Includes different difficulty levels and strategic decision making.
 */

import { logger } from '../utils/Logger.js';

/**
 * AI Opponent Class
 * Handles AI decision making for FFTCG practice games
 */
export class AIOpponent {
    constructor(difficulty = 'medium', cardDatabase) {
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
        this.cardDatabase = cardDatabase;
        this.gameState = null;
        this.playerId = 'ai';
        
        // AI personality traits based on difficulty
        this.traits = this.initializeTraits();
        
        // Decision-making delays for realism
        this.thinkingTime = {
            easy: { min: 500, max: 1500 },
            medium: { min: 1000, max: 2500 },
            hard: { min: 1500, max: 3000 }
        };
        
        logger.info(`🤖 AI Opponent initialized - Difficulty: ${difficulty}`);
    }
    
    /**
     * Initialize AI traits based on difficulty
     */
    initializeTraits() {
        const baseTraits = {
            easy: {
                aggression: 0.3,        // How likely to attack
                planning: 0.2,          // How far ahead AI thinks
                riskTaking: 0.4,        // Willingness to take risks
                resourceManagement: 0.3, // CP and card management
                adaptability: 0.2       // Response to player actions
            },
            medium: {
                aggression: 0.5,
                planning: 0.6,
                riskTaking: 0.3,
                resourceManagement: 0.7,
                adaptability: 0.5
            },
            hard: {
                aggression: 0.7,
                planning: 0.9,
                riskTaking: 0.2,
                resourceManagement: 0.9,
                adaptability: 0.8
            }
        };
        
        return baseTraits[this.difficulty];
    }
    
    /**
     * Set the current game state for AI decision making
     */
    setGameState(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Main AI turn processing
     */
    async takeTurn() {
        if (!this.gameState) {
            logger.error('AI cannot take turn - no game state provided');
            return;
        }
        
        logger.info(`🤖 AI (${this.difficulty}) taking turn...`);
        
        // Add realistic thinking delay
        await this.thinkingDelay();
        
        // Main phase decisions
        await this.mainPhase();
        
        // Attack phase decisions  
        await this.attackPhase();
        
        // End turn
        this.endTurn();
    }
    
    /**
     * AI main phase decision making
     */
    async mainPhase() {
        logger.debug('🤖 AI Main Phase');
        
        // 1. Play backup cards for CP generation
        await this.playBackupCards();
        
        // 2. Play forward cards for board presence
        await this.playForwardCards();
        
        // 3. Play summons if advantageous
        await this.playSummonCards();
        
        // 4. Use abilities if beneficial
        await this.useAbilities();
    }
    
    /**
     * AI attack phase decision making
     */
    async attackPhase() {
        logger.debug('🤖 AI Attack Phase');
        
        const aiForwards = this.getAIForwards();
        
        for (const forward of aiForwards) {
            if (!forward.tapped && this.shouldAttack(forward)) {
                await this.executeAttack(forward);
                await this.thinkingDelay('short');
            }
        }
    }
    
    /**
     * Play backup cards for CP generation
     */
    async playBackupCards() {
        const hand = this.getAIHand();
        const backupCards = hand.filter(card => card.type === 'backup');
        const currentCP = this.getAICP();
        
        for (const backup of backupCards) {
            if (this.canAffordCard(backup) && this.shouldPlayBackup(backup)) {
                await this.playCard(backup, 'backups');
                await this.thinkingDelay('short');
            }
        }
    }
    
    /**
     * Play forward cards for board control
     */
    async playForwardCards() {
        const hand = this.getAIHand();
        const forwardCards = hand.filter(card => card.type === 'forward');
        
        // Sort by priority (lower cost first for easy AI, strategic for hard AI)
        const sortedForwards = this.prioritizeForwards(forwardCards);
        
        for (const forward of sortedForwards) {
            if (this.canAffordCard(forward) && this.shouldPlayForward(forward)) {
                await this.playCard(forward, 'field');
                await this.thinkingDelay('short');
            }
        }
    }
    
    /**
     * Play summon cards when strategic
     */
    async playSummonCards() {
        const hand = this.getAIHand();
        const summonCards = hand.filter(card => card.type === 'summon');
        
        for (const summon of summonCards) {
            if (this.canAffordCard(summon) && this.shouldPlaySummon(summon)) {
                await this.playCard(summon, 'summons');
                await this.thinkingDelay('short');
            }
        }
    }
    
    /**
     * Determine if AI should play a backup card
     */
    shouldPlayBackup(backup) {
        const currentCP = this.getAICP();
        const maxCP = 10; // FFTCG CP limit
        
        // Always play if we have low CP
        if (currentCP < 3) return true;
        
        // Play if we have expensive cards in hand
        const hand = this.getAIHand();
        const expensiveCards = hand.filter(card => card.cost > currentCP);
        if (expensiveCards.length > 0) return true;
        
        // Difficulty-based decision
        const playChance = this.traits.resourceManagement;
        return Math.random() < playChance;
    }
    
    /**
     * Prioritize forward cards based on difficulty and strategy
     */
    prioritizeForwards(forwards) {
        if (this.difficulty === 'easy') {
            // Easy AI plays lowest cost first
            return forwards.sort((a, b) => a.cost - b.cost);
        }
        
        // Medium/Hard AI considers power, cost, and board state
        return forwards.sort((a, b) => {
            const scoreA = this.evaluateForwardValue(a);
            const scoreB = this.evaluateForwardValue(b);
            return scoreB - scoreA;
        });
    }
    
    /**
     * Evaluate the strategic value of a forward card
     */
    evaluateForwardValue(forward) {
        let score = forward.power || 0;
        
        // Prefer lower costs
        score += (10 - forward.cost) * 2;
        
        // Bonus for useful abilities (simplified)
        if (forward.text && forward.text.includes('Haste')) score += 5;
        if (forward.text && forward.text.includes('First Strike')) score += 3;
        if (forward.text && forward.text.includes('Brave')) score += 4;
        
        return score;
    }
    
    /**
     * Determine if AI should attack with a forward
     */
    shouldAttack(forward) {
        const playerForwards = this.getPlayerForwards();
        const playerDamage = this.getPlayerDamage();
        
        // Always attack if player has no defenders
        if (playerForwards.length === 0) return true;
        
        // Don't attack if we'd lose our forward unfavorably
        const wouldLoseForward = this.wouldLoseInCombat(forward, playerForwards);
        if (wouldLoseForward && this.traits.riskTaking < 0.5) return false;
        
        // Attack if it would win the game
        if (playerDamage.length >= 6) return true;
        
        // Difficulty-based aggression
        return Math.random() < this.traits.aggression;
    }
    
    /**
     * Execute an attack with a forward
     */
    async executeAttack(forward) {
        logger.info(`🤖 AI attacking with ${forward.name}`);
        
        // Trigger attack through game engine
        if (window.app && window.app.gameEngine) {
            window.app.gameEngine.declareAttack(forward.id, this.playerId);
        }
    }
    
    /**
     * Play a card to the specified zone
     */
    async playCard(card, targetZone) {
        logger.info(`🤖 AI playing ${card.name} to ${targetZone}`);
        
        // Trigger card play through game engine
        if (window.app && window.app.gameEngine) {
            window.app.gameEngine.playCard(card.id, targetZone, this.playerId);
        }
    }
    
    /**
     * Get AI player's hand
     */
    getAIHand() {
        return this.gameState?.players?.[this.playerId]?.hand || [];
    }
    
    /**
     * Get AI player's current CP
     */
    getAICP() {
        return this.gameState?.players?.[this.playerId]?.cp || 1;
    }
    
    /**
     * Get AI forwards on the field
     */
    getAIForwards() {
        return this.gameState?.field?.filter(card => card.controller === this.playerId) || [];
    }
    
    /**
     * Get player forwards on the field
     */
    getPlayerForwards() {
        return this.gameState?.field?.filter(card => card.controller === 'player1') || [];
    }
    
    /**
     * Get player damage zone
     */
    getPlayerDamage() {
        return this.gameState?.players?.player1?.damage || [];
    }
    
    /**
     * Check if AI can afford to play a card
     */
    canAffordCard(card) {
        return this.getAICP() >= (card.cost || 0);
    }
    
    /**
     * Determine if playing a forward would be beneficial
     */
    shouldPlayForward(forward) {
        const fieldSpace = this.getAvailableFieldSlots();
        if (fieldSpace <= 0) return false;
        
        // Always play if we have few forwards
        const aiForwards = this.getAIForwards();
        if (aiForwards.length < 2) return true;
        
        // Strategic decision based on difficulty
        const playChance = this.traits.planning;
        return Math.random() < playChance;
    }
    
    /**
     * Determine if playing a summon would be beneficial
     */
    shouldPlaySummon(summon) {
        // Summons are typically situational - simplified logic
        const playerForwards = this.getPlayerForwards();
        
        // More likely to use summons if player has multiple forwards
        if (playerForwards.length >= 2) return Math.random() < 0.7;
        
        return Math.random() < 0.3;
    }
    
    /**
     * Get available field slots for AI
     */
    getAvailableFieldSlots() {
        const maxSlots = 5; // FFTCG field limit per player
        const currentForwards = this.getAIForwards().length;
        return maxSlots - currentForwards;
    }
    
    /**
     * Check if forward would lose in combat
     */
    wouldLoseInCombat(attacker, defenders) {
        // Simplified combat calculation
        const strongestDefender = Math.max(...defenders.map(d => d.power || 0));
        return (attacker.power || 0) <= strongestDefender;
    }
    
    /**
     * Use available abilities strategically
     */
    async useAbilities() {
        // Simplified ability usage - can be expanded
        const hand = this.getAIHand();
        const abilityCards = hand.filter(card => 
            card.text && card.text.includes('Ability') && this.canAffordCard(card)
        );
        
        for (const card of abilityCards) {
            if (Math.random() < this.traits.adaptability) {
                await this.playCard(card, 'abilities');
                await this.thinkingDelay('short');
            }
        }
    }
    
    /**
     * End AI turn
     */
    endTurn() {
        logger.info('🤖 AI ending turn');
        
        if (window.app && window.app.gameEngine) {
            window.app.gameEngine.endTurn(this.playerId);
        }
    }
    
    /**
     * Add realistic thinking delays
     */
    async thinkingDelay(type = 'normal') {
        const delays = this.thinkingTime[this.difficulty];
        let min, max;
        
        switch (type) {
            case 'short':
                min = delays.min * 0.3;
                max = delays.max * 0.3;
                break;
            case 'long':
                min = delays.min * 1.5;
                max = delays.max * 1.5;
                break;
            default:
                min = delays.min;
                max = delays.max;
        }
        
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
    
    /**
     * Get AI difficulty level
     */
    getDifficulty() {
        return this.difficulty;
    }
    
    /**
     * Update AI difficulty
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.traits = this.initializeTraits();
        logger.info(`🤖 AI difficulty updated to: ${difficulty}`);
    }
}

export default AIOpponent;