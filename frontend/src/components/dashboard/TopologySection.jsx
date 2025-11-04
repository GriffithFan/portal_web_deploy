import SimpleGraph from '../SimpleGraph';

/**
 * Componente para mostrar la sección de topología de red
 */
export const TopologySection = ({ topology, devices, isMobile }) => {
  // Renderizado móvil con scroll horizontal
  if (isMobile) {
    return (
      <div>
        <h2 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
          Topología
        </h2>
        {topology?.nodes && topology.nodes.length > 0 ? (
          <div className="mobile-topology-graph-wrapper">
            <div className="mobile-topology-graph" role="region" aria-label="Topología - gráfico desplazable">
              <div className="mobile-topology-graph-inner">
                <SimpleGraph graph={topology} devices={devices} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px', color: '#57606a' }}>
            No hay datos de topología para este predio.
          </div>
        )}
      </div>
    );
  }

  // Renderizado desktop
  return (
    <>
      <h2 style={{ 
        margin: '0 0 20px 0', 
        color: '#1e293b', 
        fontSize: '20px', 
        fontWeight: '600',
        borderBottom: '2px solid #cbd5e1',
        paddingBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {topology?.nodes && topology.nodes.length > 0 && (
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#047857',
              background: '#d1fae5',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 4px rgba(16, 185, 129, 0.6)'
              }}></span>
              {topology.nodes.length} Dispositivo{topology.nodes.length !== 1 ? 's' : ''} en Línea
            </span>
          )}
          <span>Topología</span>
        </div>
      </h2>
      {topology?.nodes && topology.nodes.length > 0 ? (
        <SimpleGraph graph={topology} devices={devices} />
      ) : (
        <div style={{ padding: '12px', color: '#57606a' }}>
          No hay datos de topología para este predio. El backend intentará construir una si hay datos de conexión.
        </div>
      )}
    </>
  );
};

export default TopologySection;
