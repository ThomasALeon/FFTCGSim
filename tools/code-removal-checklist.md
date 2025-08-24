# Code Removal Safety Checklist

**MANDATORY PROCESS - Follow every step before removing any code**

## Pre-Removal Analysis

### 1. Dependency Analysis ✅
- [ ] Run dependency analyzer: `node tools/dependency-analyzer.js . <function-name>`
- [ ] Check for HTML onclick handlers, event listeners, and string references
- [ ] Search for dynamic calls (eval, setTimeout, setInterval with strings)
- [ ] Look for CSS selectors, data attributes, and ID references
- [ ] Verify no tests are testing the function

### 2. Security Impact Assessment ✅
- [ ] Run security validator: `node tools/security-validator.js .`
- [ ] Check if function handles user input, validation, or sanitization
- [ ] Verify no authentication, authorization, or security checks are removed
- [ ] Ensure no CSRF tokens, XSS protection, or security headers affected
- [ ] Confirm no encryption, hashing, or secure storage functionality removed

### 3. Functional Testing ✅
- [ ] Run automated tests: `new FFTCGTestSuite().runTests()` in browser console
- [ ] Test all major user workflows manually
- [ ] Verify filter functionality works
- [ ] Check deck builder operations
- [ ] Confirm game engine functionality
- [ ] Test card loading and display

## Removal Process

### 4. Staged Removal ✅
- [ ] Comment out the code first, don't delete immediately
- [ ] Test thoroughly with commented code
- [ ] Get user confirmation that functionality still works
- [ ] Only then remove the commented code

### 5. Documentation ✅
- [ ] Document what was removed and why
- [ ] Note any dependencies that were considered
- [ ] Record any alternative approaches considered
- [ ] Update any relevant documentation or README files

## Post-Removal Validation

### 6. Comprehensive Testing ✅
- [ ] Re-run all automated tests
- [ ] Manual testing of all major features
- [ ] Browser console error check
- [ ] Network tab error check
- [ ] Performance impact assessment

### 7. Security Re-validation ✅
- [ ] Re-run security validator to ensure no degradation
- [ ] Check that all security features still work
- [ ] Verify no new vulnerabilities introduced

### 8. User Acceptance ✅
- [ ] Deploy to test environment
- [ ] Get user confirmation that everything works
- [ ] Monitor for any issues in the next 24 hours

## Emergency Rollback Plan

### 9. Rollback Preparation ✅
- [ ] Keep git commit of removed code for easy revert
- [ ] Document rollback procedure
- [ ] Have contact information for immediate testing if issues arise

## Tools Usage

### Dependency Analyzer
```bash
# Check if a function can be safely removed
node tools/dependency-analyzer.js . functionName

# Check multiple functions
node tools/dependency-analyzer.js . func1 func2 func3
```

### Security Validator
```bash
# Check current security posture
node tools/security-validator.js .
```

### Function Tester
```javascript
// In browser console
const tester = new FFTCGTestSuite();
const results = await tester.runTests();
```

## Red Flags - STOP Removal

### Immediate Stop Conditions ⛔
- Function has ANY dependencies found by analyzer
- Security validator shows degradation
- Any automated test fails
- Function name appears in HTML attributes (onclick, onchange, etc.)
- Function name appears in quoted strings (CSS selectors, IDs, etc.)
- Function is referenced in configuration objects or arrays

### Warning Conditions ⚠️
- Function is related to user input processing
- Function name suggests it handles validation or security
- Function is called in error handling or logging
- Function appears to be part of a larger system or workflow
- Unsure about the function's purpose or dependencies

## Recovery Procedures

If you realize code was incorrectly removed:

1. **Immediate Action**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Analyze what was lost**
   - Check git diff to see exactly what was removed
   - Run dependency analyzer on the reverted code
   - Document why the removal was incorrect

3. **Proper Re-evaluation**
   - Follow this checklist completely
   - Get multiple perspectives on whether removal is safe
   - Consider refactoring instead of removal

## Notes

- **Always err on the side of caution**
- **When in doubt, don't remove**
- **Get user/stakeholder approval for any significant removals**
- **Test early and often throughout the removal process**
- **Document everything for future reference**

---

**Remember: It's easier to leave "redundant" code than to debug mysterious failures later.**