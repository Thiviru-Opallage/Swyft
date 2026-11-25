import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Button, Icon, InlineError, palette } from '@/components/ui';
import { dateTime, money, type Booking, useApi } from '@/lib/api';

export default function Confirmation() {
  const { id, rescheduled } = useLocalSearchParams<{ id: string; rescheduled?: string }>();
  const { request } = useApi();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void request<Booking[]>('/bookings').then(items => setBooking(items.find(item => item.id === id) || null)).catch(e => setError(e.message)); }, [id, request]);
  return <SafeAreaView className="flex-1 bg-paper"><View className="flex-1 justify-center px-6"><View className="mb-7 h-16 w-16 items-center justify-center rounded-2xl bg-accentSoft"><Icon name="checkmark" color={palette.accent} size={32} /></View><Text className="text-[37px] leading-[43px] text-ink" style={{ fontFamily: 'Georgia' }}>{rescheduled === '1' ? 'New time confirmed' : 'You’re all set'}</Text><Text className="mt-3 text-base leading-6 text-secondary">Your appointment is on the calendar</Text>
    {booking ? <Animated.View entering={FadeInDown.duration(360).reduceMotion(ReduceMotion.System)} className="mt-10 rounded-2xl border border-line bg-surface p-6"><View className="border-l-2 border-accent pl-5"><Text className="text-sm text-muted">Appointment</Text><Text className="mt-2 text-xl text-ink" style={{ fontFamily: 'Georgia' }}>{booking.service.name}</Text><Text className="mt-4 text-base text-ink">{dateTime(booking.startsAt)}</Text><Text className="mt-1 text-sm text-secondary">With {booking.staff.name} · {booking.service.durationMinutes} min</Text><Text className="mt-5 text-sm font-medium text-ink">{money(booking.service.priceCents, booking.service.currency)}</Text></View></Animated.View> : error ? <InlineError message={error} /> : <ActivityIndicator className="mt-8" color={palette.accent} />}
    <View className="mt-10"><Button title="View my appointments" onPress={() => router.replace('/(tabs)/appointments')} /><View className="mt-3"><Button title="Explore more services" variant="secondary" onPress={() => router.replace('/(tabs)')} /></View></View>
  </View></SafeAreaView>;
}
