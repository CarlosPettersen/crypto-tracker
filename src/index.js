const CryptoTracker = require('./CryptoTracker');
const PortfolioManager = require('./PortfolioManager');
const RecommendationEngine = require('./RecommendationEngine');
const chalk = require('chalk');
const readline = require('readline');

class CryptoTrackerApp {
  constructor() {
    this.tracker = new CryptoTracker();
    this.portfolio = new PortfolioManager();
    this.recommendations = new RecommendationEngine();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log(chalk.blue.bold('🚀 Crypto Tracker Started'));
    console.log(chalk.gray('Welcome to your personal crypto tracking assistant!\n'));

    // Start tracking
    await this.tracker.start();
    
    // Show initial data
    await this.tracker.displayWatchlist();
    
    // Start interactive menu
    this.showMenu();
  }

  showMenu() {
    console.log(chalk.yellow('\n📋 What would you like to do?'));
    console.log('1. View watchlist with recommendations');
    console.log('2. Add coin to watchlist');
    console.log('3. Remove coin from watchlist');
    console.log('4. View portfolio');
    console.log('5. Add/Update portfolio holding');
    console.log('6. Get detailed recommendations');
    console.log('7. Portfolio optimization suggestions');
    console.log('8. Exit');
    
    this.rl.question('\nEnter your choice (1-8): ', (answer) => {
      this.handleCommand(answer.trim());
    });
  }

  async handleCommand(command) {
    try {
      switch(command) {
        case '1':
          await this.tracker.displayWatchlist();
          break;
        case '2':
          this.rl.question('Enter coin ID (e.g., bitcoin, ethereum, cardano): ', async (coinId) => {
            await this.tracker.addCoin(coinId.trim().toLowerCase());
            this.showMenu();
          });
          return;
        case '3':
          this.rl.question('Enter coin ID to remove: ', async (coinId) => {
            await this.tracker.removeCoin(coinId.trim().toLowerCase());
            this.showMenu();
          });
          return;
        case '4':
          await this.portfolio.displayPortfolio();
          break;
        case '5':
          this.rl.question('Enter coin ID: ', (coinId) => {
            this.rl.question('Enter amount you own: ', async (amount) => {
              await this.portfolio.updateHolding(coinId.trim().toLowerCase(), parseFloat(amount));
              this.showMenu();
            });
          });
          return;
        case '6':
          await this.recommendations.getDetailedRecommendations(this.tracker.getWatchlist());
          break;
        case '7':
          await this.recommendations.getPortfolioOptimization(this.portfolio);
          break;
        case '8':
          console.log(chalk.green('👋 Thanks for using Crypto Tracker!'));
          process.exit(0);
          break;
        default:
          console.log(chalk.red('Invalid choice. Please enter a number between 1-8.'));
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
    
    setTimeout(() => this.showMenu(), 2000);
  }
}

// Start the application
const app = new CryptoTrackerApp();
app.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down Crypto Tracker...'));
  process.exit(0);
});
