import { getDb } from '../database';
import { Photo } from '../../types/models';

export async function createPhoto(p: {
  period_id: number;
  uri: string;
}): Promise<Photo> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO photos (period_id, uri, created_at) VALUES (?, ?, ?)',
    [p.period_id, p.uri, now]
  );
  return { id: result.lastInsertRowId, period_id: p.period_id, uri: p.uri, ai_raw_response: null, created_at: now };
}

export async function updatePhotoAiResponse(id: number, raw: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE photos SET ai_raw_response = ? WHERE id = ?', [raw, id]);
}
