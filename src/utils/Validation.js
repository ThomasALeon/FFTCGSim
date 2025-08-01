/**
 * VALIDATION - Data Validation and Sanitization
 * 
 * Provides comprehensive validation for game data, user input,
 * and system integrity with detailed error reporting
 */

import { logger } from './Logger.js';

export class Validation {
    constructor() {
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            username: /^[a-zA-Z0-9_]{3,20}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
            cardId: /^[a-zA-Z0-9\-_]+$/,
            deckName: /^[a-zA-Z0-9\s\-_'".!?]{1,50}$/,
            gameId: /^game_[a-zA-Z0-9_]+$/,
            playerId: /^player_[0-9]+$/
        };

        this.messages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            username: 'Username must be 3-20 characters, letters, numbers, and underscores only',
            password: 'Password must be at least 8 characters with uppercase, lowercase, and number',
            cardId: 'Invalid card ID format',
            deckName: 'Deck name must be 1-50 characters',
            gameId: 'Invalid game ID format',
            playerId: 'Invalid player ID format',
            minLength: 'Must be at least {min} characters',
            maxLength: 'Must be no more than {max} characters',
            min: 'Must be at least {min}',
            max: 'Must be no more than {max}',
            integer: 'Must be a whole number',
            number: 'Must be a valid number',
            array: 'Must be an array',
            object: 'Must be an object',
            boolean: 'Must be true or false',
            oneOf: 'Must be one of: {values}',
            custom: 'Validation failed'
        };

        logger.debug('✅ Validation utility initialized');
    }

    /**
     * Validate a single value against rules
     */
    static validate(value, rules, context = {}) {
        const validator = new Validation();
        return validator.validateValue(value, rules, context);
    }

    validateValue(value, rules, context = {}) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitized: value
        };

        // Convert single rule to array
        if (!Array.isArray(rules)) {
            rules = [rules];
        }

        for (const rule of rules) {
            const ruleResult = this.applyRule(value, rule, context);
            
            if (!ruleResult.isValid) {
                result.isValid = false;
                result.errors.push(...ruleResult.errors);
            }
            
            if (ruleResult.warnings) {
                result.warnings.push(...ruleResult.warnings);
            }
            
            // Update sanitized value
            if (ruleResult.sanitized !== undefined) {
                result.sanitized = ruleResult.sanitized;
                value = ruleResult.sanitized; // Use sanitized value for next rule
            }
        }

        return result;
    }

    /**
     * Apply a single validation rule
     */
    applyRule(value, rule, context) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitized: value
        };

        try {
            if (typeof rule === 'string') {
                // Simple rule name
                this.applySimpleRule(value, rule, result, context);
            } else if (typeof rule === 'object') {
                // Complex rule with parameters
                this.applyComplexRule(value, rule, result, context);
            } else if (typeof rule === 'function') {
                // Custom validation function
                this.applyCustomRule(value, rule, result, context);
            }
        } catch (error) {
            logger.error('Validation rule error:', error);
            result.isValid = false;
            result.errors.push('Validation error occurred');
        }

        return result;
    }

    /**
     * Apply simple string rule
     */
    applySimpleRule(value, rule, result, context) {
        switch (rule) {
            case 'required':
                if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
                    result.isValid = false;
                    result.errors.push(this.messages.required);
                }
                break;

            case 'email':
                if (value && !this.patterns.email.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.email);
                }
                break;

            case 'username':
                if (value && !this.patterns.username.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.username);
                }
                break;

            case 'password':
                if (value && !this.patterns.password.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.password);
                }
                break;

            case 'cardId':
                if (value && !this.patterns.cardId.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.cardId);
                }
                break;

            case 'deckName':
                if (value && !this.patterns.deckName.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.deckName);
                }
                break;

            case 'gameId':
                if (value && !this.patterns.gameId.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.gameId);
                }
                break;

            case 'playerId':
                if (value && !this.patterns.playerId.test(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.playerId);
                }
                break;

            case 'integer':
                if (value != null && (!Number.isInteger(Number(value)) || isNaN(Number(value)))) {
                    result.isValid = false;
                    result.errors.push(this.messages.integer);
                } else if (value != null) {
                    result.sanitized = parseInt(value);
                }
                break;

            case 'number':
                if (value != null && isNaN(Number(value))) {
                    result.isValid = false;
                    result.errors.push(this.messages.number);
                } else if (value != null) {
                    result.sanitized = Number(value);
                }
                break;

            case 'array':
                if (value != null && !Array.isArray(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.array);
                }
                break;

            case 'object':
                if (value != null && (typeof value !== 'object' || Array.isArray(value))) {
                    result.isValid = false;
                    result.errors.push(this.messages.object);
                }
                break;

            case 'boolean':
                if (value != null && typeof value !== 'boolean') {
                    result.isValid = false;
                    result.errors.push(this.messages.boolean);
                }
                break;

            case 'trim':
                if (typeof value === 'string') {
                    result.sanitized = value.trim();
                }
                break;

            case 'lowercase':
                if (typeof value === 'string') {
                    result.sanitized = value.toLowerCase();
                }
                break;

            case 'uppercase':
                if (typeof value === 'string') {
                    result.sanitized = value.toUpperCase();
                }
                break;
        }
    }

    /**
     * Apply complex object rule
     */
    applyComplexRule(value, rule, result, context) {
        const { type, ...params } = rule;

        switch (type) {
            case 'minLength':
                if (value && value.length < params.min) {
                    result.isValid = false;
                    result.errors.push(this.messages.minLength.replace('{min}', params.min));
                }
                break;

            case 'maxLength':
                if (value && value.length > params.max) {
                    result.isValid = false;
                    result.errors.push(this.messages.maxLength.replace('{max}', params.max));
                }
                break;

            case 'min':
                if (value != null && Number(value) < params.min) {
                    result.isValid = false;
                    result.errors.push(this.messages.min.replace('{min}', params.min));
                }
                break;

            case 'max':
                if (value != null && Number(value) > params.max) {
                    result.isValid = false;
                    result.errors.push(this.messages.max.replace('{max}', params.max));
                }
                break;

            case 'oneOf':
                if (value != null && !params.values.includes(value)) {
                    result.isValid = false;
                    result.errors.push(this.messages.oneOf.replace('{values}', params.values.join(', ')));
                }
                break;

            case 'pattern':
                if (value && !params.regex.test(value)) {
                    result.isValid = false;
                    result.errors.push(params.message || this.messages.custom);
                }
                break;

            case 'equals':
                if (value !== params.value) {
                    result.isValid = false;
                    result.errors.push(params.message || `Must equal ${params.value}`);
                }
                break;

            case 'arrayOf':
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        const itemResult = this.validateValue(value[i], params.rules, { ...context, index: i });
                        if (!itemResult.isValid) {
                            result.isValid = false;
                            result.errors.push(`Item ${i}: ${itemResult.errors.join(', ')}`);
                        } else {
                            value[i] = itemResult.sanitized;
                        }
                    }
                    result.sanitized = value;
                }
                break;

            case 'objectOf':
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    for (const [key, val] of Object.entries(value)) {
                        const keyResult = this.validateValue(val, params.rules, { ...context, key });
                        if (!keyResult.isValid) {
                            result.isValid = false;
                            result.errors.push(`Property ${key}: ${keyResult.errors.join(', ')}`);
                        } else {
                            value[key] = keyResult.sanitized;
                        }
                    }
                    result.sanitized = value;
                }
                break;
        }
    }

    /**
     * Apply custom validation function
     */
    applyCustomRule(value, rule, result, context) {
        const customResult = rule(value, context);
        
        if (typeof customResult === 'boolean') {
            if (!customResult) {
                result.isValid = false;
                result.errors.push(this.messages.custom);
            }
        } else if (typeof customResult === 'object') {
            if (customResult.isValid === false) {
                result.isValid = false;
                result.errors.push(customResult.message || this.messages.custom);
            }
            if (customResult.sanitized !== undefined) {
                result.sanitized = customResult.sanitized;
            }
            if (customResult.warnings) {
                result.warnings.push(...customResult.warnings);
            }
        }
    }

    /**
     * Validate an object against a schema
     */
    static validateObject(obj, schema, options = {}) {
        const validator = new Validation();
        return validator.validateObjectAgainstSchema(obj, schema, options);
    }

    validateObjectAgainstSchema(obj, schema, options = {}) {
        const result = {
            isValid: true,
            errors: {},
            warnings: {},
            sanitized: { ...obj }
        };

        const { strict = false, stripUnknown = false } = options;

        // Validate known properties
        for (const [field, rules] of Object.entries(schema)) {
            const value = obj[field];
            const fieldResult = this.validateValue(value, rules, { field, object: obj });
            
            if (!fieldResult.isValid) {
                result.isValid = false;
                result.errors[field] = fieldResult.errors;
            }
            
            if (fieldResult.warnings.length > 0) {
                result.warnings[field] = fieldResult.warnings;
            }
            
            // Update sanitized object
            result.sanitized[field] = fieldResult.sanitized;
        }

        // Handle unknown properties
        if (strict || stripUnknown) {
            const knownFields = Object.keys(schema);
            const objFields = Object.keys(obj);
            const unknownFields = objFields.filter(field => !knownFields.includes(field));
            
            if (unknownFields.length > 0) {
                if (strict) {
                    result.isValid = false;
                    result.errors._unknown = [`Unknown fields: ${unknownFields.join(', ')}`];
                } else if (stripUnknown) {
                    unknownFields.forEach(field => {
                        delete result.sanitized[field];
                    });
                }
            }
        }

        return result;
    }

    /**
     * FFTCG-specific validation methods
     */
    static validateCard(card) {
        const validator = new Validation();
        return validator.validateCardData(card);
    }

    validateCardData(card) {
        const schema = {
            id: ['required', 'cardId'],
            name: ['required', { type: 'minLength', min: 1 }, { type: 'maxLength', max: 50 }],
            element: ['required', { type: 'oneOf', values: ['fire', 'ice', 'wind', 'lightning', 'water', 'earth', 'light', 'dark'] }],
            type: ['required', { type: 'oneOf', values: ['forward', 'backup', 'summon', 'monster'] }],
            cost: ['required', 'integer', { type: 'min', min: 0 }, { type: 'max', max: 15 }],
            power: [{ type: 'min', min: 0 }, { type: 'max', max: 20000 }],
            job: [{ type: 'maxLength', max: 30 }],
            category: [{ type: 'maxLength', max: 20 }],
            rarity: [{ type: 'oneOf', values: ['C', 'R', 'H', 'L'] }],
            text: [{ type: 'maxLength', max: 500 }]
        };

        return this.validateObjectAgainstSchema(card, schema);
    }

    static validateDeck(deck) {
        const validator = new Validation();
        return validator.validateDeckData(deck);
    }

    validateDeckData(deck) {
        const schema = {
            id: ['deckId'],
            name: ['required', 'deckName'],
            cards: ['required', 'array', { type: 'arrayOf', rules: ['cardId'] }],
            mainDeck: ['array', { type: 'arrayOf', rules: ['cardId'] }],
            lbDeck: ['array', { type: 'arrayOf', rules: ['cardId'] }],
            description: [{ type: 'maxLength', max: 200 }],
            tags: ['array', { type: 'arrayOf', rules: [{ type: 'maxLength', max: 20 }] }],
            isPublic: ['boolean']
        };

        const result = this.validateObjectAgainstSchema(deck, schema);

        // Additional FFTCG deck rules
        if (result.isValid && deck.cards) {
            // Check deck size (50 cards for main deck)
            if (deck.cards.length !== 50) {
                result.isValid = false;
                result.errors.cards = result.errors.cards || [];
                result.errors.cards.push(`Deck must contain exactly 50 cards (currently ${deck.cards.length})`);
            }

            // Check for too many copies of same card (max 3)
            const cardCounts = {};
            deck.cards.forEach(cardId => {
                cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
            });

            const violations = Object.entries(cardCounts).filter(([_, count]) => count > 3);
            if (violations.length > 0) {
                result.isValid = false;
                result.errors.cards = result.errors.cards || [];
                violations.forEach(([cardId, count]) => {
                    result.errors.cards.push(`Too many copies of card ${cardId}: ${count}/3 max`);
                });
            }
        }

        return result;
    }

    static validateGameState(gameState) {
        const validator = new Validation();
        return validator.validateGameStateData(gameState);
    }

    validateGameStateData(gameState) {
        const schema = {
            id: ['gameId'],
            mode: [{ type: 'oneOf', values: ['constructed', 'limited'] }],
            currentPlayer: ['integer', { type: 'oneOf', values: [0, 1] }],
            turnNumber: ['integer', { type: 'min', min: 1 }],
            currentPhase: [{ type: 'oneOf', values: ['active', 'draw', 'main1', 'attack', 'main2', 'end'] }],
            isActive: ['boolean'],
            players: ['required', 'array', { type: 'arrayOf', rules: ['object'] }]
        };

        return this.validateObjectAgainstSchema(gameState, schema);
    }

    /**
     * Sanitize user input
     */
    static sanitize(input, type = 'text') {
        const validator = new Validation();
        return validator.sanitizeInput(input, type);
    }

    sanitizeInput(input, type) {
        if (input == null) return input;

        switch (type) {
            case 'text':
                return String(input)
                    .trim()
                    .replace(/[<>]/g, '') // Remove basic HTML
                    .substring(0, 1000); // Limit length

            case 'html':
                // Basic HTML sanitization (in production, use a proper library like DOMPurify)
                return String(input)
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+="[^"]*"/gi, '');

            case 'username':
                return String(input)
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '')
                    .substring(0, 20);

            case 'number':
                const num = Number(input);
                return isNaN(num) ? 0 : num;

            case 'integer':
                return parseInt(input) || 0;

            case 'boolean':
                return Boolean(input);

            case 'cardId':
                return String(input)
                    .trim()
                    .replace(/[^a-zA-Z0-9\-_]/g, '');

            case 'deckName':
                return String(input)
                    .trim()
                    .substring(0, 50);

            default:
                return input;
        }
    }

    /**
     * Create custom validation rule
     */
    static createRule(name, validator, message) {
        const instance = new Validation();
        instance.addCustomRule(name, validator, message);
        return instance;
    }

    addCustomRule(name, validator, message) {
        // Add to simple rules
        this.messages[name] = message || this.messages.custom;
        
        // Store custom validator
        if (!this.customRules) {
            this.customRules = {};
        }
        this.customRules[name] = validator;

        logger.debug(`✅ Custom validation rule added: ${name}`);
    }

    /**
     * Validate with detailed context
     */
    static validateWithContext(data, rules, context) {
        const validator = new Validation();
        const result = validator.validateValue(data, rules, context);
        
        // Add context information to errors
        if (!result.isValid) {
            result.context = context;
            result.timestamp = new Date().toISOString();
        }

        return result;
    }

    /**
     * Batch validation
     */
    static validateBatch(items, rules) {
        const validator = new Validation();
        const results = [];
        let allValid = true;

        items.forEach((item, index) => {
            const result = validator.validateValue(item, rules, { index });
            results.push(result);
            if (!result.isValid) {
                allValid = false;
            }
        });

        return {
            isValid: allValid,
            results,
            summary: {
                total: items.length,
                valid: results.filter(r => r.isValid).length,
                invalid: results.filter(r => !r.isValid).length
            }
        };
    }
}

// Create shortcuts for common validations
export const validate = Validation.validate;
export const validateObject = Validation.validateObject;
export const validateCard = Validation.validateCard;
export const validateDeck = Validation.validateDeck;
export const validateGameState = Validation.validateGameState;
export const sanitize = Validation.sanitize;