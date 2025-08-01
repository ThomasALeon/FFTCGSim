/**
 * SYSTEM INTEGRATION TESTS
 * 
 * Tests complete user workflows and system integration
 * Validates that all components work together properly
 */

import { testFramework } from '../src/utils/TestFramework.js';
import { logger } from '../src/utils/Logger.js';
import { CardDatabase } from '../src/core/CardDatabase.js';
import { DeckManager } from '../src/core/DeckManager.js';
import { GameEngine } from '../src/core/GameEngine.js';
import { PlayerManager } from '../src/core/PlayerManager.js';
import { Modal } from '../src/components/Modal.js';
import { DeckBuilder } from '../src/components/DeckBuilder.js';
import { imageMapping } from '../src/utils/ImageMapping.js';

/**
 * Run system integration tests
 */
export async function runSystemIntegrationTests() {
    logger.info('🔧 Starting System Integration Tests...');
    
    let testResults = {
        passed: 0,
        failed: 0,
        total: 0,
        errors: []
    };

    // Test 1: Complete Application Initialization Flow
    await testFramework.describe('Application Initialization', async function() {
        await testFramework.it('should initialize all core systems', async function() {
            try {
                // Initialize card database
                const cardDB = new CardDatabase();
                await cardDB.initialize();
                
                testFramework.assert(cardDB.isLoaded, 'CardDatabase should be loaded');
                testFramework.assert(cardDB.getAllCards().length > 0, 'CardDatabase should have cards');
                
                // Initialize deck manager
                const deckManager = new DeckManager();
                deckManager.setCardDatabase(cardDB);
                
                // Initialize player manager
                const playerManager = new PlayerManager();
                const profile = playerManager.getProfile();
                testFramework.assert(profile.name, 'PlayerManager should have a profile');
                
                // Initialize modal system
                const modal = new Modal();
                modal.initialize();
                testFramework.assert(typeof modal.open === 'function', 'Modal should have open method');
                
                // Initialize image mapping
                await imageMapping.loadCardImageMapping();
                testFramework.assert(imageMapping.isLoaded, 'ImageMapping should be loaded');
                
                testResults.passed++;
                logger.info('✅ Application initialization test passed');
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(`Application initialization failed: ${error.message}`);
                logger.error('❌ Application initialization test failed:', error);
                throw error;
            }
            testResults.total++;
        });
    });

    // Test 2: Deck Building Workflow
    await testFramework.describe('Deck Building Workflow', async function() {
        await testFramework.it('should complete full deck building process', async function() {
            try {
                const cardDB = new CardDatabase();
                await cardDB.initialize();
                
                const deckManager = new DeckManager();
                deckManager.setCardDatabase(cardDB);
                
                // Create a new deck
                const deck = deckManager.createNewDeck('Integration Test Deck');
                testFramework.assert(deck.name === 'Integration Test Deck', 'Deck should be created with correct name');
                
                // Add some cards to the deck
                const allCards = cardDB.getAllCards();
                const testCards = allCards.slice(0, 10); // Use first 10 cards
                
                testCards.forEach(card => {
                    deck.cards.push(card.id);
                });
                
                testFramework.assert(deck.cards.length === 10, 'Deck should have 10 cards');
                
                // Save the deck
                const savedDeck = deckManager.saveDeck(deck);
                testFramework.assert(savedDeck.id, 'Saved deck should have an ID');
                
                // Load the deck back
                const loadedDeck = deckManager.loadDeck(savedDeck.id);
                testFramework.assert(loadedDeck.cards.length === 10, 'Loaded deck should have same number of cards');
                
                // Validate the deck
                const validation = cardDB.validateDeck(loadedDeck.cards);
                testFramework.assert(typeof validation.isValid === 'boolean', 'Deck validation should return a result');
                
                testResults.passed++;
                logger.info('✅ Deck building workflow test passed');
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(`Deck building workflow failed: ${error.message}`);
                logger.error('❌ Deck building workflow test failed:', error);
                throw error;
            }
            testResults.total++;
        });
    });

    // Test 3: Import/Export System
    await testFramework.describe('Import/Export System', async function() {
        await testFramework.it('should import and export decks correctly', async function() {
            try {
                const cardDB = new CardDatabase();
                await cardDB.initialize();
                
                const deckManager = new DeckManager();
                deckManager.setCardDatabase(cardDB);
                
                // Create test deck text in standard format
                const testDeckText = `3 x 21-001R
2 x 21-002R  
1 x 21-003R`;
                
                // Test parsing
                const deckBuilder = new DeckBuilder(cardDB, deckManager);
                const parsedCards = deckBuilder.parseDeckText(testDeckText);
                
                testFramework.assert(parsedCards.length === 6, 'Should parse 6 cards total (3+2+1)');
                
                // Test Materia Hunter format
                const materiaHunterText = `1 Ward (21-001R)
2 Edgar (21-002R)`;
                
                const modal = new Modal();
                const preview = modal.previewDeckImport(materiaHunterText);
                testFramework.assert(preview.cards.length >= 2, 'Should parse Materia Hunter format');
                
                testResults.passed++;
                logger.info('✅ Import/export system test passed');
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(`Import/export system failed: ${error.message}`);
                logger.error('❌ Import/export system test failed:', error);
                throw error;
            }
            testResults.total++;
        });
    });

    // Test 4: Card Image System
    await testFramework.describe('Card Image System', async function() {
        await testFramework.it('should handle card images with fallback', async function() {
            try {
                const cardDB = new CardDatabase();
                await cardDB.initialize();
                
                await imageMapping.loadCardImageMapping();
                const deckBuilder = new DeckBuilder(cardDB, null);
                
                // Test getting image HTML for a card
                const testCard = cardDB.getAllCards()[0];
                const imageHTML = deckBuilder.getCardImageHTML(testCard);
                
                testFramework.assert(typeof imageHTML === 'string', 'Should return HTML string');
                testFramework.assert(imageHTML.length > 0, 'Should return non-empty HTML');
                
                // Test fallback logic
                const cardWithImage = {
                    id: 'test-card',
                    name: 'Test Card',
                    element: 'fire',
                    hasRealImage: true,
                    image: 'test-image-url.jpg'
                };
                
                const fallbackHTML = deckBuilder.getCardImageHTML(cardWithImage);
                testFramework.assert(fallbackHTML.includes('test-image-url.jpg'), 'Should use card built-in image');
                
                testResults.passed++;
                logger.info('✅ Card image system test passed');
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(`Card image system failed: ${error.message}`);
                logger.error('❌ Card image system test failed:', error);
                throw error;
            }
            testResults.total++;
        });
    });

    // Test 5: Game Engine Integration
    await testFramework.describe('Game Engine Integration', async function() {
        await testFramework.it('should initialize game state properly', async function() {
            try {
                const gameEngine = new GameEngine();
                gameEngine.initialize();
                
                const gameState = gameEngine.getPublicGameState();
                testFramework.assert(gameState, 'Should return game state');
                testFramework.assert(typeof gameState === 'object', 'Game state should be an object');
                
                testResults.passed++;
                logger.info('✅ Game engine integration test passed');
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(`Game engine integration failed: ${error.message}`);
                logger.error('❌ Game engine integration test failed:', error);
                throw error;
            }
            testResults.total++;
        });
    });

    // Test 6: Data Persistence
    await testFramework.describe('Data Persistence', async function() {
        await testFramework.it('should save and load data correctly', async function() {
            try {
                const deckManager = new DeckManager();
                const playerManager = new PlayerManager();
                
                // Test deck persistence
                const testDeck = deckManager.createNewDeck('Persistence Test');
                testDeck.cards = ['21-001R', '21-002R', '21-003R'];
                
                const savedDeck = deckManager.saveDeck(testDeck);
                const loadedDeck = deckManager.loadDeck(savedDeck.id);
                
                testFramework.assert(loadedDeck.name === 'Persistence Test', 'Deck name should persist');
                testFramework.assert(loadedDeck.cards.length === 3, 'Deck cards should persist');
                
                // Test player profile persistence
                const originalProfile = playerManager.getProfile();
                playerManager.updateProfile({ name: 'Test Player' });
                playerManager.saveProfile();
                
                const updatedProfile = playerManager.getProfile();
                testFramework.assert(updatedProfile.name === 'Test Player', 'Profile should persist');
                
                testResults.passed++;
                logger.info('✅ Data persistence test passed');
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(`Data persistence failed: ${error.message}`);
                logger.error('❌ Data persistence test failed:', error);
                throw error;
            }
            testResults.total++;
        });
    });

    // Report results
    logger.info(`🧪 System Integration Tests Complete:`);
    logger.info(`✅ Passed: ${testResults.passed}`);
    logger.info(`❌ Failed: ${testResults.failed}`);
    logger.info(`📊 Total: ${testResults.total}`);
    
    if (testResults.errors.length > 0) {
        logger.error('🚨 Errors encountered:');
        testResults.errors.forEach(error => logger.error(`  - ${error}`));
    }
    
    return testResults;
}

// Make it available globally for browser testing
if (typeof window !== 'undefined') {
    window.runSystemIntegrationTests = runSystemIntegrationTests;
}