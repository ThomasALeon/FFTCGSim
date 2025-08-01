const fs = require('fs');

console.log('🔍 Analyzing Card Categories/Archetypes\n');

// Load the card data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));

// Analyze categories
const categoryStats = {};
const categoryBySet = {};

cardData.forEach(card => {
    const category = card.category || 'Unknown';
    const set = card.set || 'Unknown';
    
    // Count categories
    if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, sets: new Set(), samples: [] };
    }
    categoryStats[category].count++;
    categoryStats[category].sets.add(set);
    
    if (categoryStats[category].samples.length < 3) {
        categoryStats[category].samples.push({
            name: card.name,
            id: card.id,
            job: card.job,
            set: set
        });
    }
    
    // Track categories by set
    if (!categoryBySet[set]) {
        categoryBySet[set] = {};
    }
    if (!categoryBySet[set][category]) {
        categoryBySet[set][category] = 0;
    }
    categoryBySet[set][category]++;
});

console.log('📊 All Available Categories:');
console.log('============================');

// Sort categories by count (descending)
const sortedCategories = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.count - a.count);

sortedCategories.forEach(([category, stats]) => {
    console.log(`${category}: ${stats.count} cards across ${stats.sets.size} sets`);
    console.log(`   Sample cards:`);
    stats.samples.forEach(sample => {
        console.log(`     - ${sample.name} (${sample.id}) - ${sample.job} from ${sample.set}`);
    });
    console.log();
});

console.log('🎮 Final Fantasy Game Categories:');
console.log('=================================');

// Identify FF game categories (Roman numerals and special cases)
const ffGameCategories = sortedCategories.filter(([category]) => {
    return /^[IVX]+$/.test(category) || // Roman numerals
           ['Type-0', 'Mobius', 'Tactics', 'Crystal Chronicles', 'Dissidia'].includes(category);
});

ffGameCategories.forEach(([category, stats]) => {
    let gameName = category;
    
    // Convert some categories to full game names for clarity
    const gameNames = {
        'I': 'Final Fantasy I',
        'II': 'Final Fantasy II', 
        'III': 'Final Fantasy III',
        'IV': 'Final Fantasy IV',
        'V': 'Final Fantasy V',
        'VI': 'Final Fantasy VI',
        'VII': 'Final Fantasy VII',
        'VIII': 'Final Fantasy VIII',
        'IX': 'Final Fantasy IX',
        'X': 'Final Fantasy X',
        'XI': 'Final Fantasy XI',
        'XII': 'Final Fantasy XII',
        'XIII': 'Final Fantasy XIII',
        'XIV': 'Final Fantasy XIV',
        'XV': 'Final Fantasy XV',
        'XVI': 'Final Fantasy XVI',
        'Type-0': 'Final Fantasy Type-0',
        'Mobius': 'Final Fantasy Mobius',
        'Tactics': 'Final Fantasy Tactics',
        'Crystal Chronicles': 'Final Fantasy Crystal Chronicles',
        'Dissidia': 'Dissidia Final Fantasy'
    };
    
    if (gameNames[category]) {
        gameName = gameNames[category];
    }
    
    console.log(`${category} (${gameName}): ${stats.count} cards`);
});

console.log(`\n📈 Summary:`);
console.log(`Total unique categories: ${sortedCategories.length}`);
console.log(`FF Game categories: ${ffGameCategories.length}`);
console.log(`Total cards analyzed: ${cardData.length}`);

// Show category distribution by type
console.log('\n🃏 Category Distribution by Card Type:');
console.log('=====================================');

const categoryByType = {};
cardData.forEach(card => {
    const category = card.category || 'Unknown';
    const type = card.type || 'Unknown';
    
    if (!categoryByType[category]) {
        categoryByType[category] = {};
    }
    if (!categoryByType[category][type]) {
        categoryByType[category][type] = 0;
    }
    categoryByType[category][type]++;
});

// Show top categories with type breakdown
sortedCategories.slice(0, 10).forEach(([category, stats]) => {
    console.log(`${category} (${stats.count} total):`);
    const types = Object.entries(categoryByType[category])
        .sort(([,a], [,b]) => b - a);
    types.forEach(([type, count]) => {
        console.log(`   ${type}: ${count} cards`);
    });
    console.log();
});