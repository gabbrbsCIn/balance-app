import { Period, Transaction, PeriodBalance } from '../types/models';
import { formatIsoDate } from '../utils/periodUtils';
import { formatCurrency } from '../utils/formatCurrency';

export function generatePdfHtml(
  condoName: string,
  period: Period,
  transactions: Transaction[],
  balance: PeriodBalance
): string {
  const rows = transactions
    .map((t) => {
      const isRevenue = t.type === 'revenue';
      return `
        <tr>
          <td>${formatIsoDate(t.date)}</td>
          <td>${escapeHtml(t.description)}</td>
          <td class="revenue">${isRevenue ? formatCurrency(t.amount) : ''}</td>
          <td class="expense">${!isRevenue ? formatCurrency(t.amount) : ''}</td>
        </tr>`;
    })
    .join('');

  const saldoClass = balance.saldo >= 0 ? 'revenue' : 'expense';
  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #212121; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1565C0; padding-bottom: 16px; }
    .header h1 { font-size: 20px; color: #1565C0; }
    .header h2 { font-size: 14px; color: #555; margin-top: 4px; }
    .header p { font-size: 11px; color: #888; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1565C0; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
    td { padding: 7px 10px; border-bottom: 1px solid #E0E0E0; vertical-align: top; }
    tr:nth-child(even) { background: #F5F5F5; }
    .revenue { color: #2E7D32; font-weight: 600; text-align: right; }
    .expense { color: #C62828; font-weight: 600; text-align: right; }
    .footer { margin-top: 16px; border-top: 2px solid #212121; padding-top: 12px; }
    .footer table { margin-top: 0; }
    .footer td { border: none; font-weight: 700; font-size: 13px; }
    .saldo { font-size: 15px; }
    .print-note { margin-top: 32px; font-size: 10px; color: #AAA; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(condoName)}</h1>
    <h2>Balancete Mensal — ${escapeHtml(period.label)}</h2>
    <p>Período: ${formatIsoDate(period.start_date)} a ${formatIsoDate(period.end_date)}</p>
    <p>Gerado em ${generatedAt}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:90px">Data</th>
        <th>Descrição</th>
        <th style="width:110px; text-align:right">Receita</th>
        <th style="width:110px; text-align:right">Despesa</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" style="text-align:center;color:#888">Nenhuma transação</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <table>
      <tr>
        <td>Total Receitas</td>
        <td class="revenue">${formatCurrency(balance.total_receita)}</td>
      </tr>
      <tr>
        <td>Total Despesas</td>
        <td class="expense">${formatCurrency(balance.total_despesa)}</td>
      </tr>
      <tr>
        <td class="saldo">Saldo do Período</td>
        <td class="${saldoClass} saldo">${formatCurrency(balance.saldo)}</td>
      </tr>
    </table>
  </div>

  <p class="print-note">Documento gerado pelo app Balancete Condomínio</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
