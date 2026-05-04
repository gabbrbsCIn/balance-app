import React from 'react';
import { Alert } from 'react-native';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function showConfirm({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}: Props) {
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}
