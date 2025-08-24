/**
 * SECURITY VALIDATOR - Ensures security measures remain intact
 * 
 * This tool validates that security-critical functions and patterns
 * are not accidentally removed or compromised.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

class SecurityValidator {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.securityPatterns = [
            // Input validation
            { pattern: /validate\w*\(/g, name: 'Input Validation', critical: true },
            { pattern: /sanitize\w*\(/g, name: 'Data Sanitization', critical: true },
            { pattern: /escape\w*\(/g, name: 'Data Escaping', critical: true },
            
            // Authentication & Authorization
            { pattern: /authenticate\w*\(/g, name: 'Authentication', critical: true },
            { pattern: /authorize\w*\(/g, name: 'Authorization', critical: true },
            { pattern: /checkPermission\w*\(/g, name: 'Permission Checks', critical: true },
            
            // Security headers and CSP
            { pattern: /Content-Security-Policy/g, name: 'CSP Headers', critical: true },
            { pattern: /X-Frame-Options/g, name: 'Frame Options', critical: false },
            { pattern: /X-XSS-Protection/g, name: 'XSS Protection', critical: false },
            
            // Secure data handling
            { pattern: /\.innerHTML\s*=/g, name: 'innerHTML Usage', critical: false, warning: 'Potential XSS risk' },
            { pattern: /eval\s*\(/g, name: 'eval() Usage', critical: true, warning: 'Code injection risk' },
            { pattern: /document\.write\s*\(/g, name: 'document.write Usage', critical: false, warning: 'XSS risk' },
            
            // FFTCG specific security
            { pattern: /security\./g, name: 'Security Module Usage', critical: true },
            { pattern: /validateCard\(/g, name: 'Card Validation', critical: true },
            { pattern: /validateDeck\(/g, name: 'Deck Validation', critical: true },
        ];
    }

    /**
     * Validate security posture across the entire codebase
     */
    validateSecurity() {
        console.log('🔒 Running security validation...');
        
        const files = this.getAllJSFiles();
        const results = {
            filesScanned: files.length,
            securityFeatures: {},
            warnings: [],
            critical: [],
            summary: {}
        };

        // Scan each security pattern
        this.securityPatterns.forEach(pattern => {
            results.securityFeatures[pattern.name] = {
                count: 0,
                locations: [],
                critical: pattern.critical,
                warning: pattern.warning
            };
        });

        // Scan all files
        files.forEach(filePath => {
            try {
                const content = readFileSync(filePath, 'utf8');
                const relativePath = filePath.replace(this.projectRoot + '/', '');
                
                this.securityPatterns.forEach(pattern => {
                    const matches = content.match(pattern.pattern);
                    if (matches) {
                        results.securityFeatures[pattern.name].count += matches.length;
                        results.securityFeatures[pattern.name].locations.push({
                            file: relativePath,
                            matches: matches.length
                        });
                    }
                });
            } catch (error) {
                console.warn(`Could not scan ${filePath}:`, error.message);
            }
        });

        // Generate warnings and critical issues
        Object.entries(results.securityFeatures).forEach(([name, data]) => {
            if (data.critical && data.count === 0) {
                results.critical.push(`Missing critical security feature: ${name}`);
            }
            
            if (data.warning && data.count > 0) {
                results.warnings.push(`${data.count} instances of ${name}: ${data.warning}`);
            }
        });

        // Generate summary
        results.summary = {
            criticalIssues: results.critical.length,
            warnings: results.warnings.length,
            securityFeaturesFound: Object.values(results.securityFeatures).filter(f => f.count > 0).length,
            totalSecurityFeatures: this.securityPatterns.length
        };

        return results;
    }

    /**
     * Compare security posture before and after changes
     */
    compareSecurityPosture(beforeResults, afterResults) {
        console.log('🔍 Comparing security posture...');
        
        const comparison = {
            degraded: [],
            improved: [],
            unchanged: [],
            newIssues: [],
            resolvedIssues: []
        };

        // Compare each security feature
        Object.keys(beforeResults.securityFeatures).forEach(featureName => {
            const before = beforeResults.securityFeatures[featureName];
            const after = afterResults.securityFeatures[featureName];
            
            if (before.count > after.count) {
                comparison.degraded.push({
                    feature: featureName,
                    before: before.count,
                    after: after.count,
                    critical: before.critical
                });
            } else if (before.count < after.count) {
                comparison.improved.push({
                    feature: featureName,
                    before: before.count,
                    after: after.count
                });
            } else {
                comparison.unchanged.push(featureName);
            }
        });

        // Compare critical issues
        beforeResults.critical.forEach(issue => {
            if (!afterResults.critical.includes(issue)) {
                comparison.resolvedIssues.push(issue);
            }
        });

        afterResults.critical.forEach(issue => {
            if (!beforeResults.critical.includes(issue)) {
                comparison.newIssues.push(issue);
            }
        });

        return comparison;
    }

    /**
     * Generate security report
     */
    generateReport(results, comparison = null) {
        console.log('\n🔒 SECURITY VALIDATION REPORT');
        console.log('=' .repeat(50));
        
        console.log(`📊 Files Scanned: ${results.filesScanned}`);
        console.log(`🔍 Security Features Found: ${results.summary.securityFeaturesFound}/${results.summary.totalSecurityFeatures}`);
        console.log(`⚠️  Warnings: ${results.summary.warnings}`);
        console.log(`🚨 Critical Issues: ${results.summary.criticalIssues}`);

        if (results.critical.length > 0) {
            console.log('\n🚨 CRITICAL SECURITY ISSUES:');
            results.critical.forEach(issue => console.log(`  - ${issue}`));
        }

        if (results.warnings.length > 0) {
            console.log('\n⚠️  SECURITY WARNINGS:');
            results.warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        if (comparison) {
            console.log('\n📈 SECURITY POSTURE CHANGES:');
            
            if (comparison.degraded.length > 0) {
                console.log('\n📉 DEGRADED SECURITY:');
                comparison.degraded.forEach(item => {
                    const indicator = item.critical ? '🚨' : '⚠️';
                    console.log(`  ${indicator} ${item.feature}: ${item.before} → ${item.after}`);
                });
            }

            if (comparison.improved.length > 0) {
                console.log('\n📈 IMPROVED SECURITY:');
                comparison.improved.forEach(item => {
                    console.log(`  ✅ ${item.feature}: ${item.before} → ${item.after}`);
                });
            }

            if (comparison.newIssues.length > 0) {
                console.log('\n🚨 NEW CRITICAL ISSUES:');
                comparison.newIssues.forEach(issue => console.log(`  - ${issue}`));
            }

            if (comparison.resolvedIssues.length > 0) {
                console.log('\n✅ RESOLVED ISSUES:');
                comparison.resolvedIssues.forEach(issue => console.log(`  - ${issue}`));
            }
        }

        // Overall assessment
        const hasSecurityDegradation = comparison && 
            (comparison.degraded.some(d => d.critical) || comparison.newIssues.length > 0);
        
        if (hasSecurityDegradation) {
            console.log('\n🚨 SECURITY POSTURE HAS DEGRADED - Review required!');
            return false;
        } else {
            console.log('\n✅ Security posture maintained or improved');
            return true;
        }
    }

    /**
     * Get all JavaScript files in the project
     */
    getAllJSFiles() {
        const files = [];
        const excludedDirs = ['node_modules', '.git', 'dist', 'build'];
        
        const scanDirectory = (dir) => {
            try {
                const items = readdirSync(dir);
                
                items.forEach(item => {
                    if (excludedDirs.includes(item)) return;
                    
                    const itemPath = join(dir, item);
                    const stat = statSync(itemPath);
                    
                    if (stat.isDirectory()) {
                        scanDirectory(itemPath);
                    } else if (item.endsWith('.js') || item.endsWith('.html')) {
                        files.push(itemPath);
                    }
                });
            } catch (error) {
                console.warn(`Could not scan directory ${dir}:`, error.message);
            }
        };

        scanDirectory(this.projectRoot);
        return files;
    }
}

export { SecurityValidator };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const projectRoot = process.argv[2] || process.cwd();
    const validator = new SecurityValidator(projectRoot);
    const results = validator.validateSecurity();
    const isSecure = validator.generateReport(results);
    
    process.exit(isSecure ? 0 : 1);
}