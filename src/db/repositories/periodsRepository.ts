import { getDb } from '../database';
import { Period, PeriodBalance } from '../../types/models';

export async function getCurrentActivePeriod(): Promise<Period | null> {
  const db = await getDb();
  return db.getFirstAsync<Period>(
    'SELECT * FROM periods WHERE is_current = 1 AND is_closed = 0 LIMIT 1'
  );
}

export async function getOpenPeriod(): Promise<Period | null> {
  const db = await getDb();
  return db.getFirstAsync<Period>('SELECT * FROM periods WHERE is_closed = 0 ORDER BY id DESC LIMIT 1');
}

export async function getOpenPeriodForDate(isoDate: string): Promise<Period | null> {
  const db = await getDb();
  return db.getFirstAsync<Period>(
    'SELECT * FROM periods WHERE is_closed = 0 AND start_date <= ? AND end_date >= ? ORDER BY id DESC LIMIT 1',
    [isoDate, isoDate]
  );
}

export async function getAllPeriods(): Promise<Period[]> {
  const db = await getDb();
  return db.getAllAsync<Period>('SELECT * FROM periods ORDER BY start_date DESC');
}

export async function getPeriodById(id: number): Promise<Period | null> {
  const db = await getDb();
  return db.getFirstAsync<Period>('SELECT * FROM periods WHERE id = ?', [id]);
}

export async function createPeriod(period: Omit<Period, 'id'>): Promise<Period> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO periods (label, start_date, end_date, is_closed, is_current, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [period.label, period.start_date, period.end_date, period.is_closed, period.is_current, period.created_at]
  );
  return { ...period, id: result.lastInsertRowId };
}

export async function closePeriod(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE periods SET is_closed = 1, is_current = 0 WHERE id = ?', [id]);
}

export async function clearCurrentPeriod(): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE periods SET is_current = 0');
}

export async function setCurrentPeriod(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE periods SET is_current = 0');
  await db.runAsync('UPDATE periods SET is_current = 1, is_closed = 0 WHERE id = ?', [id]);
}

export async function deletePeriod(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM periods WHERE id = ?', [id]);
}

export async function getPeriodBalance(periodId: number): Promise<PeriodBalance> {
  const db = await getDb();
  const row = await db.getFirstAsync<PeriodBalance>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END), 0) AS total_receita,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_despesa,
      COALESCE(SUM(CASE WHEN type='revenue' THEN amount ELSE -amount END), 0) AS saldo
    FROM transactions WHERE period_id = ?`,
    [periodId]
  );
  return row ?? { total_receita: 0, total_despesa: 0, saldo: 0 };
}
