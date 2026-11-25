import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const baseUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
const key = 'swyft-refresh-token';
const pushKey = 'swyft-push-token';
export type User = { id: string; name: string; email: string; role: 'CUSTOMER' | 'OWNER' };
export type Service = { id: string; name: string; description: string; durationMinutes: number; priceCents: number; currency: string };
export type Staff = { id: string; name: string };
export type Slot = { startsAt: string; label: string; available: boolean };
export type Booking = { id: string; startsAt: string; endsAt: string; status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'; service: Service; staff: Staff };
type Session = { user: User; accessToken: string; refreshToken: string };
type ApiContextValue = {
  user: User | null;
  ready: boolean;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerForPush: () => Promise<void>;
};
const ApiContext = createContext<ApiContextValue | null>(null);

async function readRefresh() { return Platform.OS === 'web' ? localStorage.getItem(key) : SecureStore.getItemAsync(key); }
async function writeRefresh(value: string | null) {
  if (Platform.OS === 'web') { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); }
  else if (value) await SecureStore.setItemAsync(key, value); else await SecureStore.deleteItemAsync(key);
}
async function readPushToken() { return Platform.OS === 'web' ? localStorage.getItem(pushKey) : SecureStore.getItemAsync(pushKey); }
async function writePushToken(value: string) {
  if (Platform.OS === 'web') localStorage.setItem(pushKey, value);
  else await SecureStore.setItemAsync(pushKey, value);
}
async function raw<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  } catch { throw new Error(`Cannot reach Swyft at ${baseUrl}. Check the API URL and that the server is running`); }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: response.status });
  return data as T;
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const accept = useCallback(async (session: Session) => {
    setUser(session.user); setAccess(session.accessToken); setRefresh(session.refreshToken);
    await writeRefresh(session.refreshToken);
    const pushToken = await readPushToken();
    if (pushToken) await raw('/devices', { method: 'POST', body: JSON.stringify({ pushToken }) }, session.accessToken).catch(() => undefined);
  }, []);
  const renew = useCallback(async (token: string) => {
    const session = await raw<Session>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: token }) });
    await accept(session);
    return session.accessToken;
  }, [accept]);
  useEffect(() => { void (async () => {
    try { const stored = await readRefresh(); if (stored) await renew(stored); }
    catch { await writeRefresh(null); }
    finally { setReady(true); }
  })(); }, [renew]);
  const request = useCallback(async <T,>(path: string, options: RequestInit = {}) => {
    try { return await raw<T>(path, options, access || undefined); }
    catch (error) {
      if ((error as { status?: number }).status === 401 && refresh) return raw<T>(path, options, await renew(refresh));
      throw error;
    }
  }, [access, refresh, renew]);
  const login = async (email: string, password: string) => accept(await raw<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
  const register = async (name: string, email: string, password: string) => accept(await raw<Session>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }));
  const logout = async () => {
    const pushToken = await readPushToken();
    if (pushToken && access) await raw('/devices', { method: 'DELETE', body: JSON.stringify({ pushToken }) }, access).catch(() => undefined);
    if (refresh) await raw('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) }).catch(() => undefined);
    setUser(null); setAccess(null); setRefresh(null); await writeRefresh(null);
  };
  const registerForPush = async () => {
    if (Platform.OS === 'web') return;
    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return;
    const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await request('/devices', { method: 'POST', body: JSON.stringify({ pushToken }) });
    await writePushToken(pushToken);
  };
  return <ApiContext.Provider value={{ user, ready, request, login, register, logout, registerForPush }}>{children}</ApiContext.Provider>;
}
export function useApi() {
  const value = useContext(ApiContext);
  if (!value) throw new Error('ApiProvider missing');
  return value;
}
export const money = (cents: number, currency = 'LKR') => new Intl.NumberFormat('en-LK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
export const dateTime = (iso: string) => new Intl.DateTimeFormat('en-LK', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
