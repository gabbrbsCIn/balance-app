import { useState, useEffect, useCallback } from 'react';
import { Period, PeriodBalance } from '../types/models';
import { getAllPeriods, getPeriodBalance } from '../db/repositories/periodsRepository';
import {
  getCurrentPeriod,
  closePeriod as closeService,
  setCurrentPeriod as setCurrentService,
  createPeriodManual as createPeriodService,
  deletePeriod as deletePeriodService,
} from '../services/periodService';

export function usePeriods() {
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [allPeriods, setAllPeriods] = useState<Period[]>([]);
  const [balance, setBalance] = useState<PeriodBalance>({ total_receita: 0, total_despesa: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // sequential: getCurrentPeriod() may INSERT, getAllPeriods() must run after
    const current = await getCurrentPeriod();
    const [all, bal] = await Promise.all([getAllPeriods(), getPeriodBalance(current.id)]);
    setCurrentPeriod(current);
    setAllPeriods(all);
    setBalance(bal);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshBalance = useCallback(async (periodId: number) => {
    const bal = await getPeriodBalance(periodId);
    setBalance(bal);
  }, []);

  const closePeriod = useCallback(async (id: number) => {
    await closeService(id);
    await load();
  }, [load]);

  const setCurrentPeriodById = useCallback(async (id: number) => {
    await setCurrentService(id);
    await load();
  }, [load]);

  const createPeriod = useCallback(async (label: string, start_date: string, end_date: string) => {
    await createPeriodService(label, start_date, end_date);
    await load();
  }, [load]);

  const deletePeriod = useCallback(async (id: number) => {
    await deletePeriodService(id);
    await load();
  }, [load]);

  return {
    currentPeriod,
    allPeriods,
    balance,
    loading,
    reload: load,
    refreshBalance,
    closePeriod,
    setCurrentPeriodById,
    createPeriod,
    deletePeriod,
  };
}
