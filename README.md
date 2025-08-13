# 🚀 Crypto Tracker

An advanced cryptocurrency portfolio tracker web application with AI-powered recommendations, technical analysis, and a modern responsive interface.

## Features

### 📊 Watchlist Management
- Add/remove cryptocurrencies to track
- Real-time price updates every 90 seconds
- 24-hour change tracking
- Basic buy/sell/hold recommendations

### 💼 Portfolio Management
- Track your actual cryptocurrency holdings
- Real-time portfolio valuation
- Portfolio allocation breakdown with interactive charts
- 24-hour profit/loss tracking

### 🎯 Advanced Recommendations
- Technical analysis using multiple indicators:
  - Simple Moving Averages (7, 14, 30 days)
  - RSI (Relative Strength Index)
  - Price volatility analysis
  - Support and resistance levels
  - Trend detection
- Confidence-based recommendations
- Detailed reasoning for each recommendation

### 🔄 Portfolio Optimization
- Risk assessment (Low/Medium/High)
- Over-concentration warnings
- Rebalancing suggestions
- Target allocation recommendations

### 🌐 Modern Web Interface
- Beautiful dark theme with gradient backgrounds
- Responsive design (mobile & desktop)
- Interactive charts and visualizations
- Real-time data updates
- Intuitive user experience
- Autocomplete coin search with dropdown selection

## Installation

1. Install Yarn (if not already installed):
```bash
npm install -g yarn
```

2. Install dependencies:
```bash
yarn install
```

3. Install web dependencies:
```bash
cd web && npm install && cd ..
```

## Usage

### 🌐 Web Interface

Start the web application:
```bash
./start-web.sh
```

Or manually:
```bash
yarn start
```

Then open your browser to: **http://localhost:3001**

For development with auto-reload:
```bash
yarn dev
```

## Web Interface Features

### 📊 Dashboard
- **Watchlist Tab**: View all tracked coins with prices, changes, and recommendations
- **Portfolio Tab**: Manage your holdings with allocation charts and performance metrics
- **Recommendations Tab**: Get detailed technical analysis and trading suggestions

### 🎨 User Experience
- **Dark Theme**: Easy on the eyes with beautiful gradients
- **Responsive Design**: Works perfectly on mobile and desktop
- **Real-time Updates**: Prices update automatically every 90 seconds
- **Interactive Elements**: Click to add/remove coins, edit holdings, and more
- **Autocomplete Search**: Easy coin selection with dropdown search

### 🔧 Quick Actions
- **Add Coins**: Click the + button and search for cryptocurrencies
- **Manage Portfolio**: Click the + button in portfolio to add/update holdings
- **Remove Items**: Click delete icons to remove coins from watchlist
- **Edit Holdings**: Click edit icons to modify your portfolio amounts

## Adding Coins

The application features an autocomplete search that makes it easy to find and add coins. Popular coins include:
- Bitcoin (bitcoin)
- Ethereum (ethereum)
- Cardano (cardano)
- Chainlink (chainlink)
- Solana (solana)

Simply start typing the coin name and select from the dropdown suggestions.

## Portfolio Tracking

1. Go to the Portfolio tab
2. Click the + button to add holdings
3. Search for the coin using the autocomplete dropdown
4. Enter the amount you own
5. View real-time portfolio value and allocation charts

Set amount to 0 to remove a coin from your portfolio.

## Configuration

Edit `config/config.js` to customize:

- **COINS**: Default coins to track
- **THRESHOLDS**: Buy/sell recommendation thresholds
- **API.UPDATE_INTERVAL**: How often to update prices (milliseconds)
- **API.CURRENCY**: Base currency for prices (default: USD)

## Data Storage

The application stores data locally in the `data/` directory:
- `watchlist.json`: Your tracked coins
- `portfolio.json`: Your holdings
- `price_history.json`: Historical price data for analysis

All data is automatically validated and cleaned to prevent corruption issues.

## Technical Analysis Indicators

### Moving Averages
- **7-day SMA**: Short-term trend
- **14-day SMA**: Medium-term trend  
- **30-day SMA**: Long-term trend

### RSI (Relative Strength Index)
- **< 30**: Oversold (potential buy signal)
- **> 70**: Overbought (potential sell signal)
- **30-70**: Normal range

### Trend Detection
- **Bullish**: Short MA > Medium MA > Long MA
- **Bearish**: Short MA < Medium MA < Long MA
- **Sideways**: Mixed signals

### Recommendation Scoring
The system uses a scoring algorithm that considers:
- Price position relative to moving averages
- RSI levels
- Overall trend direction
- Recent price movements

## Risk Management

### Portfolio Risk Levels
- **Low Risk**: Well-diversified (5+ assets, max 35% in any single asset)
- **Medium Risk**: Moderately diversified (3-5 assets, max 50% in any single asset)
- **High Risk**: Concentrated (< 3 assets or > 50% in single asset)

### Optimization Suggestions
- Rebalancing recommendations
- Over-concentration warnings
- Diversification advice
- Target allocation guidance

## API Usage

The application uses the free CoinGecko API:
- **No API key required**
- **Rate limits handled automatically** - The app includes:
  - Minimum 15 seconds between API calls
  - Exponential backoff on rate limit errors
  - Automatic retry with intelligent delays
  - Cached coin search results (1 hour cache)
  - Data validation and corruption prevention
- **Real-time price data** - Updates every 90 seconds (optimized for rate limits)
- **Historical data** for technical analysis

### Rate Limiting Features
- ⏱️ **Smart Timing**: Automatic delays between API calls
- 🔄 **Auto Retry**: Exponential backoff on rate limit errors  
- 📦 **Caching**: Coin search results cached for better performance
- ⚠️ **User Feedback**: Clear notifications when rate limited
- 🛡️ **Graceful Degradation**: App continues working even with API issues
- 🔧 **Data Validation**: Automatic cleanup of corrupted data

## Development

### Available Scripts

```bash
# Web application
yarn start         # Start web server (production)
yarn dev          # Start web server with auto-reload
yarn web          # Start React development server
yarn build        # Build React app for production
yarn dev:full     # Start both server and React dev server
```

### Project Structure

```
crypto-tracker/
├── src/                    # Backend source code
│   ├── server.js          # Web server entry point (main)
│   ├── CryptoTracker.js   # Watchlist management & price tracking
│   ├── PortfolioManager.js # Portfolio tracking & valuation
│   └── RecommendationEngine.js # Technical analysis & optimization
├── web/                   # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   └── App.tsx        # Main React app
│   └── build/            # Production build (auto-generated)
├── config/               # Configuration files
├── data/                 # Local data storage (auto-created)
├── package.json          # Dependencies and scripts
└── README.md
```

## Troubleshooting

### Common Issues

1. **Portfolio coins disappearing**: The app now automatically validates and cleans corrupted data
2. **"Coin not found" error**: Use the autocomplete search to find valid coin IDs
3. **API errors**: The app handles rate limits automatically with retry logic
4. **Permission errors**: Ensure write permissions for the `data/` directory
5. **Port 3001 in use**: Stop other applications using port 3001 or change the port in `src/server.js`

### Web Interface Issues

1. **Blank page**: Check browser console for errors and ensure server is running
2. **API connection failed**: Verify the server is running on http://localhost:3001
3. **Build errors**: Run `cd web && npm install` to ensure all dependencies are installed
4. **Data persistence issues**: The app now includes automatic data validation and repair

### Debug Mode
Set `DISPLAY.SHOW_DETAILED_INFO: true` in config for verbose logging.

## Screenshots

The web interface features:
- 🌙 **Dark theme** with beautiful gradients
- 📱 **Responsive design** for all screen sizes
- 📊 **Interactive charts** for portfolio allocation
- 🎯 **Real-time recommendations** with confidence indicators
- 💼 **Portfolio management** with persistent data storage
- 🔄 **Auto-refresh** every 90 seconds
- 🔍 **Autocomplete search** for easy coin selection

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and informational purposes only. Cryptocurrency investments are highly risky and volatile. Always do your own research and never invest more than you can afford to lose. The recommendations provided by this tool should not be considered as financial advice.
