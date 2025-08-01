/**
 * GAME BOARD COMPONENT - Game Interface and Card Rendering
 * 
 * This module provides the game board interface including:
 * - Game board rendering and layout
 * - Card display and positioning in zones
 * - Turn and phase management UI
 * - Drag and drop for card plays
 * - Game state visualization
 */

import { logger } from '../utils/Logger.js';

/**
 * GameBoard Class
 * Manages the game board interface and card rendering
 */
export class GameBoard {
    constructor(gameEngine, cardDatabase) {
        this.gameEngine = gameEngine;
        this.cardDatabase = cardDatabase;
        
        // Game state
        this.gameState = null;
        this.currentPlayer = 'player1';
        this.currentPhase = 'main';
        this.selectedCard = null;
        
        // UI elements
        this.gameBoard = null;
        this.turnIndicator = null;
        this.phaseIndicator = null;
        this.zones = {};
        
        // Event handlers
        this.boundHandlers = {};
        
        this.initialize();
    }

    /**
     * Initialize the game board
     */
    initialize() {
        this.setupUIElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
        
        logger.info('🎮 Game Board initialized');
    }

    /**
     * Set up UI element references
     */
    setupUIElements() {
        this.gameBoard = document.getElementById('gameBoard');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.phaseIndicator = document.getElementById('turnPhase');
        this.currentPlayerElement = document.getElementById('currentPlayer');
        
        // Zone references
        this.zones = {
            playerHand: document.getElementById('playerHandContent'),
            playerBackups: document.getElementById('playerBackupsContent'),
            playerSummons: document.getElementById('playerSummonsContent'),
            playerDamage: document.getElementById('playerDamageContent'),
            opponentHand: document.getElementById('opponentHandContent'),
            opponentBackups: document.getElementById('opponentBackupsContent'),
            opponentSummons: document.getElementById('opponentSummonsContent'),
            opponentDamage: document.getElementById('opponentDamageContent'),
            field: document.getElementById('gameField')
        };
        
        // Zone counters
        this.counters = {
            playerHandCount: document.getElementById('playerHandCount'),
            playerBackupsCount: document.getElementById('playerBackupsCount'),
            playerSummonsCount: document.getElementById('playerSummonsCount'),
            playerDamageCount: document.getElementById('playerDamageCount'),
            opponentHandCount: document.getElementById('opponentHandCount'),
            opponentBackupsCount: document.getElementById('opponentBackupsCount'),
            opponentSummonsCount: document.getElementById('opponentSummonsCount'),
            opponentDamageCount: document.getElementById('opponentDamageCount'),
            fieldCount: document.getElementById('fieldCount'),
            playerCP: document.getElementById('playerCP'),
            opponentCP: document.getElementById('opponentCP')
        };
        
        if (!this.gameBoard) {
            throw new Error('Game board element not found in DOM');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Phase buttons
        const endPhaseBtn = document.getElementById('endPhaseBtn');
        const endTurnBtn = document.getElementById('endTurnBtn');
        
        if (endPhaseBtn) {
            this.boundHandlers.endPhase = this.endPhase.bind(this);
            endPhaseBtn.addEventListener('click', this.boundHandlers.endPhase);
        }
        
        if (endTurnBtn) {
            this.boundHandlers.endTurn = this.endTurn.bind(this);
            endTurnBtn.addEventListener('click', this.boundHandlers.endTurn);
        }
        
        // Card selection
        this.boundHandlers.cardClick = this.handleCardClick.bind(this);
    }

    /**
     * Set up drag and drop functionality for card plays
     */
    setupDragAndDrop() {
        // Set up drop zones
        Object.entries(this.zones).forEach(([zoneName, zoneElement]) => {
            if (zoneElement) {
                this.setupDropZone(zoneElement, zoneName);
            }
        });
    }

    /**
     * Set up a drop zone for card plays
     */
    setupDropZone(zoneElement, zoneName) {
        zoneElement.addEventListener('dragover', (e) => {
            if (this.canDropInZone(zoneName, e.dataTransfer.types)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zoneElement.classList.add('drop-zone');
            }
        });

        zoneElement.addEventListener('dragleave', (e) => {
            if (!zoneElement.contains(e.relatedTarget)) {
                zoneElement.classList.remove('drop-zone');
            }
        });

        zoneElement.addEventListener('drop', (e) => {
            e.preventDefault();
            zoneElement.classList.remove('drop-zone');
            
            const cardId = e.dataTransfer.getData('text/plain');
            const dragType = e.dataTransfer.getData('application/x-drag-type');
            
            if (cardId && dragType === 'play-card') {
                this.handleCardPlay(cardId, zoneName);
            }
        });
    }

    /**
     * Check if a card can be dropped in a specific zone
     */
    canDropInZone(zoneName, dataTypes) {
        // Basic validation - can be expanded based on game rules
        const isPlayCard = Array.from(dataTypes).includes('application/x-drag-type');
        
        if (!isPlayCard) return false;
        
        // Player can only play to their own zones
        if (zoneName.startsWith('opponent')) return false;
        
        // Field is for forwards only, backups zone for backups only, etc.
        return true;
    }

    /**
     * Handle card play from hand to board
     */
    handleCardPlay(cardId, targetZone) {
        try {
            const card = this.cardDatabase.getCard(cardId);
            if (!card) {
                window.showNotification('Card not found', 'error');
                return;
            }

            // Validate play based on card type and target zone
            if (!this.validateCardPlay(card, targetZone)) {
                window.showNotification(`Cannot play ${card.name} to ${targetZone}`, 'warning');
                return;
            }

            // Attempt to play the card through game engine
            const success = this.gameEngine.playCard(cardId, targetZone);
            
            if (success) {
                this.updateGameDisplay();
                window.showNotification(`Played ${card.name}`, 'success');
                logger.info(`Played card: ${card.name} to ${targetZone}`);
            } else {
                window.showNotification('Cannot play card at this time', 'warning');
            }

        } catch (error) {
            logger.error('Error playing card:', error);
            window.showNotification('Error playing card', 'error');
        }
    }

    /**
     * Validate if a card can be played to a specific zone
     */
    validateCardPlay(card, targetZone) {
        // Basic FFTCG rules validation
        switch (card.type) {
            case 'forward':
                return targetZone === 'field';
            case 'backup':
                return targetZone === 'playerBackups';
            case 'summon':
                return targetZone === 'playerSummons';
            default:
                return false;
        }
    }

    /**
     * Create a game card element
     */
    createGameCard(card, isPlayerCard = true, isFaceDown = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `game-card element-${card.element}`;
        cardDiv.dataset.cardId = card.id;
        
        if (isPlayerCard && !isFaceDown) {
            cardDiv.draggable = true;
            
            // Add drag event listeners
            cardDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.id);
                e.dataTransfer.setData('application/x-drag-type', 'play-card');
                e.dataTransfer.setData('application/json', JSON.stringify({
                    id: card.id,
                    name: card.name,
                    element: card.element,
                    type: card.type,
                    cost: card.cost
                }));
                e.dataTransfer.effectAllowed = 'move';
                cardDiv.classList.add('dragging');
                
                logger.debug(`Started dragging: ${card.name}`);
            });

            cardDiv.addEventListener('dragend', () => {
                cardDiv.classList.remove('dragging');
            });
        }

        if (isFaceDown) {
            // Face-down card (opponent hand)
            cardDiv.innerHTML = `
                <div class="card-content">
                    <div class="card-image-area">🃏</div>
                </div>
            `;
        } else {
            // Face-up card
            cardDiv.innerHTML = `
                <div class="card-content">
                    <div class="card-image-area">${this.getElementIcon(card.element)}</div>
                    <div class="card-info">
                        <span class="card-name">${card.name}</span>
                        <span class="card-cost">${card.cost}</span>
                    </div>
                </div>
            `;
        }

        // Add click handler
        cardDiv.addEventListener('click', () => {
            this.handleCardClick(cardDiv, card);
        });

        return cardDiv;
    }

    /**
     * Get element icon for display
     */
    getElementIcon(element) {
        const icons = {
            fire: '🔥',
            ice: '❄️',
            wind: '🌪️',
            lightning: '⚡',
            water: '💧',
            earth: '🌍',
            light: '☀️',
            dark: '🌑'
        };
        return icons[element] || '❓';
    }

    /**
     * Handle card click (selection)
     */
    handleCardClick(cardElement, card) {
        // Clear previous selection
        document.querySelectorAll('.game-card.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Select new card
        cardElement.classList.add('selected');
        this.selectedCard = card;
        
        logger.debug(`Selected card: ${card.name}`);
        
        // Show card preview modal
        if (window.app && window.app.modal) {
            window.app.modal.openCardPreview(card);
        }
    }

    /**
     * Update the game display with current state
     */
    updateGameDisplay() {
        if (!this.gameState) {
            this.renderEmptyBoard();
            return;
        }

        // Update zones with cards
        this.renderPlayerHand(this.gameState.player1.hand);
        this.renderPlayerBackups(this.gameState.player1.backups);
        this.renderPlayerDamage(this.gameState.player1.damage);
        this.renderOpponentHand(this.gameState.player2.hand);
        this.renderOpponentBackups(this.gameState.player2.backups);
        this.renderOpponentDamage(this.gameState.player2.damage);
        this.renderField(this.gameState.field);
        
        // Update counters and CP
        this.updateCounters();
        this.updateTurnDisplay();
    }

    /**
     * Render empty board for new game
     */
    renderEmptyBoard() {
        // Create sample hand for testing
        const sampleCards = this.cardDatabase.getRandomCards(5);
        
        if (sampleCards.length > 0) {
            this.renderPlayerHand(sampleCards.map(card => card.id));
        }
        
        // Create opponent face-down cards
        this.renderOpponentHand(new Array(7).fill('face-down'));
        
        this.updateCounters();
    }

    /**
     * Render player hand
     */
    renderPlayerHand(handCardIds) {
        const handZone = this.zones.playerHand;
        if (!handZone) return;

        handZone.innerHTML = '';
        
        if (handCardIds.length === 0) {
            handZone.innerHTML = '<div class="zone-empty">No cards in hand</div>';
            return;
        }

        handCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, true, false);
                handZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Render player backups
     */
    renderPlayerBackups(backupCardIds) {
        const backupsZone = this.zones.playerBackups;
        if (!backupsZone) return;

        backupsZone.innerHTML = '';
        
        if (backupCardIds.length === 0) {
            backupsZone.innerHTML = '<div class="zone-empty">No backup cards</div>';
            return;
        }

        backupCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, true, false);
                backupsZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Render player damage zone
     */
    renderPlayerDamage(damageCardIds) {
        const damageZone = this.zones.playerDamage;
        if (!damageZone) return;

        damageZone.innerHTML = '';
        
        if (damageCardIds.length === 0) {
            damageZone.innerHTML = '<div class="zone-empty">No damage cards yet</div>';
            return;
        }

        damageCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, true, false);
                damageZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Render opponent hand (face down)
     */
    renderOpponentHand(handCardIds) {
        const handZone = this.zones.opponentHand;
        if (!handZone) return;

        handZone.innerHTML = '';
        
        handCardIds.forEach(() => {
            const cardElement = this.createGameCard({ id: 'face-down', element: 'unknown' }, false, true);
            handZone.appendChild(cardElement);
        });
    }

    /**
     * Render opponent backups
     */
    renderOpponentBackups(backupCardIds) {
        const backupsZone = this.zones.opponentBackups;
        if (!backupsZone) return;

        backupsZone.innerHTML = '';
        
        if (backupCardIds.length === 0) {
            backupsZone.innerHTML = '<div class="zone-empty">No backup cards</div>';
            return;
        }

        backupCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, false, false);
                backupsZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Render opponent damage zone
     */
    renderOpponentDamage(damageCardIds) {
        const damageZone = this.zones.opponentDamage;
        if (!damageZone) return;

        damageZone.innerHTML = '';
        
        if (damageCardIds.length === 0) {
            damageZone.innerHTML = '<div class="zone-empty">No damage cards yet</div>';
            return;
        }

        damageCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, false, false);
                damageZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Render field with forwards
     */
    renderField(fieldCards) {
        const fieldZone = this.zones.field;
        if (!fieldZone) return;

        // Clear existing field cards but keep header
        const header = fieldZone.querySelector('.zone-header');
        fieldZone.innerHTML = '';
        if (header) {
            fieldZone.appendChild(header);
        }
        
        if (fieldCards.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'zone-empty';
            emptyMsg.textContent = 'No forwards on the field';
            fieldZone.appendChild(emptyMsg);
            return;
        }

        fieldCards.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, true, false);
                fieldZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Update zone counters
     */
    updateCounters() {
        // Update player counters
        this.updateCounter('playerHandCount', this.zones.playerHand);
        this.updateCounter('playerBackupsCount', this.zones.playerBackups);
        this.updateCounter('playerDamageCount', this.zones.playerDamage);
        
        // Update opponent counters
        this.updateCounter('opponentHandCount', this.zones.opponentHand);
        this.updateCounter('opponentBackupsCount', this.zones.opponentBackups);
        this.updateCounter('opponentDamageCount', this.zones.opponentDamage);
        
        // Update field counter
        this.updateCounter('fieldCount', this.zones.field);
        
        // Update CP (placeholder values)
        if (this.counters.playerCP) {
            this.counters.playerCP.textContent = 'CP: 3';
        }
        if (this.counters.opponentCP) {
            this.counters.opponentCP.textContent = 'CP: 2';
        }
    }

    /**
     * Update individual counter
     */
    updateCounter(counterId, zone) {
        const counter = this.counters[counterId];
        if (!counter || !zone) return;

        const cardCount = zone.querySelectorAll('.game-card').length;
        counter.textContent = cardCount;
    }

    /**
     * Update turn and phase display
     */
    updateTurnDisplay() {
        if (this.currentPlayerElement) {
            this.currentPlayerElement.textContent = this.currentPlayer === 'player1' ? 'Your Turn' : 'Opponent Turn';
        }
        
        if (this.phaseIndicator) {
            this.phaseIndicator.textContent = this.getPhaseDisplayName(this.currentPhase);
        }
        
        if (this.turnIndicator) {
            this.turnIndicator.classList.toggle('active', this.currentPlayer === 'player1');
        }
    }

    /**
     * Get display name for phase
     */
    getPhaseDisplayName(phase) {
        const phaseNames = {
            main: 'Main Phase',
            attack: 'Attack Phase',
            block: 'Block Phase',
            damage: 'Damage Phase',
            end: 'End Phase'
        };
        return phaseNames[phase] || phase;
    }

    /**
     * End current phase
     */
    endPhase() {
        // This would integrate with the game engine
        logger.info('Ending phase');
        window.showNotification('Phase ended', 'info');
        
        // Placeholder phase progression
        const phases = ['main', 'attack', 'block', 'damage', 'end'];
        const currentIndex = phases.indexOf(this.currentPhase);
        
        if (currentIndex < phases.length - 1) {
            this.currentPhase = phases[currentIndex + 1];
        } else {
            this.endTurn();
            return;
        }
        
        this.updateTurnDisplay();
    }

    /**
     * End current turn
     */
    endTurn() {
        logger.info('Ending turn');
        window.showNotification('Turn ended', 'info');
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
        this.currentPhase = 'main';
        
        this.updateTurnDisplay();
    }

    /**
     * Set game state from game engine
     */
    setGameState(gameState) {
        this.gameState = gameState;
        this.updateGameDisplay();
    }

    /**
     * Start a new game
     */
    startGame() {
        logger.info('Starting new game');
        
        // Reset game state
        this.currentPlayer = 'player1';
        this.currentPhase = 'main';
        this.selectedCard = null;
        
        // Render initial board
        this.renderEmptyBoard();
        this.updateTurnDisplay();
        
        window.showNotification('New game started!', 'success');
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        Object.values(this.boundHandlers).forEach(handler => {
            // Cleanup would go here
        });
        this.boundHandlers = {};
        
        logger.info('🎮 Game Board destroyed');
    }
}

// Export for use in other modules
export default GameBoard;