#!/usr/bin/env node

/**
 * Test Runner - Automated testing for FFTCG Simulator
 * Runs integration tests and validates all systems
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 FFTCG Simulator Test Runner');
console.log('===============================\n');

let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    errors: []
};

function logTest(name, status, message = '') {
    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : 'ℹ️';
    console.log(`${statusIcon} ${name}: ${status.toUpperCase()}`);
    if (message) {
        console.log(`   ${message}`);
    }
    
    if (status === 'pass') testResults.passed++;
    if (status === 'fail') {
        testResults.failed++;
        testResults.errors.push(`${name}: ${message}`);
    }
    testResults.total++;
}

// Test 1: File Structure Validation
console.log('📁 Testing File Structure...');

const requiredFiles = [
    'index.html',
    'package.json',
    'src/main.js',
    'src/data/fftcg_real_cards.json',
    'src/data/card_image_mapping.json',
    'src/core/CardDatabase.js',
    'src/core/DeckManager.js',
    'src/core/GameEngine.js',
    'src/components/DeckBuilder.js',
    'src/components/Modal.js',
    'assets/css/main.css',
    'assets/css/components/modals.css'
];

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        logTest(`File exists: ${file}`, 'pass');
    } else {
        logTest(`File exists: ${file}`, 'fail', 'File not found');
    }
});

// Test 2: JSON Data Validation
console.log('\n📊 Testing JSON Data...');

try {
    const cardDataPath = path.join(__dirname, 'src/data/fftcg_real_cards.json');
    const cardData = JSON.parse(fs.readFileSync(cardDataPath, 'utf8'));
    
    if (Array.isArray(cardData)) {
        logTest('Card data structure', 'pass', `${cardData.length} cards loaded`);
        
        // Validate first card structure
        const firstCard = cardData[0];
        const requiredFields = ['id', 'name', 'element', 'type'];
        const hasAllFields = requiredFields.every(field => firstCard.hasOwnProperty(field));
        
        if (hasAllFields) {
            logTest('Card data fields', 'pass', 'All required fields present');
        } else {
            logTest('Card data fields', 'fail', 'Missing required fields');
        }
    } else {
        logTest('Card data structure', 'fail', 'Data is not an array');
    }
} catch (error) {
    logTest('Card data parsing', 'fail', error.message);
}

try {
    const imageMappingPath = path.join(__dirname, 'src/data/card_image_mapping.json');
    const imageMapping = JSON.parse(fs.readFileSync(imageMappingPath, 'utf8'));
    
    if (typeof imageMapping === 'object') {
        const mappingCount = Object.keys(imageMapping).length;
        logTest('Image mapping structure', 'pass', `${mappingCount} image mappings`);
    } else {
        logTest('Image mapping structure', 'fail', 'Data is not an object');
    }
} catch (error) {
    logTest('Image mapping parsing', 'fail', error.message);
}

// Test 3: Package.json Validation
console.log('\n📦 Testing Package Configuration...');

try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredPackageFields = ['name', 'version', 'type'];
    const hasRequiredFields = requiredPackageFields.every(field => packageData.hasOwnProperty(field));
    
    if (hasRequiredFields) {
        logTest('Package.json structure', 'pass', `${packageData.name} v${packageData.version}`);
    } else {
        logTest('Package.json structure', 'fail', 'Missing required fields');
    }
    
    if (packageData.type === 'module') {
        logTest('ES Module support', 'pass', 'Package configured for ES modules');
    } else {
        logTest('ES Module support', 'fail', 'Package not configured for ES modules');
    }
} catch (error) {
    logTest('Package.json parsing', 'fail', error.message);
}

// Test 4: HTML Structure Validation
console.log('\n🌐 Testing HTML Structure...');

try {
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Check for correct CSS paths
    if (htmlContent.includes('assets/css/main.css')) {
        logTest('CSS paths in HTML', 'pass', 'CSS paths updated correctly');
    } else {
        logTest('CSS paths in HTML', 'fail', 'CSS paths not updated');
    }
    
    // Check for correct JS paths
    if (htmlContent.includes('src/main.js')) {
        logTest('JS paths in HTML', 'pass', 'JavaScript paths updated correctly');
    } else {
        logTest('JS paths in HTML', 'fail', 'JavaScript paths not updated');
    }
    
    // Check for essential DOM elements
    const essentialElements = ['#app', '#loadingScreen', '#modalContainer'];
    const hasEssentialElements = essentialElements.every(selector => 
        htmlContent.includes(`id="${selector.substring(1)}"`)
    );
    
    if (hasEssentialElements) {
        logTest('HTML DOM structure', 'pass', 'All essential elements present');
    } else {
        logTest('HTML DOM structure', 'fail', 'Missing essential DOM elements');
    }
} catch (error) {
    logTest('HTML parsing', 'fail', error.message);
}

// Test 5: Import Path Validation
console.log('\n📥 Testing Import Paths...');

const jsFiles = [
    'src/main.js',
    'src/core/CardDatabase.js',
    'src/core/DeckManager.js',
    'src/components/DeckBuilder.js',
    'src/components/Modal.js',
    'tests/AllTests.js',
    'tests/SystemIntegrationTests.js'
];

jsFiles.forEach(file => {
    try {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for old js/ imports
            if (content.includes("from './js/") || content.includes("from '../js/")) {
                logTest(`Import paths: ${file}`, 'fail', 'Contains old js/ import paths');
            } else {
                logTest(`Import paths: ${file}`, 'pass', 'Import paths updated correctly');
            }
        }
    } catch (error) {
        logTest(`Import paths: ${file}`, 'fail', error.message);
    }
});

// Test 6: Data Fetch Paths
console.log('\n🌐 Testing Data Fetch Paths...');

const fetchFiles = [
    'src/core/CardDatabase.js',
    'src/utils/ImageMapping.js',
    'src/components/Modal.js'
];

fetchFiles.forEach(file => {
    try {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for updated fetch paths
            if (content.includes("fetch('./js/data/")) {
                logTest(`Fetch paths: ${file}`, 'fail', 'Contains old js/data/ fetch paths');
            } else if (content.includes("fetch('./src/data/")) {
                logTest(`Fetch paths: ${file}`, 'pass', 'Fetch paths updated correctly');
            } else {
                logTest(`Fetch paths: ${file}`, 'pass', 'No data fetch calls found');
            }
        }
    } catch (error) {
        logTest(`Fetch paths: ${file}`, 'fail', error.message);
    }
});

// Final Results
console.log('\n📊 Test Summary');
console.log('================');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📊 Total: ${testResults.total}`);
console.log(`📈 Success Rate: ${testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0}%`);

if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors Found:');
    testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed! The system is ready.');
    process.exit(0);
}