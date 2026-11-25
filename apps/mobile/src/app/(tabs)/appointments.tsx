import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Page, Heading, Button, Empty, InlineError, palette } from '@/components/ui';
import { dateTime, money, type Booking, useApi } from '@/lib/api';

export default function Appointments() {
  const { user, request } = useApi();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setItems(await request<Booking[]>('/bookings')); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [request, user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const cancel = (booking: Booking) => Alert.alert('Cancel appointment?', `Cancel ${booking.service.name} on ${dateTime(booking.startsAt)}?`, [
    { text: 'Keep appointment', style: 'cancel' },
    { text: 'Cancel appointment', style: 'destructive', onPress: () => { void request(`/bookings/${booking.id}/cancel`, { method: 'POST' }).then(load).catch(e => setError(e.message)); } },
  ]);
  const now = new Date();
  const upcoming = items.filter(x => x.status === 'CONFIRMED' && new Date(x.startsAt) >= now);
  const past = items.filter(x => x.status !== 'CONFIRMED' || new Date(x.startsAt) < now);
  const card = (booking: Booking) => <View key={booking.id} className="mb-3 rounded-2xl border border-line bg-surface p-5">
    <View className="flex-row items-start"><View className="mr-4 mt-1 h-3 w-3 rounded-full bg-accent" /><View className="flex-1"><Text className="text-lg font-medium text-ink">{booking.service.name}</Text><Text className="mt-1 text-sm text-secondary">{dateTime(booking.startsAt)}</Text><Text className="mt-1 text-sm text-muted">With {booking.staff.name} · {money(booking.service.priceCents, booking.service.currency)}</Text></View></View>
    <View className="ml-1 mt-5 border-l border-line pl-6"><Text className="text-xs font-medium text-accent">{booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}</Text></View>
    {booking.status === 'CONFIRMED' && new Date(booking.startsAt) > now ? <View className="mt-5 flex-row gap-3"><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/service/[id]', params: { id: booking.service.id, bookingId: booking.id, staffId: booking.staff.id } })} className="min-h-12 flex-1 items-center justify-center rounded-xl border border-line active:bg-paper"><Text className="font-medium text-ink">Reschedule</Text></Pressable><Pressable accessibilityRole="button" onPress={() => cancel(booking)} className="min-h-12 flex-1 items-center justify-center rounded-xl border border-line active:bg-paper"><Text className="font-medium text-danger">Cancel</Text></Pressable></View> : null}
  </View>;
  return <Page><Heading title="My appointments" subtitle="Your time, all in one place" />
    {!user ? <View><Empty icon="calendar-outline" title="No appointments yet" body="Sign in to see your bookings and make changes when plans shift" /><View className="mt-5"><Button title="Sign in" onPress={() => router.push('/sign-in')} /></View></View> : null}
    {loading ? <ActivityIndicator color={palette.accent} /> : null}{error ? <InlineError message={error} /> : null}
    {user && !loading ? <><Text className="mb-4 text-xl text-ink" style={{ fontFamily: 'Georgia' }}>Upcoming</Text>{upcoming.length ? upcoming.map(card) : <Empty icon="calendar-outline" title="Nothing on the calendar" body="Explore services to find a time that fits" />}
      {past.length ? <><Text className="mb-4 mt-8 text-xl text-ink" style={{ fontFamily: 'Georgia' }}>History</Text>{past.map(card)}</> : null}</> : null}
  </Page>;
}
