# 🚀 Crypto Tracker

An advanced cryptocurrency portfolio tracker with AI-powered recommendations, technical analysis, and a modern web interface.

## Features

### 📊 Watchlist Management
- Add/remove cryptocurrencies to track
- Real-time price updates every 30 seconds
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

### 🌐 Web Interface (Recommended)

Start the web application:
```bash
./start-web.sh
```

Or manually:
```bash
yarn server
```

Then open your browser to: **http://localhost:3001**

### 📱 Command Line Interface

For the traditional CLI experience:
```bash
yarn start
```

Or for development with auto-reload:
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
- **Real-time Updates**: Prices update automatically every 30 seconds
- **Interactive Elements**: Click to add/remove coins, edit holdings, and more

### 🔧 Quick Actions
- **Add Coins**: Click the + button to add cryptocurrencies to your watchlist
- **Manage Portfolio**: Click the + button in portfolio to add/update holdings
- **Remove Items**: Click delete icons to remove coins from watchlist
- **Edit Holdings**: Click edit icons to modify your portfolio amounts

## Adding Coins

When adding coins, use the CoinGecko ID format:
- Bitcoin: `bitcoin`
- Ethereum: `ethereum`
- Cardano: `cardano`
- Chainlink: `chainlink`
- Solana: `solana`

Popular coins are available as quick-select buttons in the add dialog.

You can find more coin IDs at: https://api.coingecko.com/api/v3/coins/list

## Portfolio Tracking

### Web Interface
1. Go to the Portfolio tab
2. Click the + button to add holdings
3. Enter the coin ID and amount you own
4. View real-time portfolio value and allocation charts

### CLI Interface
- Enter the amount of each coin you own
- The system will calculate current values and allocations
- Set amount to 0 to remove a coin from your portfolio

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
- No API key required
- Rate limits apply (check CoinGecko documentation)
- Real-time price data
- Historical data for technical analysis

## Development

### Available Scripts

```bash
# CLI application
yarn start          # Start CLI version
yarn dev           # Start CLI with auto-reload

# Web application
yarn server        # Start web server
yarn web          # Start React development server
yarn build        # Build React app for production
yarn dev:server   # Start server with auto-reload
yarn dev:full     # Start both server and React dev server
```

### Project Structure

```
crypto-tracker/
├── src/                    # Backend source code
│   ├── index.js           # CLI application entry point
│   ├── server.js          # Web server entry point
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
├── package.json          # Backend dependencies
└── README.md
```

## Troubleshooting

### Common Issues

1. **"Coin not found" error**: Verify the coin ID using CoinGecko's coin list
2. **API errors**: Check internet connection and CoinGecko API status
3. **Permission errors**: Ensure write permissions for the `data/` directory
4. **Port 3001 in use**: Stop other applications using port 3001 or change the port in `src/server.js`

### Web Interface Issues

1. **Blank page**: Check browser console for errors and ensure server is running
2. **API connection failed**: Verify the server is running on http://localhost:3001
3. **Build errors**: Run `cd web && npm install` to ensure all dependencies are installed

### Debug Mode
Set `DISPLAY.SHOW_DETAILED_INFO: true` in config for verbose logging.

## Screenshots

The web interface features:
- 🌙 **Dark theme** with beautiful gradients
- 📱 **Responsive design** for all screen sizes
- 📊 **Interactive charts** for portfolio allocation
- 🎯 **Real-time recommendations** with confidence indicators
- 💼 **Portfolio management** with drag-and-drop editing
- 🔄 **Auto-refresh** every 30 seconds

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and informational purposes only. Cryptocurrency investments are highly risky and volatile. Always do your own research and never invest more than you can afford to lose. The recommendations provided by this tool should not be considered as financial advice.
