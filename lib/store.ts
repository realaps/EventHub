// EventHub prototype data layer.
// All business rules are pure functions (easy to unit test in Jenkins).
// Persistence uses browser localStorage: prototype only, one browser, not a shared database.

export type Category = 'Technical' | 'Cultural' | 'Sports' | 'Workshop';

export const CATEGORIES: Category[] = ['Technical', 'Cultural', 'Sports', 'Workshop'];

export interface EventItem {
  id: string;
  title: string;
  category: Category;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  description: string;
  capacity: number;
}

export interface Registration {
  id: string;
  eventId: string;
  studentName: string;
  registeredAt: string; // ISO timestamp
}

export interface AppState {
  events: EventItem[];
  registrations: Registration[];
}

export const STORAGE_KEY = 'eventhub:v1';

// Demo data: clearly sample events, no real student information.
export const SAMPLE_EVENTS: EventItem[] = [
  {
    id: 'evt-tech-symposium',
    title: 'Tech Symposium',
    category: 'Technical',
    date: '2026-12-05',
    time: '10:00',
    venue: 'Main Auditorium',
    description: 'Student technical talks and a final-year project showcase. Open to all departments.',
    capacity: 200,
  },
  {
    id: 'evt-hackathon',
    title: 'Campus Hackathon',
    category: 'Technical',
    date: '2026-12-12',
    time: '09:00',
    venue: 'Tech Park, Lab 4',
    description: 'A 24-hour team-based coding event. Teams of 2 to 4 build a solution to a campus problem.',
    capacity: 120,
  },
  {
    id: 'evt-cultural-night',
    title: 'Cultural Night',
    category: 'Cultural',
    date: '2026-12-18',
    time: '18:00',
    venue: 'Open Air Theatre',
    description: 'Music, dance and stage performances by student clubs.',
    capacity: 500,
  },
  {
    id: 'evt-sports-meet',
    title: 'Inter-College Sports Meet',
    category: 'Sports',
    date: '2027-01-08',
    time: '07:30',
    venue: 'University Ground',
    description: 'College-level competitions in athletics, football, basketball and volleyball.',
    capacity: 300,
  },
  {
    id: 'evt-devops-workshop',
    title: 'Docker & Kubernetes Workshop',
    category: 'Workshop',
    date: '2027-01-15',
    time: '14:00',
    venue: 'Seminar Hall 2',
    description: 'Hands-on session on containers, Kubernetes Deployments and CI/CD with Jenkins.',
    capacity: 60,
  },
];

export function initialState(): AppState {
  return { events: SAMPLE_EVENTS.map((e) => ({ ...e })), registrations: [] };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- Queries ----------

export function filterEvents(events: EventItem[], query: string, category: Category | 'All'): EventItem[] {
  const q = query.trim().toLowerCase();
  return events
    .filter((e) => category === 'All' || e.category === category)
    .filter(
      (e) =>
        q === '' ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function registrationCount(state: AppState, eventId: string): number {
  return state.registrations.filter((r) => r.eventId === eventId).length;
}

export function seatsLeft(state: AppState, eventId: string): number {
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return 0;
  return Math.max(0, ev.capacity - registrationCount(state, eventId));
}

export function isRegistered(state: AppState, eventId: string, studentName: string): boolean {
  const name = normalizeName(studentName);
  return state.registrations.some((r) => r.eventId === eventId && normalizeName(r.studentName) === name);
}

export function myEvents(state: AppState, studentName: string): EventItem[] {
  const name = normalizeName(studentName);
  const ids = new Set(
    state.registrations.filter((r) => normalizeName(r.studentName) === name).map((r) => r.eventId),
  );
  return filterEvents(state.events.filter((e) => ids.has(e.id)), '', 'All');
}

export function stats(state: AppState) {
  return {
    totalEvents: state.events.length,
    totalRegistrations: state.registrations.length,
    uniqueStudents: new Set(state.registrations.map((r) => normalizeName(r.studentName))).size,
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ---------- Commands (return a new state or throw a readable error) ----------

export function register(state: AppState, eventId: string, studentName: string, now = new Date()): AppState {
  const name = studentName.trim();
  if (!name) throw new Error('Enter your name before registering.');
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  if (isRegistered(state, eventId, name)) throw new Error('You are already registered for this event.');
  if (seatsLeft(state, eventId) <= 0) throw new Error('This event is full.');
  const reg: Registration = { id: newId('reg'), eventId, studentName: name, registeredAt: now.toISOString() };
  return { ...state, registrations: [...state.registrations, reg] };
}

export function unregister(state: AppState, eventId: string, studentName: string): AppState {
  const name = normalizeName(studentName);
  return {
    ...state,
    registrations: state.registrations.filter(
      (r) => !(r.eventId === eventId && normalizeName(r.studentName) === name),
    ),
  };
}

export type NewEventInput = Omit<EventItem, 'id'>;

export function validateEvent(input: NewEventInput): string[] {
  const errors: string[] = [];
  if (input.title.trim().length < 3) errors.push('Title must be at least 3 characters.');
  if (!CATEGORIES.includes(input.category)) errors.push('Choose a valid category.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push('Choose a date.');
  if (!/^\d{2}:\d{2}$/.test(input.time)) errors.push('Choose a time.');
  if (input.venue.trim() === '') errors.push('Venue is required.');
  if (!Number.isInteger(input.capacity) || input.capacity < 1) errors.push('Capacity must be a whole number of at least 1.');
  return errors;
}

export function addEvent(state: AppState, input: NewEventInput): AppState {
  const errors = validateEvent(input);
  if (errors.length) throw new Error(errors.join(' '));
  const ev: EventItem = {
    ...input,
    id: newId('evt'),
    title: input.title.trim(),
    venue: input.venue.trim(),
    description: input.description.trim(),
  };
  return { ...state, events: [...state.events, ev] };
}

export function removeEvent(state: AppState, eventId: string): AppState {
  return {
    events: state.events.filter((e) => e.id !== eventId),
    registrations: state.registrations.filter((r) => r.eventId !== eventId),
  };
}

// ---------- Persistence (browser only) ----------

export function loadState(): AppState {
  if (typeof window === 'undefined') return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.events) || !Array.isArray(parsed.registrations)) return initialState();
    return parsed;
  } catch {
    return initialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (e.g. private mode): the app keeps working in memory.
  }
}
