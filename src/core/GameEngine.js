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
            MULLIGAN: 'mulligan',
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
            HAND: 'hand',
            DECK: 'deck',
            BACKUPS: 'backups',
            BATTLEFIELD: 'battlefield',
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


            // FFTCG Rules
            maxLifePoints: 7, // Standard FFTCG life points
            isActive: false,
            
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
            
            // Zones - Updated for simplified layout
            zones: {
                [this.ZONES.HAND]: [],
                [this.ZONES.DECK]: [],
                [this.ZONES.BACKUPS]: [],
                [this.ZONES.BATTLEFIELD]: [],
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
            
            // Field state - Updated for simplified zones
            field: {
                backups: [],    // Cards in backup zone
                battlefield: [] // Forwards in battlefield zone
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
            
            // Start with mulligan phase
            this.gameState.isActive = true;
            this.isActive = true;
            
            // Begin mulligan phase to offer hand redraw
            this.beginPhase(this.PHASES.MULLIGAN);
            
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

        // Analyze deck elements for CP display
        this.analyzeDeckElements(playerIndex, deck);
        
        console.log(`👤 Player ${playerIndex + 1} (${playerName}) set up with ${shuffledDeck.length} cards`);
    }

    /**
     * Analyze deck elements for CP display
     */
    analyzeDeckElements(playerIndex, deck) {
        const player = this.gameState.players[playerIndex];
        const elementCounts = {};
        
        // Analyze main deck cards
        if (deck.mainDeck && this.cardDatabase) {
            deck.mainDeck.forEach(cardId => {
                try {
                    // Get card from database
                    const card = this.cardDatabase.getCard(cardId);
                    if (card && card.element) {
                        // Exclude Light/Dark elements from CP generation (FFTCG rule)
                        if (card.element !== 'light' && card.element !== 'dark') {
                            elementCounts[card.element] = (elementCounts[card.element] || 0) + 1;
                        }
                    }
                } catch (error) {
                    console.warn(`💎 Could not analyze card ${cardId} for elements:`, error);
                }
            });
        }
        
        // Check if this is an AI deck with predefined elements (fallback for when card analysis fails)
        if (Object.keys(elementCounts).length === 0 && deck.aiDeckElements) {
            console.log(`💎 Using AI deck elements fallback for player ${playerIndex + 1}:`, deck.aiDeckElements);
            // Convert array to element count object for CP display
            deck.aiDeckElements.forEach(element => {
                elementCounts[element] = 1; // Just mark as present for CP display
            });
        }
        
        // Store deck elements in player data
        player.deckElements = elementCounts;
        
        console.log(`💎 Player ${playerIndex + 1} deck elements analyzed:`, elementCounts);
        
        // Emit event for GameBoard to update CP display
        this.emit('deckElementsAnalyzed', {
            player: playerIndex,
            elements: elementCounts
        });
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
     * Complete the mulligan phase and proceed to active play
     */
    completeMulliganPhase() {
        if (this.gameState.currentPhase !== this.PHASES.MULLIGAN) {
            console.warn('⚠️ Not in mulligan phase, ignoring completion request');
            return;
        }

        console.log('✅ Mulligan phase completed, proceeding to active play');
        
        // Proceed to active phase to begin first turn
        this.beginPhase(this.PHASES.ACTIVE);
        
        this.emit('mulliganPhaseCompleted', {
            gameId: this.gameState.id,
            currentPlayer: this.gameState.currentPlayer
        });
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
        
        // Activate all dull characters - Updated for simplified zones
        if (currentPlayer.field.battlefield) {
            currentPlayer.field.battlefield.forEach(character => {
                if (character.status === 'dull') {
                    character.status = 'active';
                }
            });
        }
        
        if (currentPlayer.field.backups) {
            currentPlayer.field.backups.forEach(backup => {
                if (backup.status === 'dull') {
                    backup.status = 'active';
                }
            });
        }
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('beginningOfActivePhase');
        
        // Auto-advance to draw phase only for AI or after a short delay
        if (currentPlayer.isAI) {
            setTimeout(() => {
                this.beginPhase(this.PHASES.DRAW);
            }, 1000);
        } else {
            // For human players, advance immediately since Active phase has no player actions
            setTimeout(() => {
                this.beginPhase(this.PHASES.DRAW);
            }, 500);
        }
    }

    /**
     * Perform Draw Phase
     */
    performDrawPhase() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        // FFTCG Rule: First player draws 1 card on their first turn only
        // Turn 1 = first player draws 1, Turn 2+ = everyone draws 2
        const drawCount = (this.gameState.turnNumber === 1) ? 1 : 2;
        
        console.log(`🎴 Draw Phase: Turn ${this.gameState.turnNumber}, Player ${this.gameState.currentPlayer + 1} draws ${drawCount} cards`);
        
        // Draw cards
        this.drawCards(this.gameState.currentPlayer, drawCount);
        
        // Check for triggered abilities
        this.checkTriggeredAbilities('afterDraw');
        
        // Auto-advance to main phase 1 only for AI players
        if (currentPlayer.isAI) {
            setTimeout(() => {
                this.beginPhase(this.PHASES.MAIN_1);
            }, 1000);
        } else {
            // For human players, advance immediately since Draw phase has no decisions
            setTimeout(() => {
                this.beginPhase(this.PHASES.MAIN_1);
            }, 500);
        }
    }

    /**
     * Perform Main Phase
     */
    performMainPhase() {
        // Check for triggered abilities
        this.checkTriggeredAbilities('beginningOfMainPhase');
        
        // Check if current player is AI
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        if (currentPlayer && currentPlayer.isAI) {
            console.log('🤖 AI Main Phase - starting AI turn automation');
            // AI should make decisions automatically
            this.performAIMainPhase();
        } else {
            // Give priority to human player
            this.givePriority(this.gameState.currentPlayer);
        }
    }

    /**
     * Perform AI Main Phase actions
     */
    performAIMainPhase() {
        const playerIndex = this.gameState.currentPlayer;
        
        setTimeout(() => {
            console.log('🤖 AI making main phase decisions...');
            
            // AI decision logic - simplified for now
            // TODO: Integrate with AIOpponent class for better decision making
            
            // For now, AI just advances to next phase
            console.log('🤖 AI passing main phase');
            this.advancePhase();
            
        }, 1500); // AI thinking delay
    }

    /**
     * Perform Attack Phase
     */
    performAttackPhase() {
        // Initialize combat
        this.gameState.combat.isActive = true;
        
        // Check if current player is AI
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        if (currentPlayer && currentPlayer.isAI) {
            console.log('🤖 AI Attack Phase - starting AI combat automation');
            this.performAIAttackPhase();
        } else {
            // Start with attack preparation step for human player
            this.beginAttackStep(this.ATTACK_STEPS.PREPARATION);
        }
    }

    /**
     * Perform AI Attack Phase actions
     */
    performAIAttackPhase() {
        setTimeout(() => {
            console.log('🤖 AI deciding whether to attack...');
            
            // AI decision logic - simplified for now
            // For now, AI skips attack phase
            console.log('🤖 AI skipping attack phase');
            this.advancePhase();
            
        }, 2000); // AI thinking delay for combat
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

        console.log(`🃏 Player ${playerIndex + 1} drew ${count} cards:`, drawnCards);
        console.log(`🃏 Hand size now: ${player.zones[this.ZONES.HAND].length}`);
        
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
            
            // Check if card has cost and requires payment
            if (card.cost && card.cost > 0) {
                // Check affordability first
                if (!this.canAffordCard(playerIndex, card)) {
                    throw new Error(`Player ${playerIndex} cannot afford ${card.name} (cost: ${card.cost}, available CP: ${this.getTotalCP(playerIndex)})`);
                }
                
                // Pay for the card automatically
                console.log(`💰 Card ${card.name} costs ${card.cost} CP - paying automatically`);
                if (!this.payForCardAutomatically(playerIndex, card)) {
                    throw new Error(`Failed to pay for ${card.name}`);
                }
            }
            
            // Play the card (either free or after successful payment)
            console.log(`🎴 Playing card ${card.name} (cost: ${card.cost || 0})`);
            return this.completeCardPlay(playerIndex, card, cardIndex, options);
            
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
     * Complete card play after payment is finished
     */
    completeCardPlay(playerIndex, card, cardIndex, options = {}) {
        console.log(`💰 Completing card play for ${card.name} after payment`);
        
        const player = this.gameState.players[playerIndex];
        
        // Remove from hand (use original index, but validate it still exists)
        const currentCardIndex = player.zones[this.ZONES.HAND].indexOf(card.id);
        if (currentCardIndex === -1) {
            console.error('Card no longer in hand during payment completion:', card.id);
            return false;
        }
        
        player.zones[this.ZONES.HAND].splice(currentCardIndex, 1);
        
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
                console.error(`Unknown card type: ${card.type}`);
                return false;
        }
        
        player.stats.cardsPlayed++;
        
        // Determine the zone where the card was placed based on type
        let targetZone;
        switch (card.type) {
            case 'forward':
            case 'monster':
                targetZone = this.ZONES.BATTLEFIELD;
                break;
            case 'backup':
                targetZone = this.ZONES.BACKUPS;
                break;
            case 'summon':
                targetZone = this.ZONES.BREAK; // Summons typically go to break zone after resolution
                break;
            default:
                targetZone = 'unknown';
        }
        
        this.emit('cardPlayed', {
            player: playerIndex,
            card: card,
            zone: targetZone
        });
        
        console.log(`✅ Card play completed for ${card.name}`);
        return true;
    }

    /**
     * Discard a card from hand for CP in payment mode
     */
    discardCardForCP(playerIndex, cardId) {
        const player = this.gameState.players[playerIndex];
        const handIndex = player.zones[this.ZONES.HAND].findIndex(id => id === cardId);
        
        if (handIndex === -1) {
            console.error('Card not in hand for CP discard:', cardId);
            return false;
        }
        
        // Remove from hand and add to break zone
        const removedCardId = player.zones[this.ZONES.HAND].splice(handIndex, 1)[0];
        player.zones[this.ZONES.BREAK].push(removedCardId);
        
        // Get card data for CP calculation
        const card = this.cardDatabase ? this.cardDatabase.getCard(removedCardId) : null;
        const element = card ? card.element : 'unknown';
        
        // Add CP to pool based on element
        if (element !== 'unknown') {
            if (element === 'light' || element === 'dark') {
                // Light/Dark cards generate 1 CP of their element
                player.cpPool[element] = (player.cpPool[element] || 0) + 1;
            } else {
                // Other elements generate 2 CP of their element
                player.cpPool[element] = (player.cpPool[element] || 0) + 2;
            }
        }
        
        this.emit('cpGenerated', {
            player: playerIndex,
            amount: (element === 'light' || element === 'dark') ? 1 : 2,
            element: element,
            source: 'discard',
            cardId: removedCardId
        });
        
        return true;
    }

    /**
     * Tap a backup card for CP in payment mode
     */
    tapCardForCP(playerIndex, cardId) {
        const player = this.gameState.players[playerIndex];
        const backupIndex = player.zones[this.ZONES.BACKUPS].findIndex(id => id === cardId);
        
        if (backupIndex === -1) {
            console.error('Card not in backups for CP tap:', cardId);
            return false;
        }
        
        // Check if card is already tapped (if we have tap state tracking)
        // For now, assume it's valid to tap
        
        // Get card data for CP calculation
        const card = this.cardDatabase ? this.cardDatabase.getCard(cardId) : null;
        const element = card ? card.element : 'unknown';
        
        // Add CP to pool
        if (element !== 'unknown') {
            player.cpPool[element] = (player.cpPool[element] || 0) + 1;
        }
        
        // TODO: Add tap state tracking for the card
        
        this.emit('cpGenerated', {
            player: playerIndex,
            amount: 1,
            element: element,
            source: 'tap_backup',
            cardId: cardId
        });
        
        return true;
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
        
        // Add to appropriate field zone - Updated for simplified layout
        switch (card.type) {
            case 'forward':
                // Forwards go to battlefield zone
                player.field.battlefield.push(character);
                player.zones[this.ZONES.BATTLEFIELD].push(card.id);
                break;
            case 'backup':
                // Check backup limit (max 7 slots)
                if (player.field.backups.length >= 7) {
                    throw new Error('Maximum 7 backups allowed');
                }
                player.field.backups.push(character);
                player.zones[this.ZONES.BACKUPS].push(card.id);
                break;
            case 'monster':
                // Monsters also go to battlefield (they're like forwards)
                player.field.battlefield.push(character);
                player.zones[this.ZONES.BATTLEFIELD].push(card.id);
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
     * Cast a summon (works like instant spell)
     */
    castSummon(playerIndex, card, options) {
        // Validate player can cast summon
        if (!this.canPlayerAct(playerIndex)) {
            throw new Error('Player cannot act');
        }
        
        // Note: Payment and hand removal is now handled by completeCardPlay
        // This method now only handles the actual summon resolution
        
        const player = this.gameState.players[playerIndex];
        
        // Add summon to stack (it will resolve immediately as instant)
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
        
        // Auto-resolve summons immediately in practice/single-player mode
        if (this.gameState.players[1].isAI || this.gameState.mode === 'practice' || this.gameState.options.autoResolve !== false) {
            console.log('🔄 Auto-resolving summon in practice mode');
            this.resolveStackTop();
        }
        
        // Add action to history
        this.addAction({
            type: 'cast_summon',
            player: playerIndex,
            card: card.id,
            timestamp: Date.now()
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
     * Resolve a summon effect (instant spell-like)
     */
    resolveSummon(summonEffect) {
        const card = summonEffect.card;
        const player = this.gameState.players[summonEffect.controller];
        
        console.log(`🌟 Resolving summon: ${card.name}`);
        
        // Execute summon effect immediately
        this.executeCardText(card.text, summonEffect.controller, summonEffect.targets, summonEffect.choices);
        
        // Summon goes directly to break zone (graveyard) after resolving
        player.zones[this.ZONES.BREAK].push(card.id);
        
        this.emit('summonResolved', {
            player: summonEffect.controller,
            summon: card,
            movedToBreakZone: true
        });
        
        console.log(`📚 ${card.name} moved to break zone`);
    }

    /**
     * Initialize damage zone with 7 cards from deck (life points)
     */
    initializeDamageZone(playerIndex) {
        if (!this.gameState || !this.gameState.players || !this.gameState.players[playerIndex]) {
            console.warn(`Cannot initialize damage zone: player ${playerIndex} not found`);
            return;
        }
        
        const player = this.gameState.players[playerIndex];
        
        // Initialize zones if they don't exist
        if (!player.zones[this.ZONES.DECK]) {
            player.zones[this.ZONES.DECK] = [];
        }
        if (!player.zones[this.ZONES.DAMAGE]) {
            player.zones[this.ZONES.DAMAGE] = [];
        }
        
        // Take first 7 cards from deck as life points
        if (player.zones[this.ZONES.DECK].length < 7) {
            console.warn(`Not enough cards in deck to initialize damage zone. Deck has ${player.zones[this.ZONES.DECK].length} cards`);
            // For practice mode, create placeholder cards
            const placeholderCards = [];
            for (let i = 0; i < 7; i++) {
                placeholderCards.push(`placeholder-life-${playerIndex}-${i}`);
            }
            player.zones[this.ZONES.DAMAGE] = placeholderCards;
        } else {
            const lifeCards = player.zones[this.ZONES.DECK].splice(0, 7);
            player.zones[this.ZONES.DAMAGE] = lifeCards;
        }
        
        this.emit('damageZoneInitialized', {
            player: playerIndex,
            lifePoints: player.zones[this.ZONES.DAMAGE].length
        });
        
        console.log(`💔 Player ${playerIndex + 1} initialized with ${player.zones[this.ZONES.DAMAGE].length} life points`);
    }

    /**
     * Deal damage to a player (move cards from damage zone to break zone)
     */
    dealDamage(playerIndex, amount = 1, source = null) {
        const player = this.gameState.players[playerIndex];
        const damageZone = player.zones[this.ZONES.DAMAGE];
        
        if (damageZone.length === 0) {
            // Player is already defeated
            this.declareWinner(playerIndex === 0 ? 1 : 0, 'damage');
            return;
        }
        
        const damageDealt = Math.min(amount, damageZone.length);
        const damagedCards = [];
        
        for (let i = 0; i < damageDealt; i++) {
            const cardId = damageZone.pop(); // Remove from damage zone
            player.zones[this.ZONES.BREAK].push(cardId); // Move to break zone
            damagedCards.push(cardId);
        }
        
        this.emit('damageDealt', {
            player: playerIndex,
            amount: damageDealt,
            source: source,
            remainingLife: damageZone.length,
            damagedCards: damagedCards
        });
        
        // Check for game over
        if (damageZone.length === 0) {
            this.declareWinner(playerIndex === 0 ? 1 : 0, 'damage');
        }
        
        console.log(`💔 Player ${playerIndex + 1} took ${damageDealt} damage, ${damageZone.length} life points remaining`);
        
        return damageDealt;
    }

    /**
     * Get remaining life points for a player
     */
    getRemainingLife(playerIndex) {
        return this.gameState.players[playerIndex].zones[this.ZONES.DAMAGE].length;
    }

    /**
     * Declare game winner
     */
    declareWinner(winnerIndex, reason = 'unknown') {
        if (this.gameState.winner !== null) return; // Game already ended
        
        this.gameState.winner = winnerIndex;
        this.gameState.endTime = Date.now();
        
        this.emit('gameEnded', {
            winner: winnerIndex,
            loser: winnerIndex === 0 ? 1 : 0,
            reason: reason,
            duration: this.gameState.endTime - this.gameState.startTime
        });
        
        console.log(`🏆 Player ${winnerIndex + 1} wins by ${reason}!`);
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
            
            // Check battlefield characters
            const character = player.field.battlefield?.find(c => c.id === characterId);
            if (character) {
                character.damage += damage;
                
                // Check if character is destroyed
                if (character.damage >= character.power) {
                    this.destroyCharacter(playerIndex, character, 'battlefield');
                }
                
                this.emit('damageDealt', {
                    target: character,
                    damage: damage,
                    totalDamage: character.damage
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
            const forward = player.field.battlefield?.find(f => f.id === forwardId);
            
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
            blocker = player.field.battlefield?.find(f => f.id === forwardId);
            
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
        const damagedCards = [];
        
        for (let i = 0; i < damage; i++) {
            if (player.zones[this.ZONES.DECK].length === 0) {
                // Player loses due to empty deck
                this.endGame(1 - playerIndex, 'deck_out');
                return;
            }
            
            // Move top card of deck to damage zone
            const card = player.zones[this.ZONES.DECK].shift();
            player.zones[this.ZONES.DAMAGE].push(card);
            damagedCards.push(card);
            
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
        
        // Emit both events for backward compatibility and animation
        this.emit('playerDamaged', {
            player: playerIndex,
            damage: damage,
            totalDamage: player.zones[this.ZONES.DAMAGE].length,
            maxDamage: player.maxDamage
        });

        this.emit('damageDealt', {
            player: playerIndex,
            amount: damage,
            source: 'combat',
            remainingLife: player.maxDamage - player.zones[this.ZONES.DAMAGE].length,
            damagedCards: damagedCards
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
     * Next phase method (alias for advancePhase)
     */
    nextPhase() {
        this.advancePhase();
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
        const previousPlayer = 1 - this.gameState.currentPlayer; // Player whose turn is ending
        
        // Clear "entered this turn" flags
        for (const player of this.gameState.players) {
            const allCharacters = [
                ...(player.field.battlefield || []),
                ...(player.field.backups || [])
            ];
            allCharacters.forEach(character => {
                character.enteredThisTurn = false;
            });
        }
        
        // CRITICAL FIX: Clear CP pool of the player whose turn is ending
        if (this.gameState.players[previousPlayer]) {
            const playerEndingTurn = this.gameState.players[previousPlayer];
            const elements = ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'];
            
            // Reset all CP to 0
            elements.forEach(element => {
                playerEndingTurn.cpPool[element] = 0;
            });
            
            console.log(`💎 Cleared CP pool for player ${previousPlayer + 1} at end of turn`);
            console.log(`💎 Remaining CP:`, playerEndingTurn.cpPool);
            
            this.emit('cpCleared', {
                player: previousPlayer,
                cpPool: playerEndingTurn.cpPool
            });
        }
    }

    /**
     * Clear damage from all characters
     */
    clearDamage() {
        for (const player of this.gameState.players) {
            const allCharacters = [
                ...(player.field.battlefield || []),
                ...(player.field.backups || [])
            ];
            allCharacters.forEach(character => {
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
            
            const allCharacters = [
                ...(player.field.battlefield || []),
                ...(player.field.backups || [])
            ];
            allCharacters.forEach(character => {
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
     * Check if a player can afford to play a card
     * Returns true if player has enough total CP to pay for the card
     */
    canAffordCard(playerIndex, card) {
        if (!card || !card.cost || card.cost === 0) {
            return true; // Free cards are always affordable
        }
        
        const player = this.gameState.players[playerIndex];
        if (!player) {
            return false;
        }
        
        // Calculate total available CP
        const totalCP = this.getTotalCP(playerIndex);
        
        console.log(`💰 Checking affordability for ${card.name} (cost: ${card.cost})`);
        console.log(`💰 Player ${playerIndex} total CP: ${totalCP}`);
        
        return totalCP >= card.cost;
    }

    /**
     * Get total CP available to a player
     */
    getTotalCP(playerIndex) {
        const player = this.gameState.players[playerIndex];
        if (!player) return 0;
        
        const cpPool = player.cpPool;
        return (cpPool.fire || 0) + (cpPool.ice || 0) + (cpPool.wind || 0) + 
               (cpPool.lightning || 0) + (cpPool.water || 0) + (cpPool.earth || 0) + 
               (cpPool.light || 0) + (cpPool.dark || 0) + (cpPool.generic || 0);
    }

    /**
     * Automatically pay for a card by deducting CP
     * Uses a simple first-available strategy to deduct the required CP
     */
    payForCardAutomatically(playerIndex, card) {
        if (!card.cost || card.cost === 0) {
            console.log(`🆓 Card ${card.name} is free - no CP deduction needed`);
            return true;
        }
        
        const player = this.gameState.players[playerIndex];
        if (!player) {
            console.error(`❌ Player ${playerIndex} not found`);
            return false;
        }
        
        // Check affordability first
        if (!this.canAffordCard(playerIndex, card)) {
            console.error(`❌ Player ${playerIndex} cannot afford ${card.name} (cost: ${card.cost})`);
            return false;
        }
        
        let remainingCost = card.cost;
        const cpPool = player.cpPool;
        const cpElements = ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark', 'generic'];
        
        // First, try to use matching element CP
        if (card.element && cpPool[card.element] > 0) {
            const useFromElement = Math.min(remainingCost, cpPool[card.element]);
            cpPool[card.element] -= useFromElement;
            remainingCost -= useFromElement;
            console.log(`💰 Used ${useFromElement} ${card.element} CP for ${card.name}`);
        }
        
        // Then use any other available CP
        for (const element of cpElements) {
            if (remainingCost <= 0) break;
            if (cpPool[element] > 0) {
                const useFromElement = Math.min(remainingCost, cpPool[element]);
                cpPool[element] -= useFromElement;
                remainingCost -= useFromElement;
                console.log(`💰 Used ${useFromElement} ${element} CP for ${card.name}`);
            }
        }
        
        if (remainingCost > 0) {
            console.error(`❌ Still need ${remainingCost} CP after payment attempt`);
            return false;
        }
        
        console.log(`✅ Successfully paid ${card.cost} CP for ${card.name}`);
        console.log(`💎 Remaining CP:`, cpPool);
        
        // Emit CP update event
        this.emit('cpUpdated', {
            player: playerIndex,
            cpPool: { ...cpPool },
            totalCP: this.getTotalCP(playerIndex)
        });
        
        return true;
    }

    /**
     * Get card data from database
     */
    getCardData(cardId) {
        if (this.cardDatabase) {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                console.log(`🃏 Found card data for ${cardId}:`, card);
                return card;
            } else {
                console.error(`🃏 Card not found in database: ${cardId}`);
            }
        } else {
            console.error('🃏 CardDatabase not available in GameEngine');
        }
        
        // Fallback: return minimal card data with error indication
        console.error(`🃏 Using fallback data for card: ${cardId}`);
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
            
            // Create AI deck - generate a proper AI deck instead of copying player deck
            const aiDeckData = gameConfig.aiDeck || this.generateAIDeck(gameConfig.aiDifficulty);
            const aiDeck = convertDeck(aiDeckData);
            console.log(`✓ AI deck generated: ${aiDeck.mainDeck.length} cards`);
            
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
    
    /**
     * Set the first player for the game
     */
    setFirstPlayer(firstPlayer) {
        if (this.gameState) {
            this.gameState.currentPlayer = firstPlayer === 'player' ? 'player1' : 'player2';
            this.gameState.firstPlayer = firstPlayer === 'player' ? 'player1' : 'player2';
            
            // Emit state change
            this.emit('gameStateChanged', {
                type: 'firstPlayerSet',
                firstPlayer: this.gameState.firstPlayer,
                currentPlayer: this.gameState.currentPlayer
            });
            
            logger.info(`First player set to: ${this.gameState.firstPlayer}`);
        } else {
            logger.warn('Cannot set first player: no active game state');
        }
    }

    /**
     * Generate a simple AI deck for practice games
     */
    generateAIDeck(difficulty = 'normal') {
        // Simple AI deck templates based on elements
        const deckTemplates = {
            fireIce: {
                name: 'Fire/Ice AI Deck',
                elements: ['fire', 'ice'],
                strategy: 'aggressive'
            },
            windLightning: {
                name: 'Wind/Lightning AI Deck', 
                elements: ['wind', 'lightning'],
                strategy: 'tempo'
            },
            waterEarth: {
                name: 'Water/Earth AI Deck',
                elements: ['water', 'earth'],
                strategy: 'control'
            },
            monoFire: {
                name: 'Mono Fire AI Deck',
                elements: ['fire'],
                strategy: 'aggressive'
            }
        };

        // Select template based on difficulty (for now, random selection)
        const templates = Object.values(deckTemplates);
        const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

        console.log(`🤖 Generating ${selectedTemplate.name} for AI`);

        // Generate a 50-card deck with the selected elements
        const aiDeck = this.buildAIDeckFromTemplate(selectedTemplate);
        
        // Store the AI deck elements for proper CP display
        const aiDeckData = {
            mainDeck: aiDeck,
            lbDeck: [],
            name: selectedTemplate.name,
            elements: selectedTemplate.elements,
            aiDeckElements: selectedTemplate.elements // Store for later analysis
        };
        
        console.log(`🤖 AI deck generated with elements:`, selectedTemplate.elements);
        return aiDeckData;
    }

    /**
     * Build AI deck from template
     */
    buildAIDeckFromTemplate(template) {
        const deck = [];
        
        // Try to use actual cards from database if available
        if (this.cardDatabase) {
            try {
                const availableCards = this.getCardsByElements(template.elements);
                if (availableCards.length >= 50) {
                    return this.buildDeckFromCards(availableCards, template.elements);
                }
            } catch (error) {
                console.warn('Could not build deck from database, using mock cards:', error);
            }
        }

        // Fallback: Create mock cards that will be recognized by analyzeDeckElements
        const deck50Cards = this.createMockDeck(template.elements);
        
        console.log(`🤖 Generated AI deck with ${deck50Cards.length} cards, elements: ${template.elements.join(', ')}`);
        return deck50Cards;
    }

    /**
     * Resolve ability effects
     */
    resolveAbility(effect) {
        console.log(`🔮 Resolving ability effect:`, effect);
        
        // Basic ability resolution - can be expanded for specific abilities
        try {
            if (effect.ability && effect.ability.effect) {
                // Parse and execute ability effects
                const abilityEffect = effect.ability.effect;
                
                // Handle common ability types
                if (abilityEffect.type === 'draw') {
                    this.drawCards(effect.player, abilityEffect.amount || 1);
                } else if (abilityEffect.type === 'damage') {
                    const target = abilityEffect.target || (1 - effect.player); // Default to opponent
                    this.dealDamageToPlayer(target, abilityEffect.amount || 1, 'ability');
                } else if (abilityEffect.type === 'search') {
                    // Search library - placeholder implementation
                    console.log(`🔍 Player ${effect.player} searches library`);
                } else {
                    console.log(`⚠️ Unknown ability effect type: ${abilityEffect.type}`);
                }
            }
        } catch (error) {
            console.error('Error resolving ability:', error);
        }
        
        // Emit resolution event
        this.emit('abilityResolved', {
            player: effect.player,
            ability: effect.ability,
            success: true
        });
    }

    /**
     * Get cards by elements from database
     */
    getCardsByElements(elements) {
        if (!this.cardDatabase || !this.cardDatabase.getAllCards) {
            throw new Error('Card database not available');
        }
        
        const allCards = this.cardDatabase.getAllCards();
        return allCards.filter(card => 
            elements.includes(card.element) && 
            card.element !== 'light' && 
            card.element !== 'dark'
        );
    }

    /**
     * Build deck from available cards
     */
    buildDeckFromCards(availableCards, elements) {
        const deck = [];
        const cardsPerElement = Math.floor(50 / elements.length);
        const remainder = 50 % elements.length;

        elements.forEach((element, index) => {
            const cardCount = cardsPerElement + (index < remainder ? 1 : 0);
            const elementCards = availableCards.filter(card => card.element === element);
            
            for (let i = 0; i < cardCount && i < elementCards.length; i++) {
                deck.push(elementCards[i].id);
            }
        });

        // Fill remaining slots if needed
        while (deck.length < 50 && availableCards.length > 0) {
            const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
            if (!deck.includes(randomCard.id)) {
                deck.push(randomCard.id);
            }
        }

        return deck;
    }

    /**
     * Await attacker declaration from current player
     */
    awaitAttackerDeclaration() {
        console.log('⚔️ Waiting for attacker declaration...');
        
        // In a full implementation, this would wait for player input
        // For now, we'll emit an event that the UI can respond to
        this.emit('awaitingAttackerDeclaration', {
            player: this.gameState.currentPlayer,
            availableAttackers: this.getAvailableAttackers()
        });
        
        // Auto-progress for AI or timeout after delay
        if (this.gameState.currentPlayer === 1) { // AI player
            setTimeout(() => {
                this.handleAIAttackerDeclaration();
            }, 1000);
        }
    }

    /**
     * Await blocker declaration from defending player
     */
    awaitBlockerDeclaration() {
        console.log('🛡️ Waiting for blocker declaration...');
        
        const defendingPlayer = 1 - this.gameState.currentPlayer;
        
        this.emit('awaitingBlockerDeclaration', {
            player: defendingPlayer,
            attackingForwards: this.gameState.combat.attackingForwards,
            availableBlockers: this.getAvailableBlockers(defendingPlayer)
        });
        
        // Auto-progress for AI or timeout after delay
        if (defendingPlayer === 1) { // AI player
            setTimeout(() => {
                this.handleAIBlockerDeclaration();
            }, 1000);
        }
    }

    /**
     * Get available attackers for current player
     */
    getAvailableAttackers() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const forwards = player.zones[this.ZONES.BATTLEFIELD] || [];
        
        // Return forwards that can attack (untapped, etc.)
        return forwards.filter(cardId => {
            // Basic check - can be expanded with tap state, summoning sickness, etc.
            return true;
        });
    }

    /**
     * Get available blockers for defending player
     */
    getAvailableBlockers(playerIndex) {
        const player = this.gameState.players[playerIndex];
        const forwards = player.zones[this.ZONES.BATTLEFIELD] || [];
        
        // Return forwards that can block
        return forwards.filter(cardId => {
            // Basic check - can be expanded with tap state, abilities, etc.
            return true;
        });
    }

    /**
     * Handle AI attacker declaration (basic AI logic)
     */
    handleAIAttackerDeclaration() {
        const availableAttackers = this.getAvailableAttackers();
        
        // Simple AI: attack with random forwards
        const attackers = availableAttackers.filter(() => Math.random() > 0.5);
        
        if (attackers.length > 0) {
            this.declareAttackers(this.gameState.currentPlayer, attackers, false);
        } else {
            // Skip attack phase
            this.progressCombatStep();
        }
    }

    /**
     * Handle AI blocker declaration (basic AI logic)
     */
    handleAIBlockerDeclaration() {
        const defendingPlayer = 1 - this.gameState.currentPlayer;
        const availableBlockers = this.getAvailableBlockers(defendingPlayer);
        
        // Simple AI: block with first available blocker if any
        if (availableBlockers.length > 0 && this.gameState.combat.attackingForwards.length > 0) {
            const blocker = availableBlockers[0];
            this.declareBlocker(defendingPlayer, blocker);
        } else {
            // No blocks
            this.progressCombatStep();
        }
    }

    /**
     * Create a mock deck with proper element distribution
     */
    createMockDeck(elements) {
        const deck = [];
        const cardsPerElement = Math.floor(50 / elements.length);
        const remainder = 50 % elements.length;

        elements.forEach((element, index) => {
            const cardCount = cardsPerElement + (index < remainder ? 1 : 0);
            
            // Create cards for this element with proper naming for database lookup
            for (let i = 0; i < cardCount; i++) {
                const cardType = i % 3 === 0 ? 'forward' : (i % 3 === 1 ? 'backup' : 'summon');
                const cardNumber = Math.floor(i / 3) + 1;
                deck.push(`mock_${element}_${cardType}_${cardNumber}`);
            }
        });

        // Add mock cards to database for element analysis
        this.addMockCardsToDatabase(elements);

        return deck;
    }

    /**
     * Add mock cards to database for AI deck element analysis
     */
    addMockCardsToDatabase(elements) {
        if (!this.cardDatabase || !this.cardDatabase.addCard) {
            console.warn('💎 Card database not available or no addCard method - relying on AI deck elements fallback');
            return;
        }

        elements.forEach(element => {
            // Add a variety of mock cards for this element
            ['forward', 'backup', 'summon'].forEach(type => {
                for (let i = 1; i <= 10; i++) {
                    const cardId = `mock_${element}_${type}_${i}`;
                    const mockCard = {
                        id: cardId,
                        name: `${element.charAt(0).toUpperCase() + element.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
                        element: element,
                        type: type,
                        cost: Math.min(i, 7), // Reasonable cost distribution
                        power: type === 'forward' ? 1000 + (i * 1000) : undefined
                    };

                    try {
                        this.cardDatabase.addCard(mockCard);
                    } catch (error) {
                        // Card might already exist, ignore error
                    }
                }
            });
        });

        console.log(`🃏 Added mock cards for elements: ${elements.join(', ')}`);
    }
}