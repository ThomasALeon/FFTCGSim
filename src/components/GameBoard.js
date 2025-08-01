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
import { imageMapping } from '../utils/ImageMapping.js';

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
        
        // Add interactive class for cards that players can interact with
        if (!isFaceDown) {
            cardDiv.classList.add('interactive');
        }
        
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
            // Face-up card with real image
            cardDiv.innerHTML = `
                <div class="card-content">
                    <div class="card-image-area">
                        ${this.getCardImageHTML(card)}
                    </div>
                    <div class="card-info">
                        <span class="card-name">${card.name}</span>
                        <span class="card-cost">${card.cost || '?'}</span>
                    </div>
                </div>
            `;
        }

        // Add click handler
        cardDiv.addEventListener('click', () => {
            this.handleCardClick(cardDiv, card);
        });

        // Add hover handler for card preview (only if not face down)
        if (!isFaceDown) {
            cardDiv.addEventListener('mouseenter', () => {
                this.showCardPreview(card);
            });
        }

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
     * Get the appropriate image HTML for a card in game
     */
    getCardImageHTML(card) {
        // Check if we have a real image mapping for this card
        const cardImageMapping = imageMapping.getCardImageMapping(card.id);
        
        // Use image mapping first, then fall back to card's built-in image property
        let imageUrl = null;
        if (cardImageMapping && cardImageMapping.image) {
            imageUrl = cardImageMapping.image;
        } else if (card.hasRealImage && card.image) {
            imageUrl = card.image;
        }
        
        if (imageUrl) {
            return `
                <img class="card-real-image" 
                     src="${imageUrl}" 
                     alt="${card.name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
                <div class="card-placeholder element-${card.element}" style="display: none;">
                    <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                    <div class="card-placeholder-text">${card.name}</div>
                </div>
            `;
        } else {
            // Use placeholder with element styling
            return `
                <div class="card-placeholder element-${card.element}">
                    <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                    <div class="card-placeholder-text">${card.name}</div>
                </div>
            `;
        }
    }

    /**
     * Handle card click (selection) - Game specific actions
     */
    handleCardClick(cardElement, card) {
        // Clear previous selection
        document.querySelectorAll('.game-card.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Hide any existing floating menus
        this.hideFloatingActionMenu();

        // Select new card
        cardElement.classList.add('selected');
        this.selectedCard = card;
        
        logger.debug(`Selected card: ${card.name}`);
        
        // Show card in preview area
        this.showCardPreview(card);
        
        // Show floating action menu next to the card
        this.showFloatingActionMenu(card, cardElement);
    }

    /**
     * Show card preview in the left panel
     */
    showCardPreview(card) {
        const previewContent = document.getElementById('cardPreviewContent');
        if (!previewContent) return;

        // Get card image URL
        const cardImageMapping = imageMapping.getCardImageMapping(card.id);
        let imageUrl = null;
        if (cardImageMapping && cardImageMapping.image) {
            imageUrl = cardImageMapping.image;
        } else if (card.hasRealImage && card.image) {
            imageUrl = card.image;
        }

        previewContent.innerHTML = `
            <div class="card-preview-image">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${card.name}" class="card-preview-img" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="card-placeholder element-${card.element}" style="display: none;">
                         <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                         <div class="card-placeholder-text">${card.name}</div>
                     </div>` :
                    `<div class="card-placeholder element-${card.element}">
                         <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                         <div class="card-placeholder-text">${card.name}</div>
                     </div>`
                }
            </div>
            <div class="card-preview-info">
                <div class="card-preview-name">${card.name}</div>
                <div class="card-preview-details">
                    <div class="card-preview-detail">
                        <span class="card-preview-label">Cost:</span>
                        <span class="card-preview-value">${card.cost || '-'}</span>
                    </div>
                    <div class="card-preview-detail">
                        <span class="card-preview-label">Element:</span>
                        <span class="card-preview-value">${this.getElementIcon(card.element)} ${this.capitalizeFirst(card.element)}</span>
                    </div>
                    <div class="card-preview-detail">
                        <span class="card-preview-label">Type:</span>
                        <span class="card-preview-value">${this.capitalizeFirst(card.type)}</span>
                    </div>
                    ${card.power ? `
                        <div class="card-preview-detail">
                            <span class="card-preview-label">Power:</span>
                            <span class="card-preview-value">${card.power}</span>
                        </div>
                    ` : ''}
                    ${card.job ? `
                        <div class="card-preview-detail">
                            <span class="card-preview-label">Job:</span>
                            <span class="card-preview-value">${card.job}</span>
                        </div>
                    ` : ''}
                </div>
                ${card.text ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #444;">
                        <div style="font-size: 0.8rem; line-height: 1.4; color: var(--color-text-primary, #fff);">
                            ${card.text}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Show floating action menu next to card
     */
    showFloatingActionMenu(card, cardElement) {
        // Determine what zone the card is in and get available actions
        const zone = this.getCardZone(cardElement);
        const isPlayerCard = this.isPlayerCard(cardElement);
        const actions = this.getAvailableCardActions(card, zone, isPlayerCard);
        
        // Filter out view action - we use the preview panel now
        const filteredActions = actions.filter(action => action.id !== 'view');
        
        if (filteredActions.length === 0) return;

        // Create floating menu
        const menu = document.createElement('div');
        menu.className = 'floating-action-menu';
        menu.id = 'floatingActionMenu';
        
        // Add action buttons
        filteredActions.forEach(action => {
            const button = document.createElement('button');
            button.className = `floating-action-btn ${this.getActionClass(action.id)}`;
            button.innerHTML = action.icon;
            button.setAttribute('data-tooltip', action.label);
            button.onclick = () => {
                this.handleCardAction(action.id, card.id);
                this.hideFloatingActionMenu();
            };
            menu.appendChild(button);
        });

        // Position menu next to card
        const rect = cardElement.getBoundingClientRect();
        const gameBoard = document.getElementById('gameBoard');
        const boardRect = gameBoard.getBoundingClientRect();
        
        // Position to the right of the card, or left if not enough space
        let left = rect.right + 8 - boardRect.left;
        if (left + 200 > boardRect.width) {
            left = rect.left - 200 - 8 - boardRect.left;
        }
        
        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${rect.top - boardRect.top}px`;

        // Add to game board
        gameBoard.appendChild(menu);
        
        // Show with animation
        setTimeout(() => menu.classList.add('show'), 10);
        
        // Hide menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', this.hideFloatingMenuOnClickOutside.bind(this), { once: true });
        }, 100);
    }

    /**
     * Hide floating action menu
     */
    hideFloatingActionMenu() {
        const menu = document.getElementById('floatingActionMenu');
        if (menu) {
            menu.classList.remove('show');
            setTimeout(() => menu.remove(), 200);
        }
    }

    /**
     * Hide floating menu when clicking outside
     */
    hideFloatingMenuOnClickOutside(event) {
        const menu = document.getElementById('floatingActionMenu');
        if (menu && !menu.contains(event.target) && !event.target.closest('.game-card')) {
            this.hideFloatingActionMenu();
        }
    }

    /**
     * Get CSS class for action type
     */
    getActionClass(actionId) {
        if (actionId.startsWith('play')) return 'play';
        if (actionId.includes('attack')) return 'attack';
        if (actionId.includes('tap')) return 'tap';
        if (actionId === 'activate') return 'activate';
        return '';
    }

    /**
     * Capitalize first letter of string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get the zone a card is currently in
     */
    getCardZone(cardElement) {
        const zoneElement = cardElement.closest('[id$="Content"]');
        if (!zoneElement) return 'unknown';
        
        const zoneId = zoneElement.id;
        if (zoneId.includes('Hand')) return 'hand';
        if (zoneId.includes('Backups')) return 'backups';
        if (zoneId.includes('Summons')) return 'summons';
        if (zoneId.includes('Damage')) return 'damage';
        if (zoneId.includes('field')) return 'field';
        
        return 'unknown';
    }

    /**
     * Check if a card belongs to the player
     */
    isPlayerCard(cardElement) {
        const zoneElement = cardElement.closest('.player-area');
        return zoneElement && zoneElement.classList.contains('player-controlled');
    }

    /**
     * Get available actions for a card based on its state and location
     */
    getAvailableCardActions(card, zone, isPlayerCard) {
        const actions = [];
        
        // Only allow actions on player's turn and player's cards (unless opponent's field cards for attacks)
        const isPlayerTurn = this.currentPlayer === 'player1';
        
        if (!isPlayerCard && zone !== 'field') {
            // Can only interact with opponent's field cards
            actions.push({ 
                id: 'view', 
                label: 'View Card', 
                icon: '👁️',
                description: 'View card details'
            });
            return actions;
        }

        // Add view action for all cards
        actions.push({ 
            id: 'view', 
            label: 'View Card', 
            icon: '👁️',
            description: 'View card details'
        });

        // Actions based on zone and game phase
        if (isPlayerCard && isPlayerTurn) {
            switch (zone) {
                case 'hand':
                    if (this.currentPhase === 'main') {
                        if (card.type === 'forward') {
                            actions.push({ 
                                id: 'playForward', 
                                label: 'Play as Forward', 
                                icon: '⚔️',
                                description: `Cost: ${card.cost || '?'} CP`
                            });
                        }
                        if (card.type === 'backup') {
                            actions.push({ 
                                id: 'playBackup', 
                                label: 'Play as Backup', 
                                icon: '🛡️',
                                description: `Cost: ${card.cost || '?'} CP`
                            });
                        }
                        if (card.type === 'summon') {
                            actions.push({ 
                                id: 'playSummon', 
                                label: 'Cast Summon', 
                                icon: '✨',
                                description: `Cost: ${card.cost || '?'} CP`
                            });
                        }
                    }
                    break;
                    
                case 'field':
                    if (this.currentPhase === 'main') {
                        actions.push({ 
                            id: 'activate', 
                            label: 'Activate Ability', 
                            icon: '⚡',
                            description: 'Use special ability'
                        });
                    }
                    if (this.currentPhase === 'attack') {
                        actions.push({ 
                            id: 'attack', 
                            label: 'Attack', 
                            icon: '⚔️',
                            description: 'Attack opponent or their forwards'
                        });
                    }
                    if (!cardElement.classList.contains('tapped')) {
                        actions.push({ 
                            id: 'tap', 
                            label: 'Tap', 
                            icon: '🔄',
                            description: 'Tap this card'
                        });
                    }
                    break;
                    
                case 'backups':
                    if (this.currentPhase === 'main' && !cardElement.classList.contains('tapped')) {
                        actions.push({ 
                            id: 'tapForCP', 
                            label: 'Tap for CP', 
                            icon: '💎',
                            description: 'Generate Crystal Points'
                        });
                        actions.push({ 
                            id: 'activate', 
                            label: 'Activate Ability', 
                            icon: '⚡',
                            description: 'Use special ability'
                        });
                    }
                    break;
                    
                case 'damage':
                    // Damage cards are generally just for viewing
                    break;
            }
        }

        // Attack actions for opponent's forwards
        if (!isPlayerCard && zone === 'field' && isPlayerTurn && this.currentPhase === 'attack') {
            actions.push({ 
                id: 'attackTarget', 
                label: 'Attack This Forward', 
                icon: '🎯',
                description: 'Choose this as attack target'
            });
        }

        return actions;
    }

    /**
     * Handle card action selection from modal
     */
    handleCardAction(actionId, cardId) {
        logger.info(`Handling card action: ${actionId} for card: ${cardId}`);
        
        // Hide any existing floating menus
        this.hideFloatingActionMenu();
        
        const card = this.cardDatabase.getCard(cardId);
        if (!card) {
            logger.error('Card not found for action:', cardId);
            return;
        }
        
        // Handle different actions
        switch (actionId) {
            case 'view':
                this.showCardDetails(card);
                break;
                
            case 'playForward':
                this.playCardAsForward(card);
                break;
                
            case 'playBackup':
                this.playCardAsBackup(card);
                break;
                
            case 'playSummon':
                this.castSummon(card);
                break;
                
            case 'activate':
                this.activateCardAbility(card);
                break;
                
            case 'attack':
                this.initializeAttack(card);
                break;
                
            case 'attackTarget':
                this.setAttackTarget(card);
                break;
                
            case 'tap':
                this.tapCard(card);
                break;
                
            case 'tapForCP':
                this.tapForCrystalPoints(card);
                break;
                
            default:
                logger.warn('Unknown card action:', actionId);
                window.showNotification(`Action "${actionId}" not implemented yet`, 'warning');
        }
    }
    
    /**
     * Show card details in preview panel (no longer uses modal)
     */
    showCardDetails(card) {
        // Just update the preview panel - no modal needed
        this.showCardPreview(card);
    }
    
    /**
     * Play a card as a Forward
     */
    playCardAsForward(card) {
        logger.info(`Playing ${card.name} as Forward`);
        // TODO: Implement proper CP checking and card playing through game engine
        window.showNotification(`Played ${card.name} as Forward`, 'success');
    }
    
    /**
     * Play a card as a Backup
     */
    playCardAsBackup(card) {
        logger.info(`Playing ${card.name} as Backup`);
        // TODO: Implement proper CP checking and card playing through game engine
        window.showNotification(`Played ${card.name} as Backup`, 'success');
    }
    
    /**
     * Cast a Summon card
     */
    castSummon(card) {
        logger.info(`Casting ${card.name} summon`);
        // TODO: Implement summon casting logic
        window.showNotification(`Cast ${card.name}`, 'success');
    }
    
    /**
     * Activate a card's ability
     */
    activateCardAbility(card) {
        logger.info(`Activating ${card.name} ability`);
        // TODO: Implement ability activation
        window.showNotification(`Activated ${card.name}`, 'info');
    }
    
    /**
     * Initialize attack with a Forward
     */
    initializeAttack(card) {
        logger.info(`${card.name} is attacking`);
        // TODO: Implement attack initialization
        window.showNotification(`${card.name} is ready to attack`, 'info');
    }
    
    /**
     * Set attack target
     */
    setAttackTarget(card) {
        logger.info(`Setting ${card.name} as attack target`);
        // TODO: Implement attack targeting
        window.showNotification(`Targeting ${card.name}`, 'info');
    }
    
    /**
     * Tap a card
     */
    tapCard(card) {
        logger.info(`Tapping ${card.name}`);
        
        // Find the card element and add tapped class
        const cardElements = document.querySelectorAll(`[data-card-id="${card.id}"]`);
        cardElements.forEach(element => {
            if (element.classList.contains('selected')) {
                element.classList.add('tapped');
                element.classList.remove('selected');
            }
        });
        
        window.showNotification(`Tapped ${card.name}`, 'info');
    }
    
    /**
     * Tap a backup for Crystal Points
     */
    tapForCrystalPoints(card) {
        logger.info(`${card.name} tapped for CP`);
        
        // Find the card element and add tapped class
        const cardElements = document.querySelectorAll(`[data-card-id="${card.id}"]`);
        cardElements.forEach(element => {
            if (element.classList.contains('selected')) {
                element.classList.add('tapped');
                element.classList.remove('selected');
            }
        });
        
        // TODO: Actually increase CP in game state
        window.showNotification(`${card.name} generated CP`, 'success');
    }

    /**
     * Update card interaction states based on current game phase
     */
    updateCardStates() {
        const isPlayerTurn = this.currentPlayer === 'player1';
        const isMainPhase = this.currentPhase === 'main';
        const isAttackPhase = this.currentPhase === 'attack';
        
        // Update hand cards
        if (isPlayerTurn && isMainPhase) {
            this.updateHandCardStates();
        }
        
        // Update field cards
        if (isPlayerTurn && isAttackPhase) {
            this.updateFieldCardStates();
        }
    }
    
    /**
     * Update hand card states for playability
     */
    updateHandCardStates() {
        const handCards = document.querySelectorAll('#playerHandContent .game-card');
        handCards.forEach(cardElement => {
            const cardId = cardElement.dataset.cardId;
            const card = this.cardDatabase.getCard(cardId);
            
            if (card && this.canPlayCard(card)) {
                cardElement.classList.add('playable');
            } else {
                cardElement.classList.remove('playable');
            }
        });
    }
    
    /**
     * Update field card states for attack readiness
     */
    updateFieldCardStates() {
        const fieldCards = document.querySelectorAll('#gameField .game-card.player-controlled');
        fieldCards.forEach(cardElement => {
            if (!cardElement.classList.contains('tapped')) {
                cardElement.classList.add('attack-ready');
            } else {
                cardElement.classList.remove('attack-ready');
            }
        });
    }
    
    /**
     * Check if a card can be played (simplified logic)
     */
    canPlayCard(card) {
        // Simplified CP check - in a real game this would check actual CP availability
        const currentCP = 3; // Placeholder - should come from game state
        const cardCost = parseInt(card.cost) || 0;
        
        return cardCost <= currentCP;
    }
    
    /**
     * Clear all card state classes
     */
    clearCardStates() {
        const allCards = document.querySelectorAll('.game-card');
        allCards.forEach(card => {
            card.classList.remove('playable', 'attack-ready');
        });
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
        
        // Update card interaction states when turn/phase changes
        this.clearCardStates();
        this.updateCardStates();
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
        
        // Initialize card states
        this.updateCardStates();
        
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