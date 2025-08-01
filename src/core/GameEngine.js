/**
 * GAME ENGINE - Final Fantasy TCG Core Game Logic
 * 
 * This module implements the complete FFTCG rules engine including:
 * - Turn structure and phase management
 * - Card playing and ability resolution
 * - Combat system and damage calculation
 * - CP (Crystal Point) generation and management
 * - Stack-based ability resolution
 * - Victory condition checking
 * - Rule enforcement and validation
 * - Game state persistence and replay
 */

import { LocalStorage } from '../utils/LocalStorage.js';
import { Validation } from '../utils/Validation.js';

/**
 * GameEngine Class
 * Core game logic implementation for Final Fantasy TCG
 */
export class GameEngine {
    constructor(cardDatabase = null, playerManager = null) {
        // Dependencies
        this.cardDatabase = cardDatabase;
        this.playerManager = playerManager;

        // Game state constants
        this.GAME_MODES = {
            CONSTRUCTED: 'constructed', // 7 damage to lose
            LIMITED: 'limited'          // 6 damage to lose
        };

        this.PHASES = {
            ACTIVE: 'active',
            DRAW: 'draw',
            MAIN_1: 'main1',
            ATTACK: 'attack',
            MAIN_2: 'main2',
            END: 'end'
        };

        this.ATTACK_STEPS = {
            PREPARATION: 'preparation',
            DECLARATION: 'declaration',
            BLOCK_DECLARATION: 'block_declaration',
            DAMAGE_RESOLUTION: 'damage_resolution'
        };

        this.ZONES = {
            FIELD: 'field',
            HAND: 'hand',
            DECK: 'deck',
            DAMAGE: 'damage',
            BREAK: 'break',
            REMOVED: 'removed',
            STACK: 'stack'
        };

        // Game state
        this.gameState = null;
        this.isActive = false;

        // Event listeners
        this.listeners = new Map();

        // Action history for replays and undo
        this.actionHistory = [];
        this.maxHistorySize = 1000;

        // Initialize
        this.initialize();
    }

    /**
     * Initialize the game engine
     */
    initialize() {
        console.log('🎮 Initializing Game Engine...');
        
        // Set up default game state structure
        this.resetGameState();
        
        console.log('✅ Game Engine initialized');
    }

    /**
     * Reset game state to initial values
     */
    resetGameState() {
        this.gameState = {
            // Game metadata
            id: null,
            mode: this.GAME_MODES.CONSTRUCTED,
            startTime: null,
            endTime: null,
            winner: null,
            
            // Turn management
            currentPlayer: 0, // 0 or 1
            turnNumber: 1,
            currentPhase: this.PHASES.ACTIVE,
            currentStep: null,
            isFirstTurn: true,
            
            // Priority system
            priorityPlayer: 0,
            passedPriority: [false, false],
            
            // Players
            players: [
                this.createPlayerState('Player 1'),
                this.createPlayerState('Player 2')
            ],
            
            // Stack for abilities and summons
            stack: [],
            
            // Combat state
            combat: {
                isActive: false,
                attackingForwards: [],
                blockingForward: null,
                isPartyAttack: false,
                damage: {
                    attackers: [],
                    blocker: null
                }
            },
            
            // Game options
            options: {
                autoPassPriority: false,
                confirmActions: true,
                showAllZones: false
            },
            
            // Rule enforcement
            ruleEnforcement: {
                validateActions: true,
                allowIllegalActions: false,
                logViolations: true
            }
        };
    }

    /**
     * Create initial player state
     */
    createPlayerState(name) {
        return {
            // Player info
            name: name,
            id: null,
            
            // Life/damage
            damageZone: [],
            maxDamage: 7, // Changes to 6 in limited
            
            // Zones
            zones: {
                [this.ZONES.HAND]: [],
                [this.ZONES.DECK]: [],
                [this.ZONES.FIELD]: [],
                [this.ZONES.DAMAGE]: [],
                [this.ZONES.BREAK]: [],
                [this.ZONES.REMOVED]: []
            },
            
            // CP pool
            cpPool: {
                fire: 0,
                ice: 0,
                wind: 0,
                lightning: 0,
                water: 0,
                earth: 0,
                light: 0,
                dark: 0,
                generic: 0
            },
            
            // Field state
            field: {
                forwards: [],
                backups: [],
                monsters: []
            },
            
            // Temporary effects
            effects: {
                continuous: [], // Ongoing effects
                temporary: [],  // Until end of turn
                delayed: []     // Triggered later
            },
            
            // Counters and markers
            counters: new Map(),
            
            // Game stats
            stats: {
                cardsDrawn: 0,
                cpGenerated: 0,
                damageDealt: 0,
                cardsPlayed: 0
            }
        };
    }

    /**
     * Start a new game
     */
    startGame(player1Deck, player2Deck, options = {}) {
        try {
            console.log('🎯 Starting new game...');
            
            // Validate decks
            if (!this.validateDeck(player1Deck) || !this.validateDeck(player2Deck)) {
                throw new Error('Invalid deck provided');
            }
            
            // Reset game state
            this.resetGameState();
            
            // Set game options
            this.gameState.mode = options.mode || this.GAME_MODES.CONSTRUCTED;
            this.gameState.id = this.generateGameId();
            this.gameState.startTime = new Date().toISOString();
            
            // Set damage limit based on mode
            const damageLimit = this.gameState.mode === this.GAME_MODES.LIMITED ? 6 : 7;
            this.gameState.players[0].maxDamage = damageLimit;
            this.gameState.players[1].maxDamage = damageLimit;
            
            // Set up players
            this.setupPlayer(0, player1Deck, options.player1Name || 'Player 1');
            this.setupPlayer(1, player2Deck, options.player2Name || 'Player 2');
            
            // Determine first player
            this.determineFirstPlayer();
            
            // Perform opening hands
            this.dealOpeningHands();
            
            // Start first turn
            this.gameState.isActive = true;
            this.isActive = true;
            
            // Begin active phase
            this.beginPhase(this.PHASES.ACTIVE);
            
            this.emit('gameStarted', {
                gameId: this.gameState.id,
                players: this.gameState.players.map(p => ({ name: p.name, id: p.id })),
                firstPlayer: this.gameState.currentPlayer
            });
            
            console.log('✅ Game started successfully');
            return this.gameState.id;
            
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    /**
     * Generate unique game ID
     */
    generateGameId() {
        return 'game_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate deck for game play
     */
    validateDeck(deck) {
        if (!deck || !Array.isArray(deck.mainDeck)) {
            return false;
        }
        
        // Check deck size (50 cards for main deck)
        if (deck.mainDeck.length !== 50) {
            console.error(`Invalid deck size: ${deck.mainDeck.length} (expected 50)`);
            return false;
        }
        
        // Validate with card database if available
        if (this.cardDatabase) {
            const validation = this.cardDatabase.validateDeck(deck.mainDeck);
            if (!validation.isValid) {
                console.error('Deck validation failed:', validation.errors);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Set up a player for the game
     */
    setupPlayer(playerIndex, deck, playerName) {
        const player = this.gameState.players[playerIndex];
        
        // Set player info
        player.name = playerName;
        player.id = `player_${playerIndex}`;
        
        // Shuffle and set up main deck
        const shuffledDeck = [...deck.mainDeck].sort(() => Math.random() - 0.5);
        player.zones[this.ZONES.DECK] = shuffledDeck;
        
        // Set up LB deck if present
        if (deck.lbDeck && deck.lbDeck.length > 0) {
            // LB deck goes face down (implementation specific)
            player.lbDeck = [...deck.lbDeck];
        }
        
        console.log(`👤 Player ${playerIndex + 1} (${playerName}) set up with ${shuffledDeck.length} cards`);
    }

    /**
     * Determine first player randomly
     */
    determineFirstPlayer() {
        this.gameState.currentPlayer = Math.floor(Math.random() * 2);
        this.gameState.priorityPlayer = this.gameState.currentPlayer;
        
        console.log(`🎲 Player ${this.gameState.currentPlayer + 1} goes first`);
    }

    /**
     * Deal opening hands (5 cards each, with mulligan option)
     */
    dealOpeningHands() {
        for (let i = 0; i < 2; i++) {
            this.drawCards(i, 5);
            // Note: Mulligan would be handled by UI, calling redrawHand() if needed
        }
        
        console.log('🃏 Opening hands dealt');
    }

    /**
     * Allow a player to mulligan their opening hand
     */
    redrawHand(playerIndex) {
        const player = this.gameState.players[playerIndex];
        
        // Put hand back into deck
        player.zones[this.ZONES.DECK].push(...player.zones[this.ZONES.HAND]);
        player.zones[this.ZONES.HAND] = [];
        
        // Shuffle deck
        this.shuffleDeck(playerIndex);
        
        // Draw new hand
        this.drawCards(playerIndex, 5);
        
        this.emit('handRedrawn', { player: playerIndex });
        console.log(`🔄 Player ${playerIndex + 1} mulligan`);
    }

    /**
     * Begin a new phase
     */
    beginPhase(phase) {
        const oldPhase = this.gameState.currentPhase;
        this.gameState.currentPhase = phase;
        
        console.log(`📅 Phase: ${oldPhase} → ${phase}`);
        
        // Reset priority
        this.gameState.passedPriority = [false, false];
        this.gameState.priorityPlayer = this.gameState.currentPlayer;
        
        // Phase-specific setup
        switch (phase) {
            case this.PHASES.ACTIVE:
                this.performActivePhase();
                break;
                
            case this.PHASES.DRAW:
                this.performDrawPhase();
                break;
                
            case this.PHASES.MAIN_1:
            case this.PHASES.MAIN_2:
                this.performMainPhase();
                break;
                
            case this.PHASES.ATTACK:
                this.performAttackPhase();
                break;
                
            case this.PHASES.END:
                this.performEndPhase();
                break;
        }
        
        this.emit('phaseChanged', {
            oldPhase,
            newPhase: phase,
            currentPlayer: this.gameState.currentPlayer
        });
    }

    /**
     * Perform Active Phase
     */
    performActivePhase() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        
        // Activate all dull characters
        currentPlayer.field.forwards.forEach(forward => {
            if (forward.status === 'dull') {
                forward.status = 'active';
            }
        });
        
        currentPlayer.field.backups.forEach(backup => {
            if (backup.status === 'dull') {
                backup.status = 'active';
            }
        });
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('beginningOfActivePhase');
        
        // Auto-advance to draw phase (no player actions in active phase)
        setTimeout(() => {
            this.beginPhase(this.PHASES.DRAW);
        }, 1000);
    }

    /**
     * Perform Draw Phase
     */
    performDrawPhase() {
        const drawCount = this.gameState.isFirstTurn && this.gameState.currentPlayer === this.gameState.players[0] ? 1 : 2;
        
        // Draw cards
        this.drawCards(this.gameState.currentPlayer, drawCount);
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('afterDraw');
        
        // Auto-advance to main phase 1
        setTimeout(() => {
            this.beginPhase(this.PHASES.MAIN_1);
        }, 1000);
    }

    /**
     * Perform Main Phase
     */
    performMainPhase() {
        // Check for triggered abilities
        this.checkTriggeredAbilities('beginningOfMainPhase');
        
        // Give priority to current player
        this.givePriority(this.gameState.currentPlayer);
    }

    /**
     * Perform Attack Phase
     */
    performAttackPhase() {
        // Initialize combat
        this.gameState.combat.isActive = true;
        
        // Start with attack preparation step
        this.beginAttackStep(this.ATTACK_STEPS.PREPARATION);
    }

    /**
     * Perform End Phase
     */
    performEndPhase() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('beginningOfEndPhase');
        
        // Discard to hand size limit (5 cards)
        this.enforceHandSizeLimit(this.gameState.currentPlayer);
        
        // Clear damage from all forwards
        this.clearDamage();
        
        // Remove "until end of turn" effects
        this.clearTemporaryEffects();
        
        // End turn
        this.endTurn();
    }

    /**
     * Draw cards for a player
     */
    drawCards(playerIndex, count) {
        const player = this.gameState.players[playerIndex];
        const drawnCards = [];
        
        for (let i = 0; i < count; i++) {
            if (player.zones[this.ZONES.DECK].length === 0) {
                // Player loses due to empty deck
                this.endGame(1 - playerIndex, 'deck_out');
                return drawnCards;
            }
            
            const card = player.zones[this.ZONES.DECK].shift();
            player.zones[this.ZONES.HAND].push(card);
            drawnCards.push(card);
            player.stats.cardsDrawn++;
        }
        
        this.emit('cardsDrawn', {
            player: playerIndex,
            count: count,
            cards: drawnCards,
            remainingDeck: player.zones[this.ZONES.DECK].length
        });
        
        return drawnCards;
    }

    /**
     * Shuffle a player's deck
     */
    shuffleDeck(playerIndex) {
        const player = this.gameState.players[playerIndex];
        
        // Fisher-Yates shuffle
        for (let i = player.zones[this.ZONES.DECK].length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [player.zones[this.ZONES.DECK][i], player.zones[this.ZONES.DECK][j]] = 
            [player.zones[this.ZONES.DECK][j], player.zones[this.ZONES.DECK][i]];
        }
        
        this.emit('deckShuffled', { player: playerIndex });
    }

    /**
     * Play a card from hand
     */
    playCard(playerIndex, cardId, options = {}) {
        try {
            // Validate it's the player's turn and they have priority
            if (!this.canPlayerAct(playerIndex)) {
                throw new Error('Player cannot act at this time');
            }
            
            const player = this.gameState.players[playerIndex];
            const cardIndex = player.zones[this.ZONES.HAND].indexOf(cardId);
            
            if (cardIndex === -1) {
                throw new Error('Card not in hand');
            }
            
            // Get card data
            const card = this.getCardData(cardId);
            if (!card) {
                throw new Error('Invalid card');
            }
            
            // Check if we can play this card type in current phase
            if (!this.canPlayCardType(card.type)) {
                throw new Error(`Cannot play ${card.type} in ${this.gameState.currentPhase} phase`);
            }
            
            // Check CP cost
            if (!this.canPayCost(playerIndex, card.cost, card.element)) {
                throw new Error('Insufficient CP to play card');
            }
            
            // Pay cost
            this.payCost(playerIndex, card.cost, card.element);
            
            // Remove from hand
            player.zones[this.ZONES.HAND].splice(cardIndex, 1);
            
            // Play the card based on type
            switch (card.type) {
                case 'forward':
                case 'backup':
                case 'monster':
                    this.deployCharacter(playerIndex, card, options);
                    break;
                    
                case 'summon':
                    this.castSummon(playerIndex, card, options);
                    break;
                    
                default:
                    throw new Error(`Unknown card type: ${card.type}`);
            }
            
            player.stats.cardsPlayed++;
            
            this.emit('cardPlayed', {
                player: playerIndex,
                card: card,
                options: options
            });
            
            console.log(`🃏 Player ${playerIndex + 1} played ${card.name}`);
            
        } catch (error) {
            console.error('Failed to play card:', error);
            throw error;
        }
    }

    /**
     * Check if a player can currently act
     */
    canPlayerAct(playerIndex) {
        return this.gameState.isActive && 
               this.gameState.priorityPlayer === playerIndex &&
               this.isMainPhase();
    }

    /**
     * Check if we're in a main phase
     */
    isMainPhase() {
        return this.gameState.currentPhase === this.PHASES.MAIN_1 || 
               this.gameState.currentPhase === this.PHASES.MAIN_2;
    }

    /**
     * Check if a card type can be played in current phase
     */
    canPlayCardType(cardType) {
        if (!this.isMainPhase()) {
            return false;
        }
        
        // Characters can only be played in main phases when stack is empty
        if (['forward', 'backup', 'monster'].includes(cardType)) {
            return this.gameState.stack.length === 0;
        }
        
        // Summons can be played in main and attack phases
        if (cardType === 'summon') {
            return this.isMainPhase() || this.gameState.currentPhase === this.PHASES.ATTACK;
        }
        
        return false;
    }

    /**
     * Check if player can pay the cost for a card
     */
    canPayCost(playerIndex, cost, element) {
        const player = this.gameState.players[playerIndex];
        const cpPool = player.cpPool;
        
        // Calculate total available CP
        const totalCP = Object.values(cpPool).reduce((sum, cp) => sum + cp, 0);
        
        if (totalCP < cost) {
            return false;
        }
        
        // Check element requirement (at least 1 CP of matching element, except Light/Dark)
        if (element !== 'light' && element !== 'dark') {
            if (cpPool[element] === 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Pay CP cost for a card
     */
    payCost(playerIndex, cost, element) {
        const player = this.gameState.players[playerIndex];
        const cpPool = player.cpPool;
        
        let remainingCost = cost;
        
        // For non-Light/Dark cards, pay at least 1 of the matching element first
        if (element !== 'light' && element !== 'dark' && cpPool[element] > 0) {
            const elementCPToUse = Math.min(remainingCost, cpPool[element]);
            cpPool[element] -= elementCPToUse;
            remainingCost -= elementCPToUse;
        }
        
        // Pay remaining cost with any available CP
        const elements = Object.keys(cpPool);
        for (const elem of elements) {
            if (remainingCost <= 0) break;
            
            const cpToUse = Math.min(remainingCost, cpPool[elem]);
            cpPool[elem] -= cpToUse;
            remainingCost -= cpToUse;
        }
        
        this.emit('cpSpent', {
            player: playerIndex,
            cost: cost,
            element: element,
            remainingCP: Object.values(cpPool).reduce((sum, cp) => sum + cp, 0)
        });
    }

    /**
     * Deploy a character to the field
     */
    deployCharacter(playerIndex, card, options) {
        const player = this.gameState.players[playerIndex];
        
        // Create character object
        const character = {
            id: card.id,
            name: card.name,
            type: card.type,
            element: card.element,
            cost: card.cost,
            power: card.power,
            job: card.job,
            category: card.category,
            text: card.text,
            status: card.type === 'backup' ? 'dull' : 'active', // Backups enter dull
            damage: 0,
            counters: new Map(),
            effects: [],
            enteredThisTurn: true
        };
        
        // Add to appropriate field zone
        switch (card.type) {
            case 'forward':
                player.field.forwards.push(character);
                break;
            case 'backup':
                // Check backup limit (max 5)
                if (player.field.backups.length >= 5) {
                    throw new Error('Maximum 5 backups allowed');
                }
                player.field.backups.push(character);
                break;
            case 'monster':
                player.field.monsters.push(character);
                break;
        }
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('characterEntersField', { character, player: playerIndex });
        
        this.emit('characterDeployed', {
            player: playerIndex,
            character: character
        });
    }

    /**
     * Cast a summon
     */
    castSummon(playerIndex, card, options) {
        // Add summon to stack
        const summonEffect = {
            type: 'summon',
            card: card,
            controller: playerIndex,
            targets: options.targets || [],
            choices: options.choices || {}
        };
        
        this.addToStack(summonEffect);
        
        this.emit('summonCast', {
            player: playerIndex,
            summon: card,
            stackSize: this.gameState.stack.length
        });
    }

    /**
     * Add effect to the stack
     */
    addToStack(effect) {
        this.gameState.stack.push(effect);
        
        // Give priority to non-active player
        this.givePriority(1 - this.gameState.currentPlayer);
    }

    /**
     * Resolve the top effect on the stack
     */
    resolveStackTop() {
        if (this.gameState.stack.length === 0) {
            return;
        }
        
        const effect = this.gameState.stack.pop();
        
        console.log(`⚡ Resolving: ${effect.type}`);
        
        switch (effect.type) {
            case 'summon':
                this.resolveSummon(effect);
                break;
            case 'ability':
                this.resolveAbility(effect);
                break;
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
        
        // Give priority to current player after resolution
        this.givePriority(this.gameState.currentPlayer);
        
        this.emit('effectResolved', {
            effect: effect,
            stackSize: this.gameState.stack.length
        });
    }

    /**
     * Resolve a summon effect
     */
    resolveSummon(summonEffect) {
        const card = summonEffect.card;
        
        // Parse and execute summon text
        this.executeCardText(card.text, summonEffect.controller, summonEffect.targets, summonEffect.choices);
        
        // Move summon to break zone
        const player = this.gameState.players[summonEffect.controller];
        player.zones[this.ZONES.BREAK].push(card.id);
    }

    /**
     * Execute card text/abilities (simplified implementation)
     */
    executeCardText(text, controller, targets = [], choices = {}) {
        // This would be a complex parser for card abilities
        // For now, implement some basic patterns
        
        if (!text) return;
        
        // Deal damage pattern
        const damageMatch = text.match(/Deal (\d+) damage to (.*)/i);
        if (damageMatch) {
            const damage = parseInt(damageMatch[1]);
            // Apply damage to targets
            targets.forEach(target => {
                this.dealDamageToCharacter(target, damage);
            });
        }
        
        // Draw cards pattern
        const drawMatch = text.match(/draw (\d+) card/i);
        if (drawMatch) {
            const count = parseInt(drawMatch[1]);
            this.drawCards(controller, count);
        }
        
        // This would be greatly expanded in a full implementation
        console.log(`📝 Executed: ${text}`);
    }

    /**
     * Deal damage to a character
     */
    dealDamageToCharacter(characterId, damage) {
        // Find character on field
        for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
            const player = this.gameState.players[playerIndex];
            
            // Check forwards
            const forward = player.field.forwards.find(f => f.id === characterId);
            if (forward) {
                forward.damage += damage;
                
                // Check if character is destroyed
                if (forward.damage >= forward.power) {
                    this.destroyCharacter(playerIndex, forward, 'forwards');
                }
                
                this.emit('damageDealt', {
                    target: forward,
                    damage: damage,
                    totalDamage: forward.damage
                });
                return;
            }
        }
    }

    /**
     * Destroy a character
     */
    destroyCharacter(playerIndex, character, fieldType) {
        const player = this.gameState.players[playerIndex];
        
        // Remove from field
        const index = player.field[fieldType].indexOf(character);
        if (index > -1) {
            player.field[fieldType].splice(index, 1);
        }
        
        // Move to break zone
        player.zones[this.ZONES.BREAK].push(character.id);
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('characterDestroyed', { character, player: playerIndex });
        
        this.emit('characterDestroyed', {
            player: playerIndex,
            character: character
        });
        
        console.log(`💀 ${character.name} destroyed`);
    }

    /**
     * Begin attack step
     */
    beginAttackStep(step) {
        this.gameState.combat.currentStep = step;
        
        switch (step) {
            case this.ATTACK_STEPS.PREPARATION:
                // Trigger beginning of attack phase abilities
                this.checkTriggeredAbilities('beginningOfAttackPhase');
                // Give priority for responses
                this.givePriority(this.gameState.currentPlayer);
                break;
                
            case this.ATTACK_STEPS.DECLARATION:
                // Current player declares attackers
                this.awaitAttackerDeclaration();
                break;
                
            case this.ATTACK_STEPS.BLOCK_DECLARATION:
                // Defending player declares blockers
                this.awaitBlockerDeclaration();
                break;
                
            case this.ATTACK_STEPS.DAMAGE_RESOLUTION:
                // Resolve combat damage
                this.resolveCombatDamage();
                break;
        }
    }

    /**
     * Declare attackers
     */
    declareAttackers(playerIndex, forwardIds, isPartyAttack = false) {
        if (playerIndex !== this.gameState.currentPlayer) {
            throw new Error('Not your turn to attack');
        }
        
        const player = this.gameState.players[playerIndex];
        const attackers = [];
        
        // Validate and collect attackers
        forwardIds.forEach(forwardId => {
            const forward = player.field.forwards.find(f => f.id === forwardId);
            
            if (!forward) {
                throw new Error('Forward not found');
            }
            
            if (forward.status === 'dull') {
                throw new Error('Cannot attack with dull forward');
            }
            
            if (forward.enteredThisTurn && !this.hasHaste(forward)) {
                throw new Error('Forward has summoning sickness');
            }
            
            attackers.push(forward);
        });
        
        // If party attack, check same element requirement
        if (isPartyAttack && attackers.length > 1) {
            const firstElement = attackers[0].element;
            if (!attackers.every(a => a.element === firstElement)) {
                throw new Error('Party attack requires same element');
            }
        }
        
        // Dull attackers (unless they have Brave)
        attackers.forEach(attacker => {
            if (!this.hasBrave(attacker)) {
                attacker.status = 'dull';
            }
        });
        
        // Set combat state
        this.gameState.combat.attackingForwards = attackers;
        this.gameState.combat.isPartyAttack = isPartyAttack;
        
        this.emit('attackersDeclared', {
            player: playerIndex,
            attackers: attackers,
            isPartyAttack: isPartyAttack
        });
        
        // Move to block declaration
        this.beginAttackStep(this.ATTACK_STEPS.BLOCK_DECLARATION);
    }

    /**
     * Declare blockers
     */
    declareBlocker(playerIndex, forwardId) {
        if (playerIndex === this.gameState.currentPlayer) {
            throw new Error('Cannot block your own attack');
        }
        
        if (this.gameState.combat.attackingForwards.length === 0) {
            throw new Error('No attackers to block');
        }
        
        const player = this.gameState.players[playerIndex];
        let blocker = null;
        
        if (forwardId) {
            blocker = player.field.forwards.find(f => f.id === forwardId);
            
            if (!blocker) {
                throw new Error('Blocker not found');
            }
            
            if (blocker.status === 'dull') {
                throw new Error('Cannot block with dull forward');
            }
        }
        
        this.gameState.combat.blockingForward = blocker;
        
        this.emit('blockerDeclared', {
            player: playerIndex,
            blocker: blocker
        });
        
        // Move to damage resolution
        this.beginAttackStep(this.ATTACK_STEPS.DAMAGE_RESOLUTION);
    }

    /**
     * Resolve combat damage
     */
    resolveCombatDamage() {
        const combat = this.gameState.combat;
        
        if (combat.blockingForward) {
            // Blocked attack - creatures deal damage to each other
            this.resolveBlockedCombat();
        } else {
            // Unblocked attack - deal damage to player
            this.resolveUnblockedCombat();
        }
        
        // Clear combat
        this.clearCombat();
        
        // Check if turn player wants to attack again
        this.checkForAdditionalAttacks();
    }

    /**
     * Resolve blocked combat
     */
    resolveBlockedCombat() {
        const combat = this.gameState.combat;
        const blocker = combat.blockingForward;
        
        if (combat.isPartyAttack) {
            // Party attack: blocker assigns damage
            const totalPower = combat.attackingForwards.reduce((sum, f) => sum + f.power, 0);
            
            // For simplicity, distribute damage evenly (in real game, defending player chooses)
            const damagePerAttacker = Math.floor(blocker.power / combat.attackingForwards.length);
            
            combat.attackingForwards.forEach(attacker => {
                this.dealDamageToCharacter(attacker.id, damagePerAttacker);
            });
            
            this.dealDamageToCharacter(blocker.id, totalPower);
            
        } else {
            // Single combat
            const attacker = combat.attackingForwards[0];
            
            // Check for First Strike
            const attackerHasFirstStrike = this.hasFirstStrike(attacker);
            const blockerHasFirstStrike = this.hasFirstStrike(blocker);
            
            if (attackerHasFirstStrike && !blockerHasFirstStrike) {
                // Attacker deals damage first
                this.dealDamageToCharacter(blocker.id, attacker.power);
                
                // If blocker survives, it deals damage back
                if (blocker.damage < blocker.power) {
                    this.dealDamageToCharacter(attacker.id, blocker.power);
                }
            } else if (blockerHasFirstStrike && !attackerHasFirstStrike) {
                // Blocker deals damage first
                this.dealDamageToCharacter(attacker.id, blocker.power);
                
                // If attacker survives, it deals damage back
                if (attacker.damage < attacker.power) {
                    this.dealDamageToCharacter(blocker.id, attacker.power);
                }
            } else {
                // Simultaneous damage
                this.dealDamageToCharacter(attacker.id, blocker.power);
                this.dealDamageToCharacter(blocker.id, attacker.power);
            }
        }
    }

    /**
     * Resolve unblocked combat
     */
    resolveUnblockedCombat() {
        const defendingPlayer = 1 - this.gameState.currentPlayer;
        
        // Deal 1 damage to defending player regardless of attacker power
        this.dealDamageToPlayer(defendingPlayer, 1);
    }

    /**
     * Deal damage to a player
     */
    dealDamageToPlayer(playerIndex, damage) {
        const player = this.gameState.players[playerIndex];
        
        for (let i = 0; i < damage; i++) {
            if (player.zones[this.ZONES.DECK].length === 0) {
                // Player loses due to empty deck
                this.endGame(1 - playerIndex, 'deck_out');
                return;
            }
            
            // Move top card of deck to damage zone
            const card = player.zones[this.ZONES.DECK].shift();
            player.zones[this.ZONES.DAMAGE].push(card);
            
            // Check for EX Burst
            if (this.hasEXBurst(card)) {
                this.triggerEXBurst(playerIndex, card);
            }
            
            // Check for game end
            if (player.zones[this.ZONES.DAMAGE].length >= player.maxDamage) {
                this.endGame(1 - playerIndex, 'damage');
                return;
            }
        }
        
        this.emit('playerDamaged', {
            player: playerIndex,
            damage: damage,
            totalDamage: player.zones[this.ZONES.DAMAGE].length,
            maxDamage: player.maxDamage
        });
    }

    /**
     * Check if a card has EX Burst
     */
    hasEXBurst(cardId) {
        const card = this.getCardData(cardId);
        return card && card.text && card.text.includes('EX BURST');
    }

    /**
     * Trigger EX Burst
     */
    triggerEXBurst(playerIndex, cardId) {
        const card = this.getCardData(cardId);
        
        if (!card) return;
        
        // Player may choose to use EX Burst
        this.emit('exBurstAvailable', {
            player: playerIndex,
            card: card
        });
        
        // This would be handled by UI - player chooses whether to use it
    }

    /**
     * Use EX Burst
     */
    useEXBurst(playerIndex, cardId, targets = [], choices = {}) {
        const card = this.getCardData(cardId);
        
        if (!card || !this.hasEXBurst(cardId)) {
            throw new Error('Invalid EX Burst');
        }
        
        // Extract EX Burst text and execute
        const exBurstText = this.extractEXBurstText(card.text);
        this.executeCardText(exBurstText, playerIndex, targets, choices);
        
        this.emit('exBurstUsed', {
            player: playerIndex,
            card: card
        });
    }

    /**
     * Extract EX Burst text from card text
     */
    extractEXBurstText(text) {
        const match = text.match(/EX BURST (.+?)(?:\n|$)/);
        return match ? match[1] : '';
    }

    /**
     * Clear combat state
     */
    clearCombat() {
        this.gameState.combat = {
            isActive: false,
            attackingForwards: [],
            blockingForward: null,
            isPartyAttack: false,
            damage: {
                attackers: [],
                blocker: null
            }
        };
    }

    /**
     * Check for additional attacks
     */
    checkForAdditionalAttacks() {
        // Give priority back to attacking player
        this.givePriority(this.gameState.currentPlayer);
        
        // Player can choose to attack again or move to Main Phase 2
        this.emit('additionalAttackCheck', {
            player: this.gameState.currentPlayer
        });
    }

    /**
     * End attack phase
     */
    endAttackPhase() {
        this.clearCombat();
        this.beginPhase(this.PHASES.MAIN_2);
    }

    /**
     * Give priority to a player
     */
    givePriority(playerIndex) {
        this.gameState.priorityPlayer = playerIndex;
        this.gameState.passedPriority = [false, false];
        
        this.emit('priorityChanged', {
            player: playerIndex,
            phase: this.gameState.currentPhase,
            stackSize: this.gameState.stack.length
        });
    }

    /**
     * Pass priority
     */
    passPriority(playerIndex) {
        if (this.gameState.priorityPlayer !== playerIndex) {
            throw new Error('Player does not have priority');
        }
        
        this.gameState.passedPriority[playerIndex] = true;
        
        // If both players passed
        if (this.gameState.passedPriority.every(passed => passed)) {
            if (this.gameState.stack.length > 0) {
                // Resolve top of stack
                this.resolveStackTop();
            } else {
                // Move to next phase
                this.advancePhase();
            }
        } else {
            // Give priority to other player
            this.givePriority(1 - playerIndex);
        }
    }

    /**
     * Advance to next phase
     */
    advancePhase() {
        const currentPhase = this.gameState.currentPhase;
        
        switch (currentPhase) {
            case this.PHASES.MAIN_1:
                this.beginPhase(this.PHASES.ATTACK);
                break;
            case this.PHASES.ATTACK:
                this.beginPhase(this.PHASES.MAIN_2);
                break;
            case this.PHASES.MAIN_2:
                this.beginPhase(this.PHASES.END);
                break;
            default:
                // End phase completes in endTurn()
                break;
        }
    }

    /**
     * End current turn
     */
    endTurn() {
        // Clear turn-specific flags
        this.clearTurnFlags();
        
        // Switch to other player
        this.gameState.currentPlayer = 1 - this.gameState.currentPlayer;
        this.gameState.turnNumber++;
        this.gameState.isFirstTurn = false;
        
        this.emit('turnEnded', {
            previousPlayer: 1 - this.gameState.currentPlayer,
            currentPlayer: this.gameState.currentPlayer,
            turnNumber: this.gameState.turnNumber
        });
        
        // Start new turn
        this.beginPhase(this.PHASES.ACTIVE);
    }

    /**
     * Clear turn-specific flags and effects
     */
    clearTurnFlags() {
        // Clear "entered this turn" flags
        for (const player of this.gameState.players) {
            [...player.field.forwards, ...player.field.backups, ...player.field.monsters]
                .forEach(character => {
                    character.enteredThisTurn = false;
                });
        }
    }

    /**
     * Clear damage from all characters
     */
    clearDamage() {
        for (const player of this.gameState.players) {
            [...player.field.forwards, ...player.field.backups, ...player.field.monsters]
                .forEach(character => {
                    character.damage = 0;
                });
        }
    }

    /**
     * Clear temporary effects
     */
    clearTemporaryEffects() {
        for (const player of this.gameState.players) {
            player.effects.temporary = [];
            
            [...player.field.forwards, ...player.field.backups, ...player.field.monsters]
                .forEach(character => {
                    character.effects = character.effects.filter(effect => !effect.temporary);
                });
        }
    }

    /**
     * Enforce hand size limit
     */
    enforceHandSizeLimit(playerIndex) {
        const player = this.gameState.players[playerIndex];
        const handSizeLimit = 5;
        
        while (player.zones[this.ZONES.HAND].length > handSizeLimit) {
            // Player must discard (for now, discard randomly)
            const discardIndex = Math.floor(Math.random() * player.zones[this.ZONES.HAND].length);
            const discarded = player.zones[this.ZONES.HAND].splice(discardIndex, 1)[0];
            player.zones[this.ZONES.BREAK].push(discarded);
            
            this.emit('cardDiscarded', {
                player: playerIndex,
                card: discarded,
                reason: 'hand_size_limit'
            });
        }
    }

    /**
     * Check for triggered abilities
     */
    checkTriggeredAbilities(trigger, context = {}) {
        // This would scan all cards for abilities that trigger on the given event
        // For now, just log the trigger
        console.log(`🔍 Checking triggers: ${trigger}`, context);
        
        // In a full implementation, this would:
        // 1. Scan all cards in play for relevant triggers
        // 2. Add triggered abilities to a queue
        // 3. Put them on the stack in APNAP order
    }

    /**
     * End the game
     */
    endGame(winner, reason) {
        this.gameState.winner = winner;
        this.gameState.endTime = new Date().toISOString();
        this.gameState.isActive = false;
        this.isActive = false;
        
        const winnerName = this.gameState.players[winner].name;
        const loserName = this.gameState.players[1 - winner].name;
        
        console.log(`🏆 Game Over: ${winnerName} wins by ${reason}`);
        
        // Update player stats if available
        if (this.playerManager) {
            this.updatePlayerStats(winner, 1 - winner, reason);
        }
        
        this.emit('gameEnded', {
            winner: winner,
            loser: 1 - winner,
            reason: reason,
            winnerName: winnerName,
            loserName: loserName,
            gameId: this.gameState.id,
            duration: this.getGameDuration()
        });
    }

    /**
     * Update player statistics
     */
    updatePlayerStats(winner, loser, reason) {
        const gameDuration = this.getGameDuration();
        
        // Winner stats
        if (this.playerManager) {
            this.playerManager.recordGameResult({
                outcome: 'win',
                reason: reason,
                gameDurationMinutes: gameDuration,
                damageDealt: this.gameState.players[loser].zones[this.ZONES.DAMAGE].length,
                damageReceived: this.gameState.players[winner].zones[this.ZONES.DAMAGE].length,
                cardsPlayed: this.gameState.players[winner].stats.cardsPlayed
            });
        }
    }

    /**
     * Get game duration in minutes
     */
    getGameDuration() {
        if (!this.gameState.startTime || !this.gameState.endTime) {
            return 0;
        }
        
        const start = new Date(this.gameState.startTime);
        const end = new Date(this.gameState.endTime);
        return (end - start) / (1000 * 60); // Convert to minutes
    }

    /**
     * Generate CP by dulling a backup
     */
    generateCPFromBackup(playerIndex, backupId) {
        const player = this.gameState.players[playerIndex];
        const backup = player.field.backups.find(b => b.id === backupId);
        
        if (!backup) {
            throw new Error('Backup not found');
        }
        
        if (backup.status === 'dull') {
            throw new Error('Backup is already dull');
        }
        
        // Dull the backup
        backup.status = 'dull';
        
        // Generate 1 CP of the backup's element
        player.cpPool[backup.element]++;
        player.stats.cpGenerated++;
        
        this.emit('cpGenerated', {
            player: playerIndex,
            source: 'backup',
            backup: backup,
            element: backup.element,
            amount: 1
        });
    }

    /**
     * Generate CP by discarding a card
     */
    generateCPFromDiscard(playerIndex, cardId) {
        const player = this.gameState.players[playerIndex];
        const cardIndex = player.zones[this.ZONES.HAND].indexOf(cardId);
        
        if (cardIndex === -1) {
            throw new Error('Card not in hand');
        }
        
        const card = this.getCardData(cardId);
        if (!card) {
            throw new Error('Invalid card');
        }
        
        // Cannot discard Light/Dark cards for CP
        if (card.element === 'light' || card.element === 'dark') {
            throw new Error('Cannot discard Light/Dark cards for CP');
        }
        
        // Remove from hand
        player.zones[this.ZONES.HAND].splice(cardIndex, 1);
        
        // Move to break zone
        player.zones[this.ZONES.BREAK].push(cardId);
        
        // Generate 2 CP of the card's element
        player.cpPool[card.element] += 2;
        player.stats.cpGenerated += 2;
        
        this.emit('cpGenerated', {
            player: playerIndex,
            source: 'discard',
            card: card,
            element: card.element,
            amount: 2
        });
    }

    /**
     * Utility functions for checking character abilities
     */
    hasHaste(character) {
        return character.text && character.text.includes('Haste');
    }

    hasBrave(character) {
        return character.text && character.text.includes('Brave');
    }

    hasFirstStrike(character) {
        return character.text && character.text.includes('First Strike');
    }

    /**
     * Get card data from database
     */
    getCardData(cardId) {
        if (this.cardDatabase) {
            return this.cardDatabase.getCard(cardId);
        }
        
        // Fallback: return minimal card data
        return {
            id: cardId,
            name: 'Unknown Card',
            element: 'fire',
            type: 'forward',
            cost: 1,
            power: 1000
        };
    }

    /**
     * Get current game state (for UI)
     */
    getGameState() {
        return {
            ...this.gameState,
            isActive: this.isActive
        };
    }

    /**
     * Get simplified game state for networking
     */
    getPublicGameState(playerIndex = null) {
        const publicState = {
            id: this.gameState.id,
            mode: this.gameState.mode,
            currentPlayer: this.gameState.currentPlayer,
            currentPhase: this.gameState.currentPhase,
            turnNumber: this.gameState.turnNumber,
            priorityPlayer: this.gameState.priorityPlayer,
            stackSize: this.gameState.stack.length,
            isActive: this.isActive
        };
        
        // Add player-specific information
        if (playerIndex !== null) {
            publicState.yourTurn = this.gameState.currentPlayer === playerIndex;
            publicState.yourPriority = this.gameState.priorityPlayer === playerIndex;
        }
        
        return publicState;
    }

    /**
     * Activate game (switch to game view)
     */
    activate() {
        console.log('🎮 Game Engine activated');
        // This would set up the game UI when switching to game view
    }

    /**
     * Add event listener
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     */
    emit(eventName, data) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in game engine event listener for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Save game state
     */
    saveGame() {
        if (!this.gameState.id) {
            throw new Error('No active game to save');
        }
        
        const saveData = {
            gameState: this.gameState,
            actionHistory: this.actionHistory,
            timestamp: new Date().toISOString()
        };
        
        LocalStorage.set(`fftcg_game_${this.gameState.id}`, saveData);
        console.log('💾 Game saved');
        
        return saveData;
    }

    /**
     * Load game state
     */
    loadGame(gameId) {
        const saveData = LocalStorage.get(`fftcg_game_${gameId}`);
        
        if (!saveData) {
            throw new Error('Save game not found');
        }
        
        this.gameState = saveData.gameState;
        this.actionHistory = saveData.actionHistory || [];
        this.isActive = this.gameState.isActive;
        
        console.log('📂 Game loaded');
        this.emit('gameLoaded', { gameId, timestamp: saveData.timestamp });
        
        return this.gameState;
    }

    /**
     * Get available actions for current player
     */
    getAvailableActions(playerIndex = null) {
        const player = playerIndex !== null ? playerIndex : this.gameState.priorityPlayer;
        
        if (!this.gameState.isActive || this.gameState.priorityPlayer !== player) {
            return [];
        }
        
        const actions = [];
        
        // Always available: pass priority
        actions.push({ type: 'pass_priority' });
        
        // Phase-specific actions
        switch (this.gameState.currentPhase) {
            case this.PHASES.MAIN_1:
            case this.PHASES.MAIN_2:
                if (this.gameState.stack.length === 0) {
                    actions.push({ type: 'play_character' });
                }
                actions.push({ type: 'cast_summon' });
                actions.push({ type: 'use_ability' });
                actions.push({ type: 'generate_cp' });
                break;
                
            case this.PHASES.ATTACK:
                if (this.gameState.currentPlayer === player) {
                    if (this.gameState.combat.currentStep === this.ATTACK_STEPS.DECLARATION) {
                        actions.push({ type: 'declare_attackers' });
                        actions.push({ type: 'end_attack_phase' });
                    }
                } else {
                    if (this.gameState.combat.currentStep === this.ATTACK_STEPS.BLOCK_DECLARATION) {
                        actions.push({ type: 'declare_blocker' });
                    }
                }
                actions.push({ type: 'cast_summon' });
                actions.push({ type: 'use_ability' });
                break;
        }
        
        return actions;
    }

    /**
     * Validate action
     */
    validateAction(action, playerIndex) {
        const availableActions = this.getAvailableActions(playerIndex);
        return availableActions.some(a => a.type === action.type);
    }

    /**
     * Execute action
     */
    executeAction(action, playerIndex) {
        if (!this.validateAction(action, playerIndex)) {
            throw new Error('Invalid action');
        }
        
        // Record action in history
        this.actionHistory.push({
            action,
            playerIndex,
            timestamp: new Date().toISOString(),
            gameState: JSON.parse(JSON.stringify(this.gameState)) // Deep copy for history
        });
        
        // Limit history size
        if (this.actionHistory.length > this.maxHistorySize) {
            this.actionHistory.shift();
        }
        
        // Execute the action
        switch (action.type) {
            case 'pass_priority':
                this.passPriority(playerIndex);
                break;
            case 'play_character':
                this.playCard(playerIndex, action.cardId, action.options);
                break;
            case 'cast_summon':
                this.playCard(playerIndex, action.cardId, action.options);
                break;
            case 'declare_attackers':
                this.declareAttackers(playerIndex, action.forwardIds, action.isPartyAttack);
                break;
            case 'declare_blocker':
                this.declareBlocker(playerIndex, action.forwardId);
                break;
            case 'generate_cp':
                if (action.source === 'backup') {
                    this.generateCPFromBackup(playerIndex, action.backupId);
                } else if (action.source === 'discard') {
                    this.generateCPFromDiscard(playerIndex, action.cardId);
                }
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Start a practice game against AI
     */
    async startPracticeGame(gameConfig) {
        try {
            console.log('🤖 Starting practice game against AI...');
            
            if (!gameConfig || !gameConfig.playerDeck) {
                throw new Error('Invalid game configuration - missing player deck');
            }
            
            if (!gameConfig.aiDifficulty) {
                throw new Error('Invalid game configuration - missing AI difficulty');
            }
            
            console.log('🔍 Player deck format:', gameConfig.playerDeck);
            console.log('🔍 Player deck keys:', Object.keys(gameConfig.playerDeck || {}));
            console.log('🔍 Player deck type:', typeof gameConfig.playerDeck);
            
            // Convert deck format from DeckManager format to GameEngine format
            const convertDeck = (deckData) => {
                console.log('🔍 Converting deck data:', deckData);
                console.log('🔍 Deck data keys:', Object.keys(deckData || {}));
                console.log('🔍 Deck data type:', typeof deckData);
                
                if (!deckData) {
                    throw new Error('No deck data provided');
                }
                
                // If it already has mainDeck, use it
                if (deckData.mainDeck && Array.isArray(deckData.mainDeck)) {
                    console.log('✓ Using existing mainDeck format');
                    return deckData;
                }
                
                // Convert from DeckManager format (cards array) to GameEngine format (mainDeck array)
                if (deckData.cards && Array.isArray(deckData.cards)) {
                    console.log('✓ Converting from cards array to mainDeck');
                    return {
                        mainDeck: [...deckData.cards], // Copy the cards array
                        lbDeck: deckData.lbDeck || []
                    };
                }
                
                // Check if the deck itself is just an array of cards
                if (Array.isArray(deckData)) {
                    console.log('✓ Converting from card array directly to mainDeck');
                    return {
                        mainDeck: [...deckData],
                        lbDeck: []
                    };
                }
                
                console.error('❌ Invalid deck format. Expected: {cards: []} or {mainDeck: []} or []');
                console.error('❌ Received:', deckData);
                throw new Error(`Invalid deck format - no cards or mainDeck array found. Keys: ${Object.keys(deckData || {}).join(', ')}`);
            };
            
            // Convert player deck
            const playerDeck = convertDeck(gameConfig.playerDeck);
            console.log(`✓ Player deck converted: ${playerDeck.mainDeck.length} cards`);
            
            // Create AI deck - for now use the player deck as AI deck
            // TODO: Implement proper AI deck generation based on difficulty
            const aiDeckData = gameConfig.aiDeck || gameConfig.playerDeck;
            const aiDeck = convertDeck(aiDeckData);
            console.log(`✓ AI deck converted: ${aiDeck.mainDeck.length} cards`);
            
            // Get player name from player manager or use default
            const playerName = this.playerManager?.getProfile()?.name || 'Player';
            const aiName = `AI (${gameConfig.aiDifficulty})`;
            
            // Start the game using the existing startGame method
            const gameOptions = {
                mode: this.GAME_MODES.CONSTRUCTED,
                player1Name: playerName,
                player2Name: aiName,
                practiceMode: true,
                aiDifficulty: gameConfig.aiDifficulty
            };
            
            console.log('🎯 Starting practice game with config:', gameOptions);
            
            // Use the existing startGame method
            this.startGame(playerDeck, aiDeck, gameOptions);
            
            // Mark player 2 as AI controlled
            if (this.gameState && this.gameState.players && this.gameState.players[1]) {
                this.gameState.players[1].isAI = true;
                this.gameState.players[1].aiDifficulty = gameConfig.aiDifficulty;
            }
            
            console.log('✅ Practice game started successfully');
            
            // Emit event for UI updates
            this.emit('practiceGameStarted', {
                gameId: this.gameState.id,
                playerName: playerName,
                aiDifficulty: gameConfig.aiDifficulty
            });
            
        } catch (error) {
            console.error('❌ Failed to start practice game:', error);
            throw error;
        }
    }
}