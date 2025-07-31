const fs = require('fs');

console.log('🎯 Consolidating Categories to Proper 37 Categories\n');

// Load the card data
const cardData = JSON.parse(fs.readFileSync('js/data/fftcg_real_cards.json', 'utf8'));

// The proper 37 categories you mentioned
const properCategories = [
    // Roman numerals I-XVI
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI',
    // Named categories
    'Anniversary', 'Crystal Hunt', 'DFF', 'FFBE', 'FFCC', 'FFEX', 'FFL', 'FFRK', 'FFT', 'FFTA', 'FFTA2', 'FFTS', 
    'LOV', 'Mobius', 'MQ', 'Pictlogica', 'SOPFFO', 'Special', 'THEATRHYTHM', 'Type-0', 'WOFF'
];

console.log(`Target categories (${properCategories.length}):`, properCategories.join(', '));

// Analyze current categories and create mapping
const currentCategories = [...new Set(cardData.map(card => card.category).filter(Boolean))];
console.log(`\nCurrent categories found: ${currentCategories.length}`);

// Create a mapping from current messy categories to proper categories
const categoryMapping = {};

// Helper function to map current categories to proper ones
function mapCategory(currentCategory) {
    if (!currentCategory) return 'Special';
    
    // Direct matches
    if (properCategories.includes(currentCategory)) {
        return currentCategory;
    }
    
    // Roman numerals mapping
    if (/^[IVX]+$/.test(currentCategory)) {
        return currentCategory; // Keep as-is if it's a valid roman numeral
    }
    
    // Complex mappings for DFF variations
    if (currentCategory.startsWith('DFF')) {
        return 'DFF';
    }
    
    // Type-0 variations
    if (currentCategory.includes('TYPE-0') || currentCategory === 'TYPE-0') {
        return 'Type-0';
    }
    
    // FFBE variations
    if (currentCategory.startsWith('FFBE')) {
        return 'FFBE';
    }
    
    // FFCC variations  
    if (currentCategory === 'FFCC' || currentCategory.startsWith('FFCC')) {
        return 'FFCC';
    }
    
    // FFT variations
    if (currentCategory === 'FFT' || currentCategory.startsWith('FFT')) {
        return 'FFT';
    }
    
    // FFTA variations
    if (currentCategory === 'FFTA' || currentCategory.startsWith('FFTA')) {
        if (currentCategory === 'FFTA2') return 'FFTA2';
        return 'FFTA';
    }
    
    // Mobius variations
    if (currentCategory === 'MOBIUS' || currentCategory.startsWith('MOBIUS')) {
        return 'Mobius';
    }
    
    // THEATRHYTHM variations
    if (currentCategory.startsWith('THEATRHYTHM')) {
        return 'THEATRHYTHM';
    }
    
    // PICTLOGICA variations
    if (currentCategory.startsWith('PICTLOGICA')) {
        return 'Pictlogica';
    }
    
    // LOV variations
    if (currentCategory.startsWith('LOV')) {
        return 'LOV';
    }
    
    // WOFF
    if (currentCategory === 'WOFF') {
        return 'WOFF';
    }
    
    // FFL
    if (currentCategory === 'FFL') {
        return 'FFL';
    }
    
    // FFEX
    if (currentCategory.startsWith('FFEX')) {
        return 'FFEX';
    }
    
    // FFRK
    if (currentCategory === 'FFRK' || currentCategory.startsWith('FFRK')) {
        return 'FFRK';
    }
    
    // SOPFFO
    if (currentCategory === 'SOPFFO') {
        return 'SOPFFO';
    }
    
    // Crystal Hunt
    if (currentCategory === 'Crystal Hunt') {
        return 'Crystal Hunt';
    }
    
    // MQ (Mystic Quest)
    if (currentCategory === 'THEATRHYTHM &middot; MQ') {
        return 'MQ';
    }
    
    // Everything else goes to Special
    return 'Special';
}

// Build the mapping
currentCategories.forEach(category => {
    categoryMapping[category] = mapCategory(category);
});

console.log('\n📊 Category Mapping:');
console.log('===================');

// Group by target category
const mappingByTarget = {};
Object.entries(categoryMapping).forEach(([current, target]) => {
    if (!mappingByTarget[target]) {
        mappingByTarget[target] = [];
    }
    mappingByTarget[target].push(current);
});

// Show the mapping
Object.entries(mappingByTarget).forEach(([target, sources]) => {
    console.log(`${target}:`);
    sources.forEach(source => {
        const cardCount = cardData.filter(card => card.category === source).length;
        console.log(`   ${source} (${cardCount} cards)`);
    });
    console.log();
});

// Count cards in each final category
console.log('📈 Final Category Distribution:');
console.log('===============================');

const finalCounts = {};
cardData.forEach(card => {
    const finalCategory = mapCategory(card.category);
    finalCounts[finalCategory] = (finalCounts[finalCategory] || 0) + 1;
});

// Sort by count descending
const sortedFinalCounts = Object.entries(finalCounts)
    .sort(([,a], [,b]) => b - a);

sortedFinalCounts.forEach(([category, count]) => {
    console.log(`${category}: ${count} cards`);
});

console.log(`\nTotal categories after consolidation: ${Object.keys(finalCounts).length}`);
console.log(`Target was: ${properCategories.length} categories`);

// Save the mapping for use in the DeckBuilder
fs.writeFileSync('category-mapping.json', JSON.stringify(categoryMapping, null, 2));
console.log('\n✅ Category mapping saved to category-mapping.json');
console.log('💡 This mapping should be used in the DeckBuilder to consolidate categories');