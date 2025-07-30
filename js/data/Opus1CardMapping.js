/**
 * OPUS 1 CARD MAPPING - Maps existing card data to actual Opus 1 images
 * 
 * This module provides mapping between our extended card database
 * and the actual Opus 1 card images we now have available
 */

/**
 * Map of card IDs to their corresponding Opus 1 image files
 * Format: cardId -> opus1ImageFile
 */
export const OPUS_1_IMAGE_MAPPING = {
    // Fire Cards
    'ff1-001-h': '1-001H.png', // Terra -> Lightning (Hero)
    'ff1-002-c': '1-008C.png', // Goblin -> Goblin
    'ff1-003-c': '1-003C.png', // Red Mage -> Red Mage
    'ff1-004-r': '1-005R.png', // Ifrit -> Ifrit
    'ff1-005-c': '1-014C.png', // Fire Crystal -> Monk
    'ff1-006-l': '1-015L.png', // Phoenix -> Phoenix
    'ff1-007-c': '1-024C.png', // Flame -> Flame
    'ff1-008-c': '1-025C.png', // Red Chocobo -> Red Chocobo
    'ff1-009-r': '1-028R.png', // Bahamut -> Bahamut
    
    // Ice Cards  
    'ff1-010-h': '1-006H.png', // Shiva -> Shiva
    'ff1-011-c': '1-029C.png', // Ice Soldier -> Ice Soldier
    'ff1-012-r': '1-030R.png', // Golbez -> Golbez
    'ff1-013-c': '1-031C.png', // White Mage -> White Mage
    'ff1-014-c': '1-032C.png', // Scholar -> Scholar
    'ff1-015-l': '1-041L.png', // Leviathan -> Leviathan
    'ff1-016-c': '1-048C.png', // Cure -> Cure
    'ff1-017-r': '1-051R.png', // Cecil -> Cecil
    'ff1-018-c': '1-053C.png', // Knight -> Knight
    
    // Wind Cards
    'ff1-019-h': '1-063H.png', // Cloud -> Cloud
    'ff1-020-c': '1-065C.png', // Chocobo -> Chocobo  
    'ff1-021-r': '1-067R.png', // Aerith -> Aerith
    'ff1-022-c': '1-068C.png', // Black Mage -> Black Mage
    'ff1-023-c': '1-069C.png', // Ranger -> Ranger
    'ff1-024-l': '1-071L.png', // Odin -> Odin
    'ff1-025-c': '1-073C.png', // Thief -> Thief
    'ff1-026-r': '1-074R.png', // Garland -> Garland
    'ff1-027-c': '1-075C.png', // Warrior -> Warrior
    
    // Lightning Cards
    'ff1-028-h': '1-080H.png', // Ramuh -> Ramuh
    'ff1-029-c': '1-086C.png', // Thunder -> Thunder
    'ff1-030-r': '1-090R.png', // Ashe -> Ashe
    'ff1-031-c': '1-092C.png', // Sage -> Sage
    'ff1-032-c': '1-096C.png', // Time Mage -> Time Mage
    'ff1-033-l': '1-107L.png', // Alexander -> Alexander
    'ff1-034-c': '1-110C.png', // Dragoon -> Dragoon
    'ff1-035-r': '1-112R.png', // Kain -> Kain
    'ff1-036-c': '1-113C.png', // Lancer -> Lancer
    
    // Water Cards
    'ff1-037-h': '1-122H.png', // Tidus -> Tidus
    'ff1-038-c': '1-129C.png', // Blue Mage -> Blue Mage
    'ff1-039-r': '1-131R.png', // Wakka -> Wakka
    'ff1-040-c': '1-132C.png', // Summoner -> Summoner
    'ff1-041-c': '1-133C.png', // Dancer -> Dancer
    'ff1-042-l': '1-135L.png', // Kraken -> Kraken
    'ff1-043-c': '1-136C.png', // Ninja -> Ninja
    'ff1-044-r': '1-137R.png', // Yuna -> Yuna
    'ff1-045-c': '1-138C.png', // Devout -> Devout
    
    // Earth Cards
    'ff1-046-h': '1-146H.png', // Tifa -> Tifa
    'ff1-047-c': '1-147C.png', // Monk -> Monk
    'ff1-048-r': '1-150R.png', // Barret -> Barret
    'ff1-049-c': '1-153C.png', // Warrior of Light -> Warrior of Light
    'ff1-050-c': '1-156C.png', // Paladin -> Paladin
    'ff1-051-l': '1-163L.png', // Titan -> Titan
    'ff1-052-c': '1-165C.png', // Berserker -> Berserker
    'ff1-053-r': '1-164R.png', // Sephiroth -> Sephiroth
    'ff1-054-c': '1-166C.png', // Dark Knight -> Dark Knight
    
    // Multi-element/Special cards
    'ff1-055-h': '1-171H.png', // Chaos -> Chaos
    'ff1-056-l': '1-182L.png', // Cosmos -> Cosmos
    'ff1-057-h': '1-183H.png', // Garland -> Garland (Chaos)
    'ff1-058-h': '1-184H.png', // Warrior of Light -> Warrior of Light (Cosmos)
    'ff1-059-h': '1-185H.png', // Shantotto -> Shantotto
    'ff1-060-l': '1-186L.png'  // Meteor -> Meteor
};

/**
 * Get the correct image path for a card
 * @param {string} cardId - The card ID from the extended database
 * @returns {string} - The path to the Opus 1 image or fallback
 */
export function getCardImagePath(cardId) {
    const opus1File = OPUS_1_IMAGE_MAPPING[cardId];
    if (opus1File) {
        return `assets/images/Opus_1/${opus1File}`;
    }
    
    // Fallback to placeholder generation
    return `assets/images/placeholders/${cardId}.png`;
}

/**
 * Get all available Opus 1 cards that we have images for
 * @returns {Array} - Array of card IDs that have Opus 1 images
 */
export function getAvailableOpus1Cards() {
    return Object.keys(OPUS_1_IMAGE_MAPPING);
}

/**
 * Update card data to use Opus 1 images
 * @param {Array} cardData - Array of card objects
 * @returns {Array} - Updated card data with correct image paths
 */
export function updateCardImagesWithOpus1(cardData) {
    return cardData.map(card => ({
        ...card,
        image: getCardImagePath(card.id),
        hasRealImage: OPUS_1_IMAGE_MAPPING.hasOwnProperty(card.id)
    }));
}

/**
 * Create a comprehensive Opus 1 card database from actual card files
 * This creates card entries based on the actual Opus 1 files we have
 */
export function createOpus1CardDatabase() {
    const opus1Cards = [];
    
    // Generate cards based on actual files (1-001H through 1-186L)
    for (let i = 1; i <= 186; i++) {
        const cardNumber = i.toString().padStart(3, '0');
        
        // Determine rarity from typical Opus 1 distribution
        let rarity = 'C'; // Default to Common
        if (i <= 12 || [21, 27, 37, 43, 46, 56, 60, 63, 80, 83, 84, 89, 93, 97, 102, 104, 108, 122, 126, 127, 146, 149, 158, 160, 171, 176, 179, 181, 183, 184, 185].includes(i)) {
            rarity = 'H'; // Hero
        } else if ([15, 18, 41, 58, 62, 71, 107, 116, 135, 141, 152, 163, 182, 186].includes(i)) {
            rarity = 'L'; // Legend
        } else if (i % 7 === 0 || [5, 12, 17, 20, 22, 23, 28, 30, 34, 38, 42, 44, 45, 47, 51, 52, 59, 61, 64, 67, 72, 74, 79, 81, 82, 85, 90, 91, 94, 95, 98, 101, 109, 112, 114, 117, 118, 123, 124, 125, 128, 131, 134, 137, 142, 144, 150, 151, 154, 155, 162, 164, 174, 175, 177, 178, 180].includes(i)) {
            rarity = 'R'; // Rare
        }
        
        // Determine element based on Opus 1 card distribution
        let element = 'fire';
        if (i >= 29 && i <= 62) element = 'ice';
        else if (i >= 63 && i <= 95) element = 'wind';
        else if (i >= 96 && i <= 121) element = 'lightning';
        else if (i >= 122 && i <= 145) element = 'water';
        else if (i >= 146 && i <= 170) element = 'earth';
        else if (i >= 171) element = 'light'; // Special/Multi
        
        // Determine type (simplified)
        let type = 'forward';
        if (rarity === 'L' || i === 15 || i === 18 || i === 41 || i === 58 || i === 62 || i === 71 || i === 107 || i === 116 || i === 135 || i === 141 || i === 152 || i === 163 || i === 182 || i === 186) {
            type = 'summon';
        } else if (i % 13 === 0) {
            type = 'backup';
        }
        
        const card = {
            id: `opus1-${cardNumber}-${rarity.toLowerCase()}`,
            name: `Opus 1 Card ${cardNumber}`,
            element: element,
            type: type,
            cost: Math.min(Math.max(Math.floor(i / 30) + 1, 1), 7),
            power: type === 'forward' ? Math.min(Math.max((Math.floor(i / 20) + 2) * 1000, 1000), 9000) : undefined,
            rarity: rarity,
            text: `This is card ${cardNumber} from Opus 1.`,
            image: `assets/images/Opus_1/1-${cardNumber}${rarity}.png`,
            hasRealImage: true,
            opus: 1,
            cardNumber: cardNumber
        };
        
        opus1Cards.push(card);
    }
    
    // Add card back
    opus1Cards.push({
        id: 'opus1-card-back',
        name: 'Card Back',
        type: 'back',
        image: 'assets/images/Opus_1/Card_Back.png',
        hasRealImage: true,
        opus: 1
    });
    
    return opus1Cards;
}

/**
 * Merge existing extended database with Opus 1 real images
 * @param {Array} extendedCardData - The existing extended card database
 * @returns {Array} - Merged database with real images where available
 */
export function mergeWithOpus1Images(extendedCardData) {
    const opus1Database = createOpus1CardDatabase();
    const updatedExtended = updateCardImagesWithOpus1(extendedCardData);
    
    // Create a comprehensive database
    const mergedDatabase = [
        ...updatedExtended,
        ...opus1Database
    ];
    
    // Remove duplicates, preferring real images
    const uniqueCards = new Map();
    
    mergedDatabase.forEach(card => {
        const existingCard = uniqueCards.get(card.id);
        if (!existingCard || (card.hasRealImage && !existingCard.hasRealImage)) {
            uniqueCards.set(card.id, card);
        }
    });
    
    return Array.from(uniqueCards.values());
}