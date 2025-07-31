# Future Features & Enhancements

## 🎨 **Alt Art Variants Implementation**

### Overview
Materia Hunter has alternate art versions for many cards with special suffixes:
- `_F_FA` = Foil Full Art variants
- Example: `1-141L_F_FA.jpg` for Lightning Full Art

### URL Pattern Discovery
- **Standard**: `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/16/1-141L.jpg`
- **Full Art**: `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/16/1-141L_F_FA.jpg`

### Implementation Plan
1. **Card Variant Detection**: Systematically test which cards have `_F_FA` variants
2. **UI Enhancement**: Add toggle/option in card preview to switch between standard and alt art
3. **Data Structure**: Extend `card_image_mapping.json` to include variant URLs:
   ```json
   {
     "1-141L": {
       "name": "Lightning",
       "image": "standard_url.jpg",
       "source": "materia-hunter",
       "variants": {
         "full_art": "full_art_url_F_FA.jpg",
         "foil": "foil_url.jpg"
       }
     }
   }
   ```

4. **User Experience**: 
   - Card preview modal shows variant selector
   - Deck builder could have "Show Alt Art" preference
   - Collection view with variant thumbnails

### Technical Notes
- Need to test suffix patterns across different Opus sets
- May have other variants beyond `_F_FA` (investigate: `_F`, `_FOIL`, etc.)
- Consider aspect ratios - Full Art cards may have different dimensions

### Priority: **Future Enhancement** 
*Implement after core functionality is stable*

---

## 🐛 **Current Issues to Address**

### Modal Z-Index Problem
- Card preview modal appears behind card grid
- User must click outside to dismiss card overlay
- Needs immediate fix for usability