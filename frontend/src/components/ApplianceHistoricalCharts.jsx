import React, { useState, useEffect } from 'react';

const ApplianceHistoricalCharts = ({ networkId, token }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ connectivity: [], uplinkUsage: [] });
  const [timespan, setTimespan] = useState(86400);

  useEffect(() => {
    if (!networkId) return;
    
    const fetchHistorical = async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(
          `/api/networks/${networkId}/appliance/historical?timespan=${timespan}&resolution=300`,
          { headers }
        );
        
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error cargando datos historicos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();
  }, [networkId, token, timespan]);

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderConnectivityChart = () => {
    if (!data.connectivity || data.connectivity.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
          Sin datos de conectividad disponibles
        </div>
      );
    }

    const points = data.connectivity;
    const chartHeight = 60;
    const chartWidth = 100;
    const maxLatency = Math.max(...points.map(p => p.latencyMs || 0), 1);
    
    return (
      <div style={{ position: 'relative', height: chartHeight + 40, marginBottom: '20px' }}>
        <svg width="100%" height={chartHeight} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="connectivityGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {points.map((point, idx) => {
            const x = (idx / (points.length - 1)) * chartWidth + '%';
            const isConnected = point.lossPercent === 0 || point.lossPercent == null;
            const y = isConnected ? 5 : chartHeight - 5;
            
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="2"
                fill={isConnected ? '#10b981' : '#ef4444'}
                opacity="0.8"
              />
            );
          })}
          
          <line
            x1="0"
            y1={chartHeight / 2}
            x2="100%"
            y2={chartHeight / 2}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '8px'
        }}>
          {[0, 25, 50, 75, 100].map(pct => {
            const idx = Math.floor((points.length - 1) * pct / 100);
            const point = points[idx];
            if (!point) return null;
            return (
              <span key={pct}>
                {formatTimestamp(point.ts || point.startTs)}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUplinkUsageChart = () => {
    if (!data.uplinkUsage || data.uplinkUsage.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
          Sin datos de uso de uplinks disponibles
        </div>
      );
    }

    const chartHeight = 120;
    const points = data.uplinkUsage;
    
    const maxSent = Math.max(...points.flatMap(p => 
      Object.values(p.byInterface || {}).map(i => i.sent || 0)
    ), 1);
    const maxReceived = Math.max(...points.flatMap(p => 
      Object.values(p.byInterface || {}).map(i => i.received || 0)
    ), 1);
    const maxValue = Math.max(maxSent, maxReceived);
    
    const formatBytes = (bytes) => {
      if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
      if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${bytes} B`;
    };

    const wanInterfaces = {};
    points.forEach(p => {
      Object.keys(p.byInterface || {}).forEach(iface => {
        if (!wanInterfaces[iface]) wanInterfaces[iface] = [];
        wanInterfaces[iface].push({
          ts: p.ts,
          sent: p.byInterface[iface].sent || 0,
          received: p.byInterface[iface].received || 0
        });
      });
    });

    const colors = {
      wan1: '#3b82f6',
      wan2: '#8b5cf6',
      cellular: '#f59e0b'
    };

    return (
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '12px',
          fontSize: '11px',
          flexWrap: 'wrap'
        }}>
          {Object.keys(wanInterfaces).map(iface => (
            <div key={iface} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: colors[iface.toLowerCase()] || '#64748b'
              }} />
              <span style={{ color: '#475569', textTransform: 'uppercase', fontWeight: '600' }}>
                {iface}
              </span>
            </div>
          ))}
        </div>

        <svg width="100%" height={chartHeight} style={{ display: 'block' }}>
          <defs>
            {Object.keys(wanInterfaces).map(iface => (
              <linearGradient key={iface} id={`gradient-${iface}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colors[iface.toLowerCase()] || '#64748b'} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors[iface.toLowerCase()] || '#64748b'} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          
          {Object.entries(wanInterfaces).map(([iface, ifacePoints]) => {
            const pathData = ifacePoints.map((point, idx) => {
              const x = (idx / (ifacePoints.length - 1)) * 100;
              const y = chartHeight - (point.received / maxValue) * (chartHeight - 10);
              return `${idx === 0 ? 'M' : 'L'} ${x}% ${y}`;
            }).join(' ');

            const fillPath = `${pathData} L 100% ${chartHeight} L 0 ${chartHeight} Z`;

            return (
              <g key={iface}>
                <path
                  d={fillPath}
                  fill={`url(#gradient-${iface})`}
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke={colors[iface.toLowerCase()] || '#64748b'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          
          <line
            x1="0"
            y1={chartHeight / 2}
            x2="100%"
            y2={chartHeight / 2}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        </svg>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '8px'
        }}>
          {[0, 25, 50, 75, 100].map(pct => {
            const idx = Math.floor((points.length - 1) * pct / 100);
            const point = points[idx];
            if (!point) return null;
            return (
              <span key={pct}>
                {formatTimestamp(point.ts)}
              </span>
            );
          })}
        </div>

        <div style={{
          fontSize: '11px',
          color: '#64748b',
          marginTop: '8px',
          textAlign: 'right'
        }}>
          Max: {formatBytes(maxValue)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" />
        <div style={{ marginTop: '12px', color: '#64748b' }}>Cargando datos historicos...</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
          Historical device data
        </h3>
        <select
          value={timespan}
          onChange={(e) => setTimespan(parseInt(e.target.value))}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#475569',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          <option value={3600}>Last hour</option>
          <option value={86400}>Last day</option>
          <option value={604800}>Last week</option>
        </select>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
          Connectivity
        </h4>
        {renderConnectivityChart()}
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
          Client usage
        </h4>
        {renderUplinkUsageChart()}
      </div>
    </div>
  );
};

export default ApplianceHistoricalCharts;
