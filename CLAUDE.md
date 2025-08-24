# 🚨 CLAUDE: READ THIS FIRST - MANDATORY SAFETY PROCEDURES

## STOP: Before making ANY code changes, you MUST:

1. **Read the full workflow**: `CLAUDE_WORKFLOW_INSTRUCTIONS.md`
2. **Run safety analysis**: `./tools/safe-refactor.sh functionName`
3. **Never remove code** without dependency analysis showing 0 usages
4. **Get user approval** before proceeding with any changes

## Red Flag Keywords That Require Safety Analysis:
- remove, delete, clean, redundant, unused, simplify, optimize, refactor

## If User Reports Broken Functionality:
- FIRST: Check if you recently modified code without safety analysis
- Run: `git log --oneline -5` to see recent changes
- Be ready to rollback: `git revert <commit-hash>`

## The toggleFilter Incident:
You previously removed "redundant" code that had 66+ dependencies, breaking the entire filter system. This must NEVER happen again.

## Emergency Commands:
```bash
# Before ANY code removal:
./tools/safe-refactor.sh functionName

# If something breaks:
git revert <commit-hash>
```

**Remember: The safety tools exist because you made mistakes before. Use them every time.**