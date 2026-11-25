import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, InlineError, palette } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function SignIn() {
  const { login, register } = useApi();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError('');
    try { if (mode === 'login') await login(email, password); else await register(name, email, password); router.back(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <SafeAreaView className="flex-1 bg-paper"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerClassName="flex-grow px-6 pb-8" keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button" className="mt-4 h-12 w-12 items-center justify-center rounded-full border border-line bg-surface"><Icon name="arrow-back" /></Pressable>
    <Text className="mt-12 text-[39px] leading-[45px] text-ink" style={{ fontFamily: 'Georgia' }}>{mode === 'login' ? 'Good to see you' : 'Make room for better days'}</Text>
    <Text className="mb-9 mt-3 text-base leading-6 text-secondary">{mode === 'login' ? 'Sign in to manage your appointments' : 'Create your Swyft account to get started'}</Text>
    {mode === 'register' ? <View className="mb-5"><Text className="mb-2 text-sm font-medium text-ink">Name</Text><TextInput value={name} onChangeText={setName} autoComplete="name" placeholder="Your name" placeholderTextColor={palette.muted} className="h-14 rounded-xl border border-line bg-surface px-4 text-base text-ink" /></View> : null}
    <View className="mb-5"><Text className="mb-2 text-sm font-medium text-ink">Email</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" placeholderTextColor={palette.muted} className="h-14 rounded-xl border border-line bg-surface px-4 text-base text-ink" /></View>
    <View className="mb-2"><Text className="mb-2 text-sm font-medium text-ink">Password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} placeholderTextColor={palette.muted} className="h-14 rounded-xl border border-line bg-surface px-4 text-base text-ink" /></View>
    {error ? <InlineError message={error} /> : null}
    <View className="mt-7"><Button title={mode === 'login' ? 'Sign in' : 'Create account'} loading={busy} onPress={() => { void submit(); }} /></View>
    <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="mt-6 min-h-12 items-center justify-center"><Text className="text-base text-secondary">{mode === 'login' ? 'New to Swyft? Create an account' : 'Already have an account? Sign in'}</Text></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
