/**
 * DECK MANAGER - Final Fantasy TCG Deck Management
 * 
 * This module handles:
 * - Creating and editing decks
 * - Saving and loading deck lists
 * - Deck validation according to FFTCG rules
 * - Import/export functionality
 * - Deck statistics and analysis
 * - Quick deck building tools
 */

import { LocalStorage } from '../utils/LocalStorage.js';
import { validate } from '../utils/Validation.js';

/**
 * DeckManager Class
 * Manages deck creation, storage, and validation
 */
export class DeckManager {
    constructor(cardDatabase = null) {
        // Dependencies
        this.cardDatabase = cardDatabase;

        // Storage key
        this.STORAGE_KEY = 'fftcg_saved_decks';

        // Deck storage
        this.decks = new Map();
        this.currentDeck = null;

        // Event listeners
        this.listeners = new Map();

        // Deck format version for compatibility
        this.DECK_FORMAT_VERSION = '1.0';

        // Initialize
        this.loadDecks();
    }

    /**
     * Set card database reference
     */
    setCardDatabase(cardDatabase) {
        this.cardDatabase = cardDatabase;
    }

    /**
     * Load saved decks from local storage
     */
    loadDecks() {
        try {
            const savedDecks = LocalStorage.get(this.STORAGE_KEY);
            
            if (savedDecks && Array.isArray(savedDecks)) {
                this.decks.clear();
                
                savedDecks.forEach(deckData => {
                    // Validate and migrate deck format if needed
                    const deck = this.migrateDeckFormat(deckData);
                    if (this.validateDeckData(deck)) {
                        this.decks.set(deck.id, deck);
                    }
                });
                
                console.log(`📚 Loaded ${this.decks.size} saved decks`);
            }
        } catch (error) {
            console.error('Failed to load saved decks:', error);
        }
    }

    /**
     * Save all decks to local storage
     */
    saveDecks() {
        try {
            const deckArray = Array.from(this.decks.values());
            LocalStorage.set(this.STORAGE_KEY, deckArray);
            console.log(`💾 Saved ${deckArray.length} decks`);
        } catch (error) {
            console.error('Failed to save decks:', error);
            throw error;
        }
    }

    /**
     * Create a new empty deck
     */
    createNewDeck(name = 'New Deck') {
        const deck = {
            id: this.generateDeckId(),
            name: name,
            description: '',
            cards: [], // Array of card IDs
            mainDeck: [], // Main deck (50 cards)
            lbDeck: [], // Limit Break deck (0-8 cards)
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: this.DECK_FORMAT_VERSION,
            tags: [],
            isPublic: false,
            author: null,
            stats: {
                gamesPlayed: 0,
                wins: 0,
                losses: 0
            }
        };

        this.currentDeck = deck;
        this.emit('deckCreated', deck);
        
        console.log(`🆕 Created new deck: ${name}`);
        return deck;
    }

    /**
     * Generate unique deck ID
     */
    generateDeckId() {
        return 'deck_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Save a deck
     */
    saveDeck(deck = null) {
        const deckToSave = deck || this.currentDeck;
        
        if (!deckToSave) {
            throw new Error('No deck to save');
        }

        // Validate deck name
        if (!deckToSave.name || deckToSave.name.trim().length === 0) {
            throw new Error('Deck name is required');
        }

        // Update timestamp
        deckToSave.updatedAt = new Date().toISOString();

        // Consolidate cards into mainDeck and lbDeck
        this.consolidateCards(deckToSave);

        // Store deck
        this.decks.set(deckToSave.id, { ...deckToSave });
        
        // Save to storage
        this.saveDecks();
        
        this.emit('deckSaved', deckToSave);
        console.log(`💾 Deck saved: ${deckToSave.name}`);
        
        return deckToSave;
    }

    /**
     * Consolidate card list into main deck and LB deck
     */
    consolidateCards(deck) {
        if (!this.cardDatabase) {
            console.warn('Card database not available for deck consolidation');
            return;
        }

        const mainDeckCards = [];
        const lbDeckCards = [];

        deck.cards.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                // Check if card has Limit Break ability
                if (this.isLimitBreakCard(card)) {
                    lbDeckCards.push(cardId);
                } else {
                    mainDeckCards.push(cardId);
                }
            }
        });

        deck.mainDeck = mainDeckCards;
        deck.lbDeck = lbDeckCards;
    }

    /**
     * Check if a card is a Limit Break card
     */
    isLimitBreakCard(card) {
        return card.text && card.text.includes('Limit Break');
    }

    /**
     * Load a deck by ID
     */
    loadDeck(deckId) {
        const deck = this.decks.get(deckId);
        
        if (!deck) {
            throw new Error(`Deck not found: ${deckId}`);
        }

        this.currentDeck = { ...deck };
        this.emit('deckLoaded', this.currentDeck);
        
        console.log(`📂 Loaded deck: ${deck.name}`);
        return this.currentDeck;
    }

    /**
     * Delete a deck
     */
    deleteDeck(deckId) {
        const deck = this.decks.get(deckId);
        
        if (!deck) {
            throw new Error(`Deck not found: ${deckId}`);
        }

        this.decks.delete(deckId);
        this.saveDecks();
        
        // Clear current deck if it was deleted
        if (this.currentDeck && this.currentDeck.id === deckId) {
            this.currentDeck = null;
        }
        
        this.emit('deckDeleted', { id: deckId, name: deck.name });
        console.log(`🗑️ Deleted deck: ${deck.name}`);
        
        return true;
    }

    /**
     * Duplicate a deck
     */
    duplicateDeck(deckId, newName = null) {
        const originalDeck = this.decks.get(deckId);
        
        if (!originalDeck) {
            throw new Error(`Deck not found: ${deckId}`);
        }

        const duplicatedDeck = {
            ...originalDeck,
            id: this.generateDeckId(),
            name: newName || `${originalDeck.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                gamesPlayed: 0,
                wins: 0,
                losses: 0
            }
        };

        this.decks.set(duplicatedDeck.id, duplicatedDeck);
        this.saveDecks();
        
        this.emit('deckDuplicated', { original: originalDeck, duplicate: duplicatedDeck });
        console.log(`📋 Duplicated deck: ${originalDeck.name} → ${duplicatedDeck.name}`);
        
        return duplicatedDeck;
    }

    /**
     * Add card to current deck
     */
    addCard(cardId, quantity = 1) {
        if (!this.currentDeck) {
            throw new Error('No deck selected');
        }

        if (!this.cardDatabase) {
            throw new Error('Card database not available');
        }

        const card = this.cardDatabase.getCard(cardId);
        if (!card) {
            throw new Error(`Card not found: ${cardId}`);
        }

        // Add cards (respecting the 3-copy limit)
        for (let i = 0; i < quantity; i++) {
            const currentCount = this.currentDeck.cards.filter(id => id === cardId).length;
            
            if (currentCount >= 3) {
                console.warn(`Cannot add more copies of ${card.name} (3 copy limit)`);
                break;
            }

            if (this.currentDeck.cards.length >= 50) {
                console.warn('Deck is full (50 card limit)');
                break;
            }

            this.currentDeck.cards.push(cardId);
        }

        this.currentDeck.updatedAt = new Date().toISOString();
        this.emit('cardAdded', { card, deck: this.currentDeck });
        
        return this.currentDeck;
    }

    /**
     * Remove card from current deck
     */
    removeCard(cardId, quantity = 1) {
        if (!this.currentDeck) {
            throw new Error('No deck selected');
        }

        // Remove specified quantity
        for (let i = 0; i < quantity; i++) {
            const index = this.currentDeck.cards.indexOf(cardId);
            if (index > -1) {
                this.currentDeck.cards.splice(index, 1);
            } else {
                break;
            }
        }

        this.currentDeck.updatedAt = new Date().toISOString();
        this.emit('cardRemoved', { cardId, deck: this.currentDeck });
        
        return this.currentDeck;
    }

    /**
     * Get card count in current deck
     */
    getCardCount(cardId) {
        if (!this.currentDeck) {
            return 0;
        }

        return this.currentDeck.cards.filter(id => id === cardId).length;
    }

    /**
     * Clear current deck
     */
    clearDeck() {
        if (!this.currentDeck) {
            return;
        }

        this.currentDeck.cards = [];
        this.currentDeck.mainDeck = [];
        this.currentDeck.lbDeck = [];
        this.currentDeck.updatedAt = new Date().toISOString();
        
        this.emit('deckCleared', this.currentDeck);
        console.log('🧹 Deck cleared');
    }

    /**
     * Validate current deck
     */
    validateCurrentDeck() {
        if (!this.currentDeck) {
            return { isValid: false, errors: ['No deck selected'] };
        }

        return this.validateDeck(this.currentDeck);
    }

    /**
     * Validate deck according to FFTCG rules
     */
    validateDeck(deck) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!this.cardDatabase) {
            validation.errors.push('Card database not available');
            validation.isValid = false;
            return validation;
        }

        // Use card database validation
        const dbValidation = this.cardDatabase.validateDeck(deck.cards);
        
        return dbValidation;
    }

    /**
     * Get deck statistics
     */
    getDeckStats(deck = null) {
        const targetDeck = deck || this.currentDeck;
        
        if (!targetDeck || !this.cardDatabase) {
            return null;
        }

        const cards = targetDeck.cards
            .map(cardId => this.cardDatabase.getCard(cardId))
            .filter(Boolean);

        const stats = {
            totalCards: cards.length,
            elementDistribution: {},
            typeDistribution: {},
            costCurve: {},
            rarityDistribution: {},
            averageCost: 0,
            powerDistribution: {
                min: null,
                max: null,
                average: 0
            }
        };

        let totalCost = 0;
        let totalPower = 0;
        let powerCardCount = 0;

        cards.forEach(card => {
            // Element distribution
            stats.elementDistribution[card.element] = 
                (stats.elementDistribution[card.element] || 0) + 1;

            // Type distribution  
            stats.typeDistribution[card.type] = 
                (stats.typeDistribution[card.type] || 0) + 1;

            // Cost curve
            stats.costCurve[card.cost] = (stats.costCurve[card.cost] || 0) + 1;
            totalCost += card.cost;

            // Rarity distribution
            if (card.rarity) {
                stats.rarityDistribution[card.rarity] = 
                    (stats.rarityDistribution[card.rarity] || 0) + 1;
            }

            // Power statistics (only for cards with power)
            if (card.power) {
                if (stats.powerDistribution.min === null || card.power < stats.powerDistribution.min) {
                    stats.powerDistribution.min = card.power;
                }
                if (stats.powerDistribution.max === null || card.power > stats.powerDistribution.max) {
                    stats.powerDistribution.max = card.power;
                }
                totalPower += card.power;
                powerCardCount++;
            }
        });

        // Calculate averages
        stats.averageCost = cards.length > 0 ? totalCost / cards.length : 0;
        stats.powerDistribution.average = powerCardCount > 0 ? totalPower / powerCardCount : 0;

        return stats;
    }

    /**
     * Export deck to various formats
     */
    exportDeck(deckId, format = 'json') {
        const deck = this.decks.get(deckId);
        
        if (!deck) {
            throw new Error(`Deck not found: ${deckId}`);
        }

        switch (format.toLowerCase()) {
            case 'json':
                return this.exportDeckJSON(deck);
            
            case 'text':
                return this.exportDeckText(deck);
            
            case 'csv':
                return this.exportDeckCSV(deck);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export deck as JSON
     */
    exportDeckJSON(deck) {
        return JSON.stringify(deck, null, 2);
    }

    /**
     * Export deck as text list
     */
    exportDeckText(deck) {
        if (!this.cardDatabase) {
            return 'Card database not available';
        }

        let text = `# ${deck.name}\n`;
        if (deck.description) {
            text += `# ${deck.description}\n`;
        }
        text += `# Created: ${new Date(deck.createdAt).toLocaleDateString()}\n\n`;

        // Count cards
        const cardCounts = new Map();
        deck.cards.forEach(cardId => {
            cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
        });

        // Group by type
        const cardsByType = new Map();
        cardCounts.forEach((count, cardId) => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                if (!cardsByType.has(card.type)) {
                    cardsByType.set(card.type, []);
                }
                cardsByType.get(card.type).push({ card, count });
            }
        });

        // Export each type section
        ['forward', 'backup', 'summon', 'monster'].forEach(type => {
            const cards = cardsByType.get(type);
            if (cards && cards.length > 0) {
                text += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`;
                cards
                    .sort((a, b) => a.card.name.localeCompare(b.card.name))
                    .forEach(({ card, count }) => {
                        text += `${count}x ${card.name}\n`;
                    });
                text += '\n';
            }
        });

        return text;
    }

    /**
     * Export deck as CSV
     */
    exportDeckCSV(deck) {
        if (!this.cardDatabase) {
            return 'Card database not available';
        }

        let csv = 'Quantity,Name,Element,Type,Cost,Power,Job,Category,Rarity,Set\n';

        // Count cards
        const cardCounts = new Map();
        deck.cards.forEach(cardId => {
            cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
        });

        cardCounts.forEach((count, cardId) => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                csv += `${count},"${card.name}","${card.element}","${card.type}",${card.cost},${card.power || ''},"${card.job || ''}","${card.category || ''}","${card.rarity || ''}","${card.set || ''}"\n`;
            }
        });

        return csv;
    }

    /**
     * Import deck from text or JSON
     */
    importDeck(data, format = 'auto') {
        try {
            let deckData;

            if (format === 'auto') {
                // Try to detect format
                data = data.trim();
                if (data.startsWith('{')) {
                    format = 'json';
                } else {
                    format = 'text';
                }
            }

            switch (format) {
                case 'json':
                    deckData = JSON.parse(data);
                    break;
                
                case 'text':
                    deckData = this.parseDeckText(data);
                    break;
                
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }

            // Validate imported data
            if (!this.validateDeckData(deckData)) {
                throw new Error('Invalid deck data structure');
            }

            // Create new deck with imported data
            const importedDeck = {
                ...deckData,
                id: this.generateDeckId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                name: deckData.name || 'Imported Deck'
            };

            this.decks.set(importedDeck.id, importedDeck);
            this.saveDecks();
            
            this.emit('deckImported', importedDeck);
            console.log(`📥 Imported deck: ${importedDeck.name}`);
            
            return importedDeck;

        } catch (error) {
            console.error('Failed to import deck:', error);
            throw new Error(`Import failed: ${error.message}`);
        }
    }

    /**
     * Parse deck from text format
     */
    parseDeckText(text) {
        if (!this.cardDatabase) {
            throw new Error('Card database not available for text parsing');
        }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const cards = [];
        let deckName = 'Imported Deck';
        let deckDescription = '';

        lines.forEach(line => {
            // Skip comments and empty lines
            if (line.startsWith('#') || line.startsWith('//') || line === '') {
                if (line.includes('#') && !deckName) {
                    deckName = line.replace('#', '').trim();
                }
                return;
            }

            // Parse card lines (format: "3x Card Name" or "3 Card Name")
            const match = line.match(/^(\d+)x?\s+(.+)$/);
            if (match) {
                const quantity = parseInt(match[1]);
                const cardName = match[2].trim();

                // Find card by name
                const matchingCards = this.cardDatabase.searchCards(cardName);
                const exactMatch = matchingCards.find(card => 
                    card.name.toLowerCase() === cardName.toLowerCase()
                );

                if (exactMatch) {
                    for (let i = 0; i < quantity; i++) {
                        cards.push(exactMatch.id);
                    }
                } else {
                    console.warn(`Card not found: ${cardName}`);
                }
            }
        });

        return {
            name: deckName,
            description: deckDescription,
            cards: cards,
            mainDeck: [],
            lbDeck: [],
            version: this.DECK_FORMAT_VERSION,
            tags: [],
            isPublic: false,
            stats: {
                gamesPlayed: 0,
                wins: 0,
                losses: 0
            }
        };
    }

    /**
     * Validate deck data structure
     */
    validateDeckData(deckData) {
        if (!deckData || typeof deckData !== 'object') {
            return false;
        }

        const required = ['name', 'cards'];
        return required.every(field => deckData.hasOwnProperty(field));
    }

    /**
     * Migrate deck format for compatibility
     */
    migrateDeckFormat(deckData) {
        // Handle version migration if needed
        if (!deckData.version || deckData.version < this.DECK_FORMAT_VERSION) {
            // Add new fields with defaults
            const migrated = {
                ...deckData,
                version: this.DECK_FORMAT_VERSION,
                mainDeck: deckData.mainDeck || [],
                lbDeck: deckData.lbDeck || [],
                tags: deckData.tags || [],
                isPublic: deckData.isPublic || false,
                stats: deckData.stats || {
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0
                }
            };

            console.log(`🔄 Migrated deck format: ${deckData.name}`);
            return migrated;
        }

        return deckData;
    }

    /**
     * Get all saved decks
     */
    getAllDecks() {
        return Array.from(this.decks.values());
    }

    /**
     * Get current deck
     */
    getCurrentDeck() {
        return this.currentDeck;
    }

    /**
     * Get deck count
     */
    getDeckCount() {
        return this.decks.size;
    }

    /**
     * Search decks by name or tags
     */
    searchDecks(query) {
        const searchTerm = query.toLowerCase().trim();
        
        return Array.from(this.decks.values()).filter(deck =>
            deck.name.toLowerCase().includes(searchTerm) ||
            deck.description.toLowerCase().includes(searchTerm) ||
            (deck.tags && deck.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }

    /**
     * Get decks by element
     */
    getDecksByElement(element) {
        if (!this.cardDatabase) {
            return [];
        }

        return Array.from(this.decks.values()).filter(deck => {
            const stats = this.getDeckStats(deck);
            return stats && stats.elementDistribution[element] > 0;
        });
    }

    /**
     * Update deck stats after a game
     */
    updateDeckGameStats(deckId, gameResult) {
        const deck = this.decks.get(deckId);
        
        if (!deck) {
            console.warn(`Deck not found for stats update: ${deckId}`);
            return;
        }

        deck.stats.gamesPlayed++;
        
        switch (gameResult.outcome) {
            case 'win':
                deck.stats.wins++;
                break;
            case 'loss':
                deck.stats.losses++;
                break;
        }

        deck.updatedAt = new Date().toISOString();
        this.saveDecks();
        
        this.emit('deckStatsUpdated', { deck, gameResult });
    }

    /**
     * Generate random deck based on constraints
     */
    generateRandomDeck(constraints = {}) {
        if (!this.cardDatabase) {
            throw new Error('Card database not available');
        }

        const {
            elements = ['fire'], // Default to fire element
            minCost = 1,
            maxCost = 7,
            forwardCount = 20,
            backupCount = 15,
            summonCount = 10,
            monsterCount = 5
        } = constraints;

        const deck = this.createNewDeck('Random Deck');
        
        // Add forwards
        const forwards = this.cardDatabase.searchCards('', {
            type: 'forward',
            costMin: minCost,
            costMax: maxCost
        }).filter(card => elements.includes(card.element));
        
        this.addRandomCards(deck, forwards, forwardCount);

        // Add backups
        const backups = this.cardDatabase.searchCards('', {
            type: 'backup',
            costMin: minCost,
            costMax: maxCost
        }).filter(card => elements.includes(card.element));
        
        this.addRandomCards(deck, backups, backupCount);

        // Add summons
        const summons = this.cardDatabase.searchCards('', {
            type: 'summon',
            costMin: minCost,
            costMax: maxCost
        }).filter(card => elements.includes(card.element));
        
        this.addRandomCards(deck, summons, summonCount);

        // Add monsters if available
        const monsters = this.cardDatabase.searchCards('', {
            type: 'monster',
            costMin: minCost,
            costMax: maxCost
        }).filter(card => elements.includes(card.element));
        
        this.addRandomCards(deck, monsters, monsterCount);

        console.log(`🎲 Generated random deck with ${deck.cards.length} cards`);
        return deck;
    }

    /**
     * Add random cards to deck
     */
    addRandomCards(deck, cardPool, count) {
        const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < count && deck.cards.length < 50; i++) {
            if (shuffled.length === 0) break;
            
            const card = shuffled[i % shuffled.length];
            const currentCount = deck.cards.filter(id => id === card.id).length;
            
            if (currentCount < 3) {
                deck.cards.push(card.id);
            }
        }
    }

    /**
     * Get deck building suggestions
     */
    getDeckSuggestions(deck = null) {
        const targetDeck = deck || this.currentDeck;
        
        if (!targetDeck || !this.cardDatabase) {
            return [];
        }

        const suggestions = [];
        const stats = this.getDeckStats(targetDeck);
        const validation = this.validateDeck(targetDeck);

        // Suggest cards based on current deck composition
        if (stats) {
            const primaryElement = Object.keys(stats.elementDistribution)
                .reduce((a, b) => stats.elementDistribution[a] > stats.elementDistribution[b] ? a : b);

            // Suggest more cards from primary element
            const elementCards = this.cardDatabase.getCardsByElement(primaryElement)
                .filter(card => !targetDeck.cards.includes(card.id))
                .slice(0, 10);

            suggestions.push({
                type: 'element_synergy',
                title: `More ${primaryElement} cards`,
                cards: elementCards,
                reason: `Your deck focuses on ${primaryElement} element`
            });
        }

        // Suggest fixes for validation issues
        validation.warnings.forEach(warning => {
            if (warning.includes('Forwards')) {
                const forwards = this.cardDatabase.getCardsByType('forward').slice(0, 5);
                suggestions.push({
                    type: 'balance_fix',
                    title: 'Add more Forwards',
                    cards: forwards,
                    reason: warning
                });
            }
        });

        return suggestions;
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
                    console.error(`Error in deck manager event listener for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Clear all saved decks (for testing)
     */
    clearAllDecks() {
        const confirmation = confirm('Are you sure you want to delete all saved decks? This cannot be undone.');
        
        if (confirmation) {
            this.decks.clear();
            this.currentDeck = null;
            this.saveDecks();
            
            this.emit('allDecksCleared');
            console.log('🗑️ All decks cleared');
        }
    }

    /**
     * Get deck manager statistics
     */
    getManagerStats() {
        const decks = Array.from(this.decks.values());
        
        return {
            totalDecks: decks.length,
            totalGamesPlayed: decks.reduce((sum, deck) => sum + deck.stats.gamesPlayed, 0),
            totalWins: decks.reduce((sum, deck) => sum + deck.stats.wins, 0),
            averageDeckSize: decks.length > 0 ? 
                decks.reduce((sum, deck) => sum + deck.cards.length, 0) / decks.length : 0,
            oldestDeck: decks.length > 0 ? 
                decks.reduce((oldest, deck) => 
                    new Date(deck.createdAt) < new Date(oldest.createdAt) ? deck : oldest
                ) : null,
            newestDeck: decks.length > 0 ? 
                decks.reduce((newest, deck) => 
                    new Date(deck.createdAt) > new Date(newest.createdAt) ? deck : newest
                ) : null
        };
    }
}