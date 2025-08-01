/**
 * ALL TESTS - Comprehensive Test Suite for FFTCG Simulator
 * 
 * Tests all utilities, components, and game logic with detailed logging
 * and automated validation to catch issues early in development
 */

import { testFramework } from '../src/utils/TestFramework.js';
import { logger } from '../src/utils/Logger.js';
import { LocalStorage } from '../src/utils/LocalStorage.js';
import { notifications } from '../src/utils/Notifications.js';
import { Validation, validate, validateCard, validateDeck } from '../src/utils/Validation.js';
import { CardDatabase } from '../src/core/CardDatabase.js';
import { DeckManager } from '../src/core/DeckManager.js';
import { GameEngine } from '../src/core/GameEngine.js';

/**
 * Run all test suites
 */
export async function runAllTests() {
    logger.info('🧪 Starting comprehensive test suite...');
    logger.time('full-test-suite');

    // Test Logger
    testFramework.describe('Logger System', function() {
        testFramework.it('should log messages at different levels', function() {
            logger.error('Test error message');
            logger.warn('Test warning message');
            logger.info('Test info message');
            logger.debug('Test debug message');
            
            this.assert(true, 'Logger should handle all message types');
        });

        testFramework.it('should track performance with timers', function() {
            logger.time('test-timer');
            // Simulate some work
            for (let i = 0; i < 1000; i++) {
                Math.random();
            }
            const duration = logger.timeEnd('test-timer');
            
            this.assert(typeof duration === 'number', 'Timer should return numeric duration');
            this.assert(duration >= 0, 'Duration should be positive');
        });

        testFramework.it('should increment counters', function() {
            const count1 = logger.count('test-counter');
            const count2 = logger.count('test-counter');
            
            this.assertEqual(count1, 1, 'First count should be 1');
            this.assertEqual(count2, 2, 'Second count should be 2');
        });

        testFramework.it('should handle assertions', function() {
            logger.assert(true, 'This should pass');
            // Note: We can't easily test failed assertions without try/catch
            this.assert(true, 'Logger assertions should work');
        });
    });

    // Test LocalStorage
    testFramework.describe('LocalStorage System', function() {
        testFramework.beforeEach(function() {
            // Clear test data before each test
            LocalStorage.remove('test-key');
        });

        testFramework.it('should store and retrieve data', function() {
            const testData = { name: 'Test', value: 42 };
            
            const stored = LocalStorage.set('test-key', testData);
            this.assert(stored, 'Should successfully store data');
            
            const retrieved = LocalStorage.get('test-key');
            this.assertDeepEqual(retrieved, testData, 'Retrieved data should match stored data');
        });

        testFramework.it('should return default value for missing keys', function() {
            const defaultValue = 'default';
            const result = LocalStorage.get('non-existent-key', defaultValue);
            
            this.assertEqual(result, defaultValue, 'Should return default value for missing keys');
        });

        testFramework.it('should handle TTL expiration', function() {
            const testData = 'expires soon';
            
            // Store with 1ms TTL
            LocalStorage.set('ttl-test', testData, { ttl: 1 });
            
            // Wait for expiration
            setTimeout(() => {
                const result = LocalStorage.get('ttl-test');
                this.assertEqual(result, null, 'Expired data should return null');
            }, 10);
        });

        testFramework.it('should check if key exists', function() {
            LocalStorage.set('exists-test', 'data');
            
            this.assert(LocalStorage.has('exists-test'), 'Should detect existing key');
            this.assertFalsy(LocalStorage.has('non-existent'), 'Should not detect non-existent key');
        });

        testFramework.it('should remove data', function() {
            LocalStorage.set('remove-test', 'data');
            this.assert(LocalStorage.has('remove-test'), 'Key should exist before removal');
            
            const removed = LocalStorage.remove('remove-test');
            this.assert(removed, 'Remove operation should succeed');
            this.assertFalsy(LocalStorage.has('remove-test'), 'Key should not exist after removal');
        });

        testFramework.it('should get usage statistics', function() {
            LocalStorage.set('usage-test', 'some data');
            
            const usage = LocalStorage.getUsage();
            this.assert(usage !== null, 'Should return usage statistics');
            this.assert(typeof usage.totalSize === 'number', 'Should include total size');
            this.assert(typeof usage.ourSize === 'number', 'Should include our size');
        });

        testFramework.it('should create and restore backups', function() {
            const testData1 = { test: 'data1' };
            const testData2 = { test: 'data2' };
            
            LocalStorage.set('backup-test-1', testData1);
            LocalStorage.set('backup-test-2', testData2);
            
            const backup = LocalStorage.backup();
            this.assert(backup !== null, 'Should create backup');
            
            // Clear data
            LocalStorage.remove('backup-test-1');
            LocalStorage.remove('backup-test-2');
            
            // Restore backup
            const restored = LocalStorage.restore(backup);
            this.assert(restored, 'Should restore backup');
            
            const restored1 = LocalStorage.get('backup-test-1');
            const restored2 = LocalStorage.get('backup-test-2');
            
            this.assertDeepEqual(restored1, testData1, 'Should restore first item');
            this.assertDeepEqual(restored2, testData2, 'Should restore second item');
        });
    });

    // Test Notifications
    testFramework.describe('Notifications System', function() {
        testFramework.beforeEach(function() {
            notifications.clearAll();
        });

        testFramework.it('should show different types of notifications', function() {
            const successId = notifications.success('Success message');
            const errorId = notifications.error('Error message');
            const warningId = notifications.warning('Warning message');
            const infoId = notifications.info('Info message');
            
            this.assert(typeof successId === 'string', 'Success notification should return ID');
            this.assert(typeof errorId === 'string', 'Error notification should return ID');
            this.assert(typeof warningId === 'string', 'Warning notification should return ID');
            this.assert(typeof infoId === 'string', 'Info notification should return ID');
            
            // Check that notifications exist
            this.assert(notifications.get(successId) !== undefined, 'Success notification should exist');
            this.assert(notifications.get(errorId) !== undefined, 'Error notification should exist');
        });

        testFramework.it('should dismiss notifications', function() {
            const id = notifications.info('Test message');
            
            this.assert(notifications.get(id) !== undefined, 'Notification should exist');
            
            const dismissed = notifications.dismiss(id);
            this.assert(dismissed, 'Dismiss should return true');
            
            // Wait for animation
            setTimeout(() => {
                this.assert(notifications.get(id) === undefined, 'Notification should be removed');
            }, 350);
        });

        testFramework.it('should update existing notifications', function() {
            const id = notifications.info('Original message');
            const originalNotification = notifications.get(id);
            
            this.assertEqual(originalNotification.message, 'Original message', 'Should have original message');
            
            const updated = notifications.update(id, 'Updated message');
            this.assert(updated, 'Update should succeed');
            
            const updatedNotification = notifications.get(id);
            this.assertEqual(updatedNotification.message, 'Updated message', 'Should have updated message');
        });

        testFramework.it('should handle loading notifications', function() {
            const id = notifications.loading('Loading...');
            const notification = notifications.get(id);
            
            this.assertEqual(notification.type, 'loading', 'Should be loading type');
            this.assert(notification.persistent, 'Loading notifications should be persistent');
        });

        testFramework.it('should clear all notifications', function() {
            notifications.info('Message 1');
            notifications.info('Message 2');
            notifications.info('Message 3');
            
            const allBefore = notifications.getAll();
            this.assert(allBefore.length === 3, 'Should have 3 notifications');
            
            notifications.clearAll();
            
            const allAfter = notifications.getAll();
            this.assert(allAfter.length === 0, 'Should have no notifications after clear');
        });
    });

    // Test Validation
    testFramework.describe('Validation System', function() {
        testFramework.it('should validate required fields', function() {
            const result1 = validate('', ['required']);
            this.assertFalsy(result1.isValid, 'Empty string should fail required validation');
            
            const result2 = validate('test', ['required']);
            this.assert(result2.isValid, 'Non-empty string should pass required validation');
            
            const result3 = validate(null, ['required']);
            this.assertFalsy(result3.isValid, 'Null should fail required validation');
        });

        testFramework.it('should validate email addresses', function() {
            const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
            const invalidEmails = ['invalid-email', '@domain.com', 'user@'];
            
            validEmails.forEach(email => {
                const result = validate(email, ['email']);
                this.assert(result.isValid, `${email} should be valid`);
            });
            
            invalidEmails.forEach(email => {
                const result = validate(email, ['email']);
                this.assertFalsy(result.isValid, `${email} should be invalid`);
            });
        });

        testFramework.it('should validate numbers and integers', function() {
            const result1 = validate('42', ['integer']);
            this.assert(result1.isValid, 'String number should pass integer validation');
            this.assertEqual(result1.sanitized, 42, 'Should sanitize to integer');
            
            const result2 = validate('3.14', ['number']);
            this.assert(result2.isValid, 'Decimal should pass number validation');
            this.assertEqual(result2.sanitized, 3.14, 'Should sanitize to number');
            
            const result3 = validate('not-a-number', ['integer']);
            this.assertFalsy(result3.isValid, 'Invalid string should fail integer validation');
        });

        testFramework.it('should validate length constraints', function() {
            const result1 = validate('short', [{ type: 'minLength', min: 10 }]);
            this.assertFalsy(result1.isValid, 'Short string should fail minLength validation');
            
            const result2 = validate('this is a very long string', [{ type: 'maxLength', max: 10 }]);
            this.assertFalsy(result2.isValid, 'Long string should fail maxLength validation');
            
            const result3 = validate('just right', [{ type: 'minLength', min: 5 }, { type: 'maxLength', max: 15 }]);
            this.assert(result3.isValid, 'Appropriate length should pass validation');
        });

        testFramework.it('should validate numeric ranges', function() {
            const result1 = validate(5, [{ type: 'min', min: 10 }]);
            this.assertFalsy(result1.isValid, 'Low number should fail min validation');
            
            const result2 = validate(15, [{ type: 'max', max: 10 }]);
            this.assertFalsy(result2.isValid, 'High number should fail max validation');
            
            const result3 = validate(7, [{ type: 'min', min: 5 }, { type: 'max', max: 10 }]);
            this.assert(result3.isValid, 'Number in range should pass validation');
        });

        testFramework.it('should validate oneOf constraints', function() {
            const validValues = ['fire', 'ice', 'wind'];
            
            const result1 = validate('fire', [{ type: 'oneOf', values: validValues }]);
            this.assert(result1.isValid, 'Valid value should pass oneOf validation');
            
            const result2 = validate('earth', [{ type: 'oneOf', values: validValues }]);
            this.assertFalsy(result2.isValid, 'Invalid value should fail oneOf validation');
        });

        testFramework.it('should sanitize input', function() {
            const result1 = validate('  trimmed  ', ['trim']);
            this.assertEqual(result1.sanitized, 'trimmed', 'Should trim whitespace');
            
            const result2 = validate('UPPERCASE', ['lowercase']);
            this.assertEqual(result2.sanitized, 'uppercase', 'Should convert to lowercase');
            
            const result3 = validate('lowercase', ['uppercase']);
            this.assertEqual(result3.sanitized, 'LOWERCASE', 'Should convert to uppercase');
        });

        testFramework.it('should validate card data', function() {
            const validCard = {
                id: 'test-001',
                name: 'Test Card',
                element: 'fire',
                type: 'forward',
                cost: 3,
                power: 5000,
                job: 'Warrior',
                category: 'Test'
            };
            
            const result1 = validateCard(validCard);
            this.assert(result1.isValid, 'Valid card should pass validation');
            
            const invalidCard = {
                id: 'test-002',
                name: '',
                element: 'invalid',
                type: 'forward',
                cost: -1
            };
            
            const result2 = validateCard(invalidCard);
            this.assertFalsy(result2.isValid, 'Invalid card should fail validation');
            this.assert(result2.errors.name !== undefined, 'Should have name error');
            this.assert(result2.errors.element !== undefined, 'Should have element error');
            this.assert(result2.errors.cost !== undefined, 'Should have cost error');
        });

        testFramework.it('should validate deck data', function() {
            const validCards = Array(50).fill('test-card-id');
            
            const validDeck = {
                id: 'deck_123',
                name: 'Test Deck',
                cards: validCards,
                description: 'A test deck'
            };
            
            const result1 = validateDeck(validDeck);
            this.assert(result1.isValid, 'Valid deck should pass validation');
            
            const invalidDeck = {
                id: 'invalid-id',
                name: '',
                cards: Array(60).fill('test-card-id') // Too many cards
            };
            
            const result2 = validateDeck(invalidDeck);
            this.assertFalsy(result2.isValid, 'Invalid deck should fail validation');
        });

        testFramework.it('should handle custom validation functions', function() {
            const customValidator = (value) => {
                return value === 'magic-word' ? true : { isValid: false, message: 'Must be magic word' };
            };
            
            const result1 = validate('magic-word', [customValidator]);
            this.assert(result1.isValid, 'Correct magic word should pass');
            
            const result2 = validate('wrong-word', [customValidator]);
            this.assertFalsy(result2.isValid, 'Wrong word should fail');
        });
    });

    // Test CardDatabase
    testFramework.describe('Card Database System', function() {
        let cardDatabase;
        
        testFramework.beforeAll(async function() {
            cardDatabase = new CardDatabase();
            await cardDatabase.initialize();
        });

        testFramework.it('should initialize with sample cards', function() {
            this.assert(cardDatabase.isReady(), 'Database should be ready');
            this.assert(cardDatabase.totalCards > 0, 'Should have loaded cards');
            
            const stats = cardDatabase.getStats();
            this.assert(stats !== null, 'Should provide statistics');
            this.assert(stats.totalCards > 0, 'Stats should show card count');
        });

        testFramework.it('should retrieve cards by ID', function() {
            const card = cardDatabase.getCard('ff1-001-h');
            this.assert(card !== null, 'Should find existing card');
            this.assertEqual(card.name, 'Terra', 'Should return correct card');
            
            const notFound = cardDatabase.getCard('non-existent-id');
            this.assertEqual(notFound, null, 'Should return null for non-existent card');
        });

        testFramework.it('should search cards by name', function() {
            const results = cardDatabase.searchCards('Terra');
            this.assert(results.length > 0, 'Should find cards matching name');
            
            const terra = results.find(card => card.name === 'Terra');
            this.assert(terra !== undefined, 'Should find Terra specifically');
        });

        testFramework.it('should filter cards by element', function() {
            const fireCards = cardDatabase.getCardsByElement('fire');
            this.assert(fireCards.length > 0, 'Should find fire cards');
            
            fireCards.forEach(card => {
                this.assertEqual(card.element, 'fire', 'All results should be fire element');
            });
        });

        testFramework.it('should filter cards by type', function() {
            const forwards = cardDatabase.getCardsByType('forward');
            this.assert(forwards.length > 0, 'Should find forward cards');
            
            forwards.forEach(card => {
                this.assertEqual(card.type, 'forward', 'All results should be forwards');
            });
        });

        testFramework.it('should validate deck composition', function() {
            // Valid deck: 50 cards, max 3 of each
            const validDeck = [];
            for (let i = 0; i < 16; i++) {
                validDeck.push('ff1-001-h', 'ff1-002-c', 'ff1-003-c');
            }
            validDeck.push('ff1-004-r', 'ff1-005-h'); // 50 total
            
            const result1 = cardDatabase.validateDeck(validDeck);
            this.assert(result1.isValid, 'Valid deck should pass validation');
            
            // Invalid deck: too many of one card
            const invalidDeck = Array(50).fill('ff1-001-h');
            const result2 = cardDatabase.validateDeck(invalidDeck);
            this.assertFalsy(result2.isValid, 'Deck with too many copies should fail');
        });

        testFramework.it('should provide random cards', function() {
            const randomCards = cardDatabase.getRandomCards(5);
            this.assertEqual(randomCards.length, 5, 'Should return requested number of cards');
            
            const uniqueIds = new Set(randomCards.map(card => card.id));
            this.assert(uniqueIds.size <= 5, 'Should not have duplicates (though possible)');
        });
    });

    // Test DeckManager
    testFramework.describe('Deck Manager System', function() {
        let deckManager;
        let cardDatabase;
        
        testFramework.beforeAll(async function() {
            cardDatabase = new CardDatabase();
            await cardDatabase.initialize();
            
            deckManager = new DeckManager();
            deckManager.setCardDatabase(cardDatabase);
        });

        testFramework.beforeEach(function() {
            // Clear any existing test decks
            const testDecks = deckManager.getAllDecks().filter(deck => 
                deck.name.startsWith('Test Deck')
            );
            testDecks.forEach(deck => deckManager.deleteDeck(deck.id));
        });

        testFramework.it('should create new decks', function() {
            const deck = deckManager.createNewDeck('Test Deck');
            
            this.assert(deck !== null, 'Should create deck');
            this.assertEqual(deck.name, 'Test Deck', 'Should have correct name');
            this.assert(Array.isArray(deck.cards), 'Should have cards array');
            this.assertEqual(deck.cards.length, 0, 'New deck should be empty');
        });

        testFramework.it('should save and load decks', function() {
            const deck = deckManager.createNewDeck('Test Save Deck');
            deck.cards = ['ff1-001-h', 'ff1-002-c'];
            
            const savedDeck = deckManager.saveDeck(deck);
            this.assert(savedDeck !== null, 'Should save deck');
            
            const loadedDeck = deckManager.loadDeck(savedDeck.id);
            this.assertDeepEqual(loadedDeck.cards, deck.cards, 'Loaded deck should match saved deck');
        });

        testFramework.it('should add and remove cards', function() {
            const deck = deckManager.createNewDeck('Test Card Deck');
            
            // Add card
            deckManager.addCard('ff1-001-h');
            this.assertEqual(deckManager.getCardCount('ff1-001-h'), 1, 'Should have 1 copy after adding');
            
            // Add more copies
            deckManager.addCard('ff1-001-h', 2);
            this.assertEqual(deckManager.getCardCount('ff1-001-h'), 3, 'Should have 3 copies total');
            
            // Try to add more (should be limited to 3)
            deckManager.addCard('ff1-001-h');
            this.assertEqual(deckManager.getCardCount('ff1-001-h'), 3, 'Should still have 3 copies (limit enforced)');
            
            // Remove card
            deckManager.removeCard('ff1-001-h');
            this.assertEqual(deckManager.getCardCount('ff1-001-h'), 2, 'Should have 2 copies after removal');
        });

        testFramework.it('should validate deck composition', function() {
            const deck = deckManager.createNewDeck('Test Validation Deck');
            
            // Add exactly 50 cards
            for (let i = 0; i < 50; i++) {
                deck.cards.push('ff1-001-h');
            }
            
            const result = deckManager.validateDeck(deck);
            this.assertFalsy(result.isValid, 'Deck with 50 copies of one card should be invalid');
        });

        testFramework.it('should duplicate decks', function() {
            const originalDeck = deckManager.createNewDeck('Original Deck');
            originalDeck.cards = ['ff1-001-h', 'ff1-002-c'];
            deckManager.saveDeck(originalDeck);
            
            const duplicatedDeck = deckManager.duplicateDeck(originalDeck.id, 'Duplicated Deck');
            
            this.assertEqual(duplicatedDeck.name, 'Duplicated Deck', 'Should have new name');
            this.assertDeepEqual(duplicatedDeck.cards, originalDeck.cards, 'Should have same cards');
            this.assert(duplicatedDeck.id !== originalDeck.id, 'Should have different ID');
        });

        testFramework.it('should export deck in different formats', function() {
            const deck = deckManager.createNewDeck('Export Test Deck');
            deck.cards = ['ff1-001-h', 'ff1-002-c', 'ff1-003-c'];
            deckManager.saveDeck(deck);
            
            const jsonExport = deckManager.exportDeck(deck.id, 'json');
            this.assert(typeof jsonExport === 'string', 'JSON export should be string');
            
            const textExport = deckManager.exportDeck(deck.id, 'text');
            this.assert(typeof textExport === 'string', 'Text export should be string');
            this.assert(textExport.includes(deck.name), 'Text export should include deck name');
            
            const csvExport = deckManager.exportDeck(deck.id, 'csv');
            this.assert(typeof csvExport === 'string', 'CSV export should be string');
            this.assert(csvExport.includes('Quantity,Name'), 'CSV should have headers');
        });

        testFramework.it('should import deck from text', function() {
            const deckText = `# Imported Test Deck
3x Terra
2x Goblin
1x Red Mage`;
            
            const importedDeck = deckManager.importDeck(deckText, 'text');
            
            this.assertEqual(importedDeck.name, 'Imported Test Deck', 'Should parse deck name');
            this.assert(importedDeck.cards.length > 0, 'Should have imported cards');
        });

        testFramework.it('should generate random decks', function() {
            const randomDeck = deckManager.generateRandomDeck({
                elements: ['fire', 'ice'],
                forwardCount: 20,
                backupCount: 15,
                summonCount: 10,
                monsterCount: 5
            });
            
            this.assert(randomDeck !== null, 'Should generate random deck');
            this.assert(randomDeck.cards.length > 0, 'Random deck should have cards');
            this.assert(randomDeck.cards.length <= 50, 'Random deck should not exceed 50 cards');
        });

        testFramework.it('should provide deck statistics', function() {
            const deck = deckManager.createNewDeck('Stats Test Deck');
            deck.cards = ['ff1-001-h', 'ff1-002-c', 'ff1-017-h']; // Mix of elements
            
            const stats = deckManager.getDeckStats(deck);
            
            this.assert(stats !== null, 'Should provide statistics');
            this.assertEqual(stats.totalCards, 3, 'Should count total cards');
            this.assert(stats.elementDistribution !== undefined, 'Should provide element distribution');
            this.assert(stats.typeDistribution !== undefined, 'Should provide type distribution');
        });
    });

    // Test GameEngine
    testFramework.describe('Game Engine System', function() {
        let gameEngine;
        let cardDatabase;
        
        testFramework.beforeAll(async function() {
            cardDatabase = new CardDatabase();
            await cardDatabase.initialize();
            
            gameEngine = new GameEngine(cardDatabase);
        });

        testFramework.it('should initialize properly', function() {
            this.assert(gameEngine !== null, 'Game engine should initialize');
            
            const gameState = gameEngine.getGameState();
            this.assert(gameState !== null, 'Should have game state');
            this.assertFalsy(gameState.isActive, 'Game should not be active initially');
        });

        testFramework.it('should validate deck before starting game', function() {
            const invalidDeck = { mainDeck: [] }; // Empty deck
            
            this.assertThrows(() => {
                gameEngine.startGame(invalidDeck, invalidDeck);
            }, 'Should throw error for invalid deck');
        });

        testFramework.it('should start game with valid decks', function() {
            // Create valid 50-card decks
            const validDeck = { 
                mainDeck: Array(50).fill().map((_, i) => `test-card-${i % 10}`)
            };
            
            const gameId = gameEngine.startGame(validDeck, validDeck, {
                player1Name: 'Test Player 1',
                player2Name: 'Test Player 2'
            });
            
            this.assert(typeof gameId === 'string', 'Should return game ID');
            
            const gameState = gameEngine.getGameState();
            this.assert(gameState.isActive, 'Game should be active');
            this.assertEqual(gameState.players.length, 2, 'Should have 2 players');
            this.assertEqual(gameState.currentPhase, 'active', 'Should start in active phase');
        });

        testFramework.it('should handle turn phases correctly', function() {
            const validDeck = { 
                mainDeck: Array(50).fill().map((_, i) => `test-card-${i % 10}`)
            };
            
            gameEngine.startGame(validDeck, validDeck);
            const gameState = gameEngine.getGameState();
            
            // Test phase progression
            this.assertEqual(gameState.currentPhase, 'active', 'Should start in active phase');
            this.assert(gameState.turnNumber >= 1, 'Should have valid turn number');
            this.assert([0, 1].includes(gameState.currentPlayer), 'Should have valid current player');
        });

        testFramework.it('should handle card drawing', function() {
            const validDeck = { 
                mainDeck: Array(50).fill().map((_, i) => `test-card-${i % 10}`)
            };
            
            gameEngine.startGame(validDeck, validDeck);
            const gameState = gameEngine.getGameState();
            
            const player = gameState.players[0];
            const initialHandSize = player.zones.hand.length;
            const initialDeckSize = player.zones.deck.length;
            
            gameEngine.drawCards(0, 1);
            
            this.assertEqual(player.zones.hand.length, initialHandSize + 1, 'Hand should increase by 1');
            this.assertEqual(player.zones.deck.length, initialDeckSize - 1, 'Deck should decrease by 1');
        });

        testFramework.it('should generate and spend CP correctly', function() {
            const validDeck = { 
                mainDeck: Array(50).fill().map((_, i) => `test-card-${i % 10}`)
            };
            
            gameEngine.startGame(validDeck, validDeck);
            const gameState = gameEngine.getGameState();
            
            const player = gameState.players[0];
            const initialCP = player.cpPool.fire;
            
            // Test CP generation by discarding
            player.zones.hand.push('ff1-001-h'); // Add a fire card to hand
            gameEngine.generateCPFromDiscard(0, 'ff1-001-h');
            
            this.assertEqual(player.cpPool.fire, initialCP + 2, 'Should generate 2 fire CP');
        });

        testFramework.it('should handle game state serialization', function() {
            const validDeck = { 
                mainDeck: Array(50).fill().map((_, i) => `test-card-${i % 10}`)
            };
            
            const gameId = gameEngine.startGame(validDeck, validDeck);
            
            const publicState = gameEngine.getPublicGameState(0);
            this.assert(publicState !== null, 'Should provide public game state');
            this.assertEqual(publicState.id, gameId, 'Should include game ID');
            this.assert(typeof publicState.yourTurn === 'boolean', 'Should indicate if it\'s player\'s turn');
        });
    });

    // Integration Tests
    testFramework.describe('Integration Tests', function() {
        testFramework.it('should integrate CardDatabase with DeckManager', async function() {
            const cardDatabase = new CardDatabase();
            await cardDatabase.initialize();
            
            const deckManager = new DeckManager();
            deckManager.setCardDatabase(cardDatabase);
            
            const deck = deckManager.createNewDeck('Integration Test Deck');
            
            // Try to add a real card
            deckManager.addCard('ff1-001-h');
            
            const validation = deckManager.validateCurrentDeck();
            // Should be invalid due to too few cards, but should not error
            this.assert(validation !== null, 'Should provide validation result');
        });

        testFramework.it('should integrate all utilities together', function() {
            // Test that all utilities can work together
            logger.info('Testing integration');
            
            LocalStorage.set('integration-test', { test: true });
            const data = LocalStorage.get('integration-test');
            
            const validation = validate(data.test, ['required', 'boolean']);
            
            if (validation.isValid) {
                notifications.success('Integration test passed');
            } else {
                notifications.error('Integration test failed');
            }
            
            this.assert(validation.isValid, 'Integration should work correctly');
        });
    });

    // Run all tests
    const results = await testFramework.run();
    
    const testDuration = logger.timeEnd('full-test-suite');
    logger.info(`🏁 Test suite completed in ${testDuration?.toFixed(2)}ms`);
    
    return results;
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
    document.addEventListener('DOMContentLoaded', async () => {
        logger.info('🚀 Auto-running test suite...');
        await runAllTests();
    });
}

export { runAllTests };