import '../../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiProvider } from '@/lib/api';
import { palette } from '@/components/ui';

export default function RootLayout() {
  return <ApiProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} /></ApiProvider>;
}
