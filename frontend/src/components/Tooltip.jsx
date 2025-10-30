import { useState } from 'react';
import './Tooltip.css';

/**
 * Componente Tooltip para mostrar información al pasar el cursor
 * Sin crear nuevas secciones - solo hover info
 */
const Tooltip = ({ children, content, position = 'auto' }) => {
  const [visible, setVisible] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);

  const handleMouseEnter = (e) => {
    setVisible(true);
    
    if (position === 'auto') {
      const rect = e.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const tooltipWidth = 300;
      const tooltipHeight = 250;
      const margin = 16;
      
      const spaceRight = viewportWidth - rect.right;
      const spaceLeft = rect.left;
      const spaceTop = rect.top;
      const spaceBottom = viewportHeight - rect.bottom;
      
      // Decidir la mejor posición
      if (spaceRight >= tooltipWidth + margin) {
        setCalculatedPosition('right');
      } else if (spaceLeft >= tooltipWidth + margin) {
        setCalculatedPosition('left');
      } else if (spaceTop >= tooltipHeight + margin) {
        setCalculatedPosition('top');
      } else if (spaceBottom >= tooltipHeight + margin) {
        setCalculatedPosition('bottom');
      } else {
        // Usar el lado con más espacio
        const maxSpace = Math.max(spaceRight, spaceLeft, spaceTop, spaceBottom);
        if (maxSpace === spaceRight) setCalculatedPosition('right');
        else if (maxSpace === spaceLeft) setCalculatedPosition('left');
        else if (maxSpace === spaceTop) setCalculatedPosition('top');
        else setCalculatedPosition('bottom');
      }
    } else {
      setCalculatedPosition(position);
    }
  };

  // Si no hay contenido, solo devolver los children sin wrapper
  if (!content) return <>{children}</>;

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`tooltip-content tooltip-${calculatedPosition}`}>
          {typeof content === 'string' ? (
            <div>{content}</div>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
