#!/usr/bin/env python3
import json
import requests
import time

# Square Enix FFTCG API endpoint
API_URL = "https://fftcg.square-enix-games.com/en/get-cards"

# The sets that had errors
MISSING_SETS = [
    "Crystal Dominion",
    "Emissaries of Light", 
    "Rebellion's Call",
    "Resurgence of Power",
    "Beyond Destiny",
    "Hidden Trials"
]

def element_mapping(element_jp):
    """Convert Japanese element to English - with null safety"""
    if not element_jp:
        return "unknown"
    
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
    """Convert English type to lowercase - with null safety"""
    if not type_en:
        return "unknown"
        
    mapping = {
        "Forward": "forward",
        "Backup": "backup", 
        "Summon": "summon",
        "Monster": "monster"
    }
    return mapping.get(type_en, type_en.lower())

def rarity_mapping(rarity):
    """Ensure rarity is uppercase - with null safety"""
    if not rarity:
        return "C"  # Default to Common if missing
    return str(rarity).upper()

def safe_int(value, default=0):
    """Safely convert to int with default"""
    try:
        return int(value) if value and str(value).isdigit() else default
    except:
        return default

def fetch_set_data(set_name):
    """Fetch card data for a specific set with better error handling"""
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
            try:
                # Handle element safely
                element = "unknown"
                if card_data.get("element") and len(card_data["element"]) > 0:
                    element = element_mapping(card_data["element"][0])
                
                # Convert to our format with better error handling
                card = {
                    "id": card_data.get("code", "unknown"),
                    "name": card_data.get("name_en", ""),
                    "element": element,
                    "type": type_mapping(card_data.get("type_en", "")),
                    "cost": safe_int(card_data.get("cost")),
                    "power": safe_int(card_data.get("power")) if card_data.get("power") else None,
                    "job": card_data.get("job_en", ""),
                    "category": card_data.get("category_1", ""),
                    "rarity": rarity_mapping(card_data.get("rarity")),
                    "text": card_data.get("text_en", ""),
                    "set": set_name,
                    "cardNumber": card_data.get("code", "unknown"),
                    "hasRealImage": True,
                    "source": "square-api"
                }
                
                # Add image URLs if available
                if "images" in card_data and "full" in card_data["images"] and card_data["images"]["full"]:
                    card["image"] = card_data["images"]["full"][0]
                    
                cards.append(card)
                
            except Exception as e:
                print(f"    ⚠️  Error processing card {card_data.get('code', 'unknown')}: {e}")
                continue
            
        print(f"  ✅ Found {len(cards)} cards")
        return cards
        
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error fetching {set_name}: {e}")
        return []
    except Exception as e:
        print(f"  ❌ Error processing {set_name}: {e}")
        return []

def main():
    """Fetch the missing FFTCG sets and add them to existing data"""
    print("🎯 Fetching missing FFTCG sets...")
    print(f"📊 Will attempt to fetch {len(MISSING_SETS)} sets")
    
    # Load existing card data
    try:
        with open('js/data/fftcg_real_cards.json', 'r') as f:
            existing_cards = json.load(f)
        print(f"📊 Loaded {len(existing_cards)} existing cards")
    except Exception as e:
        print(f"❌ Error loading existing cards: {e}")
        return
    
    new_cards = []
    successful_sets = []
    failed_sets = []
    
    for set_name in MISSING_SETS:
        cards = fetch_set_data(set_name)
        if cards:
            new_cards.extend(cards)
            successful_sets.append(set_name)
        else:
            failed_sets.append(set_name)
        
        # Be nice to the API
        time.sleep(0.5)
    
    print(f"\n📈 Collection Summary:")
    print(f"  ✅ Successfully fetched: {len(successful_sets)} sets")
    print(f"  ❌ Failed to fetch: {len(failed_sets)} sets")
    print(f"  🎴 New cards collected: {len(new_cards)}")
    
    if failed_sets:
        print(f"\n⚠️  Failed sets: {', '.join(failed_sets)}")
    
    if successful_sets:
        print(f"\n✅ Successful sets: {', '.join(successful_sets)}")
    
    if new_cards:
        # Combine with existing cards
        all_cards = existing_cards + new_cards
        
        # Remove duplicates by ID
        seen_ids = set()
        unique_cards = []
        for card in all_cards:
            if card['id'] not in seen_ids:
                unique_cards.append(card)
                seen_ids.add(card['id'])
        
        # Sort cards by set and card number
        unique_cards.sort(key=lambda x: (x["set"], x["cardNumber"]))
        
        # Save to JSON file
        output_file = "js/data/fftcg_real_cards.json"
        print(f"\n💾 Saving to {output_file}...")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(unique_cards, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Complete! Saved {len(unique_cards)} total cards to {output_file}")
        print(f"📈 Added {len(new_cards)} new cards from {len(successful_sets)} sets")
        
        # Show set breakdown for new cards
        if new_cards:
            print(f"\n📊 New Cards by Set:")
            from collections import Counter
            set_counts = Counter(card["set"] for card in new_cards)
            for set_name, count in sorted(set_counts.items()):
                print(f"  {set_name}: {count} cards")

if __name__ == "__main__":
    main()