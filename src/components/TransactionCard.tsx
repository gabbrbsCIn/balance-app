import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction } from '../types/models';
import { formatCurrency } from '../utils/formatCurrency';
import { formatIsoDate } from '../utils/periodUtils';
import { Colors } from '../constants/colors';
import { showConfirm } from './ConfirmDialog';

interface Props {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
  readonly?: boolean;
}

export function TransactionCard({ transaction, onEdit, onDelete, readonly }: Props) {
  const isRevenue = transaction.type === 'revenue';
  const dotColor = isRevenue ? Colors.revenue : Colors.expense;
  const amountColor = isRevenue ? Colors.revenue : Colors.expense;

  const handleDelete = () => {
    showConfirm({
      title: 'Excluir transação',
      message: `Excluir "${transaction.description}"?`,
      confirmText: 'Excluir',
      onConfirm: () => onDelete(transaction.id),
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.info}>
          <Text style={styles.description} numberOfLines={2}>{transaction.description}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.date}>{formatIsoDate(transaction.date)}</Text>
            {transaction.source === 'ai' && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>IA</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.amount, { color: amountColor }]}>
          {isRevenue ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
      </View>

      {!readonly && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onEdit(transaction)} style={styles.btn} activeOpacity={0.7}>
            <Text style={styles.btnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.btn, styles.btnDanger]} activeOpacity={0.7}>
            <Text style={[styles.btnText, styles.btnDangerText]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  description: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  date: { fontSize: 11, color: Colors.textSecondary },
  badge: {
    backgroundColor: Colors.chipPurple,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: Colors.chipPurpleText, letterSpacing: 0.4 },
  amount: { fontSize: 15, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.borderSoft,
  },
  btnDanger: { backgroundColor: Colors.expenseSoft },
  btnText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  btnDangerText: { color: Colors.expense },
});
