import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType } from '../types/models';
import {
  getTransactionsByPeriod,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../db/repositories/transactionsRepository';

export function useTransactions(periodId: number | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    const list = await getTransactionsByPeriod(periodId);
    setTransactions(list);
    setLoading(false);
  }, [periodId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (t: {
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
  }) => {
    if (!periodId) return;
    await createTransaction({ ...t, period_id: periodId });
    await load();
  }, [periodId, load]);

  const update = useCallback(async (
    id: number,
    partial: Partial<Pick<Transaction, 'date' | 'description' | 'amount' | 'type'>>
  ) => {
    await updateTransaction(id, partial);
    await load();
  }, [load]);

  const remove = useCallback(async (id: number) => {
    await deleteTransaction(id);
    await load();
  }, [load]);

  return { transactions, loading, reload: load, add, update, remove };
}
