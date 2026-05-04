import { getDb } from '../database';
import { Settings } from '../../types/models';

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const row = await db.getFirstAsync<Settings>('SELECT * FROM settings WHERE id = 1');
  if (!row) throw new Error('Settings row not found');
  return row;
}

export async function updateSettings(
  partial: Partial<Omit<Settings, 'id' | 'updated_at'>>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(partial) as (keyof typeof partial)[];
  if (fields.length === 0) return;
  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => partial[f] as string | number | null);
  values.push(new Date().toISOString());
  await db.runAsync(
    `UPDATE settings SET ${setClauses}, updated_at = ? WHERE id = 1`,
    values
  );
}
