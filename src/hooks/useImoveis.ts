import { useState, useEffect, useCallback } from 'react';
import { fetchProperties, getDifferentials, WPProperty } from '../lib/wpApi';

export function useImoveis() {
  const [imoveis, setImoveis] = useState<WPProperty[]>([]);
  const [differentials, setDifferentials] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [propsData, diffsData] = await Promise.all([
        fetchProperties({ per_page: 100 }),
        getDifferentials().catch((err) => {
          console.warn('Differentials not available or failed to load:', err);
          return [];
        })
      ]);
      setImoveis(propsData);
      setDifferentials(diffsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const reloadImoveis = () => {
    fetchAll();
  };

  const getDifferentialName = (id: number): string => {
    const diff = differentials.find((d) => d.id === id);
    return diff ? diff.name : '';
  };

  return { imoveis, differentials, loading, error, reloadImoveis, getDifferentialName };
}
