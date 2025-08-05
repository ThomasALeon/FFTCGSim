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
import { imageMapping } from '../utils/ImageMapping.js';

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
        this.elementFilter = []; // Changed to array for multiple selection
        this.typeFilter = [];     // Changed to array for multiple selection
        this.costFilter = [];     // Changed to array for multiple selection
        this.rarityFilter = [];   // Changed to array for multiple selection
        this.opusFilter = [];     // Changed to array for multiple selection
        this.categoryFilter = []; // Changed to array for multiple selection
        this.sortOption = 'name-asc'; // Default sort option
        
        // UI elements
        this.cardGrid = null;
        this.deckList = null;
        this.searchInput = null;
        this.elementSelect = null;
        this.typeSelect = null;
        
        // Card preview elements
        this.cardPreview = null;
        
        // Event handlers
        this.boundHandlers = {};
        
        // Note: initialize() must be called separately with await
    }

    /**
     * Initialize the deck builder
     */
    async initialize() {
        await imageMapping.loadCardImageMapping();
        this.setupUIElements();
        this.setupEventListeners();
        this.initializeDeckManager();
        
        logger.info('🔨 Deck Builder initialized with minimal UI');
    }


    /**
     * Get the appropriate image HTML for a card
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
                     onerror="window.app?.deckBuilder?.handleImageError(this, '${card.id}')"
                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
                <div class="card-placeholder element-${card.element}" style="display: none;">
                    <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                    <div class="card-placeholder-text">${card.name}</div>
                    <div class="card-placeholder-meta">${card.set || 'Unknown'} - Image Failed</div>
                </div>
            `;
        } else {
            // Use placeholder
            return `
                <div class="card-placeholder element-${card.element}">
                    <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                    <div class="card-placeholder-text">${card.name}</div>
                    <div class="card-placeholder-meta">${card.set || 'Unknown'}</div>
                </div>
            `;
        }
    }

    /**
     * Handle image loading errors with fallback to card database image
     */
    handleImageError(imgElement, cardId) {
        const card = this.cardDatabase.getCard(cardId);
        if (card && card.hasRealImage && card.image) {
            console.warn(`Image mapping failed for ${cardId}, falling back to card database image: ${card.image}`);
            imgElement.src = card.image;
        } else {
            console.warn(`No fallback image available for ${cardId}`);
            imgElement.style.display = 'none';
            imgElement.nextElementSibling.style.display = 'block';
        }
    }

    /**
     * Set up UI element references
     */
    setupUIElements() {
        // Main UI containers (using different names to avoid conflict with class instances)
        this.deckManagerElement = document.getElementById('deckManager');
        this.deckEditorElement = document.getElementById('deckEditor');
        this.deckListContainer = document.getElementById('deckListContainer');
        this.noDecksPlaceholder = document.getElementById('noDecksPlaceholder');
        
        // Card search panel
        this.cardSearchPanel = document.getElementById('cardSearchPanel');
        this.cardGrid = document.getElementById('cardDatabase');
        this.searchInput = document.getElementById('cardSearch');
        this.sortSelect = document.getElementById('sortSelect');
        this.elementSelect = document.getElementById('elementFilter');
        this.typeSelect = document.getElementById('typeFilter');
        
        // Deck editing elements
        this.deckList = document.getElementById('currentDeck');
        this.deckNameInput = document.getElementById('deckName');
        this.deckCardCount = document.getElementById('deckCardCount');
        this.saveDeckBtn = document.getElementById('saveDeckBtn');
        
        if (!this.deckManagerElement || !this.deckEditorElement) {
            throw new Error('Required deck builder elements not found in DOM');
        }
        
        // Generate set filter buttons dynamically once card database is loaded
        this.generateSetFilterButtons();
        this.generateCategoryFilterButtons();
        
        // Initialize card preview
        this.initializeCardPreview();
    }

    /**
     * Initialize the card preview overlay system
     */
    initializeCardPreview() {
        // Create the preview overlay element
        this.cardPreview = document.createElement('div');
        this.cardPreview.className = 'card-preview-overlay';
        this.cardPreview.style.display = 'none';
        document.body.appendChild(this.cardPreview);
        
        logger.debug('✅ Card preview overlay initialized');
    }

    /**
     * Show simple card art hover preview
     */
    showCardArtHover(card, mouseEvent) {
        if (!this.cardPreview || !card) return;
        
        // Get the card image URL using same fallback logic as getCardImageHTML
        const cardImageMapping = imageMapping.getCardImageMapping(card.id);
        let imageUrl = null;
        
        if (cardImageMapping && cardImageMapping.image) {
            imageUrl = cardImageMapping.image;
        } else if (card.hasRealImage && card.image) {
            imageUrl = card.image;
        }
        
        // If no image available, don't show preview
        if (!imageUrl) return;
        
        this.displayCardArtPreview(imageUrl, mouseEvent, card);
    }
    
    /**
     * Display floating card art preview with text
     */
    displayCardArtPreview(imageUrl, mouseEvent, card) {
        if (!this.cardPreview) return;
        
        // Calculate smart positioning (opposite side of screen from cursor)
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const cursorX = mouseEvent.clientX;
        const cursorY = mouseEvent.clientY;
        
        // Determine text class and estimate height based on content
        let textClass = '';
        let estimatedTextHeight = 0;
        
        if (card.text) {
            const textLength = card.text.length;
            if (textLength <= 100) {
                textClass = 'short-text';
                // Estimate: ~40-60px for short text
                estimatedTextHeight = Math.min(60, Math.ceil(textLength / 50) * 20 + 20);
            } else if (textLength <= 250) {
                textClass = 'medium-text';
                // Estimate: ~60-100px for medium text  
                estimatedTextHeight = Math.min(100, Math.ceil(textLength / 40) * 16 + 30);
            } else {
                textClass = 'long-text';
                // Estimate: ~100-150px for long text
                estimatedTextHeight = Math.min(150, Math.ceil(textLength / 35) * 14 + 40);
            }
        }
        
        // Calculate total height: image (~320px) + padding (~16px) + text height
        const adjustedHeight = 320 + 16 + estimatedTextHeight + 20; // +20 for container padding
        
        // Determine which side of screen cursor is on
        const isLeftSide = cursorX < screenWidth / 2;
        const isTopSide = cursorY < screenHeight / 2;
        
        // Position preview on opposite side with dynamic sizing
        let left, top;
        if (isLeftSide) {
            // Cursor on left, show preview on right
            left = screenWidth - 290; // estimated width + margin
        } else {
            // Cursor on right, show preview on left
            left = 20;
        }
        
        if (isTopSide) {
            // Cursor on top, show preview toward bottom
            top = Math.min(cursorY + 20, screenHeight - adjustedHeight);
        } else {
            // Cursor on bottom, show preview toward top
            top = Math.max(cursorY - adjustedHeight, 20);
        }
        
        // Floating card preview with art and dynamically sized text
        this.cardPreview.innerHTML = `
            <img src="${imageUrl}" alt="${card.name}">
            ${card.text ? `<div class="card-preview-text ${textClass}">${card.text}</div>` : ''}
        `;
        
        // Apply positioning and show
        this.cardPreview.style.left = `${left}px`;
        this.cardPreview.style.top = `${top}px`;
        this.cardPreview.style.display = 'block';
    }
    
    /**
     * Hide card art preview
     */
    hideCardPreview() {
        if (this.cardPreview) {
            this.cardPreview.style.display = 'none';
        }
    }

    /**
     * Generate set filter buttons dynamically based on available sets in database
     */
    generateSetFilterButtons() {
        const opusButtonsContainer = document.getElementById('opusButtons');
        if (!opusButtonsContainer || !this.cardDatabase) {
            logger.warn('Cannot generate set filter buttons - missing container or card database');
            return;
        }

        try {
            // Get all available sets from the database
            const availableSets = this.cardDatabase.getAllSets();
            logger.info(`🎯 Generating filter buttons for ${availableSets.length} sets:`, availableSets);

            // Save the "All" button state before clearing
            const existingAllButton = opusButtonsContainer.querySelector('[data-opus=""]');
            const wasAllButtonActive = existingAllButton?.classList.contains('active') || false;
            
            // Clear existing buttons
            opusButtonsContainer.innerHTML = '';
            
            // Re-create the "All" button first
            const allButton = document.createElement('button');
            allButton.className = 'filter-btn' + (wasAllButtonActive ? ' active' : '');
            allButton.setAttribute('data-opus', '');
            allButton.textContent = 'All';
            allButton.onclick = () => window.app?.deckBuilder?.setOpusFilter('');
            opusButtonsContainer.appendChild(allButton);

            // Generate buttons for each available set
            availableSets.forEach(setName => {
                const button = document.createElement('button');
                button.className = 'filter-btn';
                button.setAttribute('data-opus', setName);
                button.onclick = () => window.app?.deckBuilder?.setOpusFilter(setName);
                
                // Create display name (shorten long names for UI)
                let displayName = setName;
                if (setName.length > 12) {
                    // For long names, try to create a shorter version
                    if (setName.startsWith('Opus ')) {
                        displayName = setName; // Keep Opus X format as-is
                    } else {
                        // For named sets, abbreviate intelligently
                        const words = setName.split(' ');
                        if (words.length > 2) {
                            displayName = words.map(word => word.charAt(0)).join('') + ' ' + this.getOpusNumber(setName);
                        }
                    }
                }
                
                button.textContent = displayName;
                button.title = setName; // Full name on hover
                
                // Add CSS class for styling specific sets
                const cssClass = this.getSetCSSClass(setName);
                if (cssClass) {
                    button.classList.add(cssClass);
                }
                
                opusButtonsContainer.appendChild(button);
            });

            logger.info(`✅ Generated ${availableSets.length} set filter buttons`);
        } catch (error) {
            logger.error('Failed to generate set filter buttons:', error);
        }
    }

    /**
     * Generate category filter buttons dynamically based on available categories in database
     */
    generateCategoryFilterButtons() {
        const categoryButtonsContainer = document.getElementById('categoryButtons');
        if (!categoryButtonsContainer || !this.cardDatabase) {
            logger.warn('Cannot generate category filter buttons - missing container or card database');
            return;
        }

        try {
            // Get all unique categories from the database and consolidate them
            const allCards = this.cardDatabase.getAllCards();
            const consolidatedCategories = this.getConsolidatedCategories(allCards);

            logger.info(`🎯 Generating filter buttons for ${consolidatedCategories.length} consolidated categories`);

            // Save the "All" button state before clearing
            const existingAllButton = categoryButtonsContainer.querySelector('[data-category=""]');
            const wasAllButtonActive = existingAllButton?.classList.contains('active') || true;
            
            // Clear existing buttons
            categoryButtonsContainer.innerHTML = '';
            
            // Re-create the "All" button first
            const allButton = document.createElement('button');
            allButton.className = 'filter-btn' + (wasAllButtonActive ? ' active' : '');
            allButton.setAttribute('data-category', '');
            allButton.textContent = 'All';
            allButton.onclick = () => window.app?.deckBuilder?.setCategoryFilter('');
            categoryButtonsContainer.appendChild(allButton);

            // Sort categories by card count (descending) but prioritize FF main series
            const ffMainSeries = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
            const ffMainCategories = consolidatedCategories.filter(cat => ffMainSeries.includes(cat.category));
            const otherCategories = consolidatedCategories.filter(cat => !ffMainSeries.includes(cat.category));
            
            // Sort FF main series by roman numeral order, others by card count
            ffMainCategories.sort((a, b) => ffMainSeries.indexOf(a.category) - ffMainSeries.indexOf(b.category));
            otherCategories.sort((a, b) => b.count - a.count);
            
            const prioritizedCategories = [...ffMainCategories, ...otherCategories];

            // Show all categories since we've consolidated to 34
            prioritizedCategories.forEach(categoryInfo => {
                const category = categoryInfo.category;
                const button = document.createElement('button');
                button.className = 'filter-btn';
                button.setAttribute('data-category', category);
                button.onclick = () => window.app?.deckBuilder?.setCategoryFilter(category);
                
                // Create display name with mapping
                let displayName = this.getCategoryDisplayName(category);
                
                button.textContent = displayName;
                button.title = `${category} - ${categoryInfo.count} cards - Filter by ${displayName}`;
                
                categoryButtonsContainer.appendChild(button);
            });

            logger.info(`✅ Generated ${prioritizedCategories.length} category filter buttons`);
        } catch (error) {
            logger.error('Failed to generate category filter buttons:', error);
        }
    }

    /**
     * Get consolidated categories from cards with dual category support
     */
    getConsolidatedCategories(cards) {
        const consolidatedCounts = {};
        
        cards.forEach(card => {
            const cardCategories = this.getCardCategories(card.category);
            cardCategories.forEach(category => {
                consolidatedCounts[category] = (consolidatedCounts[category] || 0) + 1;
            });
        });
        
        return Object.entries(consolidatedCounts)
            .map(([category, count]) => ({ category, count }))
            .filter(item => item.count > 0);
    }

    /**
     * Get all categories for a card, splitting dual categories and mapping to consolidated names
     */
    getCardCategories(categoryString) {
        if (!categoryString) return ['Special'];
        
        // Split dual categories on &middot; separator
        const rawCategories = categoryString.includes('&middot;') 
            ? categoryString.split('&middot;').map(cat => cat.trim())
            : [categoryString.trim()];
            
        // Map each raw category to its consolidated form
        const categoryMapping = this.getCategoryMapping();
        const consolidatedCategories = rawCategories.map(rawCat => {
            return categoryMapping[rawCat] || this.mapSingleCategory(rawCat);
        });
        
        // Remove duplicates and return
        return [...new Set(consolidatedCategories)];
    }
    
    /**
     * Map a single category to its consolidated form
     */
    mapSingleCategory(category) {
        if (!category) return 'Special';
        
        // Roman numerals
        if (/^[IVX]+$/.test(category)) return category;
        
        // Direct matches for known categories
        const directMappings = {
            'TYPE-0': 'Type-0',
            'MOBIUS': 'Mobius',
            'THEATRHYTHM': 'THEATRHYTHM',
            'PICTLOGICA': 'Pictlogica',
            'FFBE': 'FFBE',
            'SOPFFO': 'SOPFFO',
            'FFCC': 'FFCC',
            'FFT': 'FFT',
            'FFTA': 'FFTA',
            'FFTA2': 'FFTA2',
            'FFTS': 'FFTS',
            'FFL': 'FFL',
            'FFEX': 'FFEX',
            'FFRK': 'FFRK',
            'LOV': 'LOV',
            'WOFF': 'WOFF',
            'DFF': 'DFF',
            'Crystal Hunt': 'Crystal Hunt',
            'MQ': 'MQ',
            'Special': 'Special'
        };
        
        return directMappings[category] || 'Special';
    }

    /**
     * Get category mapping for consolidation
     */
    getCategoryMapping() {
        return {
            'VIII': 'VIII', 'WOFF': 'WOFF', 'XI': 'XI', 'VI': 'VI', 'XIV': 'XIV', 
            'TYPE-0': 'Type-0', 'THEATRHYTHM &middot; TYPE-0': 'Type-0', 'PICTLOGICA &middot; TYPE-0': 'Type-0',
            'FFBE': 'FFBE', 'FFBE &middot; FFT': 'FFBE', 'SOPFFO': 'SOPFFO', 'III': 'III', 'XII': 'XII',
            'Special': 'Special', 'I &middot; II': 'Special',
            // Mobius variations
            'MOBIUS &middot; VIII': 'Mobius', 'MOBIUS &middot; XI': 'Mobius', 'MOBIUS &middot; V': 'Mobius',
            'MOBIUS': 'Mobius', 'MOBIUS &middot; VII': 'Mobius', 'MOBIUS &middot; VI': 'Mobius',
            'MOBIUS &middot; X': 'Mobius', 'MOBIUS &middot; XIII': 'Mobius', 'MOBIUS &middot; XII': 'Mobius',
            'MOBIUS &middot; IV': 'Mobius', 'MOBIUS &middot; II': 'Mobius', 'MOBIUS &middot; III': 'Mobius',
            'II': 'II',
            // THEATRHYTHM variations
            'THEATRHYTHM &middot; VIII': 'THEATRHYTHM', 'THEATRHYTHM &middot; II': 'THEATRHYTHM',
            'THEATRHYTHM &middot; V': 'THEATRHYTHM', 'THEATRHYTHM &middot; XI': 'THEATRHYTHM',
            'THEATRHYTHM &middot; XIII': 'THEATRHYTHM', 'THEATRHYTHM &middot; X': 'THEATRHYTHM',
            'THEATRHYTHM': 'THEATRHYTHM', 'THEATRHYTHM &middot; XV': 'THEATRHYTHM',
            'THEATRHYTHM &middot; VI': 'THEATRHYTHM', 'THEATRHYTHM &middot; IV': 'THEATRHYTHM',
            'THEATRHYTHM &middot; FFCC': 'THEATRHYTHM', 'THEATRHYTHM &middot; MQ': 'THEATRHYTHM',
            'THEATRHYTHM &middot; VII': 'THEATRHYTHM', 'THEATRHYTHM &middot; IX': 'THEATRHYTHM',
            'THEATRHYTHM &middot; MOBIUS': 'THEATRHYTHM', 'THEATRHYTHM &middot; FFT': 'THEATRHYTHM',
            'THEATRHYTHM &middot; I': 'THEATRHYTHM', 'THEATRHYTHM &middot; XII': 'THEATRHYTHM',
            'THEATRHYTHM &middot; III': 'THEATRHYTHM', 'THEATRHYTHM &middot; XIV': 'THEATRHYTHM',
            // Pictlogica variations
            'PICTLOGICA &middot; MOBIUS': 'Pictlogica', 'PICTLOGICA &middot; FFCC': 'Pictlogica',
            'PICTLOGICA &middot; VII': 'Pictlogica', 'PICTLOGICA &middot; XIII': 'Pictlogica',
            'PICTLOGICA &middot; FFTA': 'Pictlogica', 'PICTLOGICA &middot; X': 'Pictlogica',
            'PICTLOGICA &middot; IV': 'Pictlogica', 'PICTLOGICA &middot; FFTA2': 'Pictlogica',
            'PICTLOGICA &middot; FFT': 'Pictlogica', 'PICTLOGICA &middot; FFL': 'Pictlogica',
            'PICTLOGICA &middot; IX': 'Pictlogica', 'PICTLOGICA &middot; II': 'Pictlogica',
            'PICTLOGICA &middot; XI': 'Pictlogica', 'PICTLOGICA &middot; III': 'Pictlogica',
            'PICTLOGICA &middot; I': 'Pictlogica', 'PICTLOGICA &middot; FFRK': 'Pictlogica',
            'PICTLOGICA &middot; VIII': 'Pictlogica', 'PICTLOGICA &middot; XII': 'Pictlogica',
            'PICTLOGICA &middot; XIV': 'Pictlogica', 'PICTLOGICA &middot; VI': 'Pictlogica',
            'PICTLOGICA &middot; WOFF': 'Pictlogica',
            'IV': 'IV',
            // DFF variations
            'DFF &middot; III': 'DFF', 'DFF &middot; V': 'DFF', 'DFF &middot; TYPE-0': 'DFF',
            'DFF &middot; I': 'DFF', 'DFF': 'DFF', 'DFF &middot; IV': 'DFF', 'DFF &middot; II': 'DFF',
            'DFF &middot; VI': 'DFF', 'DFF &middot; VIII': 'DFF', 'DFF &middot; IX': 'DFF',
            'DFF &middot; FFCC': 'DFF', 'DFF &middot; XIII': 'DFF', 'DFF &middot; XII': 'DFF',
            'DFF &middot; XV': 'DFF', 'DFF &middot; VII': 'DFF', 'DFF &middot; FFT': 'DFF',
            'DFF &middot; XI': 'DFF', 'DFF &middot; XIV': 'DFF', 'DFF &middot; X': 'DFF',
            'V': 'V', 'I': 'I', 'XIII': 'XIII', 'X': 'X',
            // FFT variations
            'FFT': 'FFT', 'FFT &middot; XII': 'FFT', 'FFT &middot; FFTA2': 'FFT',
            'XV': 'XV', 'FFCC': 'FFCC',
            // FFEX variations
            'FFEX': 'FFEX', 'FFEX &middot; V': 'FFEX', 'FFEX &middot; VII': 'FFEX',
            'FFEX &middot; X': 'FFEX', 'FFEX &middot; XII': 'FFEX',
            'VII': 'VII', 'Crystal Hunt': 'Crystal Hunt', 'FFTA': 'FFTA', 'FFL': 'FFL',
            'IX': 'IX', 'FFTA2': 'FFTA2', 'XVI': 'XVI', 'FFRK': 'FFRK',
            // LOV variations
            'LOV &middot; IV': 'LOV', 'LOV &middot; IX': 'LOV', 'LOV &middot; XI': 'LOV', 'LOV &middot; FFT': 'LOV'
        };
    }

    /**
     * Get display name for category
     */
    getCategoryDisplayName(category) {
        const displayNames = {
            'I': 'FF I', 'II': 'FF II', 'III': 'FF III', 'IV': 'FF IV', 'V': 'FF V',
            'VI': 'FF VI', 'VII': 'FF VII', 'VIII': 'FF VIII', 'IX': 'FF IX', 'X': 'FF X',
            'XI': 'FF XI', 'XII': 'FF XII', 'XIII': 'FF XIII', 'XIV': 'FF XIV', 'XV': 'FF XV',
            'XVI': 'FF XVI', 'Type-0': 'Type-0', 'Mobius': 'Mobius', 'FFT': 'Tactics',
            'FFCC': 'Crystal Chronicles', 'FFBE': 'Brave Exvius', 'FFL': 'Legend',
            'DFF': 'Dissidia', 'WOFF': 'World of FF', 'THEATRHYTHM': 'Theatrhythm',
            'Pictlogica': 'Pictlogica', 'FFTA': 'Tactics A', 'FFTA2': 'Tactics A2',
            'FFEX': 'Explorers', 'SOPFFO': 'Stranger of Paradise', 'Crystal Hunt': 'Crystal Hunt',
            'LOV': 'Lord of Vermilion', 'FFRK': 'Record Keeper'
        };
        return displayNames[category] || category;
    }

    /**
     * Get CSS class for set styling
     */
    getSetCSSClass(setName) {
        // Create a CSS-friendly class name
        const className = setName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, '-'); // Replace spaces with hyphens
        return `set-${className}`;
    }

    /**
     * Get Opus number for display purposes
     */
    getOpusNumber(setName) {
        const opusMatch = setName.match(/^Opus\s+([IVXLCDM]+)$/);
        if (opusMatch) {
            return opusMatch[1];
        }
        
        // Map named sets to their Opus numbers
        const namedOpusMap = {
            'Crystal Dominion': 'XV',
            'Emissaries of Light': 'XVI',
            'Rebellion\'s Call': 'XVII',
            'Resurgence of Power': 'XVIII',
            'From Nightmares': 'XIX',
            'Dawn of Heroes': 'XX',
            'Beyond Destiny': 'XXI',
            'Hidden Hope': 'XXII',
            'Hidden Trials': 'XXIII',
            'Hidden Legends': 'XXIV',
            'Tears of the Planet': 'XXV'
        };
        
        return namedOpusMap[setName] || '';
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
        logger.debug(`🔍 Filtered cards: ${this.filteredCards.length} (search: "${this.searchTerm}", element: [${this.elementFilter.join(', ')}], type: [${this.typeFilter.join(', ')}], category: [${this.categoryFilter.join(', ')}])`);
        
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

        // Apply element filter (multiple selection)
        if (this.elementFilter.length > 0) {
            const beforeElement = cards.length;
            cards = cards.filter(card => this.elementFilter.includes(card.element));
            logger.debug(`🔍 After element filter [${this.elementFilter.join(', ')}]: ${beforeElement} → ${cards.length} cards`);
        }

        // Apply type filter (multiple selection)
        if (this.typeFilter.length > 0) {
            const beforeType = cards.length;
            cards = cards.filter(card => this.typeFilter.includes(card.type));
            logger.debug(`🔍 After type filter [${this.typeFilter.join(', ')}]: ${beforeType} → ${cards.length} cards`);
        }

        // Apply cost filter (multiple selection)
        if (this.costFilter.length > 0) {
            const beforeCost = cards.length;
            cards = cards.filter(card => {
                return this.costFilter.some(costFilter => {
                    if (costFilter === '7+') {
                        return card.cost >= 7;
                    } else {
                        const cost = parseInt(costFilter);
                        return card.cost === cost;
                    }
                });
            });
            logger.debug(`🔍 After cost filter [${this.costFilter.join(', ')}]: ${beforeCost} → ${cards.length} cards`);
        }

        // Apply rarity filter (multiple selection)
        if (this.rarityFilter.length > 0) {
            const beforeRarity = cards.length;
            cards = cards.filter(card => this.rarityFilter.includes(card.rarity));
            logger.debug(`🔍 After rarity filter [${this.rarityFilter.join(', ')}]: ${beforeRarity} → ${cards.length} cards`);
        }

        // Apply opus filter (multiple selection)
        if (this.opusFilter.length > 0) {
            const beforeOpus = cards.length;
            cards = cards.filter(card => this.opusFilter.includes(card.set));
            logger.debug(`🔍 After opus filter [${this.opusFilter.join(', ')}]: ${beforeOpus} → ${cards.length} cards`);
        }

        // Apply category filter (multiple selection with dual category support)
        if (this.categoryFilter.length > 0) {
            const beforeCategory = cards.length;
            cards = cards.filter(card => {
                const cardCategories = this.getCardCategories(card.category);
                return cardCategories.some(category => this.categoryFilter.includes(category));
            });
            logger.debug(`🔍 After category filter [${this.categoryFilter.join(', ')}]: ${beforeCategory} → ${cards.length} cards`);
        }

        // Apply sorting
        cards = this.sortCards(cards);

        return cards;
    }

    /**
     * Sort cards based on the current sort option
     */
    sortCards(cards) {
        const [sortBy, direction] = this.sortOption.split('-');
        const ascending = direction === 'asc';

        return cards.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'id':
                    valueA = a.id.toLowerCase();
                    valueB = b.id.toLowerCase();
                    break;
                case 'cost':
                    valueA = a.cost || 0;
                    valueB = b.cost || 0;
                    break;
                case 'category':
                    const categoriesA = this.getCardCategories(a.category);
                    const categoriesB = this.getCardCategories(b.category);
                    // Use the first (primary) category for sorting
                    valueA = categoriesA[0].toLowerCase();
                    valueB = categoriesB[0].toLowerCase();
                    break;
                default:
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
            }

            let comparison;
            if (typeof valueA === 'string') {
                comparison = valueA.localeCompare(valueB);
            } else {
                comparison = valueA - valueB;
            }

            return ascending ? comparison : -comparison;
        });
    }

    /**
     * Set the sort option
     */
    setSortOption(sortOption) {
        this.sortOption = sortOption;
        this.refreshCardDisplay();
        logger.debug(`🔀 Sort option changed to: ${sortOption}`);
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
                <div class="card-image-container">
                    <div class="card-cost-overlay">${card.cost || '-'}</div>
                    <div class="card-image">
                        ${this.getCardImageHTML(card)}
                    </div>
                    <button class="add-to-deck-btn-minimal" onclick="window.app?.deckBuilder?.addCardToDeck('${card.id}')" title="Add to deck">
                        +
                    </button>
                </div>
                <div class="card-info-clean">
                    <div class="card-name-clean">${card.name}</div>
                    <div class="card-power-element">
                        ${card.power ? `<span class="card-power-clean">${card.power}</span>` : ''}
                        <span class="card-element-clean">${this.getElementIcon(card.element)}</span>
                    </div>
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
            if (!e.target.classList.contains('add-to-deck-btn-minimal')) {
                // Ensure dragging class is removed (safeguard)
                cardDiv.classList.remove('dragging');
                
                // Remove focus from the clicked card to prevent hover/focus effects
                cardDiv.blur();
                
                // Remove focus from all other card elements
                document.querySelectorAll('.card-item').forEach(el => {
                    el.blur();
                    el.classList.remove('dragging');
                });
            }
        });

        // Add hover event listeners for card art preview
        const cardImage = cardDiv.querySelector('.card-image');
        if (cardImage) {
            cardImage.addEventListener('mouseenter', (e) => {
                this.showCardArtHover(card, e);
            });
            
            cardImage.addEventListener('mouseleave', () => {
                this.hideCardPreview();
            });
        }

        // Add long-click and double-click event listeners
        this.addCardInteractionListeners(cardDiv, card);

        return cardDiv;
    }

    /**
     * Add interaction listeners for long-click and double-click
     */
    addCardInteractionListeners(cardDiv, card) {
        let longClickTimer = null;
        let isLongClick = false;
        const longClickDuration = 500; // 500ms for long click

        // Mouse/touch down - start long click timer
        const startLongClick = (e) => {
            isLongClick = false;
            longClickTimer = setTimeout(() => {
                isLongClick = true;
                this.showCardDetailModal(card);
            }, longClickDuration);
        };

        // Mouse/touch up - clear timer and handle clicks
        const endLongClick = (e) => {
            if (longClickTimer) {
                clearTimeout(longClickTimer);
                longClickTimer = null;
            }
        };

        // Double click - add to deck or remove from deck
        const handleDoubleClick = (e) => {
            e.preventDefault();
            if (isLongClick) return; // Don't process double click if it was a long click

            // Check if this card is from the deck list or card grid
            const isDeckCard = cardDiv.closest('#currentDeck') !== null;
            
            if (isDeckCard) {
                this.removeCardFromDeck(card.id);
            } else {
                this.addCardToDeck(card.id);
            }
        };

        // Mouse events
        cardDiv.addEventListener('mousedown', startLongClick);
        cardDiv.addEventListener('mouseup', endLongClick);
        cardDiv.addEventListener('mouseleave', endLongClick); // Cancel long click if mouse leaves
        cardDiv.addEventListener('dblclick', handleDoubleClick);

        // Touch events for mobile
        cardDiv.addEventListener('touchstart', startLongClick);
        cardDiv.addEventListener('touchend', endLongClick);
        cardDiv.addEventListener('touchcancel', endLongClick);
    }

    /**
     * Show card detail modal
     */
    showCardDetailModal(card) {
        if (window.app && window.app.modal) {
            window.app.modal.open('cardDetail', { card: card });
        }
    }

    /**
     * Cleanup method to remove event listeners and DOM elements
     */
    cleanup() {
        // Remove preview overlay from DOM
        if (this.cardPreview && this.cardPreview.parentNode) {
            this.cardPreview.parentNode.removeChild(this.cardPreview);
            this.cardPreview = null;
        }
        
        logger.debug('🧹 DeckBuilder cleanup completed');
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

        // Add hover functionality for card preview
        cardDiv.addEventListener('mouseenter', (e) => {
            this.showCardArtHover(card, e);
        });
        
        cardDiv.addEventListener('mouseleave', () => {
            this.hideCardPreview();
        });

        // Add interaction listeners (long-click and double-click)
        this.addCardInteractionListeners(cardDiv, card);

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
        this.updateSearchClearButton();
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
     * Toggle element filter (for button-based filters with multiple selection)
     */
    setElementFilter(element) {
        if (element === '') {
            // "All" button - clear all filters
            this.elementFilter = [];
        } else {
            // Toggle specific element
            const index = this.elementFilter.indexOf(element);
            if (index > -1) {
                this.elementFilter.splice(index, 1); // Remove if already selected
            } else {
                this.elementFilter.push(element); // Add if not selected
            }
        }
        this.updateFilterButtonStates('element', this.elementFilter);
        this.refreshCardDisplay();
    }

    /**
     * Toggle type filter (for button-based filters with multiple selection)
     */
    setTypeFilter(type) {
        if (type === '') {
            // "All" button - clear all filters
            this.typeFilter = [];
        } else {
            // Toggle specific type
            const index = this.typeFilter.indexOf(type);
            if (index > -1) {
                this.typeFilter.splice(index, 1); // Remove if already selected
            } else {
                this.typeFilter.push(type); // Add if not selected
            }
        }
        this.updateFilterButtonStates('type', this.typeFilter);
        this.refreshCardDisplay();
    }

    /**
     * Toggle cost filter (for button-based filters with multiple selection)
     */
    setCostFilter(cost) {
        if (cost === '') {
            // "All" button - clear all filters
            this.costFilter = [];
        } else {
            // Toggle specific cost
            const index = this.costFilter.indexOf(cost);
            if (index > -1) {
                this.costFilter.splice(index, 1); // Remove if already selected
            } else {
                this.costFilter.push(cost); // Add if not selected
            }
        }
        this.updateFilterButtonStates('cost', this.costFilter);
        this.refreshCardDisplay();
    }

    /**
     * Toggle rarity filter (for button-based filters with multiple selection)
     */
    setRarityFilter(rarity) {
        if (rarity === '') {
            // "All" button - clear all filters
            this.rarityFilter = [];
        } else {
            // Toggle specific rarity
            const index = this.rarityFilter.indexOf(rarity);
            if (index > -1) {
                this.rarityFilter.splice(index, 1); // Remove if already selected
            } else {
                this.rarityFilter.push(rarity); // Add if not selected
            }
        }
        this.updateFilterButtonStates('rarity', this.rarityFilter);
        this.refreshCardDisplay();
    }

    /**
     * Toggle opus filter (for button-based filters with multiple selection)
     */
    setOpusFilter(opus) {
        if (opus === '') {
            // "All" button - clear all filters
            this.opusFilter = [];
        } else {
            // Toggle specific opus
            const index = this.opusFilter.indexOf(opus);
            if (index > -1) {
                this.opusFilter.splice(index, 1); // Remove if already selected
            } else {
                this.opusFilter.push(opus); // Add if not selected
            }
        }
        this.updateFilterButtonStates('opus', this.opusFilter);
        this.refreshCardDisplay();
    }

    /**
     * Toggle category filter (for button-based filters with multiple selection)
     */
    setCategoryFilter(category) {
        if (category === '') {
            // "All" button - clear all filters
            this.categoryFilter = [];
        } else {
            // Toggle specific category
            const index = this.categoryFilter.indexOf(category);
            if (index > -1) {
                this.categoryFilter.splice(index, 1); // Remove if already selected
            } else {
                this.categoryFilter.push(category); // Add if not selected
            }
        }
        this.updateFilterButtonStates('category', this.categoryFilter);
        this.refreshCardDisplay();
    }

    /**
     * Clear search input
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchTerm = '';
            this.refreshCardDisplay();
            this.updateSearchClearButton();
        }
    }

    /**
     * Update filter button states to show active filters (supports multiple selection)
     */
    updateFilterButtonStates(filterType, selectedValues) {
        const buttonContainer = document.getElementById(`${filterType}Buttons`);
        if (!buttonContainer) {
            logger.warn(`Filter button container not found: ${filterType}Buttons`);
            return;
        }

        // Get all buttons at once for better performance
        const allButtons = buttonContainer.querySelectorAll('.filter-btn');
        
        // Remove active class from all buttons in this group
        allButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Handle array of selected values
        if (Array.isArray(selectedValues)) {
            if (selectedValues.length === 0) {
                // No filters selected - activate "All" button
                const allButton = buttonContainer.querySelector(`[data-${filterType}=""]`);
                if (allButton) {
                    allButton.classList.add('active');
                } else {
                    logger.warn(`All button not found for ${filterType} filter`);
                }
            } else {
                // Create a Set for faster lookups
                const selectedSet = new Set(selectedValues);
                
                // Add active class to selected buttons efficiently
                allButtons.forEach(button => {
                    const buttonValue = button.getAttribute(`data-${filterType}`);
                    if (buttonValue && selectedSet.has(buttonValue)) {
                        button.classList.add('active');
                    }
                });
            }
        } else {
            // Legacy single value support (fallback)
            const activeButton = buttonContainer.querySelector(`[data-${filterType}="${selectedValues}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
        }
    }

    /**
     * Update search clear button visibility
     */
    updateSearchClearButton() {
        const clearButton = document.getElementById('clearSearch');
        if (clearButton) {
            if (this.searchTerm && this.searchTerm.length > 0) {
                clearButton.style.display = 'block';
            } else {
                clearButton.style.display = 'none';
            }
        }
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
        if (this.deckManagerElement) {
            this.deckManagerElement.style.display = 'block';
        }
        if (this.deckEditorElement) {
            this.deckEditorElement.style.display = 'none';
        }
    }

    /**
     * Show the deck editor interface
     */
    showDeckEditor() {
        if (this.deckManagerElement) {
            this.deckManagerElement.style.display = 'none';
        }
        if (this.deckEditorElement) {
            this.deckEditorElement.style.display = 'block';
        }
        // Show card search panel immediately for deck building
        this.showCardSearch();
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
    }

    /**
     * Hide card search panel
     */
    hideCardSearch() {
        if (this.cardSearchPanel) {
            this.cardSearchPanel.style.display = 'none';
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
        deckCard.dataset.deckId = deck.id;

        const cardCount = deck.cards ? deck.cards.length : 0;
        const lastModified = deck.dateModified ? new Date(deck.dateModified).toLocaleDateString() : 'Unknown';
        
        // Get deck composition analysis
        const deckAnalysis = this.analyzeDeckComposition(deck);
        const mainElement = deckAnalysis.mainElement;
        const elementClass = `element-${mainElement}`;
        
        // Set deck card class with main element for styling
        deckCard.className = `deck-card deck-card-${mainElement}`;

        deckCard.innerHTML = `
            <div class="deck-card-content ${elementClass}">
                <div class="deck-card-header">
                    <h3 class="deck-name">${deck.name}</h3>
                    <span class="deck-card-count">${cardCount}/50 cards</span>
                </div>
                
                <div class="deck-composition">
                    <div class="deck-elements">
                        ${this.getDeckElementsDisplay(deckAnalysis.elements)}
                    </div>
                    <div class="deck-categories">
                        ${this.getDeckCategoriesDisplay(deckAnalysis.categories)}
                    </div>
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
     * Analyze deck composition for elements and categories
     */
    analyzeDeckComposition(deck) {
        if (!deck.cards || deck.cards.length === 0) {
            return {
                mainElement: 'neutral',
                elements: {},
                categories: {}
            };
        }

        const elements = {};
        const categories = {};
        
        // Count unique cards (not individual copies)
        const uniqueCardIds = [...new Set(deck.cards)];
        
        uniqueCardIds.forEach(cardId => {
            const card = this.cardDatabase.getCard(cardId);
            if (card) {
                // Count elements
                elements[card.element] = (elements[card.element] || 0) + 1;
                
                // Count categories (handle multiple categories)
                const cardCategories = this.getCardCategories(card.category);
                cardCategories.forEach(category => {
                    categories[category] = (categories[category] || 0) + 1;
                });
            }
        });

        // Find main element (most common)
        const mainElement = Object.keys(elements).length > 0 
            ? Object.entries(elements).sort(([,a], [,b]) => b - a)[0][0]
            : 'neutral';

        return {
            mainElement,
            elements,
            categories
        };
    }

    /**
     * Get deck elements display HTML
     */
    getDeckElementsDisplay(elements) {
        return Object.entries(elements)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3) // Show top 3 elements
            .map(([element, count]) => `
                <span class="element-badge element-${element}">
                    ${this.getElementIcon(element)} ${count}
                </span>
            `).join('');
    }

    /**
     * Get deck categories display HTML
     */
    getDeckCategoriesDisplay(categories) {
        const topCategories = Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 4); // Show top 4 categories

        if (topCategories.length === 0) {
            return '<span class="category-badge">Mixed</span>';
        }

        return topCategories
            .map(([category, count]) => `
                <span class="category-badge">${this.getCategoryDisplayName(category)}</span>
            `).join('');
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
     * Export current deck to text format
     * Format: [#] x [CardID]
     */
    exportDeck() {
        if (!this.currentDeck) {
            window.showNotification('No deck to export', 'warning');
            return;
        }

        try {
            const deckText = this.generateDeckText(this.currentDeck);
            
            // Create modal with exportable text
            if (window.app && window.app.modal) {
                window.app.modal.open('deckExport', {
                    deckName: this.currentDeck.name,
                    deckText: deckText
                });
            } else {
                // Fallback: copy to clipboard and show notification
                this.copyToClipboard(deckText);
                window.showNotification('Deck exported to clipboard!', 'success');
            }
            
            logger.info(`Exported deck: ${this.currentDeck.name}`);
        } catch (error) {
            logger.error('Error exporting deck:', error);
            window.showNotification('Error exporting deck', 'error');
        }
    }

    /**
     * Generate deck text in [#] x [CardID] format
     */
    generateDeckText(deck) {
        if (!deck || !deck.cards || deck.cards.length === 0) {
            return '// Empty deck';
        }

        // Count cards by ID
        const cardCounts = {};
        deck.cards.forEach(cardId => {
            cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
        });

        // Sort by card ID for consistent output
        const sortedEntries = Object.entries(cardCounts).sort(([a], [b]) => a.localeCompare(b));

        // Generate text lines
        const lines = sortedEntries.map(([cardId, count]) => {
            return `${count} x ${cardId}`;
        });

        // Add header comment
        const header = [
            `// Deck: ${deck.name}`,
            `// Cards: ${deck.cards.length}/50`,
            `// Exported: ${new Date().toLocaleDateString()}`,
            ''
        ];

        return header.concat(lines).join('\n');
    }

    /**
     * Import deck from text format
     */
    importDeck() {
        if (window.app && window.app.modal) {
            window.app.modal.open('deckImport', {
                onImport: (deckText, deckName) => this.processDeckImport(deckText, deckName)
            });
        } else {
            // Fallback: prompt for text
            const deckText = prompt('Paste deck text ([#] x [CardID] format):');
            if (deckText) {
                const deckName = prompt('Enter deck name:', 'Imported Deck');
                this.processDeckImport(deckText, deckName || 'Imported Deck');
            }
        }
    }

    /**
     * Process imported deck text
     */
    processDeckImport(deckText, deckName = 'Imported Deck') {
        try {
            const cards = this.parseDeckText(deckText);
            
            if (cards.length === 0) {
                window.showNotification('No valid cards found in import text', 'warning');
                return;
            }

            // Create new deck
            const newDeck = this.deckManager.createNewDeck(deckName);
            newDeck.cards = cards;

            // Set as current deck and update display
            this.currentDeck = newDeck;
            this.updateDeckDisplay();
            this.showDeckEditor();

            logger.info(`Imported deck: ${deckName} with ${cards.length} cards`);
            window.showNotification(`Imported "${deckName}" with ${cards.length} cards`, 'success');

        } catch (error) {
            logger.error('Error importing deck:', error);
            window.showNotification(`Error importing deck: ${error.message}`, 'error');
        }
    }

    /**
     * Parse deck text in [#] x [CardID] format with flexible parsing
     */
    parseDeckText(deckText) {
        if (!deckText || typeof deckText !== 'string') {
            throw new Error('Invalid deck text');
        }

        // Sanitize input first
        const sanitizedText = this.sanitizeInput(deckText);
        
        const cards = [];
        const lines = sanitizedText.split('\n');
        let lineNumber = 0;
        const errors = [];

        for (const line of lines) {
            lineNumber++;
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
                continue;
            }

            // Flexible parsing: Handle multiple deck list formats
            // Format 1: "3 x 1-001L" or "3 x 1-001L Lightning"
            // Format 2: "3 Valigarmanda (24-073H)" (Materia Hunter format)
            
            let match = trimmedLine.match(/^(\d+)\s*[x×]\s*([^\s]+)/i);
            
            // If no match with 'x' format, try Materia Hunter format: "# CardName (CardID)"
            if (!match) {
                match = trimmedLine.match(/^(\d+)\s+.+?\(([^)]+)\)\s*$/i);
            }
            
            if (!match) {
                errors.push(`Line ${lineNumber}: Invalid format "${this.truncateForDisplay(trimmedLine)}"`);
                continue;
            }

            const count = parseInt(match[1]);
            const cardId = this.sanitizeCardId(match[2]);

            // Validate count
            if (count < 1 || count > 3) {
                errors.push(`Line ${lineNumber}: Invalid card count ${count} (must be 1-3)`);
                continue;
            }

            // Validate card ID format (basic check for suspicious patterns)
            if (!this.isValidCardIdFormat(cardId)) {
                errors.push(`Line ${lineNumber}: Invalid card ID format "${this.truncateForDisplay(cardId)}"`);
                continue;
            }

            // Validate card exists in database
            let card = this.cardDatabase.getCard(cardId);
            let actualCardId = cardId;
            
            if (!card) {
                // Try some common variations if the exact ID doesn't work
                const variations = [
                    cardId.toUpperCase(),
                    cardId.toLowerCase(),
                    cardId.replace('-', '_'),
                    cardId.replace('_', '-')
                ];
                
                for (const variation of variations) {
                    card = this.cardDatabase.getCard(variation);
                    if (card) {
                        actualCardId = card.id; // Use the actual card ID from database
                        break;
                    }
                }
            }
            
            if (!card) {
                errors.push(`Line ${lineNumber}: Card "${this.truncateForDisplay(cardId)}" not found in database`);
                continue;
            }

            // Add cards to array using the actual card ID
            for (let i = 0; i < count; i++) {
                cards.push(actualCardId);
            }
        }

        // Check for errors
        if (errors.length > 0) {
            logger.warn('Deck import warnings:', errors);
            
            if (cards.length === 0) {
                throw new Error('No valid cards found:\n' + errors.slice(0, 5).join('\n'));
            } else {
                // Show warnings but continue with valid cards
                window.showNotification(
                    `Import completed with ${errors.length} warnings. Check console for details.`,
                    'warning'
                );
            }
        }

        // Check deck size
        if (cards.length > 50) {
            throw new Error(`Deck too large: ${cards.length} cards (maximum 50)`);
        }

        return cards;
    }

    /**
     * Sanitize input text to prevent XSS and other attacks
     */
    sanitizeInput(text) {
        if (typeof text !== 'string') {
            return '';
        }

        // Remove any HTML tags
        let sanitized = text.replace(/<[^>]*>/g, '');
        
        // Remove any script-like content
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/data:/gi, '');
        sanitized = sanitized.replace(/vbscript:/gi, '');
        
        // Remove any event handlers
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');
        
        // Limit length to prevent DoS
        if (sanitized.length > 50000) { // ~50KB limit
            throw new Error('Input too large (maximum 50,000 characters)');
        }

        // Limit number of lines
        const lines = sanitized.split('\n');
        if (lines.length > 1000) {
            throw new Error('Too many lines (maximum 1,000 lines)');
        }

        return sanitized;
    }

    /**
     * Sanitize card ID to remove any potentially harmful characters
     */
    sanitizeCardId(cardId) {
        if (typeof cardId !== 'string') {
            return '';
        }

        // Keep only alphanumeric characters, hyphens, and underscores
        // This should cover all legitimate FFTCG card IDs
        return cardId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 20); // Limit length
    }

    /**
     * Validate card ID format (basic security check)
     */
    isValidCardIdFormat(cardId) {
        if (!cardId || typeof cardId !== 'string') {
            return false;
        }
        
        // Card ID should be reasonable length and format
        if (cardId.length < 2 || cardId.length > 20) {
            return false;
        }
        
        // Should contain only safe characters
        if (!/^[a-zA-Z0-9\-_]+$/.test(cardId)) {
            return false;
        }
        
        // Should not be suspicious patterns
        const suspiciousPatterns = [
            /script/i,
            /javascript/i,
            /eval/i,
            /function/i,
            /alert/i,
            /document/i,
            /window/i
        ];
        
        return !suspiciousPatterns.some(pattern => pattern.test(cardId));
    }

    /**
     * Truncate text for safe display in error messages
     */
    truncateForDisplay(text, maxLength = 50) {
        if (!text || typeof text !== 'string') {
            return '[invalid]';
        }
        
        // Remove any remaining HTML and control characters
        const clean = text.replace(/[<>&"']/g, '').replace(/[\x00-\x1F\x7F]/g, '');
        
        return clean.length > maxLength 
            ? clean.substring(0, maxLength) + '...' 
            : clean;
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            return true;
        } catch (error) {
            logger.error('Failed to copy to clipboard:', error);
            return false;
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