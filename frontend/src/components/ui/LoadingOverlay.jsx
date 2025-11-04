// Componente de overlay de carga global
import './LoadingOverlay.css';

/**
 * LoadingOverlay - Overlay de pantalla completa con spinner
 * 
 * @param {boolean} isLoading - Mostrar u ocultar overlay
 * @param {string} message - Mensaje opcional
 * @param {string} variant - 'light' | 'dark' | 'blur'
 */
export const LoadingOverlay = ({ 
  isLoading = false, 
  message = 'Cargando...', 
  variant = 'light' 
}) => {
  if (!isLoading) return null;

  return (
    <div className={`loading-overlay loading-overlay--${variant} animate-fadeIn`}>
      <div className="loading-content">
        <div className="loading-spinner" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

/**
 * LoadingSpinner - Spinner reutilizable sin overlay
 * 
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} color - Color del spinner (CSS color)
 */
export const LoadingSpinner = ({ size = 'md', color = '#3b82f6' }) => {
  const sizes = {
    sm: '20px',
    md: '40px',
    lg: '60px'
  };

  return (
    <div 
      className="loading-spinner"
      style={{
        width: sizes[size],
        height: sizes[size],
        borderColor: '#e5e7eb',
        borderTopColor: color
      }}
    />
  );
};

/**
 * InlineLoader - Loader pequeño para botones o texto
 */
export const InlineLoader = ({ text = 'Cargando' }) => (
  <span className="inline-loader">
    <LoadingSpinner size="sm" />
    <span style={{ marginLeft: '8px' }}>{text}</span>
  </span>
);

/**
 * ProgressBar - Barra de progreso animada
 * 
 * @param {number} progress - Progreso de 0 a 100
 * @param {string} color - Color de la barra
 * @param {boolean} indeterminate - Modo indeterminado (sin porcentaje)
 */
export const ProgressBar = ({ 
  progress = 0, 
  color = '#3b82f6', 
  indeterminate = false,
  showPercentage = false 
}) => (
  <div className="progress-bar-container">
    <div className="progress-bar-track">
      <div 
        className={`progress-bar-fill ${indeterminate ? 'progress-bar-fill--indeterminate' : ''}`}
        style={{
          width: indeterminate ? '30%' : `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color
        }}
      />
    </div>
    {showPercentage && !indeterminate && (
      <span className="progress-percentage">{Math.round(progress)}%</span>
    )}
  </div>
);

/**
 * PulsingDot - Punto pulsante para indicar actividad
 * 
 * @param {string} color - Color del dot
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
export const PulsingDot = ({ color = '#3b82f6', size = 'md' }) => {
  const sizes = {
    sm: '8px',
    md: '12px',
    lg: '16px'
  };

  return (
    <span 
      className="pulsing-dot"
      style={{
        width: sizes[size],
        height: sizes[size],
        backgroundColor: color
      }}
    />
  );
};

export default LoadingOverlay;
