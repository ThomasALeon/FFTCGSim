/**
 * EXTENDED CARD DATABASE - Comprehensive Sample Cards for Testing
 * 
 * Provides a large collection of sample FFTCG cards across all elements
 * and types to enable proper deck building and game testing
 * 
 * Now enhanced with actual Opus 1 card images!
 */

import { mergeWithOpus1Images, createOpus1CardDatabase } from './Opus1CardMapping.js';

export const EXTENDED_CARD_DATA = [
    // === FIRE ELEMENT ===
    
    // Fire Forwards
    {
        id: 'ff1-001-h',
        name: 'Terra',
        element: 'fire',
        type: 'forward',
        cost: 5,
        power: 8000,
        job: 'Magitek Elite',
        category: 'VI',
        rarity: 'H',
        text: 'When Terra enters the field, choose 1 Forward. Deal it 4000 damage.',
        flavorText: 'A mysterious young woman, born with the gift of magic...',
        image: 'assets/cards/fire/terra.jpg'
    },
    {
        id: 'ff1-002-c',
        name: 'Goblin',
        element: 'fire',
        type: 'forward',
        cost: 2,
        power: 3000,
        job: 'Goblin',
        category: 'Generic',
        rarity: 'C',
        text: '',
        image: 'assets/cards/fire/goblin.jpg'
    },
    {
        id: 'ff1-003-c',
        name: 'Red Mage',
        element: 'fire',
        type: 'forward',
        cost: 3,
        power: 4000,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'C',
        text: 'When Red Mage enters the field, you may pay [1]. If you do, deal 2000 damage to target Forward.',
        image: 'assets/cards/fire/red_mage.jpg'
    },
    {
        id: 'ff1-004-r',
        name: 'Black Knight',
        element: 'fire',
        type: 'forward',
        cost: 4,
        power: 7000,
        job: 'Knight',
        category: 'I',
        rarity: 'R',
        text: 'When Black Knight attacks, it gains +1000 power until the end of the turn.',
        image: 'assets/cards/fire/black_knight.jpg'
    },
    {
        id: 'ff1-005-h',
        name: 'Ifrit',
        element: 'fire',
        type: 'forward',
        cost: 6,
        power: 9000,
        job: 'Eidolon',
        category: 'Generic',
        rarity: 'H',
        text: 'When Ifrit enters the field, deal 3000 damage to all Forwards opponent controls.',
        image: 'assets/cards/fire/ifrit.jpg'
    },
    {
        id: 'ff2-006-c',
        name: 'Bomb',
        element: 'fire',
        type: 'forward',
        cost: 1,
        power: 2000,
        job: 'Bomb',
        category: 'Generic',
        rarity: 'C',
        text: 'When Bomb is put from the field into the Break Zone, deal 1000 damage to target Forward.',
        image: 'assets/cards/fire/bomb.jpg'
    },
    {
        id: 'ff2-007-r',
        name: 'Vivi',
        element: 'fire',
        type: 'forward',
        cost: 3,
        power: 5000,
        job: 'Black Mage',
        category: 'IX',
        rarity: 'R',
        text: 'Action [S]: Choose 1 Forward. Deal it 2000 damage.',
        image: 'assets/cards/fire/vivi.jpg'
    },
    {
        id: 'ff2-008-h',
        name: 'Ace',
        element: 'fire',
        type: 'forward',
        cost: 4,
        power: 7000,
        job: 'Cadet',
        category: 'Type-0',
        rarity: 'H',
        text: 'Brave\nWhen Ace enters the field, you may search for 1 [Category Type-0] Character and add it to your hand.',
        image: 'assets/cards/fire/ace.jpg'
    },

    // Fire Backups
    {
        id: 'ff1-009-c',
        name: 'Fire Crystal',
        element: 'fire',
        type: 'backup',
        cost: 1,
        power: null,
        job: 'Crystal',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Choose 1 Forward you control. It gains +1000 power until the end of the turn.',
        image: 'assets/cards/fire/fire_crystal.jpg'
    },
    {
        id: 'ff1-010-c',
        name: 'Monk',
        element: 'fire',
        type: 'backup',
        cost: 2,
        power: null,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'C',
        text: 'Action [T]: Deal 1000 damage to target Forward.',
        image: 'assets/cards/fire/monk.jpg'
    },
    {
        id: 'ff1-011-r',
        name: 'Cid Kramer',
        element: 'fire',
        type: 'backup',
        cost: 3,
        power: null,
        job: 'Headmaster',
        category: 'VIII',
        rarity: 'R',
        text: 'When Cid Kramer enters the field, search for 1 [Category VIII] Character and add it to your hand.',
        image: 'assets/cards/fire/cid_kramer.jpg'
    },
    {
        id: 'ff2-012-c',
        name: 'Warrior',
        element: 'fire',
        type: 'backup',
        cost: 2,
        power: null,
        job: 'Warrior',
        category: 'I',
        rarity: 'C',
        text: 'Action [T]: Choose 1 Forward you control. It gains +2000 power until the end of the turn.',
        image: 'assets/cards/fire/warrior.jpg'
    },
    {
        id: 'ff2-013-r',
        name: 'Auron',
        element: 'fire',
        type: 'backup',
        cost: 4,
        power: null,
        job: 'Guardian',
        category: 'X',
        rarity: 'R',
        text: 'When Auron enters the field, all [Category X] Forwards you control gain +1000 power.',
        image: 'assets/cards/fire/auron.jpg'
    },

    // Fire Summons
    {
        id: 'ff1-014-r',
        name: 'Phoenix',
        element: 'fire',
        type: 'summon',
        cost: 4,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'R',
        text: 'Deal 3000 damage to target Forward. If it\'s put from the field into the Break Zone, you may return 1 Forward from your Break Zone to your hand.',
        image: 'assets/cards/fire/phoenix.jpg'
    },
    {
        id: 'ff2-015-c',
        name: 'Fire',
        element: 'fire',
        type: 'summon',
        cost: 2,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'Deal 2000 damage to target Forward.',
        image: 'assets/cards/fire/fire.jpg'
    },
    {
        id: 'ff2-016-r',
        name: 'Meteor',
        element: 'fire',
        type: 'summon',
        cost: 6,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'R',
        text: 'Deal 5000 damage to all Forwards.',
        image: 'assets/cards/fire/meteor.jpg'
    },

    // === ICE ELEMENT ===
    
    // Ice Forwards
    {
        id: 'ff1-017-h',
        name: 'Squall',
        element: 'ice',
        type: 'forward',
        cost: 3,
        power: 7000,
        job: 'SeeD',
        category: 'VIII',
        rarity: 'H',
        text: 'First Strike\nWhen Squall enters the field, you may search for 1 [Job SeeD] and add it to your hand.',
        image: 'assets/cards/ice/squall.jpg'
    },
    {
        id: 'ff1-018-c',
        name: 'Moogle',
        element: 'ice',
        type: 'forward',
        cost: 2,
        power: 2000,
        job: 'Moogle',
        category: 'Generic',
        rarity: 'C',
        text: 'When Moogle enters the field, draw 1 card.',
        image: 'assets/cards/ice/moogle.jpg'
    },
    {
        id: 'ff1-019-r',
        name: 'White Mage',
        element: 'ice',
        type: 'forward',
        cost: 3,
        power: 4000,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'R',
        text: 'Action [S]: Choose 1 Forward. Remove 3000 damage from it.',
        image: 'assets/cards/ice/white_mage.jpg'
    },
    {
        id: 'ff1-020-h',
        name: 'Shiva',
        element: 'ice',
        type: 'forward',
        cost: 5,
        power: 8000,
        job: 'Eidolon',
        category: 'Generic',
        rarity: 'H',
        text: 'When Shiva enters the field, choose up to 2 Forwards. Dull them.',
        image: 'assets/cards/ice/shiva_forward.jpg'
    },
    {
        id: 'ff2-021-c',
        name: 'Scholar',
        element: 'ice',
        type: 'forward',
        cost: 2,
        power: 3000,
        job: 'Standard Unit',
        category: 'Generic',
        rarity: 'C',
        text: 'When Scholar enters the field, draw 1 card, then discard 1 card.',
        image: 'assets/cards/ice/scholar.jpg'
    },
    {
        id: 'ff2-022-r',
        name: 'Rinoa',
        element: 'ice',
        type: 'forward',
        cost: 4,
        power: 6000,
        job: 'Sorceress',
        category: 'VIII',
        rarity: 'R',
        text: 'When Rinoa enters the field, you may pay [2]. If you do, search for 1 Summon and add it to your hand.',
        image: 'assets/cards/ice/rinoa.jpg'
    },
    {
        id: 'ff2-023-h',
        name: 'Sephiroth',
        element: 'ice',
        type: 'forward',
        cost: 7,
        power: 10000,
        job: 'SOLDIER',
        category: 'VII',
        rarity: 'H',
        text: 'When Sephiroth enters the field, choose 2 Forwards. Put them into the Break Zone.',
        image: 'assets/cards/ice/sephiroth.jpg'
    },

    // Ice Backups
    {
        id: 'ff1-024-c',
        name: 'Ice Crystal',
        element: 'ice',
        type: 'backup',
        cost: 1,
        power: null,
        job: 'Crystal',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Choose 1 Forward. Dull it.',
        image: 'assets/cards/ice/ice_crystal.jpg'
    },
    {
        id: 'ff1-025-r',
        name: 'Seifer',
        element: 'ice',
        type: 'backup',
        cost: 3,
        power: null,
        job: 'SeeD',
        category: 'VIII',
        rarity: 'R',
        text: 'When Seifer enters the field, choose 1 [Category VIII] Forward in your Break Zone. You may pay its cost. If you do, play it.',
        image: 'assets/cards/ice/seifer.jpg'
    },
    {
        id: 'ff2-026-c',
        name: 'Devout',
        element: 'ice',
        type: 'backup',
        cost: 2,
        power: null,
        job: 'Standard Unit',
        category: 'III',
        rarity: 'C',
        text: 'Action [T]: All Forwards you control gain +1000 power until the end of the turn.',
        image: 'assets/cards/ice/devout.jpg'
    },

    // Ice Summons
    {
        id: 'ff1-027-h',
        name: 'Shiva (Summon)',
        element: 'ice',
        type: 'summon',
        cost: 3,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'H',
        text: 'Choose 1 Forward. Dull it and Freeze it.',
        image: 'assets/cards/ice/shiva_summon.jpg'
    },
    {
        id: 'ff2-028-c',
        name: 'Blizzard',
        element: 'ice',
        type: 'summon',
        cost: 2,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'Choose 1 Forward. Dull it.',
        image: 'assets/cards/ice/blizzard.jpg'
    },

    // === WIND ELEMENT ===
    
    // Wind Forwards
    {
        id: 'ff1-029-h',
        name: 'Cloud',
        element: 'wind',
        type: 'forward',
        cost: 7,
        power: 10000,
        job: 'SOLDIER',
        category: 'VII',
        rarity: 'H',
        text: 'Brave\nWhen Cloud enters the field, you may search for 1 [Job SOLDIER] and add it to your hand.',
        image: 'assets/cards/wind/cloud.jpg'
    },
    {
        id: 'ff1-030-c',
        name: 'Chocobo',
        element: 'wind',
        type: 'forward',
        cost: 2,
        power: 4000,
        job: 'Chocobo',
        category: 'Generic',
        rarity: 'C',
        text: 'Haste',
        image: 'assets/cards/wind/chocobo.jpg'
    },
    {
        id: 'ff1-031-r',
        name: 'Zidane',
        element: 'wind',
        type: 'forward',
        cost: 4,
        power: 7000,
        job: 'Thief',
        category: 'IX',
        rarity: 'R',
        text: 'Haste\nWhen Zidane attacks, all other [Category IX] Forwards you control gain +1000 power until the end of the turn.',
        image: 'assets/cards/wind/zidane.jpg'
    },
    {
        id: 'ff2-032-c',
        name: 'Thief',
        element: 'wind',
        type: 'forward',
        cost: 1,
        power: 1000,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'C',
        text: 'When Thief enters the field, draw 1 card.',
        image: 'assets/cards/wind/thief.jpg'
    },
    {
        id: 'ff2-033-r',
        name: 'Garnet',
        element: 'wind',
        type: 'forward',
        cost: 3,
        power: 5000,
        job: 'Summoner',
        category: 'IX',
        rarity: 'R',
        text: 'When Garnet enters the field, you may search for 1 Summon with cost 3 or less and add it to your hand.',
        image: 'assets/cards/wind/garnet.jpg'
    },
    {
        id: 'ff2-034-h',
        name: 'Ramza',
        element: 'wind',
        type: 'forward',
        cost: 5,
        power: 8000,
        job: 'Knight',
        category: 'T',
        rarity: 'H',
        text: 'Brave\nAll other [Category T] Characters you control gain +1000 power.',
        image: 'assets/cards/wind/ramza.jpg'
    },

    // Wind Backups
    {
        id: 'ff1-035-c',
        name: 'Wind Crystal',
        element: 'wind',
        type: 'backup',
        cost: 1,
        power: null,
        job: 'Crystal',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Choose 1 Forward you control. It can attack this turn.',
        image: 'assets/cards/wind/wind_crystal.jpg'
    },
    {
        id: 'ff2-036-r',
        name: 'Cid Highwind',
        element: 'wind',
        type: 'backup',
        cost: 4,
        power: null,
        job: 'Pilot',
        category: 'VII',
        rarity: 'R',
        text: 'All [Category VII] Forwards you control gain Haste.',
        image: 'assets/cards/wind/cid_highwind.jpg'
    },

    // Wind Summons
    {
        id: 'ff1-037-r',
        name: 'Sylph',
        element: 'wind',
        type: 'summon',
        cost: 3,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'R',
        text: 'All Forwards you control gain +2000 power and Haste until the end of the turn.',
        image: 'assets/cards/wind/sylph.jpg'
    },

    // === LIGHTNING ELEMENT ===
    
    // Lightning Forwards
    {
        id: 'ff1-038-h',
        name: 'Lightning',
        element: 'lightning',
        type: 'forward',
        cost: 4,
        power: 7000,
        job: 'Ravager',
        category: 'XIII',
        rarity: 'H',
        text: 'Haste\nWhen Lightning enters the field, choose 1 Forward opponent controls. Dull it.',
        image: 'assets/cards/lightning/lightning.jpg'
    },
    {
        id: 'ff1-039-c',
        name: 'Odin',
        element: 'lightning',
        type: 'forward',
        cost: 5,
        power: 8000,
        job: 'Eidolon',
        category: 'Generic',
        rarity: 'C',
        text: 'When Odin enters the field, choose 1 Forward with power 5000 or less. Put it into the Break Zone.',
        image: 'assets/cards/lightning/odin.jpg'
    },
    {
        id: 'ff2-040-r',
        name: 'Rygdea',
        element: 'lightning',
        type: 'forward',
        cost: 3,
        power: 6000,
        job: 'Rogue',
        category: 'XIII',
        rarity: 'R',
        text: 'When Rygdea enters the field, choose 1 Forward. It cannot block this turn.',
        image: 'assets/cards/lightning/rygdea.jpg'
    },

    // Lightning Backups
    {
        id: 'ff1-041-c',
        name: 'Lightning Crystal',
        element: 'lightning',
        type: 'backup',
        cost: 1,
        power: null,
        job: 'Crystal',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Choose 1 Forward with power 3000 or less. Put it into the Break Zone.',
        image: 'assets/cards/lightning/lightning_crystal.jpg'
    },

    // Lightning Summons
    {
        id: 'ff1-042-r',
        name: 'Ramuh',
        element: 'lightning',
        type: 'summon',
        cost: 4,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'R',
        text: 'Choose 1 Forward. Put it into the Break Zone.',
        image: 'assets/cards/lightning/ramuh.jpg'
    },

    // === WATER ELEMENT ===
    
    // Water Forwards
    {
        id: 'ff1-043-h',
        name: 'Yuna',
        element: 'water',
        type: 'forward',
        cost: 5,
        power: 7000,
        job: 'Summoner',
        category: 'X',
        rarity: 'H',
        text: 'EX BURST When Yuna enters the field, choose 1 Forward. Return it to its owner\'s hand.',
        image: 'assets/cards/water/yuna.jpg'
    },
    {
        id: 'ff1-044-c',
        name: 'Tidus',
        element: 'water',
        type: 'forward',
        cost: 3,
        power: 6000,
        job: 'Ace',
        category: 'X',
        rarity: 'C',
        text: 'When Tidus attacks, draw 1 card.',
        image: 'assets/cards/water/tidus.jpg'
    },
    {
        id: 'ff2-045-r',
        name: 'Wakka',
        element: 'water',
        type: 'forward',
        cost: 2,
        power: 4000,
        job: 'Guardian',
        category: 'X',
        rarity: 'R',
        text: 'When Wakka enters the field, you may pay [1]. If you do, draw 1 card.',
        image: 'assets/cards/water/wakka.jpg'
    },

    // Water Backups
    {
        id: 'ff1-046-c',
        name: 'Water Crystal',
        element: 'water',
        type: 'backup',
        cost: 1,
        power: null,
        job: 'Crystal',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Draw 1 card, then discard 1 card.',
        image: 'assets/cards/water/water_crystal.jpg'
    },
    {
        id: 'ff2-047-r',
        name: 'Lulu',
        element: 'water',
        type: 'backup',
        cost: 3,
        power: null,
        job: 'Black Mage',
        category: 'X',
        rarity: 'R',
        text: 'When Lulu enters the field, draw 2 cards.',
        image: 'assets/cards/water/lulu.jpg'
    },

    // Water Summons
    {
        id: 'ff1-048-r',
        name: 'Leviathan',
        element: 'water',
        type: 'summon',
        cost: 5,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'R',
        text: 'Return all Forwards to their owners\' hands.',
        image: 'assets/cards/water/leviathan.jpg'
    },

    // === EARTH ELEMENT ===
    
    // Earth Forwards
    {
        id: 'ff1-049-h',
        name: 'Warrior of Light',
        element: 'earth',
        type: 'forward',
        cost: 6,
        power: 9000,
        job: 'Warrior',
        category: 'I',
        rarity: 'H',
        text: 'When Warrior of Light deals damage to a Forward, double the damage instead.',
        image: 'assets/cards/earth/warrior_of_light.jpg'
    },
    {
        id: 'ff1-050-c',
        name: 'Onion Knight',
        element: 'earth',
        type: 'forward',
        cost: 2,
        power: 5000,
        job: 'Warrior',
        category: 'III',
        rarity: 'C',
        text: '',
        image: 'assets/cards/earth/onion_knight.jpg'
    },
    {
        id: 'ff2-051-r',
        name: 'Galuf',
        element: 'earth',
        type: 'forward',
        cost: 4,
        power: 8000,
        job: 'Warrior',
        category: 'V',
        rarity: 'R',
        text: 'Galuf cannot be chosen by Summons or abilities opponent controls.',
        image: 'assets/cards/earth/galuf.jpg'
    },

    // Earth Backups
    {
        id: 'ff1-052-c',
        name: 'Earth Crystal',
        element: 'earth',
        type: 'backup',
        cost: 1,
        power: null,
        job: 'Crystal',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Choose 1 Forward you control. It gains +0/+2000 until the end of the turn.',
        image: 'assets/cards/earth/earth_crystal.jpg'
    },

    // Earth Summons
    {
        id: 'ff1-053-r',
        name: 'Titan',
        element: 'earth',
        type: 'summon',
        cost: 4,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'R',
        text: 'All Forwards you control gain +2000 power until the end of the turn.',
        image: 'assets/cards/earth/titan.jpg'
    },

    // === LIGHT ELEMENT ===
    
    // Light Forwards
    {
        id: 'ff1-054-h',
        name: 'Paladin Cecil',
        element: 'light',
        type: 'forward',
        cost: 5,
        power: 8000,
        job: 'Paladin',
        category: 'IV',
        rarity: 'H',
        text: 'When Paladin Cecil enters the field, all Forwards you control gain +1000 power until the end of the turn.',
        image: 'assets/cards/light/paladin_cecil.jpg'
    },
    {
        id: 'ff2-055-r',
        name: 'Rosa',
        element: 'light',
        type: 'forward',
        cost: 3,
        power: 5000,
        job: 'White Mage',
        category: 'IV',
        rarity: 'R',
        text: 'Action [S]: Choose 1 Forward. Remove all damage from it.',
        image: 'assets/cards/light/rosa.jpg'
    },

    // Light Backups
    {
        id: 'ff1-056-r',
        name: 'Minwu',
        element: 'light',
        type: 'backup',
        cost: 3,
        power: null,
        job: 'White Mage',
        category: 'II',
        rarity: 'R',
        text: 'When Minwu enters the field, search for 1 [Category II] Character and add it to your hand.',
        image: 'assets/cards/light/minwu.jpg'
    },

    // Light Summons
    {
        id: 'ff1-057-h',
        name: 'Alexander',
        element: 'light',
        type: 'summon',
        cost: 7,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'H',
        text: 'All Forwards you control cannot be put from the field into the Break Zone by Summons or abilities until the end of the turn.',
        image: 'assets/cards/light/alexander.jpg'
    },

    // === DARK ELEMENT ===
    
    // Dark Forwards
    {
        id: 'ff1-058-h',
        name: 'Dark Knight Cecil',
        element: 'dark',
        type: 'forward',
        cost: 4,
        power: 7000,
        job: 'Dark Knight',
        category: 'IV',
        rarity: 'H',
        text: 'When Dark Knight Cecil attacks, you may pay [1]. If you do, Dark Knight Cecil gains +2000 power until the end of the turn.',
        image: 'assets/cards/dark/dark_knight_cecil.jpg'
    },
    {
        id: 'ff2-059-r',
        name: 'Golbez',
        element: 'dark',
        type: 'forward',
        cost: 6,
        power: 9000,
        job: 'Sorcerer',
        category: 'IV',
        rarity: 'R',
        text: 'When Golbez enters the field, choose up to 2 Forwards. Put them into the Break Zone.',
        image: 'assets/cards/dark/golbez.jpg'
    },

    // Dark Backups
    {
        id: 'ff1-060-r',
        name: 'Kuja',
        element: 'dark',
        type: 'backup',
        cost: 4,
        power: null,
        job: 'Sorcerer',
        category: 'IX',
        rarity: 'R',
        text: 'When Kuja enters the field, all [Category IX] Forwards gain +1000 power.',
        image: 'assets/cards/dark/kuja.jpg'
    },

    // Dark Summons
    {
        id: 'ff1-061-h',
        name: 'Diablos',
        element: 'dark',
        type: 'summon',
        cost: 6,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'H',
        text: 'Put all Forwards with cost 3 or less into the Break Zone.',
        image: 'assets/cards/dark/diablos.jpg'
    },

    // === ADDITIONAL CARDS FOR DECK BUILDING ===
    
    // More Commons for deck variety
    {
        id: 'ff3-062-c',
        name: 'Knight',
        element: 'fire',
        type: 'forward',
        cost: 3,
        power: 5000,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'C',
        text: '',
        image: 'assets/cards/fire/knight.jpg'
    },
    {
        id: 'ff3-063-c',
        name: 'Archer',
        element: 'wind',
        type: 'forward',
        cost: 2,
        power: 3000,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'C',
        text: 'Archer can attack the turn it enters the field.',
        image: 'assets/cards/wind/archer.jpg'
    },
    {
        id: 'ff3-064-c',
        name: 'Black Mage',
        element: 'lightning',
        type: 'forward',
        cost: 3,
        power: 4000,
        job: 'Standard Unit',
        category: 'I',
        rarity: 'C',
        text: 'Action [S]: Deal 3000 damage to target Forward.',
        image: 'assets/cards/lightning/black_mage.jpg'
    },
    {
        id: 'ff3-065-c',
        name: 'Summoner',
        element: 'water',
        type: 'backup',
        cost: 2,
        power: null,
        job: 'Standard Unit',
        category: 'Generic',
        rarity: 'C',
        text: 'Action [T]: Search for 1 Summon with cost 2 or less and add it to your hand.',
        image: 'assets/cards/water/summoner.jpg'
    },
    
    // Additional variety cards to reach 50+ per element
    {
        id: 'ff3-066-c',
        name: 'Flame Sword',
        element: 'fire',
        type: 'summon',
        cost: 1,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'Choose 1 Forward you control. It gains +2000 power until the end of the turn.',
        image: 'assets/cards/fire/flame_sword.jpg'
    },
    {
        id: 'ff3-067-c',
        name: 'Ice Shard',
        element: 'ice',
        type: 'summon',
        cost: 1,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'Choose 1 Forward. It cannot attack or block this turn.',
        image: 'assets/cards/ice/ice_shard.jpg'
    },
    {
        id: 'ff3-068-c',
        name: 'Gale',
        element: 'wind',
        type: 'summon',
        cost: 1,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'All Forwards you control can attack this turn.',
        image: 'assets/cards/wind/gale.jpg'
    },
    {
        id: 'ff3-069-c',
        name: 'Thunder',
        element: 'lightning',
        type: 'summon',
        cost: 2,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'Deal 4000 damage to target Forward.',
        image: 'assets/cards/lightning/thunder.jpg'
    },
    {
        id: 'ff3-070-c',
        name: 'Cure',
        element: 'water',
        type: 'summon',
        cost: 1,
        power: null,
        job: null,
        category: 'Summon',
        rarity: 'C',
        text: 'Choose 1 Forward. Remove 2000 damage from it.',
        image: 'assets/cards/water/cure.jpg'
    }
];

/**
 * Generate placeholder card images
 */
export function generateCardImages() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    const elementColors = {
        fire: '#ff4444',
        ice: '#44ddff',
        wind: '#44ff44',
        lightning: '#aa44ff',
        water: '#4488ff',
        earth: '#ffaa44',
        light: '#ffffff',
        dark: '#444444'
    };

    const images = {};

    EXTENDED_CARD_DATA.forEach(card => {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, elementColors[card.element]);
        gradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 200, 280);
        
        // Add border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, 190, 270);
        
        // Add element icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(card.element.toUpperCase(), 10, 25);
        
        // Add card name
        ctx.font = 'bold 14px Arial';
        ctx.fillText(card.name, 10, 50);
        
        // Add type
        ctx.font = '12px Arial';
        ctx.fillText(card.type.toUpperCase(), 10, 70);
        
        // Add cost
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(card.cost.toString(), 170, 30);
        
        // Add power if applicable
        if (card.power) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(card.power.toString(), 10, 260);
        }
        
        // Add job
        if (card.job) {
            ctx.fillStyle = '#cccccc';
            ctx.font = '10px Arial';
            ctx.fillText(card.job, 10, 90);
        }
        
        // Convert to data URL
        images[card.id] = canvas.toDataURL('image/png');
        
        // Clear canvas for next card
        ctx.clearRect(0, 0, 200, 280);
    });

    return images;
}

/**
 * Get enhanced card database with Opus 1 images
 * @returns {Array} - Card database with actual Opus 1 images where available
 */
export function getEnhancedCardDatabase() {
    return mergeWithOpus1Images(EXTENDED_CARD_DATA);
}

/**
 * Get complete Opus 1 card database
 * @returns {Array} - Complete Opus 1 card database based on actual files
 */
export function getOpus1CardDatabase() {
    return createOpus1CardDatabase();
}