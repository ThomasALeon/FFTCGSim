/**
 * TEST RUNNER for Deck Import Tests
 * 
 * Run this to test deck import functionality and identify issues
 */

import { DeckImportTests } from './DeckImportTests.js';

/**
 * Main test runner function
 */
async function runImportTests() {
    console.log('🧪 Starting Deck Import Test Suite');
    console.log('=' .repeat(60));
    
    try {
        // Initialize test suite
        const tests = new DeckImportTests();
        await tests.initialize();
        
        // Run all tests
        const results = await tests.runAllTests();
        
        // Test the specific user deck list with detailed analysis
        console.log('\n🎯 ANALYZING USER DECK LIST');
        console.log('=' .repeat(60));
        
        const userDeckList = `2 Lenna (26-120L)
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

        const analysis = await tests.analyzeImportIssues(userDeckList);
        
        // Test problematic cards individually
        await tests.testProblematicCards();
        
        // Summary report
        console.log('\n📊 FINAL REPORT');
        console.log('=' .repeat(60));
        console.log(`Test Suite: ${results.passed} passed, ${results.failed} failed`);
        console.log(`User Deck Import: ${analysis.successCount} successful, ${analysis.errorCount} failed`);
        console.log(`Import Success Rate: ${Math.round((analysis.successCount / (analysis.successCount + analysis.errorCount)) * 100)}%`);
        
        if (analysis.errorCount > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('1. Check card database for missing cards');
            console.log('2. Verify card ID formats match database');
            console.log('3. Consider adding more fuzzy matching logic');
            console.log('4. Review Materia Hunter format parsing');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runImportTests();
}

export { runImportTests };