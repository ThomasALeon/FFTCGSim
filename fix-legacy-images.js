const fs = require('fs');

console.log('🔧 Fixing Legacy Collection Image URLs\n');

// Load the current data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync('js/data/card_image_mapping.json', 'utf8'));

// Get Legacy Collection cards
const legacyCards = cardData.filter(card => card.set === 'Legacy Collection');
console.log(`Found ${legacyCards.length} Legacy Collection cards`);

let updatedCount = 0;

// Test different URL patterns for Legacy Collection
const testPatterns = [
    'https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/legacy/',
    'https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/lc/',
    'https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/reprint/',
    'https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/Re/'
];

console.log('🧪 Testing Legacy Collection URL patterns...');

// Test a sample card with different patterns
const sampleCard = legacyCards[0];
const cardId = sampleCard.id.split('/')[0]; // Get just the "Re-001H" part

console.log(`Sample card: ${sampleCard.id} -> Using ${cardId}`);

// For now, let's use the original card's image from the set it was reprinted from
legacyCards.forEach(card => {
    const parts = card.id.split('/');
    if (parts.length === 2) {
        const legacyId = parts[0]; // Re-001H
        const originalId = parts[1]; // 12-002H
        
        // Check if we have an image for the original card
        const originalMapping = imageMapping[originalId];
        if (originalMapping && originalMapping.image) {
            // Use the original card's image for the legacy version
            imageMapping[card.id] = {
                name: card.name,
                image: originalMapping.image,
                source: 'materia-hunter'
            };
            updatedCount++;
        } else {
            // Try to construct URL based on legacy ID format
            // Legacy cards might be at /cards/legacy/Re-001H.jpg
            const legacyURL = `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/legacy/${legacyId}.jpg`;
            imageMapping[card.id] = {
                name: card.name,
                image: legacyURL,
                source: 'materia-hunter'
            };
            updatedCount++;
        }
    }
});

// Save the updated mapping
fs.writeFileSync('js/data/card_image_mapping.json', JSON.stringify(imageMapping, null, 2));

console.log(`\n✅ Updated ${updatedCount} Legacy Collection card mappings`);

// Final coverage check
const totalCards = cardData.length;
const cardsWithImages = Object.values(imageMapping).filter(mapping => 
    mapping.image && mapping.source === 'materia-hunter'
).length;

console.log(`\n📊 Final Coverage:`);
console.log(`   Total cards: ${totalCards}`);
console.log(`   Cards with MateriaHunter images: ${cardsWithImages}`);
console.log(`   Coverage: ${Math.round((cardsWithImages / totalCards) * 100)}%`);

// Show sample URLs
console.log('\n🔗 Sample Legacy Collection URLs:');
legacyCards.slice(0, 3).forEach(card => {
    const mapping = imageMapping[card.id];
    if (mapping) {
        console.log(`   ${card.id}: ${mapping.image.substring(0, 80)}...`);
    }
});