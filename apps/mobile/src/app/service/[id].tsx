import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, InlineError, palette } from '@/components/ui';
import { money, type Booking, type Service, type Slot, type Staff, useApi } from '@/lib/api';

function localDay(offset: number) {
  const day = new Date(); day.setDate(day.getDate() + offset);
  return { value: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`, short: new Intl.DateTimeFormat('en-LK', { weekday: 'short' }).format(day), number: day.getDate(), long: new Intl.DateTimeFormat('en-LK', { weekday: 'long', day: 'numeric', month: 'long' }).format(day) };
}

export default function ServiceScreen() {
  const { id, bookingId, staffId: requestedStaff } = useLocalSearchParams<{ id: string; bookingId?: string; staffId?: string }>();
  const { request, user, registerForPush } = useApi();
  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState(requestedStaff || '');
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => localDay(i)), []);
  const [day, setDay] = useState(days[0].value);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void (async () => {
    try {
      const [services, people] = await Promise.all([request<Service[]>('/services'), request<Staff[]>('/staff')]);
      setService(services.find(item => item.id === id) || null);
      setStaff(people); setStaffId(current => current || people[0]?.id || '');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  })(); }, [id, request]);
  useEffect(() => { if (!staffId || !service) return; let active = true; setSelected(''); setLoading(true);
    void request<{ slots: Slot[] }>(`/availability?date=${day}&serviceId=${id}&staffId=${staffId}`)
      .then(data => { if (active) { setSlots(data.slots); setError(''); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [day, staffId, service, id, request]);
  const confirm = async () => {
    if (!user) { router.push('/sign-in'); return; }
    if (!selected || !service) return;
    setBusy(true); setError('');
    try {
      const booking = bookingId
        ? await request<Booking>(`/bookings/${bookingId}/reschedule`, { method: 'POST', body: JSON.stringify({ startsAt: selected }) })
        : await request<Booking>('/bookings', { method: 'POST', body: JSON.stringify({ serviceId: service.id, staffId, startsAt: selected }) });
      void registerForPush().catch(() => undefined);
      router.replace({ pathname: '/confirmation/[id]', params: { id: booking.id, rescheduled: bookingId ? '1' : '0' } });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const chosenDay = days.find(d => d.value === day);
  return <SafeAreaView className="flex-1 bg-paper"><ScrollView contentContainerClassName="px-6 pb-8">
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mt-4 h-12 w-12 items-center justify-center rounded-full border border-line bg-surface"><Icon name="arrow-back" /></Pressable>
    {service ? <><Text className="mt-9 text-[34px] leading-[40px] text-ink" style={{ fontFamily: 'Georgia' }}>{service.name}</Text><Text className="mt-3 text-base leading-6 text-secondary">{service.description}</Text>
      <View className="mt-6 flex-row gap-3"><View className="flex-row items-center rounded-lg bg-accentSoft px-3 py-2"><Icon name="time-outline" color={palette.accent} size={17} /><Text className="ml-2 text-sm font-medium text-accent">{service.durationMinutes} min</Text></View><View className="rounded-lg bg-surface px-3 py-2"><Text className="text-sm font-medium text-ink">{money(service.priceCents, service.currency)}</Text></View></View>
      <View className="mt-9 h-px bg-line" /><Text className="mt-7 text-[23px] text-ink" style={{ fontFamily: 'Georgia' }}>Choose your time</Text><Text className="mt-1 text-sm text-secondary">Pick a day and a stylist</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 mt-5" contentContainerClassName="gap-2 px-6">{days.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: day === item.value }} onPress={() => setDay(item.value)} className={`h-[74px] w-[62px] items-center justify-center rounded-xl border ${day === item.value ? 'border-accent bg-accent' : 'border-line bg-surface'}`}><Text className={`text-xs ${day === item.value ? 'text-white' : 'text-muted'}`}>{item.short}</Text><Text className={`mt-1 text-lg font-medium ${day === item.value ? 'text-white' : 'text-ink'}`}>{item.number}</Text></Pressable>)}</ScrollView>
      <Text className="mb-3 mt-7 text-sm font-medium text-ink">Stylist</Text><View className="flex-row flex-wrap gap-2">{staff.map(person => <Pressable key={person.id} disabled={!!bookingId && person.id !== requestedStaff} accessibilityRole="button" accessibilityState={{ selected: staffId === person.id, disabled: !!bookingId && person.id !== requestedStaff }} onPress={() => setStaffId(person.id)} className={`min-h-12 justify-center rounded-xl border px-5 ${staffId === person.id ? 'border-accent bg-accentSoft' : 'border-line bg-surface'} ${bookingId && person.id !== requestedStaff ? 'opacity-40' : ''}`}><Text className={staffId === person.id ? 'font-medium text-accent' : 'text-ink'}>{person.name}</Text></Pressable>)}</View>
      <View className="mb-3 mt-8 flex-row items-center justify-between"><Text className="text-sm font-medium text-ink">{chosenDay?.long}</Text><Text className="text-xs text-muted">Available times</Text></View>
      {loading ? <ActivityIndicator className="my-8" color={palette.accent} /> : slots.length ? <View className="flex-row flex-wrap gap-2">{slots.map(slot => <Pressable key={slot.startsAt} disabled={!slot.available} accessibilityRole="button" accessibilityState={{ selected: selected === slot.startsAt, disabled: !slot.available }} onPress={() => setSelected(slot.startsAt)} className={`min-h-12 min-w-[88px] items-center justify-center rounded-xl border px-4 ${selected === slot.startsAt ? 'border-accent bg-accent' : slot.available ? 'border-line bg-surface' : 'border-line bg-paper opacity-40'}`}><Text className={`text-sm font-medium ${selected === slot.startsAt ? 'text-white' : 'text-ink'}`}>{slot.label}</Text></Pressable>)}</View> : <Text className="rounded-xl border border-line bg-surface p-5 text-sm text-secondary">No available times on this day. Try another date</Text>}
      {selected ? <View className="mt-8 rounded-2xl border border-line bg-surface p-5"><Text className="text-xs text-muted">Your selection</Text><Text className="mt-2 text-lg text-ink">{chosenDay?.long} · {slots.find(s => s.startsAt === selected)?.label}</Text><Text className="mt-1 text-sm text-secondary">{service.name} with {staff.find(s => s.id === staffId)?.name}</Text></View> : null}
      {error ? <InlineError message={error} /> : null}<View className="mt-6"><Button title={bookingId ? 'Confirm new time' : user ? 'Confirm booking' : 'Sign in to book'} disabled={!selected} loading={busy} onPress={() => { void confirm(); }} /></View>
    </> : loading ? <ActivityIndicator className="mt-12" color={palette.accent} /> : <InlineError message={error || 'Service not found'} />}
  </ScrollView></SafeAreaView>;
}
