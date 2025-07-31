#!/usr/bin/env python3
import json
import re
import requests

def get_materia_hunter_opus_directory(card_id):
    """Convert card ID to MateriaHunter directory format - only for sets we know exist"""
    
    # Extract opus number from card ID
    opus_match = re.match(r'^(\d+)-', card_id)
    if opus_match:
        opus_num = int(opus_match.group(1))
        # MateriaHunter seems to have Opus 1-19, but not all newer sets
        if 1 <= opus_num <= 19:
            return f"{opus_num:02d}"
    
    # Skip special sets and newer sets that aren't on MateriaHunter
    return None

def generate_materia_hunter_url(card_id):
    """Generate MateriaHunter URL for a card if the set is supported"""
    opus_dir = get_materia_hunter_opus_directory(card_id)
    if not opus_dir:
        return None
    
    # Remove the rarity suffix and format the card number
    card_number = re.sub(r'[A-Z]+$', '', card_id)  # Remove trailing letters
    
    return f"https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/{opus_dir}/{card_number}.jpg"

def main():
    print("🎨 Updating image mappings with smart MateriaHunter/Square Enix selection...")
    
    # Load current card database
    with open('js/data/fftcg_real_cards.json', 'r') as f:
        cards = json.load(f)
    
    # Load existing image mapping
    try:
        with open('js/data/card_image_mapping.json', 'r') as f:
            existing_mapping = json.load(f)
    except:
        existing_mapping = {}
    
    print(f"📊 Processing {len(cards)} cards...")
    
    new_mappings = {}
    materia_hunter_count = 0
    square_enix_count = 0
    kept_existing = 0
    
    for card in cards:
        card_id = card['id']
        
        # Keep existing mappings that are already MateriaHunter
        if card_id in existing_mapping and existing_mapping[card_id].get('source') == 'materia-hunter':
            new_mappings[card_id] = existing_mapping[card_id]
            kept_existing += 1
            continue
        
        # Try to generate MateriaHunter URL for supported sets
        materia_url = generate_materia_hunter_url(card_id)
        
        if materia_url:
            new_mappings[card_id] = {
                "name": card['name'],
                "image": materia_url,
                "source": "materia-hunter"
            }
            materia_hunter_count += 1
        else:
            # Use Square Enix image for newer sets or special sets
            if 'image' in card:
                new_mappings[card_id] = {
                    "name": card['name'],
                    "image": card['image'],
                    "source": "square-enix"
                }
                square_enix_count += 1
    
    print(f"\n📈 Results:")
    print(f"  🎨 MateriaHunter images: {materia_hunter_count}")
    print(f"  🏢 Square Enix images: {square_enix_count}")
    print(f"  📁 Kept existing: {kept_existing}")
    print(f"  🎯 Total mappings: {len(new_mappings)}")
    
    # Save updated mapping
    with open('js/data/card_image_mapping.json', 'w') as f:
        json.dump(new_mappings, f, indent=2)
    
    print(f"💾 Saved updated image mapping")
    
    # Show which sets use which source
    set_sources = {}
    for card in cards:
        card_id = card['id']
        if card_id in new_mappings:
            card_set = card['set']
            source = new_mappings[card_id]['source']
            if card_set not in set_sources:
                set_sources[card_set] = {'materia-hunter': 0, 'square-enix': 0}
            set_sources[card_set][source] += 1
    
    print(f"\n📊 Image Sources by Set:")
    for set_name in sorted(set_sources.keys()):
        mh_count = set_sources[set_name]['materia-hunter']
        se_count = set_sources[set_name]['square-enix']
        total = mh_count + se_count
        if mh_count > 0:
            print(f"  {set_name}: {mh_count} MateriaHunter, {se_count} Square Enix ({total} total)")
        else:
            print(f"  {set_name}: {se_count} Square Enix only ({total} total)")

if __name__ == "__main__":
    main()