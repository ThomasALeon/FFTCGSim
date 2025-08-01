/**
 * MODAL COMPONENT - Dynamic Modal System
 * 
 * This module provides a flexible modal system for the FFTCG Simulator including:
 * - Dynamic modal creation and management
 * - Multiple modal types (profile, settings, deck selection, etc.)
 * - Backdrop and keyboard interaction handling
 * - Animation and transition effects
 * - Form validation and submission
 * - Responsive design and accessibility features
 */

/**
 * Modal Class
 * Manages modal windows throughout the application
 */
export class Modal {
    constructor() {
        // Modal container
        this.container = null;
        this.activeModals = new Map();
        this.modalCounter = 0;
        
        // Load card image mapping
        this.cardImageMapping = {};
        this.loadCardImageMapping();
        
        // Modal types and their configurations
        this.modalTypes = {
            profile: {
                title: 'Player Profile',
                width: '500px',
                closable: true,
                backdrop: true
            },
            settings: {
                title: 'Settings',
                width: '600px',
                closable: true,
                backdrop: true
            },
            lobby: {
                title: 'Multiplayer Lobby',
                width: '700px',
                closable: true,
                backdrop: true
            },
            deckSelect: {
                title: 'Select Deck',
                width: '800px',
                closable: true,
                backdrop: true
            },
            cardPreview: {
                title: 'Card Preview',
                width: '700px',
                closable: true,
                backdrop: true
            },
            gameRules: {
                title: 'Game Rules',
                width: '900px',
                height: '80vh',
                closable: true,
                backdrop: true
            },
            confirm: {
                title: 'Confirm Action',
                width: '400px',
                closable: false,
                backdrop: false
            },
            tournament: {
                title: 'Tournament',
                width: '800px',
                closable: true,
                backdrop: true
            },
            practiceSetup: {
                title: 'Practice vs AI Setup',
                width: '900px',
                height: '70vh',
                closable: true,
                backdrop: true
            },
            deckExport: {
                title: 'Export Deck',
                width: '600px',
                height: '500px',
                closable: true,
                backdrop: true
            },
            deckImport: {
                title: 'Import Deck',
                width: '600px',
                height: '500px',
                closable: true,
                backdrop: true
            }
        };

        // Event listeners
        this.listeners = new Map();
        
        // Initialize
        this.initialize();
    }

    /**
     * Initialize the modal system
     */
    initialize() {
        // Create modal container if it doesn't exist
        this.container = document.getElementById('modalContainer');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'modalContainer';
            this.container.className = 'modal-container';
            document.body.appendChild(this.container);
        }

        // Set up global event listeners
        this.setupEventListeners();
        
    }

    /**
     * Load card image mapping from JSON file
     */
    async loadCardImageMapping() {
        try {
            const response = await fetch('./src/data/card_image_mapping.json');
            if (response.ok) {
                this.cardImageMapping = await response.json();
            } else {
                console.warn('⚠️ Modal: Card image mapping file not found, using placeholders');
                this.cardImageMapping = {};
            }
        } catch (error) {
            console.error('❌ Modal: Failed to load card image mapping:', error);
            this.cardImageMapping = {};
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });

        // Click outside to close modals
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                const modalId = e.target.dataset.modalId;
                if (modalId) {
                    this.close(modalId);
                }
            }
        });
    }

    /**
     * Open a modal
     */
    open(type, options = {}) {
        const modalId = `modal_${this.modalCounter++}`;
        const config = { ...this.modalTypes[type], ...options };
        
        if (!config) {
            throw new Error(`Unknown modal type: ${type}`);
        }

        // Create modal HTML
        const modalHTML = this.createModalHTML(modalId, type, config);
        
        // Add to container
        this.container.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get modal element
        const modalElement = document.getElementById(modalId);
        
        // Store modal info
        this.activeModals.set(modalId, {
            element: modalElement,
            type: type,
            config: config,
            options: options
        });

        // Set up modal-specific event listeners
        this.setupModalEventListeners(modalId);
        
        // Populate content based on type
        this.populateModalContent(modalId, type, options);
        
        // Add modal-open class to body
        document.body.classList.add('modal-open');

        // Show modal with animation
        requestAnimationFrame(() => {
            modalElement.parentElement.classList.add('active');
        });

        // Emit event
        this.emit('modalOpened', { modalId, type, options });
        
        return modalId;
    }

    /**
     * Create modal HTML structure
     */
    createModalHTML(modalId, type, config) {
        const width = config.width || '500px';
        const height = config.height || 'auto';
        const maxHeight = config.maxHeight || '90vh';
        
        return `
            <div class="modal-backdrop" data-modal-id="${modalId}">
                <div class="modal" id="${modalId}" style="width: ${width}; height: ${height}; max-height: ${maxHeight};">
                    <div class="modal-header">
                        <h2 class="modal-title">${config.title || 'Modal'}</h2>
                        ${config.closable !== false ? `
                            <button class="modal-close" data-modal-id="${modalId}" aria-label="Close">
                                <span>&times;</span>
                            </button>
                        ` : ''}
                    </div>
                    <div class="modal-body" id="${modalId}-body">
                        <!-- Content will be populated here -->
                    </div>
                    <div class="modal-footer" id="${modalId}-footer">
                        <!-- Footer content will be populated here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up modal-specific event listeners
     */
    setupModalEventListeners(modalId) {
        const modal = this.activeModals.get(modalId);
        
        if (!modal) return;

        // Close button
        const closeBtn = modal.element.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(modalId);
            });
        }

        // Form submission
        const forms = modal.element.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(modalId, form);
            });
        });
    }

    /**
     * Populate modal content based on type
     */
    populateModalContent(modalId, type, options) {
        const bodyElement = document.getElementById(`${modalId}-body`);
        const footerElement = document.getElementById(`${modalId}-footer`);
        
        switch (type) {
            case 'profile':
                this.createProfileModal(bodyElement, footerElement, options);
                break;
            case 'settings':
                this.createSettingsModal(bodyElement, footerElement, options);
                break;
            case 'lobby':
                this.createLobbyModal(bodyElement, footerElement, options);
                break;
            case 'deckSelect':
                this.createDeckSelectModal(bodyElement, footerElement, options);
                break;
            case 'cardPreview':
                this.createCardPreviewModal(bodyElement, footerElement, options);
                break;
            case 'gameRules':
                this.createGameRulesModal(bodyElement, footerElement, options);
                break;
            case 'confirm':
                this.createConfirmModal(bodyElement, footerElement, options);
                break;
            case 'tournament':
                this.createTournamentModal(bodyElement, footerElement, options);
                break;
            case 'practiceSetup':
                this.createPracticeSetupModal(bodyElement, footerElement, options);
                break;
            case 'deckExport':
                this.createDeckExportModal(bodyElement, footerElement, options);
                break;
            case 'deckImport':
                this.createDeckImportModal(bodyElement, footerElement, options);
                break;
            case 'cardDetail':
                this.createCardDetailModal(bodyElement, footerElement, options);
                break;
            default:
                bodyElement.innerHTML = '<p>Modal content not implemented</p>';
        }
    }

    /**
     * Create profile modal content
     */
    createProfileModal(body, footer, options) {
        const currentProfile = window.app?.playerManager?.getProfile() || {
            name: 'Guest Player',
            avatar: '⚡'
        };

        body.innerHTML = `
            <form id="profileForm" class="modal-form">
                <div class="form-group">
                    <label for="playerName">Player Name</label>
                    <input type="text" id="playerName" name="name" value="${currentProfile.name}" 
                           placeholder="Enter your player name" required minlength="2" maxlength="20">
                    <div class="form-hint">2-20 characters, letters and numbers only</div>
                </div>
                
                <div class="form-group">
                    <label for="playerAvatar">Avatar</label>
                    <div class="avatar-selector">
                        <div class="avatar-grid">
                            ${this.createAvatarOptions(currentProfile.avatar)}
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="playerTitle">Title</label>
                    <select id="playerTitle" name="title">
                        <option value="New Player">New Player</option>
                        <option value="Apprentice">Apprentice</option>
                        <option value="Veteran">Veteran</option>
                        <option value="Expert">Expert</option>
                        <option value="Master">Master</option>
                        <option value="Legend">Legend</option>
                    </select>
                </div>
            </form>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Cancel
            </button>
            <button type="submit" form="profileForm" class="btn btn-primary">
                Save Profile
            </button>
        `;
    }

    /**
     * Create avatar selection options
     */
    createAvatarOptions(selectedAvatar) {
        const avatars = ['⚡', '🔥', '❄️', '🌪️', '💧', '🌍', '☀️', '🌑', '⚔️', '🛡️', '🎭', '👑'];
        
        return avatars.map(avatar => `
            <div class="avatar-option ${avatar === selectedAvatar ? 'selected' : ''}" 
                 data-avatar="${avatar}">
                <span class="avatar-emoji">${avatar}</span>
            </div>
        `).join('');
    }

    /**
     * Create settings modal content
     */
    createSettingsModal(body, footer, options) {
        const currentSettings = window.app?.playerManager?.getSettings() || {};

        body.innerHTML = `
            <form id="settingsForm" class="modal-form">
                <div class="settings-section">
                    <h3>Accessibility</h3>
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="highContrast" ${currentSettings.highContrast ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            High Contrast Mode
                        </label>
                        <div class="form-hint">Increases color contrast for better visibility</div>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="largeText" ${currentSettings.largeText ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Large Text
                        </label>
                        <div class="form-hint">Increases text size throughout the application</div>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="reducedMotion" ${currentSettings.reducedMotion ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Reduced Motion
                        </label>
                        <div class="form-hint">Minimizes animations and transitions</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="filterIconSize">Filter Icon Size</label>
                        <select id="filterIconSize" name="filterIconSize">
                            <option value="small" ${currentSettings.filterIconSize === 'small' ? 'selected' : ''}>Small</option>
                            <option value="medium" ${currentSettings.filterIconSize === 'medium' || !currentSettings.filterIconSize ? 'selected' : ''}>Medium (Default)</option>
                            <option value="large" ${currentSettings.filterIconSize === 'large' ? 'selected' : ''}>Large</option>
                            <option value="extra-large" ${currentSettings.filterIconSize === 'extra-large' ? 'selected' : ''}>Extra Large</option>
                        </select>
                        <div class="form-hint">Adjusts the size of filter icons in the deck builder for better visibility</div>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Audio</h3>
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="soundEffects" ${currentSettings.soundEffects ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Sound Effects
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="musicVolume">Music Volume</label>
                        <input type="range" id="musicVolume" name="musicVolume" 
                               min="0" max="1" step="0.1" value="${currentSettings.musicVolume || 0.7}">
                        <span class="range-value">${Math.round((currentSettings.musicVolume || 0.7) * 100)}%</span>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Gameplay</h3>
                    <div class="form-group">
                        <label for="autoPassPriority">Auto-pass Priority</label>
                        <select id="autoPassPriority" name="autoPassPriority">
                            <option value="never" ${currentSettings.autoPassPriority === 'never' ? 'selected' : ''}>Never</option>
                            <option value="end-step" ${currentSettings.autoPassPriority === 'end-step' ? 'selected' : ''}>End Step Only</option>
                            <option value="always" ${currentSettings.autoPassPriority === 'always' ? 'selected' : ''}>Always</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="animationSpeed">Animation Speed</label>
                        <select id="animationSpeed" name="animationSpeed">
                            <option value="slow" ${currentSettings.animationSpeed === 'slow' ? 'selected' : ''}>Slow</option>
                            <option value="normal" ${currentSettings.animationSpeed === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="fast" ${currentSettings.animationSpeed === 'fast' ? 'selected' : ''}>Fast</option>
                            <option value="instant" ${currentSettings.animationSpeed === 'instant' ? 'selected' : ''}>Instant</option>
                        </select>
                    </div>
                </div>
            </form>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Cancel
            </button>
            <button type="submit" form="settingsForm" class="btn btn-primary">
                Save Settings
            </button>
        `;
    }

    /**
     * Create lobby modal content
     */
    createLobbyModal(body, footer, options) {
        body.innerHTML = `
            <div class="lobby-content">
                <div class="lobby-section">
                    <h3>Join Existing Room</h3>
                    <div class="form-group">
                        <input type="text" id="roomCode" placeholder="Enter room code" class="room-code-input">
                        <button type="button" class="btn btn-primary" onclick="this.joinRoom()">Join Room</button>
                    </div>
                </div>
                
                <div class="lobby-divider">
                    <span>OR</span>
                </div>
                
                <div class="lobby-section">
                    <h3>Create New Room</h3>
                    <form id="createRoomForm" class="modal-form">
                        <div class="form-group">
                            <label for="roomName">Room Name</label>
                            <input type="text" id="roomName" name="roomName" placeholder="Enter room name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="roomPassword">Password (Optional)</label>
                            <input type="password" id="roomPassword" name="roomPassword" placeholder="Leave empty for public room">
                        </div>
                        
                        <div class="form-group">
                            <label for="maxPlayers">Max Players</label>
                            <select id="maxPlayers" name="maxPlayers">
                                <option value="2">2 Players</option>
                                <option value="4">4 Players</option>
                                <option value="6">6 Players</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="gameMode">Game Mode</label>
                            <select id="gameMode" name="gameMode">
                                <option value="constructed">Constructed (7 damage)</option>
                                <option value="limited">Limited (6 damage)</option>
                            </select>
                        </div>
                    </form>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Cancel
            </button>
            <button type="submit" form="createRoomForm" class="btn btn-primary">
                Create Room
            </button>
        `;
    }

    /**
     * Create deck selection modal content
     */
    createDeckSelectModal(body, footer, options) {
        // Get available decks from the deck manager
        const decks = window.app?.deckManager?.getAllDecks() || new Map();
        const deckArray = Array.from(decks.values());

        body.innerHTML = `
            <div class="deck-select-content">
                <div class="deck-select-header">
                    <h3>Select a Deck to Load</h3>
                    <p>Choose from your saved decks below:</p>
                </div>
                
                <div class="deck-list-container">
                    ${deckArray.length === 0 ? `
                        <div class="no-decks-message">
                            <div class="no-decks-icon">📚</div>
                            <h4>No Saved Decks</h4>
                            <p>You haven't saved any decks yet. Create and save a deck first!</p>
                        </div>
                    ` : `
                        <div class="deck-selection-list">
                            ${deckArray.map(deck => `
                                <div class="deck-option" data-deck-id="${deck.id}">
                                    <div class="deck-option-info">
                                        <h4 class="deck-option-name">${deck.name}</h4>
                                        <div class="deck-option-details">
                                            <span class="deck-card-count">${deck.cards.length} cards</span>
                                            <span class="deck-last-modified">Modified: ${new Date(deck.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div class="deck-option-stats">
                                            ${this.getDeckElementBreakdown(deck)}
                                        </div>
                                    </div>
                                    <div class="deck-option-actions">
                                        <button class="btn btn-primary" onclick="app.modal.loadSelectedDeck('${deck.id}')">
                                            Load Deck
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Cancel
            </button>
            ${deckArray.length > 0 ? `
                <button type="button" class="btn btn-danger" onclick="app.modal.confirmDeleteAllDecks()">
                    Delete All Decks
                </button>
            ` : ''}
        `;
    }

    /**
     * Get deck element breakdown for display
     */
    getDeckElementBreakdown(deck) {
        if (!deck.cards || deck.cards.length === 0) {
            return '<span class="deck-empty">Empty deck</span>';
        }

        const elementCounts = {};
        const cardDatabase = window.app?.cardDatabase;
        
        if (!cardDatabase) {
            return '<span class="deck-stats-unavailable">Stats unavailable</span>';
        }

        deck.cards.forEach(cardId => {
            const card = cardDatabase.getCard(cardId);
            if (card) {
                elementCounts[card.element] = (elementCounts[card.element] || 0) + 1;
            }
        });

        const elementIcons = {
            fire: '🔥', ice: '❄️', wind: '🌪️', lightning: '⚡',
            water: '💧', earth: '🌍', light: '☀️', dark: '🌑'
        };

        return Object.entries(elementCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3) // Show top 3 elements
            .map(([element, count]) => `
                <span class="element-count">
                    ${elementIcons[element] || '❓'} ${count}
                </span>
            `).join('');
    }

    /**
     * Load selected deck
     */
    loadSelectedDeck(deckId) {
        try {
            if (window.app?.deckBuilder) {
                window.app.deckBuilder.loadDeck(deckId);
                this.close(this.getModalIdFromElement(document.querySelector(`[data-deck-id="${deckId}"]`)));
            } else {
                window.showNotification('Deck Builder not available', 'error');
            }
        } catch (error) {
            console.error('Error loading deck:', error);
            window.showNotification(`Error loading deck: ${error.message}`, 'error');
        }
    }

    /**
     * Confirm delete all decks
     */
    confirmDeleteAllDecks() {
        this.confirm('Are you sure you want to delete all saved decks? This action cannot be undone.', {
            confirmText: 'Delete All',
            cancelText: 'Cancel',
            type: 'danger',
            onConfirm: () => {
                try {
                    window.app?.deckManager?.clearAllDecks();
                    window.showNotification('All decks deleted successfully', 'success');
                    // Refresh the modal content
                    this.closeAll();
                } catch (error) {
                    window.showNotification(`Error deleting decks: ${error.message}`, 'error');
                }
            }
        });
    }

    /**
     * Create practice setup modal content
     */
    createPracticeSetupModal(body, footer, options) {
        const playerDecks = options.playerDecks || [];
        const aiDecks = options.aiDecks || {};
        const selectedDifficulty = options.selectedDifficulty || 'medium';
        
        body.innerHTML = `
            <div class="practice-setup-container">
                <!-- Deck Selection Section -->
                <div class="setup-section">
                    <div class="section-header">
                        <h3>Choose Your Deck</h3>
                        <p>Select a deck to play against the AI</p>
                    </div>
                    <div class="deck-selection-grid" id="deckSelectionGrid">
                        ${this.createDeckSelectionHTML(playerDecks)}
                    </div>
                    ${playerDecks.length === 0 ? `
                        <div class="no-decks-message">
                            <p>No decks available. Create a deck in the Deck Builder first.</p>
                            <button class="btn btn-primary" onclick="window.app?.switchView('deckBuilder'); window.app?.modal?.close();">
                                Go to Deck Builder
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <!-- AI Difficulty Section -->
                <div class="setup-section">
                    <div class="section-header">
                        <h3>Choose AI Difficulty</h3>
                        <p>Select the challenge level for your practice game</p>
                    </div>
                    <div class="difficulty-selection-grid">
                        ${this.createDifficultySelectionHTML(aiDecks, selectedDifficulty)}
                    </div>
                </div>
                
                <!-- AI Deck Preview Section -->
                <div class="setup-section">
                    <div class="section-header">
                        <h3>AI Opponent Preview</h3>
                    </div>
                    <div class="ai-deck-preview" id="aiDeckPreview">
                        ${this.createAIDeckPreviewHTML(aiDecks[selectedDifficulty])}
                    </div>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <div class="modal-footer-actions">
                <button class="btn btn-secondary" onclick="window.app?.modal?.close()">Cancel</button>
                <button class="btn btn-primary btn-disabled" id="startPracticeButton" 
                        onclick="window.app?.practiceSetup?.startPracticeGame()" disabled>
                    Start Practice Game
                </button>
            </div>
        `;
    }
    
    /**
     * Create deck selection HTML for practice setup
     */
    createDeckSelectionHTML(decks) {
        if (decks.length === 0) return '';
        
        return decks.map(deck => `
            <div class="deck-selection-card" data-deck-id="${deck.id}" 
                 onclick="window.app?.practiceSetup?.selectDeck('${deck.id}')">
                <div class="deck-card-header">
                    <h4 class="deck-card-name">${deck.name}</h4>
                    <span class="deck-card-count">${deck.cards?.length || 0} cards</span>
                </div>
                <div class="deck-card-preview">
                    ${this.getDeckElementsPreview(deck)}
                </div>
                <div class="deck-card-footer">
                    <span class="deck-created">Created: ${new Date(deck.created || Date.now()).toLocaleDateString()}</span>
                </div>
                <div class="selection-indicator">
                    <div class="checkmark">✓</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Create difficulty selection HTML
     */
    createDifficultySelectionHTML(aiDecks, selectedDifficulty) {
        const difficulties = ['easy', 'medium', 'hard'];
        
        return difficulties.map(difficulty => `
            <div class="difficulty-card ${difficulty} ${difficulty === selectedDifficulty ? 'selected' : ''}" 
                 data-difficulty="${difficulty}"
                 onclick="window.app?.practiceSetup?.selectDifficulty('${difficulty}')">
                <div class="difficulty-icon">
                    ${this.getDifficultyIcon(difficulty)}
                </div>
                <h4 class="difficulty-name">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h4>
                <p class="difficulty-description">${this.getDifficultyDescription(difficulty)}</p>
                <div class="difficulty-features">
                    ${this.getDifficultyFeatures(difficulty)}
                </div>
                <div class="selection-indicator">
                    <div class="checkmark">✓</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Create AI deck preview HTML
     */
    createAIDeckPreviewHTML(aiDeck) {
        if (!aiDeck) return '<p>Select a difficulty to see AI deck info</p>';
        
        return `
            <div class="ai-deck-info">
                <div class="ai-deck-header">
                    <h4>${aiDeck.name}</h4>
                    <span class="ai-strategy-tag">${aiDeck.strategy}</span>
                </div>
                <p class="ai-deck-description">${aiDeck.description}</p>
                <div class="ai-deck-stats">
                    <div class="ai-stat">
                        <span class="stat-label">Difficulty:</span>
                        <span class="stat-value">${aiDeck.difficulty}</span>
                    </div>
                    <div class="ai-stat">
                        <span class="stat-label">Strategy:</span>
                        <span class="stat-value">${aiDeck.strategy}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get deck elements preview
     */
    getDeckElementsPreview(deck) {
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
            .slice(0, 4)
            .map(([element, count]) => `
                <span class="element-preview">${elementIcons[element] || element} ${count}</span>
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
            easy: 'Perfect for learning and testing new decks',
            medium: 'Balanced challenge with strategic play',
            hard: 'Advanced AI with optimal decision making'
        };
        return descriptions[difficulty] || '';
    }
    
    /**
     * Get difficulty features
     */
    getDifficultyFeatures(difficulty) {
        const features = {
            easy: ['Basic plays', 'Predictable', 'Forgiving'],
            medium: ['Strategic', 'Adaptive', 'Challenging'],
            hard: ['Optimal plays', 'Complex', 'Unforgiving']
        };
        
        return (features[difficulty] || [])
            .map(feature => `<span class="feature-tag">${feature}</span>`)
            .join('');
    }

    /**
     * Get modal ID from element
     */
    getModalIdFromElement(element) {
        const modal = element?.closest('.modal');
        return modal?.id || null;
    }

    /**
     * Create card preview modal content
     */
    createCardPreviewModal(body, footer, options) {
        const card = options.card;
        if (!card) {
            body.innerHTML = '<p>No card data provided</p>';
            return;
        }

        body.innerHTML = `
            <div class="card-preview-content">
                <div class="card-preview-display">
                    <div class="card-preview-image">
                        ${this.getCardPreviewImageHTML(card)}
                    </div>
                    <div class="card-preview-details">
                        <div class="card-detail-header">
                            <h3 class="card-detail-name">${card.name}</h3>
                            <div class="card-detail-cost">${card.cost || '-'}</div>
                        </div>
                        
                        <div class="card-detail-info">
                            <div class="card-detail-row">
                                <span class="card-detail-label">Element:</span>
                                <span class="card-detail-value">
                                    ${this.getElementIcon(card.element)} ${this.capitalizeFirst(card.element)}
                                </span>
                            </div>
                            <div class="card-detail-row">
                                <span class="card-detail-label">Type:</span>
                                <span class="card-detail-value">${this.capitalizeFirst(card.type)}</span>
                            </div>
                            ${card.power ? `
                                <div class="card-detail-row">
                                    <span class="card-detail-label">Power:</span>
                                    <span class="card-detail-value">${card.power}</span>
                                </div>
                            ` : ''}
                            ${card.job ? `
                                <div class="card-detail-row">
                                    <span class="card-detail-label">Job:</span>
                                    <span class="card-detail-value">${card.job}</span>
                                </div>
                            ` : ''}
                            ${card.category ? `
                                <div class="card-detail-row">
                                    <span class="card-detail-label">Category:</span>
                                    <span class="card-detail-value">${card.category}</span>
                                </div>
                            ` : ''}
                            ${card.rarity ? `
                                <div class="card-detail-row">
                                    <span class="card-detail-label">Rarity:</span>
                                    <span class="card-detail-value">${card.rarity}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${card.text ? `
                            <div class="card-detail-text">
                                <h4>Card Text:</h4>
                                <p>${card.text}</p>
                            </div>
                        ` : ''}
                        
                        ${card.flavorText ? `
                            <div class="card-detail-flavor">
                                <h4>Flavor Text:</h4>
                                <p><em>${card.flavorText}</em></p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Close
            </button>
            <button type="button" class="btn btn-primary" onclick="app.deckBuilder?.addCardToDeck('${card.id}'); app.modal.close('${body.closest('.modal').id}')">
                Add to Deck
            </button>
        `;
    }

    /**
     * Get element icon (helper method for card preview)
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
     * Capitalize first letter (helper method)
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get the appropriate image HTML for card preview modal
     */
    getCardPreviewImageHTML(card) {
        // Check if we have a real image mapping for this card
        const imageMapping = this.cardImageMapping && this.cardImageMapping[card.id];
        
        if (imageMapping && imageMapping.image) {
            return `
                <img class="card-preview-real-image" 
                     src="${imageMapping.image}" 
                     alt="${card.name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
                <div class="card-large-placeholder element-${card.element}" style="display: none;">
                    <div class="card-preview-header">
                        <div class="card-large-icon">${this.getElementIcon(card.element)}</div>
                        <div class="card-cost-badge">${card.cost || '0'}</div>
                    </div>
                    <div class="card-large-name">${card.name}</div>
                    <div class="card-large-meta">${card.set || 'Unknown'}</div>
                    <div class="card-large-type">${this.capitalizeFirst(card.type)}</div>
                    ${card.power ? `<div class="card-large-power">${card.power}</div>` : ''}
                    <div class="card-art-note">Official Card Art<br>Not Available</div>
                </div>
            `;
        } else {
            // Use placeholder
            return `
                <div class="card-large-placeholder element-${card.element}">
                    <div class="card-preview-header">
                        <div class="card-large-icon">${this.getElementIcon(card.element)}</div>
                        <div class="card-cost-badge">${card.cost || '0'}</div>
                    </div>
                    <div class="card-large-name">${card.name}</div>
                    <div class="card-large-meta">${card.set || 'Unknown'}</div>
                    <div class="card-large-type">${this.capitalizeFirst(card.type)}</div>
                    ${card.power ? `<div class="card-large-power">${card.power}</div>` : ''}
                    <div class="card-art-note">Official Card Art<br>Not Available</div>
                </div>
            `;
        }
    }

    /**
     * Create game rules modal content
     */
    createGameRulesModal(body, footer, options) {
        body.innerHTML = `
            <div class="rules-content">
                <div class="rules-nav">
                    <button class="rules-tab active" data-tab="overview">Overview</button>
                    <button class="rules-tab" data-tab="elements">Elements</button>
                    <button class="rules-tab" data-tab="phases">Turn Structure</button>
                    <button class="rules-tab" data-tab="combat">Combat</button>
                    <button class="rules-tab" data-tab="keywords">Keywords</button>
                </div>
                
                <div class="rules-panels">
                    <div class="rules-panel active" id="overview-panel">
                        ${this.getRulesOverviewContent()}
                    </div>
                    <div class="rules-panel" id="elements-panel">
                        ${this.getRulesElementsContent()}
                    </div>
                    <div class="rules-panel" id="phases-panel">
                        ${this.getRulesPhasesContent()}
                    </div>
                    <div class="rules-panel" id="combat-panel">
                        ${this.getRulesCombatContent()}
                    </div>
                    <div class="rules-panel" id="keywords-panel">
                        ${this.getRulesKeywordsContent()}
                    </div>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-primary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Close
            </button>
        `;

        // Set up tab switching
        this.setupRulesTabs(body);
    }

    /**
     * Create confirmation modal content
     */
    createConfirmModal(body, footer, options) {
        const message = options.message || 'Are you sure?';
        const confirmText = options.confirmText || 'Confirm';
        const cancelText = options.cancelText || 'Cancel';
        const type = options.type || 'warning'; // warning, danger, info

        body.innerHTML = `
            <div class="confirm-content">
                <div class="confirm-icon ${type}">
                    ${this.getConfirmIcon(type)}
                </div>
                <div class="confirm-message">
                    ${message}
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                ${cancelText}
            </button>
            <button type="button" class="btn btn-${type}" onclick="app.modal.handleConfirm('${body.closest('.modal').id}')">
                ${confirmText}
            </button>
        `;
    }

    /**
     * Handle form submission
     */
    handleFormSubmission(modalId, form) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Add checkbox values that might be unchecked
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        // Validate form
        if (!this.validateForm(form, data)) {
            return;
        }

        // Handle based on modal type
        switch (modal.type) {
            case 'profile':
                this.handleProfileSubmission(modalId, data);
                break;
            case 'settings':
                this.handleSettingsSubmission(modalId, data);
                break;
            case 'lobby':
                this.handleLobbySubmission(modalId, data);
                break;
            default:
                console.warn(`Form submission not handled for modal type: ${modal.type}`);
        }
    }

    /**
     * Handle profile form submission
     */
    handleProfileSubmission(modalId, data) {
        try {
            if (window.app?.playerManager) {
                // Get selected avatar
                const selectedAvatar = document.querySelector('.avatar-option.selected')?.dataset.avatar || '⚡';
                
                window.app.playerManager.updateProfile({
                    name: data.name,
                    avatar: selectedAvatar,
                    title: data.title
                });
                
                this.close(modalId);
                window.showNotification('Profile updated successfully!', 'success');
            }
        } catch (error) {
            this.showFormError('profileForm', error.message);
        }
    }

    /**
     * Handle settings form submission
     */
    handleSettingsSubmission(modalId, data) {
        try {
            if (window.app?.playerManager) {
                window.app.playerManager.updateSettings(data);
                this.close(modalId);
                window.showNotification('Settings saved successfully!', 'success');
            }
        } catch (error) {
            this.showFormError('settingsForm', error.message);
        }
    }

    /**
     * Close a modal
     */
    close(modalId) {
        const modal = this.activeModals.get(modalId);
        
        if (!modal) {
            console.warn(`Modal not found: ${modalId}`);
            return;
        }

        // Add closing animation
        modal.element.parentElement.classList.add('closing');
        
        // Remove after animation
        setTimeout(() => {
            if (modal.element.parentElement) {
                modal.element.parentElement.remove();
            }
            this.activeModals.delete(modalId);
            
            // Remove modal-open class if no more modals
            if (this.activeModals.size === 0) {
                document.body.classList.remove('modal-open');
            }
        }, 300);

        // Emit event
        this.emit('modalClosed', { modalId, type: modal.type });
        
        console.log(`🪟 Closed modal: ${modalId}`);
    }

    /**
     * Close the topmost modal
     */
    closeTopModal() {
        const modalIds = Array.from(this.activeModals.keys());
        if (modalIds.length > 0) {
            const topModalId = modalIds[modalIds.length - 1];
            this.close(topModalId);
        }
    }

    /**
     * Close all modals
     */
    closeAll() {
        const modalIds = Array.from(this.activeModals.keys());
        modalIds.forEach(modalId => this.close(modalId));
    }

    /**
     * Validate form data
     */
    validateForm(form, data) {
        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(error => error.remove());
        
        // Basic HTML5 validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        return true;
    }

    /**
     * Show form error
     */
    showFormError(formId, message) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Remove existing errors
        form.querySelectorAll('.form-error').forEach(error => error.remove());
        
        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        
        form.insertBefore(errorDiv, form.firstChild);
    }

    /**
     * Get rules content (placeholder implementations)
     */
    getRulesOverviewContent() {
        return `
            <h3>Game Overview</h3>
            <p>The Final Fantasy Trading Card Game is a strategic card game for 2 players featuring characters from across the Final Fantasy series.</p>
            
            <h4>How to Win</h4>
            <ul>
                <li>Deal 7 points of damage to your opponent (6 in Limited format)</li>
                <li>Force your opponent to draw from an empty deck</li>
            </ul>
            
            <h4>Deck Construction</h4>
            <ul>
                <li>Exactly 50 cards in your main deck</li>
                <li>Maximum 3 copies of any card</li>
                <li>Optional Limit Break deck (0-8 cards)</li>
            </ul>
        `;
    }

    getRulesElementsContent() {
        return `
            <h3>The 8 Elements</h3>
            <div class="elements-grid">
                <div class="element-card fire">
                    <h4>🔥 Fire</h4>
                    <p>Excels at dealing damage with powerful spells and aggressive forwards.</p>
                </div>
                <div class="element-card ice">
                    <h4>❄️ Ice</h4>
                    <p>Specializes in dulling opponents and hand disruption tactics.</p>
                </div>
                <div class="element-card wind">
                    <h4>🌪️ Wind</h4>
                    <p>Focuses on speed, quick attacks, and deck manipulation.</p>
                </div>
                <div class="element-card lightning">
                    <h4>⚡ Lightning</h4>
                    <p>Excels at removing forwards with precise, high-damage abilities.</p>
                </div>
                <div class="element-card water">
                    <h4>💧 Water</h4>
                    <p>Card draw, advantage building, and tactical flexibility.</p>
                </div>
                <div class="element-card earth">
                    <h4>🌍 Earth</h4>
                    <p>Defensive strategies with tough forwards and protection.</p>
                </div>
                <div class="element-card light">
                    <h4>☀️ Light</h4>
                    <p>Powerful cards playable with any element CP. Limited to 1 on field.</p>
                </div>
                <div class="element-card dark">
                    <h4>🌑 Dark</h4>
                    <p>Powerful cards playable with any element CP. Limited to 1 on field.</p>
                </div>
            </div>
        `;
    }

    getRulesPhasesContent() {
        return `
            <h3>Turn Structure</h3>
            <div class="phases-list">
                <div class="phase-item">
                    <h4>1. Active Phase</h4>
                    <p>Activate all your dull characters. No player actions.</p>
                </div>
                <div class="phase-item">
                    <h4>2. Draw Phase</h4>
                    <p>Draw 2 cards (1 card for first player's first turn).</p>
                </div>
                <div class="phase-item">
                    <h4>3. Main Phase 1</h4>
                    <p>Play characters, cast summons, use abilities, generate CP.</p>
                </div>
                <div class="phase-item">
                    <h4>4. Attack Phase</h4>
                    <p>Attack with your forwards. Opponent may block.</p>
                </div>
                <div class="phase-item">
                    <h4>5. Main Phase 2</h4>
                    <p>Same as Main Phase 1. Final chance to act this turn.</p>
                </div>
                <div class="phase-item">
                    <h4>6. End Phase</h4>
                    <p>Clear damage, discard to hand limit (5 cards), end turn.</p>
                </div>
            </div>
        `;
    }

    getRulesCombatContent() {
        return `
            <h3>Combat System</h3>
            
            <h4>Attack Declaration</h4>
            <p>During your attack phase, you may attack with active forwards that didn't enter the field this turn (unless they have Haste).</p>
            
            <h4>Party Attacks</h4>
            <p>You can attack with multiple forwards of the same element as a party. The party's power is the sum of all attacking forwards.</p>
            
            <h4>Blocking</h4>
            <p>The defending player may block with one active forward. Blocking doesn't dull the forward.</p>
            
            <h4>Damage Resolution</h4>
            <ul>
                <li><strong>Unblocked:</strong> Deal 1 damage to the opponent (regardless of attacker's power)</li>
                <li><strong>Blocked:</strong> Attacking and blocking forwards deal damage to each other equal to their power</li>
                <li><strong>First Strike:</strong> Deals damage before non-first strike forwards</li>
            </ul>
        `;
    }

    getRulesKeywordsContent() {
        return `
            <h3>Keyword Abilities</h3>
            
            <div class="keywords-list">
                <div class="keyword-item">
                    <h4>Brave</h4>
                    <p>This forward doesn't dull when attacking.</p>
                </div>
                <div class="keyword-item">
                    <h4>Haste</h4>
                    <p>This character can attack or use abilities with dull costs the turn it enters the field.</p>
                </div>
                <div class="keyword-item">
                    <h4>First Strike</h4>
                    <p>Deals damage before forwards without First Strike in combat.</p>
                </div>
                <div class="keyword-item">
                    <h4>EX Burst</h4>
                    <p>When this card is revealed for damage, you may use its effect.</p>
                </div>
                <div class="keyword-item">
                    <h4>Back Attack</h4>
                    <p>This character can be played during either player's turn.</p>
                </div>
                <div class="keyword-item">
                    <h4>Freeze</h4>
                    <p>A frozen character won't activate during its owner's next active phase.</p>
                </div>
            </div>
        `;
    }

    /**
     * Set up rules tabs functionality
     */
    setupRulesTabs(container) {
        const tabs = container.querySelectorAll('.rules-tab');
        const panels = container.querySelectorAll('.rules-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Remove active class from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetPanel = container.querySelector(`#${targetTab}-panel`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    /**
     * Get confirmation icon based on type
     */
    getConfirmIcon(type) {
        switch (type) {
            case 'danger':
                return '⚠️';
            case 'warning':
                return '❓';
            case 'info':
                return 'ℹ️';
            default:
                return '❓';
        }
    }

    /**
     * Handle confirmation
     */
    handleConfirm(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        // Execute callback if provided
        if (modal.options.onConfirm) {
            modal.options.onConfirm();
        }

        // Emit event
        this.emit('modalConfirmed', { modalId, type: modal.type });

        // Close modal
        this.close(modalId);
    }

    /**
     * Create deck export modal content
     */
    createDeckExportModal(body, footer, options) {
        const deckName = options.deckName || 'Unnamed Deck';
        const deckText = options.deckText || '';

        body.innerHTML = `
            <div class="deck-export-content">
                <div class="export-header">
                    <h3>Export: ${deckName}</h3>
                    <p>Copy the text below to share your deck or import it into other applications.</p>
                </div>
                
                <div class="export-text-container">
                    <textarea id="deckExportText" class="export-textarea" readonly>${deckText}</textarea>
                </div>
                
                <div class="export-actions">
                    <button type="button" class="btn btn-secondary" id="copyDeckBtn">
                        📋 Copy to Clipboard
                    </button>
                    <button type="button" class="btn btn-secondary" id="downloadDeckBtn">
                        💾 Download as File
                    </button>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-primary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Close
            </button>
        `;

        // Set up copy functionality
        const copyBtn = body.querySelector('#copyDeckBtn');
        const downloadBtn = body.querySelector('#downloadDeckBtn');
        const textArea = body.querySelector('#deckExportText');

        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(deckText);
                copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy to Clipboard';
                }, 2000);
                window.showNotification('Deck copied to clipboard!', 'success');
            } catch (error) {
                // Fallback method
                textArea.select();
                document.execCommand('copy');
                copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy to Clipboard';
                }, 2000);
                window.showNotification('Deck copied to clipboard!', 'success');
            }
        });

        downloadBtn.addEventListener('click', () => {
            const blob = new Blob([deckText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.showNotification('Deck downloaded!', 'success');
        });

        // Auto-select text on focus
        textArea.addEventListener('focus', () => {
            textArea.select();
        });
    }

    /**
     * Create deck import modal content
     */
    createDeckImportModal(body, footer, options) {
        body.innerHTML = `
            <div class="deck-import-content">
                <div class="import-header">
                    <h3>Import Deck</h3>
                    <p>Paste deck text in formats: <code>[#] x [CardID]</code> or <code>[#] CardName (CardID)</code></p>
                </div>
                
                <form id="deckImportForm" class="modal-form">
                    <div class="form-group">
                        <label for="deckImportName">Deck Name</label>
                        <input type="text" id="deckImportName" name="deckName" value="Imported Deck" 
                               placeholder="Enter deck name" required maxlength="50" 
                               pattern="[a-zA-Z0-9 \-_]{1,50}" 
                               title="Only letters, numbers, spaces, hyphens, and underscores allowed">
                    </div>
                    
                    <div class="form-group">
                        <label for="deckImportText">Deck Text</label>
                        <textarea id="deckImportText" name="deckText" class="import-textarea" 
                                  placeholder="Paste your deck list here...
Supported formats:
Standard: 3 x 1-001L
With names: 3 x 1-001L Lightning
Materia Hunter: 3 Valigarmanda (24-073H)
FFDB: 3 × 1-001L - Cloud

Comments starting with // or # are ignored."
                                  required rows="15"></textarea>
                        <div class="form-hint">Supports standard "x" format and Materia Hunter "(CardID)" format</div>
                    </div>
                </form>
                
                <div class="import-preview" id="importPreview" style="display: none;">
                    <h4>Import Preview</h4>
                    <div class="preview-stats">
                        <span id="previewCardCount">0 cards</span>
                        <span id="previewErrors">0 errors</span>
                    </div>
                    <div class="preview-details" id="previewDetails"></div>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Cancel
            </button>
            <button type="button" class="btn btn-secondary" id="previewBtn">
                Preview
            </button>
            <button type="submit" form="deckImportForm" class="btn btn-primary" id="importBtn" disabled>
                Import Deck
            </button>
        `;

        // Set up form handling
        const form = body.querySelector('#deckImportForm');
        const previewBtn = footer.querySelector('#previewBtn');
        const importBtn = footer.querySelector('#importBtn');
        const textArea = body.querySelector('#deckImportText');
        const nameInput = body.querySelector('#deckImportName');
        const previewDiv = body.querySelector('#importPreview');

        let lastPreviewText = '';

        // Preview functionality
        previewBtn.addEventListener('click', () => {
            const deckText = textArea.value.trim();
            if (!deckText) {
                window.showNotification('Please enter deck text to preview', 'warning');
                return;
            }

            try {
                const preview = this.previewDeckImport(deckText);
                this.showImportPreview(previewDiv, preview);
                // Enable import if we have any valid cards, even with some errors
                importBtn.disabled = preview.cards.length === 0;
                lastPreviewText = deckText;
            } catch (error) {
                window.showNotification(`Preview error: ${error.message}`, 'error');
                importBtn.disabled = true;
            }
        });

        // Auto-preview on text change (debounced)
        let previewTimeout;
        textArea.addEventListener('input', () => {
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(() => {
                if (textArea.value.trim() && textArea.value.trim() !== lastPreviewText) {
                    previewBtn.click();
                }
            }, 1000);
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            let deckText = formData.get('deckText');
            let deckName = formData.get('deckName');

            // Sanitize inputs
            deckText = this.sanitizeTextInput(deckText);
            deckName = this.sanitizeDeckName(deckName);

            if (!deckText) {
                window.showNotification('Please enter deck text', 'warning');
                return;
            }

            if (!deckName) {
                window.showNotification('Please enter a valid deck name', 'warning');
                return;
            }

            if (options.onImport) {
                options.onImport(deckText, deckName);
                this.close(body.closest('.modal').id);
            }
        });
    }

    /**
     * Preview deck import without actually importing
     */
    previewDeckImport(deckText) {
        const cards = [];
        const errors = [];
        const warnings = [];
        let lineNumber = 0;

        // Sanitize input first
        const sanitizedText = this.sanitizePreviewInput(deckText);
        const lines = sanitizedText.split('\n');

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
                errors.push(`Line ${lineNumber}: Invalid format "${this.truncateForPreview(trimmedLine)}"`);
                continue;
            }

            const count = parseInt(match[1]);
            const cardId = this.sanitizeCardIdForPreview(match[2]);

            // Validate count
            if (count < 1 || count > 3) {
                errors.push(`Line ${lineNumber}: Invalid card count ${count} (must be 1-3)`);
                continue;
            }

            // Validate card ID format
            if (!this.isValidCardIdFormatPreview(cardId)) {
                errors.push(`Line ${lineNumber}: Invalid card ID format "${this.truncateForPreview(cardId)}"`);
                continue;
            }

            // Check if card exists (if we have access to card database)
            if (window.app?.cardDatabase) {
                const card = window.app.cardDatabase.getCard(cardId);
                
                if (!card) {
                    // Try some common variations if the exact ID doesn't work
                    const variations = [
                        cardId.toUpperCase(),
                        cardId.toLowerCase(),
                        cardId.replace('-', '_'),
                        cardId.replace('_', '-')
                    ];
                    
                    let foundCard = null;
                    for (const variation of variations) {
                        foundCard = window.app.cardDatabase.getCard(variation);
                        if (foundCard) {
                            break;
                        }
                    }
                    
                    if (!foundCard) {
                        errors.push(`Line ${lineNumber}: Card "${this.truncateForPreview(cardId)}" not found in database`);
                        continue;
                    } else {
                        // Use the found variation
                        for (let i = 0; i < count; i++) {
                            cards.push({ cardId: foundCard.id, name: foundCard.name, element: foundCard.element });
                        }
                    }
                } else {
                    // Add valid cards
                    for (let i = 0; i < count; i++) {
                        cards.push({ cardId, name: card.name, element: card.element });
                    }
                }
            } else {
                // Without database, just add the IDs
                for (let i = 0; i < count; i++) {
                    cards.push({ cardId, name: cardId, element: 'unknown' });
                }
            }
        }

        // Check deck size
        if (cards.length > 50) {
            errors.push(`Deck too large: ${cards.length} cards (maximum 50)`);
        }

        return { cards, errors, warnings };
    }

    /**
     * Sanitize input for preview (lighter version)
     */
    sanitizePreviewInput(text) {
        if (typeof text !== 'string') {
            return '';
        }

        // Remove HTML tags and dangerous content
        let sanitized = text.replace(/<[^>]*>/g, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/data:/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');

        // Limit length
        if (sanitized.length > 50000) {
            return sanitized.substring(0, 50000);
        }

        return sanitized;
    }

    /**
     * Sanitize card ID for preview
     */
    sanitizeCardIdForPreview(cardId) {
        if (typeof cardId !== 'string') {
            return '';
        }
        return cardId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 20);
    }

    /**
     * Validate card ID format for preview
     */
    isValidCardIdFormatPreview(cardId) {
        if (!cardId || typeof cardId !== 'string') {
            return false;
        }
        
        if (cardId.length < 2 || cardId.length > 20) {
            return false;
        }
        
        return /^[a-zA-Z0-9\-_]+$/.test(cardId);
    }

    /**
     * Truncate text for preview display
     */
    truncateForPreview(text, maxLength = 50) {
        if (!text || typeof text !== 'string') {
            return '[invalid]';
        }
        
        const clean = text.replace(/[<>&"']/g, '').replace(/[\x00-\x1F\x7F]/g, '');
        return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
    }

    /**
     * Create card detail modal
     */
    createCardDetailModal(body, footer, options) {
        const card = options.card;
        if (!card) {
            body.innerHTML = '<p>No card data provided</p>';
            return;
        }

        // Get card image URL using same logic as DeckBuilder
        let imageUrl = null;
        if (window.app && window.app.deckBuilder) {
            // Try to get image through the same system as deck builder
            const cardImageMapping = window.imageMapping?.getCardImageMapping(card.id);
            if (cardImageMapping && cardImageMapping.image) {
                imageUrl = cardImageMapping.image;
            } else if (card.hasRealImage && card.image) {
                imageUrl = card.image;
            }
        }

        body.innerHTML = `
            <div class="card-detail-modal">
                <div class="card-detail-image">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${card.name}" class="card-detail-img" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                         <div class="card-detail-placeholder" style="display: none;">
                             <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                             <div class="card-placeholder-text">${card.name}</div>
                         </div>` :
                        `<div class="card-detail-placeholder">
                             <div class="card-placeholder-icon">${this.getElementIcon(card.element)}</div>
                             <div class="card-placeholder-text">${card.name}</div>
                         </div>`
                    }
                </div>
                <div class="card-detail-info">
                    <div class="card-detail-header">
                        <h2 class="card-detail-name">${card.name}</h2>
                        <div class="card-detail-cost">${card.cost || '-'}</div>
                    </div>
                    
                    <div class="card-detail-stats">
                        <div class="card-detail-row">
                            <span class="card-detail-label">ID:</span>
                            <span class="card-detail-value">${card.id}</span>
                        </div>
                        <div class="card-detail-row">
                            <span class="card-detail-label">Element:</span>
                            <span class="card-detail-value">
                                ${this.getElementIcon(card.element)} ${this.capitalizeFirst(card.element)}
                            </span>
                        </div>
                        <div class="card-detail-row">
                            <span class="card-detail-label">Type:</span>
                            <span class="card-detail-value">${this.capitalizeFirst(card.type)}</span>
                        </div>
                        ${card.power ? `
                            <div class="card-detail-row">
                                <span class="card-detail-label">Power:</span>
                                <span class="card-detail-value">${card.power}</span>
                            </div>
                        ` : ''}
                        ${card.job ? `
                            <div class="card-detail-row">
                                <span class="card-detail-label">Job:</span>
                                <span class="card-detail-value">${card.job}</span>
                            </div>
                        ` : ''}
                        ${card.category ? `
                            <div class="card-detail-row">
                                <span class="card-detail-label">Category:</span>
                                <span class="card-detail-value">${card.category}</span>
                            </div>
                        ` : ''}
                        ${card.rarity ? `
                            <div class="card-detail-row">
                                <span class="card-detail-label">Rarity:</span>
                                <span class="card-detail-value">${card.rarity}</span>
                            </div>
                        ` : ''}
                        ${card.set ? `
                            <div class="card-detail-row">
                                <span class="card-detail-label">Set:</span>
                                <span class="card-detail-value">${card.set}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${card.text ? `
                        <div class="card-detail-text">
                            <h4>Card Text:</h4>
                            <div class="card-text-content">${card.text}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-primary" onclick="app.modal.close('${body.closest('.modal').id}')">
                Close
            </button>
        `;
    }

    /**
     * Sanitize text input (for deck text)
     */
    sanitizeTextInput(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        // Remove HTML tags and dangerous content
        let sanitized = text.replace(/<[^>]*>/g, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/data:/gi, '');
        sanitized = sanitized.replace(/vbscript:/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');

        // Trim and limit length
        sanitized = sanitized.trim();
        if (sanitized.length > 50000) {
            sanitized = sanitized.substring(0, 50000);
        }

        return sanitized;
    }

    /**
     * Sanitize deck name input
     */
    sanitizeDeckName(name) {
        if (!name || typeof name !== 'string') {
            return '';
        }

        // Remove HTML and dangerous characters, keep only safe characters
        let sanitized = name.replace(/<[^>]*>/g, '');
        sanitized = sanitized.replace(/[^\w\s\-_]/g, ''); // Only word chars, spaces, hyphens, underscores
        sanitized = sanitized.trim();
        
        // Limit length
        if (sanitized.length > 50) {
            sanitized = sanitized.substring(0, 50);
        }

        // Ensure it's not empty after sanitization
        if (!sanitized) {
            return 'Imported Deck';
        }

        return sanitized;
    }

    /**
     * Show import preview in modal
     */
    showImportPreview(previewDiv, preview) {
        const cardCount = preview.cards.length;
        const errorCount = preview.errors.length;

        previewDiv.style.display = 'block';
        
        // Update stats
        previewDiv.querySelector('#previewCardCount').textContent = `${cardCount} cards`;
        previewDiv.querySelector('#previewErrors').textContent = `${errorCount} errors`;
        
        // Color code the stats
        const cardCountEl = previewDiv.querySelector('#previewCardCount');
        const errorCountEl = previewDiv.querySelector('#previewErrors');
        
        cardCountEl.style.color = cardCount === 0 ? '#ff4444' : cardCount > 50 ? '#ffaa00' : '#44aa44';
        errorCountEl.style.color = errorCount > 0 ? '#ff4444' : '#44aa44';

        // Show details
        const detailsDiv = previewDiv.querySelector('#previewDetails');
        
        if (errorCount > 0) {
            detailsDiv.innerHTML = `
                <div class="preview-errors">
                    <h5>Errors (${errorCount}):</h5>
                    <ul>${preview.errors.slice(0, 10).map(error => `<li>${error}</li>`).join('')}</ul>
                    ${preview.errors.length > 10 ? `<p>... and ${preview.errors.length - 10} more errors</p>` : ''}
                </div>
            `;
        } else if (cardCount > 0) {
            // Group cards by ID for display
            const cardCounts = {};
            preview.cards.forEach(card => {
                cardCounts[card.cardId] = (cardCounts[card.cardId] || 0) + 1;
            });

            const sortedEntries = Object.entries(cardCounts).sort();
            const displayCards = sortedEntries.slice(0, 10);

            detailsDiv.innerHTML = `
                <div class="preview-cards">
                    <h5>Cards Preview (${Object.keys(cardCounts).length} unique):</h5>
                    <ul>${displayCards.map(([cardId, count]) => `<li>${count} x ${cardId}</li>`).join('')}</ul>
                    ${sortedEntries.length > 10 ? `<p>... and ${sortedEntries.length - 10} more cards</p>` : ''}
                </div>
            `;
        } else {
            detailsDiv.innerHTML = '<p>No valid cards found in the text.</p>';
        }
    }

    /**
     * Quick helper methods for common modals
     */
    
    /**
     * Show confirmation dialog
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modalId = this.open('confirm', {
                message: message,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                type: options.type || 'warning',
                onConfirm: () => resolve(true)
            });

            // Handle cancel/close as reject
            this.once('modalClosed', (data) => {
                if (data.modalId === modalId) {
                    resolve(false);
                }
            });
        });
    }

    /**
     * Show profile modal
     */
    openProfile() {
        return this.open('profile');
    }

    /**
     * Show settings modal
     */
    openSettings() {
        return this.open('settings');
    }

    /**
     * Show lobby modal
     */
    openLobby() {
        return this.open('lobby');
    }

    /**
     * Show game rules modal
     */
    openGameRules() {
        return this.open('gameRules');
    }

    /**
     * Show card preview modal
     */
    openCardPreview(card) {
        return this.open('cardPreview', { card });
    }

    /**
     * Show deck selection modal
     */
    openDeckSelect(decks = []) {
        return this.open('deckSelect', { decks });
    }

    /**
     * Check if any modals are open
     */
    hasOpenModals() {
        return this.activeModals.size > 0;
    }

    /**
     * Get list of open modal types
     */
    getOpenModalTypes() {
        return Array.from(this.activeModals.values()).map(modal => modal.type);
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
     * Add one-time event listener
     */
    once(eventName, callback) {
        const wrappedCallback = (data) => {
            callback(data);
            this.off(eventName, wrappedCallback);
        };
        this.on(eventName, wrappedCallback);
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
                    console.error(`Error in modal event listener for ${eventName}:`, error);
                }
            });
        }
    }
}

// Setup avatar selection functionality
document.addEventListener('click', (e) => {
    if (e.target.closest('.avatar-option')) {
        const avatarOption = e.target.closest('.avatar-option');
        const container = avatarOption.closest('.avatar-grid');
        
        // Remove selected class from all options
        container.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        avatarOption.classList.add('selected');
    }
});

// Range input value display
document.addEventListener('input', (e) => {
    if (e.target.type === 'range') {
        const valueDisplay = e.target.parentElement.querySelector('.range-value');
        if (valueDisplay) {
            valueDisplay.textContent = Math.round(e.target.value * 100) + '%';
        }
    }
});

// Global modal functions for backward compatibility
window.openModal = function(type, options) {
    if (window.app && window.app.modal) {
        return window.app.modal.open(type, options);
    }
    console.warn('Modal system not available');
};

window.closeModal = function(modalId) {
    if (window.app && window.app.modal) {
        return window.app.modal.close(modalId);
    }
    console.warn('Modal system not available');
};