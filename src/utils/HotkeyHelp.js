/**
 * Global Hotkey Help System
 * Displays contextual keyboard shortcuts for the current page/mode
 * Activated via Shift+? from anywhere in the application
 */

class HotkeyHelp {
    constructor() {
        this.keybinds = new Map();
        this.modal = null;
        this.isVisible = false;
        this.currentContext = 'general';
        
        this.init();
    }
    
    init() {
        // Create the help modal
        this.createModal();
        
        // Register global hotkey listener
        this.setupGlobalListener();
        
        // Register default keybinds
        this.registerDefaultKeybinds();
        
        // Start automatic context detection
        this.startAutoContextDetection();
        
        console.log('🎹 Hotkey Help System initialized');
    }
    
    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'hotkey-help-modal';
        this.modal.innerHTML = `
            <div class="hotkey-help-overlay"></div>
            <div class="hotkey-help-content">
                <div class="hotkey-help-header">
                    <h2 class="hotkey-help-title">⌨️ Keyboard Shortcuts</h2>
                    <div class="hotkey-help-context">
                        Context: <span id="hotkeyContext">General</span>
                    </div>
                    <button class="hotkey-help-close" id="closeHotkeyHelp" title="Close (Esc)">×</button>
                </div>
                <div class="hotkey-help-body" id="hotkeyHelpBody">
                    <!-- Keybinds will be populated here -->
                </div>
                <div class="hotkey-help-footer">
                    <div class="hotkey-help-tip">💡 Press <kbd>Shift</kbd> + <kbd>?</kbd> anytime to show this help</div>
                </div>
            </div>
        `;
        
        // Add to body but keep hidden
        document.body.appendChild(this.modal);
        
        // Setup close handlers
        this.modal.querySelector('.hotkey-help-close').addEventListener('click', () => this.hide());
        this.modal.querySelector('.hotkey-help-overlay').addEventListener('click', () => this.hide());
    }
    
    setupGlobalListener() {
        document.addEventListener('keydown', (event) => {
            // Shift + ? (Shift + / on most keyboards)
            if (event.shiftKey && event.key === '?') {
                event.preventDefault();
                this.toggle();
            }
            
            // Escape to close if modal is open
            if (event.key === 'Escape' && this.isVisible) {
                event.preventDefault();
                this.hide();
            }
        });
    }
    
    registerDefaultKeybinds() {
        // General keybinds (always available)
        this.registerKeybind('general', 'Shift + ?', 'Show keyboard shortcuts', '🎹');
        this.registerKeybind('general', 'Escape', 'Close modals/dialogs', '❌');
        this.registerKeybind('general', 'F11', 'Toggle fullscreen', '🖥️');
        
        // Game board keybinds
        this.registerKeybind('game', 'Space', 'Switch phase', '⏭️');
        this.registerKeybind('game', 'E', 'End turn', '🔄');
        this.registerKeybind('game', 'C', 'Clear event log', '🗑️');
        this.registerKeybind('game', 'M', 'Toggle minimize event log', '➖');
        this.registerKeybind('game', 'L', 'Open event log viewer', '📋');
        this.registerKeybind('game', 'H', 'Toggle hand visibility', '👁️');
        this.registerKeybind('game', 'D', 'Draw cards (debug)', '🎴');
        this.registerKeybind('game', '1-7', 'Quick select CP type', '💎');
        this.registerKeybind('game', 'Tab', 'Cycle through zones', '🔄');
        
        // Deck builder keybinds  
        this.registerKeybind('deckbuilder', 'Ctrl + S', 'Save deck', '💾');
        this.registerKeybind('deckbuilder', 'Ctrl + O', 'Load deck', '📂');
        this.registerKeybind('deckbuilder', 'Ctrl + N', 'New deck', '📄');
        this.registerKeybind('deckbuilder', 'F', 'Focus search', '🔍');
        this.registerKeybind('deckbuilder', 'R', 'Reset filters', '🔄');
        this.registerKeybind('deckbuilder', 'Delete', 'Remove selected card', '🗑️');
        
        // Modal/Dialog keybinds
        this.registerKeybind('modal', 'Enter', 'Confirm action', '✅');
        this.registerKeybind('modal', 'Escape', 'Cancel/Close', '❌');
        this.registerKeybind('modal', 'Tab', 'Navigate options', '🔄');
    }
    
    registerKeybind(context, key, description, icon = '⌨️') {
        if (!this.keybinds.has(context)) {
            this.keybinds.set(context, []);
        }
        
        this.keybinds.get(context).push({
            key,
            description,
            icon
        });
    }
    
    setContext(context) {
        this.currentContext = context;
        if (this.isVisible) {
            this.refreshContent();
        }
    }
    
    show() {
        // Update context right before showing to ensure accuracy
        this.updateContext();
        
        this.isVisible = true;
        this.modal.classList.add('visible');
        this.refreshContent();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Debug logging
        console.log(`🎹 Showing hotkey help for context: ${this.currentContext}`);
        console.log('🔍 Context detection details:', {
            detectedContext: this.detectContext(),
            currentContext: this.currentContext,
            deckBuilderVisible: this.isElementVisible('.deck-builder-container'),
            gameContainerVisible: this.isElementVisible('.game-container'),
            gameSpecificElementsVisible: this.countVisibleElements('.switch-phase-btn, .end-turn-btn, .player-hand, .opponent-hand'),
            deckBuilderElementsVisible: this.countVisibleElements('.card-grid, .deck-list, .deck-stats')
        });
    }
    
    // Helper method to check if an element is visible
    isElementVisible(selector) {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }
    
    // Helper method to count visible elements matching selectors
    countVisibleElements(selector) {
        const elements = document.querySelectorAll(selector);
        let visibleCount = 0;
        
        for (const element of elements) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                visibleCount++;
            }
        }
        
        return visibleCount;
    }
    
    hide() {
        this.isVisible = false;
        this.modal.classList.remove('visible');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        console.log('🎹 Hotkey help hidden');
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    refreshContent() {
        const bodyElement = document.getElementById('hotkeyHelpBody');
        const contextElement = document.getElementById('hotkeyContext');
        
        // Update context display
        contextElement.textContent = this.getContextDisplayName();
        
        // Get relevant keybinds
        const relevantKeybinds = this.getRelevantKeybinds();
        
        // Generate HTML
        let html = '';
        
        for (const [contextName, binds] of relevantKeybinds) {
            if (binds.length === 0) continue;
            
            html += `<div class="hotkey-section">`;
            if (relevantKeybinds.size > 1) {
                html += `<h3 class="hotkey-section-title">${this.getContextDisplayName(contextName)}</h3>`;
            }
            html += `<div class="hotkey-list">`;
            
            for (const bind of binds) {
                html += `
                    <div class="hotkey-item">
                        <div class="hotkey-keys">
                            ${this.formatKeys(bind.key)}
                        </div>
                        <div class="hotkey-description">
                            <span class="hotkey-icon">${bind.icon}</span>
                            ${bind.description}
                        </div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
        }
        
        if (!html) {
            html = `
                <div class="hotkey-empty">
                    <div class="hotkey-empty-icon">🤷‍♂️</div>
                    <div>No keyboard shortcuts available for this context</div>
                </div>
            `;
        }
        
        bodyElement.innerHTML = html;
    }
    
    getRelevantKeybinds() {
        const relevant = new Map();
        
        // Always include general keybinds
        if (this.keybinds.has('general')) {
            relevant.set('general', this.keybinds.get('general'));
        }
        
        // Include current context keybinds
        if (this.currentContext !== 'general' && this.keybinds.has(this.currentContext)) {
            relevant.set(this.currentContext, this.keybinds.get(this.currentContext));
        }
        
        // Include modal keybinds if any modal is open
        if (document.querySelector('.modal.show, .card-detail-modal[style*="block"], .zone-overview-modal[style*="block"]')) {
            if (this.keybinds.has('modal')) {
                relevant.set('modal', this.keybinds.get('modal'));
            }
        }
        
        return relevant;
    }
    
    getContextDisplayName(context = this.currentContext) {
        const names = {
            'general': 'General',
            'game': 'Game Board',
            'deckbuilder': 'Deck Builder',
            'modal': 'Dialog/Modal'
        };
        return names[context] || context.charAt(0).toUpperCase() + context.slice(1);
    }
    
    formatKeys(keyString) {
        // Split on + and wrap each key in <kbd>
        return keyString
            .split(' + ')
            .map(key => `<kbd>${key.trim()}</kbd>`)
            .join(' + ');
    }
    
    // Auto-detect context based on page state
    detectContext() {
        // Primary method: Check for active view using the app's view system
        const activeView = document.querySelector('.view.active');
        if (activeView) {
            const viewId = activeView.id;
            console.log('🔍 Active view detected:', viewId);
            
            if (viewId === 'deck-builderView') {
                return 'deckbuilder';
            }
            if (viewId === 'gameView') {
                return 'game';
            }
            // Add other view mappings as needed
            if (viewId === 'homeView') {
                return 'general';
            }
        }
        
        // Secondary check: Look for specific containers that are visible
        // Check if game container is visible (game view is active)
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            const computedStyle = window.getComputedStyle(gameContainer);
            if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
                console.log('🎮 Game container is visible');
                return 'game';
            }
        }
        
        // Check if deck builder container is visible
        const deckBuilderContainer = document.querySelector('.deck-builder-container');
        if (deckBuilderContainer) {
            const computedStyle = window.getComputedStyle(deckBuilderContainer);
            if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
                console.log('📚 Deck builder container is visible');
                return 'deckbuilder';
            }
        }
        
        // Tertiary check: Look for specific UI elements that indicate context
        // Check for game-specific UI elements that indicate active gameplay
        const gameSpecificElements = document.querySelectorAll(
            '.dynamic-action-btn, .game-board, .player-hand-content, .cp-display-area, .event-log-area'
        );
        let visibleGameElements = 0;
        for (const element of gameSpecificElements) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                visibleGameElements++;
            }
        }
        
        if (visibleGameElements >= 2) {
            console.log('🎯 Game elements detected:', visibleGameElements);
            return 'game';
        }
        
        // Check for deck builder specific elements
        const deckBuilderElements = document.querySelectorAll(
            '.deck-manager, .deck-editor, .search-filter-sidebar, .filter-controls, .card-database'
        );
        let visibleDeckElements = 0;
        for (const element of deckBuilderElements) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                visibleDeckElements++;
            }
        }
        
        if (visibleDeckElements >= 1) {
            console.log('📖 Deck builder elements detected:', visibleDeckElements);
            return 'deckbuilder';
        }
        
        // URL-based fallback
        const hash = window.location.hash;
        const pathname = window.location.pathname;
        if (hash.includes('deck-builder') || pathname.includes('deck-builder')) {
            console.log('🔗 URL indicates deck builder');
            return 'deckbuilder';
        }
        if (hash.includes('game') || pathname.includes('game')) {
            console.log('🔗 URL indicates game');
            return 'game';
        }
        
        console.log('🤷 No specific context detected, defaulting to general');
        return 'general';
    }
    
    // Method to be called when context changes
    updateContext() {
        const newContext = this.detectContext();
        if (newContext !== this.currentContext) {
            this.setContext(newContext);
        }
    }
    
    // Start automatic context detection
    startAutoContextDetection() {
        // Check context every 2 seconds
        setInterval(() => {
            this.updateContext();
        }, 2000);
        
        // Also check on DOM mutations (when new content loads)
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(() => {
                // Debounce context checks on DOM changes
                clearTimeout(this.contextCheckTimeout);
                this.contextCheckTimeout = setTimeout(() => {
                    this.updateContext();
                }, 500);
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id']
            });
        }
    }
}

// Create global instance
window.hotkeyHelp = new HotkeyHelp();

export default HotkeyHelp;