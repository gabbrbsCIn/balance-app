import React, { useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants/colors';
import { TransactionCard } from '../components/TransactionCard';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { usePeriods } from '../hooks/usePeriods';
import { useTransactions } from '../hooks/useTransactions';
import { Transaction } from '../types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TransactionsScreen() {
  const navigation = useNavigation<Nav>();
  const { currentPeriod, loading: periodsLoading } = usePeriods();
  const { transactions, loading, remove, reload } = useTransactions(currentPeriod?.id ?? null);

  const isClosed = currentPeriod?.is_closed === 1;

  const handleEdit = useCallback((t: Transaction) => {
    if (!currentPeriod) return;
    navigation.navigate('TransactionForm', { periodId: currentPeriod.id, transaction: t });
  }, [currentPeriod, navigation]);

  const handleDelete = useCallback(async (id: number) => {
    await remove(id);
  }, [remove]);

  if (periodsLoading || loading) return <LoadingOverlay />;
  if (!currentPeriod) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
            readonly={isClosed}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>Nenhuma transação neste período.</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerLabel}>PERÍODO ATUAL</Text>
            <Text style={styles.headerText}>{currentPeriod.label}</Text>
            {isClosed && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>FECHADO — somente leitura</Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        onRefresh={reload}
        refreshing={loading}
      />

      {!isClosed && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TransactionForm', { periodId: currentPeriod.id })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerText: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  closedBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.warning, letterSpacing: 0.5 },

  empty: { paddingVertical: 64, alignItems: 'center' },
  emptyEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.5 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32, fontWeight: '300' },
});
