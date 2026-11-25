import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Page, Heading, Icon, InlineError, Rule, palette } from '@/components/ui';
import { money, type Service, useApi } from '@/lib/api';

export default function Explore() {
  const { request } = useApi();
  const [services, setServices] = useState<Service[]>([]);
  const [businessName, setBusinessName] = useState('Swyft');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { void (async () => {
    try {
      const [items, config] = await Promise.all([request<Service[]>('/services'), request<{ businessName: string }>('/config')]);
      setServices(items); setBusinessName(config.businessName);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  })(); }, [request]);
  return <Page>
    <View className="mt-5 flex-row items-center justify-between"><Text className="text-[22px] font-semibold text-ink">swyft<Text className="text-accent">.</Text></Text><View className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"><Icon name="time-outline" color={palette.accent} /></View></View>
    <Heading title="Make time for you" subtitle={`Book a moment at ${businessName}`} />
    <View className="mb-9 overflow-hidden rounded-2xl bg-ink px-6 pb-6 pt-7">
      <View className="mb-8 flex-row items-center justify-between"><Text className="text-sm text-[#C9DAD2]">Your next appointment starts here</Text><Icon name="arrow-forward" color="#C9DAD2" size={18} /></View>
      <Text className="max-w-[270px] text-[27px] leading-8 text-white" style={{ fontFamily: 'Georgia' }}>Good days begin with a little space.</Text>
      <View className="mt-8 flex-row items-center"><View className="h-2 w-2 rounded-full bg-[#94D4B4]" /><View className="mx-2 h-px flex-1 bg-[#7B968B]" /><View className="h-2 w-2 rounded-full bg-[#7B968B]" /><View className="mx-2 h-px flex-1 bg-[#7B968B]" /><View className="h-2 w-2 rounded-full bg-[#7B968B]" /></View>
      <View className="mt-2 flex-row justify-between"><Text className="text-xs text-[#C9DAD2]">Choose</Text><Text className="text-xs text-[#C9DAD2]">Pick a time</Text><Text className="text-xs text-[#C9DAD2]">You&apos;re set</Text></View>
    </View>
    <View className="mb-4 flex-row items-end justify-between"><Text className="text-[25px] text-ink" style={{ fontFamily: 'Georgia' }}>Services</Text><Text className="text-sm text-muted">{services.length} available</Text></View>
    {loading ? <ActivityIndicator color={palette.accent} className="mt-8" /> : null}
    {error ? <InlineError message={error} /> : null}
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      {services.map((service, index) => <View key={service.id}>{index ? <Rule /> : null}<Pressable onPress={() => router.push({ pathname: '/service/[id]', params: { id: service.id } })} accessibilityRole="button" accessibilityLabel={`Book ${service.name}, ${service.durationMinutes} minutes, ${money(service.priceCents, service.currency)}`} className="flex-row items-center px-5 py-5 active:bg-accentSoft">
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-paper"><Text className="text-sm font-medium text-accent">{String(index + 1).padStart(2, '0')}</Text></View>
        <View className="flex-1"><Text className="text-[17px] font-medium text-ink">{service.name}</Text><Text className="mt-1 text-sm text-secondary">{service.durationMinutes} min · {money(service.priceCents, service.currency)}</Text></View><Icon name="chevron-forward" color={palette.muted} size={18} />
      </Pressable></View>)}
    </View>
    <Text className="mt-4 text-sm leading-5 text-muted">Choose a service to see real availability before booking</Text>
  </Page>;
}
