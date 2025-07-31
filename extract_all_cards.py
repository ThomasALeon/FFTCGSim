#!/usr/bin/env python3
"""
Extract all FFTCG cards from Square's official API and convert to our app format
"""

import requests
import json
import roman
import time

def extract_opus_cards(opus_id):
    """Extract cards from a specific Opus set"""
    api_url = "https://fftcg.square-enix-games.com/en/get-cards"
    
    if isinstance(opus_id, int) and opus_id <= 17:
        opus_name = f"Opus {roman.toRoman(opus_id).upper()}"
        set_name = f"Opus {opus_id}"
    elif opus_id == "chaos":
        opus_name = "Boss Deck Chaos"
        set_name = "Boss Deck Chaos"
    elif opus_id == "promo":
        # For promo cards, use rarity filter instead of set
        params = {"text": "", "rarity": ["pr"]}
        set_name = "Promo"
    else:
        # Handle newer sets by name
        opus_map = {
            15: "Crystal Dominion",
            16: "Emissaries of Light", 
            17: "Rebellion's Call",
        }
        opus_name = opus_map.get(opus_id, f"Unknown Set {opus_id}")
        set_name = opus_name
    
    if opus_id != "promo":
        params = {"text": "", "set": [opus_name]}
    
    print(f"🌐 Extracting {set_name}...")
    
    try:
        response = requests.post(api_url, json=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if "cards" in data:
                cards = data["cards"]
                print(f"✅ Got {len(cards)} cards from {set_name}")
                return cards, set_name
            else:
                print(f"⚠️ No cards found in {set_name}")
                return [], set_name
        else:
            print(f"❌ Error {response.status_code} for {set_name}")
            return [], set_name
            
    except Exception as e:
        print(f"🚫 Failed to get {set_name}: {e}")
        return [], set_name

def convert_to_app_format(square_card, set_name):
    """Convert Square API card format to our app format"""
    
    # Extract element - handle both string and array formats
    element = square_card.get('element', ['unknown'])
    if isinstance(element, list):
        element = element[0] if element else 'unknown'
    
    # Map Japanese elements to English
    element_map = {
        '火': 'fire',
        '氷': 'ice', 
        '風': 'wind',
        '雷': 'lightning',
        '水': 'water',
        '土': 'earth',
        '光': 'light',
        '闇': 'dark'
    }
    element = element_map.get(element, element.lower())
    
    # Extract image URL
    image_data = square_card.get('image', '{}')
    try:
        image_json = json.loads(image_data)
        image_filename = image_json.get('1', {}).get('filename', '')
        if image_filename:
            image_url = f"https://fftcg.square-enix-games.com/{image_filename}"
        else:
            image_url = None
    except:
        image_url = None
    
    # Convert to our format
    app_card = {
        "id": square_card.get('code', 'unknown'),
        "name": square_card.get('name_en', 'Unknown'),
        "element": element,
        "type": square_card.get('type_en', 'unknown').lower(),
        "cost": int(square_card.get('cost', 0)),
        "power": int(square_card.get('power', 0)) if square_card.get('power') else None,
        "job": square_card.get('job_en'),
        "category": square_card.get('category_1'),
        "rarity": square_card.get('rarity', 'C'),
        "text": square_card.get('text_en', ''),
        "set": set_name,
        "cardNumber": square_card.get('code', 'unknown'),
        "image": image_url,
        "source": "square-api",
        "hasRealImage": True
    }
    
    return app_card

def main():
    all_cards = []
    
    # Extract first few Opus sets to test
    opus_sets = [1, 2, 3]  # Start small for testing
    
    print("🚀 Starting FFTCG card extraction from Square's API...\n")
    
    for opus_id in opus_sets:
        square_cards, set_name = extract_opus_cards(opus_id)
        
        if square_cards:
            # Convert to our format
            converted_cards = []
            for square_card in square_cards:
                app_card = convert_to_app_format(square_card, set_name)
                converted_cards.append(app_card)
            
            all_cards.extend(converted_cards)
            print(f"✅ Converted {len(converted_cards)} cards from {set_name}")
        
        # Be nice to the API
        time.sleep(1)
        print()
    
    # Save all cards
    if all_cards:
        output_file = 'fftcg_real_cards.json'
        with open(output_file, 'w') as f:
            json.dump(all_cards, f, indent=2)
        
        print(f"🎉 SUCCESS! Extracted {len(all_cards)} real FFTCG cards")
        print(f"💾 Saved to {output_file}")
        
        # Show sample
        print(f"\n🎴 Sample cards:")
        for i, card in enumerate(all_cards[:5]):
            print(f"  {i+1}. {card['name']} - {card['element'].title()} {card['type'].title()}")
            print(f"      Cost: {card['cost']}, Power: {card['power']}, Job: {card['job']}")
            print(f"      Text: {card['text'][:50]}{'...' if len(card['text']) > 50 else ''}")
            print()
    else:
        print("❌ No cards extracted")

if __name__ == "__main__":
    main()