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
import { gameDebugger } from '../utils/GameDebugger.js';

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
        
        // CP tracking for both players
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
        
        this.opponentCP = {
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

        // Initialize damage zone displays
        this.initializeDamageZoneDisplays();
        
        // Deck elements for each player (from deck analysis)
        this.playerDeckElements = {
            player: {},
            opponent: {}
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
        
        // Clean up any leftover payment mode elements
        this.cleanupPaymentModeElements();
    }

    /**
     * Clean up any leftover payment mode elements from previous sessions
     */
    cleanupPaymentModeElements() {
        // Remove any payment mode modals that might still exist
        const paymentModal = document.getElementById('paymentModeModal');
        if (paymentModal) {
            paymentModal.remove();
            console.log('🧹 Removed leftover payment mode modal');
        }
        
        // Remove payment-related CSS classes from cards
        const paymentCards = document.querySelectorAll('.payment-available, .payment-selected');
        paymentCards.forEach(card => {
            card.classList.remove('payment-available', 'payment-selected');
        });
        
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        
        console.log('🧹 Cleaned up payment mode elements');
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
        // Dynamic action button (primary phase/turn control)
        const dynamicActionBtn = document.getElementById('dynamicActionBtn');
        if (dynamicActionBtn) {
            this.boundHandlers.dynamicAction = window.handleDynamicAction;
            // Note: onclick handler is set in HTML via handleDynamicAction()
        }
        
        // Legacy phase buttons (kept for backward compatibility if they exist)
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

        // GameEngine event listeners for real-time updates
        this.setupGameEngineEvents();
    }

    /**
     * Set up GameEngine event listeners for real-time updates
     */
    setupGameEngineEvents() {
        if (!this.gameEngine) {
            gameDebugger.log('warn', 'GameEngine not available for event setup');
            return;
        }

        // Listen to card draw events
        this.gameEngine.on('cardsDrawn', (eventData) => {
            gameDebugger.log('info', '🃏 Cards drawn event received', eventData);
            
            // Force refresh the display to show new cards
            this.setGameState(this.gameEngine.gameState);
            
            // Show notification for human player
            if (eventData.player === 0) {
                window.showNotification(`Drew ${eventData.count} card(s)`, 'success');
                this.logCardDraw(eventData.count, 'You');
            } else {
                this.logCardDraw(eventData.count, 'Opponent');
            }
        });

        // Listen to phase changes
        this.gameEngine.on('phaseChanged', (eventData) => {
            gameDebugger.log('info', '📅 Phase changed event received', eventData);
            
            // Check if entering mulligan phase
            if (eventData.newPhase === 'mulligan') {
                this.showMulliganModal();
                return; // Skip normal phase display update for mulligan
            }
            
            // Update phase display
            this.updatePhaseDisplay(eventData.newPhase, eventData.currentPlayer);
            
            // Force refresh display
            this.setGameState(this.gameEngine.gameState);
        });

        // Listen to turn changes
        this.gameEngine.on('turnEnded', (eventData) => {
            gameDebugger.log('info', '🔄 Turn ended event received', eventData);
            
            // Update turn display
            this.updateTurnDisplay(eventData.currentPlayer, eventData.turnNumber);
            
            // Log turn change
            const currentPlayerName = eventData.currentPlayer === 0 ? 'Your' : 'Opponent\'s';
            this.logTurnChange(`${currentPlayerName} turn - Turn ${eventData.turnNumber}`);
            
            // Force refresh display
            this.setGameState(this.gameEngine.gameState);
        });

        // Listen to CP events
        this.gameEngine.on('cpGenerated', (eventData) => {
            gameDebugger.log('info', '💎 CP generated event received', eventData);
            
            // Update CP displays
            this.syncCPFromGameEngine();
        });

        this.gameEngine.on('cpCleared', (eventData) => {
            gameDebugger.log('info', '💎 CP cleared event received', eventData);
            
            // Update CP displays
            this.syncCPFromGameEngine();
            
            // Show notification
            const playerName = eventData.player === 0 ? 'Your' : 'Opponent\'s';
            window.showNotification(`${playerName} CP cleared at end of turn`, 'info');
        });

        // Listen to deck element analysis events
        this.gameEngine.on('deckElementsAnalyzed', (eventData) => {
            gameDebugger.log('info', '💎 Deck elements analyzed event received', eventData);
            
            // Update stored deck elements for this player
            const playerKey = eventData.player === 0 ? 'player' : 'opponent';
            if (!this.playerDeckElements) {
                this.playerDeckElements = {};
            }
            this.playerDeckElements[playerKey] = eventData.elements;
            
            // Update CP display for this player
            const currentCP = this.gameState?.players?.[eventData.player]?.cpPool || {};
            this.updateCPDisplay(playerKey, currentCP);
            
            gameDebugger.log('info', `💎 Updated deck elements for ${playerKey}:`, eventData.elements);
        });

        gameDebugger.log('info', '🎧 GameEngine event listeners set up successfully');
    }

    /**
     * Update phase display UI
     */
    updatePhaseDisplay(phase, currentPlayer) {
        try {
            const phaseElement = document.getElementById('turnPhase');
            const currentPlayerElement = document.getElementById('currentPlayer');
            const dynamicActionBtn = document.getElementById('dynamicActionBtn');
            
            if (phaseElement) {
                const phaseNames = {
                    'mulligan': 'Mulligan Phase',
                    'active': 'Main Phase',
                    'draw': 'Draw Phase', 
                    'main1': 'Main Phase 1',
                    'attack': 'Attack Phase',
                    'main2': 'Main Phase 2',
                    'end': 'End Phase'
                };
                phaseElement.textContent = phaseNames[phase] || phase;
            }
            
            if (currentPlayerElement) {
                const playerName = currentPlayer === 0 ? 'Your Turn' : 'Opponent\'s Turn';
                currentPlayerElement.textContent = playerName;
            }

            // Update dynamic action button text and state
            if (dynamicActionBtn) {
                const isPlayerTurn = currentPlayer === 0;
                
                if (!isPlayerTurn) {
                    // Opponent's turn - disable button
                    dynamicActionBtn.textContent = 'Opponent\'s Turn';
                    dynamicActionBtn.disabled = true;
                    dynamicActionBtn.classList.add('disabled');
                } else {
                    // Player's turn - enable button with appropriate action
                    dynamicActionBtn.disabled = false;
                    dynamicActionBtn.classList.remove('disabled');
                    
                    const buttonLabels = {
                        'mulligan': 'Waiting for Mulligan...',
                        'active': 'End Turn',
                        'draw': 'Draw Cards',
                        'main1': 'Go to Attack', 
                        'attack': 'End Attack',
                        'main2': 'End Turn',
                        'end': 'End Turn'
                    };
                    
                    dynamicActionBtn.textContent = buttonLabels[phase] || 'Next Phase';
                    
                    // Special handling for mulligan phase
                    if (phase === 'mulligan') {
                        dynamicActionBtn.disabled = true;
                        dynamicActionBtn.classList.add('disabled');
                    }
                }
            }
            
            // Log the phase change
            const playerName = currentPlayer === 0 ? 'You' : 'Opponent';
            const phaseNames = {
                'mulligan': 'Mulligan Phase',
                'active': 'Main Phase',
                'draw': 'Draw Phase', 
                'main1': 'Main Phase 1',
                'attack': 'Attack Phase',
                'main2': 'Main Phase 2',
                'end': 'End Phase'
            };
            const phaseName = phaseNames[phase] || phase;
            this.logPhaseChange('', phaseName, playerName);
            
            gameDebugger.log('info', '📅 Phase display updated', { phase, currentPlayer, buttonText: dynamicActionBtn?.textContent });
            
        } catch (error) {
            gameDebugger.log('error', 'Failed to update phase display', error);
        }
    }

    /**
     * Update turn display UI
     */
    updateTurnDisplay(currentPlayer, turnNumber) {
        try {
            const turnIndicator = document.getElementById('turnIndicator');
            const currentPlayerElement = document.getElementById('currentPlayer');
            
            if (turnIndicator) {
                turnIndicator.textContent = `Turn ${turnNumber}`;
            }
            
            if (currentPlayerElement) {
                const playerName = currentPlayer === 0 ? 'Your Turn' : 'Opponent\'s Turn';
                currentPlayerElement.textContent = playerName;
            }
            
            gameDebugger.log('info', '🔄 Turn display updated', { currentPlayer, turnNumber });
            
        } catch (error) {
            gameDebugger.log('error', 'Failed to update turn display', error);
        }
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
        cardDiv.dataset.owner = isPlayerCard ? 'player' : 'opponent';
        
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
        try {
            logger.debug(`Card clicked: ${card?.name || 'Unknown card'}`);
            
            // Debug zone and player detection
            const zone = this.getCardZone(cardElement);
            const isPlayerCard = this.isPlayerCard(cardElement);
            logger.debug(`Card zone: ${zone}, isPlayerCard: ${isPlayerCard}`);
            logger.debug(`Current player: ${this.currentPlayer}, Current phase: ${this.currentPhase}`);
            
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
            
            // Add visual feedback
            cardElement.style.transform = 'scale(1.05)';
            setTimeout(() => {
                cardElement.style.transform = '';
            }, 200);
            
        } catch (error) {
            logger.error('Error handling card click:', error);
        }
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
                        <div class="card-text-content" style="font-size: 0.8rem; line-height: 1.5; color: var(--color-text-primary, #fff);">
                            ${this.sanitizeCardText(card.text)}
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
        
        logger.debug(`Available actions for ${card.name}:`, actions);
        
        // Filter out view action - we use the preview panel now
        const filteredActions = actions.filter(action => action.id !== 'view');
        
        logger.debug(`Filtered actions:`, filteredActions);
        
        if (filteredActions.length === 0) {
            logger.debug('No actions available for this card');
            return;
        }

        // Create floating menu
        const menu = document.createElement('div');
        menu.className = 'floating-action-menu';
        menu.id = 'floatingActionMenu';
        
        // Add action buttons
        filteredActions.forEach(action => {
            const button = document.createElement('button');
            button.className = `floating-action-btn ${this.getActionClass(action.id)}`;
            button.textContent = action.label;
            button.setAttribute('data-tooltip', action.description);
            button.onclick = () => {
                this.handleCardAction(action.id, card.id);
                this.hideFloatingActionMenu();
            };
            menu.appendChild(button);
        });

        // Position menu next to card
        const rect = cardElement.getBoundingClientRect();
        const gameBoard = document.getElementById('gameBoard') || document.querySelector('.game-board');
        const boardRect = gameBoard ? gameBoard.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth };
        
        // Position to the right of the card, or left if not enough space
        let left = rect.right + 8 - boardRect.left;
        if (left + 200 > boardRect.width) {
            left = rect.left - 200 - 8 - boardRect.left;
        }
        
        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${rect.top - boardRect.top}px`;

        // Add to game board or body as fallback
        const container = gameBoard || document.body;
        container.appendChild(menu);
        
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
     * Sanitize HTML tags from card text and convert to clean HTML
     */
    sanitizeCardText(text) {
        if (!text) return '';
        
        // Convert HTML tags to clean HTML format
        let cleanText = text
            .replace(/<br\s*\/?>/gi, '<br>') // Normalize <br> tags
            .replace(/<\/p>/gi, '<br><br>') // Convert </p> to double line breaks
            .replace(/<p[^>]*>/gi, '') // Remove <p> tags
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '<strong>$1</strong>') // Convert <b> to <strong>
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '<em>$1</em>') // Convert <i> to <em>
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '<strong>$1</strong>') // Normalize <strong>
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '<em>$1</em>') // Normalize <em>
            .replace(/<[^>]+>/g, '') // Remove any remaining unwanted HTML tags
            .replace(/&lt;/g, '<') // Decode HTML entities
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
            
        // Re-add allowed HTML tags for formatting
        cleanText = cleanText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **text** to <strong>
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // *text* to <em>
            .replace(/\n/g, '<br>'); // newlines to <br>
            
        return cleanText;
    }

    /**
     * Get the zone a card is currently in
     */
    getCardZone(cardElement) {
        // Look for zone content containers or zone elements
        const zoneElement = cardElement.closest('[id$="Content"], .zone-content, .hand-content, .game-zone');
        if (!zoneElement) return 'unknown';
        
        const zoneId = zoneElement.id || zoneElement.closest('[id]')?.id || '';
        const zoneClasses = zoneElement.className || '';
        
        // Check by ID
        if (zoneId.includes('Hand') || zoneId.includes('playerHandContent')) return 'hand';
        if (zoneId.includes('Backups') || zoneId.includes('BackupsContent')) return 'backups';
        if (zoneId.includes('Battlefield') || zoneId.includes('BattlefieldContent')) return 'field';
        if (zoneId.includes('Summons')) return 'summons'; 
        if (zoneId.includes('Damage')) return 'damage';
        
        // Check by class names for new layout
        if (zoneClasses.includes('hand-content')) return 'hand';
        if (zoneClasses.includes('backups')) return 'backups';
        if (zoneClasses.includes('battlefield') || zoneClasses.includes('forwards')) return 'field';
        
        // Check parent element IDs
        const parentZone = cardElement.closest('.game-zone, .hand-area');
        if (parentZone) {
            const parentId = parentZone.id || '';
            if (parentId.includes('playerBackups') || parentId.includes('opponentBackups')) return 'backups';
            if (parentId.includes('playerBattlefield') || parentId.includes('opponentBattlefield')) return 'field';
            if (parentId.includes('playerHand')) return 'hand';
        }
        
        logger.debug('Unknown zone for card element:', cardElement, 'Zone element:', zoneElement);
        return 'unknown';
    }

    /**
     * Check if a card belongs to the player
     */
    isPlayerCard(cardElement) {
        // Check if the card is in a player zone by ID patterns
        const parentZone = cardElement.closest('[id*="player"], .player-hand-area, .game-zone');
        if (parentZone) {
            const parentId = parentZone.id || '';
            const parentClasses = parentZone.className || '';
            
            // Check for player-specific IDs
            if (parentId.includes('player') && !parentId.includes('opponent')) {
                return true;
            }
            
            // Check for player-specific classes
            if (parentClasses.includes('player-') && !parentClasses.includes('opponent-')) {
                return true;
            }
        }
        
        // Check data attributes on the card itself
        if (cardElement.dataset.owner === 'player') {
            return true;
        }
        
        // Fallback: check if it's in opponent zones (inverse check)
        const opponentZone = cardElement.closest('[id*="opponent"]');
        return !opponentZone;
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
                icon: 'View',
                description: 'View card details'
            });
            return actions;
        }

        // Add view action for all cards
        actions.push({ 
            id: 'view', 
            label: 'View Card', 
            icon: 'View',
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
                                icon: 'Play',
                                description: `Cost: ${card.cost || '?'} CP`
                            });
                        }
                        if (card.type === 'backup') {
                            actions.push({ 
                                id: 'playBackup', 
                                label: 'Play as Backup', 
                                icon: 'Play',
                                description: `Cost: ${card.cost || '?'} CP`
                            });
                        }
                        if (card.type === 'summon') {
                            actions.push({ 
                                id: 'playSummon', 
                                label: 'Cast Summon', 
                                icon: 'Cast',
                                description: `Cost: ${card.cost || '?'} CP`
                            });
                        }
                        
                        // Add discard for CP option for non-Light/Dark cards
                        if (card.element !== 'light' && card.element !== 'dark') {
                            actions.push({ 
                                id: 'discardForCP', 
                                label: 'Discard for CP', 
                                icon: 'Discard',
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
                            icon: 'Activate',
                            description: 'Use special ability'
                        });
                    }
                    if (this.currentPhase === 'attack') {
                        actions.push({ 
                            id: 'attack', 
                            label: 'Attack', 
                            icon: 'Attack',
                            description: 'Attack opponent or their forwards'
                        });
                    }
                    if (!cardElement.classList.contains('tapped')) {
                        actions.push({ 
                            id: 'tap', 
                            label: 'Tap', 
                            icon: 'Tap',
                            description: 'Tap this card'
                        });
                    }
                    break;
                    
                case 'backups':
                    if (this.currentPhase === 'main' && !cardElement.classList.contains('tapped')) {
                        actions.push({ 
                            id: 'tapForCP', 
                            label: 'Tap for CP', 
                            icon: 'CP',
                            description: 'Generate Crystal Points'
                        });
                        actions.push({ 
                            id: 'activate', 
                            label: 'Activate Ability', 
                            icon: 'Activate',
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
                icon: 'Target',
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
                this.playCard(card);
                break;
                
            case 'playBackup':
                this.playCard(card);
                break;
                
            case 'playSummon':
                this.playCard(card);
                break;
                
            case 'activate':
                this.activateCardAbility(card);
                break;
                
            case 'attack':
                logger.info(`${card.name} is attacking`);
                // TODO: Implement attack initialization
                window.showNotification(`${card.name} is ready to attack`, 'info');
                break;
                
            case 'attackTarget':
                logger.info(`Setting ${card.name} as attack target`);
                // TODO: Implement attack targeting
                window.showNotification(`Targeting ${card.name}`, 'info');
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
     * Play a card using its actual type from the database
     */
    playCard(card) {
        logger.info(`Playing ${card.name} as ${card.type}`);
        
        // Check and fix phase if needed
        this.ensurePlayablePhase();
        
        try {
            // Use GameEngine to play the card based on its actual type
            console.log(`🃏 Before playing ${card.type}:`, this.gameEngine.gameState.players[0].zones);
            this.gameEngine.playCard(0, card.id, { 
                // Let GameEngine use the card's actual type, don't override it
                respectCardType: true 
            });
            console.log(`🃏 After playing ${card.type}:`, this.gameEngine.gameState.players[0].zones);
            
            const typeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
            window.showNotification(`Played ${card.name} as ${typeLabel}`, 'success');
            
            // Log the card play event with correct zone
            const zoneLabel = card.type === 'forward' ? 'Field' : 
                             card.type === 'backup' ? 'Backup Zone' : 
                             card.type === 'summon' ? 'Break Zone' : 'Field';
            this.logCardPlay(card.name, typeLabel, 'You', zoneLabel);
            
            // Update the display with new game state
            this.setGameState(this.gameEngine.gameState);
        } catch (error) {
            logger.error(`Error playing card as ${card.type}:`, error);
            window.showNotification(`Cannot play ${card.name}: ${error.message}`, 'error');
            this.logError(`Failed to play ${card.name} as ${card.type}: ${error.message}`, { 
                cardName: card.name, 
                playType: card.type 
            });
        }
    }

    /**
     * Log card tap for CP event
     */
    logCardTapForCP(cardName, element, amount, player) {
        const cpColor = element.toLowerCase();
        const message = `${player} tapped ${cardName} for ${amount} ${cpColor} CP`;
        this.addEventLogEntry('cp-gain', message, {
            cardName,
            element: cpColor,
            amount,
            player
        });
        console.log(`💎 CP Generated: ${cardName} -> ${amount} ${cpColor} CP for ${player}`);
        // Also add to right-side event log
        this.addRightEventLogEntry('info', message);
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
        
        try {
            // Use GameEngine to tap the card for CP
            this.gameEngine.tapBackupForCP(0, card.id);
            
            // Update local CP tracking
            this.addCP(card.element, 1);
            
            // Log the tap event
            this.logCardTapForCP(card.name, card.element, 1, 'You');
            
            window.showNotification(`${card.name} generated 1 ${card.element} CP`, 'success');
            
            // Update display with new game state
            this.setGameState(this.gameEngine.gameState);
            
        } catch (error) {
            logger.error('Error tapping card for CP:', error);
            window.showNotification(`Cannot tap ${card.name}: ${error.message}`, 'error');
        }
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
     * Check if a card can be played (uses GameEngine affordability check)
     */
    canPlayCard(card) {
        if (!this.gameState || !card || !this.gameEngine) return false;
        
        // Use GameEngine's affordability check which considers total CP available
        return this.gameEngine.canAffordCard(0, card); // Player index 0
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
        console.log('🔍 Player 1 zones:', player1.zones);
        console.log('🔍 Player 2 zones:', player2.zones);
        console.log('🔍 Player 1 backups length:', (player1.zones.backups || []).length);
        console.log('🔍 Player 1 battlefield length:', (player1.zones.battlefield || []).length);
        console.log('🔍 Player 1 break zone length:', (player1.zones.break || []).length);
        
        this.renderPlayerHand(player1.zones.hand || []);
        this.renderPlayerBackups(player1.zones.backups || []);
        this.renderPlayerBattlefield(player1.zones.battlefield || []);
        this.renderPlayerDamage(player1.zones.damage || []);
        
        // Opponent hand - show face down cards based on count
        const opponentHandCount = player2.zones.hand ? player2.zones.hand.length : 0;
        this.renderOpponentHand(new Array(opponentHandCount).fill('face-down'));
        
        this.renderOpponentBackups(player2.zones.backups || []);
        this.renderOpponentBattlefield(player2.zones.battlefield || []);
        this.renderOpponentDamage(player2.zones.damage || []);
        
        // Update hidden zone content for modals
        this.updateHiddenZoneContent('playerDamageContent', player1.zones.damage || []);
        this.updateHiddenZoneContent('playerBreakContent', player1.zones.break || []);
        this.updateHiddenZoneContent('opponentDamageContent', player2.zones.damage || []);
        this.updateHiddenZoneContent('opponentBreakContent', player2.zones.break || []);
        
        // Update counters and CP
        this.updateCounters();
        this.updateTurnDisplay();
        this.updateZoneCounts();
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

        console.log('🛡️ Rendering player backups:', backupCardIds);
        backupsZone.innerHTML = '';
        
        if (backupCardIds.length === 0) {
            backupsZone.innerHTML = '<div class="zone-empty">No backup cards</div>';
            return;
        }

        backupCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                console.log('🛡️ Adding backup card to display:', card.name);
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

        console.log('⚔️ Rendering player battlefield:', forwardCards);
        battlefieldZone.innerHTML = '';
        
        if (forwardCards.length === 0) {
            battlefieldZone.innerHTML = '<div class="zone-empty">No forwards</div>';
            return;
        }

        forwardCards.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                console.log('⚔️ Adding forward card to display:', card.name);
                const cardElement = this.createGameCard(card, true, false);
                battlefieldZone.appendChild(cardElement);
            } else {
                console.error('⚔️ Card not found in database:', cardId);
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
     * Update zone counts for buttons
     */
    updateZoneCounts() {
        if (!this.gameState || !this.gameState.players) return;
        
        const player1 = this.gameState.players[0];
        const player2 = this.gameState.players[1];
        
        // Update player zone counts
        const playerBreakCount = document.getElementById('playerBreakCount');
        const playerRemovedCount = document.getElementById('playerRemovedCount');
        const playerLifeCount = document.getElementById('playerLifeCount');
        
        if (playerBreakCount) {
            playerBreakCount.textContent = (player1.zones.break || []).length;
        }
        if (playerRemovedCount) {
            playerRemovedCount.textContent = (player1.zones.removed || []).length;
        }
        if (playerLifeCount) {
            playerLifeCount.textContent = (player1.zones.damage || []).length;
        }
        
        // Update opponent zone counts
        const opponentBreakCount = document.getElementById('opponentBreakCount');
        const opponentRemovedCount = document.getElementById('opponentRemovedCount');
        const opponentLifeCount = document.getElementById('opponentLifeCount');
        
        if (opponentBreakCount) {
            opponentBreakCount.textContent = (player2.zones.break || []).length;
        }
        if (opponentRemovedCount) {
            opponentRemovedCount.textContent = (player2.zones.removed || []).length;
        }
        if (opponentLifeCount) {
            opponentLifeCount.textContent = (player2.zones.damage || []).length;
        }
    }

    /**
     * Get display name for phase
     */
    getPhaseDisplayName(phase) {
        const phaseNames = {
            // GameEngine phases
            mulligan: 'Mulligan Phase',
            active: 'Main Phase',
            draw: 'Draw Phase', 
            main1: 'Main Phase 1',
            attack: 'Attack Phase',
            main2: 'Main Phase 2',
            end: 'End Phase',
            // Legacy phases (for backward compatibility)
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
        // Debug: Run comprehensive tests before state change
        if (this.gameState) {
            gameDebugger.runAllTests(this.gameState, this);
        }
        
        this.gameState = gameState;
        
        // Debug: Log state change
        gameDebugger.log('info', '🎮 GameBoard state updated', {
            currentPlayer: gameState?.currentPlayer,
            currentPhase: gameState?.currentPhase,
            turnNumber: gameState?.turnNumber,
            isActive: gameState?.isActive
        });
        
        // Debug: Snapshot new state
        gameDebugger.snapshotCPState(gameState, this, 'setGameState');
        
        this.analyzeDeckElements();
        this.updateModularCPDisplay(); // Legacy support for old CP display area
        this.updateGameDisplay();
        this.syncCPFromGameEngine();
        this.updateLifeCounters();
        
        // Debug: Run tests after state change to catch issues
        gameDebugger.runAllTests(gameState, this);
        gameDebugger.detectCPChanges();
    }

    /**
     * Update life counter displays based on damage zones
     */
    updateLifeCounters() {
        try {
            if (!this.gameState || !this.gameState.players) return;

            // Update player life counter
            const playerDamageCount = this.gameState.players[0]?.zones?.damage?.length || 0;
            const playerLife = this.gameState.maxLifePoints - playerDamageCount;
            const playerLifeElement = document.getElementById('playerLifeCount');
            if (playerLifeElement) {
                playerLifeElement.textContent = playerLife;
                
                // Add visual feedback for low life
                const lifeBtn = document.getElementById('playerLifeBtn');
                if (lifeBtn) {
                    lifeBtn.classList.toggle('low-life', playerLife <= 2);
                    lifeBtn.classList.toggle('critical-life', playerLife <= 1);
                }
            }

            // Update opponent life counter
            const opponentDamageCount = this.gameState.players[1]?.zones?.damage?.length || 0;
            const opponentLife = this.gameState.maxLifePoints - opponentDamageCount;
            const opponentLifeElement = document.getElementById('opponentLifeCount');
            if (opponentLifeElement) {
                opponentLifeElement.textContent = opponentLife;
                
                // Add visual feedback for low life
                const lifeBtn = document.getElementById('opponentLifeBtn');
                if (lifeBtn) {
                    lifeBtn.classList.toggle('low-life', opponentLife <= 2);
                    lifeBtn.classList.toggle('critical-life', opponentLife <= 1);
                }
            }

            gameDebugger.log('info', '❤️ Life counters updated', {
                playerLife: `${playerLife}/7`,
                opponentLife: `${opponentLife}/7`,
                playerDamage: playerDamageCount,
                opponentDamage: opponentDamageCount
            });

        } catch (error) {
            gameDebugger.log('error', 'Failed to update life counters', error);
        }
    }

    /**
     * Update right-side event log with new entry
     */
    addRightEventLogEntry(type, message, details = null) {
        try {
            const content = document.getElementById('eventLogPanelContent');
            if (!content) return;

            // Remove empty state if present
            const emptyElement = content.querySelector('.event-log-empty');
            if (emptyElement) {
                emptyElement.remove();
            }

            // Create new entry
            const entry = document.createElement('div');
            entry.className = `event-log-entry ${type}`;
            
            const timestamp = new Date().toLocaleTimeString();
            const phaseInfo = this.gameState ? `T${this.gameState.turnNumber} ${this.gameState.currentPhase}` : '';
            
            entry.innerHTML = `
                <div class="event-log-timestamp">[${timestamp}] ${phaseInfo}</div>
                <div class="event-log-message">${message}</div>
                ${details ? `<div class="event-log-details">${JSON.stringify(details, null, 2)}</div>` : ''}
            `;

            // Add to top of log (most recent first)
            content.insertBefore(entry, content.firstChild);

            // Limit entries to prevent memory issues
            const entries = content.querySelectorAll('.event-log-entry');
            if (entries.length > 100) {
                entries[entries.length - 1].remove();
            }

            // Update stats
            this.updateEventLogStats();

            gameDebugger.log('debug', `📋 Event log entry added: ${type} - ${message}`);

        } catch (error) {
            gameDebugger.log('error', 'Failed to add event log entry', error);
        }
    }

    /**
     * Update event log statistics
     */
    updateEventLogStats() {
        try {
            const content = document.getElementById('eventLogPanelContent');
            const countElement = document.getElementById('eventLogCount');
            const phaseElement = document.getElementById('eventLogPhase');

            if (content && countElement) {
                const entries = content.querySelectorAll('.event-log-entry');
                countElement.textContent = `${entries.length} events`;
            }

            if (phaseElement && this.gameState) {
                const currentPlayer = this.gameState.currentPlayer === 0 ? 'Your' : 'Opponent\'s';
                const phaseNames = {
                    'active': 'Active Phase',
                    'draw': 'Draw Phase',
                    'main1': 'Main Phase 1', 
                    'attack': 'Attack Phase',
                    'main2': 'Main Phase 2',
                    'end': 'End Phase'
                };
                const phaseName = phaseNames[this.gameState.currentPhase] || this.gameState.currentPhase;
                phaseElement.textContent = `${currentPlayer} Turn - ${phaseName}`;
            }

        } catch (error) {
            gameDebugger.log('error', 'Failed to update event log stats', error);
        }
    }

    /**
     * Clear right-side event log
     */
    clearRightEventLog() {
        try {
            const content = document.getElementById('eventLogPanelContent');
            if (content) {
                content.innerHTML = '<div class="event-log-empty">Event log cleared...</div>';
                this.updateEventLogStats();
            }
        } catch (error) {
            gameDebugger.log('error', 'Failed to clear event log', error);
        }
    }

    /**
     * Start a new game
     */
    startGame() {
        logger.info('Starting new game');
        
        // Log game start
        this.addEventLogEntry('game-start', 'New practice game started');
        
        // Show coin flip to determine first player
        if (window.coinFlip) {
            window.coinFlip();
        }
        
        // Reset game state
        this.currentPlayer = 'player1';
        this.currentPhase = 'main';
        this.selectedCard = null;
        
        // Reset CP for both players
        Object.keys(this.playerCP).forEach(element => {
            this.playerCP[element] = 0;
            this.opponentCP[element] = 0;
        });
        
        // Initialize damage zones (life points)
        this.initializeDamageZone('player');
        this.initializeDamageZone('opponent');
        
        // Reset break zones
        this.breakZones = { player: [], opponent: [] };
        
        // Render initial board
        this.renderEmptyBoard();
        this.updateTurnDisplay();
        
        // Load current deck elements for player
        if (window.app && window.app.deckManager && window.app.deckManager.currentDeck) {
            this.loadPlayerDeck('player', window.app.deckManager.currentDeck);
        }
        
        // For opponent, use default elements for now (could be enhanced later)
        this.setPlayerDeckElements('opponent', {
            elements: { fire: 1, ice: 1, wind: 1, lightning: 1, water: 1, earth: 1 }
        });
        
        // Update CP displays with debugging
        console.log('🎮 Initializing CP displays at game start');
        console.log('🎮 Player CP:', this.playerCP);  
        console.log('🎮 Opponent CP:', this.opponentCP);
        this.updateCPDisplay('player', this.playerCP);
        this.updateCPDisplay('opponent', this.opponentCP);
        
        // For test mode, analyze elements from sample cards (legacy support)
        this.analyzeDeckElements();
        this.updateModularCPDisplay(); // Legacy support for old CP display area
        
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
            // Debug: Snapshot CP state before action
            gameDebugger.snapshotCPState(this.gameState, this, `discard-${card.name}-before`);
            
            // Check if card can be discarded for CP
            if (card.element === 'light' || card.element === 'dark') {
                window.showNotification('Cannot discard Light/Dark cards for CP', 'warning');
                return;
            }
            
            // Determine current player (who is discarding)
            const currentPlayerIndex = this.gameState?.currentPlayer || 0;
            
            // Integrate with GameEngine
            this.gameEngine.generateCPFromDiscard(currentPlayerIndex, card.id);
            
            // Update local CP tracking - ONLY for the current player
            if (currentPlayerIndex === 0) {
                // Human player
                this.addCP(card.element, 2, 'player');
                gameDebugger.log('info', `💎 Player discarded ${card.name} for 2 ${card.element} CP`);
            } else {
                // AI player
                this.addCP(card.element, 2, 'opponent');
                gameDebugger.log('info', `💎 Opponent discarded ${card.name} for 2 ${card.element} CP`);
            }
            
            // Log the discard event
            const playerName = currentPlayerIndex === 0 ? 'You' : 'Opponent';
            this.logCardDiscardForCP(card.name, card.element, 2, playerName);
            
            window.showNotification(`Discarded ${card.name} for 2 ${card.element} CP`, 'success');
            
            // Update display with new game state
            this.setGameState(this.gameEngine.gameState);
            
            // Debug: Snapshot CP state after action and test
            gameDebugger.snapshotCPState(this.gameState, this, `discard-${card.name}-after`);
            gameDebugger.detectCPChanges();
            gameDebugger.testCPSystem(this.gameState, this);
            
        } catch (error) {
            logger.error('Error discarding card for CP:', error);
            gameDebugger.log('error', 'CP Discard Error', error);
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
     * Add CP to a player's pool and update display
     */
    addCP(element, amount, player = 'player') {
        console.log(`💎 addCP called: ${amount} ${element} CP for ${player}`);
        const cpPool = player === 'player' ? this.playerCP : this.opponentCP;
        console.log(`💎 Current CP pool for ${player}:`, cpPool);
        cpPool[element] += amount;
        console.log(`💎 Updated CP pool for ${player}:`, cpPool);
        this.updateCPDisplay(player, cpPool);
        logger.info(`Added ${amount} ${element} CP to ${player}. Total: ${cpPool[element]}`);
    }


    /**
     * Sync CP display with GameEngine state
     */
    syncCPFromGameEngine() {
        console.log('💎 Syncing CP from GameEngine');
        if (this.gameState && this.gameState.players) {
            // Sync Player 1 CP (always the human player)
            if (this.gameState.players[0]) {
                const player1CP = this.gameState.players[0].cpPool;
                console.log('💎 Player 1 CP pool:', player1CP);
                Object.entries(player1CP).forEach(([element, amount]) => {
                    this.playerCP[element] = amount;
                });
                console.log('💎 Updated player CP:', this.playerCP);
                this.updateCPDisplay('player', this.playerCP);
            }
            
            // Sync Player 2 CP (opponent/AI)
            if (this.gameState.players[1]) {
                const player2CP = this.gameState.players[1].cpPool;
                console.log('💎 Player 2 CP pool:', player2CP);
                Object.entries(player2CP).forEach(([element, amount]) => {
                    this.opponentCP[element] = amount;
                });
                console.log('💎 Updated opponent CP:', this.opponentCP);
                this.updateCPDisplay('opponent', this.opponentCP);
            }
        } else {
            console.warn('💎 No game state or players found for CP sync');
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
        
        // Ensure DOM element exists
        if (!this.eventLog.content) {
            console.warn('Event log content not found during setup, will retry later');
            // Try to find it with a slight delay in case DOM isn't ready
            setTimeout(() => {
                this.eventLog.content = document.getElementById('eventLogContent');
            }, 500);
        }
        
        // Set up clear button
        const clearButton = document.getElementById('clearEventLog');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearEventLog());
        }
        
        // Setup minimize button
        const minimizeButton = document.getElementById('minimizeEventLog');
        const eventLogArea = document.getElementById('eventLogArea');
        if (minimizeButton && eventLogArea) {
            let isMinimized = false;
            minimizeButton.addEventListener('click', () => {
                isMinimized = !isMinimized;
                eventLogArea.classList.toggle('minimized', isMinimized);
                minimizeButton.textContent = isMinimized ? '➕' : '➖';
                minimizeButton.title = isMinimized ? 'Expand Log' : 'Minimize Log';
                
                console.log(`📝 Event log ${isMinimized ? 'minimized' : 'expanded'}`);
            });
        }
        
        // Setup event log viewer button
        const expandButton = document.getElementById('expandEventLog');
        if (expandButton) {
            expandButton.addEventListener('click', () => {
                this.openEventLogViewer();
            });
        }
        
        logger.info('📝 Event log system initialized');
        
        // Register game-specific hotkeys
        this.setupHotkeys();
    }
    
    setupHotkeys() {
        // Set context for hotkey help - force game context when GameBoard is active
        if (window.hotkeyHelp) {
            window.hotkeyHelp.setContext('game');
            console.log('🎮 GameBoard: Set hotkey context to "game"');
        }
        
        // Setup actual hotkey functionality
        document.addEventListener('keydown', (event) => {
            // Ignore if user is typing in an input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
                return;
            }
            
            // Ignore if modifier keys are held (except for specific combos)
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }
            
            switch (event.key.toLowerCase()) {
                case ' ': // Space - Switch Phase
                    event.preventDefault();
                    this.handleSwitchPhase();
                    break;
                    
                case 'e': // E - End Turn
                    event.preventDefault();
                    this.handleEndTurn();
                    break;
                    
                case 'c': // C - Clear Event Log
                    event.preventDefault();
                    this.clearEventLog();
                    break;
                    
                case 'm': // M - Toggle Minimize Event Log
                    event.preventDefault();
                    this.toggleEventLogMinimize();
                    break;
                    
                case 'l': // L - Open Event Log Viewer
                    event.preventDefault();
                    this.openEventLogViewer();
                    break;
                    
                case 'h': // H - Toggle Hand Visibility
                    event.preventDefault();
                    this.toggleHandVisibility();
                    break;
                    
                case 'd': // D - Draw Cards (debug)
                    if (window.gameEngine && window.gameEngine.debugMode) {
                        event.preventDefault();
                        this.debugDrawCard();
                    }
                    break;
                    
                case '1': case '2': case '3': case '4': case '5': case '6': case '7':
                    // Quick select CP type
                    event.preventDefault();
                    this.quickSelectCP(parseInt(event.key));
                    break;
                    
                case 'tab': // Tab - Cycle through zones
                    event.preventDefault();
                    this.cycleZoneFocus();
                    break;
            }
        });
    }
    
    handleSwitchPhase() {
        const switchButton = document.querySelector('.switch-phase-btn, [onclick*="switchPhase"], .phase-switch-button');
        if (switchButton && !switchButton.disabled) {
            switchButton.click();
            console.log('⌨️ Hotkey: Switch Phase');
        }
    }
    
    handleEndTurn() {
        const endTurnButton = document.querySelector('.end-turn-btn, [onclick*="endTurn"], .end-turn-button');
        if (endTurnButton && !endTurnButton.disabled) {
            endTurnButton.click();
            console.log('⌨️ Hotkey: End Turn');
        }
    }
    
    toggleEventLogMinimize() {
        const minimizeButton = document.getElementById('minimizeEventLog');
        if (minimizeButton) {
            minimizeButton.click();
            console.log('⌨️ Hotkey: Toggle Event Log Minimize');
        }
    }
    
    toggleHandVisibility() {
        const hand = document.querySelector('.player-hand');
        if (hand) {
            hand.classList.toggle('minimized');
            console.log('⌨️ Hotkey: Toggle Hand Visibility');
        }
    }
    
    debugDrawCard() {
        if (this.drawCard && typeof this.drawCard === 'function') {
            this.drawCard('player', 1);
            console.log('⌨️ Hotkey: Debug Draw Card');
        }
    }
    
    quickSelectCP(number) {
        const cpElements = ['fire', 'ice', 'wind', 'earth', 'lightning', 'water', 'light'];
        if (number >= 1 && number <= cpElements.length) {
            const element = cpElements[number - 1];
            console.log(`⌨️ Hotkey: Quick Select ${element.toUpperCase()} CP`);
            // You can add actual CP selection logic here
        }
    }
    
    cycleZoneFocus() {
        const zones = document.querySelectorAll('.zone-content, .game-zone');
        if (zones.length === 0) return;
        
        let currentIndex = 0;
        const focusedElement = document.querySelector('.zone-focused');
        
        if (focusedElement) {
            currentIndex = Array.from(zones).indexOf(focusedElement);
            focusedElement.classList.remove('zone-focused');
        }
        
        const nextIndex = (currentIndex + 1) % zones.length;
        zones[nextIndex].classList.add('zone-focused');
        zones[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        console.log('⌨️ Hotkey: Cycle Zone Focus');
    }
    
    /**
     * Event Log Viewer Methods
     */
    openEventLogViewer() {
        const modal = document.getElementById('eventLogViewerModal');
        if (!modal) return;
        
        // Populate the viewer with current event log entries
        this.populateEventLogViewer();
        
        // Show the modal
        modal.classList.add('visible');
        
        // Setup close handlers
        this.setupEventLogViewerHandlers();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        console.log('📋 Event Log Viewer opened');
    }
    
    closeEventLogViewer() {
        const modal = document.getElementById('eventLogViewerModal');
        if (!modal) return;
        
        modal.classList.remove('visible');
        document.body.style.overflow = '';
        
        console.log('📋 Event Log Viewer closed');
    }
    
    setupEventLogViewerHandlers() {
        const modal = document.getElementById('eventLogViewerModal');
        const closeButton = document.getElementById('closeEventLogViewer');
        const overlay = modal.querySelector('.event-log-viewer-overlay');
        const exportButton = document.getElementById('eventLogExportBtn');
        
        // Close button
        if (closeButton) {
            closeButton.removeEventListener('click', this.closeEventLogViewer);
            closeButton.addEventListener('click', () => this.closeEventLogViewer());
        }
        
        // Overlay click
        if (overlay) {
            overlay.removeEventListener('click', this.closeEventLogViewer);
            overlay.addEventListener('click', () => this.closeEventLogViewer());
        }
        
        // Export button
        if (exportButton) {
            exportButton.removeEventListener('click', this.exportEventLog);
            exportButton.addEventListener('click', () => this.exportEventLog());
        }
        
        // Escape key
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                this.closeEventLogViewer();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    populateEventLogViewer() {
        const viewerContent = document.getElementById('eventLogViewerContent');
        const countElement = document.getElementById('eventLogViewerCount');
        const phaseElement = document.getElementById('eventLogViewerPhase');
        
        if (!viewerContent) return;
        
        // Clear existing content
        viewerContent.innerHTML = '';
        
        // Update stats
        const entryCount = this.eventLog.entries.length;
        if (countElement) {
            countElement.textContent = `${entryCount} event${entryCount !== 1 ? 's' : ''}`;
        }
        
        if (phaseElement) {
            // Get current game phase info
            const currentPhase = this.currentPhase || 'Main Phase 1';
            const currentPlayer = this.currentPlayer === 'player1' ? 'Your Turn' : 'Opponent Turn';
            phaseElement.textContent = `${currentPlayer} - ${currentPhase}`;
        }
        
        // Add all event log entries to viewer
        if (entryCount === 0) {
            viewerContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-secondary, #999);">
                    <div style="font-size: 2rem; margin-bottom: 12px;">📝</div>
                    <div>No events recorded yet</div>
                    <div style="font-size: 0.85rem; margin-top: 8px;">Events will appear here as you play</div>
                </div>
            `;
        } else {
            // Create entries in reverse order (newest first)
            const reversedEntries = [...this.eventLog.entries].reverse();
            
            for (const entry of reversedEntries) {
                const entryElement = this.createEventLogElement(entry);
                entryElement.classList.add('viewer-entry');
                viewerContent.appendChild(entryElement);
            }
        }
    }
    
    exportEventLog() {
        if (!this.eventLog.entries || this.eventLog.entries.length === 0) {
            window.showNotification('No events to export', 'warning');
            return;
        }
        
        // Create export data
        const exportData = {
            gameInfo: {
                exportDate: new Date().toISOString(),
                totalEvents: this.eventLog.entries.length,
                gamePhase: this.currentPhase || 'Unknown',
                currentPlayer: this.currentPlayer || 'Unknown'
            },
            events: this.eventLog.entries.map(entry => ({
                timestamp: entry.timestamp,
                time: entry.time,
                type: entry.type,
                message: entry.message,
                data: entry.data
            }))
        };
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `fftcg-event-log-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📤 Event log exported');
        window.showNotification('Event log exported successfully', 'success');
    }
    
    /**
     * Add an event to the log
     */
    addEventLogEntry(type, message, data = {}) {
        // Target the inner wrapper for proper containment
        if (!this.eventLog.content) {
            const eventLogContent = document.getElementById('eventLogContent');
            if (eventLogContent) {
                this.eventLog.content = eventLogContent.querySelector('.event-log-inner-wrapper');
                if (!this.eventLog.content) {
                    console.error('❌ Event log inner wrapper not found! Creating it...');
                    // Create the wrapper if it doesn't exist
                    this.eventLog.content = document.createElement('div');
                    this.eventLog.content.className = 'event-log-inner-wrapper';
                    eventLogContent.appendChild(this.eventLog.content);
                }
            }
        }
        
        if (!this.eventLog.content) {
            console.error('❌ Event log content element not found! Cannot add entry:', message);
            return;
        }
        
        // Debug logging (can be removed in production)
        // console.log(`📝 Adding ${type} event to log:`, message);
        
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
        
        // Add to container
        this.eventLog.content.appendChild(entryElement);
        
        // Only auto-scroll if user hasn't manually scrolled up
        setTimeout(() => {
            const eventLogContent = document.getElementById('eventLogContent');
            if (eventLogContent) {
                const isScrolledToBottom = eventLogContent.scrollTop >= (eventLogContent.scrollHeight - eventLogContent.clientHeight - 10);
                if (isScrolledToBottom) {
                    eventLogContent.scrollTop = eventLogContent.scrollHeight;
                }
            }
        }, 10);
        
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
            'card-draw': '🎴',
            'cp-gain': '💎',
            'cp-spend': '💸',
            'attack-action': '⚔️',
            'damage': '💔',
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
        
        console.log('🧹 Clearing event log...');
        this.eventLog.entries = [];
        this.eventLog.content.innerHTML = '<div class="event-log-empty">Game events will appear here...</div>';
        
        // Temporarily disabled to avoid recursive issues
        // this.addEventLogEntry('info', 'Event log cleared');
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
     * Show damage zone modal for viewing/managing life points
     */
    showDamageZoneModal(player) {
        gameDebugger.log('info', `🔍 Opening damage zone modal for ${player}`);

        const playerName = player === 'player' ? 'Your' : 'Opponent\'s';
        const damageCards = this.gameState ? 
            (this.gameState.players[player === 'player' ? 0 : 1]?.zones?.damage || []) :
            (this.damageZones[player] || []);

        const lifePoints = 7 - damageCards.length; // FFTCG: 7 starting life minus damage taken

        // Create modal content
        const modalContent = `
            <div class="damage-zone-modal">
                <div class="damage-zone-header">
                    <h3>${playerName} Life Points</h3>
                    <div class="life-summary">
                        <div class="life-remaining">${lifePoints}/7 Life Points</div>
                        <div class="damage-taken">${damageCards.length} Damage Cards</div>
                    </div>
                </div>
                <div class="damage-cards-container">
                    ${damageCards.length > 0 ? 
                        damageCards.map((cardId, index) => {
                            const card = this.cardDatabase.getCard(cardId);
                            return `
                                <div class="damage-card" data-card-id="${cardId}" data-index="${index}">
                                    <div class="damage-card-preview">
                                        ${card ? this.getCardImageHTML(card) : '<div class="card-placeholder">Unknown Card</div>'}
                                    </div>
                                    <div class="damage-card-info">
                                        <div class="card-name">${card ? card.name : 'Unknown Card'}</div>
                                        <div class="card-type">${card ? `${card.type} - ${card.element}` : 'Unknown'}</div>
                                        ${player === 'player' ? `
                                            <button class="btn btn-small btn-primary" onclick="window.app.gameBoard.useDamageCardForCP('${cardId}', ${index})">
                                                Use for CP
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('') : 
                        '<div class="no-damage">No damage taken yet - full health!</div>'
                    }
                </div>
                <div class="damage-zone-footer">
                    <div class="damage-zone-rules">
                        <h4>FFTCG Damage Rules:</h4>
                        <ul>
                            <li>You start with 7 life points (cards from top of deck)</li>
                            <li>When you take damage, cards go to damage zone face-up</li>
                            <li>Damage cards can be used for Crystal Points</li>
                            <li>If you would take damage with no cards in deck, you lose</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Show modal using the modal system
        if (window.app && window.app.modal) {
            window.app.modal.show('damage-zone', `${playerName} Damage Zone`, modalContent);
        } else {
            // Fallback: create simple modal
            this.createSimpleDamageModal(playerName, modalContent);
        }

        gameDebugger.log('info', `📋 Damage zone modal opened`, { player, lifePoints, damageCount: damageCards.length });
    }

    /**
     * Use a damage card for CP generation
     */
    useDamageCardForCP(cardId, index) {
        gameDebugger.log('info', `💎 Using damage card for CP`, { cardId, index });

        if (!this.gameState) {
            window.showNotification('Cannot use card - game not active', 'error');
            return;
        }

        try {
            // Get card data
            const card = this.cardDatabase.getCard(cardId);
            if (!card) {
                throw new Error('Card not found');
            }

            // Check if it can be used for CP
            if (card.element === 'light' || card.element === 'dark') {
                window.showNotification('Cannot use Light/Dark cards for CP', 'warning');
                return;
            }

            // Remove from damage zone and add to break zone
            const player = this.gameState.players[0]; // Assuming player is always index 0
            const damageIndex = player.zones.damage.indexOf(cardId);
            
            if (damageIndex === -1) {
                throw new Error('Card not found in damage zone');
            }

            player.zones.damage.splice(damageIndex, 1);
            player.zones.break.push(cardId);

            // Generate CP
            this.addCP(card.element, 2, 'player');

            // Update displays
            this.setGameState(this.gameEngine.gameState);
            
            // Close modal and show updated one
            if (window.app && window.app.modal) {
                window.app.modal.close('damage-zone');
                setTimeout(() => this.showDamageZoneModal('player'), 100);
            }

            window.showNotification(`Used ${card.name} for 2 ${card.element} CP`, 'success');
            this.logCardDiscardForCP(card.name, card.element, 2, 'You (from damage zone)');

        } catch (error) {
            gameDebugger.log('error', 'Failed to use damage card for CP', error);
            window.showNotification(`Cannot use card: ${error.message}`, 'error');
        }
    }

    /**
     * Create simple damage modal (fallback)
     */
    createSimpleDamageModal(title, content) {
        // Remove existing modal if present
        const existingModal = document.getElementById('simpleDamageModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'simpleDamageModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" onclick="document.getElementById('simpleDamageModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
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
            
            // Animate damage if cards were involved
            if (event.damagedCards && event.damagedCards.length > 0) {
                this.animateDeckToDamage(playerKey, event.damagedCards);
            } else {
                // Fallback: just sync immediately if no cards specified
                this.syncFromGameEngine();
            }
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
        const message = `${player} entered ${toPhase.replace('_', ' ')} phase`;
        this.addEventLogEntry('phase-change', message, {
            fromPhase,
            toPhase,
            player
        });
        // Also add to right-side event log
        this.addRightEventLogEntry('phase-change', message);
    }
    
    /**
     * Log turn change
     */
    logTurnChange(newTurn, player = 'Opponent') {
        const message = `Turn ${newTurn}: ${player}'s turn begins`;
        this.addEventLogEntry('turn-change', message, {
            turn: newTurn,
            player
        });
        // Also add to right-side event log
        this.addRightEventLogEntry('turn-change', message);
    }
    
    /**
     * Log card play
     */
    logCardPlay(cardName, playType, player = 'You', zone = '') {
        const zoneText = zone ? ` to ${zone}` : '';
        const message = `${player} played ${cardName} as ${playType}${zoneText}`;
        this.addEventLogEntry('card-play', message, {
            cardName,
            playType,
            player,
            zone
        });
        // Also add to right-side event log
        this.addRightEventLogEntry('success', message);
    }
    
    /**
     * Log card discard for CP
     */
    logCardDiscardForCP(cardName, element, cpAmount, player = 'You') {
        const message = `${player} discarded ${cardName} for ${cpAmount} ${element} CP`;
        this.addEventLogEntry('card-discard', message, {
            cardName,
            element,
            cpAmount,
            player
        });
        // Also add to right-side event log
        this.addRightEventLogEntry('warning', message);
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
    
    /**
     * Open damage zone modal for a player
     */
    openDamageZoneModal(player) {
        const damageCards = this.damageZones[player] || [];
        const playerName = player === 'player' ? 'Your' : "Opponent's";
        
        if (!window.app || !window.app.modal) {
            logger.warn('Modal system not available');
            return;
        }
        
        const modalContent = `
            <div class="damage-zone-modal">
                <h3>${playerName} Damage Zone</h3>
                <div class="damage-cards">
                    ${damageCards.map((card, index) => `
                        <div class="damage-card face-up" data-index="${index}">
                            <img src="${this.getCardImageUrl(card)}" 
                                 alt="${card.name}" 
                                 class="card-image"
                                 onerror="this.src='${this.getPlaceholderImageUrl()}'" />
                            <div class="card-name">${card.name}</div>
                            ${card.exBurst ? '<div class="ex-burst-indicator">⚡ EX BURST</div>' : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="damage-zone-stats">
                    <p>Damage Taken: ${damageCards.length} / 7</p>
                    <p>Cards Remaining Until Loss: ${7 - damageCards.length}</p>
                    ${damageCards.some(card => card.exBurst) ? '<p class="ex-burst-note">⚡ Contains EX Burst cards</p>' : ''}
                </div>
                <button onclick="window.closeModal()" class="btn primary">Close</button>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal damage-zone-modal-wrapper';
        modal.innerHTML = `<div class="modal-content">${modalContent}</div>`;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // Add close handler
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Get deck count for a player
     */
    getDeckCount(player) {
        if (this.gameState && this.gameState.players) {
            const gamePlayer = this.gameState.players[player] || this.gameState.players[player === 'player' ? 'player1' : 'player2'];
            if (gamePlayer && gamePlayer.zones && gamePlayer.zones.deck) {
                return gamePlayer.zones.deck.length;
            }
        }
        
        // Fallback to default deck size minus damage zone
        const damageZoneSize = this.damageZones[player] ? this.damageZones[player].length : 0;
        return 50 - damageZoneSize; // Standard deck size
    }
    
    /**
     * Update CP display for a player - only shows deck elements
     */
    updateCPDisplay(player, cpData) {
        const container = this.getCPContainer(player);
        if (!container) {
            console.error(`💎 CP container not found for ${player}`);
            return;
        }
        
        // Get deck elements for this player (or use default for testing)
        const deckElements = this.getDeckElements(player);
        console.log(`💎 Updating CP display for ${player}:`, cpData);
        console.log(`💎 Deck elements for ${player}:`, deckElements);
        
        // Clear existing CP icons
        container.innerHTML = '';
        
        // Add CP header
        const header = document.createElement('div');
        header.className = 'cp-header';
        header.textContent = 'Available CP';
        container.appendChild(header);
        
        // Create icons container
        const iconsContainer = document.createElement('div');
        iconsContainer.className = 'cp-icons';
        
        // Show elements present in the deck ONLY (no fallback to all elements)
        const elementsToShow = deckElements.length > 0 ? deckElements : [];
        console.log(`💎 Elements to show for ${player}:`, elementsToShow);
        console.log(`💎 Deck elements detected:`, deckElements);
        
        // Show message if no deck elements are available
        if (elementsToShow.length === 0) {
            const messageElement = document.createElement('div');
            messageElement.className = 'cp-no-elements-message';
            messageElement.textContent = 'No deck elements detected';
            messageElement.style.cssText = `
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.8rem;
                font-style: italic;
                text-align: center;
                padding: 8px;
            `;
            iconsContainer.appendChild(messageElement);
        }

        elementsToShow.forEach(type => {
            const value = cpData[type] || 0;
            
            const cpIcon = document.createElement('span');
            cpIcon.className = `cp-icon ${type}`;
            cpIcon.id = `${player === 'player' ? 'player' : 'opponent'}${type.charAt(0).toUpperCase() + type.slice(1)}CP`;
            
            const emoji = this.getCPEmoji(type);
            cpIcon.textContent = `${emoji} ${value}`;
            
            // Add visual highlight for available CP
            if (value > 0) {
                cpIcon.style.background = this.getCPColor(type);
                cpIcon.style.borderColor = this.getCPBorderColor(type);
            } else {
                cpIcon.style.background = 'rgba(0, 0, 0, 0.3)';
                cpIcon.style.borderColor = 'rgba(100, 100, 100, 0.2)';
            }
            
            iconsContainer.appendChild(cpIcon);
        });
        
        container.appendChild(iconsContainer);
    }
    
    /**
     * Get CP display container for a player
     */
    getCPContainer(player) {
        const prefix = player === 'player' ? 'player' : 'opponent';
        const containerId = `${prefix}CP`;
        const container = document.getElementById(containerId);
        console.log(`💎 Looking for CP container: ${containerId}, found:`, !!container);
        if (container) {
            console.log(`💎 Container element:`, container);
        }
        return container;
    }
    
    /**
     * Get deck elements for a player
     */
    getDeckElements(player) {
        // Check if we have stored deck elements for this player
        const playerKey = player === 'player' ? 'player' : 'opponent';
        if (this.playerDeckElements && this.playerDeckElements[playerKey]) {
            return Object.keys(this.playerDeckElements[playerKey]);
        }
        
        // Try to get actual deck elements from game state
        if (this.gameState && this.gameState.players) {
            const gamePlayer = this.gameState.players[player] || this.gameState.players[player === 'player' ? 'player1' : 'player2'];
            if (gamePlayer && gamePlayer.deckElements) {
                return Object.keys(gamePlayer.deckElements);
            }
        }
        
        // Try to get from deck manager current deck
        if (window.app && window.app.deckManager && window.app.deckBuilder) {
            const currentDeck = window.app.deckManager.currentDeck;
            if (currentDeck) {
                const analysis = window.app.deckBuilder.analyzeDeckComposition(currentDeck);
                if (analysis && analysis.elements) {
                    return Object.keys(analysis.elements);
                }
            }
        }
        
        // Fallback to analyzing existing deckElements property
        if (this.deckElements && this.deckElements.size > 0) {
            return Array.from(this.deckElements);
        }
        
        // No deck elements detected - return empty array (CP display will be empty)
        console.log(`💎 No deck elements detected for ${player}, CP display will be empty until deck is loaded`);
        return [];
    }
    
    /**
     * Set deck elements for a player from deck analysis
     */
    setPlayerDeckElements(player, deckAnalysis) {
        if (!this.playerDeckElements) {
            this.playerDeckElements = {};
        }
        
        const playerKey = player === 'player' ? 'player' : 'opponent';
        this.playerDeckElements[playerKey] = deckAnalysis.elements || {};
        
        logger.info(`Set deck elements for ${player}:`, this.playerDeckElements[playerKey]);
        
        // Update CP display with new elements
        this.updateCPDisplay(player, this.playerCP || {});
    }
    
    /**
     * Load deck for a player and analyze its elements
     */
    loadPlayerDeck(player, deck) {
        if (!deck || !window.app || !window.app.deckBuilder) {
            logger.warn(`Cannot load deck for ${player}: missing deck or deck builder`);
            return;
        }
        
        try {
            // Analyze deck composition to get element distribution
            const analysis = window.app.deckBuilder.analyzeDeckComposition(deck);
            
            // Store the deck elements for this player
            this.setPlayerDeckElements(player, analysis);
            
            logger.info(`Loaded deck for ${player} with elements:`, Object.keys(analysis.elements));
            
        } catch (error) {
            logger.error(`Error loading deck for ${player}:`, error);
        }
    }
    
    
    /**
     * Get emoji for CP type
     */
    getCPEmoji(type) {
        const emojis = {
            fire: '🔥',
            ice: '❄️',
            wind: '💨',
            lightning: '⚡',
            water: '💧',
            earth: '🌍',
            light: '☀️',
            dark: '🌙'
        };
        return emojis[type] || '?';
    }
    
    /**
     * Get background color for CP type
     */
    getCPColor(type) {
        const colors = {
            fire: 'rgba(255, 69, 0, 0.4)',
            ice: 'rgba(135, 206, 235, 0.4)',
            wind: 'rgba(144, 238, 144, 0.4)',
            lightning: 'rgba(255, 255, 0, 0.4)',
            water: 'rgba(0, 191, 255, 0.4)',
            earth: 'rgba(139, 69, 19, 0.4)',
            light: 'rgba(255, 215, 0, 0.4)',
            dark: 'rgba(72, 61, 139, 0.4)'
        };
        return colors[type] || 'rgba(0, 0, 0, 0.3)';
    }
    
    /**
     * Get border color for CP type
     */
    getCPBorderColor(type) {
        const colors = {
            fire: 'rgba(255, 69, 0, 0.8)',
            ice: 'rgba(135, 206, 235, 0.8)',
            wind: 'rgba(144, 238, 144, 0.8)',
            lightning: 'rgba(255, 255, 0, 0.8)',
            water: 'rgba(0, 191, 255, 0.8)',
            earth: 'rgba(139, 69, 19, 0.8)',
            light: 'rgba(255, 215, 0, 0.8)',
            dark: 'rgba(72, 61, 139, 0.8)'
        };
        return colors[type] || 'rgba(100, 100, 100, 0.2)';
    }

    /**
     * Log card draw events
     */
    logCardDraw(count, player = 'You') {
        const message = `${player} drew ${count} card${count > 1 ? 's' : ''}`;
        this.addEventLogEntry('card-draw', message, {
            count,
            player
        });
        // Also add to right-side event log
        this.addRightEventLogEntry('info', message);
    }

    /**
     * Right-side event log methods
     */
    addRightEventLogEntry(type, message, data = {}) {
        // DISABLED: Right-side event log conflicts with main event log
        return;

        const timestamp = new Date().toLocaleTimeString();
        
        const entry = document.createElement('div');
        entry.className = `event-entry ${type}`;
        entry.innerHTML = `
            <span class="event-time">${timestamp}</span>
            <span class="event-message">${message}</span>
        `;

        // Add to the top of the log
        eventLog.insertBefore(entry, eventLog.firstChild);

        // Limit to 100 entries
        while (eventLog.children.length > 100) {
            eventLog.removeChild(eventLog.lastChild);
        }

        // Update stats
        this.updateEventLogStats();
    }

    updateEventLogStats() {
        const stats = document.getElementById('eventLogStats');
        const eventLog = document.getElementById('rightEventLog');
        if (!stats || !eventLog) return;

        const totalEntries = eventLog.children.length;
        stats.textContent = `${totalEntries} events`;
    }

    clearRightEventLog() {
        const eventLog = document.getElementById('rightEventLog');
        if (eventLog) {
            eventLog.innerHTML = '';
        }
        this.updateEventLogStats();
    }

    /**
     * FFTCG-compliant damage system: take damage by drawing from top of deck
     */
    takeDamage(player, amount = 1) {
        const playerIndex = player === 'player' ? 0 : 1;
        const gamePlayer = this.gameState?.players[playerIndex];
        
        if (!gamePlayer) {
            console.error('Cannot take damage: player not found');
            return false;
        }

        let damageDealt = 0;
        
        for (let i = 0; i < amount; i++) {
            // Check if deck is empty (automatic loss)
            if (!gamePlayer.zones.deck || gamePlayer.zones.deck.length === 0) {
                this.addEventLogEntry('game-end', `${player === 'player' ? 'You' : 'Opponent'} lost by decking out!`, {
                    player: player === 'player' ? 'You' : 'Opponent',
                    reason: 'deck_out'
                });
                this.addRightEventLogEntry('error', `${player === 'player' ? 'You' : 'Opponent'} lost by decking out!`);
                this.handleGameEnd(player, 'deck_out');
                return false;
            }

            // Draw top card from deck
            const topCardId = gamePlayer.zones.deck.shift(); // Remove from top of deck
            const card = this.cardDatabase.getCard(topCardId);
            
            if (!card) {
                console.error('Invalid card drawn for damage:', topCardId);
                continue;
            }

            // Create damage zone entry (always face-up in FFTCG)
            const damageCard = {
                id: topCardId,
                name: card.name,
                element: card.element,
                cost: card.cost,
                exBurst: card.ex_burst || false,
                faceUp: true // FFTCG damage zone cards are always face-up
            };

            // Add to damage zone
            if (!gamePlayer.zones.damage) {
                gamePlayer.zones.damage = [];
            }
            gamePlayer.zones.damage.push(topCardId);

            // Update visual damage zone
            if (!this.damageZones[player]) {
                this.damageZones[player] = [];
            }
            this.damageZones[player].push(damageCard);

            damageDealt++;

            // Log the damage
            this.addEventLogEntry('damage', `${player === 'player' ? 'You' : 'Opponent'} took 1 damage: ${card.name}`, {
                cardName: card.name,
                player: player === 'player' ? 'You' : 'Opponent'
            });
            this.addRightEventLogEntry('error', `${player === 'player' ? 'You' : 'Opponent'} took 1 damage: ${card.name}`);

            // Check for EX Burst
            if (card.ex_burst) {
                this.triggerExBurst(player, card, damageCard);
            }

            // Check for game end (7 damage rule - immediate loss)
            if (gamePlayer.zones.damage.length >= 7) {
                this.addEventLogEntry('game-end', `${player === 'player' ? 'You' : 'Opponent'} lost with 7 damage!`, {
                    player: player === 'player' ? 'You' : 'Opponent',
                    reason: 'damage'
                });
                this.addRightEventLogEntry('error', `${player === 'player' ? 'You' : 'Opponent'} lost with 7 damage!`);
                this.handleGameEnd(player, 'damage');
                return true; // Game ended
            }
        }

        // Update UI
        this.updateLifeCounters();
        this.updateDamageZoneDisplay(player);
        
        return true; // Damage successfully dealt
    }

    /**
     * Handle EX Burst trigger when card is placed in damage zone
     */
    triggerExBurst(player, card, damageCard) {
        this.addRightEventLogEntry('warning', `EX BURST: ${card.name} triggers!`);
        
        // TODO: Implement specific EX Burst effects based on card
        // For now, just log the trigger
        console.log(`🎆 EX BURST triggered for ${player}: ${card.name}`, card);
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(`EX BURST: ${card.name}!`, 'warning');
        }
    }

    /**
     * Handle game end conditions
     */
    handleGameEnd(losingPlayer, reason) {
        const winner = losingPlayer === 'player' ? 'Opponent' : 'You';
        const reasonText = reason === 'damage' ? '7 damage' : 'deck out';
        
        this.addRightEventLogEntry('error', `GAME OVER: ${winner} wins by ${reasonText}!`);
        
        if (window.showNotification) {
            window.showNotification(`Game Over! ${winner} wins!`, 'error');
        }
        
        // Disable further interactions
        this.gameEnded = true;
    }

    /**
     * Update damage zone display on main board
     */
    /**
     * Get card image URL for display
     */
    getCardImageUrl(card) {
        if (!card) return this.getPlaceholderImageUrl();
        
        // Use card ID to construct image URL
        if (card.id) {
            return `assets/images/cards/${card.id}.jpg`;
        }
        
        // Fallback for cards without ID
        return this.getPlaceholderImageUrl();
    }

    /**
     * Get placeholder image URL when card images are not available
     */
    getPlaceholderImageUrl() {
        // Return a data URL for a simple card placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDEwMCAxNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTQwIiBmaWxsPSIjMmEyYTNhIiBzdHJva2U9IiNmZmQ3MDAiIHN0cm9rZS13aWR0aD0iMiIgcng9IjgiLz4KPHRleHQgeD0iNTAiIHk9IjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZmZkNzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkNhcmQ8L3RleHQ+Cjx0ZXh0IHg9IjUwIiB5PSI4NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZDcwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIj5JbWFnZTwvdGV4dD4KPHRleHQgeD0iNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZDcwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIj5NaXNzaW5nPC90ZXh0Pgo8L3N2Zz4K';
    }

    /**
     * Initialize damage zone displays for both players
     */
    initializeDamageZoneDisplays() {
        setTimeout(() => {
            this.updateDamageZoneDisplay('player');
            this.updateDamageZoneDisplay('opponent');
        }, 100); // Small delay to ensure DOM is ready
    }

    updateDamageZoneDisplay(player) {
        const damageZoneElement = document.getElementById(`${player}DamageZone`);
        if (!damageZoneElement) {
            console.warn(`Damage zone element not found for ${player}`);
            return;
        }

        const damageCards = this.damageZones[player] || [];
        
        // Clear and rebuild damage zone display
        damageZoneElement.innerHTML = '';
        
        // Show up to 7 damage slots
        for (let i = 0; i < 7; i++) {
            const slot = document.createElement('div');
            slot.className = 'damage-slot';
            
            if (i < damageCards.length) {
                const card = damageCards[i];
                slot.innerHTML = `
                    <div class="damage-card face-up" data-card-id="${card.id}">
                        <img src="${this.getCardImageUrl(card)}" 
                             alt="${card.name}" 
                             class="mini-card-image"
                             onerror="this.src='${this.getPlaceholderImageUrl()}'" />
                        ${card.exBurst ? '<div class="ex-burst-indicator">⚡</div>' : ''}
                    </div>
                `;
                slot.onclick = () => this.showCardDetails(card);
            } else {
                slot.innerHTML = '<div class="empty-damage-slot"></div>';
            }
            
            damageZoneElement.appendChild(slot);
        }
    }

    /**
     * Show mulligan modal when entering mulligan phase
     */
    showMulliganModal() {
        console.log('🔄 GameBoard: Triggering mulligan modal display');
        
        // Use the global showMulliganModal function
        if (typeof window.showMulliganModal === 'function') {
            window.showMulliganModal();
        } else {
            console.error('❌ Global showMulliganModal function not available');
        }
        
        // Add event log entry
        this.addEventLogEntry('mulligan-phase', 'Entering mulligan phase - choose to keep or redraw hand');
    }

    /**
     * Animate cards moving from deck to damage zone
     */
    animateDeckToDamage(player, damagedCards) {
        console.log(`🎬 Animating ${damagedCards.length} cards from deck to damage zone for ${player}`);
        
        // Get source and target elements
        const deckElement = this.getDeckElement(player);
        const damageZoneElement = this.getDamageZoneElement(player);
        
        if (!deckElement || !damageZoneElement) {
            console.warn('Could not find deck or damage zone elements for animation, falling back to immediate update');
            this.syncFromGameEngine();
            return;
        }

        // Create flying card animations for each damaged card
        const animationPromises = damagedCards.map((cardId, index) => 
            this.createFlyingCardAnimation(deckElement, damageZoneElement, cardId, index * 150) // Stagger by 150ms
        );

        // Wait for all animations to complete, then update display
        Promise.all(animationPromises).then(() => {
            console.log('🎬 All damage animations completed');
            this.syncFromGameEngine();
        }).catch((error) => {
            console.error('Animation error, falling back to immediate update:', error);
            this.syncFromGameEngine();
        });
    }

    /**
     * Get deck element for a player
     */
    getDeckElement(player) {
        // In FFTCG, deck is typically represented as a stack - find the deck area
        if (player === 'player') {
            return document.querySelector('.deck-button, .player-deck, #playerDeck') || 
                   document.querySelector('.zone-buttons .deck-btn');
        } else {
            return document.querySelector('.opponent-deck, #opponentDeck') || 
                   document.querySelector('.opponent-zone-buttons .deck-btn');
        }
    }

    /**
     * Get damage zone element for a player
     */
    getDamageZoneElement(player) {
        return document.getElementById(`${player}DamageZone`);
    }

    /**
     * Create a flying card animation from source to target
     */
    createFlyingCardAnimation(sourceElement, targetElement, cardId, delay = 0) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Create flying card element
                const flyingCard = document.createElement('div');
                flyingCard.className = 'flying-card-animation';
                flyingCard.innerHTML = `
                    <div class="flying-card-inner">
                        <div class="card-back">🎴</div>
                    </div>
                `;

                // Get positions
                const sourceRect = sourceElement.getBoundingClientRect();
                const targetRect = targetElement.getBoundingClientRect();

                // Style the flying card
                flyingCard.style.cssText = `
                    position: fixed;
                    left: ${sourceRect.left + sourceRect.width / 2 - 25}px;
                    top: ${sourceRect.top + sourceRect.height / 2 - 35}px;
                    width: 50px;
                    height: 70px;
                    z-index: 1000;
                    pointer-events: none;
                    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                `;

                // Add to DOM
                document.body.appendChild(flyingCard);

                // Animate to target after a small delay
                requestAnimationFrame(() => {
                    flyingCard.style.left = `${targetRect.left + targetRect.width / 2 - 25}px`;
                    flyingCard.style.top = `${targetRect.top + targetRect.height / 2 - 35}px`;
                    flyingCard.style.transform = 'scale(0.8) rotateY(180deg)';
                    flyingCard.style.opacity = '0.7';
                });

                // Clean up after animation
                setTimeout(() => {
                    if (flyingCard.parentNode) {
                        flyingCard.parentNode.removeChild(flyingCard);
                    }
                    resolve();
                }, 850); // Slightly longer than transition duration
            }, delay);
        });
    }

    /**
     * Fallback methods for any remaining payment mode references
     * These prevent errors if old HTML elements try to call these methods
     */
    cancelPayment() {
        console.warn('⚠️  cancelPayment called but payment mode is disabled. Ignoring.');
        return false;
    }

    completePayment() {
        console.warn('⚠️  completePayment called but payment mode is disabled. Ignoring.');
        return false;
    }
}

// Export for use in other modules
export default GameBoard;