import { useEffect, useState } from 'react';
import './Tooltip.css';

/**
 * Tooltip mejorado: mantiene el comportamiento por hover en desktop,
 * y añade soporte por click/tap en dispositivos táctiles. Además permite
 * que en móviles el tooltip se muestre como modal persistent (cerrable).
 *
 * Props:
 *  - children, content
 *  - position: 'auto'|'top'|'bottom'|'left'|'right'
 *  - modalOnMobile: boolean (por defecto true) => si en mobile abrir como modal
 */
const Tooltip = ({ children, content, position = 'auto', modalOnMobile = true }) => {
  // (No early return here — hooks deben ejecutarse siempre; si no hay content
  // retornaremos children justo antes del JSX final.)

  const [visible, setVisible] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    try {
      // Detect touch capability but prefer hover when the device reports a hover-capable pointer.
      // Some laptops have both touch and mouse; in those cases we want hover tooltips to work.
      const hasTouch = !!('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0);
      const hasHover = window.matchMedia ? window.matchMedia('(hover: hover)').matches : false;
      // Treat as touch-only if it has touch and does NOT support hover.
      const touchOnly = hasTouch && !hasHover;
      setIsTouch(Boolean(touchOnly));
    } catch (e) {
      setIsTouch(false);
    }
  }, []);

  const close = () => setVisible(false);

  const handleMouseEnter = (e) => {
    // No activar hover si es dispositivo táctil
    if (isTouch) return;
    setVisible(true);
    if (position === 'auto') {
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const chosen = rect.top > (window.innerHeight / 2) ? 'top' : 'bottom';
        setCalculatedPosition(chosen);
      } catch (err) {
        setCalculatedPosition('bottom');
      }
    } else {
      setCalculatedPosition(position);
    }
  };

  const handleMouseLeave = () => {
    if (isTouch) return;
    setVisible(false);
  };

  const handleClick = (e) => {
    // On touch devices, toggle the tooltip/modal on tap
    if (!isTouch) return;
    e.stopPropagation();
    setVisible((v) => !v);
  };

  // When modal is open on mobile, lock body scroll
  useEffect(() => {
    if (visible && isTouch && modalOnMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [visible, isTouch, modalOnMobile]);

  // Si no hay contenido, renderizar children tal cual (hooks ya fueron llamados)
  if (!content) return <>{children}</>;

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      {/* Modal variant for touch devices */}
      {visible && isTouch && modalOnMobile && (
        <>
          <div className="tooltip-modal-backdrop" onClick={close} />
          <div className="tooltip-modal-content" role="dialog" aria-modal="true">
            <button className="tooltip-modal-close" onClick={close} aria-label="Cerrar">✕</button>
            {typeof content === 'string' ? <div>{content}</div> : content}
          </div>
        </>
      )}

      {/* Classic inline tooltip for non-touch or when not using modal */}
      {visible && (!isTouch || !modalOnMobile) && (
        <div className={`tooltip-content tooltip-${calculatedPosition}`}>
          {typeof content === 'string' ? <div>{content}</div> : content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
