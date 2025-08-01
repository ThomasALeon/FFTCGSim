/**
 * IMAGE MAPPING UTILITY - Shared card image mapping functionality
 * 
 * This utility consolidates duplicate card image mapping code that was
 * previously duplicated in Modal.js and DeckBuilder.js
 */

import { logger } from './Logger.js';

/**
 * ImageMapping Class
 * Singleton for managing card image mappings across the application
 */
class ImageMapping {
    constructor() {
        this.cardImageMapping = null;
        this.isLoaded = false;
        this.loadPromise = null;
    }

    /**
     * Load card image mapping from JSON file (singleton pattern)
     */
    async loadCardImageMapping() {
        // Return existing promise if already loading
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Return cached data if already loaded
        if (this.isLoaded) {
            return this.cardImageMapping;
        }

        // Start loading
        this.loadPromise = this._performLoad();
        return this.loadPromise;
    }

    /**
     * Internal load method
     */
    async _performLoad() {
        try {
            logger.debug('🖼️ Loading card image mapping...');
            const response = await fetch('./src/data/card_image_mapping.json');
            
            if (response.ok) {
                this.cardImageMapping = await response.json();
                this.isLoaded = true;
                logger.info(`✅ Loaded image mapping for ${Object.keys(this.cardImageMapping).length} cards`);
            } else {
                logger.warn('⚠️ Card image mapping file not found, using placeholders');
                this.cardImageMapping = {};
                this.isLoaded = true;
            }
        } catch (error) {
            logger.error('❌ Failed to load card image mapping:', error);
            this.cardImageMapping = {};
            this.isLoaded = true;
        }

        return this.cardImageMapping;
    }

    /**
     * Get image mapping for a specific card
     */
    getCardImageMapping(cardId) {
        if (!this.isLoaded) {
            logger.warn('⚠️ Image mapping not loaded yet');
            return null;
        }
        
        return this.cardImageMapping[cardId] || null;
    }

    /**
     * Check if a card has a real image mapping
     */
    hasRealImage(cardId) {
        const mapping = this.getCardImageMapping(cardId);
        return mapping && mapping.image;
    }

    /**
     * Get all loaded mappings
     */
    getAllMappings() {
        return this.cardImageMapping;
    }

    /**
     * Clear cache (for testing or reloading)
     */
    clearCache() {
        this.cardImageMapping = null;
        this.isLoaded = false;
        this.loadPromise = null;
        logger.debug('🗑️ Image mapping cache cleared');
    }
}

// Export singleton instance
export const imageMapping = new ImageMapping();