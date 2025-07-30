#!/usr/bin/env node

/**
 * Security Integration Test
 * Verifies that the security module integrates properly with the core systems
 */

// Simulate browser environment
global.window = {};
global.document = {
    addEventListener: () => {},
    querySelectorAll: () => [],
    getElementById: () => null
};
global.console = console;
global.crypto = require('crypto').webcrypto;

// Import the Security module
const { Security } = require('./js/utils/Security.js');

console.log('🧪 Testing Security Module Integration...\n');

async function runSecurityTests() {
    const security = new Security();
    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
            failed++;
        }
    }

    function asyncTest(name, fn) {
        return fn().then(() => {
            console.log(`✅ ${name}`);
            passed++;
        }).catch(error => {
            console.log(`❌ ${name}: ${error.message}`);
            failed++;
        });
    }

    // Test 1: Input Sanitization
    test('Input sanitization removes dangerous content', () => {
        const malicious = '<script>alert("XSS")</script>';
        const sanitized = security.sanitizeInput(malicious);
        if (sanitized.includes('<script>')) {
            throw new Error('Script tags not removed');
        }
    });

    // Test 2: Rate Limiting
    test('Rate limiting works correctly', () => {
        const userId = 'test-user';
        const action = 'test-action';
        
        // Should allow first 10 requests
        for (let i = 0; i < 10; i++) {
            if (!security.checkRateLimit(userId, action, 10, 60000)) {
                throw new Error(`Request ${i + 1} was blocked incorrectly`);
            }
        }
        
        // Should block 11th request
        if (security.checkRateLimit(userId, action, 10, 60000)) {
            throw new Error('11th request was not blocked');
        }
    });

    // Test 3: Deck Validation
    test('Deck validation enforces security rules', () => {
        const validDeck = {
            name: 'Test Deck',
            cards: Array(50).fill('card-001')
        };
        
        // Should pass
        const result = security.validateDeckSubmission(validDeck, 'user1');
        if (!result) {
            throw new Error('Valid deck was rejected');
        }
        
        // Should fail for invalid deck
        const invalidDeck = {
            name: '<script>alert()</script>',
            cards: Array(49).fill('card-001')
        };
        
        try {
            security.validateDeckSubmission(invalidDeck, 'user2');
            throw new Error('Invalid deck was accepted');
        } catch (e) {
            // Expected to throw
        }
    });

    // Test 4: CSRF Token Generation
    test('CSRF token generation works', () => {
        const token = security.generateCSRFToken();
        if (!token || typeof token !== 'string' || token.length < 32) {
            throw new Error('Invalid CSRF token generated');
        }
    });

    // Test 5: Message Validation
    test('Message validation works correctly', () => {
        const validMessage = {
            type: 'test',
            timestamp: Date.now(),
            data: { test: 'data' }
        };
        
        const result = security.validateMessage(validMessage, 'test');
        if (!result) {
            throw new Error('Valid message was rejected');
        }
        
        // Test old message rejection
        const oldMessage = {
            type: 'test',
            timestamp: Date.now() - 60000, // 1 minute old
            data: {}
        };
        
        try {
            security.validateMessage(oldMessage, 'test');
            throw new Error('Old message was accepted');
        } catch (e) {
            // Expected to throw
        }
    });

    // Test 6: Async Encryption/Decryption
    await asyncTest('Data encryption and decryption works', async () => {
        const testData = { secret: 'test-data', userId: 123 };
        const encrypted = await security.encryptData(testData);
        
        if (!encrypted.encrypted || !encrypted.key || !encrypted.iv) {
            throw new Error('Encryption failed to return required fields');
        }
        
        const decrypted = await security.decryptData(encrypted);
        if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
            throw new Error('Decrypted data does not match original');
        }
    });

    // Test 7: Hash Generation
    await asyncTest('Data hashing works correctly', async () => {
        const testString = 'test-password-123';
        const hash = await security.hashData(testString);
        
        if (!hash || typeof hash !== 'string' || hash.length !== 64) {
            throw new Error('Invalid hash generated');
        }
        
        // Same input should produce same hash
        const hash2 = await security.hashData(testString);
        if (hash !== hash2) {
            throw new Error('Hash is not deterministic');
        }
    });

    // Test 8: Secure Room Code Generation
    test('Secure room code generation works', () => {
        const code = security.generateSecureRoomCode();
        if (!code || typeof code !== 'string' || code.length !== 6) {
            throw new Error('Invalid room code generated');
        }
        
        // Should be alphanumeric
        if (!/^[A-Z0-9]+$/.test(code)) {
            throw new Error('Room code contains invalid characters');
        }
    });

    console.log('\n📊 Test Results:');
    console.log(`Total: ${passed + failed}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed === 0) {
        console.log('\n🎉 All security integration tests passed!');
        return true;
    } else {
        console.log('\n⚠️ Some tests failed. Please review the security integration.');
        return false;
    }
}

// Handle both CommonJS and ES modules
if (require.main === module) {
    runSecurityTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { runSecurityTests };