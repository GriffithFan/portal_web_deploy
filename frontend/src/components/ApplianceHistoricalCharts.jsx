import React, { useState, useEffect } from 'react';

const ApplianceHistoricalCharts = ({ networkId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ connectivity: [], uplinkUsage: [] });
  const [timespan, setTimespan] = useState(86400);

  useEffect(() => {
    if (!networkId) return;
    
    const fetchHistorical = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/networks/${networkId}/appliance/historical?timespan=${timespan}&resolution=300`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const result = await response.json();
          console.log('Datos historicos recibidos:', result);
          
          // Normalizar timestamps: agregar 'ts' si no existe
          if (result.connectivity) {
            result.connectivity = result.connectivity.map(point => ({
              ...point,
              ts: point.ts || point.startTime || point.startTs || point.endTime
            }));
          }
          
          if (result.uplinkUsage) {
            result.uplinkUsage = result.uplinkUsage.map(point => ({
              ...point,
              ts: point.ts || point.startTime || point.endTime
            }));
          }
          
          setData(result);
        } else {
          console.error('Error en respuesta:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error cargando datos historicos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();
  }, [networkId, timespan]);

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderConnectivityChart = () => {
    if (!data.connectivity || data.connectivity.length === 0) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          Sin datos de conectividad disponibles
        </div>
      );
    }

    const points = data.connectivity;
    const chartHeight = 60;
    
    return (
      <div style={{ position: 'relative', marginTop: '12px' }}>
        <svg width="100%" height={chartHeight} viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="connectivityGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00d084" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00d084" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          
          {/* Área bajo la línea */}
          <path
            d={`${points.map((point, idx) => {
              const x = (idx / Math.max(points.length - 1, 1)) * 100;
              const lossPercent = point.lossPercent || point.loss || 0;
              const y = lossPercent > 0 ? chartHeight - 5 : 5;
              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L 100 ${chartHeight} L 0 ${chartHeight} Z`}
            fill="url(#connectivityGradient)"
          />
          
          {/* Línea continua de conectividad */}
          <path
            d={points.map((point, idx) => {
              const x = (idx / Math.max(points.length - 1, 1)) * 100;
              const lossPercent = point.lossPercent || point.loss || 0;
              const y = lossPercent > 0 ? chartHeight - 5 : 5;
              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#00d084"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#6b7280',
          marginTop: '8px',
          fontWeight: '500'
        }}>
          {[0, 20, 40, 60, 80, 100].map(pct => {
            const idx = Math.floor((points.length - 1) * pct / 100);
            const point = points[idx];
            if (!point) return <span key={pct}></span>;
            const timestamp = point.ts || point.startTs || point.timestamp || point.time;
            const formatted = formatTimestamp(timestamp);
            return (
              <span key={pct} style={{ minWidth: '40px', textAlign: 'center' }}>
                {formatted || ''}
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
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          Sin datos de uso de uplinks disponibles
        </div>
      );
    }

    const chartHeight = 200;
    const chartMarginTop = 10;
    const chartMarginBottom = 10;
    const actualChartHeight = chartHeight - chartMarginTop - chartMarginBottom;
    const points = data.uplinkUsage;
    
    // Calcular valores máximos en MB/s
    const intervalSeconds = 300; // 5 minutos
    
    // Procesar byInterface que puede ser array u objeto
    const maxReceivedMbps = Math.max(...points.flatMap(p => {
      const interfaces = Array.isArray(p.byInterface) ? p.byInterface : Object.values(p.byInterface || {});
      return interfaces.map(i => (i.received || 0) / intervalSeconds / 1048576);
    }), 0.1);
    
    const formatMbps = (mbps) => {
      if (mbps >= 1000) return `${Math.round(mbps / 1000)} Gb/s`;
      return `${Math.round(mbps)} Mb/s`;
    };

    // Calcular escala del eje Y (redondear hacia arriba a un número bonito)
    const maxScale = Math.ceil(maxReceivedMbps / 20) * 20;
    const gridLines = 5;
    const gridStep = maxScale / gridLines;

    // Agrupar datos por interfaz
    const wanInterfaces = {};
    points.forEach(p => {
      const interfaces = Array.isArray(p.byInterface) ? p.byInterface : [];
      interfaces.forEach(ifaceData => {
        const ifaceName = ifaceData.interface || 'unknown';
        if (!wanInterfaces[ifaceName]) wanInterfaces[ifaceName] = [];
        const receivedMbps = (ifaceData.received || 0) / intervalSeconds / 1048576;
        wanInterfaces[ifaceName].push({
          ts: p.ts,
          received: receivedMbps
        });
      });
    });

    // Color celeste brillante como Meraki original
    const colors = {
      wan1: '#00bcd4',  // Celeste brillante Material Design
      wan2: '#00bcd4',  // Celeste brillante Material Design
      cellular: '#ffc107'  // Amarillo
    };

    return (
      <div style={{ position: 'relative', marginTop: '20px' }}>
        {/* Leyenda - más visible */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '16px',
          fontSize: '12px',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          {Object.keys(wanInterfaces).map(iface => {
            // Formatear nombre de interfaz para mostrar
            let displayName = iface;
            if (iface.toLowerCase().startsWith('wan')) {
              displayName = iface.toUpperCase().replace('WAN', 'WAN ');
            } else {
              displayName = iface.charAt(0).toUpperCase() + iface.slice(1);
            }
            
            return (
              <div key={iface} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  background: colors[iface.toLowerCase()] || '#64748b',
                  borderRadius: '3px',
                  border: '1px solid rgba(0,0,0,0.1)'
                }} />
                <span style={{ 
                  color: '#374151', 
                  textTransform: 'uppercase', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  letterSpacing: '0.5px' 
                }}>
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Gráfica con grid */}
        <div style={{ position: 'relative' }}>
          {/* Etiquetas del eje Y */}
          <div style={{
            position: 'absolute',
            left: '-55px',
            top: chartMarginTop,
            height: actualChartHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#6b7280',
            textAlign: 'right',
            width: '50px',
            fontWeight: '500'
          }}>
            {Array.from({ length: gridLines + 1 }).map((_, i) => (
              <span key={i} style={{ transform: 'translateY(-50%)' }}>
                {formatMbps(maxScale - (i * gridStep))}
              </span>
            ))}
          </div>

          <svg width="100%" height={chartHeight} viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
              {Object.keys(wanInterfaces).map(iface => (
                <linearGradient key={iface} id={`gradient-${iface}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={colors[iface.toLowerCase()] || '#64748b'} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={colors[iface.toLowerCase()] || '#64748b'} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>
            
            {/* Grid lines horizontales */}
            {Array.from({ length: gridLines + 1 }).map((_, i) => {
              const y = chartMarginTop + (i * actualChartHeight / gridLines);
              return (
                <line
                  key={i}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.3"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            
            {/* Líneas de datos */}
            {Object.entries(wanInterfaces).map(([iface, ifacePoints]) => {
              const pathData = ifacePoints.map((point, idx) => {
                const x = (idx / Math.max(ifacePoints.length - 1, 1)) * 100;
                const yValue = chartMarginTop + actualChartHeight - ((point.received / maxScale) * actualChartHeight);
                return `${idx === 0 ? 'M' : 'L'} ${x} ${yValue}`;
              }).join(' ');

              const fillPath = `${pathData} L 100 ${chartHeight - chartMarginBottom} L 0 ${chartHeight - chartMarginBottom} Z`;

              return (
                <g key={iface}>
                  {/* Área sombreada */}
                  <path
                    d={fillPath}
                    fill={`url(#gradient-${iface})`}
                  />
                  {/* Línea */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={colors[iface.toLowerCase()] || '#64748b'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>

          {/* Etiquetas del eje X - Tiempo */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '8px',
            fontWeight: '500'
          }}>
            {[0, 16, 33, 50, 66, 83, 100].map(pct => {
              const idx = Math.floor((points.length - 1) * pct / 100);
              const point = points[idx];
              if (!point) return <span key={pct} style={{ minWidth: '40px' }}></span>;
              const formatted = formatTimestamp(point.ts);
              return (
                <span key={pct} style={{ minWidth: '40px', textAlign: 'center' }}>
                  {formatted || ''}
                </span>
              );
            })}
          </div>
        </div>

        {/* Max value display */}
        <div style={{
          fontSize: '10px',
          color: '#9ca3af',
          marginTop: '6px',
          textAlign: 'right'
        }}>
          Max: {formatMbps(maxReceivedMbps)}
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
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
          Historical device data
        </h3>
        <select
          value={timespan}
          onChange={(e) => setTimespan(parseInt(e.target.value))}
          style={{
            padding: '5px 10px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            fontSize: '12px',
            color: '#4b5563',
            background: 'white',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          <option value={3600}>Last hour</option>
          <option value={86400}>Last day</option>
          <option value={604800}>Last week</option>
        </select>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '6px',
        padding: '20px',
        marginBottom: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
          Connectivity
        </h4>
        {renderConnectivityChart()}
      </div>

      <div style={{
        background: 'white',
        borderRadius: '6px',
        padding: '20px 20px 20px 60px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
          Client usage
        </h4>
        {renderUplinkUsageChart()}
      </div>
    </div>
  );
};

export default ApplianceHistoricalCharts;
