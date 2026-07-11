import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:5000/api";

function App() {
  const [prices, setPrices] = useState([]);
  const [events, setEvents] = useState([]);
  const [changepoints, setChangepoints] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Controls state
  const [dateRange, setDateRange] = useState('ALL'); // '1Y', '5Y', '10Y', 'ALL'
  const [downsample, setDownsample] = useState('weekly'); // 'weekly', 'monthly', 'daily'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (currentDownsample) => {
    try {
      setError(null);
      
      // Fetch concurrently
      const [pricesRes, eventsRes, cpRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/prices?downsample=${currentDownsample}`),
        fetch(`${API_BASE}/events`),
        fetch(`${API_BASE}/changepoints`),
        fetch(`${API_BASE}/metrics`)
      ]);

      if (!pricesRes.ok || !eventsRes.ok || !cpRes.ok || !metricsRes.ok) {
        throw new Error("One or more API requests failed. Make sure the Flask backend is running on port 5000.");
      }

      const [pricesData, eventsData, cpData, metricsData] = await Promise.all([
        pricesRes.json(),
        eventsRes.json(),
        cpRes.json(),
        metricsRes.json()
      ]);

      setPrices(pricesData);
      setEvents(eventsData);
      setChangepoints(cpData);
      setMetrics(metricsData);
      
      // Auto-select the first event by default
      if (eventsData.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsData[0]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData(downsample);
  }, [downsample]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(downsample);
  };

  // Date Filtering logic
  const getFilteredPrices = () => {
    if (prices.length === 0) return [];
    
    const lastDate = new Date(prices[prices.length - 1].date);
    let cutoffDate = new Date(prices[0].date);

    if (dateRange === '1Y') {
      cutoffDate.setFullYear(lastDate.getFullYear() - 1);
    } else if (dateRange === '5Y') {
      cutoffDate.setFullYear(lastDate.getFullYear() - 5);
    } else if (dateRange === '10Y') {
      cutoffDate.setFullYear(lastDate.getFullYear() - 10);
    }

    const filtered = prices.filter(p => new Date(p.date) >= cutoffDate);
    
    // Inject the change point model fits for visual representation
    return filtered.map(p => {
      const isPostChangePoint = cpResDateMatch(p.date);
      return {
        ...p,
        model_mean: isPostChangePoint ? changepoints?.mu_2 : changepoints?.mu_1
      };
    });
  };

  const cpResDateMatch = (dateStr) => {
    if (!changepoints) return false;
    return dateStr >= changepoints.change_point_date;
  };

  const getFilteredEvents = () => {
    if (categoryFilter === 'ALL') return events;
    return events.filter(e => e.category === categoryFilter);
  };

  const getBadgeClass = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('conflict')) return 'badge-conflict';
    if (cat.includes('shock')) return 'badge-shock';
    if (cat.includes('policy') || cat.includes('opec')) return 'badge-policy';
    return 'badge-sanctions';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>Loading Brent Crude Market Data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px', textAlign: 'center' }}>
        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Connection Error</h2>
        <p style={{ color: '#9ca3af', maxWidth: '480px', marginBottom: '24px' }}>{error}</p>
        <button 
          onClick={handleRefresh}
          className="btn-filter"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#38bdf8', color: '#0b0f19', border: 'none', fontWeight: 600 }}
        >
          <RefreshCw size={18} /> Retry Connection
        </button>
      </div>
    );
  }

  const filteredPrices = getFilteredPrices();
  const filteredEvents = getFilteredEvents();

  // Find price at current selected event date on chart
  const selectedEventPoint = filteredPrices.find(p => p.date === selectedEvent?.date);

  return (
    <div className="glass-container">
      {/* Title Header */}
      <header className="glass-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp color="#38bdf8" size={28} />
            BIRHAN ENERGIES
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '2px' }}>
            Brent Crude Oil Price Change Point Analysis & Event Studies
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleRefresh} 
            className="btn-filter" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> 
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </header>

      {/* KPI Stats Bar */}
      {metrics && (
        <section className="kpi-grid">
          <div className="glass-card kpi-card">
            <span className="kpi-label">Average price (All-time)</span>
            <div className="kpi-value">${metrics.average_price}</div>
            <span className="kpi-subtext">USD per barrel</span>
          </div>
          <div className="glass-card kpi-card">
            <span className="kpi-label">Peak Price (Jul 2008)</span>
            <div className="kpi-value">${metrics.max_price}</div>
            <span className="kpi-subtext">Commodity bubble spike</span>
          </div>
          <div className="glass-card kpi-card">
            <span className="kpi-label">Minimum Price (Dec 1998)</span>
            <div className="kpi-value">${metrics.min_price}</div>
            <span className="kpi-subtext">Asian Financial Crisis low</span>
          </div>
          <div className="glass-card kpi-card">
            <span className="kpi-label">Annualized Volatility</span>
            <div className="kpi-value" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={20} />
              {metrics.latest_volatility_annualized}%
            </div>
            <span className="kpi-subtext">Last 30 trading days</span>
          </div>
        </section>
      )}

      {/* Main Charts and Events Layout */}
      <main className="main-grid">
        
        {/* Left Column: Charts and Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Chart Card */}
          <div className="glass-card animate-slide-up" style={{ paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historical Brent Crude Price & Bayesian Fit</h3>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Plotting historical regimes and political/economic shocks</p>
              </div>
              
              {/* Date Filters & Downsampling controls */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="filter-group">
                  <button onClick={() => setDateRange('1Y')} className={`btn-filter ${dateRange === '1Y' ? 'active' : ''}`}>1Y</button>
                  <button onClick={() => setDateRange('5Y')} className={`btn-filter ${dateRange === '5Y' ? 'active' : ''}`}>5Y</button>
                  <button onClick={() => setDateRange('10Y')} className={`btn-filter ${dateRange === '10Y' ? 'active' : ''}`}>10Y</button>
                  <button onClick={() => setDateRange('ALL')} className={`btn-filter ${dateRange === 'ALL' ? 'active' : ''}`}>ALL</button>
                </div>
                
                <select 
                  value={downsample} 
                  onChange={(e) => setDownsample(e.target.value)} 
                  className="select-control"
                >
                  <option value="daily">Daily Resolution</option>
                  <option value="weekly">Weekly Avg (Fast)</option>
                  <option value="monthly">Monthly Avg (Instant)</option>
                </select>
              </div>
            </div>

            {/* Price Chart */}
            <div style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredPrices} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#4b5563" 
                    tickFormatter={(tick) => tick.substring(0, 7)}
                    style={{ fontSize: '0.75rem' }} 
                  />
                  <YAxis 
                    stroke="#4b5563" 
                    domain={['auto', 'auto']}
                    style={{ fontSize: '0.75rem' }} 
                  />
                  <Tooltip />
                  
                  {/* Price Area */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#38bdf8" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    name="Brent Crude Price ($)"
                  />
                  
                  {/* Change Point Model Mean (Dashed step-like line) */}
                  {changepoints && (
                    <Line 
                      type="step" 
                      dataKey="model_mean" 
                      stroke="#f59e0b" 
                      strokeWidth={2.5}
                      strokeDasharray="5 5" 
                      dot={false}
                      name="Bayesian Mean Fit ($)"
                    />
                  )}

                  {/* Bayesian Switch Point Vertical Reference Line */}
                  {changepoints && filteredPrices.some(p => p.date >= changepoints.change_point_date) && (
                    <ReferenceLine 
                      x={changepoints.change_point_date} 
                      stroke="#f59e0b" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{ 
                        value: "Bayesian Switch Point (2005)", 
                        fill: "#fbbf24", 
                        fontSize: 10, 
                        position: "insideTopLeft",
                        offset: 10
                      }} 
                    />
                  )}

                  {/* Highlight Selected Event date */}
                  {selectedEvent && filteredPrices.some(p => p.date === selectedEvent.date) && (
                    <ReferenceLine 
                      x={selectedEvent.date} 
                      stroke="#f43f5e" 
                      strokeWidth={1.5}
                      label={{ 
                        value: selectedEvent.event, 
                        fill: "#f43f5e", 
                        fontSize: 9, 
                        position: "insideTopRight" 
                      }} 
                    />
                  )}

                  {/* Highlight dot on selected event */}
                  {selectedEventPoint && (
                    <ReferenceDot 
                      x={selectedEventPoint.date} 
                      y={selectedEventPoint.price} 
                      r={6} 
                      fill="#f43f5e" 
                      stroke="#ffffff" 
                      strokeWidth={2} 
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', padding: '8px 16px 0', fontSize: '0.75rem', color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '4px', background: '#38bdf8', display: 'inline-block' }} />
                Daily/Weekly Brent Crude Prices
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '4px', background: '#f59e0b', borderStyle: 'dashed', borderWidth: '1px', display: 'inline-block' }} />
                Bayesian Mean Fit (Regime 1: $21.50 vs Regime 2: $75.69)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '4px', background: '#f43f5e', display: 'inline-block' }} />
                Shock / Event Highlight
              </div>
            </div>
          </div>

          {/* Bayesian Model Insight Card */}
          {changepoints && (
            <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info color="#38bdf8" size={24} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bayesian Model Inference Insights</h3>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <p style={{ fontSize: '0.9rem', color: '#d1d5db', lineHeight: '1.6' }}>
                    {changepoints.description}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', minWidth: '220px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase' }}>Regime 1 Mean</span>
                    <strong style={{ fontSize: '1.25rem', color: '#38bdf8' }}>${changepoints.mu_1.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase' }}>Regime 2 Mean</span>
                    <strong style={{ fontSize: '1.25rem', color: '#f87171' }}>${changepoints.mu_2.toFixed(2)}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase' }}>Mean Shift Impact</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      +${changepoints.shift_amount.toFixed(2)} (+{changepoints.shift_pct.toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Events and Selection Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Selected Event Details Card */}
          {selectedEvent && (
            <div className="glass-card animate-slide-up" style={{ borderLeft: '4px solid #f43f5e', background: 'rgba(244, 63, 94, 0.05)' }}>
              <span className={`event-badge ${getBadgeClass(selectedEvent.category)}`} style={{ marginBottom: '10px', display: 'inline-block' }}>
                {selectedEvent.category}
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{selectedEvent.event}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '12px' }}>
                <Calendar size={12} />
                {new Date(selectedEvent.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: '1.5', marginBottom: '16px' }}>
                {selectedEvent.description}
              </p>
              
              {/* Event Impact Stats */}
              <div style={{ background: 'rgba(11, 15, 25, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  Quantified 30-Day Event Shock Window
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>Price 30d Before</span>
                    <strong style={{ fontSize: '1rem', color: '#ffffff' }}>${selectedEvent.price_before_30d.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>Price 30d After</span>
                    <strong style={{ fontSize: '1rem', color: '#ffffff' }}>${selectedEvent.price_after_30d.toFixed(2)}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Price Shock Shift</span>
                    <span className={`event-impact-val ${selectedEvent.price_change >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.95rem' }}>
                      {selectedEvent.price_change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      ${Math.abs(selectedEvent.price_change).toFixed(2)} ({selectedEvent.price_change_pct >= 0 ? '+' : ''}{selectedEvent.price_change_pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historical Events List Card */}
          <div className="glass-card animate-slide-up" style={{ flex: '1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Shock Event Timeline</h3>
              
              {/* Category Filter Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={14} color="#9ca3af" />
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)} 
                  className="select-control"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="Geopolitical Conflict">Geopolitical</option>
                  <option value="Economic Shock">Economic Shocks</option>
                  <option value="OPEC Policy">OPEC Policies</option>
                  <option value="Sanctions">Sanctions</option>
                </select>
              </div>
            </div>

            {/* Events items list */}
            <div className="events-panel">
              {filteredEvents.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedEvent(item)}
                  className={`event-item ${selectedEvent?.date === item.date ? 'selected' : ''}`}
                >
                  <div className="event-header">
                    <span className="event-title">{item.event}</span>
                    <span className={`event-badge ${getBadgeClass(item.category)}`}>
                      {item.category.split(' ')[0]}
                    </span>
                  </div>
                  <div className="event-date">
                    {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Price Shock:</span>
                    <span className={`event-impact-val ${item.price_change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {item.price_change >= 0 ? '+' : ''}{item.price_change_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '16px', color: '#4b5563', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '24px' }}>
        &copy; {new Date().getFullYear()} Birhan Energies Consultancy. All rights reserved. Data sources: EIA & Brent Historical Datasets.
      </footer>
    </div>
  );
}

export default App;
