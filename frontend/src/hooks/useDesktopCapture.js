import html2canvas from 'html2canvas';

/**
 * Hook para capturar secciones en versión desktop desde móvil
 * Renderiza el contenido en un contenedor oculto con estilos de desktop
 * y lo exporta como JPG
 */
export const useDesktopCapture = () => {
  const captureDesktopVersion = async (contentElement, sectionName, predioCode = 'unknown') => {
    try {
      if (!contentElement) {
        throw new Error('No content element provided');
      }

      // Crear un contenedor temporal con estilos de desktop
      // NOTA: NO usar visibility:hidden ni opacity:0 — html2canvas no captura elementos ocultos
      const captureContainer = document.createElement('div');
      captureContainer.style.position = 'fixed';
      captureContainer.style.left = '-9999px'; // Off-screen pero renderizado
      captureContainer.style.top = '0';
      captureContainer.style.width = '1920px';
      captureContainer.style.height = '1080px';
      captureContainer.style.backgroundColor = '#f1f5f9';
      captureContainer.style.zIndex = '99999';
      captureContainer.style.overflow = 'hidden';
      captureContainer.style.fontFamily = 'Arial, Helvetica, sans-serif';
      captureContainer.style.pointerEvents = 'none';

      // Clonar el contenido
      const clonedContent = contentElement.cloneNode(true);
      
      // Remover elementos móviles específicos
      const elementsToRemove = clonedContent.querySelectorAll(
        '.mobile-hamburger, .mobile-drawer, .mobile-drawer-backdrop, .mobile-drawer-content, .mobile-search-toggle'
      );
      elementsToRemove.forEach(el => el.remove());

      // Aplicar estilos de desktop al contenido clonado
      clonedContent.style.width = '100%';
      clonedContent.style.padding = '16px';
      clonedContent.style.boxSizing = 'border-box';
      clonedContent.style.background = '#ffffff';
      clonedContent.style.borderRadius = '8px';
      clonedContent.style.margin = '16px';

      // Agregar timestamp y predio info
      const headerInfo = document.createElement('div');
      headerInfo.style.marginBottom = '16px';
      headerInfo.style.paddingBottom = '12px';
      headerInfo.style.borderBottom = '1px solid #cbd5e1';
      headerInfo.style.display = 'flex';
      headerInfo.style.justifyContent = 'space-between';
      headerInfo.style.alignItems = 'center';

      const titleEl = document.createElement('div');
      titleEl.style.fontSize = '16px';
      titleEl.style.fontWeight = '600';
      titleEl.style.color = '#1e293b';
      titleEl.textContent = `${sectionName} - Predio: ${predioCode}`;

      const timestampEl = document.createElement('div');
      timestampEl.style.fontSize = '12px';
      timestampEl.style.color = '#64748b';
      const now = new Date();
      timestampEl.textContent = now.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      headerInfo.appendChild(titleEl);
      headerInfo.appendChild(timestampEl);

      captureContainer.appendChild(headerInfo);
      captureContainer.appendChild(clonedContent);
      document.body.appendChild(captureContainer);

      // Esperar a que se renderice en el DOM
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar con html2canvas
      // NOTA: foreignObjectRendering:true causa capturas en blanco — NO usar
      const canvas = await html2canvas(captureContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        foreignObjectRendering: false,
        removeContainer: false,
        imageTimeout: 15000,
        windowWidth: 1920,
        windowHeight: 1080,
        scrollX: 9999, // Compensar el offset de left:-9999px
        onclone: (clonedDoc) => {
          // Asegurar que los SVG se rendericen correctamente
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach(svg => {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            try {
              const bbox = svg.getBBox();
              if (!svg.hasAttribute('width')) svg.setAttribute('width', bbox.width);
              if (!svg.hasAttribute('height')) svg.setAttribute('height', bbox.height);
            } catch (e) {
              // Algunos SVG no tienen getBBox
            }
          });

          // Asegurar visibilidad de tablas
          const tables = clonedDoc.querySelectorAll('table');
          tables.forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
          });
        }
      });

      // Descargar como JPG
      const fileName = `${sectionName}_${predioCode}_${Date.now()}.jpg`;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        // Limpiar contenedor temporal
        document.body.removeChild(captureContainer);
      }, 'image/jpeg', 0.95);

    } catch (error) {
      console.error('Error capturando versión desktop:', error);
      throw error;
    }
  };

  return { captureDesktopVersion };
};
