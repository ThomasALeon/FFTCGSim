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
        
        // Health monitoring
        this.healthStatus = new Map();
        this.healthCheckInterval = null;
        this.HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.lastHealthCheck = null;
        this.isHealthCheckRunning = false;
        
        // Enhanced logging
        this.debugLogs = [];
        this.MAX_DEBUG_LOGS = 1000;
        
        this.initialize();
    }

    /**
     * Initialize the external API system
     */
    initialize() {
        this.loadCachedData();
        this.setupCORSProxy();
        this.startPeriodicHealthChecks();
        
        this.debugLog('info', '🌐 External Card API initialized with health monitoring');
        logger.info('🌐 External Card API initialized with health monitoring');
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
        this.corsProxy = '';
        
        // Common CORS proxies (use with caution in production)
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/',
            'https://corsproxy.io/?'
        ];
        
        // Enhanced CORS proxy selection based on environment
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isLocal) {
            // Use a reliable proxy for local development
            this.corsProxy = proxies[0]; // allorigins tends to be more reliable
            
            this.debugLog('info', 'CORS proxy configured for local development', {
                hostname,
                proxy: this.corsProxy
            });
        } else {
            this.debugLog('info', 'Production environment - direct requests', {
                hostname
            });
        }
        
        // Test CORS proxy availability
        if (this.corsProxy) {
            this.testCORSProxy();
        }
    }

    /**
     * Test CORS proxy availability
     */
    async testCORSProxy() {
        try {
            const testUrl = 'https://httpbin.org/json';
            const proxiedUrl = `${this.corsProxy}${encodeURIComponent(testUrl)}`;
            
            this.debugLog('info', 'Testing CORS proxy', {
                proxy: this.corsProxy,
                testUrl: proxiedUrl
            });
            
            const response = await fetch(proxiedUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                this.debugLog('info', 'CORS proxy test successful');
            } else {
                this.debugLog('warn', 'CORS proxy test failed', {
                    status: response.status
                });
            }
        } catch (error) {
            this.debugLog('warn', 'CORS proxy test failed', {
                error: error.message
            });
        }
    }

    /**
     * Fetch cards from FFDecks API with enhanced logging
     */
    async fetchFromFFDecks(options = {}) {
        this.debugLog('info', 'Starting FFDecks fetch', { options });
        
        try {
            const url = this.buildURL(this.endpoints.ffdecks.cards, options);
            this.debugLog('info', 'Built FFDecks URL', { url });
            
            const response = await this.makeRequest(url);
            
            this.debugLog('info', 'FFDecks response received', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                contentType: response.headers.get('content-type')
            });
            
            if (response.ok) {
                const data = await response.json();
                
                this.debugLog('info', 'FFDecks data parsed', {
                    dataType: typeof data,
                    isArray: Array.isArray(data),
                    hasCards: !!(data.cards || data.data),
                    topLevelKeys: Object.keys(data),
                    directLength: data.length,
                    cardsLength: data.cards?.length,
                    dataLength: data.data?.length
                });
                
                const normalized = this.normalizeFFDecksData(data);
                
                this.debugLog('info', 'FFDecks data normalized', {
                    normalizedCount: normalized?.length || 0,
                    sampleCard: normalized?.[0] ? {
                        id: normalized[0].id,
                        name: normalized[0].name,
                        source: normalized[0].source
                    } : null
                });
                
                return normalized;
            } else {
                throw new Error(`FFDecks API error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            this.debugLog('error', 'FFDecks fetch failed', {
                error: error.message,
                stack: error.stack,
                errorType: error.constructor.name
            });
            
            logger.error('Error fetching from FFDecks:', error);
            return null;
        }
    }

    /**
     * Fetch card data from multiple sources with comprehensive logging
     */
    async fetchAllCards(forceRefresh = false) {
        const startTime = Date.now();
        this.debugLog('info', `Starting fetchAllCards`, {
            forceRefresh,
            cachedCardsCount: this.cachedCards?.length || 0
        });
        
        if (!forceRefresh && this.cachedCards && this.cachedCards.length > 0) {
            this.debugLog('info', `Returning cached cards`, {
                count: this.cachedCards.length
            });
            return this.cachedCards;
        }

        this.debugLog('info', '🔄 Fetching card data from external sources...');
        logger.info('🔄 Fetching card data from external sources...');
        
        // Check which APIs are healthy before attempting to fetch
        const healthyAPIs = this.getHealthyAPIs();
        this.debugLog('info', 'Healthy APIs detected', { healthyAPIs });
        
        const sources = [
            { 
                name: 'FFDecks', 
                key: 'ffdecks',
                fetcher: () => this.fetchFromFFDecks(),
                isHealthy: healthyAPIs.includes('ffdecks')
            },
            { 
                name: 'FFTCGDB', 
                key: 'fftcgdb',
                fetcher: () => this.fetchFromFFTCGDB(),
                isHealthy: healthyAPIs.includes('fftcgdb')
            },
            { 
                name: 'SquareEnix', 
                key: 'squareEnix',
                fetcher: () => this.fetchFromSquareEnix(),
                isHealthy: healthyAPIs.includes('squareEnix')
            }
        ];

        const results = {};
        let totalFetchedCards = 0;
        
        for (const source of sources) {
            const sourceStartTime = Date.now();
            
            try {
                this.debugLog('info', `📡 Fetching from ${source.name}...`, {
                    isHealthy: source.isHealthy,
                    url: this.endpoints[source.key]?.cards || this.endpoints[source.key]?.base
                });
                
                logger.info(`📡 Fetching from ${source.name}...`);
                
                // Skip unhealthy APIs unless forcing refresh
                if (!source.isHealthy && !forceRefresh) {
                    this.debugLog('warn', `Skipping ${source.name} - API appears unhealthy`);
                    continue;
                }
                
                const data = await source.fetcher();
                const fetchTime = Date.now() - sourceStartTime;
                
                this.debugLog('info', `Fetch completed for ${source.name}`, {
                    fetchTime: `${fetchTime}ms`,
                    dataReceived: !!data,
                    dataLength: data?.length || 0,
                    dataType: typeof data,
                    isArray: Array.isArray(data)
                });
                
                if (data && Array.isArray(data) && data.length > 0) {
                    results[source.key] = data;
                    totalFetchedCards += data.length;
                    
                    this.debugLog('info', `✅ Successfully fetched from ${source.name}`, {
                        cardCount: data.length,
                        sampleCard: data[0] ? {
                            id: data[0].id,
                            name: data[0].name,
                            hasImage: !!data[0].image
                        } : null
                    });
                    
                    logger.info(`✅ Fetched ${data.length} cards from ${source.name}`);
                } else {
                    this.debugLog('warn', `⚠️ No valid data from ${source.name}`, {
                        data: data,
                        isNull: data === null,
                        isUndefined: data === undefined,
                        isEmptyArray: Array.isArray(data) && data.length === 0
                    });
                    
                    logger.warn(`⚠️ No data from ${source.name}`);
                }
            } catch (error) {
                const fetchTime = Date.now() - sourceStartTime;
                
                this.debugLog('error', `❌ Error fetching from ${source.name}`, {
                    error: error.message,
                    stack: error.stack,
                    fetchTime: `${fetchTime}ms`,
                    errorType: error.constructor.name
                });
                
                logger.error(`❌ Error fetching from ${source.name}:`, error);
            }
        }

        this.debugLog('info', 'All sources processed', {
            sourcesAttempted: sources.length,
            sourcesSuccessful: Object.keys(results).length,
            totalCardsFromAllSources: totalFetchedCards,
            results: Object.keys(results).map(key => ({
                source: key,
                count: results[key]?.length || 0
            }))
        });

        // Merge and deduplicate cards from all sources
        this.debugLog('info', 'Starting card merge process');
        const mergedCards = this.mergeCardSources(results);
        
        this.debugLog('info', 'Card merge completed', {
            originalTotal: totalFetchedCards,
            mergedTotal: mergedCards.length,
            duplicatesRemoved: totalFetchedCards - mergedCards.length
        });
        
        // Cache the results
        this.debugLog('info', 'Caching merged results');
        this.cacheCardData(mergedCards);
        
        const totalTime = Date.now() - startTime;
        this.debugLog('info', 'fetchAllCards completed', {
            totalTime: `${totalTime}ms`,
            finalCardCount: mergedCards.length,
            sourcesUsed: Object.keys(results)
        });
        
        return mergedCards;
    }

    /**
     * Fetch from FFTCGDB (community database)
     */
    async fetchFromFFTCGDB() {
        this.debugLog('info', 'Starting FFTCGDB fetch');
        
        try {
            const url = this.endpoints.fftcgdb.cards;
            this.debugLog('info', 'Making FFTCGDB request', { url });
            
            const response = await this.makeRequest(url);
            
            this.debugLog('info', 'FFTCGDB response received', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (response.ok) {
                const data = await response.json();
                this.debugLog('info', 'FFTCGDB data parsed', {
                    dataType: typeof data,
                    isArray: Array.isArray(data),
                    length: data?.length
                });
                
                const normalized = this.normalizeFFTCGDBData(data);
                this.debugLog('info', 'FFTCGDB data normalized', {
                    normalizedCount: normalized?.length || 0
                });
                
                return normalized;
            } else {
                this.debugLog('warn', 'FFTCGDB request failed, using fallback', {
                    status: response.status,
                    statusText: response.statusText
                });
                return this.generateFallbackData();
            }
        } catch (error) {
            this.debugLog('error', 'FFTCGDB fetch failed', {
                error: error.message,
                stack: error.stack
            });
            
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
     * Make HTTP request with rate limiting, CORS handling, and retry logic
     */
    async makeRequest(url, options = {}, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
        
        this.debugLog('info', 'Making HTTP request', {
            url,
            retryCount,
            maxRetries,
            corsProxy: this.corsProxy
        });
        
        // Check rate limiting
        if (!this.checkRateLimit(url)) {
            this.debugLog('warn', 'Rate limit exceeded', { url });
            throw new Error('Rate limit exceeded');
        }

        // Add CORS proxy if needed
        let requestUrl = url;
        if (this.corsProxy) {
            // Try different CORS proxy strategies
            if (this.corsProxy.includes('allorigins')) {
                requestUrl = `${this.corsProxy}${encodeURIComponent(url)}`;
            } else {
                requestUrl = `${this.corsProxy}${url}`;
            }
            
            this.debugLog('info', 'Using CORS proxy', {
                originalUrl: url,
                proxiedUrl: requestUrl
            });
        }
        
        // Default options with better error handling
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FFTCG-Simulator/1.0',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000, // 15 second timeout
            ...options
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                this.debugLog('warn', 'Request timeout', { url, timeout: defaultOptions.timeout });
            }, defaultOptions.timeout);
            
            const response = await fetch(requestUrl, {
                ...defaultOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            this.debugLog('info', 'Request completed', {
                url,
                status: response.status,
                ok: response.ok,
                retryCount
            });
            
            // Handle specific error cases that might benefit from retry
            if (!response.ok && retryCount < maxRetries) {
                const shouldRetry = this.shouldRetryRequest(response.status);
                
                if (shouldRetry) {
                    this.debugLog('info', `Retrying request (${retryCount + 1}/${maxRetries})`, {
                        url,
                        status: response.status,
                        delay: retryDelay
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.makeRequest(url, options, retryCount + 1);
                }
            }
            
            return response;
            
        } catch (error) {
            this.debugLog('error', 'Request failed', {
                url,
                error: error.message,
                retryCount,
                willRetry: retryCount < maxRetries
            });
            
            // Retry on network errors
            if (retryCount < maxRetries && this.shouldRetryError(error)) {
                this.debugLog('info', `Retrying after error (${retryCount + 1}/${maxRetries})`, {
                    error: error.message,
                    delay: retryDelay
                });
                
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.makeRequest(url, options, retryCount + 1);
            }
            
            throw error;
        }
    }

    /**
     * Determine if a request should be retried based on HTTP status
     */
    shouldRetryRequest(status) {
        // Retry on server errors and rate limiting
        return status >= 500 || status === 429 || status === 408;
    }

    /**
     * Determine if a request should be retried based on error type
     */
    shouldRetryError(error) {
        // Retry on network errors, timeouts, and CORS issues
        return error.name === 'AbortError' || 
               error.name === 'TypeError' || 
               error.message.includes('network') ||
               error.message.includes('timeout') ||
               error.message.includes('CORS');
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
        this.debugLog('info', 'Normalizing FFDecks data', {
            inputType: typeof data,
            isArray: Array.isArray(data),
            hasCards: !!(data?.cards),
            hasData: !!(data?.data),
            topLevelKeys: typeof data === 'object' ? Object.keys(data) : []
        });
        
        let cardsArray = data;
        
        // Handle different response formats
        if (!Array.isArray(data)) {
            if (data.cards) {
                cardsArray = data.cards;
                this.debugLog('info', 'Using data.cards array', { length: cardsArray.length });
            } else if (data.data) {
                cardsArray = data.data;
                this.debugLog('info', 'Using data.data array', { length: cardsArray.length });
            } else if (typeof data === 'object') {
                cardsArray = [data];
                this.debugLog('info', 'Converting single object to array');
            } else {
                this.debugLog('warn', 'Unable to extract cards from data', { data });
                return [];
            }
        }
        
        if (!Array.isArray(cardsArray)) {
            this.debugLog('error', 'Cards data is not an array', {
                type: typeof cardsArray,
                value: cardsArray
            });
            return [];
        }
        
        this.debugLog('info', `Starting normalization of ${cardsArray.length} cards`);
        
        const normalizedCards = cardsArray.map((card, index) => {
            if (!card || typeof card !== 'object') {
                this.debugLog('warn', `Invalid card at index ${index}`, { card });
                return null;
            }
            
            const normalized = {
                id: card.id || card.code || `ffdecks-${card.name?.replace(/\s+/g, '-').toLowerCase()}` || `ffdecks-unknown-${index}`,
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
            };
            
            // Log first few cards for debugging
            if (index < 3) {
                this.debugLog('info', `Normalized card ${index}`, {
                    original: {
                        id: card.id,
                        name: card.name,
                        element: card.element,
                        type: card.type
                    },
                    normalized: {
                        id: normalized.id,
                        name: normalized.name,
                        element: normalized.element,
                        type: normalized.type
                    }
                });
            }
            
            return normalized;
        }).filter(card => card !== null);
        
        this.debugLog('info', 'FFDecks normalization completed', {
            originalCount: cardsArray.length,
            normalizedCount: normalizedCards.length,
            filtered: cardsArray.length - normalizedCards.length
        });
        
        return normalizedCards;
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
        this.debugLog('info', '📦 Generating fallback card data...');
        logger.info('📦 Generating fallback card data...');
        
        // Return expanded card sets based on known FFTCG structure
        const fallbackCards = [];
        const sets = ['Opus I', 'Opus II', 'Opus III', 'Opus IV', 'Opus V'];
        const elements = ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'];
        const types = ['forward', 'backup', 'summon'];
        const rarities = ['C', 'R', 'H', 'L'];
        
        let totalGenerated = 0;
        
        sets.forEach((set, setIndex) => {
            this.debugLog('info', `Generating cards for ${set}`);
            
            for (let i = 1; i <= 186; i++) { // Standard set size
                const cardNumber = i.toString().padStart(3, '0');
                const rarity = this.determineRarity(i);
                const element = elements[Math.floor(i / 23) % elements.length];
                const type = types[i % types.length];
                
                const card = {
                    id: `${setIndex + 1}-${cardNumber}${rarity}`,
                    name: `${set} Card ${cardNumber}`,
                    element: element,
                    type: type,
                    cost: Math.min(Math.max(Math.floor(i / 30) + 1, 1), 9),
                    power: type === 'forward' ? (Math.floor(i / 20) + 2) * 1000 : undefined,
                    rarity: rarity,
                    text: `Card ability text for ${set} ${cardNumber}`,
                    set: set,
                    cardNumber: cardNumber,
                    image: `${this.imageSources.fallback}${encodeURIComponent(set + ' ' + cardNumber)}`,
                    source: 'fallback',
                    hasRealImage: false
                };
                
                fallbackCards.push(card);
                totalGenerated++;
            }
        });
        
        this.debugLog('info', 'Fallback data generation completed', {
            totalCards: totalGenerated,
            sets: sets.length,
            cardsPerSet: 186
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
     * Merge card data from multiple sources with detailed logging
     */
    mergeCardSources(sources) {
        this.debugLog('info', 'Starting card merge', {
            availableSources: Object.keys(sources),
            sourceCounts: Object.keys(sources).map(key => ({
                source: key,
                count: sources[key]?.length || 0
            }))
        });
        
        const cardMap = new Map();
        let totalProcessed = 0;
        let duplicatesFound = 0;
        let replacements = 0;
        
        // Priority order: FFDecks > FFTCGDB > SquareEnix > Fallback
        const priorityOrder = ['ffdecks', 'fftcgdb', 'squareEnix', 'fallback'];
        
        priorityOrder.forEach(sourceName => {
            const cards = sources[sourceName];
            
            this.debugLog('info', `Processing source: ${sourceName}`, {
                hasCards: !!cards,
                isArray: Array.isArray(cards),
                count: cards?.length || 0
            });
            
            if (cards && Array.isArray(cards)) {
                cards.forEach((card, index) => {
                    totalProcessed++;
                    
                    if (!card || !card.id) {
                        this.debugLog('warn', `Invalid card at index ${index} in ${sourceName}`, {
                            card: card,
                            hasId: !!card?.id,
                            hasName: !!card?.name
                        });
                        return;
                    }
                    
                    const existingCard = cardMap.get(card.id);
                    
                    if (existingCard) {
                        duplicatesFound++;
                        
                        if (this.isHigherPriority(card.source, existingCard.source)) {
                            this.debugLog('info', `Replacing card with higher priority`, {
                                cardId: card.id,
                                cardName: card.name,
                                oldSource: existingCard.source,
                                newSource: card.source
                            });
                            
                            cardMap.set(card.id, card);
                            replacements++;
                        } else {
                            this.debugLog('info', `Keeping existing card (higher priority)`, {
                                cardId: card.id,
                                cardName: card.name,
                                existingSource: existingCard.source,
                                attemptedSource: card.source
                            });
                        }
                    } else {
                        this.debugLog('info', `Adding new card`, {
                            cardId: card.id,
                            cardName: card.name,
                            source: card.source,
                            totalInMap: cardMap.size + 1
                        });
                        
                        cardMap.set(card.id, card);
                    }
                });
            }
        });
        
        const mergedCards = Array.from(cardMap.values());
        
        this.debugLog('info', 'Card merge completed', {
            totalProcessed,
            duplicatesFound,
            replacements,
            finalCount: mergedCards.length,
            sourceBreakdown: this.getSourceBreakdown(mergedCards)
        });
        
        return mergedCards;
    }

    /**
     * Get breakdown of cards by source
     */
    getSourceBreakdown(cards) {
        const breakdown = {};
        cards.forEach(card => {
            const source = card.source || 'unknown';
            breakdown[source] = (breakdown[source] || 0) + 1;
        });
        return breakdown;
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
     * Get comprehensive API status and statistics
     */
    getAPIStatus() {
        return {
            cachedCards: this.cachedCards?.length || 0,
            lastUpdate: this.getLastUpdateTime(),
            availableSources: Object.keys(this.endpoints),
            rateLimitStatus: Array.from(this.rateLimiter.entries()),
            healthStatus: this.getHealthStatus(),
            debugLogs: {
                total: this.debugLogs.length,
                recent: this.getDebugLogs('error', 10),
                levels: {
                    error: this.getDebugLogs('error').length,
                    warn: this.getDebugLogs('warn').length,
                    info: this.getDebugLogs('info').length
                }
            },
            corsProxy: this.corsProxy || 'none'
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

    /**
     * Enhanced debug logging system
     */
    debugLog(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data ? JSON.stringify(data, null, 2) : null
        };
        
        this.debugLogs.push(logEntry);
        
        // Keep only the last MAX_DEBUG_LOGS entries
        if (this.debugLogs.length > this.MAX_DEBUG_LOGS) {
            this.debugLogs = this.debugLogs.slice(-this.MAX_DEBUG_LOGS);
        }
        
        // Also log to console with appropriate level
        const consoleMessage = `[External API] ${message}`;
        switch (level) {
            case 'error':
                console.error(consoleMessage, data);
                break;
            case 'warn':
                console.warn(consoleMessage, data);
                break;
            case 'info':
                console.info(consoleMessage, data);
                break;
            default:
                console.log(consoleMessage, data);
        }
    }

    /**
     * Get debug logs
     */
    getDebugLogs(level = null, limit = 100) {
        let logs = this.debugLogs;
        
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        
        return logs.slice(-limit);
    }

    /**
     * Clear debug logs
     */
    clearDebugLogs() {
        this.debugLogs = [];
        this.debugLog('info', 'Debug logs cleared');
    }

    /**
     * Export debug information for troubleshooting
     */
    exportDebugInfo() {
        return {
            timestamp: new Date().toISOString(),
            healthStatus: this.getHealthStatus(),
            apiStatus: this.getAPIStatus(),
            recentLogs: this.getDebugLogs(null, 50),
            configuration: {
                corsProxy: this.corsProxy,
                cacheKey: this.CACHE_KEY,
                cacheDuration: this.CACHE_DURATION,
                endpoints: this.endpoints
            },
            userAgent: navigator.userAgent,
            location: window.location.href
        };
    }

    /**
     * Start periodic health checks for all APIs
     */
    startPeriodicHealthChecks() {
        // Clear any existing interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.debugLog('info', 'Starting periodic health checks', {
            interval: this.HEALTH_CHECK_INTERVAL
        });
        
        // Run initial health check
        this.performHealthCheck();
        
        // Set up periodic checks
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.HEALTH_CHECK_INTERVAL);
    }

    /**
     * Stop periodic health checks
     */
    stopPeriodicHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.debugLog('info', 'Stopped periodic health checks');
        }
    }

    /**
     * Perform health check on all APIs
     */
    async performHealthCheck() {
        if (this.isHealthCheckRunning) {
            this.debugLog('warn', 'Health check already running, skipping');
            return;
        }
        
        this.isHealthCheckRunning = true;
        this.lastHealthCheck = new Date();
        
        this.debugLog('info', 'Starting API health check');
        
        const apis = [
            { name: 'ffdecks', url: this.endpoints.ffdecks.cards },
            { name: 'fftcgdb', url: this.endpoints.fftcgdb.cards },
            { name: 'squareEnix', url: this.endpoints.squareEnix.base }
        ];
        
        for (const api of apis) {
            try {
                this.debugLog('info', `Testing ${api.name} API`, { url: api.url });
                
                const startTime = Date.now();
                const response = await this.makeHealthCheckRequest(api.url);
                const responseTime = Date.now() - startTime;
                
                const status = {
                    name: api.name,
                    url: api.url,
                    isOnline: response.ok,
                    status: response.status,
                    responseTime,
                    lastChecked: new Date(),
                    error: null
                };
                
                if (!response.ok) {
                    status.error = `HTTP ${response.status}: ${response.statusText}`;
                    this.debugLog('warn', `${api.name} API offline`, status);
                } else {
                    this.debugLog('info', `${api.name} API online`, {
                        responseTime: `${responseTime}ms`
                    });
                }
                
                this.healthStatus.set(api.name, status);
                
            } catch (error) {
                const status = {
                    name: api.name,
                    url: api.url,
                    isOnline: false,
                    status: 0,
                    responseTime: null,
                    lastChecked: new Date(),
                    error: error.message
                };
                
                this.debugLog('error', `${api.name} API error`, {
                    error: error.message,
                    stack: error.stack
                });
                
                this.healthStatus.set(api.name, status);
            }
            
            // Small delay between checks to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.isHealthCheckRunning = false;
        this.debugLog('info', 'Health check completed', {
            results: Array.from(this.healthStatus.values())
        });
    }

    /**
     * Make a lightweight health check request
     */
    async makeHealthCheckRequest(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
            const response = await fetch(url, {
                method: 'HEAD', // Use HEAD request for lighter health checks
                signal: controller.signal,
                headers: {
                    'User-Agent': 'FFTCG-Simulator/1.0 (Health Check)'
                }
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout (10s)');
            }
            throw error;
        }
    }

    /**
     * Get current health status for all APIs
     */
    getHealthStatus() {
        return {
            lastCheck: this.lastHealthCheck,
            isRunning: this.isHealthCheckRunning,
            apis: Array.from(this.healthStatus.values()),
            summary: {
                total: this.healthStatus.size,
                online: Array.from(this.healthStatus.values()).filter(api => api.isOnline).length,
                offline: Array.from(this.healthStatus.values()).filter(api => !api.isOnline).length
            }
        };
    }

    /**
     * Check if a specific API is healthy
     */
    isAPIHealthy(apiName) {
        const status = this.healthStatus.get(apiName);
        return status ? status.isOnline : false;
    }

    /**
     * Get healthy APIs only
     */
    getHealthyAPIs() {
        return Array.from(this.healthStatus.values())
            .filter(api => api.isOnline)
            .map(api => api.name);
    }

    /**
     * Force refresh of API health status
     */
    async refreshHealthStatus() {
        this.debugLog('info', 'Manually refreshing health status');
        await this.performHealthCheck();
        return this.getHealthStatus();
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopPeriodicHealthChecks();
        this.clearDebugLogs();
        this.debugLog('info', 'External API instance destroyed');
    }
}

// Create and export singleton instance
export const externalCardAPI = new ExternalCardAPI();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.externalCardAPI = externalCardAPI;
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
        externalCardAPI.destroy();
    });
}