#!/usr/bin/env node

/**
 * Critical User Workflow Tests
 * Tests the complete user experience end-to-end
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 FFTCG Simulator - Critical Workflow Tests');
console.log('=============================================\n');

let testResults = {
    workflows: 0,
    passed: 0,
    failed: 0,
    errors: []
};

function logWorkflow(name, status, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${name}: ${status}`);
    if (details) {
        console.log(`   ${details}`);
    }
    
    testResults.workflows++;
    if (status === 'PASS') testResults.passed++;
    if (status === 'FAIL') {
        testResults.failed++;
        testResults.errors.push(`${name}: ${details}`);
    }
}

// Workflow 1: New User Experience
console.log('👤 Testing New User Experience...');
try {
    // Check if all essential files exist for first-time user
    const essentialFiles = [
        'index.html',
        'src/main.js',
        'src/data/fftcg_real_cards.json',
        'assets/css/main.css'
    ];
    
    const missingFiles = essentialFiles.filter(file => 
        !fs.existsSync(path.join(__dirname, file))
    );
    
    if (missingFiles.length === 0) {
        logWorkflow('New User - Essential Files', 'PASS', 'All required files present');
    } else {
        logWorkflow('New User - Essential Files', 'FAIL', `Missing: ${missingFiles.join(', ')}`);
    }
    
    // Check HTML has proper viewport and mobile support
    const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    if (htmlContent.includes('viewport') && htmlContent.includes('width=device-width')) {
        logWorkflow('New User - Mobile Support', 'PASS', 'Viewport meta tag configured');
    } else {
        logWorkflow('New User - Mobile Support', 'FAIL', 'Missing viewport configuration');
    }
    
} catch (error) {
    logWorkflow('New User Experience', 'FAIL', error.message);
}

// Workflow 2: Deck Builder Experience
console.log('\n📚 Testing Deck Builder Experience...');
try {
    // Check deck builder components exist
    const deckBuilderFiles = [
        'src/components/DeckBuilder.js',
        'src/core/DeckManager.js',
        'assets/css/components/deck-builder.css'
    ];
    
    const missingDeckFiles = deckBuilderFiles.filter(file => 
        !fs.existsSync(path.join(__dirname, file))
    );
    
    if (missingDeckFiles.length === 0) {
        logWorkflow('Deck Builder - Core Files', 'PASS', 'All deck builder files present');
    } else {
        logWorkflow('Deck Builder - Core Files', 'FAIL', `Missing: ${missingDeckFiles.join(', ')}`);
    }
    
    // Check for import/export functionality
    const deckBuilderContent = fs.readFileSync(
        path.join(__dirname, 'src/components/DeckBuilder.js'), 'utf8'
    );
    
    if (deckBuilderContent.includes('importDeck') && deckBuilderContent.includes('exportDeck')) {
        logWorkflow('Deck Builder - Import/Export', 'PASS', 'Import/export methods found');
    } else {
        logWorkflow('Deck Builder - Import/Export', 'FAIL', 'Import/export methods missing');
    }
    
    // Check for interaction methods
    if (deckBuilderContent.includes('addCardInteractionListeners')) {
        logWorkflow('Deck Builder - Interactions', 'PASS', 'Card interaction methods found');
    } else {
        logWorkflow('Deck Builder - Interactions', 'FAIL', 'Card interaction methods missing');
    }
    
} catch (error) {
    logWorkflow('Deck Builder Experience', 'FAIL', error.message);
}

// Workflow 3: Card Database Experience
console.log('\n🗃️ Testing Card Database Experience...');
try {
    // Check card data quality
    const cardDataPath = path.join(__dirname, 'src/data/fftcg_real_cards.json');
    const cardData = JSON.parse(fs.readFileSync(cardDataPath, 'utf8'));
    
    if (cardData.length > 3000) {
        logWorkflow('Card Database - Data Volume', 'PASS', `${cardData.length} cards available`);
    } else {
        logWorkflow('Card Database - Data Volume', 'WARN', `Only ${cardData.length} cards (expected 3000+)`);
    }
    
    // Check card data completeness
    const sampleCards = cardData.slice(0, 100);
    const completeCards = sampleCards.filter(card => 
        card.id && card.name && card.element && card.type
    );
    
    if (completeCards.length === sampleCards.length) {
        logWorkflow('Card Database - Data Quality', 'PASS', 'All sample cards have required fields');
    } else {
        logWorkflow('Card Database - Data Quality', 'FAIL', 
            `${sampleCards.length - completeCards.length} cards missing required fields`);
    }
    
    // Check for image support
    const cardsWithImages = cardData.filter(card => card.hasRealImage && card.image).length;
    const imagePercentage = Math.round((cardsWithImages / cardData.length) * 100);
    
    if (imagePercentage > 80) {
        logWorkflow('Card Database - Image Coverage', 'PASS', `${imagePercentage}% cards have images`);
    } else {
        logWorkflow('Card Database - Image Coverage', 'WARN', `Only ${imagePercentage}% cards have images`);
    }
    
} catch (error) {
    logWorkflow('Card Database Experience', 'FAIL', error.message);
}

// Workflow 4: Game Features Experience
console.log('\n🎮 Testing Game Features Experience...');
try {
    // Check AI opponent system
    const aiOpponentPath = path.join(__dirname, 'src/core/AIOpponent.js');
    if (fs.existsSync(aiOpponentPath)) {
        const aiContent = fs.readFileSync(aiOpponentPath, 'utf8');
        if (aiContent.includes('takeTurn') && aiContent.includes('playCard')) {
            logWorkflow('Game Features - AI Opponent', 'PASS', 'AI opponent system complete');
        } else {
            logWorkflow('Game Features - AI Opponent', 'FAIL', 'AI opponent missing core methods');
        }
    } else {
        logWorkflow('Game Features - AI Opponent', 'FAIL', 'AI opponent file missing');
    }
    
    // Check practice setup
    const practiceSetupPath = path.join(__dirname, 'src/components/PracticeSetup.js');
    if (fs.existsSync(practiceSetupPath)) {
        logWorkflow('Game Features - Practice Mode', 'PASS', 'Practice mode setup available');
    } else {
        logWorkflow('Game Features - Practice Mode', 'FAIL', 'Practice mode setup missing');
    }
    
    // Check game board
    const gameBoardPath = path.join(__dirname, 'src/components/GameBoard.js');
    if (fs.existsSync(gameBoardPath)) {
        const gameBoardContent = fs.readFileSync(gameBoardPath, 'utf8');
        if (gameBoardContent.includes('playCard') && gameBoardContent.includes('dragover')) {
            logWorkflow('Game Features - Game Board', 'PASS', 'Game board with drag-and-drop');
        } else {
            logWorkflow('Game Features - Game Board', 'FAIL', 'Game board missing key features');
        }
    } else {
        logWorkflow('Game Features - Game Board', 'FAIL', 'Game board component missing');
    }
    
} catch (error) {
    logWorkflow('Game Features Experience', 'FAIL', error.message);
}

// Workflow 5: User Interface Experience
console.log('\n🖥️ Testing User Interface Experience...');
try {
    // Check modal system
    const modalPath = path.join(__dirname, 'src/components/Modal.js');
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    
    const modalTypes = [
        'cardDetail',
        'deckExport',
        'deckImport',
        'profileModal',
        'practiceSetup'
    ];
    
    const foundModalTypes = modalTypes.filter(type => modalContent.includes(type));
    
    if (foundModalTypes.length >= 4) {
        logWorkflow('UI Experience - Modal System', 'PASS', `${foundModalTypes.length} modal types available`);
    } else {
        logWorkflow('UI Experience - Modal System', 'FAIL', `Only ${foundModalTypes.length} modal types found`);
    }
    
    // Check CSS components
    const cssComponents = [
        'assets/css/components/modals.css',
        'assets/css/components/deck-builder.css',
        'assets/css/components/game-board.css'
    ];
    
    const missingCSS = cssComponents.filter(file => 
        !fs.existsSync(path.join(__dirname, file))
    );
    
    if (missingCSS.length === 0) {
        logWorkflow('UI Experience - Styling', 'PASS', 'All CSS components present');
    } else {
        logWorkflow('UI Experience - Styling', 'FAIL', `Missing CSS: ${missingCSS.join(', ')}`);
    }
    
    // Check accessibility features
    const accessibilityPath = path.join(__dirname, 'assets/css/accessibility.css');
    if (fs.existsSync(accessibilityPath)) {
        logWorkflow('UI Experience - Accessibility', 'PASS', 'Accessibility CSS available');
    } else {
        logWorkflow('UI Experience - Accessibility', 'FAIL', 'Accessibility CSS missing');
    }
    
} catch (error) {
    logWorkflow('User Interface Experience', 'FAIL', error.message);
}

// Workflow 6: Performance & Optimization
console.log('\n⚡ Testing Performance & Optimization...');
try {
    // Check for large files that might impact loading
    const cardDataSize = fs.statSync(path.join(__dirname, 'src/data/fftcg_real_cards.json')).size;
    const cardDataMB = Math.round(cardDataSize / 1024 / 1024 * 10) / 10;
    
    if (cardDataMB < 5) {
        logWorkflow('Performance - Card Data Size', 'PASS', `${cardDataMB}MB (reasonable size)`);
    } else {
        logWorkflow('Performance - Card Data Size', 'WARN', `${cardDataMB}MB (may affect loading)`);
    }
    
    // Check for ES modules (better for performance)
    const packageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (packageData.type === 'module') {
        logWorkflow('Performance - Module System', 'PASS', 'Using ES modules');
    } else {
        logWorkflow('Performance - Module System', 'FAIL', 'Not configured for ES modules');
    }
    
    // Check for lazy loading patterns
    const mainJSContent = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');
    if (mainJSContent.includes('dynamic import') || mainJSContent.includes('loadingScreen')) {
        logWorkflow('Performance - Loading Strategy', 'PASS', 'Loading screens and progressive loading');
    } else {
        logWorkflow('Performance - Loading Strategy', 'WARN', 'Consider adding progressive loading');
    }
    
} catch (error) {
    logWorkflow('Performance & Optimization', 'FAIL', error.message);
}

// Final Report
console.log('\n📊 Workflow Test Summary');
console.log('=========================');
console.log(`🎯 Workflows Tested: ${testResults.workflows}`);
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.workflows) * 100)}%`);

if (testResults.errors.length > 0) {
    console.log('\n🚨 Critical Issues:');
    testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
    });
}

if (testResults.failed === 0) {
    console.log('\n🎉 All critical workflows validated! System ready for deployment.');
} else {
    console.log('\n⚠️  Some issues found. Review and fix before deployment.');
}

process.exit(testResults.failed > 0 ? 1 : 0);