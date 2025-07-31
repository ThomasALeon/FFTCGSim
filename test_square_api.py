#!/usr/bin/env python3
"""
Test script to access Square's FFTCG API directly
Based on the fftcgtool source code
"""

import requests
import json
import roman

def test_square_api():
    api_url = "https://fftcg.square-enix-games.com/en/get-cards"
    
    # Test with Opus I first (small set)
    opus_id = 1
    # Based on fftcgtool source: text parameter is required, cards are in response["cards"]
    params = {
        "text": "",  # Required parameter
        "set": [f"Opus {roman.toRoman(opus_id).upper()}"]
    }
    
    print(f"🌐 Testing Square API with Opus {opus_id}")
    print(f"📡 URL: {api_url}")
    print(f"📋 Params: {params}")
    
    try:
        response = requests.post(api_url, json=params, timeout=30)
        print(f"📊 Status: {response.status_code}")
        print(f"📦 Content-Type: {response.headers.get('content-type', 'unknown')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"🔍 Response keys: {list(data.keys())}")
            
            if "cards" in data:
                cards = data["cards"]
                print(f"✅ Success! Got {len(cards)} cards")
                
                # Show first few cards
                if cards:
                    print("\n🎴 Sample cards:")
                    for i, card in enumerate(cards[:3]):
                        print(f"  {i+1}. {card.get('name', 'Unknown')} - {card.get('element', 'Unknown')} {card.get('type', 'Unknown')}")
                        print(f"      Code: {card.get('code', 'Unknown')}, Cost: {card.get('cost', 'Unknown')}")
                    
                    # Save to file
                    with open('opus_1_cards.json', 'w') as f:
                        json.dump(cards, f, indent=2)
                    print(f"\n💾 Saved {len(cards)} cards to opus_1_cards.json")
                    
                return cards
            else:
                print(f"⚠️ No 'cards' key in response: {data}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}...")
            
    except requests.exceptions.RequestException as e:
        print(f"🚫 Request failed: {e}")
        
    return None

if __name__ == "__main__":
    test_square_api()