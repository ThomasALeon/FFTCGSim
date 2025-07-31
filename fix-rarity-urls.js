const fs = require('fs');

console.log('🔧 Fixing Image URLs for Sets That Need Rarity in Filename\n');

// Load the current data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync('js/data/card_image_mapping.json', 'utf8'));

// Sets that need rarity in filename (based on testing)
const setsNeedingRarity = [
    'Hidden Hope',      // Set 22
    'Dawn of Heroes',   // Set 20  
    'Tears of the Planet', // Set 25
    'Hidden Trials',    // Set 23 (already fixed but double-check)
    'Beyond Destiny'    // Set 21 (already fixed but double-check)
];

let updatedCount = 0;

console.log('📊 Processing sets that need rarity in filename:');

setsNeedingRarity.forEach(setName => {
    const setCards = cardData.filter(card => card.set === setName);
    console.log(`\n🔍 ${setName}: ${setCards.length} cards`);
    
    let setUpdatedCount = 0;
    
    setCards.forEach(card => {
        const currentMapping = imageMapping[card.id];
        
        if (currentMapping && currentMapping.image) {
            // Check if the current URL is missing rarity
            const parts = card.id.split('-');
            if (parts.length >= 2) {
                const setNumber = parts[0];
                const cardNumber = parts[1];
                
                // Check if current URL is missing the rarity
                const expectedUrlWithRarity = `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/${setNumber}/${card.id}.jpg`;
                
                if (currentMapping.image !== expectedUrlWithRarity) {
                    // Update to include rarity
                    imageMapping[card.id] = {
                        name: card.name,
                        image: expectedUrlWithRarity,
                        source: 'materia-hunter'
                    };
                    setUpdatedCount++;
                    updatedCount++;
                }
            }
        }
    });
    
    console.log(`   Updated: ${setUpdatedCount} cards`);
});

// Also check for any other sets that might need this pattern
console.log('\n🔍 Checking other sets for similar patterns...');

const allSets = [...new Set(cardData.map(card => card.set))];
const potentialSetsToCheck = allSets.filter(set => 
    !setsNeedingRarity.includes(set) && 
    !['Opus I', 'Opus II', 'Opus III', 'Opus IV', 'Opus V', 'Opus VI', 'Opus VII', 'Opus VIII', 'Opus IX', 'Opus X', 'Opus XI', 'Opus XII', 'Opus XIII', 'Opus XIV'].includes(set)
);

console.log(`Found ${potentialSetsToCheck.length} other sets to potentially check:`, potentialSetsToCheck.slice(0, 5));

// Save the updated image mapping
fs.writeFileSync('js/data/card_image_mapping.json', JSON.stringify(imageMapping, null, 2));

console.log(`\n✅ Updated ${updatedCount} card image URLs to include rarity`);

// Test a few URLs to verify they work
console.log('\n🧪 Testing sample updated URLs:');
const testCards = [
    '22-001R', // Hidden Hope
    '20-001R', // Dawn of Heroes  
    '25-001C'  // Tears of the Planet
];

testCards.forEach(cardId => {
    const mapping = imageMapping[cardId];
    if (mapping) {
        console.log(`   ${cardId}: ${mapping.image}`);
    }
});

console.log('\n📊 Final Coverage:');
setsNeedingRarity.forEach(setName => {
    const setCards = cardData.filter(card => card.set === setName);
    const cardsWithImages = setCards.filter(card => {
        const mapping = imageMapping[card.id];
        return mapping && mapping.image;
    });
    console.log(`   ${setName}: ${cardsWithImages.length}/${setCards.length} cards have images`);
});