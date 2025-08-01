/**
 * CARD DATABASE - Final Fantasy TCG Card Data Management
 * 
 * This module handles:
 * - Loading and managing the complete FFTCG card database
 * - Card search and filtering functionality
 * - Card validation for deck building
 * - Element and type categorization
 * - Card image and asset management
 * - Dynamic set detection and future-proofing for new releases
 * 
 * ADDING NEW SETS:
 * 1. Add new card data to src/data/fftcg_real_cards.json with proper "set" field
 * 2. Update the namedOpusMap in CardDatabase.getAllSets() if it's Opus XV+ format
 * 3. Update the namedOpusMap in DeckBuilder.getOpusNumber() for display names
 * 4. Set filter buttons will be automatically generated
 * 
 * The system automatically detects all sets present in the card data,
 * so adding new cards with proper set names will make them filterable.
 */

import { LocalStorage } from '../utils/LocalStorage.js';
import { logger } from '../utils/Logger.js';

/**
 * CardDatabase Class
 * Manages the complete Final Fantasy TCG card database
 */
export class CardDatabase {
    constructor() {
        // Storage keys
        this.STORAGE_KEYS = {
            CARDS: 'fftcg_card_database',
            LAST_UPDATE: 'fftcg_db_last_update'
        };

        // Card database
        this.cards = new Map();
        this.cardsByElement = new Map();
        this.cardsByType = new Map();
        this.cardsBySet = new Map();
        this.cardsByJob = new Map();

        // Database metadata
        this.isLoaded = false;
        this.lastUpdate = null;
        this.totalCards = 0;

        // Element definitions from the rules
        this.elements = {
            fire: { name: 'Fire', color: '#ff4444', description: 'Deals damage with strong spells' },
            ice: { name: 'Ice', color: '#44ddff', description: 'Dulls opponents and disrupts hands' },
            wind: { name: 'Wind', color: '#44ff44', description: 'Speed and quick attacks' },
            lightning: { name: 'Lightning', color: '#aa44ff', description: 'Removes Forwards with one-hit moves' },
            water: { name: 'Water', color: '#4488ff', description: 'Card draw and advantage building' },
            earth: { name: 'Earth', color: '#ffaa44', description: 'Defensive with tough Forwards' },
            light: { name: 'Light', color: '#ffffff', description: 'Powerful cards playable with any Element CP' },
            dark: { name: 'Dark', color: '#444444', description: 'Powerful cards playable with any Element CP' }
        };

        // Card type definitions
        this.cardTypes = {
            forward: { name: 'Forward', description: 'Main battle units that can attack and block' },
            backup: { name: 'Backup', description: 'Support cards that provide CP and abilities' },
            summon: { name: 'Summon', description: 'One-time powerful effects' },
            monster: { name: 'Monster', description: 'Can use abilities immediately when played' }
        };
    }

    /**
     * Initialize the card database
     */
    async initialize() {
        try {
            console.log('📚 Initializing card database...');
            
            // Try to load from local storage first
            const fromStorage = await this.loadFromStorage();
            
            // If no local data or outdated, load from external source
            if (!fromStorage && !this.isLoaded) {
                await this.loadFromSource();
            }
            
            // Build indices for fast searching
            this.buildIndices();
            
            console.log(`✅ Card database loaded: ${this.totalCards} cards`);
            this.isLoaded = true;
            
        } catch (error) {
            console.error('Failed to initialize card database:', error);
            
            // Load sample data as final fallback
            console.log('🔧 Loading sample data as fallback...');
            await this.loadSampleData();
            this.buildIndices();
            this.isLoaded = true;
        }
    }

    /**
     * Load card database from local storage
     */
    async loadFromStorage() {
        const savedCards = LocalStorage.get(this.STORAGE_KEYS.CARDS);
        const lastUpdate = LocalStorage.get(this.STORAGE_KEYS.LAST_UPDATE);
        const externalLoaded = LocalStorage.get('external_cards_loaded');
        
        console.log('🔍 CardDatabase: loadFromStorage check - savedCards:', savedCards ? savedCards.length : 'none', 'lastUpdate:', lastUpdate);
        
        // ALWAYS prefer loading fresh data from external APIs for now
        // TODO: Re-enable caching once we're sure the external loading works properly
        console.log('📚 Forcing fresh load from external APIs (bypassing cache)');
        return false;
        
        // If we previously loaded external cards but didn't save them (due to quota)
        // Skip storage loading and go straight to external APIs
        if (externalLoaded && !savedCards) {
            console.log('📚 Previously loaded external cards, skipping storage - will reload from APIs');
            return false;
        }
        
        if (savedCards && lastUpdate) {
            // Check if data is not too old (e.g., 7 days)
            const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceUpdate < 7) {
                this.loadCards(savedCards);
                this.lastUpdate = lastUpdate;
                this.isLoaded = true;
                console.log('📚 Loaded cards from local storage');
                return true;
            }
        }
        
        return false;
    }

    /**
     * Load card database from external source
     */
    async loadFromSource() {
        try {
            console.log('🌐 Loading cards from JSON data file...');
            
            // Load the FFTCG real cards data directly
            const response = await fetch('./src/data/fftcg_real_cards.json');
            if (response.ok) {
                const realCards = await response.json();
                console.log(`✅ Loaded ${realCards.length} real FFTCG cards from JSON data`);
                
                this.loadCards(realCards);
                this.saveToStorage();
            } else {
                console.log('⚠️ JSON data failed, loading sample data...');
                await this.loadSampleData();
            }
            
        } catch (error) {
            console.error('Failed to load cards from source:', error);
            console.log('🔧 Loading sample data as final fallback...');
            await this.loadSampleData();
        }
    }

    /**
     * Load sample card data for development/demo
     */
    async loadSampleData() {
        console.log('🔧 Loading sample card data...');
        
        const sampleCards = [
            // Fire Cards
            {
                id: 'ff1-001-h',
                name: 'Terra',
                element: 'fire',
                type: 'forward',
                cost: 5,
                power: 8000,
                job: 'Magitek Elite',
                category: 'VI',
                rarity: 'H',
                text: 'When Terra enters the field, choose 1 Forward. Deal it 4000 damage.',
                flavorText: 'A mysterious young woman, born with the gift of magic...',
                artist: 'Yoshitaka Amano',
                set: 'Opus I',
                cardNumber: '1-001H',
                image: null
            },
            {
                id: 'ff1-002-c',
                name: 'Goblin',
                element: 'fire',
                type: 'forward',
                cost: 2,
                power: 3000,
                job: 'Goblin',
                category: 'Generic',
                rarity: 'C',
                text: '',
                flavorText: 'A mischievous creature that loves to cause trouble.',
                artist: 'Square Enix',
                set: 'Opus I',
                cardNumber: '1-002C',
                image: null
            },
            
            // Ice Cards
            {
                id: 'ff1-023-h',
                name: 'Shiva',
                element: 'ice',
                type: 'summon',
                cost: 3,
                power: null,
                job: null,
                category: 'Summon',
                rarity: 'H',
                text: 'Choose 1 Forward. Dull it and Freeze it.',
                flavorText: 'The Empress of Ice, whose beauty is matched only by her power.',
                artist: 'Yoshitaka Amano',
                set: 'Opus I',
                cardNumber: '1-023H',
                image: null
            },
            
            // Water Cards
            {
                id: 'ff1-176-h',
                name: 'Yuna',
                element: 'water',
                type: 'backup',
                cost: 5,
                power: null,
                job: 'Summoner',
                category: 'X',
                rarity: 'H',
                text: 'EX BURST When Yuna enters the field, choose 1 Forward. Return it to its owner\'s hand.\nIf a Character is put from the field into the Break Zone, you may remove it from the game instead.',
                flavorText: 'I will defeat Sin. I will find a way.',
                artist: 'Tetsuya Nomura',
                set: 'Opus I',
                cardNumber: '1-176H',
                image: null
            },
            
            // Wind Cards
            {
                id: 'ff1-200-h',
                name: 'Cloud',
                element: 'wind',
                type: 'forward',
                cost: 7,
                power: 10000,
                job: 'SOLDIER',
                category: 'VII',
                rarity: 'H',
                text: 'Brave\nWhen Cloud enters the field, you may search for 1 [Job SOLDIER] and add it to your hand.',
                flavorText: 'Ex-SOLDIER. Mercenary. In the battle for the life of the planet, he is the last hope.',
                artist: 'Tetsuya Nomura',
                set: 'Opus I',
                cardNumber: '1-200H',
                image: null
            },
            
            // Lightning Cards
            {
                id: 'ff2-142-r',
                name: 'Lightning',
                element: 'lightning',
                type: 'forward',
                cost: 4,
                power: 7000,
                job: 'Ravager',
                category: 'XIII',
                rarity: 'R',
                text: 'Haste\nWhen Lightning enters the field, choose 1 Forward opponent controls. Dull it.',
                flavorText: 'It\'s not a question of can or can\'t. There are some things in life you just do.',
                artist: 'Tetsuya Nomura',
                set: 'Opus II',
                cardNumber: '2-142R',
                image: null
            },
            
            // Earth Cards
            {
                id: 'ff1-083-h',
                name: 'Warrior of Light',
                element: 'earth',
                type: 'forward',
                cost: 6,
                power: 9000,
                job: 'Warrior',
                category: 'I',
                rarity: 'H',
                text: 'When Warrior of Light deals damage to a Forward, double the damage instead.',
                flavorText: 'The light shall guide you and reveal the true path.',
                artist: 'Tetsuya Nomura',
                set: 'Opus I',
                cardNumber: '1-083H',
                image: null
            },
            
            // Light Cards
            {
                id: 'ff1-005-r',
                name: 'Paladin Cecil',
                element: 'light',
                type: 'forward',
                cost: 5,
                power: 8000,
                job: 'Paladin',
                category: 'IV',
                rarity: 'R',
                text: 'When Paladin Cecil enters the field, all Forwards you control gain +1000 power until the end of the turn.',
                flavorText: 'I will protect everyone, no matter the cost.',
                artist: 'Yoshitaka Amano',
                set: 'Opus I',
                cardNumber: '1-005R',
                image: null
            },
            
            // Dark Cards
            {
                id: 'ff1-185-h',
                name: 'Dark Knight Cecil',
                element: 'dark',
                type: 'forward',
                cost: 4,
                power: 7000,
                job: 'Dark Knight',
                category: 'IV',
                rarity: 'H',
                text: 'When Dark Knight Cecil attacks, you may pay [1]. If you do, Dark Knight Cecil gains +2000 power until the end of the turn.',
                flavorText: 'The darkness within me gives me strength.',
                artist: 'Yoshitaka Amano',
                set: 'Opus I',
                cardNumber: '1-185H',
                image: null
            }
        ];

        this.loadCards(sampleCards);
        this.isLoaded = true;
        this.lastUpdate = new Date().toISOString();
    }

    /**
     * Load cards into the database
     */
    loadCards(cardData) {
        this.cards.clear();
        
        console.log(`🔍 Loading ${cardData.length} cards into database...`);
        let validCount = 0;
        let invalidCount = 0;
        
        cardData.forEach((card, index) => {
            // Validate card data
            if (this.validateCard(card)) {
                this.cards.set(card.id, card);
                validCount++;
            } else {
                console.warn(`Invalid card data [${index}]:`, card);
                console.warn(`Missing fields:`, this.getMissingFields(card));
                invalidCount++;
            }
        });
        
        console.log(`🔍 Card loading results: ${validCount} valid, ${invalidCount} invalid`);
        
        this.totalCards = this.cards.size;
        
        // Build search indices after loading cards
        this.buildIndices();
    }

    /**
     * Validate card data structure
     */
    validateCard(card) {
        // Only require id and name as essential fields
        const required = ['id', 'name'];
        const hasRequired = required.every(field => card.hasOwnProperty(field) && card[field] !== null && card[field] !== undefined);
        
        if (!hasRequired) {
            return false;
        }
        
        // Set defaults for missing optional fields
        if (!card.element) card.element = 'neutral';
        if (!card.type) card.type = 'unknown';
        if (card.cost === null || card.cost === undefined) card.cost = 0;
        if (!card.set) card.set = 'Unknown';
        if (!card.rarity) card.rarity = 'C';
        
        return true;
    }

    /**
     * Get missing fields for debugging
     */
    getMissingFields(card) {
        const required = ['id', 'name', 'element', 'type', 'cost'];
        return required.filter(field => !card.hasOwnProperty(field) || card[field] === null);
    }

    /**
     * Build search indices for performance
     */
    buildIndices() {
        // Clear existing indices
        this.cardsByElement.clear();
        this.cardsByType.clear();
        this.cardsBySet.clear();
        this.cardsByJob.clear();

        // Build indices
        this.cards.forEach(card => {
            // Index by element
            if (!this.cardsByElement.has(card.element)) {
                this.cardsByElement.set(card.element, []);
            }
            this.cardsByElement.get(card.element).push(card);

            // Index by type
            if (!this.cardsByType.has(card.type)) {
                this.cardsByType.set(card.type, []);
            }
            this.cardsByType.get(card.type).push(card);

            // Index by set
            if (card.set) {
                if (!this.cardsBySet.has(card.set)) {
                    this.cardsBySet.set(card.set, []);
                }
                this.cardsBySet.get(card.set).push(card);
            }

            // Index by job
            if (card.job) {
                if (!this.cardsByJob.has(card.job)) {
                    this.cardsByJob.set(card.job, []);
                }
                this.cardsByJob.get(card.job).push(card);
            }
        });

        console.log('🔍 Card indices built');
    }

    /**
     * Save database to local storage
     */
    saveToStorage() {
        try {
            // Don't save if we have too many cards (will exceed quota)
            if (this.cards.size > 500) {
                console.log('💾 Skipping localStorage save - too many cards, will reload from external APIs');
                LocalStorage.set(this.STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
                LocalStorage.set('external_cards_loaded', true);
                return;
            }
            
            // For smaller datasets, save normally
            const cardArray = Array.from(this.cards.values());
            LocalStorage.set(this.STORAGE_KEYS.CARDS, cardArray);
            LocalStorage.set(this.STORAGE_KEYS.LAST_UPDATE, this.lastUpdate);
            console.log('💾 Card database saved to local storage');
        } catch (error) {
            console.warn('Failed to save card database (quota exceeded):', error);
            // Clear any partial data and just save metadata
            LocalStorage.remove(this.STORAGE_KEYS.CARDS);
            LocalStorage.set(this.STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
            LocalStorage.set('external_cards_loaded', true);
        }
    }

    /**
     * Search cards by name, text, or other criteria
     */
    searchCards(query, filters = {}) {
        if (!this.isLoaded) {
            console.warn('Card database not loaded');
            return [];
        }

        let results = Array.from(this.cards.values());

        // Apply text search
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase().trim();
            results = results.filter(card => 
                card.name.toLowerCase().includes(searchTerm) ||
                (card.text && card.text.toLowerCase().includes(searchTerm)) ||
                (card.job && card.job.toLowerCase().includes(searchTerm)) ||
                (card.category && card.category.toLowerCase().includes(searchTerm))
            );
        }

        // Apply filters
        if (filters.element && filters.element !== '') {
            results = results.filter(card => card.element === filters.element);
        }

        if (filters.type && filters.type !== '') {
            results = results.filter(card => card.type === filters.type);
        }

        if (filters.cost !== undefined && filters.cost !== '') {
            const cost = parseInt(filters.cost);
            results = results.filter(card => card.cost === cost);
        }

        if (filters.costMin !== undefined) {
            results = results.filter(card => card.cost >= filters.costMin);
        }

        if (filters.costMax !== undefined) {
            results = results.filter(card => card.cost <= filters.costMax);
        }

        if (filters.power !== undefined && filters.power !== '') {
            const power = parseInt(filters.power);
            results = results.filter(card => card.power === power);
        }

        if (filters.powerMin !== undefined) {
            results = results.filter(card => card.power && card.power >= filters.powerMin);
        }

        if (filters.powerMax !== undefined) {
            results = results.filter(card => card.power && card.power <= filters.powerMax);
        }

        if (filters.job && filters.job !== '') {
            results = results.filter(card => 
                card.job && card.job.toLowerCase().includes(filters.job.toLowerCase())
            );
        }

        if (filters.category && filters.category !== '') {
            results = results.filter(card => 
                card.category && card.category.toLowerCase().includes(filters.category.toLowerCase())
            );
        }

        if (filters.rarity && filters.rarity !== '') {
            results = results.filter(card => card.rarity === filters.rarity);
        }

        if (filters.set && filters.set !== '') {
            results = results.filter(card => card.set === filters.set);
        }

        // Sort results
        results.sort((a, b) => {
            // Primary sort by name
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            
            // Secondary sort by cost
            return a.cost - b.cost;
        });

        return results;
    }

    /**
     * Get card by ID
     */
    getCard(cardId) {
        return this.cards.get(cardId) || null;
    }

    /**
     * Get all cards
     */
    getAllCards() {
        return Array.from(this.cards.values());
    }

    /**
     * Get cards by element
     */
    getCardsByElement(element) {
        return this.cardsByElement.get(element) || [];
    }

    /**
     * Get cards by type
     */
    getCardsByType(type) {
        return this.cardsByType.get(type) || [];
    }

    /**
     * Get cards by job
     */
    getCardsByJob(job) {
        return this.cardsByJob.get(job) || [];
    }

    /**
     * Get random cards
     */
    getRandomCards(count = 1, filters = {}) {
        let pool = this.searchCards('', filters);
        
        if (pool.length === 0) {
            return [];
        }

        const results = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            results.push(pool.splice(randomIndex, 1)[0]);
        }

        return results;
    }

    /**
     * Validate deck composition according to FFTCG rules
     */
    validateDeck(cardIds) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Count cards and check for valid IDs
        const cardCounts = new Map();
        const invalidCards = [];

        cardIds.forEach(cardId => {
            const card = this.getCard(cardId);
            if (!card) {
                invalidCards.push(cardId);
                return;
            }

            cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
        });

        // Rule 1: Deck must contain exactly 50 cards
        if (cardIds.length !== 50) {
            validation.isValid = false;
            validation.errors.push(`Deck must contain exactly 50 cards (currently ${cardIds.length})`);
        }

        // Rule 2: Maximum 3 copies of the same card
        cardCounts.forEach((count, cardId) => {
            if (count > 3) {
                validation.isValid = false;
                const card = this.getCard(cardId);
                validation.errors.push(`Too many copies of "${card?.name || cardId}" (${count}/3 max)`);
            }
        });

        // Report invalid card IDs
        if (invalidCards.length > 0) {
            validation.isValid = false;
            validation.errors.push(`Invalid card IDs: ${invalidCards.join(', ')}`);
        }

        // Analyze deck composition for warnings
        if (validation.isValid) {
            this.analyzeDeckComposition(cardIds, validation);
        }

        return validation;
    }

    /**
     * Analyze deck composition and provide warnings/suggestions
     */
    analyzeDeckComposition(cardIds, validation) {
        const cards = cardIds.map(id => this.getCard(id)).filter(Boolean);
        
        // Count by type
        const typeCounts = {};
        const elementCounts = {};
        const costCounts = {};

        cards.forEach(card => {
            // Count types
            typeCounts[card.type] = (typeCounts[card.type] || 0) + 1;

            // Count elements
            elementCounts[card.element] = (elementCounts[card.element] || 0) + 1;

            // Count costs
            const costRange = this.getCostRange(card.cost);
            costCounts[costRange] = (costCounts[costRange] || 0) + 1;
        });

        // Check Forward count
        const forwardCount = typeCounts.forward || 0;
        if (forwardCount < 15) {
            validation.warnings.push('Consider adding more Forwards (current: ' + forwardCount + ', recommended: 15-25)');
        } else if (forwardCount > 30) {
            validation.warnings.push('Too many Forwards may slow down your deck (current: ' + forwardCount + ')');
        }

        // Check Backup count
        const backupCount = typeCounts.backup || 0;
        if (backupCount < 10) {
            validation.warnings.push('Consider adding more Backups for CP generation (current: ' + backupCount + ')');
        }

        // Check element distribution
        const elementCount = Object.keys(elementCounts).length;
        if (elementCount > 3) {
            validation.warnings.push('Using many elements may cause CP issues (current: ' + elementCount + ' elements)');
        }

        // Check cost curve
        const highCostCount = (costCounts['7+'] || 0);
        if (highCostCount > 8) {
            validation.warnings.push('High cost curve may cause slow starts (cards 7+ cost: ' + highCostCount + ')');
        }

        const lowCostCount = (costCounts['1-2'] || 0);
        if (lowCostCount < 8) {
            validation.warnings.push('Consider adding more low-cost cards for early game (1-2 cost: ' + lowCostCount + ')');
        }
    }

    /**
     * Get cost range category for analysis
     */
    getCostRange(cost) {
        if (cost <= 2) return '1-2';
        if (cost <= 4) return '3-4';
        if (cost <= 6) return '5-6';
        return '7+';
    }

    /**
     * Get deck suggestions based on a card or theme
     */
    getDeckSuggestions(seedCard, count = 49) {
        const suggestions = [];
        
        if (!seedCard) {
            return this.getRandomCards(count);
        }

        // Add cards from the same element
        const sameElementCards = this.getCardsByElement(seedCard.element)
            .filter(card => card.id !== seedCard.id);
        
        // Add cards from the same job/category
        const synergisticCards = this.getAllCards().filter(card => 
            card.id !== seedCard.id && (
                card.job === seedCard.job ||
                card.category === seedCard.category ||
                (card.text && card.text.includes(seedCard.job)) ||
                (card.text && card.text.includes(seedCard.category))
            )
        );

        // Combine and shuffle
        const candidatePool = [...sameElementCards, ...synergisticCards];
        const shuffled = candidatePool.sort(() => Math.random() - 0.5);

        // Take desired count
        return shuffled.slice(0, count);
    }

    /**
     * Get database statistics
     */
    getStats() {
        if (!this.isLoaded) {
            return null;
        }

        const stats = {
            totalCards: this.totalCards,
            lastUpdate: this.lastUpdate,
            byElement: {},
            byType: {},
            byRarity: {},
            bySet: {},
            costDistribution: {}
        };

        // Count by element
        Object.keys(this.elements).forEach(element => {
            stats.byElement[element] = this.cardsByElement.get(element)?.length || 0;
        });

        // Count by type
        Object.keys(this.cardTypes).forEach(type => {
            stats.byType[type] = this.cardsByType.get(type)?.length || 0;
        });

        // Count by rarity, set, and cost
        this.cards.forEach(card => {
            // Rarity
            stats.byRarity[card.rarity] = (stats.byRarity[card.rarity] || 0) + 1;

            // Set
            if (card.set) {
                stats.bySet[card.set] = (stats.bySet[card.set] || 0) + 1;
            }

            // Cost
            const costRange = this.getCostRange(card.cost);
            stats.costDistribution[costRange] = (stats.costDistribution[costRange] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get available elements
     */
    getElements() {
        return this.elements;
    }

    /**
     * Get available card types
     */
    getCardTypes() {
        return this.cardTypes;
    }

    /**
     * Check if database is loaded
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * Refresh database from source
     */
    async refresh() {
        console.log('🔄 Refreshing card database...');
        
        this.isLoaded = false;
        await this.loadFromSource();
        this.buildIndices();
        
        console.log('✅ Card database refreshed');
    }

    /**
     * Add new cards to the database (for future expansions)
     */
    addCards(newCards) {
        if (!Array.isArray(newCards)) {
            logger.error('addCards requires an array of card objects');
            return false;
        }

        let addedCount = 0;
        newCards.forEach(card => {
            if (card.id && !this.cards.has(card.id)) {
                this.cards.set(card.id, card);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            this.buildIndices();
            this.totalCards = this.cards.size;
            this.saveToStorage();
            logger.info(`➕ Added ${addedCount} new cards to database`);
        }

        return addedCount > 0;
    }

    /**
     * Scan for new sets and update available sets list
     */
    scanForNewSets() {
        const previousSets = new Set(this.cardsBySet.keys());
        this.buildIndices();
        const currentSets = new Set(this.cardsBySet.keys());
        
        const newSets = [...currentSets].filter(set => !previousSets.has(set));
        
        if (newSets.length > 0) {
            logger.info(`🆕 Discovered ${newSets.length} new sets:`, newSets);
            return newSets;
        }
        
        return [];
    }

    /**
     * Get all available sets in the database
     */
    getAllSets() {
        return Array.from(this.cardsBySet.keys()).sort((a, b) => {
            // Custom sort to handle Opus sets properly
            const getOpusNumber = (setName) => {
                // Handle "Opus X" format
                const opusMatch = setName.match(/^Opus\s+([IVXLCDM]+)$/);
                if (opusMatch) {
                    return this.romanToNumber(opusMatch[1]);
                }
                
                // Handle "[Set Name]" (Opus XV+) format - extract opus number from context
                const namedOpusMap = {
                    'Crystal Dominion': 15,
                    'Emissaries of Light': 16,
                    'Rebellion\'s Call': 17,
                    'Resurgence of Power': 18,
                    'From Nightmares': 19,
                    'Dawn of Heroes': 20,
                    'Beyond Destiny': 21,
                    'Hidden Hope': 22,
                    'Hidden Trials': 23,
                    'Hidden Legends': 24,
                    'Tears of the Planet': 25
                };
                
                if (namedOpusMap[setName]) {
                    return namedOpusMap[setName];
                }
                
                // Special sets come after main sets
                return 1000;
            };
            
            const numA = getOpusNumber(a);
            const numB = getOpusNumber(b);
            
            if (numA !== numB) {
                return numA - numB;
            }
            
            // If same opus number or both special sets, sort alphabetically
            return a.localeCompare(b);
        });
    }

    /**
     * Convert Roman numerals to numbers for sorting
     */
    romanToNumber(roman) {
        const romanMap = {
            'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
        };
        
        let result = 0;
        for (let i = 0; i < roman.length; i++) {
            const current = romanMap[roman[i]];
            const next = romanMap[roman[i + 1]];
            
            if (next && current < next) {
                result += next - current;
                i++; // Skip next character
            } else {
                result += current;
            }
        }
        
        return result;
    }

    /**
     * Get cards by set name
     */
    getCardsBySet(setName) {
        return this.cardsBySet.get(setName) || [];
    }

    /**
     * Clear database cache
     */
    clearCache() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            LocalStorage.remove(key);
        });
        
        console.log('🗑️ Card database cache cleared');
    }


}