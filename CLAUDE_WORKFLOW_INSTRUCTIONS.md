# CLAUDE CODE WORKFLOW - MANDATORY SAFETY PROCEDURES

## CRITICAL: These steps are MANDATORY for all code changes

### 🚨 BEFORE MAKING ANY CODE CHANGES

**Step 1: Safety Analysis (MANDATORY)**
```bash
# For function removals/modifications
./tools/safe-refactor.sh functionName1 functionName2

# For general code changes
node tools/code-safety-manager.js analyze [change-type] [identifiers]
```

**Step 2: Security Validation (MANDATORY)**
```bash
node tools/security-validator.js .
```

**Step 3: Function Testing (MANDATORY)**
```javascript
// In browser console after changes
new FFTCGTestSuite().runTests()
```

### 📋 CHANGE TYPE WORKFLOW

#### For REMOVING/DELETING Code:
1. **STOP** - Run dependency analysis first: `./tools/safe-refactor.sh functionName`
2. If analysis shows dependencies → **DO NOT REMOVE**
3. If approved → Comment out first, don't delete
4. Test thoroughly with commented code
5. Only delete after user confirms everything works

#### For MODIFYING/REFACTORING Code:
1. Run safety analysis: `./tools/safe-refactor.sh functionName`
2. Make changes incrementally
3. Test after each change
4. Verify no console errors

#### For ADDING New Code:
1. Follow existing patterns in codebase
2. Use security best practices
3. Test integration with existing functionality

### 🛡️ MANDATORY CHECKS BEFORE COMMITTING

1. **Dependency Analysis**: All functions analyzed and approved
2. **Security Validation**: No degradation in security posture  
3. **Function Testing**: All critical functions still work
4. **Manual Testing**: Core user workflows verified
5. **Console Check**: No new errors in browser console

### ⚠️ RED FLAGS - STOP IMMEDIATELY

- Function has ANY dependencies in analysis
- Security validator shows degradation
- Function name contains: validate, sanitize, auth, security, permission
- Function is called in HTML onclick/onchange handlers
- Function appears in strings/CSS selectors
- Unsure about function's purpose

### 🚀 EXAMPLE SAFE WORKFLOW

```bash
# 1. Before changing toggleFilter function
./tools/safe-refactor.sh toggleFilter

# Expected output: "NOT SAFE - 66 dependencies found"
# Action: DON'T PROCEED - Update dependencies first

# 2. Before changing a truly unused function  
./tools/safe-refactor.sh unusedHelperFunction

# Expected output: "SAFE - 0 dependencies found"
# Action: Proceed with caution, test thoroughly

# 3. After making any changes
node tools/security-validator.js .
# Browser: new FFTCGTestSuite().runTests()
```

### 📊 INTERPRETING ANALYSIS RESULTS

**APPROVED** = Can proceed with extreme caution
- Still requires testing
- Still requires user confirmation
- Still can break things if not careful

**BLOCKED** = Must fix dependencies first
- Find all usage locations
- Update or remove dependencies
- Re-run analysis
- Consider refactoring instead

**SECURITY ISSUES** = Manual review required
- Get user approval
- Document security implications
- Consider alternatives

### 🆘 EMERGENCY PROCEDURES

**If I accidentally break something:**
1. Immediately acknowledge the mistake
2. Run: `git log --oneline -5` to find the breaking commit
3. Run: `git revert <commit-hash>` to undo changes
4. Explain what went wrong and how the safety system would have prevented it
5. Run proper analysis before attempting again

**If safety tools are unavailable:**
- **DO NOT** make code changes without them
- Ask user to run the installation: `./tools/install-safety-hooks.sh`
- Wait for confirmation before proceeding

### 📝 COMMUNICATION PROTOCOL

**Always inform the user:**
- What analysis I'm running
- Results of the analysis (approved/blocked)
- What I'm about to change
- What testing is needed
- Any risks or concerns

**Example:**
"I'm about to modify the toggleFilter function. Let me run safety analysis first:
```
./tools/safe-refactor.sh toggleFilter
```
Results show 66 dependencies - this function is NOT safe to remove. I'll need to update all dependent code first or find an alternative approach."

### 🎯 SUCCESS METRICS

**Good session:**
- All changes analyzed before implementation
- No breaking changes
- All tests pass
- User workflows uninterrupted
- Security posture maintained

**Failed session:**
- Made changes without analysis
- Broke user functionality
- Introduced security issues
- Required emergency rollbacks

### 💡 REMEMBER

- The safety system exists because I made mistakes before
- "Redundant" code often isn't actually redundant
- User trust is earned through careful, methodical changes
- When in doubt, ask the user instead of guessing
- It's better to be overly cautious than accidentally destructive

---

**This workflow is mandatory. No exceptions. No shortcuts.**