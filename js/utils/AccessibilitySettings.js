/**
 * ACCESSIBILITY SETTINGS - Comprehensive accessibility configuration system
 * 
 * Manages accessibility preferences including:
 * - Color blind support modes
 * - Keyboard-only navigation
 * - Screen reader announcements
 * - Card description settings
 * - Visual enhancements
 */

import { LocalStorage } from './LocalStorage.js';
import { logger } from './Logger.js';

export class AccessibilitySettings {
    constructor() {
        this.STORAGE_KEY = 'fftcg_accessibility_settings';
        
        // Default accessibility settings
        this.defaultSettings = {
            // Color blind support
            colorBlindMode: 'none', // none, protanopia, deuteranopia, tritanopia
            highContrast: false,
            colorCodingAlternatives: true, // Use patterns/symbols instead of just colors
            
            // Navigation and interaction
            keyboardOnly: false,
            showFocusIndicators: true,
            skipAnimations: false,
            largerClickTargets: false,
            
            // Audio and announcements
            announceActions: true,
            cardDescriptions: true,
            autoReadCards: false,
            soundFeedback: false,
            
            // Visual enhancements
            fontSize: 'normal', // small, normal, large, extra-large
            fontFamily: 'default', // default, dyslexic-friendly, high-readability
            lineHeight: 'normal', // compact, normal, spacious
            
            // Content preferences
            simplifiedUI: false,
            showTooltips: true,
            extendedTimeouts: false,
            
            // Advanced options
            debugMode: false,
            logAccessibility: false
        };
        
        // Current settings
        this.settings = { ...this.defaultSettings };
        
        // Color blind color mappings
        this.colorBlindMappings = {
            protanopia: {
                '#ff4444': '#b4722d', // Red -> Brown
                '#44ff44': '#4db8ff', // Green -> Blue
                '#ffaa44': '#7d7d7d', // Orange -> Gray
                'fire': '#b4722d',
                'wind': '#4db8ff',
                'earth': '#7d7d7d'
            },
            deuteranopia: {
                '#ff4444': '#d4a32d', // Red -> Yellow-brown
                '#44ff44': '#4da8ff', // Green -> Blue
                '#ffaa44': '#9d9d9d', // Orange -> Gray
                'fire': '#d4a32d',
                'wind': '#4da8ff',
                'earth': '#9d9d9d'
            },
            tritanopia: {
                '#44ddff': '#ff6b6b', // Light blue -> Pink
                '#4488ff': '#ff4d4d', // Blue -> Red
                '#ffaa44': '#ff8844', // Orange -> Red-orange
                'ice': '#ff6b6b',
                'water': '#ff4d4d',
                'lightning': '#ff8844'
            }
        };
        
        this.initialize();
    }

    /**
     * Initialize accessibility settings
     */
    initialize() {
        this.loadSettings();
        this.applySettings();
        this.setupEventListeners();
        
        logger.info('♿ Accessibility settings initialized');
    }

    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const savedSettings = LocalStorage.get(this.STORAGE_KEY);
            if (savedSettings) {
                this.settings = { ...this.defaultSettings, ...savedSettings };
                logger.debug('♿ Loaded accessibility settings:', this.settings);
            }
        } catch (error) {
            logger.error('♿ Error loading accessibility settings:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            LocalStorage.set(this.STORAGE_KEY, this.settings);
            logger.debug('♿ Saved accessibility settings');
        } catch (error) {
            logger.error('♿ Error saving accessibility settings:', error);
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get a specific setting
     */
    getSetting(key) {
        return this.settings[key];
    }

    /**
     * Update a setting
     */
    setSetting(key, value) {
        if (this.settings.hasOwnProperty(key)) {
            const oldValue = this.settings[key];
            this.settings[key] = value;
            
            this.saveSettings();
            this.applySettingChange(key, value, oldValue);
            
            this.announceSettingChange(key, value);
            
            logger.debug(`♿ Setting updated: ${key} = ${value}`);
        } else {
            logger.warn(`♿ Unknown setting key: ${key}`);
        }
    }

    /**
     * Update multiple settings at once
     */
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        
        Object.keys(newSettings).forEach(key => {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = newSettings[key];
            }
        });
        
        this.saveSettings();
        this.applySettings();
        
        // Announce major changes
        if (newSettings.colorBlindMode !== oldSettings.colorBlindMode) {
            this.announceSettingChange('colorBlindMode', newSettings.colorBlindMode);
        }
        
        logger.info('♿ Multiple settings updated');
    }

    /**
     * Reset settings to defaults
     */
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.applySettings();
        
        this.announceMessage('Accessibility settings reset to defaults');
        logger.info('♿ Settings reset to defaults');
    }

    /**
     * Apply all current settings to the UI
     */
    applySettings() {
        this.applyColorBlindMode();
        this.applyVisualEnhancements();
        this.applyNavigationSettings();
        this.applyContentPreferences();
    }

    /**
     * Apply a specific setting change
     */
    applySettingChange(key, value, oldValue) {
        switch (key) {
            case 'colorBlindMode':
                this.applyColorBlindMode();
                break;
            case 'highContrast':
                this.applyHighContrast();
                break;
            case 'fontSize':
            case 'fontFamily':
            case 'lineHeight':
                this.applyFontSettings();
                break;
            case 'showFocusIndicators':
                this.applyFocusIndicators();
                break;
            case 'skipAnimations':
                this.applyAnimationSettings();
                break;
            case 'simplifiedUI':
                this.applyUIComplexity();
                break;
        }
    }

    /**
     * Apply color blind support
     */
    applyColorBlindMode() {
        const mode = this.settings.colorBlindMode;
        const body = document.body;
        
        // Remove existing color blind classes
        body.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
        
        if (mode !== 'none') {
            body.classList.add(`colorblind-${mode}`);
            this.injectColorBlindCSS(mode);
        } else {
            this.removeColorBlindCSS();
        }
    }

    /**
     * Inject CSS for color blind support
     */
    injectColorBlindCSS(mode) {
        const existingStyle = document.getElementById('colorblind-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'colorblind-styles';
        
        const mappings = this.colorBlindMappings[mode];
        if (!mappings) return;

        let css = `/* Color blind support for ${mode} */\n`;
        
        // Element-specific color adjustments
        css += `
            .colorblind-${mode} .element-fire { 
                background-color: ${mappings.fire || mappings['#ff4444']} !important;
                border-color: ${mappings.fire || mappings['#ff4444']} !important;
            }
            .colorblind-${mode} .element-wind { 
                background-color: ${mappings.wind || mappings['#44ff44']} !important;
                border-color: ${mappings.wind || mappings['#44ff44']} !important;
            }
            .colorblind-${mode} .element-earth { 
                background-color: ${mappings.earth || mappings['#ffaa44']} !important;
                border-color: ${mappings.earth || mappings['#ffaa44']} !important;
            }
        `;
        
        // Add patterns for better differentiation
        if (this.settings.colorCodingAlternatives) {
            css += `
                .colorblind-${mode} .element-fire::before { 
                    content: "🔥"; 
                    position: absolute; 
                    top: 2px; 
                    right: 2px; 
                    font-size: 12px; 
                }
                .colorblind-${mode} .element-wind::before { 
                    content: "💨"; 
                    position: absolute; 
                    top: 2px; 
                    right: 2px; 
                    font-size: 12px; 
                }
                .colorblind-${mode} .element-earth::before { 
                    content: "🏔️"; 
                    position: absolute; 
                    top: 2px; 
                    right: 2px; 
                    font-size: 12px; 
                }
            `;
        }
        
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Remove color blind CSS
     */
    removeColorBlindCSS() {
        const existingStyle = document.getElementById('colorblind-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    /**
     * Apply high contrast mode
     */
    applyHighContrast() {
        if (this.settings.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }

    /**
     * Apply font and visual enhancements
     */
    applyVisualEnhancements() {
        this.applyFontSettings();
        this.applyHighContrast();
    }

    /**
     * Apply font settings
     */
    applyFontSettings() {
        const root = document.documentElement;
        
        // Font size
        const fontSizeMap = {
            'small': '0.875rem',
            'normal': '1rem',
            'large': '1.25rem',
            'extra-large': '1.5rem'
        };
        root.style.setProperty('--base-font-size', fontSizeMap[this.settings.fontSize] || '1rem');
        
        // Font family
        const fontFamilyMap = {
            'default': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'dyslexic-friendly': '"OpenDyslexic", "Comic Sans MS", sans-serif',
            'high-readability': '"Verdana", "Tahoma", sans-serif'
        };
        root.style.setProperty('--base-font-family', fontFamilyMap[this.settings.fontFamily] || fontFamilyMap.default);
        
        // Line height
        const lineHeightMap = {
            'compact': '1.2',
            'normal': '1.5',
            'spacious': '1.8'
        };
        root.style.setProperty('--base-line-height', lineHeightMap[this.settings.lineHeight] || '1.5');
    }

    /**
     * Apply navigation settings
     */
    applyNavigationSettings() {
        this.applyFocusIndicators();
        this.applyAnimationSettings();
        
        if (this.settings.largerClickTargets) {
            document.body.classList.add('larger-click-targets');
        } else {
            document.body.classList.remove('larger-click-targets');
        }
    }

    /**
     * Apply focus indicators
     */
    applyFocusIndicators() {
        if (this.settings.showFocusIndicators) {
            document.body.classList.remove('hide-focus-indicators');
        } else {
            document.body.classList.add('hide-focus-indicators');
        }
    }

    /**
     * Apply animation settings
     */
    applyAnimationSettings() {
        if (this.settings.skipAnimations) {
            document.body.classList.add('skip-animations');
        } else {
            document.body.classList.remove('skip-animations');
        }
    }

    /**
     * Apply content preferences
     */
    applyContentPreferences() {
        this.applyUIComplexity();
        
        if (this.settings.extendedTimeouts) {
            // Extend notification timeouts
            if (window.app && window.app.notifications) {
                window.app.notifications.config.defaultDuration *= 2;
            }
        }
    }

    /**
     * Apply UI complexity settings
     */
    applyUIComplexity() {
        if (this.settings.simplifiedUI) {
            document.body.classList.add('simplified-ui');
        } else {
            document.body.classList.remove('simplified-ui');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for system color scheme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            mediaQuery.addEventListener('change', () => {
                if (mediaQuery.matches && !this.settings.skipAnimations) {
                    this.setSetting('skipAnimations', true);
                }
            });
        }
        
        // Listen for focus events to manage keyboard navigation
        if (this.settings.keyboardOnly) {
            this.setupKeyboardOnlyMode();
        }
    }

    /**
     * Setup keyboard-only navigation mode
     */
    setupKeyboardOnlyMode() {
        document.body.classList.add('keyboard-only');
        
        // Hide mouse cursor when keyboard navigation is detected
        let lastKeyTime = 0;
        
        document.addEventListener('keydown', () => {
            lastKeyTime = Date.now();
            document.body.classList.add('using-keyboard');
        });
        
        document.addEventListener('mousemove', () => {
            if (Date.now() - lastKeyTime > 100) {
                document.body.classList.remove('using-keyboard');
            }
        });
    }

    /**
     * Announce setting changes to screen readers
     */
    announceSettingChange(key, value) {
        if (!this.settings.announceActions) return;
        
        const settingNames = {
            colorBlindMode: 'Color blind mode',
            highContrast: 'High contrast',
            fontSize: 'Font size',
            keyboardOnly: 'Keyboard-only mode',
            announceActions: 'Action announcements',
            simplifiedUI: 'Simplified interface'
        };
        
        const settingName = settingNames[key] || key;
        const message = `${settingName} ${typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : `set to ${value}`}`;
        
        this.announceMessage(message);
    }

    /**
     * Announce a message to screen readers
     */
    announceMessage(message) {
        if (!this.settings.announceActions) return;
        
        // Create temporary announcement element
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        announcer.textContent = message;
        
        document.body.appendChild(announcer);
        
        setTimeout(() => {
            if (announcer.parentNode) {
                announcer.parentNode.removeChild(announcer);
            }
        }, 1000);
    }

    /**
     * Get accessibility status report
     */
    getAccessibilityReport() {
        const enabledFeatures = [];
        const recommendations = [];
        
        Object.keys(this.settings).forEach(key => {
            const value = this.settings[key];
            if (typeof value === 'boolean' && value) {
                enabledFeatures.push(key);
            }
        });
        
        // Generate recommendations
        if (!this.settings.announceActions) {
            recommendations.push('Enable action announcements for better screen reader support');
        }
        
        if (this.settings.colorBlindMode === 'none') {
            recommendations.push('Consider enabling color blind support if you have difficulty distinguishing colors');
        }
        
        if (!this.settings.showFocusIndicators) {
            recommendations.push('Enable focus indicators for better keyboard navigation visibility');
        }
        
        return {
            enabledFeatures,
            recommendations,
            settings: this.getSettings()
        };
    }

    /**
     * Test accessibility features
     */
    testAccessibility() {
        const tests = [];
        
        // Test color contrast
        tests.push({
            name: 'Color Contrast',
            status: this.settings.highContrast ? 'pass' : 'info',
            message: this.settings.highContrast ? 'High contrast mode enabled' : 'Consider enabling high contrast mode'
        });
        
        // Test keyboard navigation
        tests.push({
            name: 'Keyboard Navigation',
            status: this.settings.showFocusIndicators ? 'pass' : 'warn',
            message: this.settings.showFocusIndicators ? 'Focus indicators enabled' : 'Focus indicators disabled'
        });
        
        // Test screen reader support
        tests.push({
            name: 'Screen Reader Support',
            status: this.settings.announceActions ? 'pass' : 'warn',
            message: this.settings.announceActions ? 'Action announcements enabled' : 'Action announcements disabled'
        });
        
        return tests;
    }
}

// Create and export singleton instance
export const accessibilitySettings = new AccessibilitySettings();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.accessibilitySettings = accessibilitySettings;
}