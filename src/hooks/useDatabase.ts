import { useState, useEffect } from 'react';
import { getDb } from '../db/database';

export function useDatabase() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getDb()
      .then(() => setReady(true))
      .catch((e) => setError(e));
  }, []);

  return { ready, error };
}
