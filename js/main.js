/**
 * FINAL FANTASY TCG SIMULATOR - MAIN APPLICATION CONTROLLER
 * 
 * This is the main entry point for the application. It handles:
 * - Application initialization and loading
 * - View management and routing
 * - Global state management
 * - Module coordination
 * - Error handling and logging
 */

// Import core modules
import { DeckManager } from './core/DeckManager.js';
import { CardDatabase } from './core/CardDatabase.js';
import { GameEngine } from './core/GameEngine.js';

// Import utilities
import { logger } from './utils/Logger.js';
import { LocalStorage } from './utils/LocalStorage.js';
import { notifications } from './utils/Notifications.js';
import { validate, validateCard, validateDeck } from './utils/Validation.js';
import { security } from './utils/Security.js';
import { accessibilitySettings } from './utils/AccessibilitySettings.js';

// Import extended card data
import { EXTENDED_CARD_DATA, generateCardImages, getEnhancedCardDatabase, getOpus1CardDatabase } from './data/ExtendedCardDatabase.js';

// Import external API integration
import { externalCardAPI } from './data/ExternalCardAPI.js';

// Import player management
import { PlayerManager } from './core/PlayerManager.js';
import { Modal } from './components/Modal.js';
import { DeckBuilder } from './components/DeckBuilder.js';
import { GameBoard } from './components/GameBoard.js';
// import { Lobby } from './components/Lobby.js';
// import { SocketClient } from './network/SocketClient.js';

/**
 * Main Application Controller Class
 * Manages the overall application state and coordinates between modules
 */
class AppController {
    constructor() {
        // Initialize logging first
        logger.info('🚀 Initializing FFTCG Simulator...');
        logger.time('app-initialization');
        
        // Core managers
        this.deckManager = new DeckManager();
        this.cardDatabase = new CardDatabase();
        this.gameEngine = new GameEngine();
        this.security = security;
        this.accessibilitySettings = accessibilitySettings;
        
        // UI components (using global instances)
        this.notifications = notifications;
        
        // Initialize player manager
        this.playerManager = new PlayerManager();
        this.modal = new Modal();
        this.deckBuilder = null; // Will be initialized after card database loads
        this.gameBoard = null; // Will be initialized after card database loads
        // this.lobby = new Lobby();
        // this.socketClient = new SocketClient();
        
        // Application state
        this.currentView = 'home';
        this.isLoading = true;
        this.loadingProgress = 0;
        
        // Bind methods to maintain context
        this.switchView = this.switchView.bind(this);
        this.handleError = this.handleError.bind(this);
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     * Sets up event listeners, loads data, and shows the main interface
     */
    async init() {
        try {
            logger.info('🎮 Initializing Final Fantasy TCG Simulator...');
            
            // Set up error handling first
            logger.info('📋 Step 1: Setting up error handling...');
            this.setupErrorHandling();
            
            // Initialize loading screen
            logger.info('📋 Step 2: Setting up loading screen...');
            this.setupLoadingScreen();
            
            // Load extended card data
            logger.info('📋 Step 3: Loading extended card data...');
            await this.loadExtendedCardData();
            
            // Load application data
            logger.info('📋 Step 4: Loading application data...');
            await this.loadApplicationData();
            
            // Connect deck manager to card database
            logger.info('📋 Step 5: Connecting deck manager to card database...');
            this.deckManager.setCardDatabase(this.cardDatabase);
            
            // Set up event listeners
            logger.info('📋 Step 6: Setting up event listeners...');
            this.setupEventListeners();
            
            // Initialize UI components
            logger.info('📋 Step 7: Initializing UI components...');
            this.setupUIComponents();
            
            // Connect to server (if available)
            logger.info('📋 Step 8: Connecting to server...');
            await this.connectToServer();
            
            // Show main application
            logger.info('📋 Step 9: Showing main application...');
            this.showMainApplication();
            
            const initDuration = logger.timeEnd('app-initialization');
            logger.info(`✅ Application initialized successfully in ${initDuration?.toFixed(2)}ms`);
            
        } catch (error) {
            logger.error('💥 Initialization failed at step:', error);
            this.handleError('Failed to initialize application', error);
        }
    }

    /**
     * Load card data into the database using our new external API integration
     */
    async loadExtendedCardData() {
        logger.time('card-data-loading');
        logger.info('📚 Loading card database from external APIs...');
        
        try {
            // Initialize card database with external API integration
            logger.info('🔄 Starting CardDatabase initialization...');
            
            // Add timeout to prevent hanging
            const initPromise = this.cardDatabase.initialize();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('CardDatabase initialization timeout after 10 seconds')), 10000)
            );
            
            await Promise.race([initPromise, timeoutPromise]);
            logger.info('🔄 CardDatabase.initialize() completed');
            
            const totalCards = this.cardDatabase.getAllCards().length;
            const loadDuration = logger.timeEnd('card-data-loading');
            logger.info(`✅ Loaded ${totalCards} cards from database in ${loadDuration?.toFixed(2)}ms`);
            
            // Additional debugging
            logger.info(`🔍 CardDatabase.isLoaded: ${this.cardDatabase.isLoaded}`);
            logger.info(`🔍 Sample cards: ${totalCards > 0 ? this.cardDatabase.getAllCards().slice(0, 3).map(c => c.name).join(', ') : 'None'}`);
            
            // Force isLoaded to true if we have cards but flag wasn't set
            if (totalCards > 0 && !this.cardDatabase.isLoaded) {
                logger.warn('🔧 CardDatabase has cards but isLoaded=false, fixing...');
                this.cardDatabase.isLoaded = true;
            }
        
            
            // Initialize deck builder after card database is loaded
            logger.info('🔨 Initializing Deck Builder...');
            logger.info(`🔍 Pre-init state: CardDB loaded=${this.cardDatabase.isLoaded}, DeckManager=${!!this.deckManager}, CardCount=${this.cardDatabase.getAllCards().length}`);
            try {
                this.deckBuilder = new DeckBuilder(this.cardDatabase, this.deckManager);
                logger.info('✅ Deck Builder initialized successfully');
            } catch (builderError) {
                logger.error('❌ Failed to initialize Deck Builder:', builderError.message, builderError);
                logger.error('❌ Error stack:', builderError.stack);
                // Create a minimal fallback
                this.deckBuilder = null;
            }
            
            // Initialize game board after card database is loaded  
            logger.info('🎮 Initializing Game Board...');
            try {
                this.gameBoard = new GameBoard(this.gameEngine, this.cardDatabase);
                logger.info('✅ Game Board initialized successfully');
            } catch (boardError) {
                logger.error('Failed to initialize Game Board:', boardError);
                this.gameBoard = null;
            }
            
        } catch (error) {
            logger.error('Failed to load card data:', error);
            // Don't throw - the database should still be initialized with fallback data
            if (!this.cardDatabase.isLoaded) {
                throw error;
            }
        }
    }

    /**
     * Set up global error handling for uncaught errors
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            const errorInfo = {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            };
            this.handleError('Uncaught error', errorInfo);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled promise rejection', event.reason);
        });
        
        // Log system information for debugging
        logger.logSystemInfo();
    }

    /**
     * Set up the loading screen and progress tracking
     */
    setupLoadingScreen() {
        this.loadingElement = document.getElementById('loadingProgress');
        if (this.loadingElement) {
            this.updateLoadingProgress(0);
        }
    }

    /**
     * Load all necessary application data
     */
    async loadApplicationData() {
        const loadSteps = [
            { name: 'Loading user profile', action: () => this.playerManager.loadProfile() },
            // Skip card database initialization - already loaded in loadExtendedCardData()
            // { name: 'Loading card database', action: () => this.cardDatabase.initialize() },
            { name: 'Loading saved decks', action: () => this.deckManager.loadDecks() },
            { name: 'Initializing game engine', action: () => this.gameEngine.initialize() },
            { name: 'Setting up UI components', action: () => this.setupInitialUI() }
        ];

        for (let i = 0; i < loadSteps.length; i++) {
            const step = loadSteps[i];
            console.log(`📋 ${step.name}...`);
            
            try {
                await step.action();
                this.updateLoadingProgress((i + 1) / loadSteps.length * 100);
                
                // Add small delay for visual feedback
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.error(`❌ Failed: ${step.name}`, error);
                throw new Error(`${step.name} failed: ${error.message}`);
            }
        }
    }

    /**
     * Update loading progress bar
     */
    updateLoadingProgress(percentage) {
        this.loadingProgress = Math.min(100, Math.max(0, percentage));
        if (this.loadingElement) {
            this.loadingElement.style.width = `${this.loadingProgress}%`;
        }
    }

    /**
     * Set up initial UI state
     */
    setupInitialUI() {
        // Update profile display
        this.updateProfileDisplay();
        
        // Update deck count
        this.updateDeckCount();
        
        // Set up navigation
        this.setupNavigation();
    }

    /**
     * Set up event listeners for the application
     */
    setupEventListeners() {
        // Navigation events
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Player manager events
        this.playerManager.on('profileUpdated', () => {
            this.updateProfileDisplay();
        });

        // Deck manager events
        this.deckManager.on('deckSaved', () => {
            this.updateDeckCount();
            this.notifications.show('Deck saved successfully!', 'success');
        });

        this.deckManager.on('deckDeleted', () => {
            this.updateDeckCount();
            this.notifications.show('Deck deleted!', 'warning');
        });

        // TODO: Socket events (when SocketClient is implemented)
        // this.socketClient.on('connected', () => {
        //     this.notifications.show('Connected to server!', 'success');
        //     this.updateOnlineStatus(true);
        // });

        // this.socketClient.on('disconnected', () => {
        //     this.notifications.show('Disconnected from server', 'warning');
        //     this.updateOnlineStatus(false);
        // });

        // this.socketClient.on('error', (error) => {
        //     this.handleError('Network error', error);
        // });
    }

    /**
     * Set up UI components
     */
    setupUIComponents() {
        // Initialize modals
        this.modal.initialize();
        
        // TODO: Initialize deck builder when implemented
        // this.deckBuilder.initialize();
        
        // TODO: Initialize lobby when implemented
        // this.lobby.initialize();
        
        // Initialize notifications
        this.notifications.initialize();
    }

    /**
     * Attempt to connect to the game server
     */
    async connectToServer() {
        try {
            // TODO: Only attempt connection when SocketClient is implemented
            // if (window.location.hostname !== 'localhost' || localStorage.getItem('enableSocket') === 'true') {
            //     await this.socketClient.connect();
            // } else {
                logger.info('🔌 Skipping server connection - running in offline mode');
            // }
        } catch (error) {
            logger.warn('⚠️ Could not connect to server:', error.message);
            // Continue without server connection for offline play
        }
    }

    /**
     * Show the main application and hide loading screen
     */
    showMainApplication() {
        const loadingScreen = document.getElementById('loadingScreen');
        const appContainer = document.getElementById('app');
        
        // Hide loading screen
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        // Show main app
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
        
        // Set loading flag
        this.isLoading = false;
        
        // Show welcome notification
        setTimeout(() => {
            const playerName = this.playerManager.getProfile().name;
            this.notifications.show(`Welcome back, ${playerName}!`, 'success');
        }, 500);
    }

    /**
     * Switch between different views/pages
     */
    async switchView(viewName) {
        if (this.isLoading) {
            console.warn('Cannot switch views while loading');
            return;
        }

        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Update navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === viewName) {
                    btn.classList.add('active');
                }
            });
            
            // Handle view-specific initialization
            await this.handleViewActivation(viewName);
            
            console.log(`📱 Switched to view: ${viewName}`);
        } else {
            console.error(`View not found: ${viewName}`);
        }
    }

    /**
     * Handle view-specific initialization
     */
    async handleViewActivation(viewName) {
        switch (viewName) {
            case 'deck-builder':
                logger.info(`🔍 Deck builder check: deckBuilder=${!!this.deckBuilder}, cardDatabase.isLoaded=${this.cardDatabase.isLoaded}, cardCount=${this.cardDatabase.getAllCards().length}`);
                
                if (this.deckBuilder && this.cardDatabase.isLoaded) {
                    logger.info('✅ Deck builder activated successfully');
                    // The deck builder now manages its own display
                } else {
                    logger.warn(`⚠️ Deck builder not ready: deckBuilder=${!!this.deckBuilder}, cardDatabase.isLoaded=${this.cardDatabase.isLoaded}`);
                    
                    // Try to force initialize if we have cards but missing flags
                    const cardCount = this.cardDatabase.getAllCards().length;
                    if (cardCount > 0 && !this.cardDatabase.isLoaded) {
                        logger.info('🔧 Force-enabling CardDatabase...');
                        this.cardDatabase.isLoaded = true;
                    }
                    
                    if (!this.deckBuilder && this.cardDatabase.isLoaded) {
                        logger.info('🔧 Force-initializing DeckBuilder...');
                        try {
                            this.deckBuilder = new DeckBuilder(this.cardDatabase, this.deckManager);
                            logger.info('✅ Deck Builder force-initialized successfully');
                        } catch (error) {
                            logger.error('❌ Failed to force-initialize Deck Builder:', error.message, error);
                        }
                    }
                    
                    // Show loading message in deck builder view only if still not ready
                    if (!this.deckBuilder || !this.cardDatabase.isLoaded) {
                        const deckBuilderView = document.getElementById('deck-builderView');
                        if (deckBuilderView) {
                            deckBuilderView.innerHTML = `<div style="text-align: center; padding: 50px;">
                                <h3>Loading deck builder...</h3>
                                <p>Please wait while the card database loads...</p>
                                <p style="color: #666; font-size: 0.9em;">Cards loaded: ${cardCount}, Database ready: ${this.cardDatabase.isLoaded}, Builder ready: ${!!this.deckBuilder}</p>
                            </div>`;
                        }
                    }
                }
                break;
            case 'game':
                if (this.gameBoard) {
                    this.gameBoard.startGame();
                    logger.info('Game board activated');
                } else {
                    logger.warn('Game board not yet initialized');
                }
                break;
            case 'profile':
                this.showProfileView();
                break;
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + key combinations
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '1':
                    event.preventDefault();
                    this.switchView('home');
                    break;
                case '2':
                    event.preventDefault();
                    this.switchView('deck-builder');
                    break;
                case '3':
                    event.preventDefault();
                    this.switchView('game');
                    break;
                case 's':
                    event.preventDefault();
                    if (this.currentView === 'deck-builder') {
                        // TODO: Save deck when deck builder is implemented
                        // this.deckBuilder.saveDeck();
                        logger.info('Deck saving coming soon!');
                    }
                    break;
            }
        }

        // Escape key
        if (event.key === 'Escape') {
            this.modal.closeAll();
            logger.debug('ESC pressed - closing all modals');
        }
    }

    /**
     * Update profile display in the UI
     */
    updateProfileDisplay() {
        const profile = this.playerManager.getProfile();
        const stats = this.playerManager.getStats();
        
        // Update profile elements
        const nameElement = document.getElementById('profileName');
        const avatarElement = document.getElementById('profileAvatar');
        const statsElement = document.getElementById('profileStats');
        
        if (nameElement) nameElement.textContent = profile.name;
        if (avatarElement) avatarElement.textContent = profile.avatar;
        
        if (statsElement) {
            const winRate = stats.gamesPlayed > 0 ? 
                Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
            
            statsElement.textContent = 
                `Games: ${stats.gamesPlayed} | Wins: ${stats.wins} | Win Rate: ${winRate}%`;
        }
    }

    /**
     * Update deck count display
     */
    updateDeckCount() {
        const deckCount = this.deckManager.getDeckCount();
        const deckCountElement = document.getElementById('deckCount');
        
        if (deckCountElement) {
            deckCountElement.textContent = deckCount;
        }
    }

    /**
     * Update online status display
     */
    updateOnlineStatus(isOnline) {
        const onlineCountElement = document.getElementById('onlineCount');
        
        if (onlineCountElement) {
            if (isOnline) {
                // TODO: Get online count when SocketClient is implemented
                // onlineCountElement.textContent = this.socketClient.getOnlineCount() || '?';
                onlineCountElement.textContent = 'Online';
            } else {
                onlineCountElement.textContent = 'Offline';
            }
        }
    }

    /**
     * Set up navigation highlighting
     */
    setupNavigation() {
        // Set home as active by default
        const homeBtn = document.querySelector('[data-view="home"]');
        if (homeBtn) {
            homeBtn.classList.add('active');
        }
    }

    /**
     * Show profile management view
     */
    showProfileView() {
        // This would be implemented when the profile view is created
        console.log('Profile view activated');
    }

    /**
     * Handle application errors
     */
    handleError(message, error) {
        // Enhanced error logging with more context
        const errorDetails = {
            message: message,
            error: error,
            timestamp: new Date().toISOString(),
            location: window.location.href,
            userAgent: navigator.userAgent,
            currentView: this.currentView || 'unknown',
            isLoading: this.isLoading
        };
        
        logger.error(`💥 ${message}:`, errorDetails);
        
        // Show user-friendly error message
        this.notifications.error(
            message || 'An unexpected error occurred',
            {
                title: 'Application Error',
                persistent: true,
                actions: [
                    {
                        id: 'reload',
                        label: 'Reload App',
                        handler: () => window.location.reload()
                    },
                    {
                        id: 'report',
                        label: 'Report Issue',
                        handler: () => this.showErrorReport(message, error)
                    }
                ]
            }
        );
        
        // Log comprehensive error information
        const errorLog = {
            message,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            currentView: this.currentView,
            systemInfo: logger.getSystemInfo(),
            gameState: this.gameEngine?.getPublicGameState() || null
        };
        
        LocalStorage.set('lastError', errorLog);
        logger.inspect(errorLog, 'Error Details');
    }

    /**
     * Show detailed error report
     */
    showErrorReport(message, error) {
        const errorDetails = {
            message,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            systemInfo: logger.getSystemInfo()
        };

        logger.info('📋 Error report generated:', errorDetails);
        this.notifications.info('Error details logged to console. Please check the developer console for more information.');
    }

    /**
     * Clean up resources before page unload
     */
    cleanup() {
        console.log('🧹 Cleaning up application...');
        
        // Save current state
        this.playerManager.saveProfile();
        this.deckManager.saveDecks();
        
        // TODO: Disconnect from server when SocketClient is implemented
        // this.socketClient.disconnect();
        
        // Clear any intervals or timeouts
        // (Would be implemented as needed)
    }

    /**
     * Get current application state for debugging
     */
    getState() {
        return {
            currentView: this.currentView,
            isLoading: this.isLoading,
            loadingProgress: this.loadingProgress,
            playerProfile: this.playerManager.getProfile(),
            deckCount: this.deckManager.getDeckCount(),
            isConnected: false // TODO: this.socketClient.isConnected() when implemented
        };
    }
}

// Global functions for backward compatibility and easy access
window.AppController = AppController;

// Global helper functions (updated to use new notification system)
window.openModal = function(modalType, options = {}) {
    if (window.app && window.app.modal) {
        return window.app.modal.open(modalType, options);
    } else {
        logger.warn('Modal system not available');
        notifications.warning('Modal system not available');
    }
};

window.closeModal = function(modalId) {
    if (window.app && window.app.modal) {
        return window.app.modal.close(modalId);
    } else {
        logger.warn('Modal system not available');
    }
};

window.showNotification = function(message, type = 'info') {
    notifications.show(message, type);
};

window.startPracticeGame = function() {
    if (window.app) {
        window.app.switchView('game');
    } else {
        notifications.info('Application not yet loaded');
    }
};

// Deck management global functions
window.createNewDeck = function() {
    if (window.app && window.app.deckBuilder) {
        window.app.deckBuilder.createNewDeck('New Deck');
        window.app.updateDeckCount();
    } else {
        notifications.warning('Deck Builder not yet initialized. Please wait for loading to complete.');
    }
};

window.loadDeck = function() {
    if (window.app && window.app.modal) {
        window.app.modal.openDeckSelect();
    } else {
        notifications.info('Deck loading interface coming soon!');
    }
};

window.saveDeck = function() {
    if (window.app && window.app.deckBuilder) {
        window.app.deckBuilder.saveDeck();
    } else {
        notifications.warning('Deck Builder not yet initialized. Please wait for loading to complete.');
    }
};

// Enhanced debugging functions
window.debug = {
    app: null, // Will be set when app is created
    logger: logger,
    notifications: notifications,
    LocalStorage: LocalStorage,
    validate: validate,
    validateCard: validateCard,
    validateDeck: validateDeck,
    security: security,
    accessibility: accessibilitySettings,
    
    // Utility functions
    testCard: (cardId) => {
        const card = window.debug.app?.cardDatabase?.getCard(cardId);
        if (card) {
            logger.info('Card found:', card);
            return card;
        } else {
            logger.warn(`Card not found: ${cardId}`);
            return null;
        }
    },
    
    testDeck: () => {
        const deck = window.debug.app?.deckManager?.createNewDeck('Debug Test Deck');
        logger.info('Created test deck:', deck);
        return deck;
    },
    
    showStats: () => {
        const stats = {
            cardDatabase: window.debug.app?.cardDatabase?.getStats(),
            deckManager: window.debug.app?.deckManager?.getManagerStats(),
            localStorage: LocalStorage.getUsage(),
            logger: logger.getStats()
        };
        logger.info('Application Statistics:', stats);
        return stats;
    },
    
    clearData: () => {
        if (confirm('Clear all application data? This cannot be undone.')) {
            LocalStorage.clear();
            logger.info('Application data cleared');
            notifications.success('Application data cleared');
        }
    },
    
    exportData: () => {
        const backup = LocalStorage.backup();
        const blob = new Blob([backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fftcg-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logger.info('Data exported');
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.info('🚀 Starting Final Fantasy TCG Simulator...');
    
    // Create global app instance
    window.app = new AppController();
    
    // Connect debug object to app
    window.debug.app = window.app;
    
    // Development helpers
    if (window.location.hostname === 'localhost') {
        logger.info('🔧 Development mode active. Available debugging tools:');
        logger.info('  • window.debug - Debugging utilities');
        logger.info('  • window.log - Logger instance');
        logger.info('  • window.notifications - Notifications system');
        logger.info('  • window.app - Main application controller');
        
        // Show debug UI
        logger.showUI();
        
        // Test notification
        setTimeout(() => {
            notifications.info('Development mode active! Check console for debugging tools.', {
                title: 'Debug Mode',
                actions: [
                    {
                        id: 'test-suite',
                        label: 'Run Tests',
                        handler: () => window.open('/test.html', '_blank')
                    }
                ]
            });
        }, 2000);
    }
});

// Export for module use
export { AppController };