import { useState, useCallback } from 'react';
import { normalizeReachability } from '../utils/networkUtils';

/**
 * Hook para manejar el sorting de tablas
 * @param {string} defaultKey - Clave de ordenamiento por defecto
 * @param {string} defaultDirection - Dirección por defecto ('asc' o 'desc')
 * @returns {Object} Estado y funciones de sorting
 */
export const useTableSort = (defaultKey = null, defaultDirection = 'asc') => {
  const [sortConfig, setSortConfig] = useState({ 
    key: defaultKey, 
    direction: defaultDirection 
  });

  /**
   * Maneja el cambio de ordenamiento
   */
  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Toggle direction
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // Nueva columna, empezar con asc
      return { key, direction: 'asc' };
    });
  }, []);

  /**
   * Ordena los datos según la configuración actual
   */
  const sortData = useCallback((data, key = sortConfig.key, direction = sortConfig.direction) => {
    if (!key || !data) return data;
    
    const sorted = [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Normalizar valores de status
      if (key === 'status') {
        aVal = normalizeReachability(aVal);
        bVal = normalizeReachability(bVal);
      }
      
      // Manejar valores null/undefined
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      // Normalizar strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      // Comparar
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [sortConfig]);

  /**
   * Reset del sorting
   */
  const resetSort = useCallback(() => {
    setSortConfig({ key: defaultKey, direction: defaultDirection });
  }, [defaultKey, defaultDirection]);

  return {
    sortConfig,
    handleSort,
    sortData,
    resetSort
  };
};
