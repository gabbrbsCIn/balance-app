import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Modal, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useSettings } from '../hooks/useSettings';
import { getDb } from '../db/database';

const APP_VERSION = '1.0.0';
const CLEAR_KEYWORD = 'LIMPAR';

const MODEL_PRESETS: { id: string; label: string; chip: 'green' | 'yellow' | 'blue' | 'purple' }[] = [
  { id: 'gemma3:4b', label: 'gemma3:4b', chip: 'green' },
  { id: 'gemma3:12b', label: 'gemma3:12b', chip: 'yellow' },
  { id: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview', chip: 'blue' },
  { id: 'kimi-k2.6', label: 'kimi-k2.6', chip: 'purple' },
];

const CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  green: { bg: Colors.chipGreen, text: Colors.chipGreenText },
  yellow: { bg: Colors.chipYellow, text: Colors.chipYellowText },
  blue: { bg: Colors.chipBlue, text: Colors.chipBlueText },
  purple: { bg: Colors.chipPurple, text: Colors.chipPurpleText },
};

export function SettingsScreen() {
  const { settings, loading, save } = useSettings();
  const [condoName, setCondoName] = useState('');
  const [ollamaModel, setOllamaModel] = useState('');
  const [ollamaApiKey, setOllamaApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  // Clear data modal state
  const [clearStep, setClearStep] = useState<'warning' | 'confirm'>('warning');
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const [clearing, setClearing] = useState(false);
  const confirmInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (settings) {
      setCondoName(settings.condo_name);
      setOllamaModel(settings.ollama_model);
      setOllamaApiKey(settings.ollama_api_key ?? '');
      setSystemPrompt(settings.ai_system_prompt ?? '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!condoName.trim()) { Alert.alert('Atenção', 'Nome do condomínio é obrigatório.'); return; }
    if (!ollamaModel.trim()) { Alert.alert('Atenção', 'Selecione um modelo de IA.'); return; }
    if (!ollamaApiKey.trim()) { Alert.alert('Atenção', 'API Key é obrigatória.'); return; }

    setSaving(true);
    try {
      await save({
        condo_name: condoName.trim(),
        ollama_model: ollamaModel.trim(),
        ollama_api_key: ollamaApiKey.trim(),
        ai_system_prompt: systemPrompt.trim() || null,
      });
      Alert.alert('Salvo', 'Configurações atualizadas com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const openClearModal = () => {
    setClearStep('warning');
    setClearInput('');
    setClearModalVisible(true);
  };

  const closeClearModal = () => {
    if (clearing) return;
    setClearModalVisible(false);
    setClearInput('');
  };

  const advanceToConfirm = () => {
    setClearStep('confirm');
    setTimeout(() => confirmInputRef.current?.focus(), 200);
  };

  const handleConfirmClear = async () => {
    if (clearInput !== CLEAR_KEYWORD) return;
    setClearing(true);
    try {
      const db = await getDb();
      // Deletion order respects FK constraints: photos → transactions → periods
      // Settings row is preserved intentionally
      await db.execAsync(`
        DELETE FROM photos;
        DELETE FROM transactions;
        DELETE FROM periods;
      `);
      setClearModalVisible(false);
      setClearInput('');
      Alert.alert(
        'Dados apagados',
        'Todos os lançamentos e períodos foram removidos. Um novo período será criado automaticamente.',
      );
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível limpar os dados.');
    } finally {
      setClearing(false);
    }
  };

  const canConfirm = clearInput === CLEAR_KEYWORD;

  if (loading) return null;

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Condomínio Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CONDOMÍNIO</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nome</Text>
              <TextInput
                style={styles.rowInput}
                value={condoName}
                onChangeText={setCondoName}
                placeholder="Ex: Vale do Beberibe"
                placeholderTextColor={Colors.textMuted}
                textAlign="right"
              />
            </View>

          </View>

          {/* IA Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>INTELIGÊNCIA ARTIFICIAL</Text>
              <View style={styles.providerBadge}>
                <Text style={styles.providerBadgeText}>Ollama Cloud</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Modelo ativo</Text>
            <View style={styles.chipGroup}>
              {MODEL_PRESETS.map((m) => {
                const selected = ollamaModel === m.id;
                const cs = CHIP_STYLES[m.chip];
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.chip,
                      { backgroundColor: cs.bg },
                      selected && styles.chipSelected,
                    ]}
                    onPress={() => setOllamaModel(m.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: cs.text }]}>
                      {m.label}{selected ? '  ✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>API Key</Text>
              <TextInput
                style={[styles.rowInput, styles.monoInput]}
                value={ollamaApiKey}
                onChangeText={setOllamaApiKey}
                placeholder="••••••••••••"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textAlign="right"
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Instrução adicional (system prompt)</Text>
            <TextInput
              style={styles.systemPromptInput}
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              placeholder={`Opcional. Ex: "O caderno usa ponto como separador decimal. Ignore linhas riscadas."`}
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              autoCapitalize="sentences"
              autoCorrect
              textAlignVertical="top"
            />
            <Text style={styles.systemPromptHint}>
              Enviada ao modelo antes do prompt principal. Use para adaptar a leitura ao layout do seu caderno.
            </Text>
          </View>

          {/* Sobre Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SOBRE</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Versão</Text>
              <Text style={styles.rowValue}>{APP_VERSION}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Dados locais</Text>
              <TouchableOpacity onPress={openClearModal} activeOpacity={0.7}>
                <Text style={styles.dangerLink}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Configurações'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Clear Data Modal */}
      <Modal
        visible={clearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeClearModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>

            {clearStep === 'warning' ? (
              <>
                <View style={styles.modalWarningIcon}>
                  <Text style={styles.modalWarningEmoji}>⚠️</Text>
                </View>
                <Text style={styles.modalTitle}>Limpar dados locais</Text>
                <Text style={styles.modalSubtitle}>
                  Esta ação é <Text style={styles.bold}>permanente e irreversível.</Text>{'\n'}
                  Os seguintes dados serão apagados:
                </Text>

                <View style={styles.modalBulletList}>
                  <BulletItem text="Todos os lançamentos financeiros" />
                  <BulletItem text="Todos os períodos e histórico" />
                  <BulletItem text="Fotos escaneadas pela IA" />
                </View>

                <View style={styles.modalKeepBox}>
                  <Text style={styles.modalKeepText}>
                    Suas configurações (nome do condomínio, modelo de IA e API Key) serão mantidas.
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeClearModal} activeOpacity={0.8}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalNextBtn} onPress={advanceToConfirm} activeOpacity={0.8}>
                    <Text style={styles.modalNextText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalWarningIcon}>
                  <Text style={styles.modalWarningEmoji}>🔐</Text>
                </View>
                <Text style={styles.modalTitle}>Confirmar exclusão</Text>
                <Text style={styles.modalSubtitle}>
                  Digite{' '}
                  <Text style={styles.boldRed}>{CLEAR_KEYWORD}</Text>
                  {' '}abaixo para confirmar:
                </Text>

                <TextInput
                  ref={confirmInputRef}
                  style={[
                    styles.confirmInput,
                    canConfirm && styles.confirmInputValid,
                  ]}
                  value={clearInput}
                  onChangeText={setClearInput}
                  placeholder={CLEAR_KEYWORD}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={canConfirm ? handleConfirmClear : undefined}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={closeClearModal}
                    disabled={clearing}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalDestructiveBtn,
                      (!canConfirm || clearing) && styles.modalDestructiveBtnDisabled,
                    ]}
                    onPress={handleConfirmClear}
                    disabled={!canConfirm || clearing}
                    activeOpacity={0.85}
                  >
                    {clearing ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.modalDestructiveText}>Apagar tudo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 14,
  },

  providerBadge: {
    backgroundColor: Colors.chipBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  providerBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.chipBlueText },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    minHeight: 32,
  },
  rowLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  rowInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 4,
    marginLeft: 12,
  },
  rowValue: { fontSize: 14, color: Colors.textSecondary },
  monoInput: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  divider: { height: 1, backgroundColor: Colors.borderSoft, marginVertical: 8 },

  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, marginTop: 2 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: { borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700' },

  systemPromptInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    minHeight: 88,
    backgroundColor: Colors.surfaceMuted,
  },
  systemPromptHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },

  dangerLink: { color: Colors.expense, fontSize: 14, fontWeight: '700' },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalWarningIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.expenseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalWarningEmoji: { fontSize: 28 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  boldRed: { fontWeight: '800', color: Colors.expense, letterSpacing: 1 },

  modalBulletList: { marginBottom: 14, gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.expense,
  },
  bulletText: { fontSize: 14, color: Colors.textPrimary },

  modalKeepBox: {
    backgroundColor: Colors.revenueSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  modalKeepText: {
    fontSize: 12,
    color: Colors.revenue,
    lineHeight: 18,
  },

  confirmInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: Colors.surfaceMuted,
  },
  confirmInputValid: {
    borderColor: Colors.expense,
    backgroundColor: Colors.expenseSoft,
    color: Colors.expense,
  },

  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.borderSoft,
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  modalNextBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalNextText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  modalDestructiveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.expense,
  },
  modalDestructiveBtnDisabled: { opacity: 0.35 },
  modalDestructiveText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
