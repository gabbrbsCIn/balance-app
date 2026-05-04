import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types/models';
import { getSettings, updateSettings } from '../db/repositories/settingsRepository';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (partial: Partial<Omit<Settings, 'id' | 'updated_at'>>) => {
    await updateSettings(partial);
    await load();
  }, [load]);

  return { settings, loading, save, reload: load };
}
