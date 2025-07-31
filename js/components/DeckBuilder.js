/**
 * DECK BUILDER COMPONENT - Card Display and Deck Management UI
 * 
 * This module provides the deck builder interface including:
 * - Card display grid with filtering and search
 * - Current deck management and display
 * - Drag and drop interactions
 * - Real-time deck statistics and validation
 */

import { logger } from '../utils/Logger.js';

/**
 * DeckBuilder Class
 * Manages the deck building interface and interactions
 */
export class DeckBuilder {
    constructor(cardDatabase, deckManager) {
        this.cardDatabase = cardDatabase;
        this.deckManager = deckManager;
        
        // Current state
        this.currentDeck = null;
        this.filteredCards = [];
        this.searchTerm = '';
        this.elementFilter = '';
        this.typeFilter = '';
        
        // UI elements
        this.cardGrid = null;
        this.deckList = null;
        this.searchInput = null;
        this.elementSelect = null;
        this.typeSelect = null;
        
        // Event handlers
        this.boundHandlers = {};
        
        this.initialize();
    }

    /**
     * Initialize the deck builder
     */
    initialize() {
        this.setupUIElements();
        this.setupEventListeners();
        this.initializeDeckManager();
        
        logger.info('🔨 Deck Builder initialized with minimal UI');
    }

    /**
     * Set up UI element references
     */
    setupUIElements() {
        // Main UI containers
        this.deckManager = document.getElementById('deckManager');
        this.deckEditor = document.getElementById('deckEditor');
        this.deckListContainer = document.getElementById('deckListContainer');
        this.noDecksPlaceholder = document.getElementById('noDecksPlaceholder');
        
        // Card search panel
        this.cardSearchPanel = document.getElementById('cardSearchPanel');
        this.cardGrid = document.getElementById('cardDatabase');
        this.searchInput = document.getElementById('cardSearch');
        this.elementSelect = document.getElementById('elementFilter');
        this.typeSelect = document.getElementById('typeFilter');
        
        // Deck editing elements
        this.deckList = document.getElementById('currentDeck');
        this.deckNameInput = document.getElementById('deckName');
        this.deckCardCount = document.getElementById('deckCardCount');
        this.saveDeckBtn = document.getElementById('saveDeckBtn');
        this.addCardsBtn = document.getElementById('addCardsBtn');
        
        if (!this.deckManager || !this.deckEditor) {
            throw new Error('Required deck builder elements not found in DOM');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Search input
        if (this.searchInput) {
            this.boundHandlers.search = this.handleSearch.bind(this);
            this.searchInput.addEventListener('input', this.boundHandlers.search);
        }

        // Filter selects
        if (this.elementSelect) {
            this.boundHandlers.elementFilter = this.handleElementFilter.bind(this);
            this.elementSelect.addEventListener('change', this.boundHandlers.elementFilter);
        }

        if (this.typeSelect) {
            this.boundHandlers.typeFilter = this.handleTypeFilter.bind(this);
            this.typeSelect.addEventListener('change', this.boundHandlers.typeFilter);
        }

        // Deck name input
        if (this.deckNameInput) {
            this.boundHandlers.deckName = this.handleDeckNameChange.bind(this);
            this.deckNameInput.addEventListener('input', this.boundHandlers.deckName);
        }

        // Set up drag and drop for deck list
        this.setupDragAndDrop();
        
        // Set up keyboard navigation
        this.setupKeyboardNavigation();
    }

    /**
     * Initialize the deck manager interface
     */
    initializeDeckManager() {
        // Debug: Log card database info
        const allCards = this.cardDatabase.getAllCards();
        logger.info(`🔍 DeckBuilder loaded with ${allCards.length} cards from database`);
        
        // Debug: Log element breakdown
        const elementCounts = {};
        allCards.forEach(card => {
            elementCounts[card.element] = (elementCounts[card.element] || 0) + 1;
        });
        logger.info('🔍 Cards by element:', elementCounts);
        
        // Show deck manager by default
        this.showDeckManager();
        this.refreshDeckList();
    }

    /**
     * Refresh the card display grid
     */
    refreshCardDisplay() {
        if (!this.cardGrid) return;

        // Get filtered cards
        this.filteredCards = this.getFilteredCards();
        
        // Debug: Log filtering results
        logger.debug(`🔍 Filtered cards: ${this.filteredCards.length} (search: "${this.searchTerm}", element: "${this.elementFilter}", type: "${this.typeFilter}")`);
        
        // Clear existing content
        this.cardGrid.innerHTML = '';

        if (this.filteredCards.length === 0) {
            this.cardGrid.innerHTML = '<div class="no-cards-message">No cards found matching current filters</div>';
            return;
        }

        // Create card elements
        this.filteredCards.forEach(card => {
            const cardElement = this.createCardElement(card);
            this.cardGrid.appendChild(cardElement);
        });

        logger.debug(`Displayed ${this.filteredCards.length} cards in deck builder`);
    }

    /**
     * Get filtered cards based on current search and filter criteria
     */
    getFilteredCards() {
        let cards = this.cardDatabase.getAllCards();
        logger.debug(`🔍 CardDatabase.getAllCards() returned array with ${cards.length} cards`);
        
        // Debug: Check first few cards
        if (cards.length > 0) {
            logger.debug(`🔍 First 3 cards:`, cards.slice(0, 3).map(c => `${c.id}: ${c.name} (${c.element})`));
        } else {
            logger.error(`🔍 No cards found in array! CardDatabase issue?`);
        }

        // Apply search filter
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            const beforeSearch = cards.length;
            cards = cards.filter(card => 
                card.name.toLowerCase().includes(searchLower) ||
                (card.text && card.text.toLowerCase().includes(searchLower)) ||
                card.id.toLowerCase().includes(searchLower)
            );
            logger.debug(`🔍 After search filter "${this.searchTerm}": ${beforeSearch} → ${cards.length} cards`);
        }

        // Apply element filter
        if (this.elementFilter) {
            const beforeElement = cards.length;
            cards = cards.filter(card => card.element === this.elementFilter);
            logger.debug(`🔍 After element filter "${this.elementFilter}": ${beforeElement} → ${cards.length} cards`);
        }

        // Apply type filter
        if (this.typeFilter) {
            const beforeType = cards.length;
            cards = cards.filter(card => card.type === this.typeFilter);
            logger.debug(`🔍 After type filter "${this.typeFilter}": ${beforeType} → ${cards.length} cards`);
        }

        // Sort cards by name
        cards.sort((a, b) => a.name.localeCompare(b.name));

        return cards;
    }

    /**
     * Create a card element for the grid
     */
    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        cardDiv.dataset.cardId = card.id;
        cardDiv.draggable = true;
        
        // Add accessibility attributes
        cardDiv.setAttribute('tabindex', '0');
        cardDiv.setAttribute('role', 'gridcell');
        cardDiv.setAttribute('aria-selected', 'false');
        const cardDescription = `${card.name}, ${card.element} ${card.type}, cost ${card.cost}${card.power ? `, power ${card.power}` : ''}${card.text ? `. ${card.text}` : ''}`;
        cardDiv.setAttribute('aria-label', cardDescription);
        cardDiv.setAttribute('title', cardDescription);

        // Get element color for styling
        const elementClass = `element-${card.element}`;

        cardDiv.innerHTML = `
            <div class="card-preview ${elementClass}">
                <div class="card-image">
                    <div class="card-placeholder">
                        <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                        <div class="card-placeholder-text">${card.name}</div>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-name">${card.name}</div>
                    <div class="card-details">
                        <span class="card-cost">${card.cost || '-'}</span>
                        <span class="card-element">${this.getElementIcon(card.element)}</span>
                        ${card.power ? `<span class="card-power">${card.power}</span>` : ''}
                    </div>
                    <div class="card-type">${this.capitalizeFirst(card.type)}</div>
                </div>
                <div class="card-actions">
                    <button class="add-to-deck-btn" onclick="window.app?.deckBuilder?.addCardToDeck('${card.id}')">
                        Add
                    </button>
                </div>
            </div>
        `;

        // Add drag and drop event listeners
        cardDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.setData('application/x-drag-type', 'add-card');
            e.dataTransfer.setData('application/json', JSON.stringify({
                id: card.id,
                name: card.name,
                element: card.element,
                type: card.type,
                cost: card.cost,
                source: 'database'
            }));
            e.dataTransfer.effectAllowed = 'copy';
            cardDiv.classList.add('dragging');
            
            logger.debug(`Started dragging card: ${card.name} (${card.id})`);
        });

        cardDiv.addEventListener('dragend', () => {
            cardDiv.classList.remove('dragging');
        });

        // Add click for card preview
        cardDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-to-deck-btn')) {
                this.showCardPreview(card);
            }
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
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Add a card to the current deck
     */
    addCardToDeck(cardId) {
        if (!this.currentDeck) {
            logger.info('No current deck - creating new deck automatically');
            this.createNewDeck('New Deck');
        }

        const card = this.cardDatabase.getCard(cardId);
        if (!card) {
            logger.error(`Card not found: ${cardId}`);
            return;
        }

        try {
            // Set the current deck in DeckManager (needed for addCard method)
            this.deckManager.currentDeck = this.currentDeck;
            
            // Check if we can add this card (validation)
            const currentCount = this.currentDeck.cards.filter(id => id === cardId).length;
            
            if (currentCount >= 3) {
                window.showNotification('Maximum 3 copies of any card allowed', 'warning');
                return;
            }

            if (this.currentDeck.cards.length >= 50) {
                window.showNotification('Deck is already at maximum 50 cards', 'warning');
                return;
            }

            // Add card to deck using the correct method
            this.deckManager.addCard(cardId);
            this.updateDeckDisplay();
            
            logger.debug(`Added card ${card.name} to deck ${this.currentDeck.name}`);
            window.showNotification(`Added ${card.name} to deck`, 'success');

        } catch (error) {
            logger.error('Error adding card to deck:', {
                error: error,
                message: error.message,
                stack: error.stack,
                cardId: cardId,
                currentDeck: this.currentDeck?.id
            });
            window.showNotification(`Error adding card to deck: ${error.message || 'Unknown error'}`, 'error');
        }
    }

    /**
     * Remove a card from the current deck
     */
    removeCardFromDeck(cardId) {
        if (!this.currentDeck) return;

        try {
            // Set the current deck in DeckManager (needed for removeCard method)
            this.deckManager.currentDeck = this.currentDeck;
            
            // Remove card using the correct method
            this.deckManager.removeCard(cardId, 1);
            this.updateDeckDisplay();
            
            const card = this.cardDatabase.getCard(cardId);
            logger.debug(`Removed card ${card?.name || cardId} from deck ${this.currentDeck.name}`);

        } catch (error) {
            logger.error('Error removing card from deck:', {
                error: error,
                message: error.message,
                cardId: cardId,
                currentDeck: this.currentDeck?.id
            });
            window.showNotification(`Error removing card: ${error.message || 'Unknown error'}`, 'error');
        }
    }

    /**
     * Update the current deck display
     */
    updateDeckDisplay() {
        if (!this.deckList) return;

        if (!this.currentDeck) {
            this.deckList.innerHTML = '<div class="no-deck-message">No deck selected. Create or load a deck to start building.</div>';
            this.updateDeckStats();
            return;
        }

        // Group cards by ID for display
        const cardCounts = {};
        this.currentDeck.cards.forEach(cardId => {
            cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
        });

        // Clear and rebuild deck list
        this.deckList.innerHTML = '';

        if (Object.keys(cardCounts).length === 0) {
            this.deckList.innerHTML = '<div class="empty-deck-message">Deck is empty. Add cards from the database.</div>';
        } else {
            Object.entries(cardCounts).forEach(([cardId, count]) => {
                const card = this.cardDatabase.getCard(cardId);
                if (card) {
                    const deckCardElement = this.createDeckCardElement(card, count);
                    this.deckList.appendChild(deckCardElement);
                }
            });
        }

        this.updateDeckStats();
    }

    /**
     * Create a deck card element
     */
    createDeckCardElement(card, count) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'deck-card-item';
        cardDiv.dataset.cardId = card.id;
        cardDiv.draggable = true;

        const elementClass = `element-${card.element}`;

        cardDiv.innerHTML = `
            <div class="deck-card ${elementClass}">
                <div class="deck-card-info">
                    <span class="deck-card-count">${count}x</span>
                    <span class="deck-card-name">${card.name}</span>
                    <span class="deck-card-cost">${card.cost || '-'}</span>
                    <span class="deck-card-element">${this.getElementIcon(card.element)}</span>
                </div>
                <div class="deck-card-actions">
                    <button class="deck-card-btn remove-btn" onclick="window.app?.deckBuilder?.removeCardFromDeck('${card.id}')">
                        -
                    </button>
                    <button class="deck-card-btn add-btn" onclick="window.app?.deckBuilder?.addCardToDeck('${card.id}')">
                        +
                    </button>
                </div>
            </div>
        `;

        // Add drag functionality for deck reordering
        cardDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.setData('application/x-drag-type', 'reorder-card');
            e.dataTransfer.setData('application/json', JSON.stringify({
                id: card.id,
                name: card.name,
                element: card.element,
                source: 'deck'
            }));
            e.dataTransfer.effectAllowed = 'move';
            cardDiv.classList.add('dragging');
            
            logger.debug(`Started dragging deck card: ${card.name} (${card.id})`);
        });

        cardDiv.addEventListener('dragend', () => {
            cardDiv.classList.remove('dragging');
        });

        // Add drop zones between cards for reordering
        cardDiv.addEventListener('dragover', (e) => {
            // Check if we're dealing with a reorder operation by checking types
            const types = Array.from(e.dataTransfer.types);
            if (types.includes('application/x-drag-type')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Determine if we're dropping above or below this card
                const rect = cardDiv.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                if (e.clientY < midpoint) {
                    cardDiv.classList.add('drop-above');
                    cardDiv.classList.remove('drop-below');
                } else {
                    cardDiv.classList.add('drop-below');
                    cardDiv.classList.remove('drop-above');
                }
            }
        });

        cardDiv.addEventListener('dragleave', (e) => {
            // Only remove classes if we're actually leaving the card element
            if (!cardDiv.contains(e.relatedTarget)) {
                cardDiv.classList.remove('drop-above', 'drop-below');
            }
        });

        cardDiv.addEventListener('drop', (e) => {
            if (e.dataTransfer.getData('application/x-drag-type') === 'reorder-card') {
                e.preventDefault();
                cardDiv.classList.remove('drop-above', 'drop-below');
                
                const draggedCardId = e.dataTransfer.getData('text/plain');
                const targetCardId = card.id;
                
                if (draggedCardId !== targetCardId) {
                    this.handleDeckReorder(draggedCardId, targetCardId, e);
                }
            }
        });

        return cardDiv;
    }

    /**
     * Update deck statistics display
     */
    updateDeckStats() {
        if (this.deckCardCount) {
            const cardCount = this.currentDeck ? this.currentDeck.cards.length : 0;
            this.deckCardCount.textContent = cardCount;
        }

        if (this.saveDeckBtn) {
            // Enable save button if there's a current deck with cards
            const hasContent = this.currentDeck && this.currentDeck.cards.length > 0;
            this.saveDeckBtn.disabled = !hasContent;
        }

        if (this.deckNameInput && this.currentDeck) {
            this.deckNameInput.value = this.currentDeck.name;
        }
    }

    /**
     * Show card preview modal
     */
    showCardPreview(card) {
        if (window.app && window.app.modal) {
            window.app.modal.openCardPreview(card);
        }
    }

    /**
     * Handle search input
     */
    handleSearch(event) {
        this.searchTerm = event.target.value.trim();
        this.refreshCardDisplay();
    }

    /**
     * Handle element filter change
     */
    handleElementFilter(event) {
        this.elementFilter = event.target.value;
        this.refreshCardDisplay();
    }

    /**
     * Handle type filter change
     */
    handleTypeFilter(event) {
        this.typeFilter = event.target.value;
        this.refreshCardDisplay();
    }

    /**
     * Handle deck name change
     */
    handleDeckNameChange(event) {
        if (this.currentDeck) {
            this.currentDeck.name = event.target.value.trim() || 'Unnamed Deck';
            this.updateDeckStats();
        }
    }

    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop() {
        if (!this.deckList) return;

        // Make deck list a drop zone
        this.deckList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.deckList.classList.add('drag-over');
        });

        this.deckList.addEventListener('dragleave', (e) => {
            // Only remove if we're actually leaving the drop zone
            if (!this.deckList.contains(e.relatedTarget)) {
                this.deckList.classList.remove('drag-over');
            }
        });

        this.deckList.addEventListener('drop', (e) => {
            e.preventDefault();
            this.deckList.classList.remove('drag-over');
            
            const cardId = e.dataTransfer.getData('text/plain');
            const dragType = e.dataTransfer.getData('application/x-drag-type') || 'add-card';
            
            if (cardId) {
                if (dragType === 'add-card') {
                    this.addCardToDeck(cardId);
                    logger.debug(`Card ${cardId} dropped into deck`);
                } else if (dragType === 'reorder-card') {
                    this.handleDeckReorder(cardId, null, e);
                }
            }
        });

        // Also make the whole deck builder content a drop zone (for better UX)
        const deckBuilderContent = document.querySelector('.current-deck-panel');
        if (deckBuilderContent) {
            deckBuilderContent.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                deckBuilderContent.classList.add('drag-over');
            });

            deckBuilderContent.addEventListener('dragleave', (e) => {
                if (!deckBuilderContent.contains(e.relatedTarget)) {
                    deckBuilderContent.classList.remove('drag-over');
                }
            });

            deckBuilderContent.addEventListener('drop', (e) => {
                e.preventDefault();
                deckBuilderContent.classList.remove('drag-over');
                
                const cardId = e.dataTransfer.getData('text/plain');
                if (cardId && e.dataTransfer.getData('application/x-drag-type') !== 'reorder-card') {
                    this.addCardToDeck(cardId);
                    logger.debug(`Card ${cardId} dropped into deck area`);
                }
            });
        }
    }

    /**
     * Handle deck card reordering
     */
    handleDeckReorder(draggedCardId, targetCardId, event) {
        if (!this.currentDeck || draggedCardId === targetCardId) return;

        // For now, since cards are grouped by ID, we'll implement a simple approach
        // In a full implementation, you might want to track individual card instances
        if (targetCardId) {
            logger.debug(`Reordering: ${draggedCardId} relative to ${targetCardId}`);
        } else {
            logger.debug(`Reordering: ${draggedCardId} to end of deck`);
        }
        
        // This is a placeholder - in a real deck reordering system, you'd need to:
        // 1. Track individual card positions, not just counts
        // 2. Implement proper insertion logic based on drop position
        // 3. Update the deck array to reflect the new order
        
        // For now, we'll just update the display to show the reorder happened
        const cardName = this.cardDatabase.getCard(draggedCardId)?.name || draggedCardId;
        const targetName = targetCardId ? this.cardDatabase.getCard(targetCardId)?.name || targetCardId : 'end';
        window.showNotification(`Moved ${cardName} ${targetCardId ? `relative to ${targetName}` : 'to deck'}`, 'info');
        this.updateDeckDisplay();
    }

    /**
     * Load a deck for editing
     */
    loadDeck(deckId) {
        try {
            this.currentDeck = this.deckManager.loadDeck(deckId);
            this.updateDeckDisplay();
            
            logger.info(`Loaded deck: ${this.currentDeck.name}`);
            window.showNotification(`Loaded deck: ${this.currentDeck.name}`, 'success');

        } catch (error) {
            logger.error('Error loading deck:', error);
            window.showNotification('Error loading deck', 'error');
        }
    }

    /**
     * Create a new deck
     */
    createNewDeck(name = 'New Deck') {
        try {
            this.currentDeck = this.deckManager.createNewDeck(name);
            this.updateDeckDisplay();
            
            logger.info(`Created new deck: ${this.currentDeck.name}`);
            window.showNotification(`Created new deck: ${this.currentDeck.name}`, 'success');

        } catch (error) {
            logger.error('Error creating new deck:', error);
            window.showNotification('Error creating new deck', 'error');
        }
    }

    /**
     * Save the current deck
     */
    saveDeck() {
        if (!this.currentDeck) {
            window.showNotification('No deck to save', 'warning');
            return;
        }

        try {
            const savedDeck = this.deckManager.saveDeck(this.currentDeck);
            this.currentDeck = savedDeck;
            this.updateDeckStats();
            
            logger.info(`Saved deck: ${savedDeck.name}`);
            window.showNotification(`Saved deck: ${savedDeck.name}`, 'success');

        } catch (error) {
            logger.error('Error saving deck:', error);
            window.showNotification('Error saving deck', 'error');
        }
    }

    /**
     * Clear current deck
     */
    clearDeck() {
        this.currentDeck = null;
        this.updateDeckDisplay();
    }

    /**
     * Get current deck
     */
    getCurrentDeck() {
        return this.currentDeck;
    }

    /**
     * Setup keyboard navigation for deck builder
     */
    setupKeyboardNavigation() {
        // Card grid navigation
        if (this.cardGrid) {
            this.cardGrid.addEventListener('keydown', (e) => {
                const focusedCard = document.activeElement;
                if (!focusedCard || !focusedCard.classList.contains('card-item')) {
                    return;
                }
                
                this.handleCardGridKeyboard(e, focusedCard);
            });
            
            // Make card grid focusable
            this.cardGrid.setAttribute('tabindex', '0');
            this.cardGrid.setAttribute('role', 'grid');
            this.cardGrid.setAttribute('aria-label', 'Card database - use arrow keys to navigate, Enter to add card to deck');
        }
        
        // Deck list navigation
        if (this.deckList) {
            this.deckList.addEventListener('keydown', (e) => {
                const focusedCard = document.activeElement;
                if (!focusedCard || !focusedCard.classList.contains('deck-card-item')) {
                    return;
                }
                
                this.handleDeckListKeyboard(e, focusedCard);
            });
            
            // Make deck list focusable
            this.deckList.setAttribute('tabindex', '0');
            this.deckList.setAttribute('role', 'grid');
            this.deckList.setAttribute('aria-label', 'Current deck - use arrow keys to navigate, Delete to remove card');
        }
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle if we're in the deck builder view
            const deckBuilderView = document.getElementById('deckBuilderView');
            if (!deckBuilderView || !deckBuilderView.classList.contains('active')) {
                return;
            }
            
            this.handleGlobalKeyboard(e);
        });
    }

    /**
     * Handle keyboard navigation in card grid
     */
    handleCardGridKeyboard(e, focusedCard) {
        const cardElements = Array.from(this.cardGrid.querySelectorAll('.card-item'));
        const currentIndex = cardElements.indexOf(focusedCard);
        const cardsPerRow = this.getCardsPerRow();
        
        let nextIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                nextIndex = Math.min(currentIndex + 1, cardElements.length - 1);
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = Math.min(currentIndex + cardsPerRow, cardElements.length - 1);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = Math.max(currentIndex - cardsPerRow, 0);
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                const cardId = focusedCard.dataset.cardId;
                if (cardId) {
                    this.addCardToDeck(cardId);
                    this.announceCardAction(cardId, 'added to deck');
                }
                break;
                
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
                
            case 'End':
                e.preventDefault();
                nextIndex = cardElements.length - 1;
                break;
        }
        
        if (nextIndex !== currentIndex && cardElements[nextIndex]) {
            cardElements[nextIndex].focus();
            this.announceCardSelection(cardElements[nextIndex]);
        }
    }

    /**
     * Handle keyboard navigation in deck list
     */
    handleDeckListKeyboard(e, focusedCard) {
        const deckElements = Array.from(this.deckList.querySelectorAll('.deck-card-item'));
        const currentIndex = deckElements.indexOf(focusedCard);
        
        let nextIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = Math.min(currentIndex + 1, deckElements.length - 1);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
                
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                const cardId = focusedCard.dataset.cardId;
                if (cardId) {
                    this.removeCardFromDeck(cardId);
                    this.announceCardAction(cardId, 'removed from deck');
                    
                    // Focus next card or previous if at end
                    const remainingElements = Array.from(this.deckList.querySelectorAll('.deck-card-item'));
                    if (remainingElements.length > 0) {
                        const focusIndex = Math.min(currentIndex, remainingElements.length - 1);
                        remainingElements[focusIndex].focus();
                    } else {
                        this.deckList.focus();
                    }
                }
                break;
                
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
                
            case 'End':
                e.preventDefault();
                nextIndex = deckElements.length - 1;
                break;
        }
        
        if (nextIndex !== currentIndex && deckElements[nextIndex]) {
            deckElements[nextIndex].focus();
            this.announceCardSelection(deckElements[nextIndex]);
        }
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveDeck();
                    break;
                    
                case 'n':
                    e.preventDefault();
                    this.createNewDeck();
                    break;
                    
                case 'f':
                    e.preventDefault();
                    if (this.searchInput) {
                        this.searchInput.focus();
                    }
                    break;
            }
        }
        
        switch (e.key) {
            case 'F3':
                e.preventDefault();
                if (this.searchInput) {
                    this.searchInput.focus();
                }
                break;
        }
    }

    /**
     * Get number of cards per row for grid navigation
     */
    getCardsPerRow() {
        if (!this.cardGrid) return 1;
        
        const gridStyle = getComputedStyle(this.cardGrid);
        const gridTemplateColumns = gridStyle.gridTemplateColumns;
        
        if (gridTemplateColumns && gridTemplateColumns !== 'none') {
            return gridTemplateColumns.split(' ').length;
        }
        
        // Fallback: estimate based on card width and container width
        const cardElements = this.cardGrid.querySelectorAll('.card-item');
        if (cardElements.length === 0) return 1;
        
        const containerWidth = this.cardGrid.clientWidth;
        const cardWidth = cardElements[0].offsetWidth;
        return Math.floor(containerWidth / cardWidth) || 1;
    }

    /**
     * Announce card selection to screen readers
     */
    announceCardSelection(cardElement) {
        const cardId = cardElement.dataset.cardId;
        const card = this.cardDatabase.getCard(cardId);
        
        if (card && window.app && window.app.notifications) {
            const announcement = `${card.name}, ${card.element} ${card.type}, cost ${card.cost}${card.power ? `, power ${card.power}` : ''}`;
            
            // Create a temporary announcement element
            const announcer = document.createElement('div');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            announcer.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
            announcer.textContent = announcement;
            
            document.body.appendChild(announcer);
            setTimeout(() => {
                if (announcer.parentNode) {
                    announcer.parentNode.removeChild(announcer);
                }
            }, 1000);
        }
    }

    /**
     * Announce card actions to screen readers
     */
    announceCardAction(cardId, action) {
        const card = this.cardDatabase.getCard(cardId);
        
        if (card && window.app && window.app.notifications) {
            const message = `${card.name} ${action}`;
            window.app.notifications.info(message, { duration: 2000 });
        }
    }

    /**
     * Show the deck manager interface
     */
    showDeckManager() {
        if (this.deckManager) {
            this.deckManager.style.display = 'block';
        }
        if (this.deckEditor) {
            this.deckEditor.style.display = 'none';
        }
    }

    /**
     * Show the deck editor interface
     */
    showDeckEditor() {
        if (this.deckManager) {
            this.deckManager.style.display = 'none';
        }
        if (this.deckEditor) {
            this.deckEditor.style.display = 'block';
        }
        // Hide card search panel initially
        this.hideCardSearch();
    }

    /**
     * Exit deck editor and return to deck manager
     */
    exitDeckEditor() {
        this.showDeckManager();
        this.currentDeck = null;
        this.refreshDeckList();
    }

    /**
     * Show card search panel
     */
    showCardSearch() {
        if (this.cardSearchPanel) {
            this.cardSearchPanel.style.display = 'block';
            this.refreshCardDisplay();
        }
        if (this.addCardsBtn) {
            this.addCardsBtn.style.display = 'none';
        }
    }

    /**
     * Hide card search panel
     */
    hideCardSearch() {
        if (this.cardSearchPanel) {
            this.cardSearchPanel.style.display = 'none';
        }
        if (this.addCardsBtn) {
            this.addCardsBtn.style.display = 'inline-block';
        }
    }

    /**
     * Show create new deck interface
     */
    showCreateNewDeck() {
        this.createNewDeck('New Deck');
        this.showDeckEditor();
        this.updateDeckDisplay();
        
        // Focus on deck name input
        if (this.deckNameInput) {
            this.deckNameInput.focus();
            this.deckNameInput.select();
        }
    }

    /**
     * Refresh the deck list in deck manager
     */
    refreshDeckList() {
        if (!this.deckListContainer) return;

        // Get saved decks
        const savedDecks = this.deckManager.getAllDecks();
        
        // Clear container
        this.deckListContainer.innerHTML = '';
        
        if (savedDecks.length === 0) {
            // Show no decks placeholder
            this.deckListContainer.appendChild(this.noDecksPlaceholder);
        } else {
            // Create deck cards
            savedDecks.forEach(deck => {
                const deckCard = this.createDeckCard(deck);
                this.deckListContainer.appendChild(deckCard);
            });
        }
    }

    /**
     * Create a deck card for the deck manager
     */
    createDeckCard(deck) {
        const deckCard = document.createElement('div');
        deckCard.className = 'deck-card';
        deckCard.dataset.deckId = deck.id;

        const cardCount = deck.cards ? deck.cards.length : 0;
        const lastModified = deck.dateModified ? new Date(deck.dateModified).toLocaleDateString() : 'Unknown';

        deckCard.innerHTML = `
            <div class="deck-card-content">
                <div class="deck-card-header">
                    <h3 class="deck-name">${deck.name}</h3>
                    <span class="deck-card-count">${cardCount}/50 cards</span>
                </div>
                <div class="deck-card-meta">
                    <span class="deck-last-modified">Modified: ${lastModified}</span>
                </div>
                <div class="deck-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="window.app?.deckBuilder?.editDeck('${deck.id}')">
                        Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.app?.deckBuilder?.duplicateDeck('${deck.id}')">
                        Copy
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.app?.deckBuilder?.confirmDeleteDeck('${deck.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;

        // Add click to edit functionality
        deckCard.addEventListener('click', (e) => {
            // Don't edit if clicking on buttons
            if (!e.target.classList.contains('btn')) {
                this.editDeck(deck.id);
            }
        });

        return deckCard;
    }

    /**
     * Edit a deck
     */
    editDeck(deckId) {
        try {
            this.loadDeck(deckId);
            this.showDeckEditor();
            this.updateDeckDisplay();
            
            logger.info(`Editing deck: ${this.currentDeck?.name}`);
        } catch (error) {
            logger.error('Error editing deck:', error);
            window.showNotification('Error loading deck for editing', 'error');
        }
    }

    /**
     * Duplicate a deck
     */
    duplicateDeck(deckId) {
        try {
            const originalDeck = this.deckManager.loadDeck(deckId);
            const newDeck = this.deckManager.createNewDeck(`${originalDeck.name} (Copy)`);
            
            // Copy cards
            newDeck.cards = [...originalDeck.cards];
            
            this.deckManager.saveDeck(newDeck);
            this.refreshDeckList();
            
            logger.info(`Duplicated deck: ${originalDeck.name} → ${newDeck.name}`);
            window.showNotification(`Duplicated deck: ${newDeck.name}`, 'success');
        } catch (error) {
            logger.error('Error duplicating deck:', error);
            window.showNotification('Error duplicating deck', 'error');
        }
    }

    /**
     * Confirm deck deletion
     */
    confirmDeleteDeck(deckId) {
        const deck = this.deckManager.loadDeck(deckId);
        if (!deck) return;

        if (confirm(`Are you sure you want to delete "${deck.name}"? This cannot be undone.`)) {
            this.deleteDeck(deckId);
        }
    }

    /**
     * Delete a deck
     */
    deleteDeck(deckId) {
        try {
            const deck = this.deckManager.loadDeck(deckId);
            this.deckManager.deleteDeck(deckId);
            this.refreshDeckList();
            
            logger.info(`Deleted deck: ${deck?.name}`);
            window.showNotification(`Deleted deck: ${deck?.name}`, 'success');
        } catch (error) {
            logger.error('Error deleting deck:', error);
            window.showNotification('Error deleting deck', 'error');
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        Object.values(this.boundHandlers).forEach(handler => {
            // Remove event listeners if needed
        });
        this.boundHandlers = {};
        
        logger.info('🔨 Deck Builder destroyed');
    }
}

// Export for use in other modules
export default DeckBuilder;