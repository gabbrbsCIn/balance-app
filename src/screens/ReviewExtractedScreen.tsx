import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, ActivityIndicator, Image, Modal, Animated,
} from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants/colors';
import { ExtractedTransaction, TransactionType } from '../types/models';
import { extractTransactionsFromImage } from '../services/aiService';
import { ddmmyyyyToISO } from '../utils/periodUtils';
import { createTransactionsBatch } from '../db/repositories/transactionsRepository';
import { createPhoto, updatePhotoAiResponse } from '../db/repositories/photosRepository';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/formatCurrency';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewExtracted'>;

type EditableTransaction = ExtractedTransaction & { _key: string; _valid: boolean };

export function ReviewExtractedScreen({ route, navigation }: Props) {
  const { periodId } = route.params;
  const { settings } = useSettings();
  const [step, setStep] = useState<'pick' | 'processing' | 'review'>('pick');
  const [extracted, setExtracted] = useState<EditableTransaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [imageState, setImageState] = useState<'collapsed' | 'expanded' | 'fullscreen'>('collapsed');
  const [isZoomed, setIsZoomed] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const savedScale = useRef(1);

  const onPinchGestureEvent = useCallback((event: any) => {
    const next = Math.min(Math.max(savedScale.current * event.nativeEvent.scale, 1), 5);
    scaleValue.setValue(next);
  }, [scaleValue]);

  const onPinchStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const next = Math.min(Math.max(savedScale.current * event.nativeEvent.scale, 1), 5);
      savedScale.current = next;
      scaleValue.setValue(next);
      setIsZoomed(next > 1.05);
    }
  }, [scaleValue]);

  const resetZoom = useCallback(() => {
    savedScale.current = 1;
    scaleValue.setValue(1);
    setIsZoomed(false);
  }, [scaleValue]);

  const handleCloseModal = useCallback(() => {
    resetZoom();
    setImageState('expanded');
  }, [resetZoom]);

  const handlePickImage = useCallback(async () => {
    if (!settings?.ollama_model || !settings?.ollama_api_key) {
      Alert.alert('Ollama não configurado', 'Configure o modelo e a API Key em Configurações.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: false,
    });
    if (result.canceled || !result.assets[0]) return;

    processImage(result.assets[0].uri);
  }, [settings]);

  const handleCamera = useCallback(async () => {
    if (!settings?.ollama_model || !settings?.ollama_api_key) {
      Alert.alert('Ollama não configurado', 'Configure o modelo e a API Key em Configurações.');
      return;
    }

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão negada', 'Acesso à câmera é necessário.'); return; }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9, base64: false });
    if (result.canceled || !result.assets[0]) return;

    processImage(result.assets[0].uri);
  }, [settings]);

  const processImage = useCallback(async (uri: string) => {
    setStep('processing');
    try {
      const dest = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      setPhotoUri(dest);

      const base64 = await FileSystem.readAsStringAsync(dest, { encoding: 'base64' });
      const raw = JSON.stringify({ uri: dest });

      const items = await extractTransactionsFromImage(
        base64,
        'image/jpeg',
        settings!.ollama_model,
        settings!.ollama_api_key!,
        settings!.ai_system_prompt,
      );
      setRawResponse(JSON.stringify(items));

      const editable: EditableTransaction[] = items.map((item, i) => ({
        ...item,
        _key: String(i),
        _valid: !!item.date && item.amount !== null && item.amount > 0,
      }));

      setExtracted(editable);
      setStep('review');
    } catch (e: any) {
      setStep('pick');
      Alert.alert('Erro ao processar', e?.message ?? 'Verifique sua conexão e chave API.');
    }
  }, [settings]);

  const updateItem = useCallback((key: string, field: keyof ExtractedTransaction, value: string) => {
    setExtracted((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item;
        const updated = { ...item, [field]: field === 'amount' ? parseFloat(value) || null : value };
        const valid = !!updated.date && updated.amount !== null && updated.amount > 0;
        return { ...updated, _valid: valid };
      })
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setExtracted((prev) => prev.filter((item) => item._key !== key));
  }, []);

  const handleSave = useCallback(async () => {
    const valid = extracted.filter((item) => item._valid);
    if (valid.length === 0) { Alert.alert('Atenção', 'Nenhuma transação válida para salvar.'); return; }

    setSaving(true);
    try {
      const photo = await createPhoto({ period_id: periodId, uri: photoUri! });
      await updatePhotoAiResponse(photo.id, rawResponse);
      await createTransactionsBatch(
        valid.map((item) => ({
          period_id: periodId,
          date: ddmmyyyyToISO(item.date!) ?? item.date!,
          description: item.description,
          amount: item.amount!,
          type: item.type,
          source: 'ai' as const,
        }))
      );
      Alert.alert('Sucesso', `${valid.length} transação(ões) importada(s).`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar as transações.');
    } finally {
      setSaving(false);
    }
  }, [extracted, periodId, photoUri, rawResponse, navigation]);

  if (step === 'pick') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Escanear Caderno</Text>
        <Text style={styles.subtitle}>
          Tire uma foto ou selecione da galeria. A IA vai extrair as transações automaticamente.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={handleCamera}>
          <Text style={styles.btnText}>📷  Abrir Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handlePickImage}>
          <Text style={[styles.btnText, { color: Colors.primary }]}>🖼️  Selecionar da Galeria</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'processing') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.processingText}>Analisando imagem com IA...</Text>
        <Text style={styles.processingHint}>Isso pode levar alguns segundos.</Text>
      </View>
    );
  }

  const validCount = extracted.filter((i) => i._valid).length;

  const listHeader = (
    <View>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>
          {extracted.length} transação(ões) encontrada(s)
        </Text>
        <Text style={styles.reviewSubtitle}>
          {validCount} válida(s) · Edite ou remova antes de confirmar
        </Text>
      </View>

      {photoUri && (
        <>
          <TouchableOpacity
            style={styles.imagePreviewCard}
            onPress={() => setImageState((s) => s === 'collapsed' ? 'expanded' : 'collapsed')}
            activeOpacity={0.8}
          >
            <View style={styles.imagePreviewHeader}>
              <Text style={styles.imagePreviewLabel}>Imagem do caderno</Text>
              <View style={styles.imagePreviewActions}>
                {imageState === 'expanded' && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setImageState('fullscreen'); }}
                    style={styles.fullscreenBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.fullscreenBtnText}>⛶ Ampliar</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.imagePreviewChevron}>
                  {imageState === 'expanded' ? '▲ Recolher' : '▼ Expandir'}
                </Text>
              </View>
            </View>
            {imageState === 'collapsed' && (
              <Image source={{ uri: photoUri }} style={styles.imageThumbnail} resizeMode="cover" />
            )}
            {imageState === 'expanded' && (
              <Image source={{ uri: photoUri }} style={styles.imageFullSize} resizeMode="contain" />
            )}
          </TouchableOpacity>

          <Modal
            visible={imageState === 'fullscreen'}
            transparent
            animationType="fade"
            onRequestClose={handleCloseModal}
          >
            <View style={styles.modalContainer}>
              {/* Área de toque para fechar — só cobre o espaço ACIMA do card */}
              <TouchableOpacity
                style={styles.modalDismissArea}
                activeOpacity={1}
                onPress={handleCloseModal}
              />
              {/* Card — View simples, sem handlers de toque que conflitem com gestos */}
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Imagem do caderno</Text>
                  <View style={styles.modalHeaderActions}>
                    {isZoomed && (
                      <TouchableOpacity
                        onPress={resetZoom}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.modalResetText}>Redefinir zoom</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleCloseModal}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.modalCloseText}>✕ Fechar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <PinchGestureHandler
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchStateChange}
                >
                  <Animated.Image
                    source={{ uri: photoUri }}
                    style={[styles.modalImage, { transform: [{ scale: scaleValue }] }]}
                    resizeMode="contain"
                  />
                </PinchGestureHandler>
                <Text style={styles.modalZoomHint}>Junte dois dedos para dar zoom</Text>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={extracted}
        keyExtractor={(item) => item._key}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, !item._valid && styles.itemCardInvalid]}>
            <View style={styles.itemRow}>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, item.type === 'revenue' && styles.typeBtnRevenue]}
                  onPress={() => updateItem(item._key, 'type', 'revenue')}
                >
                  <Text style={styles.typeBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, item.type === 'expense' && styles.typeBtnExpense]}
                  onPress={() => updateItem(item._key, 'type', 'expense')}
                >
                  <Text style={styles.typeBtnText}>-</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.dateInput}
                value={item.date ?? ''}
                onChangeText={(v) => updateItem(item._key, 'date', v)}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.amountInput}
                value={item.amount?.toString() ?? ''}
                onChangeText={(v) => updateItem(item._key, 'amount', v)}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <TouchableOpacity onPress={() => removeItem(item._key)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.descInput}
              value={item.description}
              onChangeText={(v) => updateItem(item._key, 'description', v)}
              placeholder="Descrição"
            />
            {!item._valid && (
              <Text style={styles.invalidNote}>⚠ Preencha data e valor para incluir</Text>
            )}
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || validCount === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || validCount === 0}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Salvando...' : `Confirmar ${validCount} transação(ões)`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 32, lineHeight: 20 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  processingText: { marginTop: 20, fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  processingHint: { marginTop: 8, fontSize: 13, color: Colors.textSecondary },
  reviewHeader: { marginBottom: 12 },
  reviewTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  reviewSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  imagePreviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imagePreviewLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  imagePreviewActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imagePreviewChevron: { fontSize: 11, color: Colors.primaryAccent },
  fullscreenBtn: { paddingHorizontal: 2 },
  fullscreenBtnText: { fontSize: 11, color: Colors.primaryAccent, fontWeight: '600' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalResetText: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
  modalCloseText: { fontSize: 13, color: Colors.primaryAccent, fontWeight: '600' },
  modalZoomHint: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    paddingVertical: 8,
  },
  modalImage: {
    width: '100%',
    height: 520,
    backgroundColor: Colors.surfaceMuted,
  },
  imageThumbnail: {
    width: '100%',
    height: 80,
  },
  imageFullSize: {
    width: '100%',
    height: 340,
    backgroundColor: Colors.surfaceMuted,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemCardInvalid: { borderColor: Colors.warning, backgroundColor: '#FFFDE7' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  typeToggle: { flexDirection: 'row', gap: 2 },
  typeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBtnRevenue: { backgroundColor: Colors.revenue },
  typeBtnExpense: { backgroundColor: Colors.expense },
  typeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 6,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  amountInput: {
    width: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 6,
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  removeBtn: { padding: 4 },
  removeBtnText: { color: Colors.expense, fontSize: 16, fontWeight: '700' },
  descInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  invalidNote: { fontSize: 11, color: Colors.warning, marginTop: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
