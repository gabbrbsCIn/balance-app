import { getDb } from '../database';
import { Transaction, TransactionType, TransactionSource } from '../../types/models';

export async function getTransactionsByPeriod(periodId: number): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    'SELECT * FROM transactions WHERE period_id = ? ORDER BY date DESC, id DESC',
    [periodId]
  );
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  const db = await getDb();
  return db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
}

export async function createTransaction(t: {
  period_id: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  source?: TransactionSource;
}): Promise<Transaction> {
  const db = await getDb();
  const now = new Date().toISOString();
  const source = t.source ?? 'manual';
  const result = await db.runAsync(
    'INSERT INTO transactions (period_id, date, description, amount, type, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [t.period_id, t.date, t.description, t.amount, t.type, source, now, now]
  );
  return {
    id: result.lastInsertRowId,
    period_id: t.period_id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
    source,
    created_at: now,
    updated_at: now,
  };
}

export async function updateTransaction(
  id: number,
  partial: Partial<Pick<Transaction, 'date' | 'description' | 'amount' | 'type'>>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(partial) as (keyof typeof partial)[];
  if (fields.length === 0) return;
  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => partial[f] as string | number);
  values.push(new Date().toISOString());
  await db.runAsync(
    `UPDATE transactions SET ${setClauses}, updated_at = ? WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function createTransactionsBatch(
  transactions: Parameters<typeof createTransaction>[0][]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const t of transactions) {
      const source = t.source ?? 'manual';
      await db.runAsync(
        'INSERT INTO transactions (period_id, date, description, amount, type, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [t.period_id, t.date, t.description, t.amount, t.type, source, now, now]
      );
    }
  });
}
