import { useState } from 'react';
import { useDesktopCapture } from '../hooks/useDesktopCapture';

/**
 * Botón de captura de pantalla para móvil
 * Solo se muestra en vista móvil (windowWidth <= 960)
 * Captura la versión desktop del contenido para auditoría
 */
export const DesktopCaptureButton = ({ 
  isMobile, 
  contentRef, 
  sectionName, 
  predioCode = 'unknown',
  buttonStyle = {},
  onSuccess = null,
  onError = null
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const { captureDesktopVersion } = useDesktopCapture();

  const handleCapture = async () => {
    if (!contentRef?.current) {
      const error = new Error('Contenido no disponible para capturar');
      console.error(error);
      onError?.(error);
      return;
    }

    setIsCapturing(true);
    try {
      await captureDesktopVersion(
        contentRef.current,
        sectionName,
        predioCode
      );
      onSuccess?.('Captura completada y descargada');
    } catch (error) {
      console.error('Error en captura:', error);
      onError?.(error);
      alert(`Error: ${error.message}. Por favor intenta nuevamente.`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Solo mostrar en móvil
  if (!isMobile) {
    return null;
  }

  return (
    <button
      onClick={handleCapture}
      disabled={isCapturing}
      aria-label={`Capturar ${sectionName} en versión desktop`}
      title={`Descargar captura de pantalla en versión desktop para auditoría`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: isCapturing 
          ? '#cbd5e1' 
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        cursor: isCapturing ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        boxShadow: isCapturing 
          ? 'none' 
          : '0 4px 12px rgba(37, 99, 235, 0.3)',
        opacity: isCapturing ? 0.7 : 1,
        userSelect: 'none',
        ...buttonStyle
      }}
      onMouseEnter={(e) => {
        if (!isCapturing) {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isCapturing) {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
        }
      }}
    >
      {/* Icono de cámara */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      <span>{isCapturing ? 'Capturando...' : 'Capturar'}</span>
    </button>
  );
};

export default DesktopCaptureButton;
