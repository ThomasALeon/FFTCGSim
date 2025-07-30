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
        this.loadInitialData();
        
        logger.info('🔨 Deck Builder initialized');
    }

    /**
     * Set up UI element references
     */
    setupUIElements() {
        this.cardGrid = document.getElementById('cardDatabase');
        this.deckList = document.getElementById('currentDeck');
        this.searchInput = document.getElementById('cardSearch');
        this.elementSelect = document.getElementById('elementFilter');
        this.typeSelect = document.getElementById('typeFilter');
        this.deckNameInput = document.getElementById('deckName');
        this.deckCardCount = document.getElementById('deckCardCount');
        this.saveDeckBtn = document.getElementById('saveDeckBtn');
        
        if (!this.cardGrid || !this.deckList) {
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
    }

    /**
     * Load initial data and display
     */
    loadInitialData() {
        // Debug: Log card database info
        const allCards = this.cardDatabase.getAllCards();
        logger.info(`🔍 DeckBuilder loaded with ${allCards.length} cards from database`);
        
        // Debug: Log element breakdown
        const elementCounts = {};
        allCards.forEach(card => {
            elementCounts[card.element] = (elementCounts[card.element] || 0) + 1;
        });
        logger.info('🔍 Cards by element:', elementCounts);
        
        this.refreshCardDisplay();
        this.updateDeckDisplay();
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
            e.dataTransfer.effectAllowed = 'copy';
            cardDiv.classList.add('dragging');
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