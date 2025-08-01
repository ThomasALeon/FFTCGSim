# Final Fantasy Trading Card Game Simulator

A comprehensive web-based simulator for playing the Final Fantasy Trading Card Game (FFTCG) with full deck building, AI opponents, and multiplayer support.

## Features

### 🎮 Core Gameplay
- **Complete Card Database** - Full FFTCG card database with real card images
- **Advanced Deck Builder** - Search, filter, and build decks with drag-and-drop
- **Practice vs AI** - Multiple AI difficulty levels with strategic gameplay
- **Import/Export Decks** - Support for multiple deck list formats
- **Interactive Game Board** - Drag-and-drop card play with game state management

### 🔧 Enhanced Features
- **Card Interactions** - Hover previews, long-click details, double-click actions
- **Smart Image Loading** - Automatic fallback system for card artwork
- **Responsive Design** - Mobile-friendly interface with touch support
- **Accessibility** - Screen reader support and keyboard navigation
- **Comprehensive Testing** - Full test suite for all components

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ThomasALeon/FFTCGSim.git
   cd FFTCGSim
   ```

2. **Serve the application**
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using any other static file server
   ```

3. **Open in browser**
   Navigate to `http://localhost:8080`

## Project Structure

```
FFTCGSim/
├── index.html                     # Main application entry point
├── package.json                   # Project configuration
├── README.md                      # This file
│
├── src/                          # Source code
│   ├── main.js                   # Application entry point
│   ├── components/               # UI components
│   │   ├── DeckBuilder.js        # Deck building interface
│   │   ├── GameBoard.js          # Game board and card play
│   │   ├── Modal.js              # Modal dialogs and overlays
│   │   └── PracticeSetup.js      # AI practice mode setup
│   ├── core/                     # Core game logic
│   │   ├── AIOpponent.js         # AI opponent behavior
│   │   ├── CardDatabase.js       # Card data management
│   │   ├── DeckManager.js        # Deck storage and management
│   │   ├── GameEngine.js         # Game rules and state
│   │   └── PlayerManager.js      # Player profiles and stats
│   ├── utils/                    # Utility modules
│   │   ├── ImageMapping.js       # Card image management
│   │   ├── LocalStorage.js       # Browser storage utilities
│   │   ├── Logger.js             # Debugging and logging
│   │   ├── Notifications.js      # User notifications
│   │   ├── Security.js           # Input sanitization
│   │   └── Validation.js         # Data validation
│   └── data/                     # Game data
│       ├── fftcg_real_cards.json # Complete card database
│       └── card_image_mapping.json # Image URL mappings
│
├── assets/                       # Static assets
│   ├── css/                      # Stylesheets
│   │   ├── main.css              # Main application styles
│   │   ├── accessibility.css     # Accessibility enhancements
│   │   └── components/           # Component-specific styles
│   ├── images/                   # Local images (if any)
│   └── fonts/                    # Custom fonts (if any)
│
├── tests/                        # Test suite
│   ├── AllTests.js               # Main test runner
│   ├── DeckBuilderTests.js       # Deck builder tests
│   ├── GameLogicEdgeCases.js     # Game logic tests
│   └── (other test files)
│
├── docs/                         # Documentation
│   ├── DEVELOPMENT_WORKFLOW.md   # Development guidelines
│   ├── FUTURE_FEATURES.md        # Planned features
│   └── (other documentation)
│
├── scripts/                      # Utility scripts
│   ├── analyze-*.js              # Database analysis tools
│   ├── fix-*.js                  # Data fixing scripts
│   └── fftcg_database_manager.py # Database management
│
└── archive/                      # Legacy/backup files
    └── (archived files)
```

## Usage

### Deck Building
1. Navigate to **Deck Builder** from the main menu
2. Use search and filters to find cards
3. Double-click cards to add them to your deck
4. Use the import/export buttons to share deck lists

### Practice vs AI
1. Click **Practice vs AI** from the main menu
2. Select your deck and AI difficulty
3. Start the game and test your strategies

### Card Interactions
- **Hover** - Quick card art preview
- **Long-click** - Detailed card information modal
- **Double-click** - Add/remove cards from deck
- **Drag & Drop** - Organize cards and play them

## Development

### Running Tests
```bash
# Open test-monitor.html in browser or run specific test files
open tests/AllTests.js
```

### Adding New Cards
1. Update `src/data/fftcg_real_cards.json` with new card data
2. Optionally update `src/data/card_image_mapping.json` for custom images
3. The system automatically detects new sets and categories

### Contributing
1. Fork the repository
2. Create a feature branch
2. Make your changes
3. Run the test suite
4. Submit a pull request

## Browser Support

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires JavaScript modules support and modern CSS features.

## License

This project is for educational and personal use. Final Fantasy and related intellectual property are owned by Square Enix.