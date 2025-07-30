/**
 * EXTERNAL CARD API - Integration with FFTCG card databases
 * 
 * Provides integration with external FFTCG card databases including:
 * - FFDecks.com API
 * - Square Enix official card browser
 * - Community FFTCGDB
 * - Card image fetching and caching
 * - Multiple set support
 */

import { logger } from '../utils/Logger.js';
import { LocalStorage } from '../utils/LocalStorage.js';

export class ExternalCardAPI {
    constructor() {
        this.CACHE_KEY = 'fftcg_external_cards';
        this.IMAGE_CACHE_KEY = 'fftcg_card_images';
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        
        // API endpoints
        this.endpoints = {
            ffdecks: {
                base: 'https://ffdecks.com/api',
                cards: 'https://ffdecks.com/api/cards/basic',
                deck: 'https://ffdecks.com/api/deck',
                search: 'https://ffdecks.com/api/search'
            },
            squareEnix: {
                base: 'https://fftcg.square-enix-games.com',
                cardBrowser: 'https://fftcg.square-enix-games.com/en/card-browser'
            },
            fftcgdb: {
                base: 'https://fftcgdb.com/api',
                cards: 'https://fftcgdb.com/api/cards',
                sets: 'https://fftcgdb.com/api/sets'
            }
        };
        
        // Card image sources
        this.imageSources = {
            ffdecks: 'https://ffdecks.com/images/cards',
            squareEnix: 'https://fftcg.square-enix-games.com/images/cards',
            fftcgdb: 'https://fftcgdb.com/images/cards',
            fallback: 'https://via.placeholder.com/200x280/333/fff?text='
        };
        
        // Rate limiting
        this.rateLimiter = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        this.initialize();
    }

    /**
     * Initialize the external API system
     */
    initialize() {
        this.loadCachedData();
        this.setupCORSProxy();
        
        logger.info('🌐 External Card API initialized');
    }

    /**
     * Load cached card data
     */
    loadCachedData() {
        try {
            const cached = LocalStorage.get(this.CACHE_KEY);
            if (cached && this.isCacheValid(cached.timestamp)) {
                this.cachedCards = cached.data;
                logger.info(`📦 Loaded ${Object.keys(this.cachedCards || {}).length} cached cards`);
            }
        } catch (error) {
            logger.error('Error loading cached card data:', error);
        }
    }

    /**
     * Check if cache is still valid
     */
    isCacheValid(timestamp) {
        return Date.now() - timestamp < this.CACHE_DURATION;
    }

    /**
     * Setup CORS proxy for cross-origin requests
     */
    setupCORSProxy() {
        // For development, we might need a CORS proxy
        // This can be configured based on environment
        this.corsProxy = '';
        
        // Common CORS proxies (use with caution in production)
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        // In production, implement proper CORS handling on your server
        if (window.location.hostname === 'localhost') {
            this.corsProxy = proxies[0];
        }
    }

    /**
     * Fetch cards from FFDecks API
     */
    async fetchFromFFDecks(options = {}) {
        try {
            const url = this.buildURL(this.endpoints.ffdecks.cards, options);
            const response = await this.makeRequest(url);
            
            if (response.ok) {
                const data = await response.json();
                return this.normalizeFFDecksData(data);
            } else {
                throw new Error(`FFDecks API error: ${response.status}`);
            }
        } catch (error) {
            logger.error('Error fetching from FFDecks:', error);
            return null;
        }
    }

    /**
     * Fetch card data from multiple sources
     */
    async fetchAllCards(forceRefresh = false) {
        if (!forceRefresh && this.cachedCards) {
            return this.cachedCards;
        }

        logger.info('🔄 Fetching card data from external sources...');
        
        const sources = [
            { name: 'FFDecks', fetcher: () => this.fetchFromFFDecks() },
            { name: 'FFTCGDB', fetcher: () => this.fetchFromFFTCGDB() },
            { name: 'SquareEnix', fetcher: () => this.fetchFromSquareEnix() }
        ];

        const results = {};
        
        for (const source of sources) {
            try {
                logger.info(`📡 Fetching from ${source.name}...`);
                const data = await source.fetcher();
                
                if (data && data.length > 0) {
                    results[source.name.toLowerCase()] = data;
                    logger.info(`✅ Fetched ${data.length} cards from ${source.name}`);
                } else {
                    logger.warn(`⚠️ No data from ${source.name}`);
                }
            } catch (error) {
                logger.error(`❌ Error fetching from ${source.name}:`, error);
            }
        }

        // Merge and deduplicate cards from all sources
        const mergedCards = this.mergeCardSources(results);
        
        // Cache the results
        this.cacheCardData(mergedCards);
        
        return mergedCards;
    }

    /**
     * Fetch from FFTCGDB (community database)
     */
    async fetchFromFFTCGDB() {
        try {
            // This is a placeholder - actual implementation would depend on FFTCGDB API
            const url = this.endpoints.fftcgdb.cards;
            const response = await this.makeRequest(url);
            
            if (response.ok) {
                const data = await response.json();
                return this.normalizeFFTCGDBData(data);
            }
        } catch (error) {
            logger.warn('FFTCGDB not available, using fallback data');
            return this.generateFallbackData();
        }
    }

    /**
     * Fetch from Square Enix official source
     */
    async fetchFromSquareEnix() {
        try {
            // Square Enix doesn't have a public API, so this would involve scraping
            // For now, we'll return null and rely on other sources
            logger.info('Square Enix scraping not implemented, using other sources');
            return null;
        } catch (error) {
            logger.error('Error fetching from Square Enix:', error);
            return null;
        }
    }

    /**
     * Make HTTP request with rate limiting and CORS handling
     */
    async makeRequest(url, options = {}) {
        // Check rate limiting
        if (!this.checkRateLimit(url)) {
            throw new Error('Rate limit exceeded');
        }

        // Add CORS proxy if needed
        const requestUrl = this.corsProxy ? `${this.corsProxy}${encodeURIComponent(url)}` : url;
        
        // Default options
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FFTCG-Simulator/1.0'
            },
            ...options
        };

        return fetch(requestUrl, defaultOptions);
    }

    /**
     * Check rate limiting for API requests
     */
    checkRateLimit(url) {
        const domain = new URL(url).hostname;
        const now = Date.now();
        const limit = this.rateLimiter.get(domain);
        
        if (!limit) {
            this.rateLimiter.set(domain, { count: 1, resetTime: now + 60000 }); // 1 minute window
            return true;
        }
        
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + 60000;
            return true;
        }
        
        if (limit.count >= 10) { // Max 10 requests per minute per domain
            return false;
        }
        
        limit.count++;
        return true;
    }

    /**
     * Build URL with query parameters
     */
    buildURL(baseUrl, params = {}) {
        const url = new URL(baseUrl);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return url.toString();
    }

    /**
     * Normalize FFDecks API data to our card format
     */
    normalizeFFDecksData(data) {
        if (!Array.isArray(data)) {
            data = data.cards || data.data || [data];
        }

        return data.map(card => ({
            id: card.id || card.code || `ffdecks-${card.name?.replace(/\s+/g, '-').toLowerCase()}`,
            name: card.name || 'Unknown Card',
            element: this.normalizeElement(card.element || card.color),
            type: this.normalizeType(card.type || card.card_type),
            cost: parseInt(card.cost || card.cp || 0),
            power: card.power ? parseInt(card.power) : undefined,
            job: card.job || card.jobs?.[0],
            category: card.category || card.categories?.[0],
            rarity: card.rarity || 'C',
            text: card.text || card.ability_text || '',
            flavorText: card.flavor_text || '',
            image: this.getCardImageUrl(card, 'ffdecks'),
            set: card.set || card.opus || 'Unknown',
            cardNumber: card.card_number || card.number,
            source: 'ffdecks',
            hasRealImage: true
        }));
    }

    /**
     * Normalize FFTCGDB data to our card format
     */
    normalizeFFTCGDBData(data) {
        // Similar normalization for FFTCGDB format
        return this.normalizeFFDecksData(data); // Placeholder - adjust based on actual FFTCGDB format
    }

    /**
     * Generate fallback card data when APIs are unavailable
     */
    generateFallbackData() {
        logger.info('📦 Generating fallback card data...');
        
        // Return expanded card sets based on known FFTCG structure
        const fallbackCards = [];
        const sets = ['Opus I', 'Opus II', 'Opus III', 'Opus IV', 'Opus V'];
        const elements = ['Fire', 'Ice', 'Wind', 'Lightning', 'Water', 'Earth', 'Light', 'Dark'];
        const types = ['Forward', 'Backup', 'Summon'];
        const rarities = ['C', 'R', 'H', 'L'];
        
        let cardId = 1;
        
        sets.forEach((set, setIndex) => {
            for (let i = 1; i <= 186; i++) { // Standard set size
                const cardNumber = i.toString().padStart(3, '0');
                const rarity = this.determineRarity(i);
                
                fallbackCards.push({
                    id: `${setIndex + 1}-${cardNumber}${rarity}`,
                    name: `${set} Card ${cardNumber}`,
                    element: elements[Math.floor(i / 23) % elements.length],
                    type: types[i % types.length],
                    cost: Math.min(Math.max(Math.floor(i / 30) + 1, 1), 9),
                    power: types[i % types.length] === 'Forward' ? (Math.floor(i / 20) + 2) * 1000 : undefined,
                    rarity: rarity,
                    text: `Card ability text for ${set} ${cardNumber}`,
                    set: set,
                    cardNumber: cardNumber,
                    image: `${this.imageSources.fallback}${encodeURIComponent(set + ' ' + cardNumber)}`,
                    source: 'fallback',
                    hasRealImage: false
                });
            }
        });
        
        return fallbackCards;
    }

    /**
     * Determine card rarity based on card number
     */
    determineRarity(cardNumber) {
        if (cardNumber % 50 === 0) return 'L'; // Legend
        if (cardNumber % 15 === 0) return 'H'; // Hero
        if (cardNumber % 7 === 0) return 'R';  // Rare
        return 'C'; // Common
    }

    /**
     * Normalize element names across different APIs
     */
    normalizeElement(element) {
        if (!element) return 'neutral';
        
        const elementMap = {
            'fire': 'fire', 'red': 'fire', 'r': 'fire',
            'ice': 'ice', 'blue': 'ice', 'b': 'ice',
            'wind': 'wind', 'green': 'wind', 'g': 'wind',
            'lightning': 'lightning', 'yellow': 'lightning', 'y': 'lightning',
            'water': 'water', 'cyan': 'water', 'c': 'water',
            'earth': 'earth', 'brown': 'earth', 'e': 'earth',
            'light': 'light', 'white': 'light', 'w': 'light',
            'dark': 'dark', 'black': 'dark', 'k': 'dark'
        };
        
        return elementMap[element.toLowerCase()] || element.toLowerCase();
    }

    /**
     * Normalize card type names
     */
    normalizeType(type) {
        if (!type) return 'forward';
        
        const typeMap = {
            'forward': 'forward', 'character': 'forward',
            'backup': 'backup', 'support': 'backup',
            'summon': 'summon', 'spell': 'summon'
        };
        
        return typeMap[type.toLowerCase()] || type.toLowerCase();
    }

    /**
     * Get card image URL from various sources
     */
    getCardImageUrl(card, source = 'ffdecks') {
        const cardId = card.id || card.code || card.card_number;
        
        if (card.image_url) {
            return card.image_url;
        }
        
        if (card.images && card.images.large) {
            return card.images.large;
        }
        
        // Construct image URL based on source
        switch (source) {
            case 'ffdecks':
                if (cardId) {
                    return `${this.imageSources.ffdecks}/${cardId}.jpg`;
                }
                break;
                
            case 'fftcgdb':
                if (cardId) {
                    return `${this.imageSources.fftcgdb}/${cardId}.png`;
                }
                break;
                
            case 'squareEnix':
                if (cardId) {
                    return `${this.imageSources.squareEnix}/${cardId}.jpg`;
                }
                break;
        }
        
        // Fallback placeholder
        const cardName = card.name || 'Unknown Card';
        return `${this.imageSources.fallback}${encodeURIComponent(cardName)}`;
    }

    /**
     * Merge card data from multiple sources
     */
    mergeCardSources(sources) {
        const cardMap = new Map();
        
        // Priority order: FFDecks > FFTCGDB > SquareEnix > Fallback
        const priorityOrder = ['ffdecks', 'fftcgdb', 'squareEnix', 'fallback'];
        
        priorityOrder.forEach(sourceName => {
            const cards = sources[sourceName];
            if (cards && Array.isArray(cards)) {
                cards.forEach(card => {
                    const existingCard = cardMap.get(card.id);
                    
                    if (!existingCard || this.isHigherPriority(card.source, existingCard.source)) {
                        cardMap.set(card.id, card);
                    }
                });
            }
        });
        
        return Array.from(cardMap.values());
    }

    /**
     * Check if one source has higher priority than another
     */
    isHigherPriority(source1, source2) {
        const priorities = { ffdecks: 4, fftcgdb: 3, squareEnix: 2, fallback: 1 };
        return (priorities[source1] || 0) > (priorities[source2] || 0);
    }

    /**
     * Cache card data to localStorage
     */
    cacheCardData(cards) {
        try {
            const cacheData = {
                data: cards,
                timestamp: Date.now()
            };
            
            LocalStorage.set(this.CACHE_KEY, cacheData);
            this.cachedCards = cards;
            
            logger.info(`💾 Cached ${cards.length} cards`);
        } catch (error) {
            logger.error('Error caching card data:', error);
        }
    }

    /**
     * Search cards from external sources
     */
    async searchCards(query, options = {}) {
        const cards = await this.fetchAllCards();
        
        if (!query) return cards;
        
        const searchTerm = query.toLowerCase();
        
        return cards.filter(card => {
            return card.name.toLowerCase().includes(searchTerm) ||
                   card.text?.toLowerCase().includes(searchTerm) ||
                   card.element.toLowerCase().includes(searchTerm) ||
                   card.type.toLowerCase().includes(searchTerm) ||
                   card.job?.toLowerCase().includes(searchTerm);
        });
    }

    /**
     * Get cards by set
     */
    async getCardsBySet(setName) {
        const cards = await this.fetchAllCards();
        return cards.filter(card => 
            card.set?.toLowerCase().includes(setName.toLowerCase())
        );
    }

    /**
     * Get all available sets
     */
    async getAvailableSets() {
        const cards = await this.fetchAllCards();
        const sets = new Set();
        
        cards.forEach(card => {
            if (card.set) {
                sets.add(card.set);
            }
        });
        
        return Array.from(sets).sort();
    }

    /**
     * Refresh card data from all sources
     */
    async refreshAllData() {
        logger.info('🔄 Refreshing all card data...');
        
        // Clear cache
        LocalStorage.remove(this.CACHE_KEY);
        this.cachedCards = null;
        
        // Fetch fresh data
        return await this.fetchAllCards(true);
    }

    /**
     * Get API status and statistics
     */
    getAPIStatus() {
        return {
            cachedCards: this.cachedCards?.length || 0,
            lastUpdate: this.getLastUpdateTime(),
            availableSources: Object.keys(this.endpoints),
            rateLimitStatus: Array.from(this.rateLimiter.entries())
        };
    }

    /**
     * Get last cache update time
     */
    getLastUpdateTime() {
        try {
            const cached = LocalStorage.get(this.CACHE_KEY);
            return cached?.timestamp ? new Date(cached.timestamp) : null;
        } catch {
            return null;
        }
    }
}

// Create and export singleton instance
export const externalCardAPI = new ExternalCardAPI();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.externalCardAPI = externalCardAPI;
}