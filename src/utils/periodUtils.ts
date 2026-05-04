const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function computeCurrentMonthDates(
  referenceDate: Date = new Date()
): { label: string; start_date: string; end_date: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // last day of month

  return {
    label: `${MONTH_NAMES[month]} ${year}`,
    start_date: toIsoDate(startDate),
    end_date: toIsoDate(endDate),
  };
}

export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function ddmmyyyyToISO(ddmmyyyy: string): string | null {
  const match = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function autoFormatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
