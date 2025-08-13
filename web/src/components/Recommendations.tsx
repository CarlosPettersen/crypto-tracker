import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  ExpandMore,
  CheckCircle,
  Warning,
  Info,
  ShowChart,
  Assessment,
  Timeline
} from '@mui/icons-material';
import { cryptoService, CoinRecommendation } from '../services/CryptoService';

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<CoinRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 120000); // Update every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const data = await cryptoService.getRecommendations();
      setRecommendations(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('BUY')) return 'success';
    if (action.includes('SELL')) return 'error';
    return 'warning';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('BUY')) return <TrendingUp />;
    if (action.includes('SELL')) return <TrendingDown />;
    return <TrendingFlat />;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'success';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'error';
      default: return 'default';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      default: return 'default';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          🎯 Advanced AI Recommendations
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Analyzing portfolio with advanced technical indicators...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          🎯 Advanced AI Recommendations
        </Typography>
        <Alert severity="info">
          No portfolio holdings found. Add some coins to your portfolio to get advanced recommendations.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ 
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold'
      }}>
        🎯 Advanced AI Recommendations
      </Typography>
      
      <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary' }}>
        Powered by 15+ technical indicators, chart pattern recognition, and market structure analysis
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {recommendations.map((rec) => (
          <Box key={rec.coinId}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 203, 243, 0.05) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {rec.name}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatPrice(rec.currentData.price)}
                      <Typography component="span" sx={{ 
                        ml: 1, 
                        color: rec.currentData.change_24h >= 0 ? 'success.main' : 'error.main' 
                      }}>
                        {formatPercentage(rec.currentData.change_24h)}
                      </Typography>
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      icon={getActionIcon(rec.recommendation.action)}
                      label={rec.recommendation.action.replace('_', ' ')}
                      color={getActionColor(rec.recommendation.action) as any}
                      size="medium"
                      sx={{ mb: 1, fontWeight: 'bold', fontSize: '1.1rem', px: 2, py: 1 }}
                    />
                    <Box>
                      <Chip
                        label={`${rec.recommendation.confidence} Confidence`}
                        color={getConfidenceColor(rec.recommendation.confidence) as any}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={`Score: ${rec.recommendation.score}/100`}
                        color={rec.recommendation.score >= 70 ? 'success' : rec.recommendation.score >= 40 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Score Breakdown */}
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Assessment sx={{ mr: 1 }} />
                    <Typography variant="h6">Technical Analysis Breakdown</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      {Object.entries(rec.recommendation.breakdown).map(([key, value]) => (
                        <Box key={key} sx={{ flex: "1 1 200px", minWidth: "200px" }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={value as number}
                              sx={{ 
                                mt: 1, 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: 'rgba(255,255,255,0.1)'
                              }}
                              color={value >= 70 ? 'success' : value >= 40 ? 'warning' : 'error'}
                            />
                            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                              {value}/100
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Signals and Warnings */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: "1 1 300px" }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                      Bullish Signals
                    </Typography>
                    <List dense>
                      {rec.recommendation.signals.slice(0, 4).map((signal, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                          </ListItemIcon>
                          <ListItemText primary={signal} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                  
                  <Box sx={{ flex: "1 1 300px" }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Warning sx={{ mr: 1, color: 'warning.main' }} />
                      Risk Factors
                    </Typography>
                    <List dense>
                      {rec.recommendation.warnings.slice(0, 4).map((warning, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                          </ListItemIcon>
                          <ListItemText primary={warning} />
                        </ListItem>
                      ))}
                      {rec.analysis.riskAssessment.factors.map((factor, index) => (
                        <ListItem key={`risk-${index}`} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <Warning sx={{ fontSize: 16, color: 'error.main' }} />
                          </ListItemIcon>
                          <ListItemText primary={factor} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Box>

                {/* Advanced Analysis */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <ShowChart sx={{ mr: 1 }} />
                    <Typography variant="h6">Detailed Analysis & Key Levels</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {/* Technical Summary */}
                      <Box sx={{ flex: "1 1 300px" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          📊 Technical Summary
                        </Typography>
                        <List dense>
                          {rec.analysis.technicalSummary.map((item, index) => (
                            <ListItem key={index} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                <Info sx={{ fontSize: 16, color: 'info.main' }} />
                              </ListItemIcon>
                              <ListItemText primary={item} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>

                      {/* Risk Assessment */}
                      <Box sx={{ flex: "1 1 300px" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          ⚠️ Risk Assessment
                        </Typography>
                        <Chip
                          label={`${rec.analysis.riskAssessment.level} Risk`}
                          color={getRiskColor(rec.analysis.riskAssessment.level) as any}
                          sx={{ mb: 2 }}
                        />
                        
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          📅 Timeframe Analysis
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Tooltip title="Next 1-7 days">
                            <Chip label={`Short: ${rec.analysis.timeframe.shortTerm}`} size="small" />
                          </Tooltip>
                          <Tooltip title="Next 1-4 weeks">
                            <Chip label={`Medium: ${rec.analysis.timeframe.mediumTerm}`} size="small" />
                          </Tooltip>
                          <Tooltip title="Next 1-3 months">
                            <Chip label={`Long: ${rec.analysis.timeframe.longTerm}`} size="small" />
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Key Levels */}
                      <Box sx={{ flex: "1 1 300px" }}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                          🎯 Key Trading Levels
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          <Box sx={{ flex: "1 1 300px" }}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                              <Typography variant="caption">Support</Typography>
                              <Typography variant="h6" color="success.main">
                                {formatPrice(rec.analysis.keyLevels.support)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ flex: "1 1 300px" }}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 2 }}>
                              <Typography variant="caption">Resistance</Typography>
                              <Typography variant="h6" color="error.main">
                                {formatPrice(rec.analysis.keyLevels.resistance)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ flex: "1 1 300px" }}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                              <Typography variant="caption">Stop Loss</Typography>
                              <Typography variant="h6" color="warning.main">
                                {formatPrice(rec.analysis.keyLevels.stopLoss)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ flex: "1 1 300px" }}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2 }}>
                              <Typography variant="caption">Take Profit</Typography>
                              <Typography variant="h6" color="primary.main">
                                {formatPrice(rec.analysis.keyLevels.takeProfit)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Recommendations;
