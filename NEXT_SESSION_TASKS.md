# FFTCG Simulator - Next Session Critical Tasks

## 🚨 URGENT FIXES NEEDED

### 1. **Event Log Positioning Crisis**
- **Problem**: Event log entries appear OUTSIDE the Game Events Log box
- **Symptom**: Logs are pushing the Game Event Log container down instead of appearing inside
- **Root Cause**: DOM element targeting issue - events not being appended to correct container
- **Fix Required**: Debug and fix `addEventLogEntry()` method to properly target `#eventLogContent`

### 2. **Game Start Turn Sequence Bug**
- **Problem**: Two complete turns are being executed automatically on game start
- **Evidence**: 
  ```
  6:52:36 PM You entered Main Phase 1 phase
  6:52:35 PM You entered Draw Phase phase  
  6:52:35 PM You drew 2 cards
  6:52:34 PM You entered End Phase phase
  6:52:34 PM You entered Active Phase phase
  6:52:34 PM Turn Your turn - Turn 2: Opponent's turn begins
  6:52:32 PM Opponent entered Main Phase 2 phase
  ```
- **Fix Required**: Investigate GameEngine initialization - likely double-triggering turn sequence

### 3. **FFTCG Draw Rules Implementation**
**Current Issues:**
- Both players drawing 5 cards on game start (correct)
- Both players drawing 2 cards every turn (incorrect for turn 1)
- No first-turn draw rule implementation

**FFTCG Official Rules to Implement:**
1. **Starting Hand**: 5 cards each (✅ working)
2. **Mulligan System**: Allow one mulligan - shuffle hand back, draw 5 new
3. **First Turn Draw**: Player going first draws only 1 card on turn 1
4. **Normal Draw**: From turn 2 onward, both players draw 2 cards
5. **No Hand Limit**: Remove any maximum hand size restrictions (if any exist)

## 📋 CURRENT TODO LIST STATUS

### ✅ **Completed Tasks**
1. Revert GameEngine CP changes to keep current system working
2. Create damage zone (life points) system  
3. Add event log UI with toggle button on right side
4. Implement proper FFTCG Damage Zone system
5. Add damage zone visual display on main board
6. Add EX Burst trigger system
7. Fix event log styling and ordering (❌ BROKEN AGAIN - needs re-fix)

### 🔴 **Critical Priority (Next Session)**
1. **FIX EVENT LOG POSITIONING** - entries must appear INSIDE the log box
2. **FIX GAME START SEQUENCE** - stop double turn execution
3. **IMPLEMENT FFTCG DRAW RULES** - first turn draw, mulligan system

### 🟡 **Medium Priority**
4. Fix phase display text and button labels
5. Fix CP display to show only deck elements
6. Implement deck-to-damage animation

### 🟢 **Low Priority (Future)**
7. Implement proper Payment Mode system (Phase 2)
8. Migrate systems to Payment Mode (Phase 3) 
9. Remove old CP system (Phase 4)
10. Optimize board layout for ultra-wide screens
11. Improve responsive design for smaller screens

## 🔍 **Investigation Points**

### Event Log Issue
- Check if `document.getElementById('eventLogContent')` returns null
- Verify DOM element structure in HTML
- Check for CSS positioning conflicts
- Investigate if events are being added to wrong parent element

### Game Start Issue
- Look for double initialization in GameEngine
- Check for duplicate event listeners
- Investigate turn counter starting logic
- Review game state initialization sequence

### Draw System
- Locate current draw logic in GameEngine
- Identify where turn counter is tracked
- Find first-turn detection mechanism
- Implement mulligan UI and logic

## 📁 **Files to Focus On Next Session**
1. `src/components/GameBoard.js` - Event log methods
2. `src/core/GameEngine.js` - Turn sequence and draw logic  
3. `index.html` - DOM structure verification
4. `assets/css/components/game-board.css` - Event log container styling

## 🎯 **Success Criteria for Next Session**
- [ ] Event log entries appear INSIDE the Game Events Log box
- [ ] Game starts with proper turn sequence (no double execution)
- [ ] First player draws 1 card on turn 1, 2 cards afterward
- [ ] Second player always draws 2 cards
- [ ] Mulligan system implemented and functional

---
*Created: 2025-08-09 - Session ended due to usage limits*
*Priority: URGENT - Critical gameplay issues affecting core functionality*