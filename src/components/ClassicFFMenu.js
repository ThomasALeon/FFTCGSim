/**
 * CLASSIC FINAL FANTASY MENU CONTROLLER
 * Handles keyboard navigation, pointer animation, and menu actions
 */

export class ClassicFFMenu {
    constructor() {
        this.menuItems = [];
        this.currentIndex = 0;
        this.cursor = null;
        this.isActive = false;
        
        // Sound effect URLs (if implemented later)
        this.sounds = {
            hover: '/assets/sounds/menu-hover.ogg',
            confirm: '/assets/sounds/menu-confirm.ogg'
        };
        
        this.initialize();
    }
    
    initialize() {
        console.log('🎮 Initializing Classic FF Menu...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupMenu());
        } else {
            this.setupMenu();
        }
    }
    
    setupMenu() {
        this.menuItems = Array.from(document.querySelectorAll('.ff-menu-item'));
        
        if (this.menuItems.length === 0) {
            console.error('❌ Classic FF Menu elements not found');
            return;
        }
        
        console.log(`✅ Found ${this.menuItems.length} menu items`);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize first item as selected
        this.selectItem(0);
        
        console.log('🎮 Classic FF Menu initialized');
    }
    
    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Mouse hover events
        this.menuItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                if (this.isActive) {
                    this.selectItem(index);
                    this.playHoverSound();
                }
            });
            
            item.addEventListener('click', () => {
                this.selectItem(index);
                this.activateMenuItem();
            });
        });
        
        // Focus management
        document.addEventListener('focus', () => {
            this.isActive = true;
        });
        
        // Track when home view becomes active
        const homeView = document.getElementById('homeView');
        if (homeView) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        this.isActive = homeView.classList.contains('active');
                        if (this.isActive) {
                            this.selectItem(this.currentIndex);
                        }
                    }
                });
            });
            
            observer.observe(homeView, { attributes: true });
            this.isActive = homeView.classList.contains('active');
        }
    }
    
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                event.preventDefault();
                this.navigateUp();
                this.playHoverSound();
                break;
                
            case 'ArrowDown':
            case 's':
            case 'S':
                event.preventDefault();
                this.navigateDown();
                this.playHoverSound();
                break;
                
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.activateMenuItem();
                this.playConfirmSound();
                break;
                
            case 'Escape':
                event.preventDefault();
                // Could add escape functionality here
                break;
        }
    }
    
    navigateUp() {
        const newIndex = this.currentIndex > 0 ? 
            this.currentIndex - 1 : 
            this.menuItems.length - 1;
        this.selectItem(newIndex);
    }
    
    navigateDown() {
        const newIndex = this.currentIndex < this.menuItems.length - 1 ? 
            this.currentIndex + 1 : 
            0;
        this.selectItem(newIndex);
    }
    
    selectItem(index) {
        if (index < 0 || index >= this.menuItems.length) return;
        
        // Remove previous selection
        this.menuItems.forEach(item => item.classList.remove('selected'));
        
        // Add selection to new item
        this.menuItems[index].classList.add('selected');
        this.currentIndex = index;
        
        // Move cursor
        this.updateCursor();
        
        // Focus the item for accessibility
        this.menuItems[index].focus();
    }
    
    updateCursor() {
        // Classic FF menu doesn't need external cursor positioning
        // The pointer is handled by CSS visibility on each menu item
        console.log(`📍 Selected item ${this.currentIndex}`);
    }
    
    activateMenuItem() {
        const selectedItem = this.menuItems[this.currentIndex];
        if (!selectedItem) return;
        
        const action = selectedItem.dataset.action;
        console.log(`🎯 Activating menu item: ${action}`);
        
        // Add activation animation
        selectedItem.style.transform = 'translateX(12px) scale(1.02)';
        setTimeout(() => {
            selectedItem.style.transform = '';
        }, 200);
        
        // Handle menu actions
        switch (action) {
            case 'multiplayer':
                this.openModal('lobbyModal');
                break;
                
            case 'deck-builder':
                this.switchView('deck-builder');
                break;
                
            case 'practice':
                this.switchView('practice-lobby');
                break;
                
            case 'tournament':
                this.openModal('tournamentModal');
                break;
                
            case 'rules':
                this.openModal('rulesModal');
                break;
                
            case 'profile':
                this.openModal('profileModal');
                break;
                
            case 'settings':
                this.openModal('settingsModal');
                break;
                
            default:
                console.warn(`⚠️  Unknown menu action: ${action}`);
        }
    }
    
    switchView(viewName) {
        if (window.app && window.app.switchView) {
            window.app.switchView(viewName);
        } else {
            console.error('❌ App controller not available');
        }
    }
    
    openModal(modalName) {
        if (window.openModal) {
            window.openModal(modalName);
        } else {
            console.error('❌ Modal system not available');
        }
    }
    
    // Sound effect methods (placeholders for future implementation)
    playHoverSound() {
        // TODO: Implement FF-style menu hover sound
        console.log('🔊 Hover sound');
    }
    
    playConfirmSound() {
        // TODO: Implement FF-style menu confirm sound
        console.log('🔊 Confirm sound');
    }
    
    // Method to update dynamic content (called externally)
    updateStats(stats) {
        const onlineCount = document.querySelector('#onlineCount');
        const deckCount = document.querySelector('#deckCount');
        const profileName = document.querySelector('#profileName');
        
        if (onlineCount && stats.onlineCount !== undefined) {
            onlineCount.textContent = `${stats.onlineCount} players online`;
        }
        
        if (deckCount && stats.deckCount !== undefined) {
            deckCount.textContent = `${stats.deckCount} decks saved`;
        }
        
        if (profileName && stats.profileName) {
            profileName.textContent = stats.profileName;
        }
    }
    
    // Method to enable/disable menu
    setActive(active) {
        this.isActive = active;
        if (active) {
            this.selectItem(this.currentIndex);
        }
    }
}

// Auto-initialize when loaded
const classicFFMenu = new ClassicFFMenu();

// Export for external access
export default classicFFMenu;