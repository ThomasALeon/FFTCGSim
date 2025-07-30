/**
 * SECURITY MODULE - Enhanced Security for FFTCG Simulator
 * 
 * This module provides:
 * - Input sanitization
 * - XSS prevention
 * - CSRF protection
 * - Rate limiting
 * - Secure communication
 */

export class Security {
    constructor() {
        this.csrfToken = this.generateCSRFToken();
        this.rateLimiter = new Map();
        this.suspiciousActivity = new Map();
    }

    /**
     * Sanitize user input to prevent XSS
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove dangerous characters and scripts
        return input
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim()
            .slice(0, 1000); // Limit length
    }

    /**
     * Validate and sanitize card data
     */
    validateCardData(cardData) {
        const validatedData = {};
        
        // Whitelist approach - only allow known fields
        const allowedFields = ['id', 'name', 'element', 'type', 'cost', 'power'];
        
        for (const field of allowedFields) {
            if (cardData.hasOwnProperty(field)) {
                validatedData[field] = this.sanitizeInput(cardData[field]);
            }
        }
        
        return validatedData;
    }

    /**
     * Generate CSRF token
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verify CSRF token
     */
    verifyCSRFToken(token) {
        return token === this.csrfToken;
    }

    /**
     * Rate limiting for actions
     */
    checkRateLimit(userId, action, maxAttempts = 10, windowMs = 60000) {
        const key = `${userId}-${action}`;
        const now = Date.now();
        
        if (!this.rateLimiter.has(key)) {
            this.rateLimiter.set(key, { count: 1, resetTime: now + windowMs });
            return true;
        }
        
        const limit = this.rateLimiter.get(key);
        
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + windowMs;
            return true;
        }
        
        if (limit.count >= maxAttempts) {
            this.recordSuspiciousActivity(userId, `Rate limit exceeded for ${action}`);
            return false;
        }
        
        limit.count++;
        return true;
    }

    /**
     * Validate deck submission
     */
    validateDeckSubmission(deck, userId) {
        // Check rate limit
        if (!this.checkRateLimit(userId, 'deck-submission', 5, 300000)) {
            throw new Error('Too many deck submissions. Please wait before trying again.');
        }
        
        // Validate deck structure
        if (!deck || typeof deck !== 'object') {
            throw new Error('Invalid deck format');
        }
        
        // Validate deck name
        if (!deck.name || typeof deck.name !== 'string') {
            throw new Error('Deck name is required');
        }
        
        deck.name = this.sanitizeInput(deck.name);
        
        // Validate card array
        if (!Array.isArray(deck.cards) || deck.cards.length !== 50) {
            throw new Error('Deck must contain exactly 50 cards');
        }
        
        // Validate each card ID
        const validCardPattern = /^[a-zA-Z0-9\-_]+$/;
        for (const cardId of deck.cards) {
            if (!validCardPattern.test(cardId)) {
                throw new Error('Invalid card ID detected');
            }
        }
        
        return true;
    }

    /**
     * Encrypt sensitive data for storage
     */
    async encryptData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        // Generate key
        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        
        // Generate IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBuffer
        );
        
        // Export key for storage
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        
        return {
            encrypted: Array.from(new Uint8Array(encrypted)),
            key: Array.from(new Uint8Array(exportedKey)),
            iv: Array.from(iv)
        };
    }

    /**
     * Decrypt data
     */
    async decryptData(encryptedData) {
        const key = await crypto.subtle.importKey(
            'raw',
            new Uint8Array(encryptedData.key),
            'AES-GCM',
            true,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
            key,
            new Uint8Array(encryptedData.encrypted)
        );
        
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    }

    /**
     * Validate game action
     */
    validateGameAction(action, gameState, playerId) {
        // Ensure action is from the correct player
        if (action.playerId !== playerId) {
            this.recordSuspiciousActivity(playerId, 'Attempted to perform action as another player');
            throw new Error('Invalid player ID');
        }
        
        // Validate it's the player's turn
        if (gameState.currentPlayer !== playerId && action.requiresTurn) {
            this.recordSuspiciousActivity(playerId, 'Attempted to act out of turn');
            throw new Error('Not your turn');
        }
        
        // Validate action type
        const validActions = ['play-card', 'attack', 'pass', 'use-ability', 'end-turn'];
        if (!validActions.includes(action.type)) {
            throw new Error('Invalid action type');
        }
        
        // Additional validation based on action type
        switch (action.type) {
            case 'play-card':
                this.validateCardPlay(action, gameState, playerId);
                break;
            case 'attack':
                this.validateAttack(action, gameState, playerId);
                break;
        }
        
        return true;
    }

    /**
     * Validate card play action
     */
    validateCardPlay(action, gameState, playerId) {
        const player = gameState.players[playerId];
        
        // Check if card is in hand
        if (!player.hand.includes(action.cardId)) {
            this.recordSuspiciousActivity(playerId, 'Attempted to play card not in hand');
            throw new Error('Card not in hand');
        }
        
        // Check if player has enough CP
        const card = gameState.getCard(action.cardId);
        if (player.cp < card.cost) {
            this.recordSuspiciousActivity(playerId, 'Attempted to play card without sufficient CP');
            throw new Error('Insufficient CP');
        }
    }

    /**
     * Validate attack action
     */
    validateAttack(action, gameState, playerId) {
        const attacker = gameState.getCharacter(action.attackerId);
        
        // Check if attacker belongs to player
        if (attacker.controller !== playerId) {
            this.recordSuspiciousActivity(playerId, 'Attempted to attack with opponent\'s character');
            throw new Error('Invalid attacker');
        }
        
        // Check if attacker can attack
        if (attacker.status === 'exhausted' || attacker.summoningSickness) {
            throw new Error('Character cannot attack');
        }
    }

    /**
     * Record suspicious activity
     */
    recordSuspiciousActivity(userId, activity) {
        if (!this.suspiciousActivity.has(userId)) {
            this.suspiciousActivity.set(userId, []);
        }
        
        const userActivity = this.suspiciousActivity.get(userId);
        userActivity.push({
            activity,
            timestamp: new Date().toISOString()
        });
        
        // Check if user should be banned
        if (userActivity.length >= 5) {
            console.warn(`User ${userId} has multiple suspicious activities:`, userActivity);
            // Implement ban logic here
        }
    }

    /**
     * Secure WebSocket message
     */
    secureMessage(message) {
        return {
            ...message,
            timestamp: Date.now(),
            csrf: this.csrfToken,
            version: '1.0'
        };
    }

    /**
     * Validate incoming WebSocket message
     */
    validateMessage(message, expectedType) {
        // Check message structure
        if (!message || typeof message !== 'object') {
            throw new Error('Invalid message format');
        }
        
        // Check timestamp (prevent replay attacks)
        const messageAge = Date.now() - message.timestamp;
        if (messageAge > 30000) { // 30 seconds
            throw new Error('Message too old');
        }
        
        // Check message type
        if (message.type !== expectedType) {
            throw new Error('Unexpected message type');
        }
        
        // Sanitize any string data
        this.sanitizeMessageData(message.data);
        
        return true;
    }

    /**
     * Recursively sanitize message data
     */
    sanitizeMessageData(data) {
        if (typeof data === 'string') {
            return this.sanitizeInput(data);
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeMessageData(item));
        }
        
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                sanitized[key] = this.sanitizeMessageData(value);
            }
            return sanitized;
        }
        
        return data;
    }

    /**
     * Generate secure room code
     */
    generateSecureRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        const array = new Uint8Array(6);
        crypto.getRandomValues(array);
        
        for (const byte of array) {
            code += chars[byte % chars.length];
        }
        
        return code;
    }

    /**
     * Hash sensitive data
     */
    async hashData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Content Security Policy headers for server
     */
    getCSPHeaders() {
        return {
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: https:",
                "connect-src 'self' wss://your-game-server.com",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; ')
        };
    }
}

// Export singleton instance
export const security = new Security();