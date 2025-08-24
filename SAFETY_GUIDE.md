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
