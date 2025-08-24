/**
 * CODE SAFETY MANAGER - Automatic integration for Claude Code sessions
 * 
 * This manager automatically runs safety checks whenever code modifications
 * are requested, making safety validation mandatory and seamless.
 */

import { DependencyAnalyzer } from './dependency-analyzer.js';
import { SecurityValidator } from './security-validator.js';
import { FFTCGTestSuite } from './function-tester.js';

class CodeSafetyManager {
    constructor(projectRoot = '.') {
        this.projectRoot = projectRoot;
        this.dependencyAnalyzer = new DependencyAnalyzer(projectRoot);
        this.securityValidator = new SecurityValidator(projectRoot);
        this.isInitialized = false;
        
        // Track current session state
        this.sessionId = this.generateSessionId();
        this.changeLog = [];
        this.baselineSecurityState = null;
        
        console.log(`🛡️ Code Safety Manager initialized for session: ${this.sessionId}`);
    }

    /**
     * Initialize safety manager - run once per session
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Code Safety Manager...');
        
        // Establish security baseline
        console.log('📊 Establishing security baseline...');
        this.baselineSecurityState = this.securityValidator.validateSecurity();
        
        // Log initialization
        this.logChange('session_start', 'Safety manager initialized', {
            baseline: this.baselineSecurityState.summary
        });
        
        this.isInitialized = true;
        console.log('✅ Code Safety Manager ready');
    }

    /**
     * MANDATORY: Analyze code before removal/modification
     */
    async analyzeBeforeChange(changeType, identifiers = [], description = '') {
        await this.initialize();
        
        console.log(`🔍 MANDATORY SAFETY CHECK: ${changeType.toUpperCase()}`);
        console.log('=' .repeat(60));
        console.log(`Description: ${description}`);
        console.log(`Identifiers: ${identifiers.join(', ')}`);
        console.log('');

        const analysis = {
            changeType,
            identifiers,
            description,
            timestamp: new Date().toISOString(),
            approved: false,
            blockers: [],
            warnings: [],
            recommendations: []
        };

        // 1. DEPENDENCY ANALYSIS (if identifiers provided)
        if (identifiers.length > 0) {
            console.log('🔍 STEP 1: DEPENDENCY ANALYSIS');
            console.log('-'.repeat(30));
            
            analysis.dependencies = {};
            
            for (const identifier of identifiers) {
                const depAnalysis = this.dependencyAnalyzer.analyzeSafetyForRemoval(identifier);
                analysis.dependencies[identifier] = depAnalysis;
                
                if (!depAnalysis.safeToRemove) {
                    analysis.blockers.push(`${identifier} has ${depAnalysis.usageCount} dependencies`);
                    console.log(`❌ ${identifier}: ${depAnalysis.usageCount} usages - NOT SAFE`);
                    
                    // Show first few usages
                    console.log('   Sample dependencies:');
                    depAnalysis.usages.slice(0, 3).forEach(usage => {
                        console.log(`     • ${usage.file}:${usage.line} [${usage.type}]`);
                    });
                } else {
                    console.log(`✅ ${identifier}: No dependencies found - SAFE`);
                }
            }
        }

        // 2. CHANGE TYPE SPECIFIC VALIDATION
        console.log('\n🎯 STEP 2: CHANGE TYPE VALIDATION');
        console.log('-'.repeat(30));
        
        switch (changeType.toLowerCase()) {
            case 'remove':
            case 'delete':
                if (analysis.blockers.length > 0) {
                    analysis.approved = false;
                    console.log('❌ REMOVAL BLOCKED - Active dependencies found');
                } else {
                    analysis.warnings.push('Ensure manual testing after removal');
                    console.log('⚠️  Removal approved but requires testing');
                }
                break;
                
            case 'modify':
            case 'refactor':
                analysis.warnings.push('Verify all functionality still works after changes');
                console.log('⚠️  Modification requires post-change validation');
                break;
                
            case 'add':
            case 'create':
                analysis.warnings.push('Ensure new code follows security best practices');
                console.log('ℹ️  New code - verify security patterns');
                break;
        }

        // 3. SECURITY IMPACT ASSESSMENT
        console.log('\n🔒 STEP 3: SECURITY IMPACT ASSESSMENT');
        console.log('-'.repeat(30));
        
        // Check if any identifiers are security-related
        const securityKeywords = ['validate', 'sanitize', 'auth', 'security', 'permission', 'token'];
        const securityRelated = identifiers.some(id => 
            securityKeywords.some(keyword => id.toLowerCase().includes(keyword))
        );
        
        if (securityRelated) {
            analysis.blockers.push('Security-related functions require manual review');
            console.log('🚨 Security-sensitive functions detected - manual review required');
        } else {
            console.log('✅ No obvious security implications');
        }

        // 4. FINAL DECISION
        console.log('\n🏁 STEP 4: SAFETY DECISION');
        console.log('-'.repeat(30));
        
        analysis.approved = analysis.blockers.length === 0;
        
        if (analysis.approved) {
            console.log('✅ CHANGE APPROVED WITH CONDITIONS');
            console.log('\nRequired next steps:');
            console.log('1. Run browser tests: new FFTCGTestSuite().runTests()');
            console.log('2. Manual testing of affected functionality');
            console.log('3. Verify no console errors after changes');
            
            if (analysis.warnings.length > 0) {
                console.log('\n⚠️  Important warnings:');
                analysis.warnings.forEach(warning => console.log(`   • ${warning}`));
            }
        } else {
            console.log('❌ CHANGE BLOCKED');
            console.log('\nBlockers that must be resolved:');
            analysis.blockers.forEach(blocker => console.log(`   🚨 ${blocker}`));
            console.log('\nRecommendations:');
            console.log('   1. Update all dependent code first');
            console.log('   2. Consider refactoring instead of removal');
            console.log('   3. Re-run analysis after fixes');
        }

        // Log this analysis
        this.logChange(changeType, description, analysis);
        
        return analysis;
    }

    /**
     * MANDATORY: Validate after changes are made
     */
    async validateAfterChange(changeDescription = '') {
        console.log('\n🔍 POST-CHANGE VALIDATION');
        console.log('=' .repeat(40));
        
        const validation = {
            timestamp: new Date().toISOString(),
            description: changeDescription,
            securityCheck: null,
            recommendations: []
        };

        // 1. Security validation
        console.log('🔒 Running security validation...');
        const currentSecurityState = this.securityValidator.validateSecurity();
        
        if (this.baselineSecurityState) {
            const comparison = this.securityValidator.compareSecurityPosture(
                this.baselineSecurityState, 
                currentSecurityState
            );
            
            validation.securityCheck = {
                passed: comparison.degraded.length === 0 && comparison.newIssues.length === 0,
                comparison
            };
            
            if (!validation.securityCheck.passed) {
                console.log('🚨 SECURITY DEGRADATION DETECTED!');
                console.log('Changes may have compromised security posture');
                
                if (comparison.degraded.length > 0) {
                    console.log('\nDegraded features:');
                    comparison.degraded.forEach(item => {
                        console.log(`   • ${item.feature}: ${item.before} → ${item.after}`);
                    });
                }
                
                validation.recommendations.push('URGENT: Review security implications');
                validation.recommendations.push('Consider reverting changes');
            } else {
                console.log('✅ Security posture maintained');
            }
        }

        // 2. Recommended testing
        console.log('\n🧪 RECOMMENDED NEXT STEPS:');
        console.log('1. Run: new FFTCGTestSuite().runTests()');
        console.log('2. Manual testing of core functionality');
        console.log('3. Check browser console for errors');
        console.log('4. Test user workflows end-to-end');

        this.logChange('post_validation', changeDescription, validation);
        
        return validation;
    }

    /**
     * Generate comprehensive session report
     */
    generateSessionReport() {
        console.log('\n📊 CODE SAFETY SESSION REPORT');
        console.log('=' .repeat(50));
        console.log(`Session ID: ${this.sessionId}`);
        console.log(`Changes made: ${this.changeLog.length}`);
        
        const approvedChanges = this.changeLog.filter(c => c.data.approved === true);
        const blockedChanges = this.changeLog.filter(c => c.data.approved === false);
        
        console.log(`✅ Approved: ${approvedChanges.length}`);
        console.log(`❌ Blocked: ${blockedChanges.length}`);
        
        if (blockedChanges.length > 0) {
            console.log('\n🚨 BLOCKED CHANGES:');
            blockedChanges.forEach(change => {
                console.log(`   • ${change.type}: ${change.description}`);
                if (change.data.blockers) {
                    change.data.blockers.forEach(blocker => {
                        console.log(`     - ${blocker}`);
                    });
                }
            });
        }
        
        return {
            sessionId: this.sessionId,
            totalChanges: this.changeLog.length,
            approved: approvedChanges.length,
            blocked: blockedChanges.length,
            changeLog: this.changeLog
        };
    }

    /**
     * Helper methods
     */
    generateSessionId() {
        return `safety-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    logChange(type, description, data) {
        this.changeLog.push({
            timestamp: new Date().toISOString(),
            type,
            description,
            data
        });
    }

    /**
     * Quick check for simple cases
     */
    async quickSafetyCheck(action, targets = []) {
        const riskKeywords = [
            'remove', 'delete', 'drop', 'clear', 'reset', 
            'modify', 'change', 'update', 'refactor'
        ];
        
        const isRiskyAction = riskKeywords.some(keyword => 
            action.toLowerCase().includes(keyword)
        );
        
        if (isRiskyAction || targets.length > 0) {
            console.log('🛡️  Safety check triggered - analyzing...');
            return await this.analyzeBeforeChange(action, targets, `Quick check: ${action}`);
        }
        
        return { approved: true, lowRisk: true };
    }
}

// Create global instance
const codeSafetyManager = new CodeSafetyManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.codeSafetyManager = codeSafetyManager;
}

export default codeSafetyManager;
export { CodeSafetyManager };