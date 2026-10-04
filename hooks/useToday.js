import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { getTodayKey, msUntilNextMidnight } from '../dateUtils';

// Devuelve la clave del día actual y fuerza re-render cuando cambia la fecha
// (al volver a primer plano o al pasar la medianoche con la app abierta).
export function useToday() {
  const [todayKey, setTodayKey] = useState(getTodayKey);

  useEffect(() => {
    const refresh = () => {
      const k = getTodayKey();
      setTodayKey(prev => (prev === k ? prev : k));
    };

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });

    let timer;
    const schedule = () => {
      timer = setTimeout(() => { refresh(); schedule(); }, msUntilNextMidnight());
    };
    schedule();

    return () => { sub.remove(); clearTimeout(timer); };
  }, []);

  return todayKey;
}
