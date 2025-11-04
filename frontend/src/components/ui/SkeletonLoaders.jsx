// Componentes de Skeleton Loaders para estados de carga
import './SkeletonLoaders.css';

/**
 * Skeleton básico - bloque animado
 */
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width,
      height,
      borderRadius,
    }}
  />
);

/**
 * Skeleton para texto - múltiples líneas
 */
export const SkeletonText = ({ lines = 3, width = '100%' }) => (
  <div style={{ width }}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        height="16px"
        width={index === lines - 1 ? '70%' : '100%'}
        className="skeleton-text-line"
      />
    ))}
  </div>
);

/**
 * Skeleton para card/tarjeta
 */
export const SkeletonCard = ({ height = '200px' }) => (
  <div className="skeleton-card" style={{ height }}>
    <Skeleton height="24px" width="60%" borderRadius="6px" />
    <div style={{ marginTop: '16px' }}>
      <SkeletonText lines={3} />
    </div>
    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
      <Skeleton height="32px" width="80px" borderRadius="16px" />
      <Skeleton height="32px" width="100px" borderRadius="16px" />
    </div>
  </div>
);

/**
 * Skeleton para tabla
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="skeleton-table">
    {/* Header */}
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} height="20px" width="80%" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="skeleton-table-row">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} height="16px" width="90%" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Skeleton para dispositivo/switch
 */
export const SkeletonDevice = () => (
  <div className="skeleton-device">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Skeleton width="48px" height="48px" borderRadius="8px" />
      <div style={{ flex: 1 }}>
        <Skeleton height="20px" width="60%" />
        <Skeleton height="14px" width="40%" style={{ marginTop: '8px' }} />
      </div>
    </div>
    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} width="60px" height="24px" borderRadius="4px" />
      ))}
    </div>
  </div>
);

/**
 * Skeleton para lista de dispositivos
 */
export const SkeletonDeviceList = ({ count = 3 }) => (
  <div className="skeleton-device-list">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonDevice key={index} />
    ))}
  </div>
);

/**
 * Skeleton para gráfico
 */
export const SkeletonChart = ({ height = '300px' }) => (
  <div className="skeleton-chart" style={{ height }}>
    <Skeleton height="24px" width="40%" style={{ marginBottom: '16px' }} />
    <div style={{ 
      height: 'calc(100% - 40px)', 
      display: 'flex', 
      alignItems: 'flex-end', 
      gap: '8px' 
    }}>
      {Array.from({ length: 12 }).map((_, index) => {
        const randomHeight = Math.random() * 60 + 40;
        return (
          <Skeleton 
            key={index} 
            width="100%" 
            height={`${randomHeight}%`} 
            borderRadius="4px 4px 0 0"
          />
        );
      })}
    </div>
  </div>
);

/**
 * Skeleton para topología/grafo
 */
export const SkeletonTopology = () => (
  <div className="skeleton-topology">
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
      {/* Nodo central */}
      <div style={{ position: 'relative' }}>
        <Skeleton width="80px" height="80px" borderRadius="50%" />
        <Skeleton width="60px" height="16px" style={{ marginTop: '8px', marginLeft: '10px' }} />
      </div>
      
      {/* Nodos laterales */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} style={{ position: 'relative' }}>
          <Skeleton width="60px" height="60px" borderRadius="50%" />
          <Skeleton width="50px" height="14px" style={{ marginTop: '8px', marginLeft: '5px' }} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton para dashboard completo
 */
export const SkeletonDashboard = () => (
  <div className="skeleton-dashboard">
    <div style={{ marginBottom: '24px' }}>
      <Skeleton height="40px" width="300px" borderRadius="8px" />
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      <SkeletonCard height="180px" />
      <SkeletonCard height="180px" />
      <SkeletonCard height="180px" />
    </div>
    
    <div style={{ marginTop: '32px' }}>
      <SkeletonTable rows={5} columns={5} />
    </div>
  </div>
);

/**
 * Skeleton para badge/chip
 */
export const SkeletonBadge = ({ width = '60px' }) => (
  <Skeleton width={width} height="24px" borderRadius="12px" />
);

/**
 * Skeleton para métricas (números grandes)
 */
export const SkeletonMetric = () => (
  <div className="skeleton-metric">
    <Skeleton height="14px" width="80px" style={{ marginBottom: '8px' }} />
    <Skeleton height="32px" width="120px" />
  </div>
);

/**
 * Skeleton para grid de métricas
 */
export const SkeletonMetricsGrid = ({ columns = 4 }) => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, 
    gap: '16px' 
  }}>
    {Array.from({ length: columns }).map((_, index) => (
      <SkeletonMetric key={index} />
    ))}
  </div>
);
