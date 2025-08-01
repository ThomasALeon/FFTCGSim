const fs = require('fs');

console.log('🔍 Analyzing Image Coverage by Set\n');

// Load the data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync('js/data/card_image_mapping.json', 'utf8'));

// Group cards by set
const cardsBySets = cardData.reduce((acc, card) => {
    if (!acc[card.set]) {
        acc[card.set] = [];
    }
    acc[card.set].push(card);
    return acc;
}, {});

console.log('📊 Set Analysis:');
console.log('================');

const setsWithImages = {};
const setsWithoutImages = {};

Object.entries(cardsBySets).forEach(([setName, cards]) => {
    const totalCards = cards.length;
    const cardsWithImages = cards.filter(card => {
        const mapping = imageMapping[card.id];
        return mapping && mapping.image && mapping.source === 'materia-hunter';
    }).length;
    
    const coverage = Math.round((cardsWithImages / totalCards) * 100);
    
    if (cardsWithImages > 0) {
        setsWithImages[setName] = {
            total: totalCards,
            withImages: cardsWithImages,
            coverage: coverage,
            sampleCard: cards[0].id,
            sampleUrl: imageMapping[cards[0].id]?.image || 'No URL'
        };
    } else {
        setsWithoutImages[setName] = {
            total: totalCards,
            sampleCard: cards[0].id
        };
    }
});

console.log('✅ Sets WITH MateriaHunter Images:');
console.log('==================================');
Object.entries(setsWithImages)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([setName, data]) => {
        console.log(`${setName}: ${data.withImages}/${data.total} cards (${data.coverage}%)`);
        console.log(`   Sample: ${data.sampleCard} -> ${data.sampleUrl.substring(0, 80)}...`);
        console.log();
    });

console.log('❌ Sets WITHOUT MateriaHunter Images:');
console.log('====================================');
Object.entries(setsWithoutImages)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([setName, data]) => {
        console.log(`${setName}: ${data.total} cards`);
        console.log(`   Sample card ID: ${data.sampleCard}`);
        console.log();
    });

console.log('📈 Summary:');
console.log('===========');
const totalSets = Object.keys(cardsBySets).length;
const setsWithCoverage = Object.keys(setsWithImages).length;
const setsWithoutCoverage = Object.keys(setsWithoutImages).length;

console.log(`Total sets: ${totalSets}`);
console.log(`Sets with images: ${setsWithCoverage}`);
console.log(`Sets without images: ${setsWithoutCoverage}`);

const totalCards = cardData.length;
const totalCardsWithImages = Object.values(setsWithImages)
    .reduce((sum, set) => sum + set.withImages, 0);

console.log(`Total cards: ${totalCards}`);
console.log(`Cards with MateriaHunter images: ${totalCardsWithImages}`);
console.log(`Overall coverage: ${Math.round((totalCardsWithImages / totalCards) * 100)}%`);