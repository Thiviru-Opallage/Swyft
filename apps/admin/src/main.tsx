import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, LogOut, Scissors, X } from 'lucide-react';
import './style.css';

type Booking = { id: string; startsAt: string; endsAt: string; status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'; service: { name: string; durationMinutes: number; priceCents: number; currency: string }; staff: { name: string }; customer: { name: string; email: string } };
type Login = { user: { role: string; name: string }; accessToken: string };
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const money = (value: number, currency: string) => new Intl.NumberFormat('en-LK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value / 100);
const time = (value: string) => new Intl.DateTimeFormat('en-LK', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('swyft-owner-token') || '');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [date, setDate] = useState(dateKey(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState('');
  const request = async <T,>(path: string, options: RequestInit = {}, bearer = token): Promise<T> => {
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...options.headers } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result as T;
  };
  const load = async () => { if (!token) return; setLoading(true); try { setBookings(await request<Booking[]>(`/admin/bookings?date=${date}`)); setError(''); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [token, date]);
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true);
    try { const session = await request<Login>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, ''); if (session.user.role !== 'OWNER') throw new Error('This account does not have owner access'); sessionStorage.setItem('swyft-owner-token', session.accessToken); setToken(session.accessToken); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  const changeStatus = async (booking: Booking, status: 'COMPLETED' | 'CANCELLED') => {
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${booking.customer.name}'s ${booking.service.name} appointment?`)) return;
    setSaving(booking.id); try { await request(`/admin/bookings/${booking.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); } catch (e) { setError((e as Error).message); } finally { setSaving(''); }
  };
  const shiftDate = (days: number) => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + days); setDate(dateKey(next)); };
  if (!token) return <div className="login-page"><div className="login-brand">swyft<span>.</span></div><main className="login-panel"><div className="login-mark"><Scissors size={25} strokeWidth={1.5} /></div><h1>Your day, in order.</h1><p>Sign in to see bookings and keep the schedule moving.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <div className="error" role="alert">{error}</div>}<button disabled={loading} className="primary">{loading ? 'Signing in…' : 'Sign in'}<ArrowRight size={18} /></button></form></main><div className="login-footer">Swyft for business owners</div></div>;
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
  const completed = bookings.filter(b => b.status === 'COMPLETED');
  return <div className="shell"><aside className="sidebar"><div className="brand">swyft<span>.</span></div><div className="sidebar-rule" /><div className="nav-item active"><CalendarDays size={19} strokeWidth={1.7} /> Schedule</div><div className="sidebar-bottom"><div className="side-note">A clear view of every appointment, from the first opening to the last.</div><button className="signout" onClick={() => { sessionStorage.removeItem('swyft-owner-token'); setToken(''); }}><LogOut size={18} /> Sign out</button></div></aside><main className="main"><header className="topbar"><span>Owner workspace</span><span className="online"><i /> Schedule live</span></header><div className="content"><div className="heading"><div><h1>Appointments</h1><p>Every booking in its place</p></div><div className="today-chip"><Clock3 size={17} /> {new Intl.DateTimeFormat('en-LK', { weekday: 'long' }).format(new Date(`${date}T12:00:00`))}</div></div>
    <div className="summary"><div><span>Confirmed</span><strong>{confirmed.length}</strong><small>on this day</small></div><div><span>Completed</span><strong>{completed.length}</strong><small>on this day</small></div><div className="summary-message"><span>Schedule note</span><p>{confirmed.length ? `${confirmed.length} appointment${confirmed.length === 1 ? '' : 's'} still on the calendar.` : 'The rest of this day is open.'}</p></div></div>
    <section className="agenda"><div className="agenda-head"><div><h2>Day view</h2><p>Appointments update as bookings change</p></div><div className="date-nav"><button aria-label="Previous day" onClick={() => shiftDate(-1)}><ChevronLeft size={18} /></button><input aria-label="Selected date" type="date" value={date} onChange={e => setDate(e.target.value)} /><button aria-label="Next day" onClick={() => shiftDate(1)}><ChevronRight size={18} /></button></div></div>
      {error && <div className="error" role="alert">{error}</div>}{loading && <div className="loading">Loading appointments…</div>}
      {!loading && !bookings.length && <div className="empty"><div className="empty-icon"><CalendarDays size={27} strokeWidth={1.4} /></div><h3>No appointments today</h3><p>Bookings for this date will appear here as soon as customers confirm them.</p></div>}
      {!loading && bookings.map(booking => <article className={`booking ${booking.status.toLowerCase()}`} key={booking.id}><div className="time"><strong>{time(booking.startsAt)}</strong><span>{booking.service.durationMinutes} min</span></div><div className="timeline"><i /></div><div className="booking-main"><div className="booking-title"><h3>{booking.service.name}</h3><span className={`status ${booking.status.toLowerCase()}`}>{booking.status.toLowerCase()}</span></div><p>{booking.customer.name} <span>·</span> with {booking.staff.name}</p><small>{booking.customer.email} <span>·</span> {money(booking.service.priceCents, booking.service.currency)}</small></div>{booking.status === 'CONFIRMED' && <div className="booking-actions"><button disabled={saving === booking.id} onClick={() => void changeStatus(booking, 'COMPLETED')} title="Mark completed"><Check size={17} /> Complete</button><button disabled={saving === booking.id} onClick={() => void changeStatus(booking, 'CANCELLED')} title="Cancel booking"><X size={17} /> Cancel</button></div>}</article>)}
    </section></div></main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
