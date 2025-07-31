/**
 * PLAYER MANAGER - User Profile and Statistics Management
 * 
 * This module handles:
 * - User profile creation and management
 * - Game statistics tracking
 * - Achievement system
 * - Settings persistence
 * - Local storage management for user data
 */

import { LocalStorage } from '../utils/LocalStorage.js';
import { validate } from '../utils/Validation.js';
import { logger } from '../utils/Logger.js';

/**
 * PlayerManager Class
 * Manages player profiles, statistics, and preferences
 */
export class PlayerManager {
    constructor() {
        // Storage keys
        this.STORAGE_KEYS = {
            PROFILE: 'fftcg_player_profile',
            STATS: 'fftcg_player_stats',
            SETTINGS: 'fftcg_player_settings',
            ACHIEVEMENTS: 'fftcg_player_achievements'
        };

        // Default profile structure
        this.defaultProfile = {
            id: null,
            name: 'Guest Player',
            avatar: '⚡',
            createdAt: null,
            lastActive: null,
            rank: 'Novice',
            title: 'New Player'
        };

        // Default statistics structure
        this.defaultStats = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0,
            bestWinStreak: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            cardsPlayed: 0,
            decksCreated: 0,
            favoriteElement: null,
            playtimeMinutes: 0
        };

        // Default settings structure
        this.defaultSettings = {
            // Accessibility
            highContrast: false,
            largeText: false,
            reducedMotion: false,
            screenReader: false,
            filterIconSize: 'medium',
            
            // Audio
            soundEffects: true,
            musicVolume: 0.7,
            sfxVolume: 0.8,
            
            // Gameplay
            autoPassPriority: 'never', // never, end-step, always
            animationSpeed: 'normal', // slow, normal, fast, instant
            showCardPreview: true,
            confirmActions: true,
            
            // Interface
            theme: 'default',
            language: 'en',
            cardLanguage: 'en',
            showTips: true
        };

        // Event listeners
        this.listeners = new Map();

        // Current data
        this.profile = { ...this.defaultProfile };
        this.stats = { ...this.defaultStats };
        this.settings = { ...this.defaultSettings };
        this.achievements = [];

        // Initialize
        logger.debug('👤 PlayerManager initializing...');
    }

    /**
     * Load player profile from local storage
     */
    async loadProfile() {
        try {
            // Load profile
            const savedProfile = LocalStorage.get(this.STORAGE_KEYS.PROFILE);
            if (savedProfile) {
                this.profile = { ...this.defaultProfile, ...savedProfile };
            } else {
                // Create new profile
                this.createNewProfile();
            }

            // Load statistics
            const savedStats = LocalStorage.get(this.STORAGE_KEYS.STATS);
            if (savedStats) {
                this.stats = { ...this.defaultStats, ...savedStats };
            }

            // Load settings
            const savedSettings = LocalStorage.get(this.STORAGE_KEYS.SETTINGS);
            if (savedSettings) {
                this.settings = { ...this.defaultSettings, ...savedSettings };
            }

            // Load achievements
            const savedAchievements = LocalStorage.get(this.STORAGE_KEYS.ACHIEVEMENTS);
            if (savedAchievements) {
                this.achievements = savedAchievements;
            }

            // Apply current settings to DOM
            this.applySettings();

            // Update last active time
            this.profile.lastActive = new Date().toISOString();
            this.saveProfile();

            logger.info('👤 Player profile loaded:', this.profile.name);
            return this.profile;

        } catch (error) {
            logger.error('Failed to load player profile:', error);
            this.createNewProfile();
            return this.profile;
        }
    }

    /**
     * Create a new player profile
     */
    createNewProfile() {
        const now = new Date().toISOString();
        this.profile = {
            ...this.defaultProfile,
            id: this.generatePlayerId(),
            createdAt: now,
            lastActive: now
        };

        this.stats = { ...this.defaultStats };
        this.settings = { ...this.defaultSettings };
        this.achievements = [];

        this.saveProfile();
        this.emit('profileCreated', this.profile);

        logger.info('🆕 New player profile created');
    }

    /**
     * Generate unique player ID
     */
    generatePlayerId() {
        return 'player_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Update player profile
     */
    updateProfile(updates) {
        // Validate updates
        const validation = this.validateProfileUpdates(updates);
        if (!validation.isValid) {
            throw new Error(`Invalid profile updates: ${validation.errors.join(', ')}`);
        }

        // Apply updates
        const oldProfile = { ...this.profile };
        this.profile = { ...this.profile, ...updates };
        this.profile.lastActive = new Date().toISOString();

        // Save changes
        this.saveProfile();

        // Emit event
        this.emit('profileUpdated', { old: oldProfile, new: this.profile });

        logger.info('✏️ Player profile updated');
        return this.profile;
    }

    /**
     * Validate profile updates
     */
    validateProfileUpdates(updates) {
        const errors = [];

        // Validate name
        if (updates.name !== undefined) {
            const nameValidation = validate(updates.name, [
                'required',
                { type: 'minLength', min: 2 },
                { type: 'maxLength', max: 20 },
                { type: 'pattern', regex: /^[a-zA-Z0-9\s\-_.!?]+$/, message: 'Name contains invalid characters' }
            ]);
            
            if (!nameValidation.isValid) {
                errors.push('Name must be 2-20 characters and contain only letters, numbers, spaces, and basic punctuation');
            }
        }

        // Validate avatar (should be a single emoji or character)
        if (updates.avatar !== undefined) {
            if (typeof updates.avatar !== 'string' || updates.avatar.length === 0 || updates.avatar.length > 4) {
                errors.push('Avatar must be a valid emoji or character');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Save player profile to local storage
     */
    saveProfile() {
        try {
            LocalStorage.set(this.STORAGE_KEYS.PROFILE, this.profile);
            LocalStorage.set(this.STORAGE_KEYS.STATS, this.stats);
            LocalStorage.set(this.STORAGE_KEYS.SETTINGS, this.settings);
            LocalStorage.set(this.STORAGE_KEYS.ACHIEVEMENTS, this.achievements);
        } catch (error) {
            logger.error('Failed to save player profile:', error);
            throw error;
        }
    }

    /**
     * Record game result and update statistics
     */
    recordGameResult(result) {
        const { outcome, damageDealt, damageReceived, cardsPlayed, gameDurationMinutes } = result;

        // Update basic stats
        this.stats.gamesPlayed++;
        this.stats.cardsPlayed += cardsPlayed || 0;
        this.stats.totalDamageDealt += damageDealt || 0;
        this.stats.totalDamageReceived += damageReceived || 0;
        this.stats.playtimeMinutes += gameDurationMinutes || 0;

        // Update outcome-specific stats
        switch (outcome) {
            case 'win':
                this.stats.wins++;
                this.stats.winStreak++;
                if (this.stats.winStreak > this.stats.bestWinStreak) {
                    this.stats.bestWinStreak = this.stats.winStreak;
                }
                break;
            
            case 'loss':
                this.stats.losses++;
                this.stats.winStreak = 0;
                break;
            
            case 'draw':
                this.stats.draws++;
                this.stats.winStreak = 0;
                break;
        }

        // Update rank based on performance
        this.updateRank();

        // Check for achievements
        this.checkAchievements();

        // Save changes
        this.saveProfile();

        // Emit event
        this.emit('gameResultRecorded', { result, stats: this.stats });

        logger.info(`📊 Game result recorded: ${outcome}`);
    }

    /**
     * Update player rank based on performance
     */
    updateRank() {
        const winRate = this.stats.gamesPlayed > 0 ? this.stats.wins / this.stats.gamesPlayed : 0;
        const gamesPlayed = this.stats.gamesPlayed;

        let newRank = 'Novice';

        if (gamesPlayed >= 100 && winRate >= 0.8) {
            newRank = 'Legend';
        } else if (gamesPlayed >= 50 && winRate >= 0.7) {
            newRank = 'Master';
        } else if (gamesPlayed >= 25 && winRate >= 0.6) {
            newRank = 'Expert';
        } else if (gamesPlayed >= 10 && winRate >= 0.5) {
            newRank = 'Veteran';
        } else if (gamesPlayed >= 5) {
            newRank = 'Apprentice';
        }

        if (newRank !== this.profile.rank) {
            const oldRank = this.profile.rank;
            this.profile.rank = newRank;
            this.emit('rankUpdated', { old: oldRank, new: newRank });
            logger.info(`🎖️ Rank updated: ${oldRank} → ${newRank}`);
        }
    }

    /**
     * Check and award achievements
     */
    checkAchievements() {
        const newAchievements = [];

        // Define achievements
        const achievementChecks = [
            {
                id: 'first_win',
                name: 'First Victory',
                description: 'Win your first game',
                condition: () => this.stats.wins >= 1,
                icon: '🏆'
            },
            {
                id: 'win_streak_5',
                name: 'On Fire',
                description: 'Win 5 games in a row',
                condition: () => this.stats.winStreak >= 5,
                icon: '🔥'
            },
            {
                id: 'games_10',
                name: 'Getting Started',
                description: 'Play 10 games',
                condition: () => this.stats.gamesPlayed >= 10,
                icon: '🎮'
            },
            {
                id: 'deck_builder',
                name: 'Deck Architect',
                description: 'Create 5 different decks',
                condition: () => this.stats.decksCreated >= 5,
                icon: '🏗️'
            },
            {
                id: 'playtime_hour',
                name: 'Dedicated Player',
                description: 'Play for 1 hour total',
                condition: () => this.stats.playtimeMinutes >= 60,
                icon: '⏰'
            }
        ];

        // Check each achievement
        achievementChecks.forEach(achievement => {
            const hasAchievement = this.achievements.some(a => a.id === achievement.id);
            
            if (!hasAchievement && achievement.condition()) {
                const newAchievement = {
                    ...achievement,
                    unlockedAt: new Date().toISOString()
                };
                
                this.achievements.push(newAchievement);
                newAchievements.push(newAchievement);
            }
        });

        // Emit events for new achievements
        newAchievements.forEach(achievement => {
            this.emit('achievementUnlocked', achievement);
            logger.info(`🏅 Achievement unlocked: ${achievement.name}`);
        });

        return newAchievements;
    }

    /**
     * Update player settings
     */
    updateSettings(updates) {
        const oldSettings = { ...this.settings };
        this.settings = { ...this.settings, ...updates };
        
        // Apply icon size setting if it changed
        if (updates.filterIconSize && updates.filterIconSize !== oldSettings.filterIconSize) {
            this.applyFilterIconSize(updates.filterIconSize);
        }
        
        this.saveProfile();
        this.emit('settingsUpdated', { old: oldSettings, new: this.settings });
        
        logger.info('⚙️ Settings updated');
        return this.settings;
    }

    /**
     * Apply all current settings to the DOM
     */
    applySettings() {
        // Apply filter icon size setting
        this.applyFilterIconSize(this.settings.filterIconSize);
        
        // Apply other settings as needed
        // TODO: Add other settings application here
    }

    /**
     * Apply filter icon size setting to the DOM
     */
    applyFilterIconSize(iconSize) {
        const filterControls = document.querySelector('.filter-controls');
        if (!filterControls) return;

        // Remove existing icon size classes
        filterControls.classList.remove('icon-size-small', 'icon-size-medium', 'icon-size-large', 'icon-size-extra-large');
        
        // Add new icon size class
        if (iconSize && iconSize !== 'medium') {
            filterControls.classList.add(`icon-size-${iconSize}`);
        }
        
        logger.debug(`🎨 Applied filter icon size: ${iconSize}`);
    }

    /**
     * Get player profile
     */
    getProfile() {
        return { ...this.profile };
    }

    /**
     * Get player statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get player settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get player achievements
     */
    getAchievements() {
        return [...this.achievements];
    }

    /**
     * Get computed statistics
     */
    getComputedStats() {
        const winRate = this.stats.gamesPlayed > 0 ? 
            (this.stats.wins / this.stats.gamesPlayed) * 100 : 0;
        
        const averageDamagePerGame = this.stats.gamesPlayed > 0 ? 
            this.stats.totalDamageDealt / this.stats.gamesPlayed : 0;

        return {
            winRate: Math.round(winRate * 100) / 100,
            lossRate: Math.round((100 - winRate) * 100) / 100,
            averageDamagePerGame: Math.round(averageDamagePerGame * 100) / 100,
            averageCardsPerGame: this.stats.gamesPlayed > 0 ? 
                Math.round((this.stats.cardsPlayed / this.stats.gamesPlayed) * 100) / 100 : 0,
            hoursPlayed: Math.round((this.stats.playtimeMinutes / 60) * 100) / 100
        };
    }

    /**
     * Reset player data (for testing or new start)
     */
    reset() {
        const confirmation = confirm('Are you sure you want to reset all player data? This cannot be undone.');
        
        if (confirmation) {
            // Clear storage
            Object.values(this.STORAGE_KEYS).forEach(key => {
                LocalStorage.remove(key);
            });

            // Reset to defaults
            this.createNewProfile();
            
            this.emit('profileReset');
            logger.info('🔄 Player profile reset');
        }
    }

    /**
     * Export player data for backup
     */
    exportData() {
        return {
            profile: this.profile,
            stats: this.stats,
            settings: this.settings,
            achievements: this.achievements,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import player data from backup
     */
    importData(data) {
        try {
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            // Import data with fallbacks
            this.profile = { ...this.defaultProfile, ...data.profile };
            this.stats = { ...this.defaultStats, ...data.stats };
            this.settings = { ...this.defaultSettings, ...data.settings };
            this.achievements = data.achievements || [];

            // Save imported data
            this.saveProfile();
            
            this.emit('dataImported', data);
            logger.info('📥 Player data imported successfully');
            
            return true;
        } catch (error) {
            logger.error('Failed to import player data:', error);
            throw error;
        }
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
                    logger.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }
}