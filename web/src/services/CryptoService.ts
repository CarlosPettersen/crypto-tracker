import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface WatchlistItem {
  id: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  recommendation: string;
  timestamp: number;
}

export interface PortfolioHolding {
  coinId: string;
  name: string;
  amount: number;
  price: number;
  value: number;
  change24h: number;
  change24hValue: number;
  allocation: number;
}

export interface PortfolioData {
  holdings: PortfolioHolding[];
  totalValue: number;
  totalChange24h: number;
  totalChangePercent: number;
}

export interface TechnicalIndicators {
  currentPrice: number;
  sma7: number | null;
  sma14: number | null;
  sma30: number | null;
  rsi: number | null;
  volatility: number | null;
  support: number;
  resistance: number;
  trend: string;
}

export interface RecommendationData {
  action: string;
  confidence: string;
  score: number;
  reasons: string[];
}

export interface CoinRecommendation {
  coinId: string;
  name: string;
  currentData: {
    price: number;
    change_24h: number;
    market_cap: number;
    volume_24h: number;
  };
  indicators: TechnicalIndicators;
  recommendation: RecommendationData;
}

export interface OptimizationSuggestion {
  type: 'warning' | 'info' | 'rebalance';
  message: string;
  coinId?: string;
  currentAllocation?: number;
  suggestedAllocation?: number;
  difference?: number;
  action?: 'BUY' | 'SELL';
}

export interface PortfolioOptimization {
  suggestions: OptimizationSuggestion[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  totalValue: number;
  currentAllocation: [string, number][];
  targetAllocation: [string, number][];
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
}

class CryptoServiceClass {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  async getWatchlist(): Promise<WatchlistItem[]> {
    try {
      const response = await this.api.get('/watchlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      throw new Error('Failed to fetch watchlist');
    }
  }

  async addToWatchlist(coinId: string): Promise<void> {
    try {
      await this.api.post('/watchlist', { coinId });
    } catch (error: any) {
      console.error('Error adding to watchlist:', error);
      throw new Error(error.response?.data?.error || 'Failed to add coin to watchlist');
    }
  }

  async removeFromWatchlist(coinId: string): Promise<void> {
    try {
      await this.api.delete(`/watchlist/${coinId}`);
    } catch (error: any) {
      console.error('Error removing from watchlist:', error);
      throw new Error(error.response?.data?.error || 'Failed to remove coin from watchlist');
    }
  }

  async getPortfolio(): Promise<PortfolioData> {
    try {
      const response = await this.api.get('/portfolio');
      console.log('Portfolio API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw new Error('Failed to fetch portfolio');
    }
  }

  async updatePortfolio(coinId: string, amount: number): Promise<void> {
    try {
      console.log('Updating portfolio via API:', { coinId, amount });
      await this.api.post('/portfolio', { coinId, amount });
    } catch (error: any) {
      console.error('Error updating portfolio:', error);
      throw new Error(error.response?.data?.error || 'Failed to update portfolio');
    }
  }

  async getRecommendations(): Promise<CoinRecommendation[]> {
    try {
      const response = await this.api.get('/recommendations');
      return response.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw new Error('Failed to fetch recommendations');
    }
  }

  async getCoinRecommendation(coinId: string): Promise<CoinRecommendation> {
    try {
      const response = await this.api.get(`/recommendations/${coinId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching coin recommendation:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch coin recommendation');
    }
  }

  async getPortfolioOptimization(): Promise<PortfolioOptimization> {
    try {
      const response = await this.api.get('/portfolio/optimization');
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio optimization:', error);
      throw new Error('Failed to fetch portfolio optimization');
    }
  }

  async searchCoins(query: string): Promise<CoinSearchResult[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }
      const response = await this.api.get(`/coins/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching coins:', error);
      return [];
    }
  }
}

export const CryptoService = new CryptoServiceClass();
