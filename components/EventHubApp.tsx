'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BuildInfo } from '@/lib/buildInfo';
import {
  addEvent,
  CATEGORIES,
  filterEvents,
  initialState,
  isRegistered,
  loadState,
  myEvents,
  register,
  registrationCount,
  removeEvent,
  saveState,
  seatsLeft,
  stats,
  unregister,
  type AppState,
  type Category,
  type EventItem,
  type NewEventInput,
} from '@/lib/store';

type Tab = 'events' | 'mine' | 'organizer';

const STUDENT_KEY = 'eventhub:student';

const EMPTY_FORM: NewEventInput = {
  title: '',
  category: 'Technical',
  date: '',
  time: '10:00',
  venue: '',
  description: '',
  capacity: 50,
};

function formatDate(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return `${date} ${time}`;
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EventHubApp({ buildInfo }: { buildInfo: BuildInfo }) {
  const [state, setState] = useState<AppState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('events');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [student, setStudent] = useState('');
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [form, setForm] = useState<NewEventInput>(EMPTY_FORM);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Load saved data once in the browser (localStorage is not available on the server).
  useEffect(() => {
    setState(loadState());
    setStudent(window.localStorage.getItem(STUDENT_KEY) ?? '');
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STUDENT_KEY, student);
  }, [student, loaded]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => filterEvents(state.events, query, category), [state.events, query, category]);
  const mine = useMemo(() => myEvents(state, student), [state, student]);
  const totals = stats(state);

  function run(action: () => AppState, success: string) {
    try {
      setState(action());
      setToast({ kind: 'ok', text: success });
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  }

  function handleRegister(ev: EventItem) {
    run(() => register(state, ev.id, student), `Registered for ${ev.title}.`);
  }

  function handleUnregister(ev: EventItem) {
    run(() => unregister(state, ev.id, student), `Registration for ${ev.title} cancelled.`);
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    run(() => {
      const next = addEvent(state, form);
      setForm(EMPTY_FORM);
      return next;
    }, `Event "${form.title.trim()}" created.`);
  }

  function handleRemove(ev: EventItem) {
    if (!window.confirm(`Remove "${ev.title}" and its registrations?`)) return;
    run(() => removeEvent(state, ev.id), `Event "${ev.title}" removed.`);
    if (selected?.id === ev.id) setSelected(null);
  }

  function handleReset() {
    if (!window.confirm('Reset all demo data to the sample events?')) return;
    setState(initialState());
    setToast({ kind: 'ok', text: 'Demo data reset.' });
  }

  function renderCard(ev: EventItem) {
    const count = registrationCount(state, ev.id);
    const left = seatsLeft(state, ev.id);
    const registered = student.trim() !== '' && isRegistered(state, ev.id, student);
    return (
      <article key={ev.id} className="card" data-testid="event-card">
        <div className="card-top">
          <span className={`chip chip-${ev.category.toLowerCase()}`}>{ev.category}</span>
          <span className="seats">{left > 0 ? `${left} seats left` : 'Full'}</span>
        </div>
        <h3>{ev.title}</h3>
        <p className="meta">{formatDate(ev.date, ev.time)}</p>
        <p className="meta">{ev.venue}</p>
        <p className="count">{count} registered</p>
        <div className="actions">
          <button className="btn ghost" onClick={() => setSelected(ev)}>Details</button>
          {registered ? (
            <button className="btn danger" onClick={() => handleUnregister(ev)}>Cancel</button>
          ) : (
            <button className="btn primary" onClick={() => handleRegister(ev)} disabled={left <= 0}>
              Register
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className={`shell track-${buildInfo.color}`}>
      <header className="topbar">
        <div className="brand">
          <span className="logo">EH</span>
          <div>
            <h1>EventHub</h1>
            <p>College Event Management Portal</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Events</button>
          <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
            My Events <span className="badge">{mine.length}</span>
          </button>
          <button className={tab === 'organizer' ? 'active' : ''} onClick={() => setTab('organizer')}>Organizer</button>
        </nav>
        <span className="version" title={`Served by ${buildInfo.hostname}`} data-testid="version">
          {buildInfo.version}
          {buildInfo.color !== 'none' ? ` · ${buildInfo.color}` : ''}
        </span>
      </header>

      <section className="student-bar">
        <label htmlFor="student">Demo student name</label>
        <input
          id="student"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          placeholder="e.g. Demo Student 1"
        />
        <small>Prototype only: no login. Change the name to act as a different student.</small>
      </section>

      <main>
        {tab === 'events' && (
          <>
            <div className="toolbar">
              <input
                className="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, venue or keyword"
                aria-label="Search events"
              />
              <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'All')} aria-label="Filter by category">
                <option value="All">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {visible.length === 0 ? (
              <p className="empty">No events match your search.</p>
            ) : (
              <div className="grid">{visible.map(renderCard)}</div>
            )}
          </>
        )}

        {tab === 'mine' && (
          <>
            <h2>My Events</h2>
            {student.trim() === '' ? (
              <p className="empty">Enter a demo student name above to see your registrations.</p>
            ) : mine.length === 0 ? (
              <p className="empty">{student.trim()} has not registered for any events yet.</p>
            ) : (
              <div className="grid">{mine.map(renderCard)}</div>
            )}
          </>
        )}

        {tab === 'organizer' && (
          <>
            <div className="stats">
              <div><strong>{totals.totalEvents}</strong><span>Events</span></div>
              <div><strong>{totals.totalRegistrations}</strong><span>Registrations</span></div>
              <div><strong>{totals.uniqueStudents}</strong><span>Students</span></div>
            </div>

            <div className="organizer">
              <form className="panel" onSubmit={handleCreate}>
                <h2>Create event</h2>
                <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
                <label>Category
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <div className="row">
                  <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
                  <label>Time<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required /></label>
                </div>
                <label>Venue<input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required /></label>
                <label>Capacity<input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
                <label>Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <button className="btn primary" type="submit">Create event</button>
              </form>

              <div className="panel">
                <div className="panel-head">
                  <h2>Manage events</h2>
                  <button className="btn ghost small" onClick={handleReset}>Reset demo data</button>
                </div>
                <table>
                  <thead>
                    <tr><th>Event</th><th>Date</th><th>Registered</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filterEvents(state.events, '', 'All').map((ev) => (
                      <tr key={ev.id}>
                        <td>{ev.title}<br /><small>{ev.category} · {ev.venue}</small></td>
                        <td>{ev.date}</td>
                        <td>{registrationCount(state, ev.id)} / {ev.capacity}</td>
                        <td><button className="btn danger small" onClick={() => handleRemove(ev)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {selected && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className={`chip chip-${selected.category.toLowerCase()}`}>{selected.category}</span>
            <h2>{selected.title}</h2>
            <p className="meta">{formatDate(selected.date, selected.time)} · {selected.venue}</p>
            <p>{selected.description || 'No description provided.'}</p>
            <p className="meta">
              {registrationCount(state, selected.id)} registered · {seatsLeft(state, selected.id)} of {selected.capacity} seats left
            </p>
            <div className="registrants">
              <strong>Registered students (demo):</strong>{' '}
              {state.registrations.filter((r) => r.eventId === selected.id).map((r) => r.studentName).join(', ') || 'None yet'}
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}

      <footer>
        EventHub prototype · data is stored in this browser only (localStorage) · Pod: {buildInfo.hostname}
      </footer>
    </div>
  );
}
