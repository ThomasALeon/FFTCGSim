/**
 * PRACTICE SETUP COMPONENT
 * 
 * Handles the practice mode setup including:
 * - Deck selection for player
 * - AI difficulty selection
 * - Match configuration
 * - Starting the practice game
 */

import { logger } from '../utils/Logger.js';

/**
 * Practice Setup Class
 * Manages the practice game setup interface
 */
export class PracticeSetup {
    constructor(deckManager, modal) {
        this.deckManager = deckManager;
        this.modal = modal;
        this.selectedDeck = null;
        this.selectedDifficulty = 'medium';
        this.aiDecks = this.initializeAIDecks();
        
        logger.info('🎮 Practice Setup initialized');
    }
    
    /**
     * Initialize predefined AI decks
     */
    initializeAIDecks() {
        return {
            easy: {
                name: 'AI Training Deck',
                description: 'A simple deck focused on basic strategies',
                difficulty: 'easy',
                strategy: 'aggressive'
            },
            medium: {
                name: 'AI Balanced Deck',
                description: 'A well-rounded deck with various strategies',
                difficulty: 'medium',
                strategy: 'balanced'
            },
            hard: {
                name: 'AI Master Deck',
                description: 'An optimized deck with advanced combos',
                difficulty: 'hard',
                strategy: 'control'
            }
        };
    }
    
    /**
     * Show the practice setup modal
     */
    showSetupModal() {
        const playerDecks = this.deckManager.getAllDecks();
        
        if (playerDecks.length === 0) {
            this.showNoDeckWarning();
            return;
        }
        
        this.modal.open('practiceSetup', {
            playerDecks: playerDecks,
            aiDecks: this.aiDecks,
            selectedDifficulty: this.selectedDifficulty
        });
    }
    
    /**
     * Show warning when no decks are available
     */
    showNoDeckWarning() {
        const confirmCreate = confirm(
            'You need to create a deck before playing against the AI.\n\n' +
            'Would you like to go to the Deck Builder now?'
        );
        
        if (confirmCreate && window.app) {
            window.app.switchView('deckBuilder');
        }
    }
    
    /**
     * Handle deck selection
     */
    selectDeck(deckId) {
        this.selectedDeck = this.deckManager.getDeck(deckId);
        
        if (!this.selectedDeck) {
            logger.error('Selected deck not found:', deckId);
            return;
        }
        
        logger.info(`Deck selected: ${this.selectedDeck.name}`);
        this.updateDeckSelection();
    }
    
    /**
     * Handle AI difficulty selection
     */
    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        logger.info(`AI difficulty selected: ${difficulty}`);
        this.updateDifficultySelection();
    }
    
    /**
     * Update the UI to reflect deck selection
     */
    updateDeckSelection() {
        const deckCards = document.querySelectorAll('[data-deck-id]');
        deckCards.forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.deckId === this.selectedDeck.id) {
                card.classList.add('selected');
            }
        });
        
        // Enable start button if both deck and difficulty are selected
        this.updateStartButton();
    }
    
    /**
     * Update the UI to reflect difficulty selection
     */
    updateDifficultySelection() {
        const difficultyCards = document.querySelectorAll('[data-difficulty]');
        difficultyCards.forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.difficulty === this.selectedDifficulty) {
                card.classList.add('selected');
            }
        });
        
        // Update AI deck preview
        this.updateAIDeckPreview();
        this.updateStartButton();
    }
    
    /**
     * Update AI deck preview based on difficulty
     */
    updateAIDeckPreview() {
        const aiDeck = this.aiDecks[this.selectedDifficulty];
        const previewElement = document.getElementById('aiDeckPreview');
        
        if (previewElement && aiDeck) {
            previewElement.innerHTML = `
                <div class="ai-deck-info">
                    <h4>${aiDeck.name}</h4>
                    <p>${aiDeck.description}</p>
                    <div class="ai-strategy">Strategy: ${aiDeck.strategy}</div>
                </div>
            `;
        }
    }
    
    /**
     * Update start button state
     */
    updateStartButton() {
        const startButton = document.getElementById('startPracticeButton');
        if (startButton) {
            const canStart = this.selectedDeck && this.selectedDifficulty;
            startButton.disabled = !canStart;
            startButton.classList.toggle('btn-disabled', !canStart);
        }
    }
    
    /**
     * Start the practice game
     */
    async startPracticeGame() {
        if (!this.selectedDeck || !this.selectedDifficulty) {
            logger.error('Cannot start practice game - missing deck or difficulty selection');
            return;
        }
        
        logger.info(`Starting practice game: ${this.selectedDeck.name} vs AI (${this.selectedDifficulty})`);
        
        try {
            // Close setup modal
            this.modal.close();
            
            // Initialize the practice game
            await this.initializePracticeGame();
            
        } catch (error) {
            logger.error('Failed to start practice game:', error);
            alert('Failed to start practice game. Please try again.');
        }
    }
    
    /**
     * Initialize the practice game with selected settings
     */
    async initializePracticeGame() {
        if (!window.app) {
            throw new Error('App not available');
        }
        
        // Switch to game view
        window.app.switchView('game');
        
        // Wait for game view to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Setup practice game through GameEngine
        const gameConfig = {
            mode: 'practice',
            playerDeck: this.selectedDeck,
            aiDifficulty: this.selectedDifficulty,
            aiDeck: this.aiDecks[this.selectedDifficulty]
        };
        
        if (window.app.gameEngine) {
            await window.app.gameEngine.startPracticeGame(gameConfig);
        } else {
            throw new Error('Game engine not available');
        }
        
        logger.info('Practice game initialized successfully');
    }
    
    /**
     * Get selected deck
     */
    getSelectedDeck() {
        return this.selectedDeck;
    }
    
    /**
     * Get selected difficulty
     */
    getSelectedDifficulty() {
        return this.selectedDifficulty;
    }
    
    /**
     * Reset selection state
     */
    reset() {
        this.selectedDeck = null;
        this.selectedDifficulty = 'medium';
    }
    
    /**
     * Create deck selection HTML
     */
    createDeckSelectionHTML(decks) {
        return decks.map(deck => `
            <div class="deck-selection-card" data-deck-id="${deck.id}" onclick="window.app?.practiceSetup?.selectDeck('${deck.id}')">
                <div class="deck-card-header">
                    <h4 class="deck-card-name">${deck.name}</h4>
                    <span class="deck-card-count">${deck.cards?.length || 0} cards</span>
                </div>
                <div class="deck-card-info">
                    <div class="deck-elements">
                        ${this.getDeckElementsHTML(deck)}
                    </div>
                    <div class="deck-types">
                        ${this.getDeckTypesHTML(deck)}
                    </div>
                </div>
                <div class="deck-card-footer">
                    <span class="deck-created">Created: ${new Date(deck.created).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Get deck elements for preview
     */
    getDeckElementsHTML(deck) {
        if (!deck.cards || deck.cards.length === 0) return '';
        
        const elements = {};
        deck.cards.forEach(cardEntry => {
            const element = cardEntry.card?.element;
            if (element) {
                elements[element] = (elements[element] || 0) + cardEntry.count;
            }
        });
        
        const elementIcons = {
            fire: '🔥', ice: '❄️', wind: '🌪️', lightning: '⚡',
            water: '💧', earth: '🌍', light: '☀️', dark: '🌑'
        };
        
        return Object.entries(elements)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([element, count]) => `
                <span class="element-tag">${elementIcons[element] || element} ${count}</span>
            `).join('');
    }
    
    /**
     * Get deck types for preview
     */
    getDeckTypesHTML(deck) {
        if (!deck.cards || deck.cards.length === 0) return '';
        
        const types = {};
        deck.cards.forEach(cardEntry => {
            const type = cardEntry.card?.type;
            if (type) {
                types[type] = (types[type] || 0) + cardEntry.count;
            }
        });
        
        return Object.entries(types)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => `
                <span class="type-tag">${type}: ${count}</span>
            `).join(' ');
    }
    
    /**
     * Create difficulty selection HTML
     */
    createDifficultySelectionHTML() {
        const difficulties = Object.entries(this.aiDecks);
        
        return difficulties.map(([difficulty, deckInfo]) => `
            <div class="difficulty-card ${difficulty}" data-difficulty="${difficulty}" 
                 onclick="window.app?.practiceSetup?.selectDifficulty('${difficulty}')">
                <div class="difficulty-icon">
                    ${this.getDifficultyIcon(difficulty)}
                </div>
                <h4 class="difficulty-name">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h4>
                <p class="difficulty-description">${this.getDifficultyDescription(difficulty)}</p>
                <div class="difficulty-features">
                    ${this.getDifficultyFeatures(difficulty)}
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Get difficulty icon
     */
    getDifficultyIcon(difficulty) {
        const icons = {
            easy: '🎯',
            medium: '⚔️',
            hard: '🏆'
        };
        return icons[difficulty] || '🤖';
    }
    
    /**
     * Get difficulty description
     */
    getDifficultyDescription(difficulty) {
        const descriptions = {
            easy: 'Perfect for learning the game and testing new decks',
            medium: 'Balanced challenge with smart decision making',
            hard: 'Advanced AI with optimal plays and complex strategies'
        };
        return descriptions[difficulty] || '';
    }
    
    /**
     * Get difficulty features
     */
    getDifficultyFeatures(difficulty) {
        const features = {
            easy: ['Basic plays', 'Predictable', 'Forgiving'],
            medium: ['Strategic thinking', 'Adaptive', 'Challenging'],
            hard: ['Optimal plays', 'Complex combos', 'Unforgiving']
        };
        
        return (features[difficulty] || [])
            .map(feature => `<span class="feature-tag">${feature}</span>`)
            .join('');
    }
}

export default PracticeSetup;