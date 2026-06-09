# Institutional Market Risk Analytics

Enterprise-grade Value at Risk calculator with advanced portfolio risk analysis, multi-method calculations, real-time projections, and export functionality.

## ✨ Features

### 📊 Core Analytics
- **Multi-Method VaR**: Parametric, Historical Simulation, Monte Carlo
- **Conditional VaR (CVaR)**: Expected Shortfall calculation
- **Risk Metrics**: Sharpe Ratio, Max Drawdown, Return Skew
- **Portfolio Projections**: Time-series with confidence bands
- **Scenario Analysis**: Best case, base case, stress, and crisis scenarios

### 🎯 Tabbed Interface
1. **Overview**: Scenario analysis and return distribution
2. **Projections**: Portfolio value forecasts with 2σ bounds
3. **Methods**: VaR method comparison and confidence sensitivity
4. **Controls**: Interactive portfolio parameters and settings
5. **Export**: Download results as JSON or CSV

### 🎨 Modern UI/UX
- Dark mode with gradient backgrounds
- Responsive charts using Recharts
- Interactive controls with real-time calculations
- Professional typography and spacing
- Smooth animations and transitions

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/rudra869/institutional-market-risk-analytics.git
cd institutional-market-risk-analytics

# Install dependencies
npm install

# Start the development server
npm start
```

The calculator will open at `http://localhost:3000`

## 📋 Configuration

### Portfolio Parameters
- **Total Portfolio Value**: Starting capital (default: $10M)
- **Expected Annual Return**: Mean return percentage (-20% to +30%)
- **Volatility (σ)**: Standard deviation (5% to 50%)

### Analysis Settings
- **Confidence Level**: 90%, 95%, 99%, or 99.9%
- **Time Horizon**: 1-10 years
- **Methodology**: Parametric, Historical, or Monte Carlo

## 📈 Understanding the Metrics

### Value at Risk (VaR)
Maximum expected loss over the time horizon at the given confidence level.

### Conditional VaR (Expected Shortfall)
Average loss in the tail scenario (worse than VaR).

### Sharpe Ratio
Risk-adjusted return metric. Higher is better. Assumes 2% risk-free rate.

### Max Drawdown
Largest peak-to-trough decline as percentage of portfolio.

### Return Skew
Ratio of expected return to volatility. Indicates risk-return efficiency.

## 🔬 Calculation Methods

### Parametric VaR
Assuming normal distribution:
```
VaR = Portfolio × (μt - z × σ√t)
```
- **Pros**: Fast, mathematically clean
- **Cons**: Assumes normal distribution, underestimates tail risk

### Historical Simulation
Based on historical return distributions:
- **Pros**: No distribution assumptions, includes tail behavior
- **Cons**: Limited by historical data availability

### Monte Carlo Simulation
10,000 random simulations using Box-Muller transform:
- **Pros**: Most realistic for tail risk, handles complex portfolios
- **Cons**: Computationally intensive

## 💾 Export Formats

### JSON Export
Complete analysis data including:
- Portfolio parameters
- VaR calculations (all methods)
- Risk metrics
- Timestamp

### CSV Export
Tabular format for spreadsheet import:
- Parameters section
- Results section
- Easy integration with other tools

## 🎓 Example Scenarios

### Conservative Portfolio
- Portfolio: $10M
- Return: 4%
- Volatility: 8%
- Confidence: 95%
- **Expected VaR (1-year)**: ~$370K

### Aggressive Portfolio
- Portfolio: $10M
- Return: 12%
- Volatility: 25%
- Confidence: 95%
- **Expected VaR (1-year)**: ~$2M+

## ⚠️ Limitations & Assumptions

1. **Normal Distribution**: Parametric method assumes returns are normally distributed
2. **Stationarity**: Assumes historical volatility continues
3. **Independent Periods**: Assumes no autocorrelation
4. **No Structural Breaks**: Doesn't account for market regime changes
5. **Simplified Calculations**: Real portfolios need factor models

## 📚 Further Reading

- Jorion, P. (2007). Value at Risk
- Dowd, K. (2007). Measuring Market Risk
- Basel Committee on Banking Supervision

## 🛠️ Technology Stack

- **React 18**: UI framework
- **Recharts**: Data visualization
- **JavaScript**: Pure numerical calculations
- **CSS-in-JS**: Inline styling

## 📝 License

MIT License - Feel free to use and modify

## ⚡ Disclaimer

This tool is for educational purposes only. VaR estimates have limitations and statistical assumptions. This is NOT financial advice. Always consult qualified financial professionals before making investment decisions.

## 🤝 Contributing

Contributions welcome! Please feel free to submit pull requests.

## 📧 Contact

Questions? Feel free to open an issue on GitHub.
