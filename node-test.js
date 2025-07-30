#!/usr/bin/env node

/**
 * Node.js-compatible test runner for core FFTCG logic
 * Tests modules without DOM dependencies
 */

// Mock DOM environment for Node.js testing
const mockElement = {
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    addEventListener: () => {},
    removeChild: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    innerHTML: '',
    textContent: '',
    children: []
};

global.document = {
    createElement: () => mockElement,
    body: mockElement,
    head: mockElement,
    getElementById: () => mockElement,
    querySelector: () => mockElement,
    querySelectorAll: () => [mockElement]
};

global.window = {
    location: { hostname: 'localhost' },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};

async function runTests() {
    console.log('🧪 FFTCG Core Logic Tests (Node.js)\n');
    
    let passed = 0;
    let failed = 0;
    
    function test(name, fn) {
        try {
            const result = fn();
            if (result === true || result === undefined) {
                console.log(`✅ ${name}`);
                passed++;
            } else {
                console.log(`❌ ${name}: ${result}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
            failed++;
        }
    }
    
    try {
        // Test 1: Extended Card Database
        console.log('📚 Testing Card Database...');
        const { EXTENDED_CARD_DATA } = await import('./js/data/ExtendedCardDatabase.js');
        
        test('Card data loads', () => EXTENDED_CARD_DATA.length > 0);
        test('Has Terra card', () => EXTENDED_CARD_DATA.some(card => card.name === 'Terra'));
        test('All cards have required fields', () => {
            return EXTENDED_CARD_DATA.every(card => 
                card.id && card.name && card.element && card.type
            );
        });
        
        // Test 2: Validation (without DOM)
        console.log('\n🔍 Testing Validation...');
        const validationModule = await import('./js/utils/Validation.js');
        
        // Create minimal validation instance without DOM dependencies
        const testValidation = {
            validate: validationModule.validate
        };
        
        test('Email validation works', () => {
            const result = testValidation.validate('test@example.com', ['email']);
            return result.isValid === true;
        });
        
        test('Required validation works', () => {
            const result = testValidation.validate('', ['required']);
            return result.isValid === false;
        });
        
        test('Min length validation works', () => {
            const result = testValidation.validate('hi', [{ type: 'minLength', min: 5 }]);
            return result.isValid === false;
        });
        
        // Test 3: Card Database Logic
        console.log('\n🃏 Testing Card Database Logic...');
        const { CardDatabase } = await import('./js/core/CardDatabase.js');
        
        const db = new CardDatabase();
        db.loadCards(EXTENDED_CARD_DATA);
        
        test('Database loads cards', () => db.getAllCards().length === EXTENDED_CARD_DATA.length);
        test('Can find specific card', () => {
            const terra = db.getCard('ff1-001-h');
            return terra && terra.name === 'Terra';
        });
        test('Can search by element', () => {
            const fireCards = db.getCardsByElement('fire');
            return Array.isArray(fireCards) && fireCards.length > 0;
        });
        test('Can search by type', () => {
            const forwards = db.getCardsByType('forward');
            return Array.isArray(forwards) && forwards.length > 0;
        });
        
        // Test 4: Deck Manager Logic
        console.log('\n🎴 Testing Deck Manager Logic...');
        const { DeckManager } = await import('./js/core/DeckManager.js');
        
        const deckManager = new DeckManager();
        deckManager.setCardDatabase(db);
        
        const testDeck = deckManager.createNewDeck('Test Deck');
        test('Can create new deck', () => testDeck && testDeck.name === 'Test Deck');
        
        // Save the deck to make it loadable
        deckManager.saveDeck(testDeck);
        
        // Try adding a card (load the deck first)
        const terra = db.getCard('ff1-001-h');
        if (terra) {
            deckManager.loadDeck(testDeck.id);
            deckManager.addCard(terra.id);
            const loadedDeck = deckManager.currentDeck;
            test('Can add card to deck', () => loadedDeck.cards.length === 1);
        }
        
        // Test 5: Player Manager Logic
        console.log('\n👤 Testing Player Manager Logic...');
        const { PlayerManager } = await import('./js/core/PlayerManager.js');
        
        const playerManager = new PlayerManager();
        const profile = await playerManager.loadProfile();
        
        test('Player profile loads', () => profile && typeof profile.name === 'string' && profile.name.length > 0);
        test('Profile has default values', () => profile.rank === 'Novice');
        
        // Test profile update
        const updatedProfile = playerManager.updateProfile({ name: 'Test Player' });
        test('Can update profile', () => updatedProfile.name === 'Test Player');
        
    } catch (error) {
        console.log(`💥 Test error: ${error.message}`);
        console.log(error.stack);
        failed++;
    }
    
    // Summary
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`Success rate: ${passed > 0 ? ((passed / (passed + failed)) * 100).toFixed(1) : 0}%`);
    
    if (failed === 0) {
        console.log('🎉 All core logic tests passed!');
    } else {
        console.log('⚠️  Some tests failed. Check implementation.');
    }
    
    return { passed, failed };
}

// Run tests
runTests().catch(console.error);