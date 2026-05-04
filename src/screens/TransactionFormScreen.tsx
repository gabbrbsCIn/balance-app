import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants/colors';
import { createTransaction, updateTransaction } from '../db/repositories/transactionsRepository';
import { TransactionType } from '../types/models';
import { formatIsoDate, ddmmyyyyToISO, autoFormatDateInput } from '../utils/periodUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionForm'>;

export function TransactionFormScreen({ route, navigation }: Props) {
  const { periodId, transaction } = route.params;
  const isEdit = !!transaction;

  const [date, setDate] = useState(
    transaction?.date ? formatIsoDate(transaction.date) : ''
  );
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '');
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [saving, setSaving] = useState(false);

  const handleDateChange = (text: string) => {
    setDate(autoFormatDateInput(text));
  };

  const validate = (): string | null => {
    if (!ddmmyyyyToISO(date)) return 'Data inválida. Use o formato DD/MM/AAAA';
    if (!description.trim()) return 'Descrição é obrigatória';
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) return 'Valor deve ser maior que zero';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Atenção', err); return; }
    setSaving(true);
    try {
      const isoDate = ddmmyyyyToISO(date)!;
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      if (isEdit && transaction) {
        await updateTransaction(transaction.id, { date: isoDate, description, amount: parsedAmount, type });
      } else {
        await createTransaction({ period_id: periodId, date: isoDate, description, amount: parsedAmount, type });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a transação.');
    } finally {
      setSaving(false);
    }
  };

  const isExpense = type === 'expense';
  const ctaColor = isExpense ? Colors.expense : Colors.revenue;
  const valueColor = isExpense ? Colors.expense : Colors.revenue;
  const ctaLabel = isEdit
    ? 'Atualizar'
    : isExpense ? 'Adicionar Despesa' : 'Adicionar Receita';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>TIPO</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typePill,
              type === 'revenue' && styles.typePillRevenueActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setType('revenue')}
          >
            <Text style={[
              styles.typePillText,
              type === 'revenue' && styles.typePillTextActive,
            ]}>
              Receita (+)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typePill,
              type === 'expense' && styles.typePillExpenseActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setType('expense')}
          >
            <Text style={[
              styles.typePillText,
              type === 'expense' && styles.typePillTextActive,
            ]}>
              Despesa (-)
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>DATA</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={handleDateChange}
          placeholder="DD / MM / AAAA"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.label}>DESCRIÇÃO</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Taxa de condomínio - Apto 101"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>VALOR (R$)</Text>
        <TextInput
          style={[styles.input, styles.inputAmount, { color: valueColor }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: ctaColor }, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : ctaLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },

  typeRow: { flexDirection: 'row', gap: 10 },
  typePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typePillRevenueActive: { backgroundColor: Colors.revenue, borderColor: Colors.revenue },
  typePillExpenseActive: { backgroundColor: Colors.expense, borderColor: Colors.expense },
  typePillText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  typePillTextActive: { color: '#FFF' },

  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  inputAmount: { fontSize: 22, fontWeight: '700' },

  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
