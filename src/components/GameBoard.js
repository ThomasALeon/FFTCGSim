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
        
        // Performance optimization
        this.previewDebounceTimer = null;
        
        // CP tracking
        this.playerCP = {
            fire: 0,
            ice: 0,
            wind: 0,
            lightning: 0,
            water: 0,
            earth: 0,
            light: 0,
            dark: 0
        };
        
        // Deck elements for modular CP display
        this.deckElements = new Set();
        
        // Event log system
        this.eventLog = {
            container: null,
            content: null,
            entries: [],
            maxEntries: 100
        };
        
        // Damage zone management
        this.damageZones = {
            player: [],
            opponent: []
        };
        
        this.initialize();
    }

    /**
     * Initialize the game board
     */
    initialize() {
        this.setupUIElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupEventLog();
        
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
        
        // Zone references - Updated for simplified layout
        this.zones = {
            playerHand: document.getElementById('playerHandContent'),
            playerBackups: document.getElementById('playerBackupsContent'),
            playerBattlefield: document.getElementById('playerBattlefieldContent'),
            playerDamage: document.getElementById('playerDamageContent'),
            playerBreak: document.getElementById('playerBreakContent'),
            playerRemoved: document.getElementById('playerRemovedContent'),
            opponentBackups: document.getElementById('opponentBackupsContent'),
            opponentBattlefield: document.getElementById('opponentBattlefieldContent'),
            opponentDamage: document.getElementById('opponentDamageContent'),
            opponentBreak: document.getElementById('opponentBreakContent'),
            opponentRemoved: document.getElementById('opponentRemovedContent')
        };
        
        // Zone counters - Updated for simplified layout
        this.counters = {
            playerHandCount: document.getElementById('playerHandCount'),
            playerBackupsCount: document.getElementById('playerBackupsCount'),
            playerBattlefieldCount: document.getElementById('playerBattlefieldCount'),
            playerDamageCount: document.getElementById('playerDamageCount'),
            opponentHandCount: document.getElementById('opponentHandCount'),
            opponentBackupsCount: document.getElementById('opponentBackupsCount'),
            opponentBattlefieldCount: document.getElementById('opponentBattlefieldCount'),
            opponentDamageCount: document.getElementById('opponentDamageCount')
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

        // Context menu setup
        this.setupContextMenu();

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', () => {
            this.hideCardContextMenu();
        });
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

        // Add right-click context menu for player cards
        if (isPlayerCard && !isFaceDown) {
            cardDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showCardContextMenu(e, card);
            });
        }

        // Add hover handler for card preview (only if not face down)
        if (!isFaceDown) {
            cardDiv.addEventListener('mouseenter', () => {
                this.showCardPreviewDebounced(card);
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
     * Debounced card preview to improve performance
     */
    showCardPreviewDebounced(card) {
        if (this.previewDebounceTimer) {
            clearTimeout(this.previewDebounceTimer);
        }
        this.previewDebounceTimer = setTimeout(() => {
            this.showCardPreview(card);
        }, 50);
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
                        
                        // Add discard for CP option for non-Light/Dark cards
                        if (card.element !== 'light' && card.element !== 'dark') {
                            actions.push({ 
                                id: 'discardForCP', 
                                label: 'Discard for CP', 
                                icon: '🔥',
                                description: `Generate 2 ${card.element} CP`
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
                
            case 'discardForCP':
                this.discardCardForCP(card);
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
        
        // Check and fix phase if needed
        this.ensurePlayablePhase();
        
        try {
            // Use GameEngine to play the card
            this.gameEngine.playCard(0, card.id, { playType: 'forward' });
            window.showNotification(`Played ${card.name} as Forward`, 'success');
            
            // Log the card play event
            this.logCardPlay(card.name, 'Forward', 'You', 'Field');
            
            // Update the display with new game state
            this.setGameState(this.gameEngine.gameState);
        } catch (error) {
            logger.error('Error playing card as forward:', error);
            window.showNotification(`Cannot play ${card.name}: ${error.message}`, 'error');
            this.logError(`Failed to play ${card.name} as Forward: ${error.message}`, { cardName: card.name, playType: 'forward' });
        }
    }
    
    /**
     * Play a card as a Backup
     */
    playCardAsBackup(card) {
        logger.info(`Playing ${card.name} as Backup`);
        
        // Check and fix phase if needed
        this.ensurePlayablePhase();
        
        try {
            // Use GameEngine to play the card
            this.gameEngine.playCard(0, card.id, { playType: 'backup' });
            window.showNotification(`Played ${card.name} as Backup`, 'success');
            
            // Log the card play event
            this.logCardPlay(card.name, 'Backup', 'You', 'Backup Zone');
            
            // Update the display with new game state
            this.setGameState(this.gameEngine.gameState);
        } catch (error) {
            logger.error('Error playing card as backup:', error);
            window.showNotification(`Cannot play ${card.name}: ${error.message}`, 'error');
            this.logError(`Failed to play ${card.name} as Backup: ${error.message}`, { cardName: card.name, playType: 'backup' });
        }
    }
    
    /**
     * Cast a Summon card
     */
    castSummon(card) {
        logger.info(`Casting ${card.name} summon`);
        
        // Check and fix phase if needed
        this.ensurePlayablePhase();
        
        try {
            // Use GameEngine to cast the summon
            this.gameEngine.playCard(0, card.id, { playType: 'summon' });
            window.showNotification(`Cast ${card.name}`, 'success');
            
            // Update the display with new game state
            this.setGameState(this.gameEngine.gameState);
        } catch (error) {
            logger.error('Error casting summon:', error);
            window.showNotification(`Cannot cast ${card.name}: ${error.message}`, 'error');
        }
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
        if (!this.gameState || !card) return false;
        
        const player = this.gameState.players[0]; // Player 1
        if (!player) return false;
        
        const cardCost = parseInt(card.cost) || 0;
        const cardElement = card.element;
        
        // Check if we have enough CP of the card's element
        if (player.cpPool && player.cpPool[cardElement] !== undefined) {
            return player.cpPool[cardElement] >= cardCost;
        }
        
        // Fallback to local tracking if GameEngine CP not available
        if (this.playerCP && this.playerCP[cardElement] !== undefined) {
            return this.playerCP[cardElement] >= cardCost;
        }
        
        return false;
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

        // Update zones with cards (using correct GameEngine structure)
        const player1 = this.gameState.players[0];
        const player2 = this.gameState.players[1];
        
        // Debug logging to see what's in the zones
        console.log('Player 1 zones:', player1.zones);
        console.log('Player 2 zones:', player2.zones);
        
        this.renderPlayerHand(player1.zones.hand || []);
        this.renderPlayerBackups(player1.zones.field ? player1.zones.field.filter(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            return card && card.type === 'backup';
        }) : []);
        this.renderPlayerDamage(player1.zones.damage || []);
        
        // Opponent hand - show face down cards based on count
        const opponentHandCount = player2.zones.hand ? player2.zones.hand.length : 0;
        this.renderOpponentHand(new Array(opponentHandCount).fill('face-down'));
        
        this.renderOpponentBackups(player2.zones.field ? player2.zones.field.filter(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            return card && card.type === 'backup';
        }) : []);
        this.renderOpponentDamage(player2.zones.damage || []);
        
        // Battlefield areas - forwards for each player separately
        const player1Forwards = player1.zones.field ? player1.zones.field.filter(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            return card && card.type === 'forward';
        }) : [];
        const player2Forwards = player2.zones.field ? player2.zones.field.filter(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            return card && card.type === 'forward';
        }) : [];
        
        this.renderPlayerBattlefield(player1Forwards);
        this.renderOpponentBattlefield(player2Forwards);
        
        // Update hidden zone content for modals
        this.updateHiddenZoneContent('playerDamageContent', player1.zones.damage || []);
        this.updateHiddenZoneContent('playerBreakContent', player1.zones.break || []);
        this.updateHiddenZoneContent('opponentDamageContent', player2.zones.damage || []);
        this.updateHiddenZoneContent('opponentBreakContent', player2.zones.break || []);
        
        // Update counters and CP
        this.updateCounters();
        this.updateTurnDisplay();
    }

    /**
     * Update hidden zone content for modals
     */
    updateHiddenZoneContent(containerId, cardIds) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        cardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, true, false);
                container.appendChild(cardElement);
            }
        });
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
     * Render player battlefield with forwards
     */
    renderPlayerBattlefield(forwardCards) {
        const battlefieldZone = this.zones.playerBattlefield;
        if (!battlefieldZone) return;

        battlefieldZone.innerHTML = '';
        
        if (forwardCards.length === 0) {
            battlefieldZone.innerHTML = '<div class="zone-empty">No forwards</div>';
            return;
        }

        forwardCards.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, true, false);
                battlefieldZone.appendChild(cardElement);
            }
        });
    }

    /**
     * Render opponent battlefield with forwards
     */
    renderOpponentBattlefield(forwardCards) {
        const battlefieldZone = this.zones.opponentBattlefield;
        if (!battlefieldZone) return;

        battlefieldZone.innerHTML = '';
        
        if (forwardCards.length === 0) {
            battlefieldZone.innerHTML = '<div class="zone-empty">No forwards</div>';
            return;
        }

        forwardCards.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                const cardElement = this.createGameCard(card, false, false);
                battlefieldZone.appendChild(cardElement);
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
        this.updateCounter('playerBattlefieldCount', this.zones.playerBattlefield);
        
        // Update opponent counters
        this.updateCounter('opponentHandCount', this.zones.opponentHand);
        this.updateCounter('opponentBackupsCount', this.zones.opponentBackups);  
        this.updateCounter('opponentBattlefieldCount', this.zones.opponentBattlefield);
        
        // Damage zone counters are updated by renderDamageZone method
        // CP display is handled by the modular CP system
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
        // Use GameEngine state if available
        if (this.gameEngine && this.gameEngine.gameState) {
            const gameState = this.gameEngine.gameState;
            const isPlayerTurn = gameState.currentPlayer === 0;
            
            if (this.currentPlayerElement) {
                this.currentPlayerElement.textContent = isPlayerTurn ? 'Your Turn' : 'Opponent Turn';
            }
            
            if (this.phaseIndicator) {
                this.phaseIndicator.textContent = this.getPhaseDisplayName(gameState.currentPhase);
            }
            
            if (this.turnIndicator) {
                this.turnIndicator.classList.toggle('active', isPlayerTurn);
            }
        } else {
            // Fallback to local state
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
        
        // Update card interaction states when turn/phase changes
        this.clearCardStates();
        this.updateCardStates();
    }

    /**
     * Get display name for phase
     */
    getPhaseDisplayName(phase) {
        const phaseNames = {
            // GameEngine phases
            active: 'Active Phase',
            draw: 'Draw Phase', 
            main1: 'Main Phase 1',
            attack: 'Attack Phase',
            main2: 'Main Phase 2',
            end: 'End Phase',
            // Legacy phases
            main: 'Main Phase',
            block: 'Block Phase',
            damage: 'Damage Phase'
        };
        return phaseNames[phase] || phase.charAt(0).toUpperCase() + phase.slice(1);
    }

    /**
     * End current phase
     */
    endPhase() {
        logger.info('Ending phase');
        
        if (!this.gameEngine || !this.gameEngine.gameState) {
            window.showNotification('No active game', 'warning');
            return;
        }
        
        const currentPhase = this.gameEngine.gameState.currentPhase;
        
        try {
            // Advance phase based on current phase
            switch (currentPhase) {
                case 'active':
                    this.gameEngine.beginPhase('draw');
                    break;
                case 'draw':
                    this.gameEngine.beginPhase('main1');
                    break;
                case 'main1':
                    this.gameEngine.beginPhase('attack');
                    break;
                case 'attack':
                    this.gameEngine.beginPhase('main2');
                    break;
                case 'main2':
                    this.gameEngine.beginPhase('end');
                    break;
                case 'end':
                    this.endTurn();
                    return;
                default:
                    this.gameEngine.beginPhase('main1');
            }
            
            window.showNotification('Phase advanced', 'info');
            this.setGameState(this.gameEngine.gameState);
            
        } catch (error) {
            logger.error('Error advancing phase:', error);
            window.showNotification('Cannot advance phase', 'error');
        }
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
        this.analyzeDeckElements();
        this.updateModularCPDisplay();
        this.updateGameDisplay();
        this.syncCPFromGameEngine();
    }

    /**
     * Start a new game
     */
    startGame() {
        logger.info('Starting new game');
        
        // Log game start
        this.addEventLogEntry('game-start', 'New practice game started');
        
        // Reset game state
        this.currentPlayer = 'player1';
        this.currentPhase = 'main';
        this.selectedCard = null;
        
        // Reset CP
        Object.keys(this.playerCP).forEach(element => {
            this.playerCP[element] = 0;
        });
        
        // Initialize damage zones (life points)
        this.initializeDamageZone('player');
        this.initializeDamageZone('opponent');
        
        // Reset break zones
        this.breakZones = { player: [], opponent: [] };
        
        // Render initial board
        this.renderEmptyBoard();
        this.updateTurnDisplay();
        
        // For test mode, analyze elements from sample cards
        this.analyzeDeckElements();
        this.updateModularCPDisplay();
        
        // Initialize card states
        this.updateCardStates();
        
        // Initialize GameEngine if available
        if (this.gameEngine && this.gameEngine.gameState) {
            try {
                // Wait a bit for game state to be properly initialized
                setTimeout(() => {
                    this.gameEngine.initializeDamageZone(0); // Player
                    this.gameEngine.initializeDamageZone(1); // Opponent
                    this.syncFromGameEngine();
                }, 100);
            } catch (error) {
                logger.warn('GameEngine integration failed:', error.message);
                // Fall back to GameBoard's own initialization
                this.initializeDamageZone('player');
                this.initializeDamageZone('opponent');
            }
        } else {
            // Use GameBoard's own damage zone initialization
            this.initializeDamageZone('player');
            this.initializeDamageZone('opponent');
        }
        
        window.showNotification('New game started! Both players start with 7 life points.', 'success');
    }

    /**
     * Set up context menu event handlers
     */
    setupContextMenu() {
        // Get context menu elements
        this.contextMenu = document.getElementById('cardContextMenu');
        this.playCardOption = document.getElementById('playCardOption');
        this.discardForCPOption = document.getElementById('discardForCPOption');
        this.tapBackupOption = document.getElementById('tapBackupOption');
        this.viewCardOption = document.getElementById('viewCardOption');
        
        // Bind event handlers
        if (this.playCardOption) {
            this.playCardOption.addEventListener('click', () => {
                if (this.selectedContextCard) {
                    this.playCardFromContext(this.selectedContextCard);
                }
                this.hideCardContextMenu();
            });
        }
        
        if (this.discardForCPOption) {
            this.discardForCPOption.addEventListener('click', () => {
                if (this.selectedContextCard) {
                    this.discardCardForCP(this.selectedContextCard);
                }
                this.hideCardContextMenu();
            });
        }
        
        if (this.tapBackupOption) {
            this.tapBackupOption.addEventListener('click', () => {
                if (this.selectedContextCard) {
                    this.tapBackupForCP(this.selectedContextCard);
                }
                this.hideCardContextMenu();
            });
        }
        
        if (this.viewCardOption) {
            this.viewCardOption.addEventListener('click', () => {
                if (this.selectedContextCard) {
                    this.showCardPreview(this.selectedContextCard);
                }
                this.hideCardContextMenu();
            });
        }
    }

    /**
     * Show context menu for a card
     */
    showCardContextMenu(event, card) {
        if (!this.contextMenu) return;
        
        this.selectedContextCard = card;
        
        // Update menu options based on card and context
        this.updateContextMenuOptions(card);
        
        // Position menu at click location
        const rect = this.gameBoard.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.classList.add('show');
        
        logger.debug(`Showing context menu for ${card.name}`);
    }

    /**
     * Hide context menu
     */
    hideCardContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.remove('show');
            this.selectedContextCard = null;
        }
    }

    /**
     * Update context menu options based on card type and game state
     */
    updateContextMenuOptions(card) {
        if (!card) return;
        
        // Show/hide play option based on card type and current phase
        const canPlay = this.canPlayCard(card) && this.currentPhase === 'main';
        this.playCardOption.style.display = canPlay ? 'flex' : 'none';
        
        // Show discard for CP option for non-Light/Dark cards in hand
        const canDiscardForCP = card.element !== 'light' && card.element !== 'dark';
        this.discardForCPOption.style.display = canDiscardForCP ? 'flex' : 'none';
        
        // Show tap for CP option only for backup cards on field
        const isBackupOnField = card.type === 'backup'; // Would need to check if it's actually on field
        this.tapBackupOption.style.display = isBackupOnField ? 'flex' : 'none';
        
        // Always show view option
        this.viewCardOption.style.display = 'flex';
        
        // Update text to show CP generation amounts
        if (this.discardForCPOption) {
            this.discardForCPOption.querySelector('.context-text').textContent = `Discard for 2 ${card.element} CP`;
        }
        
        if (this.tapBackupOption && card.type === 'backup') {
            this.tapBackupOption.querySelector('.context-text').textContent = `Tap for 1 ${card.element} CP`;
        }
    }

    /**
     * Ensure the game is in a phase where cards can be played
     */
    ensurePlayablePhase() {
        if (!this.gameEngine || !this.gameEngine.gameState) return;
        
        const gameState = this.gameEngine.gameState;
        console.log('Current phase:', gameState.currentPhase);
        console.log('Can player act:', this.gameEngine.canPlayerAct(0));
        
        // If stuck in ACTIVE phase, manually advance to MAIN_1
        if (gameState.currentPhase === 'active' && gameState.isActive) {
            console.log('Advancing from ACTIVE to MAIN_1 phase');
            this.logPhaseChange('active', 'main1', 'You');
            this.gameEngine.beginPhase('main1');
            window.showNotification('Advanced to Main Phase', 'info');
        }
        
        // If in DRAW phase, advance to MAIN_1
        else if (gameState.currentPhase === 'draw' && gameState.isActive) {
            console.log('Advancing from DRAW to MAIN_1 phase');
            this.logPhaseChange('draw', 'main1', 'You');
            this.gameEngine.beginPhase('main1');
            window.showNotification('Advanced to Main Phase', 'info');
        }
        
        // Ensure player has priority
        if (gameState.priorityPlayer !== 0) {
            console.log('Giving priority to player 1');
            this.gameEngine.givePriority(0);
        }
    }

    /**
     * Play card from context menu
     */
    playCardFromContext(card) {
        logger.info(`Playing ${card.name} from context menu`);
        
        // Check and fix phase if needed
        this.ensurePlayablePhase();
        
        try {
            // Determine play type based on card type
            let playType = 'field';
            if (card.type === 'forward' || card.type === 'backup') {
                playType = card.type;
            } else if (card.type === 'summon') {
                playType = 'summon';
            }
            
            // Use GameEngine to play the card
            this.gameEngine.playCard(0, card.id, { playType });
            window.showNotification(`Played ${card.name}`, 'success');
            
            // Update the display with new game state
            this.setGameState(this.gameEngine.gameState);
            
        } catch (error) {
            logger.error('Error playing card:', error);
            window.showNotification(`Cannot play ${card.name}: ${error.message}`, 'error');
        }
    }

    /**
     * Discard card for CP
     */
    discardCardForCP(card) {
        logger.info(`Discarding ${card.name} for CP`);
        
        try {
            // Check if card can be discarded for CP
            if (card.element === 'light' || card.element === 'dark') {
                window.showNotification('Cannot discard Light/Dark cards for CP', 'warning');
                return;
            }
            
            // Integrate with GameEngine
            this.gameEngine.generateCPFromDiscard(0, card.id);
            
            // Update local CP tracking
            this.addCP(card.element, 2);
            
            // Log the discard event
            this.logCardDiscardForCP(card.name, card.element, 2, 'You');
            
            window.showNotification(`Discarded ${card.name} for 2 ${card.element} CP`, 'success');
            
            // Update display with new game state
            this.setGameState(this.gameEngine.gameState);
            
        } catch (error) {
            logger.error('Error discarding card for CP:', error);
            window.showNotification('Cannot discard card', 'error');
        }
    }

    /**
     * Tap backup for CP
     */
    tapBackupForCP(card) {
        logger.info(`Tapping ${card.name} for CP`);
        
        try {
            if (card.type !== 'backup') {
                window.showNotification('Only backup cards can be tapped for CP', 'warning');
                return;
            }
            
            // Integrate with GameEngine
            this.gameEngine.generateCPFromBackup(0, card.id);
            
            // Update local CP tracking
            this.addCP(card.element, 1);
            
            window.showNotification(`Tapped ${card.name} for 1 ${card.element} CP`, 'success');
            
            // Visually tap the card
            this.tapCard(card);
            
        } catch (error) {
            logger.error('Error tapping card for CP:', error);
            window.showNotification('Cannot tap card', 'error');
        }
    }

    /**
     * Move card to break zone (visual representation)
     */
    moveCardToBreakZone(card) {
        // Remove from current zone (hand)
        const handCards = document.querySelectorAll('#playerHandContent .game-card');
        handCards.forEach(cardElement => {
            if (cardElement.dataset.cardId === card.id) {
                cardElement.remove();
            }
        });
        
        // Add to break zone
        const breakZone = this.zones.playerBreak;
        if (breakZone) {
            // Clear empty message if present
            const emptyMsg = breakZone.querySelector('.zone-empty');
            if (emptyMsg) {
                emptyMsg.remove();
            }
            
            // Create new card element for break zone
            const cardElement = this.createGameCard(card, true, false);
            cardElement.classList.add('in-break-zone');
            breakZone.appendChild(cardElement);
        }
        
        // Update counters
        this.updateCounters();
    }

    /**
     * Add CP to the player's pool and update display
     */
    addCP(element, amount) {
        this.playerCP[element] += amount;
        this.updateCPDisplay();
        logger.info(`Added ${amount} ${element} CP. Total: ${this.playerCP[element]}`);
    }

    /**
     * Update the visual CP display
     */
    updateCPDisplay() {
        // Use modular display that only shows deck elements
        this.deckElements.forEach(element => {
            const amount = this.playerCP[element] || 0;
            const cpElement = document.getElementById(`cp${element.charAt(0).toUpperCase() + element.slice(1)}`);
            if (cpElement) {
                cpElement.textContent = amount;
                
                // Add visual feedback for CP changes
                cpElement.classList.add('cp-updated');
                setTimeout(() => {
                    cpElement.classList.remove('cp-updated');
                }, 1000);
            }
        });
        
        // Update total CP
        const totalCP = Array.from(this.deckElements).reduce((sum, element) => {
            return sum + (this.playerCP[element] || 0);
        }, 0);
        
        const totalElement = document.getElementById('cpTotalValue');
        if (totalElement) {
            totalElement.textContent = totalCP;
        }
    }

    /**
     * Sync CP display with GameEngine state
     */
    syncCPFromGameEngine() {
        if (this.gameState && this.gameState.players && this.gameState.players[0]) {
            const gameCP = this.gameState.players[0].cpPool;
            Object.entries(gameCP).forEach(([element, amount]) => {
                this.playerCP[element] = amount;
            });
            this.updateCPDisplay();
        }
    }

    /**
     * Analyze deck to determine which elements are present
     */
    analyzeDeckElements() {
        this.deckElements.clear();
        
        if (this.gameState && this.gameState.players && this.gameState.players[0]) {
            const player = this.gameState.players[0];
            
            // Check all zones for cards
            const allPlayerCards = [
                ...(player.zones.hand || []),
                ...(player.zones.field || []),
                ...(player.zones.deck || []),
                ...(player.zones.damage || []),
                ...(player.zones.break || [])
            ];
            
            // Analyze each card's element
            allPlayerCards.forEach(cardId => {
                const card = this.cardDatabase.getCard(cardId);
                if (card && card.element) {
                    this.deckElements.add(card.element);
                }
            });
        } else {
            // Fallback: check visible cards on board (test mode)
            const handCards = document.querySelectorAll('#playerHandContent .game-card');
            handCards.forEach(cardElement => {
                const cardId = cardElement.dataset.cardId;
                const card = this.cardDatabase.getCard(cardId);
                if (card && card.element) {
                    this.deckElements.add(card.element);
                }
            });
        }
        
        // Always include at least fire if no elements found (fallback)
        if (this.deckElements.size === 0) {
            this.deckElements.add('fire');
            this.deckElements.add('ice');
            this.deckElements.add('wind');
        }
        
        console.log('Deck elements detected:', Array.from(this.deckElements));
    }

    /**
     * Update CP display to show only deck elements
     */
    updateModularCPDisplay() {
        const cpDisplayArea = document.getElementById('cpDisplayArea');
        const cpElementsGrid = document.getElementById('cpElementsGrid');
        
        if (!cpElementsGrid) return;
        
        // Clear existing elements
        cpElementsGrid.innerHTML = '';
        
        // Element configurations
        const elementConfig = {
            fire: { icon: '🔥', color: '#ff4444' },
            ice: { icon: '❄️', color: '#44aaff' },
            wind: { icon: '🌪️', color: '#44ff44' },
            lightning: { icon: '⚡', color: '#ffff44' },
            water: { icon: '💧', color: '#4444ff' },
            earth: { icon: '🌍', color: '#aa8844' },
            light: { icon: '✨', color: '#ffddaa' },
            dark: { icon: '🌑', color: '#aa44aa' }
        };
        
        // Create elements only for deck elements
        this.deckElements.forEach(element => {
            const config = elementConfig[element];
            if (!config) return;
            
            const cpElement = document.createElement('div');
            cpElement.className = 'cp-element';
            cpElement.setAttribute('data-element', element);
            cpElement.style.borderColor = config.color;
            
            cpElement.innerHTML = `
                <div class="cp-element-icon">${config.icon}</div>
                <div class="cp-element-value" id="cp${element.charAt(0).toUpperCase() + element.slice(1)}">${this.playerCP[element] || 0}</div>
            `;
            
            cpElementsGrid.appendChild(cpElement);
        });
        
        // Update total CP
        const totalCP = Array.from(this.deckElements).reduce((sum, element) => {
            return sum + (this.playerCP[element] || 0);
        }, 0);
        
        const totalElement = document.getElementById('cpTotalValue');
        if (totalElement) {
            totalElement.textContent = totalCP;
        }
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
    
    /**
     * Set up event log system
     */
    setupEventLog() {
        this.eventLog.container = document.getElementById('eventLogArea');
        this.eventLog.content = document.getElementById('eventLogContent');
        
        // Set up clear button
        const clearButton = document.getElementById('clearEventLog');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearEventLog());
        }
        
        logger.info('📝 Event log system initialized');
    }
    
    /**
     * Add an event to the log
     */
    addEventLogEntry(type, message, data = {}) {
        if (!this.eventLog.content) return;
        
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const entry = {
            id: Date.now() + Math.random(),
            type,
            message,
            time,
            timestamp: now,
            data
        };
        
        // Add to entries array
        this.eventLog.entries.push(entry);
        
        // Keep only max entries
        if (this.eventLog.entries.length > this.eventLog.maxEntries) {
            this.eventLog.entries.shift();
        }
        
        // Remove empty message if present
        const emptyMessage = this.eventLog.content.querySelector('.event-log-empty');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Create DOM element
        const entryElement = this.createEventLogElement(entry);
        this.eventLog.content.appendChild(entryElement);
        
        // Scroll to bottom
        this.eventLog.content.scrollTop = this.eventLog.content.scrollHeight;
        
        // Mark as recent temporarily
        entryElement.classList.add('recent');
        setTimeout(() => {
            entryElement.classList.remove('recent');
        }, 3000);
        
        logger.debug(`Event logged: ${type} - ${message}`);
    }
    
    /**
     * Create DOM element for event log entry
     */
    createEventLogElement(entry) {
        const element = document.createElement('div');
        element.className = `event-log-entry ${entry.type}`;
        element.setAttribute('data-entry-id', entry.id);
        
        const icon = this.getEventIcon(entry.type);
        
        element.innerHTML = `
            <span class="event-log-time">${entry.time}</span>
            <span class="event-log-icon">${icon}</span>
            <span class="event-log-message">${this.formatEventMessage(entry)}</span>
        `;
        
        return element;
    }
    
    /**
     * Get icon for event type
     */
    getEventIcon(type) {
        const icons = {
            'phase-change': '⏰',
            'turn-change': '🔄',
            'card-play': '🃏',
            'card-discard': '🗑️',
            'cp-gain': '💎',
            'cp-spend': '💸',
            'game-start': '🚀',
            'game-end': '🏁',
            'error': '❌',
            'info': 'ℹ️'
        };
        return icons[type] || '📝';
    }
    
    /**
     * Format event message with styled elements
     */
    formatEventMessage(entry) {
        let message = entry.message;
        
        // Style player names
        message = message.replace(/\b(Player|You|Opponent|AI)\b/g, '<span class="event-log-player">$1</span>');
        
        // Style card names (assuming they're in quotes or specific format)
        if (entry.data.cardName) {
            message = message.replace(entry.data.cardName, `<span class="event-log-card">${entry.data.cardName}</span>`);
        }
        
        // Style elements
        const elements = ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'];
        elements.forEach(element => {
            const regex = new RegExp(`\\b${element}\\b`, 'gi');
            message = message.replace(regex, `<span class="event-log-element ${element}">${element}</span>`);
        });
        
        return message;
    }
    
    /**
     * Clear event log
     */
    clearEventLog() {
        if (!this.eventLog.content) return;
        
        this.eventLog.entries = [];
        this.eventLog.content.innerHTML = '<div class="event-log-empty">Game events will appear here...</div>';
        
        this.addEventLogEntry('info', 'Event log cleared');
        logger.info('📝 Event log cleared');
    }
    
    /**
     * Initialize damage zone with 7 cards from deck (life points)
     */
    initializeDamageZone(player = 'player') {
        const deckCards = this.getDeckCards(player);
        const damageCards = deckCards.slice(0, 7); // Take first 7 cards as life points
        
        this.damageZones[player] = damageCards;
        this.renderDamageZone(player);
        
        logger.info(`Initialized ${player} damage zone with 7 life points`);
    }
    
    /**
     * Get deck cards for a player (placeholder implementation)
     */
    getDeckCards(player) {
        // This would normally come from the game engine
        // For now, generate placeholder cards
        const placeholderCards = [];
        for (let i = 0; i < 50; i++) {
            placeholderCards.push({
                id: `${player}-deck-${i}`,
                name: `Deck Card ${i}`,
                element: 'unknown',
                isFaceDown: true
            });
        }
        return placeholderCards;
    }
    
    /**
     * Render damage zone (life points)
     */
    renderDamageZone(player) {
        const damageContainer = player === 'player' 
            ? document.getElementById('playerDamageContent')
            : document.getElementById('opponentDamageContent');
            
        if (!damageContainer) return;
        
        damageContainer.innerHTML = '';
        
        const damageCards = this.damageZones[player];
        damageCards.forEach((card, index) => {
            const damageCard = document.createElement('div');
            damageCard.className = 'damage-card';
            damageCard.dataset.cardId = card.id;
            damageCard.dataset.damageIndex = index;
            damageCard.title = `Life point ${index + 1}`;
            
            // Add click handler for damage interaction
            damageCard.addEventListener('click', () => {
                this.handleDamageCardClick(player, index, card);
            });
            
            damageContainer.appendChild(damageCard);
        });
        
        // Update counter
        const counter = this.counters[`${player}DamageCount`];
        if (counter) {
            counter.textContent = damageCards.length;
        }
    }
    
    /**
     * Handle damage card click (for taking damage or viewing)
     */
    handleDamageCardClick(player, index, card) {
        if (player === 'player') {
            // Player can interact with their own damage zone
            const actions = [
                { text: 'View Card', action: () => this.viewDamageCard(player, index) },
                { text: 'Take as Damage', action: () => this.takeDamage(player, index) }
            ];
            
            // Show context menu or modal for actions
            this.showDamageCardActions(actions, card);
        } else {
            // Just view opponent's damage cards
            this.viewDamageCard(player, index);
        }
    }
    
    /**
     * View a damage card (reveal it)
     */
    viewDamageCard(player, index) {
        const card = this.damageZones[player][index];
        if (card) {
            // For now, just show in preview
            if (this.cardDatabase && !card.isFaceDown) {
                const realCard = this.cardDatabase.getCard(card.id);
                if (realCard) {
                    this.showCardPreview(realCard);
                }
            } else {
                // Show face-down card info
                this.showCardPreview({
                    name: 'Face-down Card',
                    element: 'unknown',
                    type: 'damage',
                    text: 'This card is face-down in the damage zone.'
                });
            }
        }
    }
    
    /**
     * Take damage (move card from damage zone to break zone)
     */
    takeDamage(player, index) {
        const damageCard = this.damageZones[player][index];
        if (!damageCard) return;
        
        // Remove from damage zone
        this.damageZones[player].splice(index, 1);
        
        // Add to break zone (graveyard)
        if (!this.breakZones) {
            this.breakZones = { player: [], opponent: [] };
        }
        this.breakZones[player].push(damageCard);
        
        // Re-render damage zone
        this.renderDamageZone(player);
        
        // Log the damage taken
        this.addEventLogEntry('card-discard', `${player === 'player' ? 'You' : 'Opponent'} took 1 damage`, {
            cardName: damageCard.name || 'Face-down card',
            player: player === 'player' ? 'You' : 'Opponent'
        });
        
        // Check for game over (no more life points)
        if (this.damageZones[player].length === 0) {
            this.handlePlayerDefeat(player);
        }
        
        logger.info(`${player} took damage: ${this.damageZones[player].length} life points remaining`);
    }
    
    /**
     * Handle player defeat (no more life points)
     */
    handlePlayerDefeat(player) {
        const winner = player === 'player' ? 'Opponent' : 'You';
        this.addEventLogEntry('game-end', `Game Over! ${winner} wins!`, {
            winner,
            reason: 'No life points remaining'
        });
        
        window.showNotification(`Game Over! ${winner} wins!`, 'error');
        logger.info(`Game ended: ${winner} wins by damage`);
    }

    /**
     * Synchronize GameBoard state from GameEngine
     */
    syncFromGameEngine() {
        if (!this.gameEngine || !this.gameEngine.gameState) return;
        
        const gameState = this.gameEngine.gameState;
        
        // Sync damage zones from GameEngine
        for (let i = 0; i < gameState.players.length; i++) {
            const player = gameState.players[i];
            const playerKey = i === 0 ? 'player' : 'opponent';
            
            // Update damage zone
            this.damageZones[playerKey] = player.zones.damage.map(cardId => ({
                id: cardId,
                name: `Life Point`,
                isFaceDown: true
            }));
            
            this.renderDamageZone(playerKey);
        }
        
        logger.info('Synchronized GameBoard state from GameEngine');
    }

    /**
     * Synchronize GameEngine state from GameBoard actions
     */
    syncToGameEngine() {
        if (!this.gameEngine || !this.gameEngine.gameState) return;
        
        // This method would update GameEngine state based on GameBoard changes
        // For now, we'll use GameEngine as the source of truth
        logger.info('Synchronized GameEngine state from GameBoard');
    }

    /**
     * Connect to GameEngine events
     */
    connectToGameEngine(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Listen to GameEngine events
        gameEngine.on('damageDealt', (event) => {
            const playerKey = event.player === 0 ? 'player' : 'opponent';
            this.addEventLogEntry('damage', 
                `${playerKey === 'player' ? 'You' : 'Opponent'} took ${event.amount} damage`, {
                remainingLife: event.remainingLife,
                source: event.source
            });
            
            // Re-sync damage zone display
            this.syncFromGameEngine();
        });
        
        gameEngine.on('summonResolved', (event) => {
            const playerKey = event.player === 0 ? 'player' : 'opponent';
            this.addEventLogEntry('summon', 
                `${playerKey === 'player' ? 'You' : 'Opponent'} cast ${event.summon.name}`, {
                cardName: event.summon.name
            });
        });
        
        gameEngine.on('gameEnded', (event) => {
            const winner = event.winner === 0 ? 'You' : 'Opponent';
            this.addEventLogEntry('game-end', `Game Over! ${winner} wins by ${event.reason}!`, {
                winner: winner,
                reason: event.reason,
                duration: event.duration
            });
            
            window.showNotification(`Game Over! ${winner} wins!`, 'error');
        });
        
        logger.info('Connected GameBoard to GameEngine');
    }
    
    /**
     * Show damage card action menu
     */
    showDamageCardActions(actions, card) {
        // For now, just execute the first available action
        // In a full implementation, this would show a context menu
        if (actions.length > 0) {
            actions[0].action();
        }
    }
    
    /**
     * Log game phase change
     */
    logPhaseChange(fromPhase, toPhase, player = 'You') {
        this.addEventLogEntry('phase-change', `${player} entered ${toPhase.replace('_', ' ')} phase`, {
            fromPhase,
            toPhase,
            player
        });
    }
    
    /**
     * Log turn change
     */
    logTurnChange(newTurn, player = 'Opponent') {
        this.addEventLogEntry('turn-change', `Turn ${newTurn}: ${player}'s turn begins`, {
            turn: newTurn,
            player
        });
    }
    
    /**
     * Log card play
     */
    logCardPlay(cardName, playType, player = 'You', zone = '') {
        const zoneText = zone ? ` to ${zone}` : '';
        this.addEventLogEntry('card-play', `${player} played ${cardName} as ${playType}${zoneText}`, {
            cardName,
            playType,
            player,
            zone
        });
    }
    
    /**
     * Log card discard for CP
     */
    logCardDiscardForCP(cardName, element, cpAmount, player = 'You') {
        this.addEventLogEntry('card-discard', `${player} discarded ${cardName} for ${cpAmount} ${element} CP`, {
            cardName,
            element,
            cpAmount,
            player
        });
    }
    
    /**
     * Log CP spending
     */
    logCPSpend(amount, element, reason, player = 'You') {
        this.addEventLogEntry('cp-spend', `${player} spent ${amount} ${element} CP for ${reason}`, {
            amount,
            element,
            reason,
            player
        });
    }
    
    /**
     * Log error events
     */
    logError(message, details = {}) {
        this.addEventLogEntry('error', message, details);
    }
}

// Export for use in other modules
export default GameBoard;