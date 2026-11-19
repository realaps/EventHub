'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BuildInfo } from '@/lib/buildInfo';
import {
  addEvent,
  canManage,
  CATEGORIES,
  filterEvents,
  findUser,
  initialState,
  isOwner,
  loadState,
  login,
  organiserStats,
  saveState,
  seatsLeft,
  SESSION_KEY,
  signup,
  updateEvent,
  userRegistration,
  type AppState,
  type Category,
  type EventItem,
  type User,
} from '@/lib/store';
import AuthScreen from './AuthScreen';
import EventForm from './EventForm';
import EventModal from './EventModal';
import OrganiserDashboard from './OrganiserDashboard';
import StudentMyEvents from './StudentMyEvents';
import { formatDate } from './ui';

type Tab = 'events' | 'mine' | 'dashboard';

export default function EventHubApp({ buildInfo }: { buildInfo: BuildInfo }) {
  const [state, setState] = useState<AppState>(initialState);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('events');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [onlyMine, setOnlyMine] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<'new' | EventItem | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Load saved data and session once in the browser (localStorage is not available on the server).
  useEffect(() => {
    setState(loadState());
    try {
      setUserId(window.localStorage.getItem(SESSION_KEY));
    } catch {
      /* storage blocked */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (userId) window.localStorage.setItem(SESSION_KEY, userId);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage blocked */
    }
  }, [userId, loaded]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const user = findUser(state, userId);

  const visible = useMemo(() => {
    const list = filterEvents(state.events, query, category);
    return onlyMine && user ? list.filter((e) => canManage(e, user)) : list;
  }, [state.events, query, category, onlyMine, user]);

  /** Run a state change; show a toast; return true on success. */
  function act(fn: () => AppState, success: string): boolean {
    try {
      setState(fn());
      setToast({ kind: 'ok', text: success });
      return true;
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' });
      return false;
    }
  }

  async function handleLogin(email: string, password: string) {
    const u = await login(state, email, password);
    setUserId(u.id);
    setTab('events');
    setToast({ kind: 'ok', text: `Welcome back, ${u.name}.` });
  }

  async function handleSignup(input: Parameters<typeof signup>[1]) {
    const { state: next, user: u } = await signup(state, input);
    setState(next);
    setUserId(u.id);
    setTab('events');
    setToast({ kind: 'ok', text: `Account created. Welcome, ${u.name}!` });
  }

  function logout() {
    setUserId(null);
    setOpenId(null);
    setFormFor(null);
    setOnlyMine(false);
  }

  function resetDemo() {
    if (!window.confirm('Reset all demo data (accounts, events, registrations, requests)?')) return;
    setState(initialState());
    logout();
  }

  const header = (
    <header className="topbar">
      <div className="brand">
        <span className="logo">EH</span>
        <div>
          <h1>EventHub</h1>
          <p>College Event Management Portal</p>
        </div>
      </div>
      {user && (
        <nav className="tabs" aria-label="Sections">
          <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Events</button>
          {user.role === 'student' ? (
            <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
              My Events <span className="badge">{state.registrations.filter((r) => r.userId === user.id).length}</span>
            </button>
          ) : (
            <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
              Dashboard {(() => {
                const s = organiserStats(state, user);
                const n = s.pendingVolunteers + s.pendingCoOrganisers;
                return n > 0 ? <span className="badge warn">{n}</span> : null;
              })()}
            </button>
          )}
        </nav>
      )}
      {user && (
        <div className="who">
          <span className={`role-tag ${user.role}`}>{user.role === 'organiser' ? 'Organiser' : 'Student'}</span>
          <span className="who-name" data-testid="who">{user.name}</span>
          <button className="btn ghost small" onClick={logout}>Log out</button>
        </div>
      )}
      <span className="version" title={`Served by ${buildInfo.hostname}`} data-testid="version">
        {buildInfo.version}
        {buildInfo.color !== 'none' ? ` · ${buildInfo.color}` : ''}
      </span>
    </header>
  );

  const openEvent = openId ? state.events.find((e) => e.id === openId) : undefined;

  return (
    <div className={`shell track-${buildInfo.color}`}>
      {header}

      {!loaded ? null : !user ? (
        <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />
      ) : (
        <main>
          {tab === 'events' && (
            <>
              <div className="toolbar">
                <input className="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, venue or keyword" aria-label="Search events" />
                <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'All')} aria-label="Filter by category">
                  <option value="All">All categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {user.role === 'organiser' && (
                  <>
                    <label className="check inline">
                      <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Only events I manage
                    </label>
                    <button className="btn primary" onClick={() => setFormFor('new')}>+ Create event</button>
                  </>
                )}
              </div>
              {visible.length === 0 ? (
                <p className="empty">No events match.</p>
              ) : (
                <div className="grid">
                  {visible.map((ev) => (
                    <EventCard key={ev.id} ev={ev} state={state} user={user} onOpen={() => setOpenId(ev.id)} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mine' && user.role === 'student' && <StudentMyEvents state={state} user={user} onOpen={setOpenId} />}

          {tab === 'dashboard' && user.role === 'organiser' && (
            <OrganiserDashboard state={state} user={user} act={act} onCreate={() => setFormFor('new')} onOpen={setOpenId} />
          )}
        </main>
      )}

      {user && openEvent && (
        <EventModal
          key={openEvent.id}
          event={openEvent}
          state={state}
          user={user}
          act={act}
          onEdit={() => { setFormFor(openEvent); setOpenId(null); }}
          onClose={() => setOpenId(null)}
        />
      )}

      {user && formFor && (
        <EventForm
          event={formFor === 'new' ? undefined : formFor}
          onClose={() => setFormFor(null)}
          onSubmit={(input) =>
            formFor === 'new'
              ? act(() => addEvent(state, user, input), `Event "${input.title.trim()}" created.`)
              : act(() => updateEvent(state, user, formFor.id, input), 'Event updated.')
          }
        />
      )}

      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}

      <footer>
        EventHub prototype · data and accounts are stored in this browser only ·{' '}
        <button className="linkish" onClick={resetDemo}>Reset demo data</button> · Pod: {buildInfo.hostname}
      </footer>
    </div>
  );
}

function EventCard({ ev, state, user, onOpen }: { ev: EventItem; state: AppState; user: User; onOpen: () => void }) {
  const left = seatsLeft(state, ev.id);
  const owner = findUser(state, ev.ownerId);
  const reg = user.role === 'student' ? userRegistration(state, ev.id, user.id) : undefined;
  const mine = isOwner(ev, user);
  const co = !mine && canManage(ev, user);
  return (
    <article className="card" data-testid="event-card">
      <div className="card-top">
        <span className={`chip chip-${ev.category.toLowerCase()}`}>{ev.category}</span>
        <span className="seats">{left > 0 ? `${left} seats left` : 'Full'}</span>
      </div>
      <h3>{ev.title}</h3>
      <p className="meta">{formatDate(ev.date, ev.time)}</p>
      <p className="meta">{ev.venue}</p>
      <p className="meta small">by {owner?.organisation ?? owner?.name}</p>
      <div className="tags">
        {ev.isGroupEvent && <span className="chip chip-group">Team {ev.minTeamSize}-{ev.maxTeamSize}</span>}
        {reg && <span className="chip chip-ok">{reg.type === 'group' ? `Team ${reg.teamName}` : 'Registered'}</span>}
        {mine && <span className="chip chip-owner">Your event</span>}
        {co && <span className="chip chip-owner">Co-organiser</span>}
      </div>
      <div className="actions">
        <button className="btn primary" onClick={onOpen}>
          {user.role === 'student' ? (reg ? 'View registration' : 'View & join') : mine ? 'Manage' : 'View'}
        </button>
      </div>
    </article>
  );
}
