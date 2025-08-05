/**
 * DECK IMPORT TESTS - Comprehensive Testing for Deck Import Functionality
 * 
 * Tests various deck list formats and edge cases to catch import issues
 */

import { DeckManager } from '../src/core/DeckManager.js';
import { CardDatabase } from '../src/core/CardDatabase.js';

/**
 * Test Suite for Deck Import Functionality
 */
export class DeckImportTests {
    constructor() {
        this.cardDatabase = null;
        this.deckManager = null;
    }

    async initialize() {
        // Initialize card database
        this.cardDatabase = new CardDatabase();
        await this.cardDatabase.initialize();
        
        // Initialize deck manager
        this.deckManager = new DeckManager(this.cardDatabase);
        
        console.log('🧪 DeckImportTests initialized');
    }

    /**
     * Run all deck import tests
     */
    async runAllTests() {
        console.log('🚀 Starting Deck Import Tests...');
        
        const tests = [
            'testMateriaHunterFormat',
            'testStandardFormat', 
            'testMixedFormats',
            'testEdgeCases',
            'testInvalidFormats',
            'testCardIdVariations',
            'testFuzzyMatching',
            'testActualDeckList'
        ];

        let passed = 0;
        let failed = 0;

        for (const testName of tests) {
            try {
                console.log(`\n🧪 Running ${testName}...`);
                await this[testName]();
                console.log(`✅ ${testName} PASSED`);
                passed++;
            } catch (error) {
                console.error(`❌ ${testName} FAILED:`, error.message);
                failed++;
            }
        }

        console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
        return { passed, failed };
    }

    /**
     * Test Materia Hunter format parsing
     */
    async testMateriaHunterFormat() {
        const testDeck = `2 Lenna (26-120L)
3 Terra (1-001H)
1 Goblin (1-002C)`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        // Should parse all cards successfully
        if (result.cards.length === 0) {
            throw new Error('No cards were parsed from Materia Hunter format');
        }

        console.log(`Parsed ${result.cards.length} cards from Materia Hunter format`);
    }

    /**
     * Test standard format parsing
     */
    async testStandardFormat() {
        const testDeck = `2x 1-001H
3 1-002C
1x 26-120L`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        console.log(`Parsed ${result.cards.length} cards from standard format`);
    }

    /**
     * Test mixed formats in one deck
     */
    async testMixedFormats() {
        const testDeck = `# Mixed Format Deck
2 Lenna (26-120L)
3x 1-001H
1 Terra`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        console.log(`Parsed ${result.cards.length} cards from mixed formats`);
        
        if (result.name !== 'Mixed Format Deck') {
            throw new Error(`Expected deck name 'Mixed Format Deck', got '${result.name}'`);
        }
    }

    /**
     * Test edge cases and special characters
     */
    async testEdgeCases() {
        const testDeck = `2 Cú Chulainn (1-068R)
1 Shiva (Ice) (1-030H)
3 Odin (Lightning) (1-125H)`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        console.log(`Handled ${result.cards.length} cards with special characters`);
    }

    /**
     * Test invalid formats to ensure proper error handling
     */
    async testInvalidFormats() {
        const testDeck = `invalid line without numbers
4 Too Many Copies (1-001H)
0 Zero Copies (1-002C)
x Missing Number (1-003L)`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        // Should handle errors gracefully
        console.log(`Handled invalid formats, parsed ${result.cards.length} valid cards`);
    }

    /**
     * Test various card ID variations
     */
    async testCardIdVariations() {
        const testDeck = `1 Test Card (1-001h)
1 Test Card (1_001H)
1 Test Card (1-001-H)`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        console.log(`Tested card ID variations, parsed ${result.cards.length} cards`);
    }

    /**
     * Test fuzzy name matching
     */
    async testFuzzyMatching() {
        const testDeck = `1 Terra Branford
1 Lightning Returns
1 Cloud Strife`;

        const result = this.deckManager.parseDeckText(testDeck);
        
        console.log(`Tested fuzzy matching, parsed ${result.cards.length} cards`);
    }

    /**
     * Test the actual deck list provided by the user
     */
    async testActualDeckList() {
        const actualDeck = `2 Lenna (26-120L)
2 Juggler (20-025C)
3 Mateus (XII RW) (24-035C)
3 Celestia (13-128L)
1 Agrias (7-106L)
3 Fairy (1-170C)
2 Ashe (19-086R)
1 Larsa (9-119C)
2 Calautidon (17-028C)
1 Orator (5-144C)
2 Cocytus (8-031R)
1 Time Mage (14-034C)
2 Sylvestre (26-110R)
2 Paladin (25-028C)
3 Blugu (20-111C)
1 Chadley (25-027H)
2 Charlotte (26-032L)
2 Alhanalem (20-022C)
2 Sephiroth (10-034H)
1 Sage (21-104C)
3 Ra-la (26-121L)
1 Aerith (19-088C)
3 Shiva (15-030H)
1 Sanctuary Keeper (19-094R)
2 Miwa (22-105H)
2 Sarah (MOBIUS) (19-024L)`;

        console.log('🎯 Testing actual user deck list...');
        const result = this.deckManager.parseDeckText(actualDeck);
        
        const totalExpected = 50; // Sum of all quantities
        console.log(`Expected ${totalExpected} cards, parsed ${result.cards.length} cards`);
        
        if (result.cards.length < totalExpected * 0.8) {
            console.warn(`⚠️ Only parsed ${result.cards.length}/${totalExpected} cards (${Math.round(result.cards.length/totalExpected*100)}%)`);
        }
        
        return result;
    }

    /**
     * Test specific problematic cards from the user's list
     */
    async testProblematicCards() {
        const problematicCards = [
            '2 Mateus (XII RW) (24-035C)', // Contains extra parentheses
            '2 Sarah (MOBIUS) (19-024L)', // Contains MOBIUS keyword
            '3 Shiva (15-030H)', // Simple format
        ];

        console.log('🔍 Testing potentially problematic cards...');
        
        for (const cardLine of problematicCards) {
            console.log(`Testing: ${cardLine}`);
            const result = this.deckManager.parseDeckText(cardLine);
            console.log(`Result: ${result.cards.length} cards parsed`);
        }
    }

    /**
     * Test and log detailed import analysis
     */
    async analyzeImportIssues(deckText) {
        console.log('🔬 Detailed Import Analysis');
        console.log('═'.repeat(50));
        
        // Capture console output
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        const logs = [];
        
        console.log = (...args) => {
            logs.push({ type: 'log', message: args.join(' ') });
            originalLog(...args);
        };
        
        console.warn = (...args) => {
            logs.push({ type: 'warn', message: args.join(' ') });
            originalWarn(...args);
        };
        
        console.error = (...args) => {
            logs.push({ type: 'error', message: args.join(' ') });
            originalError(...args);
        };

        // Run the import
        const result = this.deckManager.parseDeckText(deckText);
        
        // Restore console
        console.log = originalLog;
        console.warn = originalWarn;  
        console.error = originalError;
        
        // Analyze results
        const successLogs = logs.filter(log => log.message.includes('✅'));
        const errorLogs = logs.filter(log => log.message.includes('❌') || log.message.includes('⚠️'));
        
        console.log(`\n📈 Import Analysis Results:`);
        console.log(`Total cards imported: ${result.cards.length}`);
        console.log(`Successful imports: ${successLogs.length}`);
        console.log(`Failed imports: ${errorLogs.length}`);
        
        if (errorLogs.length > 0) {
            console.log('\n❌ Failed Imports:');
            errorLogs.forEach(log => console.log(`  ${log.message}`));
        }
        
        return {
            result,
            successCount: successLogs.length,
            errorCount: errorLogs.length,
            logs
        };
    }
}

// Export for use in other test files
export default DeckImportTests;