/**
 * DEPENDENCY ANALYZER - Prevents accidental removal of used code
 * 
 * This tool scans the codebase to find all references to functions, variables,
 * and other code elements before allowing removal.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

class DependencyAnalyzer {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.excludedDirs = ['node_modules', '.git', 'dist', 'build'];
        this.includedExtensions = ['.js', '.html', '.css', '.json'];
    }

    /**
     * Analyze if a function/variable is safe to remove
     */
    analyzeSafetyForRemoval(identifier) {
        console.log(`🔍 Analyzing dependencies for: ${identifier}`);
        
        const usage = this.findAllUsages(identifier);
        const report = {
            identifier,
            usageCount: usage.length,
            usages: usage,
            safeToRemove: usage.length === 0,
            recommendations: []
        };

        if (usage.length > 0) {
            report.recommendations.push('⚠️  NOT SAFE TO REMOVE - Found active usage');
            report.recommendations.push(`Found ${usage.length} usage(s) in:`);
            usage.forEach(use => {
                report.recommendations.push(`  - ${use.file}:${use.line} - ${use.context}`);
            });
        } else {
            report.recommendations.push('✅ Appears safe to remove - no active usage found');
            report.recommendations.push('⚠️  Double-check for dynamic references (eval, string-based calls)');
        }

        return report;
    }

    /**
     * Find all usages of an identifier across the codebase
     */
    findAllUsages(identifier) {
        const usages = [];
        const files = this.getAllProjectFiles();

        files.forEach(filePath => {
            try {
                const content = readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    // Skip the definition line itself
                    if (this.isDefinitionLine(line, identifier)) return;
                    
                    // Check for various usage patterns
                    const usagePatterns = [
                        new RegExp(`\\b${this.escapeRegex(identifier)}\\s*\\(`, 'g'), // Function calls
                        new RegExp(`\\b${this.escapeRegex(identifier)}\\b(?!\\s*[:=]\\s*function)`, 'g'), // Variable references
                        new RegExp(`onclick="[^"]*${this.escapeRegex(identifier)}`, 'g'), // HTML onclick
                        new RegExp(`["']${this.escapeRegex(identifier)}["']`, 'g'), // String references
                    ];

                    usagePatterns.forEach(pattern => {
                        const matches = line.match(pattern);
                        if (matches) {
                            usages.push({
                                file: filePath.replace(this.projectRoot + '/', ''),
                                line: index + 1,
                                context: line.trim(),
                                type: this.getUsageType(line, identifier)
                            });
                        }
                    });
                });
            } catch (error) {
                console.warn(`Could not analyze ${filePath}:`, error.message);
            }
        });

        return usages;
    }

    /**
     * Check if a line is defining the identifier (not using it)
     */
    isDefinitionLine(line, identifier) {
        const definitionPatterns = [
            new RegExp(`function\\s+${this.escapeRegex(identifier)}\\s*\\(`),
            new RegExp(`\\bconst\\s+${this.escapeRegex(identifier)}\\s*=`),
            new RegExp(`\\blet\\s+${this.escapeRegex(identifier)}\\s*=`),
            new RegExp(`\\bvar\\s+${this.escapeRegex(identifier)}\\s*=`),
            new RegExp(`${this.escapeRegex(identifier)}\\s*:\\s*function`),
        ];

        return definitionPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Determine the type of usage
     */
    getUsageType(line, identifier) {
        if (line.includes(`${identifier}(`)) return 'function_call';
        if (line.includes(`onclick=`)) return 'html_handler';
        if (line.includes(`"${identifier}"`) || line.includes(`'${identifier}'`)) return 'string_reference';
        return 'variable_reference';
    }

    /**
     * Get all project files to analyze
     */
    getAllProjectFiles() {
        const files = [];
        
        const scanDirectory = (dir) => {
            try {
                const items = readdirSync(dir);
                
                items.forEach(item => {
                    if (this.excludedDirs.includes(item)) return;
                    
                    const itemPath = join(dir, item);
                    const stat = statSync(itemPath);
                    
                    if (stat.isDirectory()) {
                        scanDirectory(itemPath);
                    } else if (this.includedExtensions.includes(extname(item))) {
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

    /**
     * Escape special regex characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Batch analyze multiple identifiers
     */
    batchAnalyze(identifiers) {
        console.log(`🔍 Batch analyzing ${identifiers.length} identifiers...`);
        
        const results = identifiers.map(id => this.analyzeSafetyForRemoval(id));
        
        // Summary
        const safe = results.filter(r => r.safeToRemove);
        const unsafe = results.filter(r => !r.safeToRemove);
        
        console.log(`\n📊 ANALYSIS SUMMARY:`);
        console.log(`✅ Safe to remove: ${safe.length}`);
        console.log(`⚠️  NOT safe to remove: ${unsafe.length}`);
        
        if (unsafe.length > 0) {
            console.log(`\n⚠️  ITEMS WITH DEPENDENCIES:`);
            unsafe.forEach(item => {
                console.log(`- ${item.identifier}: ${item.usageCount} usage(s)`);
            });
        }

        return results;
    }
}

// Export for use in other scripts
export { DependencyAnalyzer };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const projectRoot = process.argv[2] || process.cwd();
    const identifiers = process.argv.slice(3);
    
    if (identifiers.length === 0) {
        console.log('Usage: node dependency-analyzer.js <project-root> <identifier1> [identifier2] ...');
        console.log('Example: node dependency-analyzer.js . toggleFilter applyDeckBuilderFilters');
        process.exit(1);
    }
    
    const analyzer = new DependencyAnalyzer(projectRoot);
    const results = analyzer.batchAnalyze(identifiers);
    
    // Exit with error code if any items are unsafe to remove
    const hasUnsafeItems = results.some(r => !r.safeToRemove);
    process.exit(hasUnsafeItems ? 1 : 0);
}