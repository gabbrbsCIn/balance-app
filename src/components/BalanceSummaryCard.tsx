import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PeriodBalance } from '../types/models';
import { formatCurrency } from '../utils/formatCurrency';
import { Colors } from '../constants/colors';

interface Props {
  balance: PeriodBalance;
  title?: string;
}

export function BalanceSummaryCard({ balance, title = 'SALDO DO PERÍODO' }: Props) {
  const saldoColor = balance.saldo >= 0 ? Colors.textPrimary : Colors.expense;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.balance, { color: saldoColor }]}>
        {formatCurrency(balance.saldo)}
      </Text>

      <View style={styles.row}>
        <View style={[styles.pill, styles.pillRevenue]}>
          <Text style={styles.pillLabel}>RECEITAS</Text>
          <Text style={[styles.pillValue, { color: Colors.revenue }]}>
            {formatCurrency(balance.total_receita)}
          </Text>
        </View>
        <View style={[styles.pill, styles.pillExpense]}>
          <Text style={styles.pillLabel}>DESPESAS</Text>
          <Text style={[styles.pillValue, { color: Colors.expense }]}>
            {formatCurrency(balance.total_despesa)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  balance: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pillRevenue: { backgroundColor: Colors.revenueSoft },
  pillExpense: { backgroundColor: Colors.expenseSoft },
  pillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  pillValue: { fontSize: 14, fontWeight: '700' },
});
