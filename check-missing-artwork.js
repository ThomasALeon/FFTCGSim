const fs = require('fs');

console.log('🖼️  Checking Missing Artwork in Specific Sets\n');

// Load the data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync('js/data/card_image_mapping.json', 'utf8'));

// Sets to check
const setsToCheck = [
    'Crystal Dominion',
    'Hidden Hope', 
    'Tears of the Planet',
    'Dawn of Heroes'
];

console.log('📊 Analyzing artwork coverage for specific sets:\n');

for (const setName of setsToCheck) {
    console.log(`🔍 ${setName}:`);
    console.log('=' .repeat(setName.length + 4));
    
    const setCards = cardData.filter(card => card.set === setName);
    console.log(`Total cards in set: ${setCards.length}`);
    
    const cardsWithImages = [];
    const cardsWithoutImages = [];
    const brokenImageUrls = [];
    
    for (const card of setCards) {
        const mapping = imageMapping[card.id];
        
        if (!mapping) {
            cardsWithoutImages.push({
                id: card.id,
                name: card.name,
                issue: 'No mapping entry'
            });
        } else if (!mapping.image) {
            cardsWithoutImages.push({
                id: card.id,
                name: card.name,
                issue: 'No image URL'
            });
        } else {
            cardsWithImages.push({
                id: card.id,
                name: card.name,
                url: mapping.image,
                source: mapping.source
            });
        }
    }
    
    console.log(`Cards with images: ${cardsWithImages.length}`);
    console.log(`Cards without images: ${cardsWithoutImages.length}`);
    
    if (cardsWithoutImages.length > 0) {
        console.log('\n❌ Cards missing images:');
        cardsWithoutImages.slice(0, 5).forEach(card => {
            console.log(`   ${card.id}: ${card.name} (${card.issue})`);
        });
        if (cardsWithoutImages.length > 5) {
            console.log(`   ... and ${cardsWithoutImages.length - 5} more`);
        }
    }
    
    // Test a few sample URLs
    if (cardsWithImages.length > 0) {
        console.log('\n🧪 Sample image URLs to test:');
        cardsWithImages.slice(0, 3).forEach(card => {
            console.log(`   ${card.id}: ${card.url}`);
        });
    }
    
    console.log();
}

// Check for patterns in missing cards
console.log('🔍 Pattern Analysis:');
console.log('==================');

const allCardsInSets = cardData.filter(card => setsToCheck.includes(card.set));
const cardsByOpus = {};

allCardsInSets.forEach(card => {
    const opusMatch = card.id.match(/^(\d+)-/);
    if (opusMatch) {
        const opus = opusMatch[1];
        if (!cardsByOpus[opus]) {
            cardsByOpus[opus] = [];
        }
        cardsByOpus[opus].push(card);
    }
});

console.log('Cards grouped by Opus number:');
Object.entries(cardsByOpus).forEach(([opus, cards]) => {
    const withImages = cards.filter(card => {
        const mapping = imageMapping[card.id];
        return mapping && mapping.image;
    });
    
    console.log(`Opus ${opus}: ${withImages.length}/${cards.length} have images`);
    
    if (withImages.length < cards.length) {
        const missing = cards.filter(card => {
            const mapping = imageMapping[card.id];
            return !mapping || !mapping.image;
        });
        console.log(`   Missing: ${missing.slice(0, 3).map(c => c.id).join(', ')}${missing.length > 3 ? '...' : ''}`);
    }
});

console.log('\n💡 Recommendations:');
console.log('==================');
console.log('1. Test sample URLs with curl to see if they return 404');
console.log('2. Check if MateriaHunter has different URL patterns for these sets');
console.log('3. Look for alternative image sources for missing cards');