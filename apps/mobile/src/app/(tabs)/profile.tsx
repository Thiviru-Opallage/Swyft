import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Page, Heading, Button, Icon, palette } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function Profile() {
  const { user, logout } = useApi();
  return <Page><Heading title="Account" subtitle="The details behind your bookings" />
    {user ? <><View className="rounded-2xl border border-line bg-surface p-6"><View className="mb-5 h-12 w-12 items-center justify-center rounded-full bg-accentSoft"><Icon name="person-outline" color={palette.accent} /></View><Text className="text-xl text-ink" style={{ fontFamily: 'Georgia' }}>{user.name}</Text><Text className="mt-1 text-base text-secondary">{user.email}</Text></View><View className="mt-6"><Button title="Sign out" variant="secondary" onPress={() => { void logout(); }} /></View></> : <><View className="rounded-2xl border border-line bg-surface p-6"><Text className="text-lg font-medium text-ink">A simpler way to book</Text><Text className="mt-2 text-base leading-6 text-secondary">Create an account to save your appointments and change them whenever you need to</Text></View><View className="mt-6"><Button title="Sign in or create account" onPress={() => router.push('/sign-in')} /></View></>}
  </Page>;
}
