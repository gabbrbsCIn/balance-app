import {
  getCurrentActivePeriod,
  createPeriod,
  closePeriod as closeInDb,
  clearCurrentPeriod,
  setCurrentPeriod as setCurrentInDb,
  deletePeriod as deleteInDb,
} from '../db/repositories/periodsRepository';
import { computeCurrentMonthDates } from '../utils/periodUtils';
import { Period } from '../types/models';

export async function getCurrentPeriod(): Promise<Period> {
  const current = await getCurrentActivePeriod();
  if (current) return current;
  return createCurrentMonthPeriod();
}

async function createCurrentMonthPeriod(): Promise<Period> {
  const { label, start_date, end_date } = computeCurrentMonthDates();
  await clearCurrentPeriod();
  return createPeriod({
    label,
    start_date,
    end_date,
    is_closed: 0,
    is_current: 1,
    created_at: new Date().toISOString(),
  });
}

export async function closePeriod(id: number): Promise<void> {
  await closeInDb(id);
}

export async function setCurrentPeriod(id: number): Promise<void> {
  await setCurrentInDb(id);
}

export async function createPeriodManual(
  label: string,
  start_date: string,
  end_date: string
): Promise<Period> {
  return createPeriod({
    label,
    start_date,
    end_date,
    is_closed: 0,
    is_current: 0,
    created_at: new Date().toISOString(),
  });
}

export async function deletePeriod(id: number): Promise<void> {
  await deleteInDb(id);
}
