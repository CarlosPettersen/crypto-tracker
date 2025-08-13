const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const config = require('../config/config');

class PortfolioManager {
  constructor() {
    this.holdings = new Map();
    this.portfolioFile = path.join(__dirname, '../data/portfolio.json');
  }

  async loadPortfolio() {
    try {
      const data = await fs.readFile(this.portfolioFile, 'utf8');
      const portfolioData = JSON.parse(data);
      this.holdings = new Map(Object.entries(portfolioData));
    } catch (error) {
      // File doesn't exist, start with empty portfolio
    }
  }

  async savePortfolio() {
    try {
      const portfolioObj = Object.fromEntries(this.holdings);
      await fs.writeFile(this.portfolioFile, JSON.stringify(portfolioObj, null, 2));
    } catch (error) {
      console.error('Error saving portfolio:', error.message);
    }
  }

  async updateHolding(coinId, amount) {
    if (amount <= 0) {
      this.holdings.delete(coinId);
      console.log(chalk.green(`✅ Removed ${coinId} from your portfolio`));
    } else {
      this.holdings.set(coinId, {
        amount: amount,
        addedAt: Date.now()
      });
      console.log(chalk.green(`✅ Updated ${coinId}: ${amount} coins`));
    }
    
    await this.savePortfolio();
  }

  async getCurrentPrices(coinIds) {
    try {
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/simple/price`,
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: config.API.CURRENCY,
            include_24hr_change: true
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching prices:', error.message);
      return {};
    }
  }

  async displayPortfolio() {
    await this.loadPortfolio();
    
    if (this.holdings.size === 0) {
      console.log(chalk.yellow('\n💼 Your portfolio is empty. Add some holdings to get started!'));
      return;
    }

    const coinIds = Array.from(this.holdings.keys());
    const prices = await this.getCurrentPrices(coinIds);

    console.log(chalk.blue.bold('\n💼 Your Crypto Portfolio'));
    console.log(chalk.gray('─'.repeat(90)));
    
    let totalValue = 0;
    let totalChange24h = 0;
    const portfolioData = [];

    for (const [coinId, holding] of this.holdings) {
      const priceData = prices[coinId];
      if (!priceData) {
        console.log(chalk.gray(`${coinId}: Price data unavailable`));
        continue;
      }

      const currentPrice = priceData[config.API.CURRENCY];
      const change24h = priceData[`${config.API.CURRENCY}_24h_change`] || 0;
      const holdingValue = holding.amount * currentPrice;
      const change24hValue = holdingValue * (change24h / 100);

      totalValue += holdingValue;
      totalChange24h += change24hValue;

      portfolioData.push({
        coinId,
        amount: holding.amount,
        price: currentPrice,
        value: holdingValue,
        change24h: change24h,
        change24hValue: change24hValue
      });
    }

    // Sort by value (highest first)
    portfolioData.sort((a, b) => b.value - a.value);

    // Display each holding
    for (const data of portfolioData) {
      const changeColor = data.change24h >= 0 ? chalk.green : chalk.red;
      const changeSymbol = data.change24h >= 0 ? '+' : '';
      const percentage = ((data.value / totalValue) * 100).toFixed(1);

      console.log(
        `${chalk.white.bold(data.coinId.toUpperCase().padEnd(12))} ` +
        `${data.amount.toFixed(4).padStart(12)} ` +
        `$${chalk.yellow(data.price.toFixed(6).padStart(10))} ` +
        `$${chalk.cyan(data.value.toFixed(2).padStart(10))} ` +
        `${changeColor(changeSymbol + data.change24h.toFixed(2) + '%').padStart(10)} ` +
        `${chalk.magenta(percentage + '%').padStart(8)}`
      );
    }

    console.log(chalk.gray('─'.repeat(90)));
    
    // Portfolio summary
    const totalChangePercent = (totalChange24h / (totalValue - totalChange24h)) * 100;
    const totalChangeColor = totalChange24h >= 0 ? chalk.green : chalk.red;
    const totalChangeSymbol = totalChange24h >= 0 ? '+' : '';

    console.log(
      `${chalk.white.bold('TOTAL VALUE:'.padEnd(25))} ` +
      `$${chalk.cyan.bold(totalValue.toFixed(2).padStart(15))} ` +
      `${totalChangeColor.bold(totalChangeSymbol + totalChange24h.toFixed(2) + ' (' + totalChangePercent.toFixed(2) + '%)')}`
    );

    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`));
  }

  getHoldings() {
    return this.holdings;
  }

  async getPortfolioValue() {
    await this.loadPortfolio();
    
    if (this.holdings.size === 0) return 0;

    const coinIds = Array.from(this.holdings.keys());
    const prices = await this.getCurrentPrices(coinIds);
    
    let totalValue = 0;
    for (const [coinId, holding] of this.holdings) {
      const priceData = prices[coinId];
      if (priceData) {
        totalValue += holding.amount * priceData[config.API.CURRENCY];
      }
    }
    
    return totalValue;
  }

  async getPortfolioAllocation() {
    await this.loadPortfolio();
    
    if (this.holdings.size === 0) return new Map();

    const coinIds = Array.from(this.holdings.keys());
    const prices = await this.getCurrentPrices(coinIds);
    
    let totalValue = 0;
    const allocations = new Map();

    // Calculate total value first
    for (const [coinId, holding] of this.holdings) {
      const priceData = prices[coinId];
      if (priceData) {
        const value = holding.amount * priceData[config.API.CURRENCY];
        allocations.set(coinId, value);
        totalValue += value;
      }
    }

    // Convert to percentages
    for (const [coinId, value] of allocations) {
      allocations.set(coinId, (value / totalValue) * 100);
    }

    return allocations;
  }
}

module.exports = PortfolioManager;
