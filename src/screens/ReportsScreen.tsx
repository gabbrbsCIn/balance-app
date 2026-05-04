import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { usePeriods } from '../hooks/usePeriods';
import { useSettings } from '../hooks/useSettings';
import { BalanceSummaryCard } from '../components/BalanceSummaryCard';
import { getTransactionsByPeriod } from '../db/repositories/transactionsRepository';
import { getPeriodBalance } from '../db/repositories/periodsRepository';
import { generatePdfHtml } from '../services/pdfService';
import { Period, PeriodBalance } from '../types/models';
import { showConfirm } from '../components/ConfirmDialog';
import { formatIsoDate, autoFormatDateInput, ddmmyyyyToISO } from '../utils/periodUtils';

export function ReportsScreen() {
  const {
    currentPeriod,
    allPeriods,
    balance,
    loading,
    reload,
    closePeriod,
    setCurrentPeriodById,
    createPeriod,
    deletePeriod,
  } = usePeriods();
  const { settings } = useSettings();
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<PeriodBalance | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLabel, setCreateLabel] = useState('');
  const [createStart, setCreateStart] = useState('');
  const [createEnd, setCreateEnd] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const selectedPeriod: Period | null =
    allPeriods.find((p) => p.id === (selectedPeriodId ?? currentPeriod?.id)) ?? currentPeriod ?? null;
  const displayBalance: PeriodBalance = selectedPeriodId ? (selectedBalance ?? balance) : balance;

  const handleSelectPeriod = useCallback(async (period: Period) => {
    setSelectedPeriodId(period.id);
    const bal = await getPeriodBalance(period.id);
    setSelectedBalance(bal);
  }, []);

  const handleClosePeriod = useCallback(() => {
    if (!selectedPeriod || selectedPeriod.is_closed === 1) return;
    showConfirm({
      title: 'Fechar Período',
      message: `Fechar o período "${selectedPeriod.label}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Fechar Período',
      onConfirm: async () => {
        await closePeriod(selectedPeriod.id);
        Alert.alert('Período encerrado', 'O período foi fechado. O próximo acesso criará o mês atual automaticamente.');
      },
    });
  }, [selectedPeriod, closePeriod]);

  const handleSetCurrent = useCallback(() => {
    if (!selectedPeriod) return;
    showConfirm({
      title: 'Definir como Atual',
      message: `Definir "${selectedPeriod.label}" como período atual? O período ativo anterior será fechado.`,
      confirmText: 'Definir como Atual',
      onConfirm: async () => {
        await setCurrentPeriodById(selectedPeriod.id);
        Alert.alert('Período atualizado', `"${selectedPeriod.label}" agora é o período atual.`);
      },
    });
  }, [selectedPeriod, setCurrentPeriodById]);

  const handleDeletePeriod = useCallback(() => {
    if (!selectedPeriod) return;
    showConfirm({
      title: 'Excluir Período',
      message: `Excluir "${selectedPeriod.label}"? Todos os lançamentos deste período serão apagados permanentemente.`,
      confirmText: 'Excluir',
      onConfirm: async () => {
        const idToDelete = selectedPeriod.id;
        setSelectedPeriodId(null);
        await deletePeriod(idToDelete);
      },
    });
  }, [selectedPeriod, deletePeriod]);

  const handleCreatePeriod = useCallback(async () => {
    if (!createLabel.trim()) {
      Alert.alert('Erro', 'Informe o nome do período.');
      return;
    }
    const start = ddmmyyyyToISO(createStart);
    const end = ddmmyyyyToISO(createEnd);
    if (!start || !end) {
      Alert.alert('Erro', 'Datas inválidas. Use o formato DD/MM/AAAA.');
      return;
    }
    if (start > end) {
      Alert.alert('Erro', 'A data inicial deve ser anterior à data final.');
      return;
    }
    setCreating(true);
    try {
      await createPeriod(createLabel.trim(), start, end);
      setShowCreateModal(false);
      setCreateLabel('');
      setCreateStart('');
      setCreateEnd('');
    } catch (e: any) {
      Alert.alert('Erro ao criar período', e?.message ?? 'Tente novamente.');
    } finally {
      setCreating(false);
    }
  }, [createLabel, createStart, createEnd, createPeriod]);

  const handleExportPdf = useCallback(async () => {
    if (!selectedPeriod || !settings?.condo_name) return;
    setGenerating(true);
    try {
      const transactions = await getTransactionsByPeriod(selectedPeriod.id);
      const bal = selectedPeriodId ? displayBalance : balance;
      const html = generatePdfHtml(settings.condo_name, selectedPeriod, transactions, bal);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Balancete ${selectedPeriod.label}`,
        });
      } else {
        Alert.alert('PDF gerado', `Arquivo salvo em:\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Erro ao gerar PDF', e?.message ?? 'Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, [selectedPeriod, settings, balance, displayBalance, selectedPeriodId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const isSelectedCurrent = selectedPeriod?.id === currentPeriod?.id;
  const isSelectedOpen = selectedPeriod?.is_closed === 0;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {selectedPeriod && (
          <View style={styles.periodHeader}>
            <Text style={styles.periodHeaderLabel}>PERÍODO SELECIONADO</Text>
            <Text style={styles.periodHeaderTitle}>{selectedPeriod.label}</Text>
            <Text style={styles.periodHeaderDates}>
              {formatIsoDate(selectedPeriod.start_date)} — {formatIsoDate(selectedPeriod.end_date)}
            </Text>
          </View>
        )}

        {selectedPeriod && (
          <View style={{ marginBottom: 18 }}>
            <BalanceSummaryCard balance={displayBalance} />
          </View>
        )}

        {selectedPeriod && (
          <>
            <Text style={styles.sectionTitle}>AÇÕES DO PERÍODO</Text>

            {isSelectedCurrent && isSelectedOpen && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleClosePeriod}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>Fechar Período</Text>
              </TouchableOpacity>
            )}

            {isSelectedCurrent && !isSelectedOpen && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDisabled]}
                disabled
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>✓ Período já fechado</Text>
              </TouchableOpacity>
            )}

            {!isSelectedCurrent && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleSetCurrent}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>Definir como Atual</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeletePeriod}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteBtnText}>Excluir Período</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>EXPORTAR</Text>
        <TouchableOpacity
          style={[styles.pdfBtn, generating && styles.actionBtnDisabled]}
          onPress={handleExportPdf}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.pdfBtnText}>📄  Exportar PDF — {selectedPeriod?.label}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.historyHeader}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
            HISTÓRICO DE PERÍODOS
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>+ Criar Período</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyList}>
          {allPeriods.map((p, idx) => {
            const selected = selectedPeriod?.id === p.id;
            const isCurrent = p.id === currentPeriod?.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.periodItem,
                  idx !== allPeriods.length - 1 && styles.periodItemBorder,
                  selected && styles.periodItemSelected,
                ]}
                onPress={() => handleSelectPeriod(p)}
                activeOpacity={0.7}
              >
                <View style={styles.periodItemInfo}>
                  <Text style={styles.periodItemLabel}>{p.label}</Text>
                  <Text style={styles.periodItemDates}>
                    {formatIsoDate(p.start_date)} – {formatIsoDate(p.end_date)}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  {isCurrent && (
                    <View style={styles.currentTag}>
                      <Text style={styles.currentTagText}>Atual</Text>
                    </View>
                  )}
                  {p.is_closed === 1 && (
                    <View style={styles.closedTag}>
                      <Text style={styles.closedTagText}>Fechado</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Novo Período</Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: Junho 2026"
              placeholderTextColor={Colors.textMuted}
              value={createLabel}
              onChangeText={setCreateLabel}
            />

            <Text style={styles.inputLabel}>Data Inicial</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={createStart}
              onChangeText={(v) => setCreateStart(autoFormatDateInput(v))}
            />

            <Text style={styles.inputLabel}>Data Final</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={createEnd}
              onChangeText={(v) => setCreateEnd(autoFormatDateInput(v))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCreateModal(false);
                  setCreateLabel('');
                  setCreateStart('');
                  setCreateEnd('');
                }}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, creating && styles.actionBtnDisabled]}
                onPress={handleCreatePeriod}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Criar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  periodHeader: { marginBottom: 14 },
  periodHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  periodHeaderTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  periodHeaderDates: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 4,
  },

  actionBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },

  deleteBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.expense,
  },
  deleteBtnText: { color: Colors.expense, fontWeight: '700', fontSize: 14 },

  pdfBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: Colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pdfBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 4,
    marginRight: 4,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  historyList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  periodItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  periodItemSelected: { backgroundColor: Colors.accentLavender },
  periodItemInfo: { flex: 1 },
  periodItemLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  periodItemDates: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  currentTag: {
    backgroundColor: Colors.accentLavender,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  currentTagText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  closedTag: {
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closedTagText: { fontSize: 11, color: Colors.warning, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
