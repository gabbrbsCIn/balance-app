import React, { useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, ScrollView,
  RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants/colors';
import { BalanceSummaryCard } from '../components/BalanceSummaryCard';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { usePeriods } from '../hooks/usePeriods';
import { useSettings } from '../hooks/useSettings';
import { useTransactions } from '../hooks/useTransactions';
import { formatIsoDate } from '../utils/periodUtils';
import { formatCurrency } from '../utils/formatCurrency';
import { Transaction } from '../types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { currentPeriod, balance, loading, reload } = usePeriods();
  const { settings } = useSettings();
  const { transactions, reload: reloadTx } = useTransactions(currentPeriod?.id ?? null);

  useFocusEffect(useCallback(() => {
    reload();
    reloadTx();
  }, [reload, reloadTx]));

  if (loading) return <LoadingOverlay />;
  if (!currentPeriod) return null;

  const isClosed = currentPeriod.is_closed === 1;
  const recent = transactions.slice(0, 4);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerInner}>
          <Text style={styles.headerCondo}>
            {(settings?.condo_name ?? 'Condomínio').toUpperCase()}
          </Text>
          <Text style={styles.headerPeriod}>{currentPeriod.label}</Text>
          <Text style={styles.headerDates}>
            {formatIsoDate(currentPeriod.start_date)} — {formatIsoDate(currentPeriod.end_date)}
          </Text>
          {isClosed && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>FECHADO</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { reload(); reloadTx(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.balanceWrap}>
          <BalanceSummaryCard balance={balance} />
        </View>

        {!isClosed && (
          <TouchableOpacity
            style={styles.scanCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ReviewExtracted', { periodId: currentPeriod.id })}
          >
            <View style={styles.scanIconBox}>
              <Text style={styles.scanIcon}>📷</Text>
            </View>
            <View style={styles.scanTextWrap}>
              <Text style={styles.scanTitle}>Escanear Caderno</Text>
              <Text style={styles.scanSubtitle}>IA extrai lançamentos automaticamente</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>AÇÕES RÁPIDAS</Text>

        {!isClosed && (
          <ActionRow
            icon="+"
            iconBg={Colors.accentLavender}
            iconColor={Colors.accentLavenderDark}
            title="Nova Transação"
            subtitle="Receita ou despesa"
            onPress={() => navigation.navigate('TransactionForm', { periodId: currentPeriod.id })}
          />
        )}

        <ActionRow
          icon="⚙"
          iconBg={Colors.borderSoft}
          iconColor={Colors.textSecondary}
          title="Configurações"
          subtitle="Condomínio e IA"
          onPress={() => navigation.navigate('Settings')}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ÚLTIMOS LANÇAMENTOS</Text>

        {recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum lançamento ainda neste período.</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recent.map((t) => (
              <RecentRow key={t.id} transaction={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActionRow({
  icon, iconBg, iconColor, title, subtitle, onPress,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.actionIconBox, { backgroundColor: iconBg }]}>
        <Text style={[styles.actionIcon, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function RecentRow({ transaction }: { transaction: Transaction }) {
  const isRevenue = transaction.type === 'revenue';
  const dotColor = isRevenue ? Colors.revenue : Colors.expense;
  const amountColor = isRevenue ? Colors.revenue : Colors.expense;
  const sign = isRevenue ? '+' : '-';

  return (
    <View style={styles.recentRow}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.recentDescription} numberOfLines={1}>
        {transaction.description}
      </Text>
      <Text style={[styles.recentAmount, { color: amountColor }]}>
        {sign}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  headerSafe: { backgroundColor: Colors.primary },
  headerInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: Colors.primary,
  },
  headerCondo: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headerPeriod: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    marginBottom: 4,
  },
  headerDates: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  closedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  closedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  balanceWrap: { marginTop: 16, marginHorizontal: 16, marginBottom: 18 },

  scanCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: Colors.accentLavender,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: { fontSize: 22 },
  scanTextWrap: { flex: 1 },
  scanTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  scanSubtitle: { fontSize: 12, color: Colors.textSecondary },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },

  actionRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 20, fontWeight: '700' },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  actionSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.textMuted, fontWeight: '300' },

  recentList: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recentDescription: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  recentAmount: { fontSize: 14, fontWeight: '700' },

  emptyBox: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: Colors.textSecondary },
});
