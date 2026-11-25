import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const palette = { paper: '#F7F5F0', ink: '#172A2A', secondary: '#50645F', muted: '#6C7C76', line: '#DCE2DC', accent: '#006B62', danger: '#A73532' };

export function Page({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  return <SafeAreaView edges={['top']} className="flex-1 bg-paper">{scroll ? <ScrollView contentContainerClassName="px-6 pb-10" keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View className="flex-1 px-6">{children}</View>}</SafeAreaView>;
}
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View className="mb-8 mt-8"><Text className="text-[34px] leading-[40px] text-ink" style={{ fontFamily: 'Georgia' }}>{title}</Text>{subtitle ? <Text className="mt-2 text-base leading-6 text-secondary">{subtitle}</Text> : null}</View>;
}
export function Button({ title, variant = 'primary', loading, ...props }: Omit<PressableProps, 'children'> & { title: string; variant?: 'primary' | 'secondary' | 'danger'; loading?: boolean }) {
  const primary = variant === 'primary';
  return <Pressable {...props} accessibilityRole="button" disabled={props.disabled || loading} className={`min-h-14 items-center justify-center rounded-xl px-5 active:opacity-80 ${primary ? 'bg-accent' : variant === 'danger' ? 'border border-danger bg-surface' : 'border border-line bg-surface'} ${props.disabled ? 'opacity-50' : ''}`}>
    {loading ? <ActivityIndicator color={primary ? '#FFFFFF' : palette.accent} /> : <Text className={`text-base font-semibold ${primary ? 'text-white' : variant === 'danger' ? 'text-danger' : 'text-ink'}`}>{title}</Text>}
  </Pressable>;
}
export function Icon({ name, color = palette.ink, size = 20 }: { name: keyof typeof Ionicons.glyphMap; color?: string; size?: number }) { return <Ionicons name={name} size={size} color={color} />; }
export function Rule() { return <View className="h-px bg-line" />; }
export function InlineError({ message }: { message: string }) { return <Text accessibilityRole="alert" className="mt-3 text-sm leading-5 text-danger">{message}</Text>; }
export function Empty({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View className="items-center rounded-2xl border border-line bg-surface px-8 py-12"><View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-accentSoft"><Icon name={icon} color={palette.accent} size={27} /></View><Text className="text-center text-xl text-ink" style={{ fontFamily: 'Georgia' }}>{title}</Text><Text className="mt-2 text-center text-base leading-6 text-secondary">{body}</Text></View>;
}
