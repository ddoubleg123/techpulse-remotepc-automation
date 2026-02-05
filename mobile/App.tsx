import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Navigation from './src/navigation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    async function prepare() {
      // Add any initialization logic here (fonts, data loading, etc.)
      // For now, just hide splash after a brief delay
      await new Promise(resolve => setTimeout(resolve, 500));
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Navigation />
    </View>
  );
}
