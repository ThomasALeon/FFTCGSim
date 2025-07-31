#!/usr/bin/env python3
import json
import re
import requests
from urllib.parse import quote

def get_materia_hunter_opus_directory(card_id):
    """Convert card ID to MateriaHunter directory format"""
    # Handle special sets first
    if card_id.startswith('B-'):
        return 'boss'
    elif card_id.startswith('PR-'):
        return 'promo'
    
    # Extract opus number from card ID
    opus_match = re.match(r'^(\d+)-', card_id)
    if opus_match:
        opus_num = int(opus_match.group(1))
        return f"{opus_num:02d}"  # Format as two digits (01, 02, 03, etc.)
    
    # Handle newer sets that might use different prefixes
    # We'll need to map these based on the set names
    return None

def generate_materia_hunter_url(card_id):
    """Generate MateriaHunter URL for a card"""
    opus_dir = get_materia_hunter_opus_directory(card_id)
    if not opus_dir:
        return None
    
    # Remove the rarity suffix and format the card number
    card_number = re.sub(r'[A-Z]+$', '', card_id)  # Remove trailing letters
    
    return f"https://storage.googleapis.com/materiahunter-prod.appspot.com/images/cards/{opus_dir}/{card_number}.jpg"

def test_image_url(url, timeout=5):
    """Test if an image URL is accessible"""
    try:
        response = requests.head(url, timeout=timeout)
        return response.status_code == 200
    except:
        return False

def main():
    print("🎨 Generating MateriaHunter image mappings for all cards...")
    
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
    print(f"📊 Existing mappings: {len(existing_mapping)}")
    
    new_mappings = {}
    successful_urls = 0
    failed_urls = 0
    skipped_existing = 0
    
    for i, card in enumerate(cards):
        card_id = card['id']
        
        # Skip if we already have this mapping
        if card_id in existing_mapping:
            skipped_existing += 1
            new_mappings[card_id] = existing_mapping[card_id]
            continue
        
        # Generate MateriaHunter URL
        materia_url = generate_materia_hunter_url(card_id)
        
        if materia_url:
            # Test if URL exists (for first few to verify pattern)
            if i < 10:  # Only test first 10 to avoid overwhelming the server
                url_works = test_image_url(materia_url)
                print(f"  Testing {card_id}: {materia_url} - {'✅' if url_works else '❌'}")
            
            # Add to mapping regardless (we'll handle missing images gracefully)
            new_mappings[card_id] = {
                "name": card['name'],
                "image": materia_url,
                "source": "materia-hunter"
            }
            successful_urls += 1
        else:
            # Fallback to Square Enix image if available
            if 'image' in card:
                new_mappings[card_id] = {
                    "name": card['name'],
                    "image": card['image'],
                    "source": "square-enix"
                }
            failed_urls += 1
        
        # Progress indicator
        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(cards)} cards...")
    
    print(f"\n📈 Results:")
    print(f"  ✅ Generated MateriaHunter URLs: {successful_urls}")
    print(f"  ⚠️  Could not generate URLs: {failed_urls}")
    print(f"  📁 Kept existing mappings: {skipped_existing}")
    print(f"  🎯 Total mappings: {len(new_mappings)}")
    
    # Save updated mapping
    with open('js/data/card_image_mapping.json', 'w') as f:
        json.dump(new_mappings, f, indent=2)
    
    print(f"💾 Saved updated image mapping to js/data/card_image_mapping.json")
    
    # Show breakdown by source
    sources = {}
    for mapping in new_mappings.values():
        source = mapping.get('source', 'unknown')
        sources[source] = sources.get(source, 0) + 1
    
    print(f"\n📊 Image Sources:")
    for source, count in sources.items():
        print(f"  {source}: {count} cards")

if __name__ == "__main__":
    main()