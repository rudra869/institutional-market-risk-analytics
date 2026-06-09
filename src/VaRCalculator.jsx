import React, { useState, useMemo, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend } from 'recharts';

export default function VaRCalculator() {
  const [portfolio, setPortfolio] = useState(10000000);
  const [meanReturn, setMeanReturn] = useState(0.08);
  const [volatility, setVolatility] = useState(0.15);
  const [confidence, setConfidence] = useState(95);
  const [timeHorizon, setTimeHorizon] = useState(1);
  const [method, setMethod] = useState('parametric');
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState('json');

  const zScores = { 90: 1.282, 95: 1.645, 99: 2.326, 99.9: 3.09 };

  const calculations = useMemo(() => {
    const zScore = zScores[confidence];
    const timeAdjustedVol = volatility * Math.sqrt(timeHorizon);
    const timeAdjustedReturn = meanReturn * timeHorizon;

    const parametricVaR = portfolio * (timeAdjustedReturn - zScore * timeAdjustedVol);
    const parametricLoss = Math.max(0, -parametricVaR);

    const simulations = 10000;
    const simulatedReturns = [];
    for (let i = 0; i < simulations; i++) {
      const randomNormal = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      const simReturn = (meanReturn * timeHorizon) + (timeAdjustedVol * randomNormal);
      simulatedReturns.push(simReturn);
    }
    simulatedReturns.sort((a, b) => a - b);
    const varPercentile = Math.floor((1 - confidence / 100) * simulations);
    
    const monteCarloReturn = simulatedReturns[varPercentile];
    const monteCarloLoss = Math.max(0, -portfolio * monteCarloReturn);
    const historicalLoss = parametricLoss;

    const tailLosses = simulatedReturns.slice(0, varPercentile);
    const cvarValue = portfolio * Math.abs(tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length);

    const expectedPortfolioValue = portfolio * Math.exp(meanReturn * timeHorizon);
    const expectedReturn = meanReturn * timeHorizon * 100;
    const sharpeRatio = (meanReturn - 0.02) / (volatility || 0.01);

    // Distribution data with enhanced bins
    const distributionData = [];
    for (let i = -0.4; i <= 0.4; i += 0.02) {
      const y = (1 / (volatility * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((i - meanReturn) / volatility, 2));
      distributionData.push({ 
        return: (i * 100).toFixed(1), 
        probability: Math.max(0, y),
        portfolioValue: portfolio * (1 + i)
      });
    }

    // Scenario data
    const scenarioData = [
      { scenario: 'Best Case\n(+2σ)', value: portfolio * (1 + meanReturn * timeHorizon + 2 * timeAdjustedVol), color: '#10b981' },
      { scenario: 'Base Case', value: expectedPortfolioValue, color: '#3b82f6' },
      { scenario: 'Stress\n(-1σ)', value: portfolio * (1 + meanReturn * timeHorizon - timeAdjustedVol), color: '#f59e0b' },
      { scenario: 'Crisis\n(VaR)', value: portfolio - monteCarloLoss, color: '#ef4444' }
    ];

    // Time series projections
    const timeSeriesData = [];
    for (let year = 0; year <= timeHorizon; year++) {
      const yearReturn = meanReturn * year;
      timeSeriesData.push({
        year,
        expected: portfolio * Math.exp(yearReturn),
        upperBound: portfolio * Math.exp(yearReturn + 2 * volatility * Math.sqrt(year || 1)),
        lowerBound: Math.max(0, portfolio * Math.exp(yearReturn - 2 * volatility * Math.sqrt(year || 1)))
      });
    }

    // Risk metrics over confidence levels
    const riskByConfidence = [];
    for (const conf of [85, 90, 95, 99]) {
      const z = zScores[conf] || 1.645;
      const varLoss = portfolio * (timeAdjustedReturn - z * timeAdjustedVol);
      riskByConfidence.push({
        confidence: conf,
        var: Math.max(0, -varLoss)
      });
    }

    return {
      parametric: parametricLoss,
      historical: historicalLoss,
      monteCarlo: monteCarloLoss,
      cvar: cvarValue,
      expectedValue: expectedPortfolioValue,
      expectedReturn: expectedReturn,
      sharpeRatio: sharpeRatio.toFixed(3),
      distributionData,
      scenarioData,
      timeSeriesData,
      riskByConfidence,
      varPercentile,
      maxDrawdown: (((monteCarloLoss / portfolio) * 100).toFixed(2)),
      returnSkew: (expectedReturn / (volatility * 100)).toFixed(3),
      breakevenReturn: ((zScore * timeAdjustedVol) / timeHorizon * 100).toFixed(2)
    };
  }, [portfolio, meanReturn, volatility, confidence, timeHorizon]);

  const selectedVaR = 
    method === 'parametric' ? calculations.parametric :
    method === 'historical' ? calculations.historical :
    calculations.monteCarlo;

  const varPercentage = ((selectedVaR / portfolio) * 100).toFixed(2);

  const comparisonData = [
    { name: 'Parametric', value: calculations.parametric, fill: '#3b82f6' },
    { name: 'Historical', value: calculations.historical, fill: '#06b6d4' },
    { name: 'Monte Carlo', value: calculations.monteCarlo, fill: '#8b5cf6' }
  ];

  const riskGaugeValue = Math.min(100, (parseFloat(varPercentage) * 2));

  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      parameters: {
        portfolio: portfolio,
        meanReturn: meanReturn,
        volatility: volatility,
        confidence: confidence,
        timeHorizon: timeHorizon,
        method: method
      },
      results: {
        parametricVaR: calculations.parametric,
        historicalVaR: calculations.historical,
        monteCarloVaR: calculations.monteCarlo,
        conditionalVaR: calculations.cvar,
        expectedValue: calculations.expectedValue,
        sharpeRatio: calculations.sharpeRatio,
        maxDrawdown: calculations.maxDrawdown
      }
    };

    if (exportFormat === 'json') {
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2)));
      element.setAttribute('download', `var-analysis-${Date.now()}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else if (exportFormat === 'csv') {
      const csv = `VaR Analysis Export\nGenerated: ${new Date().toISOString()}\n\nParameters\nPortfolio Value,$${portfolio.toLocaleString()}\nMean Return,${(meanReturn*100).toFixed(2)}%\nVolatility,${(volatility*100).toFixed(2)}%\nConfidence Level,${confidence}%\nTime Horizon,${timeHorizon} year(s)\n\nResults\nParametric VaR,$${calculations.parametric.toLocaleString()}\nHistorical VaR,$${calculations.historical.toLocaleString()}\nMonte Carlo VaR,$${calculations.monteCarlo.toLocaleString()}\nConditional VaR,$${calculations.cvar.toLocaleString()}\nExpected Portfolio Value,$${calculations.expectedValue.toLocaleString()}\nSharpe Ratio,${calculations.sharpeRatio}`;
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', `var-analysis-${Date.now()}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }, [portfolio, meanReturn, volatility, confidence, timeHorizon, method, calculations, exportFormat]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div style={{
          background: 'rgba(30, 30, 46, 0.95)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ margin: '0 0 4px 0', color: '#a78bfa', fontSize: '12px', fontWeight: 600 }}>
            {payload[0].name}
          </p>
          <p style={{ margin: 0, color: '#f0f9ff', fontSize: '14px', fontWeight: 700 }}>
            ${(payload[0].value / 1000000).toFixed(2)}M
          </p>
        </div>
      );
    }
    return null;
  };

  const TabButton = ({ label, value }) => (
    <button
      onClick={() => setActiveTab(value)}
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        border: activeTab === value ? '2px solid #a78bfa' : '1px solid rgba(139, 92, 246, 0.2)',
        background: activeTab === value ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
        color: activeTab === value ? '#a78bfa' : '#cbd5e1',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: activeTab === value ? 700 : 600,
        transition: 'all 0.3s ease'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#e2e8f0',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '0'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.4) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
        padding: '48px 24px 32px',
        marginBottom: '32px'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#a78bfa',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              ⚡ Institutional Market Risk Analytics
            </span>
          </div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            margin: '0 0 8px 0',
            color: '#f0f9ff',
            background: 'linear-gradient(135deg, #93c5fd 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Value at Risk Engine v2.0
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', fontWeight: 400 }}>
            Advanced portfolio risk analysis with multi-method VaR calculations, scenario analysis, and real-time projections.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1600px', margin: '0 auto', padding: '0 24px 48px' }}>
        
        {/* Primary VaR Display */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '32px',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            {[
              { label: 'Value at Risk', value: `$${selectedVaR.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: `${varPercentage}% of portfolio`, icon: '📊' },
              { label: 'Conditional VaR', value: `$${calculations.cvar.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: 'Expected Shortfall', icon: '⚠️' },
              { label: 'Expected Value', value: `$${calculations.expectedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: `+${calculations.expectedReturn.toFixed(2)}% return`, icon: '📈' },
              { label: 'Sharpe Ratio', value: calculations.sharpeRatio, sub: 'Risk-Adjusted Return', icon: '⭐' }
            ].map((metric, i) => (
              <div key={i} style={{
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)'; }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{metric.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f0f9ff', marginBottom: '4px' }}>
                  {metric.value}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  {metric.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Risk Gauge */}
          <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Risk Level
            </div>
            <div style={{ 
              height: '8px',
              background: 'rgba(255,255,255, 0.05)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                height: '100%',
                width: `${riskGaugeValue}%`,
                background: `linear-gradient(90deg, 
                  ${riskGaugeValue < 30 ? '#10b981' : riskGaugeValue < 60 ? '#f59e0b' : '#ef4444'} 0%, 
                  ${riskGaugeValue < 30 ? '#059669' : riskGaugeValue < 60 ? '#d97706' : '#dc2626'} 100%)`,
                transition: 'width 0.6s ease'
              }} />
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
              <span>Conservative</span>
              <span style={{ color: riskGaugeValue < 30 ? '#10b981' : riskGaugeValue < 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                {riskGaugeValue < 30 ? 'Low Risk' : riskGaugeValue < 60 ? 'Moderate Risk' : 'High Risk'}
              </span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <TabButton label="📊 Overview" value="overview" />
          <TabButton label="📈 Projections" value="projections" />
          <TabButton label="🔄 Methods" value="methods" />
          <TabButton label="⚙️ Controls" value="controls" />
          <TabButton label="💾 Export" value="export" />
        </div>

        {/* Content Tabs */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            {/* Scenario Analysis */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              padding: '24px',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 24px 0' }}>
                📊 Scenario Analysis
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={calculations.scenarioData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <defs>
                    <linearGradient id="bestCase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="baseCase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="stressCase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="crisisCase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(139, 92, 246, 0.15)" vertical={false} />
                  <XAxis 
                    dataKey="scenario" 
                    stroke="#94a3b8" 
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    style={{ fontSize: '12px' }}
                    tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`}
                    width={65}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value) => [`$${(value/1000000).toFixed(2)}M`, 'Portfolio Value']}
                    labelStyle={{ color: '#a78bfa', fontWeight: 600 }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {calculations.scenarioData.map((entry, index) => {
                      let gradId = 'bestCase';
                      if (index === 1) gradId = 'baseCase';
                      if (index === 2) gradId = 'stressCase';
                      if (index === 3) gradId = 'crisisCase';
                      return <Bar key={`scenario-${index}`} dataKey="value" data={[entry]} fill={`url(#${gradId})`} radius={[10, 10, 0, 0]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 16px 0' }}>
                📈 Return Distribution
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={calculations.distributionData} margin={{ top: 10, right: 10, bottom: 30, left: 40 }}>
                  <defs>
                    <linearGradient id="dist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(139, 92, 246, 0.15)" vertical={false} />
                  <XAxis 
                    dataKey="return" 
                    stroke="#94a3b8"
                    style={{ fontSize: '11px' }}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    style={{ fontSize: '10px' }}
                    width={35}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '6px',
                      padding: '8px'
                    }}
                    formatter={(value) => [value.toFixed(4), 'Probability Density']}
                    labelFormatter={(label) => `Return: ${label}%`}
                    labelStyle={{ color: '#a78bfa', fontSize: '11px', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="probability" 
                    stroke="#8b5cf6" 
                    strokeWidth={2.5}
                    fill="url(#dist)" 
                    isAnimationActive={true}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'projections' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            backdropFilter: 'blur(10px)',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 24px 0' }}>
              📈 Portfolio Value Projections
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={calculations.timeSeriesData} margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                <defs>
                  <linearGradient id="upperBound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(139, 92, 246, 0.15)" />
                <XAxis 
                  dataKey="year" 
                  stroke="#94a3b8"
                  label={{ value: 'Years', position: 'insideBottomRight', offset: -10, fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  formatter={(value) => `$${(value/1000000).toFixed(2)}M`}
                />
                <Legend />
                <Area type="monotone" dataKey="upperBound" fill="url(#upperBound)" stroke="none" name="Upper Bound (2σ)" />
                <Line type="monotone" dataKey="expected" stroke="#3b82f6" strokeWidth={3} name="Expected Path" dot={{ fill: '#3b82f6', r: 4 }} />
                <Line type="monotone" dataKey="lowerBound" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Lower Bound (2σ)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'methods' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 16px 0' }}>
                🔄 Method Comparison
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
                  <defs>
                    <linearGradient id="param" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="mc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(139, 92, 246, 0.15)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    style={{ fontSize: '11px' }}
                    tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`}
                    width={50}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '8px',
                      padding: '10px'
                    }}
                    formatter={(value) => `$${(value/1000000).toFixed(2)}M`}
                    labelStyle={{ color: '#a78bfa', fontWeight: 600 }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {comparisonData.map((entry, index) => {
                      let gradId = 'param';
                      if (index === 1) gradId = 'hist';
                      if (index === 2) gradId = 'mc';
                      return <Bar key={`method-${index}`} data={[entry]} dataKey="value" fill={`url(#${gradId})`} radius={[8, 8, 0, 0]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 16px 0' }}>
                📊 VaR by Confidence Level
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={calculations.riskByConfidence} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(139, 92, 246, 0.15)" />
                  <XAxis 
                    dataKey="confidence" 
                    stroke="#94a3b8"
                    label={{ value: 'Confidence %', position: 'insideBottomRight', offset: -10 }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '8px',
                      padding: '10px'
                    }}
                    formatter={(value) => `$${(value/1000000).toFixed(2)}M`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="var" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'controls' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '32px', marginBottom: '32px' }}>
            
            {/* Left - Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Portfolio Setup */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 20px 0' }}>
                  📋 Portfolio Setup
                </h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Portfolio Value
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '10px 12px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      value={portfolio}
                      onChange={(e) => setPortfolio(Number(e.target.value))}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#f0f9ff',
                        fontSize: '14px',
                        fontWeight: 600,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Annual Return</label>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{(meanReturn * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-0.2"
                    max="0.3"
                    step="0.01"
                    value={meanReturn}
                    onChange={(e) => setMeanReturn(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', height: '6px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '3px' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Volatility (σ)</label>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{(volatility * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={volatility}
                    onChange={(e) => setVolatility(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', height: '6px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '3px' }}
                  />
                </div>
              </div>

              {/* Analysis Settings */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 20px 0' }}>
                  ⚙️ Analysis Settings
                </h3>
                
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Confidence Level
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[90, 95, 99, 99.9].map(conf => (
                      <button
                        key={conf}
                        onClick={() => setConfidence(conf)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: confidence === conf ? '2px solid #a78bfa' : '1px solid rgba(139, 92, 246, 0.2)',
                          background: confidence === conf ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 23, 42, 0.4)',
                          color: confidence === conf ? '#a78bfa' : '#cbd5e1',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: confidence === conf ? 700 : 600,
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        {conf}%
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Time Horizon
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '8px',
                      color: '#f0f9ff',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>years</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Methodology
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '8px',
                      color: '#f0f9ff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 600
                    }}
                  >
                    <option value="parametric">Parametric</option>
                    <option value="historical">Historical</option>
                    <option value="monteCarlo">Monte Carlo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right - Summary Stats */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              padding: '24px',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 24px 0' }}>
                📊 Advanced Metrics
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Max Drawdown', value: `${calculations.maxDrawdown}%`, icon: '📉' },
                  { label: 'Return Skew', value: calculations.returnSkew, icon: '📐' },
                  { label: 'Breakeven Return', value: `${calculations.breakevenReturn}%`, icon: '⚖️' },
                  { label: 'VaR Percentile', value: `${calculations.varPercentile} / 10000`, icon: '#️⃣' }
                ].map((metric, i) => (
                  <div key={i} style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid rgba(139, 92, 246, 0.1)'
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{metric.icon}</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {metric.label}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f0f9ff' }}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            padding: '32px',
            backdropFilter: 'blur(10px)',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 24px 0' }}>
              💾 Export Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '8px',
                    color: '#f0f9ff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600
                  }}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <button
                onClick={handleExport}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  color: '#0f172a',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  alignSelf: 'flex-end'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                📥 Download Report
              </button>
            </div>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '12px',
              color: '#cbd5e1',
              lineHeight: '1.6'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#a78bfa' }}>📋 Included in Export:</p>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li>Portfolio parameters and settings</li>
                <li>VaR calculations (all three methods)</li>
                <li>Conditional VaR and Expected Shortfall</li>
                <li>Risk metrics and ratios</li>
                <li>Timestamp and analysis metadata</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          backdropFilter: 'blur(10px)',
          marginBottom: '0'
        }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
            <strong style={{ color: '#a78bfa' }}>⚡ Disclaimer:</strong> This tool provides educational risk analysis. VaR estimates have limitations and assumptions. Not financial advice. Always consult qualified professionals before investment decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
