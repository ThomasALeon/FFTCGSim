#!/usr/bin/env python3
import json
import requests
import roman
import time

# Square Enix FFTCG API endpoint
API_URL = "https://fftcg.square-enix-games.com/en/get-cards"

# Comprehensive list of all known FFTCG sets
OPUS_SETS = [
    # Main Opus series (1-14) - using Roman numerals
    *[f"Opus {roman.toRoman(i).upper()}" for i in range(1, 15)],
    # Named Opus sets (15+)
    "Crystal Dominion",
    "Emissaries of Light", 
    "Rebellion's Call",
    "Resurgence of Power",
    "From Nightmares",
    "Dawn of Heroes",
    "Beyond Destiny",
    "Hidden Hope",
    "Hidden Trials",
    "Hidden Legends",
    "Tears of the Planet",
    # Special sets
    "Boss Deck Chaos",
    "Legacy Collection",
]

def element_mapping(element_jp):
    """Convert Japanese element to English"""
    mapping = {
        "火": "fire",
        "氷": "ice", 
        "風": "wind",
        "雷": "lightning",
        "水": "water",
        "土": "earth",
        "光": "light",
        "闇": "dark"
    }
    return mapping.get(element_jp, element_jp.lower())

def type_mapping(type_en):
    """Convert English type to lowercase"""
    mapping = {
        "Forward": "forward",
        "Backup": "backup", 
        "Summon": "summon",
        "Monster": "monster"
    }
    return mapping.get(type_en, type_en.lower())

def rarity_mapping(rarity):
    """Ensure rarity is uppercase"""
    return rarity.upper()

def fetch_set_data(set_name):
    """Fetch card data for a specific set"""
    print(f"Fetching {set_name}...")
    
    params = {
        "text": "",
        "set": [set_name]
    }
    
    try:
        response = requests.post(API_URL, json=params)
        response.raise_for_status()
        data = response.json()
        
        if "cards" not in data:
            print(f"  ⚠️  No cards found for {set_name}")
            return []
            
        cards = []
        for card_data in data["cards"]:
            # Convert to our format
            card = {
                "id": card_data["code"],
                "name": card_data.get("name_en", ""),
                "element": element_mapping(card_data["element"][0]) if card_data["element"] else "unknown",
                "type": type_mapping(card_data.get("type_en", "")),
                "cost": int(card_data.get("cost", 0)) if card_data.get("cost", "").isdigit() else 0,
                "power": int(card_data.get("power", 0)) if card_data.get("power", "").isdigit() else None,
                "job": card_data.get("job_en", ""),
                "category": card_data.get("category_1", ""),
                "rarity": rarity_mapping(card_data.get("rarity", "")),
                "text": card_data.get("text_en", ""),
                "set": set_name,
                "cardNumber": card_data["code"],
                "hasRealImage": True,
                "source": "square-api"
            }
            
            # Add image URLs if available
            if "images" in card_data and "full" in card_data["images"]:
                card["image"] = card_data["images"]["full"][0]
                
            cards.append(card)
            
        print(f"  ✅ Found {len(cards)} cards")
        return cards
        
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error fetching {set_name}: {e}")
        return []
    except Exception as e:
        print(f"  ❌ Error processing {set_name}: {e}")
        return []

def main():
    """Fetch all FFTCG card data and save to JSON"""
    print("🎯 Starting FFTCG card data collection...")
    print(f"📊 Will attempt to fetch {len(OPUS_SETS)} sets")
    
    all_cards = []
    successful_sets = []
    failed_sets = []
    
    for set_name in OPUS_SETS:
        cards = fetch_set_data(set_name)
        if cards:
            all_cards.extend(cards)
            successful_sets.append(set_name)
        else:
            failed_sets.append(set_name)
        
        # Be nice to the API
        time.sleep(0.5)
    
    print(f"\n📈 Collection Summary:")
    print(f"  ✅ Successfully fetched: {len(successful_sets)} sets")
    print(f"  ❌ Failed to fetch: {len(failed_sets)} sets")
    print(f"  🎴 Total cards collected: {len(all_cards)}")
    
    if failed_sets:
        print(f"\n⚠️  Failed sets: {', '.join(failed_sets)}")
    
    # Sort cards by set and card number
    all_cards.sort(key=lambda x: (x["set"], x["cardNumber"]))
    
    # Save to JSON file
    output_file = "js/data/fftcg_all_cards.json"
    print(f"\n💾 Saving to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Complete! Saved {len(all_cards)} cards to {output_file}")
    
    # Show set breakdown
    print(f"\n📊 Set Breakdown:")
    from collections import Counter
    set_counts = Counter(card["set"] for card in all_cards)
    for set_name, count in sorted(set_counts.items()):
        print(f"  {set_name}: {count} cards")

if __name__ == "__main__":
    main()