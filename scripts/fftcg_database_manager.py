#!/usr/bin/env python3
"""
FFTCG Database Manager - Consolidated tool for all card data operations

This single script replaces multiple redundant scripts:
- fetch_fftcg_data.py
- fetch_missing_sets.py  
- generate_materia_hunter_mapping.py
- update_image_mapping.py

Usage:
  python3 fftcg_database_manager.py --fetch-all      # Fetch all sets
  python3 fftcg_database_manager.py --fetch-missing  # Fetch specific sets
  python3 fftcg_database_manager.py --update-images  # Update image mappings
  python3 fftcg_database_manager.py --help           # Show help
"""

import json
import requests
import roman
import time
import re
import argparse

# Square Enix FFTCG API endpoint
API_URL = "https://fftcg.square-enix-games.com/en/get-cards"

# All known FFTCG sets
ALL_SETS = [
    # Main Opus series (1-14) - using Roman numerals
    *[f"Opus {roman.toRoman(i).upper()}" for i in range(1, 15)],
    # Named Opus sets (15+)
    "Crystal Dominion", "Emissaries of Light", "Rebellion's Call",
    "Resurgence of Power", "From Nightmares", "Dawn of Heroes",
    "Beyond Destiny", "Hidden Hope", "Hidden Trials", "Hidden Legends",
    "Tears of the Planet",
    # Special sets
    "Boss Deck Chaos", "Legacy Collection",
]

def element_mapping(element_jp):
    """Convert Japanese element to English"""
    if not element_jp:
        return "unknown"
    mapping = {
        "火": "fire", "氷": "ice", "風": "wind", "雷": "lightning",
        "水": "water", "土": "earth", "光": "light", "闇": "dark"
    }
    return mapping.get(element_jp, element_jp.lower())

def type_mapping(type_en):
    """Convert English type to lowercase"""
    if not type_en:
        return "unknown"
    mapping = {
        "Forward": "forward", "Backup": "backup", 
        "Summon": "summon", "Monster": "monster"
    }
    return mapping.get(type_en, type_en.lower())

def safe_int(value, default=0):
    """Safely convert to int"""
    try:
        return int(value) if value and str(value).isdigit() else default
    except:
        return default

def get_materia_hunter_url(card_id):
    """Generate MateriaHunter URL if supported"""
    opus_match = re.match(r'^(\d+)-', card_id)
    if opus_match:
        opus_num = int(opus_match.group(1))
        if 1 <= opus_num <= 19:  # MateriaHunter coverage
            opus_dir = f"{opus_num:02d}"
            card_number = re.sub(r'[A-Z]+$', '', card_id)
            return f"https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/{opus_dir}/{card_number}.jpg"
    return None

def fetch_set_data(set_name):
    """Fetch card data for a specific set"""
    print(f"Fetching {set_name}...")
    
    params = {"text": "", "set": [set_name]}
    
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
                element = "unknown"
                if card_data.get("element") and len(card_data["element"]) > 0:
                    element = element_mapping(card_data["element"][0])
                
                card = {
                    "id": card_data.get("code", "unknown"),
                    "name": card_data.get("name_en", ""),
                    "element": element,
                    "type": type_mapping(card_data.get("type_en", "")),
                    "cost": safe_int(card_data.get("cost")),
                    "power": safe_int(card_data.get("power")) if card_data.get("power") else None,
                    "job": card_data.get("job_en", ""),
                    "category": card_data.get("category_1", ""),
                    "rarity": str(card_data.get("rarity", "C")).upper(),
                    "text": card_data.get("text_en", ""),
                    "set": set_name,
                    "cardNumber": card_data.get("code", "unknown"),
                    "hasRealImage": True,
                    "source": "square-api"
                }
                
                if "images" in card_data and "full" in card_data["images"] and card_data["images"]["full"]:
                    card["image"] = card_data["images"]["full"][0]
                    
                cards.append(card)
                
            except Exception as e:
                print(f"    ⚠️  Error processing card {card_data.get('code', 'unknown')}: {e}")
                continue
            
        print(f"  ✅ Found {len(cards)} cards")
        return cards
        
    except Exception as e:
        print(f"  ❌ Error fetching {set_name}: {e}")
        return []

def fetch_all_sets():
    """Fetch all FFTCG sets"""
    print("🎯 Fetching all FFTCG sets...")
    
    all_cards = []
    successful_sets = []
    
    for set_name in ALL_SETS:
        cards = fetch_set_data(set_name)
        if cards:
            all_cards.extend(cards)
            successful_sets.append(set_name)
        time.sleep(0.5)
    
    print(f"\n📈 Successfully fetched {len(successful_sets)} sets with {len(all_cards)} total cards")
    
    # Sort and save
    all_cards.sort(key=lambda x: (x["set"], x["cardNumber"]))
    
    with open('js/data/fftcg_real_cards.json', 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved to js/data/fftcg_real_cards.json")
    return all_cards

def fetch_missing_sets(missing_sets):
    """Fetch specific missing sets and merge with existing data"""
    print(f"🎯 Fetching {len(missing_sets)} missing sets...")
    
    # Load existing cards
    try:
        with open('js/data/fftcg_real_cards.json', 'r') as f:
            existing_cards = json.load(f)
        print(f"📊 Loaded {len(existing_cards)} existing cards")
    except Exception as e:
        print(f"❌ Error loading existing cards: {e}")
        return []
    
    new_cards = []
    for set_name in missing_sets:
        cards = fetch_set_data(set_name)
        if cards:
            new_cards.extend(cards)
        time.sleep(0.5)
    
    if new_cards:
        # Merge and deduplicate
        all_cards = existing_cards + new_cards
        seen_ids = set()
        unique_cards = []
        for card in all_cards:
            if card['id'] not in seen_ids:
                unique_cards.append(card)
                seen_ids.add(card['id'])
        
        unique_cards.sort(key=lambda x: (x["set"], x["cardNumber"]))
        
        with open('js/data/fftcg_real_cards.json', 'w', encoding='utf-8') as f:
            json.dump(unique_cards, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Added {len(new_cards)} new cards, total: {len(unique_cards)}")
    
    return new_cards

def update_image_mappings():
    """Update image mappings for all cards"""
    print("🎨 Updating image mappings...")
    
    # Load cards
    with open('js/data/fftcg_real_cards.json', 'r') as f:
        cards = json.load(f)
    
    # Load existing mappings
    try:
        with open('js/data/card_image_mapping.json', 'r') as f:
            existing_mapping = json.load(f)
    except:
        existing_mapping = {}
    
    new_mappings = {}
    materia_count = 0
    square_count = 0
    
    for card in cards:
        card_id = card['id']
        
        # Keep existing MateriaHunter mappings
        if card_id in existing_mapping and existing_mapping[card_id].get('source') == 'materia-hunter':
            new_mappings[card_id] = existing_mapping[card_id]
            continue
        
        # Try MateriaHunter first
        materia_url = get_materia_hunter_url(card_id)
        if materia_url:
            new_mappings[card_id] = {
                "name": card['name'],
                "image": materia_url,
                "source": "materia-hunter"
            }
            materia_count += 1
        elif 'image' in card:
            new_mappings[card_id] = {
                "name": card['name'],
                "image": card['image'],
                "source": "square-enix"
            }
            square_count += 1
    
    with open('js/data/card_image_mapping.json', 'w') as f:
        json.dump(new_mappings, f, indent=2)
    
    print(f"✅ Updated {len(new_mappings)} image mappings")
    print(f"   🎨 MateriaHunter: {materia_count}")
    print(f"   🏢 Square Enix: {square_count}")

def main():
    parser = argparse.ArgumentParser(description="FFTCG Database Manager")
    parser.add_argument("--fetch-all", action="store_true", help="Fetch all FFTCG sets")
    parser.add_argument("--fetch-missing", nargs="+", help="Fetch specific missing sets")
    parser.add_argument("--update-images", action="store_true", help="Update image mappings")
    
    args = parser.parse_args()
    
    if args.fetch_all:
        fetch_all_sets()
        update_image_mappings()
    elif args.fetch_missing:
        fetch_missing_sets(args.fetch_missing)
        update_image_mappings()
    elif args.update_images:
        update_image_mappings()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()