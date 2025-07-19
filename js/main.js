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
import { PlayerManager } from './core/PlayerManager.js';
import { DeckManager } from './core/DeckManager.js';
import { CardDatabase } from './core/CardDatabase.js';
import { GameEngine } from './core/GameEngine.js';
import { LocalStorage } from './utils/LocalStorage.js';
import { Notifications } from './utils/Notifications.js';
import { Modal } from './components/Modal.js';
import { DeckBuilder } from './components/DeckBuilder.js';
import { Lobby } from './components/Lobby.js';
import { SocketClient } from './network/SocketClient.js';

/**
 * Main Application Controller Class
 * Manages the overall application state and coordinates between modules
 */
class AppController {
    constructor() {
        // Core managers
        this.playerManager = new PlayerManager();
        this.deckManager = new DeckManager();
        this.cardDatabase = new CardDatabase();
        this.gameEngine = new GameEngine();
        
        // UI components
        this.modal = new Modal();
        this.deckBuilder = new DeckBuilder(this.cardDatabase, this.deckManager);
        this.lobby = new Lobby();
        this.notifications = new Notifications();
        
        // Network
        this.socketClient = new SocketClient();
        
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
            console.log('🎮 Initializing Final Fantasy TCG Simulator...');
            
            // Set up error handling
            this.setupErrorHandling();
            
            // Initialize loading screen
            this.setupLoadingScreen();
            
            // Load application data
            await this.loadApplicationData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.setupUIComponents();
            
            // Connect to server (if available)
            await this.connectToServer();
            
            // Show main application
            this.showMainApplication();
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            this.handleError('Failed to initialize application', error);
        }
    }

    /**
     * Set up global error handling for uncaught errors
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError('Uncaught error', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled promise rejection', event.reason);
        });
    }

    /**
     * Set up the loading screen and progress tracking
     */
    setupLoadingScreen() {
        this.loadingElement = document.getElementById('loadingProgress');
        this.updateLoadingProgress(0);
    }

    /**
     * Load all necessary application data
     */
    async loadApplicationData() {
        const loadSteps = [
            { name: 'Loading user profile', action: () => this.playerManager.loadProfile() },
            { name: 'Loading card database', action: () => this.cardDatabase.initialize() },
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

        // Socket events
        this.socketClient.on('connected', () => {
            this.notifications.show('Connected to server!', 'success');
            this.updateOnlineStatus(true);
        });

        this.socketClient.on('disconnected', () => {
            this.notifications.show('Disconnected from server', 'warning');
            this.updateOnlineStatus(false);
        });

        this.socketClient.on('error', (error) => {
            this.handleError('Network error', error);
        });
    }

    /**
     * Set up UI components
     */
    setupUIComponents() {
        // Initialize modals
        this.modal.initialize();
        
        // Initialize deck builder
        this.deckBuilder.initialize();
        
        // Initialize lobby
        this.lobby.initialize();
        
        // Initialize notifications
        this.notifications.initialize();
    }

    /**
     * Attempt to connect to the game server
     */
    async connectToServer() {
        try {
            // Only attempt connection in production or if explicitly enabled
            if (window.location.hostname !== 'localhost' || localStorage.getItem('enableSocket') === 'true') {
                await this.socketClient.connect();
            } else {
                console.log('🔌 Skipping server connection in development mode');
            }
        } catch (error) {
            console.warn('⚠️ Could not connect to server:', error.message);
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
        loadingScreen.classList.add('hidden');
        
        // Show main app
        appContainer.classList.remove('hidden');
        
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
    switchView(viewName) {
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
            this.handleViewActivation(viewName);
            
            console.log(`📱 Switched to view: ${viewName}`);
        } else {
            console.error(`View not found: ${viewName}`);
        }
    }

    /**
     * Handle view-specific initialization
     */
    handleViewActivation(viewName) {
        switch (viewName) {
            case 'deck-builder':
                this.deckBuilder.activate();
                break;
            case 'game':
                this.gameEngine.activate();
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
                        this.deckBuilder.saveDeck();
                    }
                    break;
            }
        }

        // Escape key
        if (event.key === 'Escape') {
            this.modal.closeAll();
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
                onlineCountElement.textContent = this.socketClient.getOnlineCount() || '?';
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
        console.error(`💥 ${message}:`, error);
        
        // Show user-friendly error message
        this.notifications.show(
            message || 'An unexpected error occurred',
            'error'
        );
        
        // Log error for debugging (in production, this would go to a logging service)
        const errorLog = {
            message,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            currentView: this.currentView
        };
        
        localStorage.setItem('lastError', JSON.stringify(errorLog));
    }

    /**
     * Clean up resources before page unload
     */
    cleanup() {
        console.log('🧹 Cleaning up application...');
        
        // Save current state
        this.playerManager.saveProfile();
        this.deckManager.saveDecks();
        
        // Disconnect from server
        this.socketClient.disconnect();
        
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
            isConnected: this.socketClient.isConnected()
        };
    }
}

// Global functions for backward compatibility and easy access
window.AppController = AppController;

// Global helper functions
window.openModal = function(modalId) {
    app.modal.open(modalId);
};

window.closeModal = function(modalId) {
    app.modal.close(modalId);
};

window.showNotification = function(message, type = 'info') {
    app.notifications.show(message, type);
};

window.startPracticeGame = function() {
    showNotification('Practice mode coming soon!', 'info');
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Final Fantasy TCG Simulator...');
    
    // Create global app instance
    window.app = new AppController();
    
    // Development helpers
    if (window.location.hostname === 'localhost') {
        window.debug = {
            app: window.app,
            state: () => window.app.getState(),
            logs: () => console.table(window.app.getState())
        };
        
        console.log('🔧 Development mode active. Use `debug` object for debugging.');
    }
});

// Export for module use
export { AppController };