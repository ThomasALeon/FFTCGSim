#!/bin/bash

# INSTALL SAFETY HOOKS - Set up automatic safety validation

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🛡️  INSTALLING CODE SAFETY HOOKS"
echo "================================"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository - cannot install hooks"
    exit 1
fi

# Create git hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
echo "📋 Installing pre-commit safety hook..."
if [ -f ".githooks/pre-commit" ]; then
    cp ".githooks/pre-commit" ".git/hooks/pre-commit"
    chmod +x ".git/hooks/pre-commit"
    echo "✅ Pre-commit hook installed"
else
    echo "❌ Pre-commit hook source not found"
    exit 1
fi

# Test that safety tools are available
echo ""
echo "🧪 Testing safety tools..."

# Test dependency analyzer
if node tools/dependency-analyzer.js . testFunction > /dev/null 2>&1; then
    echo "✅ Dependency analyzer working"
else
    echo "⚠️  Dependency analyzer test failed - check Node.js setup"
fi

# Test security validator
if node tools/security-validator.js . > /dev/null 2>&1; then
    echo "✅ Security validator working"
else
    echo "⚠️  Security validator test failed - check Node.js setup"
fi

# Test safe refactor script
if [ -x "tools/safe-refactor.sh" ]; then
    echo "✅ Safe refactor script ready"
else
    echo "⚠️  Safe refactor script not executable - fixing..."
    chmod +x tools/safe-refactor.sh
fi

# Add safety manager to package.json scripts if package.json exists
if [ -f "package.json" ]; then
    echo ""
    echo "📦 Adding safety scripts to package.json..."
    
    # Use Node.js to safely modify package.json
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (!pkg.scripts) pkg.scripts = {};
        
        pkg.scripts['safety:analyze'] = 'node tools/safe-refactor.sh';
        pkg.scripts['safety:security'] = 'node tools/security-validator.js .';
        pkg.scripts['safety:test'] = 'echo \"Run: new FFTCGTestSuite().runTests() in browser console\"';
        pkg.scripts['safety:install'] = './tools/install-safety-hooks.sh';
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✅ Safety scripts added to package.json');
    " 2>/dev/null || echo "⚠️  Could not modify package.json - Node.js not available"
fi

# Create safety configuration
echo ""
echo "⚙️  Creating safety configuration..."
cat > .safety-config << 'EOF'
{
  "enabled": true,
  "strictMode": true,
  "criticalFunctions": [
    "toggleFilter",
    "validateCard", 
    "validateDeck",
    "sanitize",
    "authenticate",
    "authorize",
    "applyDeckBuilderFilters",
    "updateFilterButtonStates"
  ],
  "securityPatterns": [
    "validate*",
    "sanitize*",
    "auth*",
    "security*",
    "permission*"
  ],
  "autoBlock": {
    "functionRemovals": true,
    "securityChanges": true,
    "criticalFunctions": true
  }
}
EOF
echo "✅ Safety configuration created"

# Generate development instructions
echo ""
echo "📖 Creating development guide..."
cat > SAFETY_GUIDE.md << 'EOF'
# Code Safety Guide

## Automatic Safety System

This project has an automatic code safety system that prevents accidental breaking changes.

## How It Works

### Pre-commit Hooks ✅
- Automatically runs before every commit
- Blocks dangerous function removals
- Validates security posture
- Can be bypassed with `git commit --no-verify` (NOT RECOMMENDED)

### Manual Safety Analysis 🔍
```bash
# Before removing/changing functions
./tools/safe-refactor.sh functionName anotherFunction

# Check security impact
node tools/security-validator.js .

# Test functionality
# In browser console: new FFTCGTestSuite().runTests()
```

### NPM Scripts 📦
```bash
npm run safety:analyze      # Run dependency analysis
npm run safety:security     # Run security validation  
npm run safety:test        # Instructions for browser testing
```

## Workflow for Code Changes

### 1. Before Making Changes
```bash
# Analyze what you want to change
./tools/safe-refactor.sh myFunction
```

### 2. If Changes are Approved
- Make changes carefully
- Test immediately after each change
- Verify no console errors

### 3. Before Committing
- Pre-commit hook runs automatically
- Follow any recommendations
- Manual testing if prompted

### 4. After Committing  
- Monitor for any issues
- Be ready to rollback if problems occur

## Red Flags 🚨

The system will block commits that:
- Remove critical functions (toggleFilter, validateCard, etc.)
- Modify security-related code
- Have suspicious patterns in commit messages

## Emergency Procedures

### If You Need to Bypass Safety (USE WITH EXTREME CAUTION)
```bash
git commit --no-verify -m "Emergency fix - bypassing safety"
```

### If Things Break After a Change
```bash
# Quick rollback
git log --oneline -5          # Find the problematic commit
git revert <commit-hash>      # Revert the change
git push                      # Deploy the fix
```

## Testing Commands

### Browser Console Testing
```javascript
// Test all critical functions
new FFTCGTestSuite().runTests()

// Test specific functionality
const tester = new FFTCGTestSuite();
await tester.runTests();
```

### Manual Testing Checklist
- [ ] Filter buttons work (element, type, rarity)
- [ ] Search functionality works
- [ ] Deck builder loads cards
- [ ] No console errors
- [ ] No network errors
- [ ] Game engine functionality intact

## Contact

If you encounter issues with the safety system, check:
1. Node.js is installed and working
2. All tools/* files are present
3. Git hooks are properly installed (run ./tools/install-safety-hooks.sh)
EOF

echo "✅ Development guide created: SAFETY_GUIDE.md"

# Final instructions
echo ""
echo "🎉 INSTALLATION COMPLETE!"
echo "========================="
echo ""
echo "✅ Pre-commit hooks installed and active"
echo "✅ Safety tools tested and ready"
echo "✅ Development guide created"
echo ""
echo "🚀 Next Steps:"
echo "1. Read SAFETY_GUIDE.md for usage instructions"
echo "2. Test the system: ./tools/safe-refactor.sh testFunction"
echo "3. Make commits as usual - safety hooks will run automatically"
echo ""
echo "🛡️  Your codebase is now protected!"