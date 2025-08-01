/**
 * PRACTICE LOBBY COMPONENT
 * 
 * Handles the practice lobby interface including:
 * - Player and AI setup
 * - Deck selection and preview
 * - Game initialization
 */

import { logger } from '../utils/Logger.js';

/**
 * Practice Lobby Class
 * Manages the practice lobby interface and game setup
 */
export class PracticeLobby {
    constructor(deckManager, playerManager, gameEngine) {
        this.deckManager = deckManager;
        this.playerManager = playerManager;
        this.gameEngine = gameEngine;
        
        // State
        this.selectedDeck = null;
        this.selectedDifficulty = null;
        this.isInitialized = false;
        
        // Cache DOM elements
        this.elements = {};
        
        logger.info('🤖 Practice Lobby initialized');
    }
    
    /**
     * Initialize the practice lobby when view is activated
     */
    initialize() {
        if (this.isInitialized) return;
        
        logger.info('🎮 Initializing practice lobby...');
        
        // Cache DOM elements
        this.cacheElements();
        
        // Populate player info
        this.updatePlayerInfo();
        
        // Populate deck selector
        this.populateDecks();
        
        // Set up event listeners (only once)
        this.setupEventListeners();
        
        // Update UI state
        this.updateStartButtonState();
        
        this.isInitialized = true;
        logger.info('✅ Practice lobby initialized successfully');
    }
    
    /**
     * Cache DOM elements to avoid repeated queries
     */
    cacheElements() {
        this.elements = {
            // Player elements
            playerName: document.getElementById('lobbyPlayerName'),
            playerAvatar: document.getElementById('lobbyPlayerAvatar'),
            playerStats: document.getElementById('lobbyPlayerStats'),
            
            // Deck elements
            deckSelect: document.getElementById('playerDeckSelect'),
            deckPreview: document.getElementById('playerDeckPreview'),
            
            // AI elements
            difficultySelect: document.getElementById('aiDifficultySelect'),
            aiDeckInfo: document.getElementById('aiDeckInfo'),
            aiName: document.getElementById('aiName'),
            aiDifficulty: document.getElementById('aiDifficulty'),
            aiAvatar: document.getElementById('aiAvatar'),
            
            // Controls
            startButton: document.getElementById('startPracticeBtn'),
            enableTutorial: document.getElementById('enableTutorial'),
            allowUndo: document.getElementById('allowUndo')
        };
    }
    
    /**
     * Update player information display
     */
    updatePlayerInfo() {
        if (!this.playerManager) return;
        
        const profile = this.playerManager.getProfile();
        const stats = this.playerManager.getStats();
        
        if (profile) {
            if (this.elements.playerName) this.elements.playerName.textContent = profile.name;
            if (this.elements.playerAvatar) this.elements.playerAvatar.textContent = profile.avatar;
            
            if (this.elements.playerStats && stats) {
                const winRate = stats.gamesPlayed > 0 ? 
                    Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
                this.elements.playerStats.textContent = 
                    `Games: ${stats.gamesPlayed} | Wins: ${stats.wins} | Win Rate: ${winRate}%`;
            }
        }
    }
    
    /**
     * Populate deck selector with available decks
     */
    populateDecks() {
        if (!this.elements.deckSelect || !this.deckManager) return;
        
        // Clear existing options except first
        while (this.elements.deckSelect.options.length > 1) {
            this.elements.deckSelect.remove(1);
        }
        
        const decks = this.deckManager.getAllDecks();
        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = `${deck.name} (${deck.cards?.length || 0} cards)`;
            this.elements.deckSelect.appendChild(option);
        });
    }
    
    /**
     * Set up event listeners (only called once)
     */
    setupEventListeners() {
        if (this.elements.deckSelect) {
            this.elements.deckSelect.addEventListener('change', () => this.onPlayerDeckChange());
        }
        
        if (this.elements.difficultySelect) {
            this.elements.difficultySelect.addEventListener('change', () => this.onAIDifficultyChange());
        }
    }
    
    /**
     * Handle player deck selection change
     */
    onPlayerDeckChange() {
        const selectedDeckId = this.elements.deckSelect?.value;
        
        if (!selectedDeckId) {
            this.selectedDeck = null;
            if (this.elements.deckPreview) this.elements.deckPreview.style.display = 'none';
            this.updateStartButtonState();
            return;
        }
        
        // Load deck data (with caching)
        this.selectedDeck = this.loadDeckWithCache(selectedDeckId);
        
        if (this.selectedDeck) {
            this.updateDeckPreview(this.selectedDeck);
            if (this.elements.deckPreview) this.elements.deckPreview.style.display = 'block';
        }
        
        this.updateStartButtonState();
    }
    
    /**
     * Load deck with simple caching to avoid redundant queries
     */
    loadDeckWithCache(deckId) {
        // Simple cache check
        if (this._deckCache && this._deckCache.id === deckId) {
            return this._deckCache;
        }
        
        const deck = this.deckManager.loadDeck ? 
                     this.deckManager.loadDeck(deckId) : 
                     this.deckManager.getDeck(deckId);
        
        // Cache the loaded deck
        if (deck) {
            this._deckCache = deck;
        }
        
        return deck;
    }
    
    /**
     * Update deck preview display
     */
    updateDeckPreview(deck) {
        if (!this.elements.deckPreview || !deck) return;
        
        const deckName = this.elements.deckPreview.querySelector('.deck-name');
        const deckCount = this.elements.deckPreview.querySelector('.deck-card-count');
        const deckElements = this.elements.deckPreview.querySelector('.deck-elements');
        const deckCategories = this.elements.deckPreview.querySelector('.deck-categories');
        
        if (deckName) deckName.textContent = deck.name;
        if (deckCount) deckCount.textContent = `${deck.cards?.length || 0} cards`;
        
        // Show element distribution (optimized)
        if (deckElements && deck.cards) {
            const elementCounts = this.getElementCounts(deck.cards);
            this.renderElementTags(deckElements, elementCounts);
        }
        
        // Show categories (optimized)
        if (deckCategories && deck.cards) {
            const categories = this.getUniqueCategories(deck.cards);
            deckCategories.textContent = categories.join(', ');
        }
    }
    
    /**
     * Get element counts (optimized)
     */
    getElementCounts(cards) {
        return cards.reduce((counts, card) => {
            if (card.element) {
                counts[card.element] = (counts[card.element] || 0) + 1;
            }
            return counts;
        }, {});
    }
    
    /**
     * Render element tags (optimized DOM manipulation)
     */
    renderElementTags(container, elementCounts) {
        // Clear existing tags
        container.innerHTML = '';
        
        // Create document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        
        Object.entries(elementCounts).forEach(([element, count]) => {
            const tag = document.createElement('span');
            tag.className = 'element-tag';
            tag.textContent = `${element}: ${count}`;
            fragment.appendChild(tag);
        });
        
        container.appendChild(fragment);
    }
    
    /**
     * Get unique categories (optimized)
     */
    getUniqueCategories(cards) {
        const categories = new Set();
        for (const card of cards) {
            const category = card.category || card.type;
            if (category) categories.add(category);
        }
        return Array.from(categories);
    }
    
    /**
     * Handle AI difficulty selection change
     */
    onAIDifficultyChange() {
        this.selectedDifficulty = this.elements.difficultySelect?.value;
        
        if (!this.selectedDifficulty) {
            this.hideAIInfo();
            this.updateStartButtonState();
            return;
        }
        
        this.updateAIInfo(this.selectedDifficulty);
        this.updateStartButtonState();
    }
    
    /**
     * Hide AI information
     */
    hideAIInfo() {
        if (this.elements.aiDeckInfo) this.elements.aiDeckInfo.style.display = 'none';
        if (this.elements.aiName) this.elements.aiName.textContent = 'AI Opponent';
        if (this.elements.aiDifficulty) this.elements.aiDifficulty.textContent = 'Select Difficulty';
        if (this.elements.aiAvatar) this.elements.aiAvatar.textContent = '🤖';
    }
    
    /**
     * Update AI information display
     */
    updateAIInfo(difficulty) {
        const aiData = this.getAIData(difficulty);
        
        if (this.elements.aiName) this.elements.aiName.textContent = aiData.name;
        if (this.elements.aiDifficulty) {
            this.elements.aiDifficulty.textContent = 
                difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        }
        if (this.elements.aiAvatar) this.elements.aiAvatar.textContent = aiData.avatar;
        
        this.updateAIDeckInfo(aiData);
    }
    
    /**
     * Get AI data configuration
     */
    getAIData(difficulty) {
        const aiConfigs = {
            easy: {
                name: 'Training Bot',
                avatar: '🎓',
                description: 'A learning AI that makes simple plays and teaches basic strategy.',
                element: 'Mixed',
                strategy: 'Casual'
            },
            medium: {
                name: 'Tactical AI',
                avatar: '⚔️',
                description: 'A balanced AI that uses intermediate strategies and card synergies.',
                element: 'Focused',
                strategy: 'Balanced'
            },
            hard: {
                name: 'Master AI',
                avatar: '👑',
                description: 'An advanced AI that plays optimally with complex combos and timing.',
                element: 'Optimized',
                strategy: 'Competitive'
            }
        };
        
        return aiConfigs[difficulty] || aiConfigs.medium;
    }
    
    /**
     * Update AI deck information display
     */
    updateAIDeckInfo(aiData) {
        if (!this.elements.aiDeckInfo) return;
        
        const deckName = this.elements.aiDeckInfo.querySelector('.ai-deck-name');
        const deckDescription = this.elements.aiDeckInfo.querySelector('.ai-deck-description');
        const deckElement = this.elements.aiDeckInfo.querySelector('.ai-deck-element');
        const deckStrategy = this.elements.aiDeckInfo.querySelector('.ai-deck-strategy');
        
        if (deckName) deckName.textContent = `${aiData.name} Deck`;
        if (deckDescription) deckDescription.textContent = aiData.description;
        if (deckElement) deckElement.textContent = aiData.element;
        if (deckStrategy) deckStrategy.textContent = aiData.strategy;
        
        this.elements.aiDeckInfo.style.display = 'block';
    }
    
    /**
     * Update start button state
     */
    updateStartButtonState() {
        if (!this.elements.startButton) return;
        
        const hasSelectedDeck = !!this.selectedDeck;
        const hasSelectedDifficulty = !!this.selectedDifficulty;
        
        if (hasSelectedDeck && hasSelectedDifficulty) {
            this.elements.startButton.disabled = false;
            this.elements.startButton.textContent = 'Start Practice Game';
        } else {
            this.elements.startButton.disabled = true;
            if (!hasSelectedDeck && !hasSelectedDifficulty) {
                this.elements.startButton.textContent = 'Select Deck & Difficulty';
            } else if (!hasSelectedDeck) {
                this.elements.startButton.textContent = 'Select a Deck';
            } else {
                this.elements.startButton.textContent = 'Select Difficulty';
            }
        }
    }
    
    /**
     * Start practice game (optimized)
     */
    async startPracticeGame() {
        if (!this.selectedDeck || !this.selectedDifficulty) {
            throw new Error('Please select both a deck and difficulty level.');
        }
        
        const gameConfig = {
            mode: 'practice',
            playerDeck: this.selectedDeck,
            aiDifficulty: this.selectedDifficulty,
            aiDeck: this.selectedDeck, // Use player deck as AI deck for now
            enableTutorial: this.elements.enableTutorial?.checked || false,
            allowUndo: this.elements.allowUndo?.checked || false
        };
        
        logger.info('🚀 Starting practice game with config:', gameConfig);
        
        // Start game through engine
        await this.gameEngine.startPracticeGame(gameConfig);
        
        // Switch to game view
        if (window.app?.switchView) {
            window.app.switchView('game');
        }
    }
    
    /**
     * Clean up when leaving lobby
     */
    cleanup() {
        this.isInitialized = false;
        this._deckCache = null;
        this.selectedDeck = null;
        this.selectedDifficulty = null;
    }
}