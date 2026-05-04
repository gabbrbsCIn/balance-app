import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { TransactionFormScreen } from '../screens/TransactionFormScreen';
import { ReviewExtractedScreen } from '../screens/ReviewExtractedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="TransactionForm"
        component={TransactionFormScreen}
        options={({ route }) => ({
          title: route.params.transaction ? 'Editar Transação' : 'Nova Transação',
        })}
      />
      <Stack.Screen
        name="ReviewExtracted"
        component={ReviewExtractedScreen}
        options={{ title: 'Escanear Caderno' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Configurações' }}
      />
    </Stack.Navigator>
  );
}
