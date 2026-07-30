import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [tooltipCoordinates, setTooltipCoordinates] = useState(null);
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);

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

  const modalRef = useRef(null);

  useLayoutEffect(() => {
    if (!visible || isTouch || !wrapperRef.current || !tooltipRef.current) return undefined;

    const updatePosition = () => {
      const anchor = wrapperRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current?.getBoundingClientRect();
      if (!anchor || !tooltip) return;

      const margin = 8;
      const gap = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let placement = calculatedPosition === 'auto' ? 'top' : calculatedPosition;
      let left = anchor.left + (anchor.width / 2) - (tooltip.width / 2);
      let top = anchor.top - tooltip.height - gap;

      if (placement === 'top' && top < margin && anchor.bottom + gap + tooltip.height <= viewportHeight - margin) {
        placement = 'bottom';
      } else if (placement === 'bottom' && anchor.bottom + gap + tooltip.height > viewportHeight - margin && top >= margin) {
        placement = 'top';
      }

      if (placement === 'bottom') {
        top = anchor.bottom + gap;
      } else if (placement === 'left') {
        left = anchor.left - tooltip.width - gap;
        top = anchor.top + (anchor.height / 2) - (tooltip.height / 2);
        if (left < margin && anchor.right + gap + tooltip.width <= viewportWidth - margin) placement = 'right';
      } else if (placement === 'right') {
        left = anchor.right + gap;
        top = anchor.top + (anchor.height / 2) - (tooltip.height / 2);
        if (left + tooltip.width > viewportWidth - margin && anchor.left - gap - tooltip.width >= margin) placement = 'left';
      }

      if (placement === 'left') left = anchor.left - tooltip.width - gap;
      if (placement === 'right') left = anchor.right + gap;

      left = Math.max(margin, Math.min(left, viewportWidth - tooltip.width - margin));
      top = Math.max(margin, Math.min(top, viewportHeight - tooltip.height - margin));

      setTooltipCoordinates({
        left,
        top,
        placement,
        arrowX: anchor.left + (anchor.width / 2) - left,
        arrowY: anchor.top + (anchor.height / 2) - top,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [visible, isTouch, calculatedPosition]);

  const handleMouseEnter = (e) => {
    // No activar hover si es dispositivo táctil
    if (isTouch) return;
    setVisible(true);
    setTooltipCoordinates(null);
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

  // Close on Escape when modal is open
  useEffect(() => {
    if (!(visible && isTouch && modalOnMobile)) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, isTouch, modalOnMobile]);

  // Close when clicking/tapping outside the modal content (more reliable on mobile)
  useEffect(() => {
    if (!(visible && isTouch && modalOnMobile)) return undefined;

    const onPointerDown = (e) => {
      try {
        if (!modalRef.current) return;
        if (!modalRef.current.contains(e.target)) {
          setVisible(false);
        }
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [visible, isTouch, modalOnMobile]);

  // Si no hay contenido, renderizar children tal cual (hooks ya fueron llamados)
  if (!content) return <>{children}</>;

  return (
    <div
      ref={wrapperRef}
      className={`tooltip-wrapper${visible ? ' tooltip-open' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      {/* Modal variant for touch devices */}
      {visible && isTouch && modalOnMobile && typeof document !== 'undefined' && createPortal((
        <>
          <div className="tooltip-modal-backdrop" onClick={close} />
          <div ref={modalRef} className="tooltip-modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="tooltip-modal-inner">
              {typeof content === 'string' ? <div className="tooltip-modal-text">{content}</div> : content}
            </div>
          </div>
        </>
      ), document.body)}

      {/* Classic inline tooltip for non-touch or when not using modal */}
      {visible && (!isTouch || !modalOnMobile) && typeof document !== 'undefined' && createPortal((
        <div
          ref={tooltipRef}
          className={`tooltip-content tooltip-portal tooltip-${tooltipCoordinates?.placement || calculatedPosition}`}
          style={{
            left: tooltipCoordinates?.left ?? 0,
            top: tooltipCoordinates?.top ?? 0,
            visibility: tooltipCoordinates ? 'visible' : 'hidden',
            '--tooltip-arrow-x': tooltipCoordinates ? `${tooltipCoordinates.arrowX}px` : '50%',
            '--tooltip-arrow-y': tooltipCoordinates ? `${tooltipCoordinates.arrowY}px` : '50%',
          }}
        >
          {typeof content === 'string' ? <div>{content}</div> : content}
        </div>
      ), document.body)}
    </div>
  );
};

export default Tooltip;
