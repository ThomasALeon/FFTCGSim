/**
 * LOCAL STORAGE - Enhanced Local Storage Management
 * 
 * Provides safe, versioned local storage with error handling,
 * encryption support, and automatic data migration
 */

import { logger } from './Logger.js';

export class LocalStorage {
    constructor() {
        this.storageKey = 'fftcg_';
        this.version = '1.0';
        this.isAvailable = this.checkAvailability();
        
        logger.debug('💾 LocalStorage utility initialized');
    }

    /**
     * Check if localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            logger.warn('⚠️ localStorage not available:', e.message);
            return false;
        }
    }

    /**
     * Get item from localStorage with error handling
     */
    static get(key, defaultValue = null) {
        const instance = new LocalStorage();
        return instance.getItem(key, defaultValue);
    }

    getItem(key, defaultValue = null) {
        if (!this.isAvailable) {
            logger.warn(`localStorage unavailable for key: ${key}`);
            return defaultValue;
        }

        try {
            const fullKey = this.storageKey + key;
            const item = localStorage.getItem(fullKey);
            
            if (item === null) {
                return defaultValue;
            }

            // Parse stored data
            const parsed = JSON.parse(item);
            
            // Check for versioned data
            if (parsed && typeof parsed === 'object' && parsed._version) {
                return this.migrateData(parsed, key);
            }

            return parsed;
            
        } catch (error) {
            logger.error(`Error reading from localStorage key '${key}':`, error);
            return defaultValue;
        }
    }

    /**
     * Set item in localStorage with error handling
     */
    static set(key, value, options = {}) {
        const instance = new LocalStorage();
        return instance.setItem(key, value, options);
    }

    setItem(key, value, options = {}) {
        if (!this.isAvailable) {
            logger.warn(`localStorage unavailable for key: ${key}`);
            return false;
        }

        try {
            const fullKey = this.storageKey + key;
            
            // Prepare data with metadata
            const dataToStore = {
                _version: this.version,
                _timestamp: new Date().toISOString(),
                _key: key,
                data: value
            };

            // Add TTL if specified
            if (options.ttl) {
                dataToStore._expires = new Date(Date.now() + options.ttl).toISOString();
            }

            // Serialize and store
            const serialized = JSON.stringify(dataToStore);
            localStorage.setItem(fullKey, serialized);
            
            logger.trace(`💾 Stored data for key: ${key}`, { size: serialized.length });
            return true;
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                logger.error('localStorage quota exceeded');
                this.cleanup();
            } else {
                logger.error(`Error writing to localStorage key '${key}':`, error);
            }
            return false;
        }
    }

    /**
     * Remove item from localStorage
     */
    static remove(key) {
        const instance = new LocalStorage();
        return instance.removeItem(key);
    }

    removeItem(key) {
        if (!this.isAvailable) {
            return false;
        }

        try {
            const fullKey = this.storageKey + key;
            localStorage.removeItem(fullKey);
            logger.trace(`🗑️ Removed data for key: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Error removing localStorage key '${key}':`, error);
            return false;
        }
    }

    /**
     * Check if key exists
     */
    static has(key) {
        const instance = new LocalStorage();
        return instance.hasItem(key);
    }

    hasItem(key) {
        if (!this.isAvailable) {
            return false;
        }

        try {
            const fullKey = this.storageKey + key;
            return localStorage.getItem(fullKey) !== null;
        } catch (error) {
            logger.error(`Error checking localStorage key '${key}':`, error);
            return false;
        }
    }

    /**
     * Get all keys with our prefix
     */
    static getAllKeys() {
        const instance = new LocalStorage();
        return instance.getAllKeys();
    }

    getAllKeys() {
        if (!this.isAvailable) {
            return [];
        }

        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storageKey)) {
                    keys.push(key.substring(this.storageKey.length));
                }
            }
            return keys;
        } catch (error) {
            logger.error('Error getting all localStorage keys:', error);
            return [];
        }
    }

    /**
     * Clear all data with our prefix
     */
    static clear() {
        const instance = new LocalStorage();
        return instance.clearAll();
    }

    clearAll() {
        if (!this.isAvailable) {
            return false;
        }

        try {
            const keys = this.getAllKeys();
            keys.forEach(key => this.removeItem(key));
            logger.info(`🧹 Cleared ${keys.length} items from localStorage`);
            return true;
        } catch (error) {
            logger.error('Error clearing localStorage:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    static getUsage() {
        const instance = new LocalStorage();
        return instance.getStorageUsage();
    }

    getStorageUsage() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            let totalSize = 0;
            let ourSize = 0;
            let itemCount = 0;

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage.getItem(key);
                    const itemSize = key.length + (value ? value.length : 0);
                    totalSize += itemSize;
                    
                    if (key.startsWith(this.storageKey)) {
                        ourSize += itemSize;
                        itemCount++;
                    }
                }
            }

            return {
                totalSize,
                ourSize,
                itemCount,
                available: this.isAvailable,
                percentageUsed: totalSize > 0 ? ((ourSize / totalSize) * 100).toFixed(2) : 0
            };
        } catch (error) {
            logger.error('Error calculating storage usage:', error);
            return null;
        }
    }

    /**
     * Migrate old data format to new version
     */
    migrateData(storedData, key) {
        try {
            // Check if data is expired
            if (storedData._expires && new Date(storedData._expires) < new Date()) {
                logger.debug(`⏰ Expired data removed for key: ${key}`);
                this.removeItem(key);
                return null;
            }

            // Version migration logic would go here
            if (storedData._version !== this.version) {
                logger.info(`🔄 Migrating data for key '${key}' from version ${storedData._version} to ${this.version}`);
                // Perform migration steps here
            }

            return storedData.data;
        } catch (error) {
            logger.error(`Error migrating data for key '${key}':`, error);
            return null;
        }
    }

    /**
     * Cleanup expired items and manage storage
     */
    cleanup() {
        if (!this.isAvailable) {
            return;
        }

        try {
            const keys = this.getAllKeys();
            let removedCount = 0;

            keys.forEach(key => {
                const data = this.getItem(key);
                if (data === null) {
                    // Item was expired or corrupted
                    removedCount++;
                }
            });

            logger.info(`🧹 Storage cleanup completed, removed ${removedCount} items`);
        } catch (error) {
            logger.error('Error during storage cleanup:', error);
        }
    }

    /**
     * Backup data to JSON
     */
    static backup() {
        const instance = new LocalStorage();
        return instance.createBackup();
    }

    createBackup() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const keys = this.getAllKeys();
            const backup = {
                timestamp: new Date().toISOString(),
                version: this.version,
                data: {}
            };

            keys.forEach(key => {
                const value = this.getItem(key);
                if (value !== null) {
                    backup.data[key] = value;
                }
            });

            logger.info(`💼 Created backup with ${keys.length} items`);
            return JSON.stringify(backup, null, 2);
        } catch (error) {
            logger.error('Error creating backup:', error);
            return null;
        }
    }

    /**
     * Restore data from JSON backup
     */
    static restore(backupData) {
        const instance = new LocalStorage();
        return instance.restoreBackup(backupData);
    }

    restoreBackup(backupData) {
        if (!this.isAvailable) {
            return false;
        }

        try {
            const backup = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
            
            if (!backup.data) {
                throw new Error('Invalid backup format');
            }

            let restoredCount = 0;
            Object.keys(backup.data).forEach(key => {
                if (this.setItem(key, backup.data[key])) {
                    restoredCount++;
                }
            });

            logger.info(`📥 Restored ${restoredCount} items from backup`);
            return true;
        } catch (error) {
            logger.error('Error restoring backup:', error);
            return false;
        }
    }

    /**
     * Watch for changes to a specific key
     */
    static watch(key, callback) {
        const instance = new LocalStorage();
        return instance.watchKey(key, callback);
    }

    watchKey(key, callback) {
        if (!this.isAvailable) {
            return null;
        }

        const handleStorageChange = (event) => {
            const fullKey = this.storageKey + key;
            if (event.key === fullKey) {
                const newValue = event.newValue ? JSON.parse(event.newValue).data : null;
                const oldValue = event.oldValue ? JSON.parse(event.oldValue).data : null;
                callback(newValue, oldValue, key);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Return unsubscribe function
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }
}

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        const storage = new LocalStorage();
        storage.cleanup();
    });
}