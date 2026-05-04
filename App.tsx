import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDatabase } from './src/hooks/useDatabase';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors } from './src/constants/colors';

export default function App() {
  const { ready, error } = useDatabase();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao inicializar banco de dados.</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (!ready) {
    return <View style={styles.center} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: { fontSize: 16, fontWeight: '600', color: Colors.expense, textAlign: 'center' },
  errorDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
