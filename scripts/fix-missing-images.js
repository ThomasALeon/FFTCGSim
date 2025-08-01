const fs = require('fs');

console.log('🔧 Fixing Missing Image URLs for Beyond Destiny, Hidden Trials, and Promo Cards\n');

// Load the current data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync('js/data/card_image_mapping.json', 'utf8'));

let updatedCount = 0;

// Function to get MateriaHunter URL based on card ID and set
function getMateriaHunterURL(cardId, setName) {
    // Parse card ID to extract components
    const parts = cardId.split('-');
    if (parts.length < 2) return null;
    
    const setNumber = parts[0];
    const cardNumber = parts[1];
    
    // Extract rarity (last character of card number)
    const rarity = cardNumber.slice(-1);
    const baseNumber = cardNumber.slice(0, -1);
    
    // Different URL patterns based on set
    switch (setName) {
        case 'Beyond Destiny':
            // Set 21: https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/21/21-001R.jpg
            return `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/21/${setNumber}-${cardNumber}.jpg`;
            
        case 'Hidden Trials':
            // Set 23: https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/23/23-001C.jpg
            return `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/23/${setNumber}-${cardNumber}.jpg`;
            
        case 'Legacy Collection':
            // Legacy Collection: Try different patterns
            if (cardId.startsWith('Re-')) {
                // Format: Re-001H -> https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/legacy/Re-001H.jpg
                return `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/legacy/${cardId}.jpg`;
            }
            break;
            
        default:
            // Check if it's a promo card
            if (cardId.startsWith('PR-') || setNumber === 'PR') {
                // Promo cards: https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/PR/PR-XXX.jpg
                return `https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/PR/${cardId}.jpg`;
            }
    }
    
    return null;
}

// Process cards by set
const setsToFix = ['Beyond Destiny', 'Hidden Trials', 'Legacy Collection'];
const promoCards = cardData.filter(card => card.id.startsWith('PR-'));

console.log('📊 Processing sets:');
setsToFix.forEach(setName => {
    const setCards = cardData.filter(card => card.set === setName);
    console.log(`   ${setName}: ${setCards.length} cards`);
    
    setCards.forEach(card => {
        const currentMapping = imageMapping[card.id];
        
        // Only update if no image URL exists or if it's a broken Square Enix URL
        if (!currentMapping?.image || currentMapping.source === 'square-enix') {
            const newURL = getMateriaHunterURL(card.id, setName);
            
            if (newURL) {
                imageMapping[card.id] = {
                    name: card.name,
                    image: newURL,
                    source: 'materia-hunter'
                };
                updatedCount++;
            }
        }
    });
});

// Process promo cards
console.log(`   Promo Cards: ${promoCards.length} cards`);
promoCards.forEach(card => {
    const currentMapping = imageMapping[card.id];
    
    if (!currentMapping?.image || currentMapping.source === 'square-enix') {
        const newURL = getMateriaHunterURL(card.id, 'Promo');
        
        if (newURL) {
            imageMapping[card.id] = {
                name: card.name,
                image: newURL,
                source: 'materia-hunter'
            };
            updatedCount++;
        }
    }
});

// Handle cards that might be missing entirely from image mapping
const missingCards = cardData.filter(card => !imageMapping[card.id]);
console.log(`\n🔍 Found ${missingCards.length} cards missing from image mapping entirely`);

missingCards.forEach(card => {
    const newURL = getMateriaHunterURL(card.id, card.set);
    
    if (newURL) {
        imageMapping[card.id] = {
            name: card.name,
            image: newURL,
            source: 'materia-hunter'
        };
        updatedCount++;
        console.log(`   Added: ${card.id} (${card.set})`);
    } else {
        console.log(`   Could not determine URL for: ${card.id} (${card.set})`);
    }
});

// Save the updated image mapping
fs.writeFileSync('js/data/card_image_mapping.json', JSON.stringify(imageMapping, null, 2));

console.log(`\n✅ Updated ${updatedCount} card image mappings`);
console.log('📊 Final Summary:');

// Calculate final coverage
const totalCards = cardData.length;
const cardsWithImages = Object.values(imageMapping).filter(mapping => 
    mapping.image && mapping.source === 'materia-hunter'
).length;

console.log(`   Total cards: ${totalCards}`);
console.log(`   Cards with MateriaHunter images: ${cardsWithImages}`);
console.log(`   Coverage: ${Math.round((cardsWithImages / totalCards) * 100)}%`);

// Test a few URLs to verify they work
console.log('\n🧪 Testing sample URLs:');
const testCards = [
    '21-001R', // Beyond Destiny
    '23-001C', // Hidden Trials
    'PR-001'   // Promo
];

testCards.forEach(cardId => {
    const mapping = imageMapping[cardId];
    if (mapping) {
        console.log(`   ${cardId}: ${mapping.image}`);
    }
});