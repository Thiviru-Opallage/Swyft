import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/components/ui';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: palette.accent, tabBarInactiveTintColor: palette.muted, tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: palette.line, height: 64, paddingTop: 7 }, tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }, animation: 'none' }}>
    <Tabs.Screen name="index" options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="appointments" options={{ title: 'Appointments', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
  </Tabs>;
}
