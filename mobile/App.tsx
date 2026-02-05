import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import Navigation from './src/navigation';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar style="light" />
      <Navigation />
    </View>
  );
}
