// EventHub prototype data layer.
// All business rules are pure functions (easy to unit test in Jenkins).
// Persistence uses browser localStorage: prototype only - one browser, not a shared database,
// and the login is a demo (passwords are hashed, but there is no server-side security).

import { sha256Hex } from './sha256';

export type Category = 'Technical' | 'Cultural' | 'Sports' | 'Workshop';
export const CATEGORIES: Category[] = ['Technical', 'Cultural', 'Sports', 'Workshop'];

export type Role = 'student' | 'organiser';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string; // stored lower-case
  passwordHash: string;
  role: Role;
  organisation?: string; // club / committee, for organisers
}

export interface EventItem {
  id: string;
  title: string;
  category: Category;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  description: string;
  capacity: number; // seats (a group uses one seat per member)
  ownerId: string; // organiser who created it
  coOrganiserIds: string[]; // organisers approved by the owner
  isGroupEvent: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  volunteersNeeded: number;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  type: 'individual' | 'group';
  teamName?: string;
  members: string[]; // other team members' names (leader is userId)
  registeredAt: string;
}

export interface VolunteerRequest {
  id: string;
  eventId: string;
  userId: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export interface CoOrganiserRequest {
  id: string;
  eventId: string;
  organiserId: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export interface AppState {
  users: User[];
  events: EventItem[];
  registrations: Registration[];
  volunteerRequests: VolunteerRequest[];
  coOrganiserRequests: CoOrganiserRequest[];
}

export const STORAGE_KEY = 'eventhub:v2';
export const SESSION_KEY = 'eventhub:session';
export const DEMO_PASSWORD = 'demo123';

// ---------- Password hashing (pure JS SHA-256 so it also works over plain HTTP) ----------

export async function hashPassword(email: string, password: string): Promise<string> {
  return sha256Hex(`eventhub:${email.trim().toLowerCase()}:${password}`);
}

// ---------- Demo data (clearly sample accounts; password for all: demo123) ----------

export const DEMO_USERS: User[] = [
  {
    id: 'usr-techclub',
    name: 'Tech Club Coordinator',
    email: 'techclub@srm.demo',
    passwordHash: '69b5cf6fa0ee68353c8107be31af131b0b621a87ee8067f1b78255ac0783790f',
    role: 'organiser',
    organisation: 'Tech Club',
  },
  {
    id: 'usr-culture',
    name: 'Cultural Committee Lead',
    email: 'culture@srm.demo',
    passwordHash: '9b19edec2972a151ade985d292516fd5ab7cb3d484162904bcc305e2b1d13018',
    role: 'organiser',
    organisation: 'Cultural Committee',
  },
  {
    id: 'usr-student1',
    name: 'Demo Student',
    email: 'student@srm.demo',
    passwordHash: '96f09419b714eea17dc21bd7d8806f1b7ef2aa2427141ee9fe23903b13586aac',
    role: 'student',
  },
  {
    id: 'usr-student2',
    name: 'Second Student',
    email: 'student2@srm.demo',
    passwordHash: '7b84d4f3d049e7fdc64e9e9bf6925348c09baba9b0f876ac501fd15a88d0ab10',
    role: 'student',
  },
];

const base = { coOrganiserIds: [] as string[], isGroupEvent: false, minTeamSize: 1, maxTeamSize: 1 };

export const SAMPLE_EVENTS: EventItem[] = [
  {
    ...base,
    id: 'evt-tech-symposium',
    title: 'Tech Symposium',
    category: 'Technical',
    date: '2026-12-05',
    time: '10:00',
    venue: 'Main Auditorium',
    description: 'Student technical talks and a final-year project showcase. Open to all departments.',
    capacity: 200,
    ownerId: 'usr-techclub',
    volunteersNeeded: 10,
  },
  {
    ...base,
    id: 'evt-hackathon',
    title: 'Campus Hackathon',
    category: 'Technical',
    date: '2026-12-12',
    time: '09:00',
    venue: 'Tech Park, Lab 4',
    description: 'A 24-hour team coding event. Register as a team of 2 to 4 and build a solution to a campus problem.',
    capacity: 120,
    ownerId: 'usr-techclub',
    isGroupEvent: true,
    minTeamSize: 2,
    maxTeamSize: 4,
    volunteersNeeded: 6,
  },
  {
    ...base,
    id: 'evt-cultural-night',
    title: 'Cultural Night',
    category: 'Cultural',
    date: '2026-12-18',
    time: '18:00',
    venue: 'Open Air Theatre',
    description: 'Music, dance and stage performances by student clubs.',
    capacity: 500,
    ownerId: 'usr-culture',
    volunteersNeeded: 20,
  },
  {
    ...base,
    id: 'evt-sports-meet',
    title: 'Inter-College Sports Meet',
    category: 'Sports',
    date: '2027-01-08',
    time: '07:30',
    venue: 'University Ground',
    description: 'Football, basketball and volleyball. Register your team of 5 to 7 players.',
    capacity: 300,
    ownerId: 'usr-culture',
    isGroupEvent: true,
    minTeamSize: 5,
    maxTeamSize: 7,
    volunteersNeeded: 15,
  },
  {
    ...base,
    id: 'evt-devops-workshop',
    title: 'Docker & Kubernetes Workshop',
    category: 'Workshop',
    date: '2027-01-15',
    time: '14:00',
    venue: 'Seminar Hall 2',
    description: 'Hands-on session on containers, Kubernetes Deployments and CI/CD with Jenkins.',
    capacity: 60,
    ownerId: 'usr-techclub',
    volunteersNeeded: 3,
  },
];

export function initialState(): AppState {
  return {
    users: DEMO_USERS.map((u) => ({ ...u })),
    events: SAMPLE_EVENTS.map((e) => ({ ...e, coOrganiserIds: [...e.coOrganiserIds] })),
    registrations: [],
    volunteerRequests: [],
    coOrganiserRequests: [],
  };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const norm = (s: string) => s.trim().toLowerCase();

// ---------- Accounts ----------

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  organisation?: string;
}

export function validateSignup(state: AppState, input: SignupInput): string[] {
  const errors: string[] = [];
  if (input.name.trim().length < 2) errors.push('Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.push('Enter a valid email.');
  if (input.password.length < 6) errors.push('Password must be at least 6 characters.');
  if (input.role !== 'student' && input.role !== 'organiser') errors.push('Choose Student or Organiser.');
  if (input.role === 'organiser' && !input.organisation?.trim()) errors.push('Enter your club or committee.');
  if (state.users.some((u) => u.email === norm(input.email))) errors.push('An account with this email already exists.');
  return errors;
}

export async function signup(state: AppState, input: SignupInput): Promise<{ state: AppState; user: User }> {
  const errors = validateSignup(state, input);
  if (errors.length) throw new Error(errors.join(' '));
  const user: User = {
    id: newId('usr'),
    name: input.name.trim(),
    email: norm(input.email),
    passwordHash: await hashPassword(input.email, input.password),
    role: input.role,
    organisation: input.role === 'organiser' ? input.organisation?.trim() : undefined,
  };
  return { state: { ...state, users: [...state.users, user] }, user };
}

export async function login(state: AppState, email: string, password: string): Promise<User> {
  const user = state.users.find((u) => u.email === norm(email));
  if (!user || user.passwordHash !== (await hashPassword(email, password))) {
    throw new Error('Incorrect email or password.');
  }
  return user;
}

export function findUser(state: AppState, id: string | null | undefined): User | undefined {
  return id ? state.users.find((u) => u.id === id) : undefined;
}

// ---------- Permissions ----------

export function isOwner(event: EventItem, user: User | undefined): boolean {
  return !!user && user.role === 'organiser' && event.ownerId === user.id;
}

/** Owner or approved co-organiser: can see registrations and handle volunteer requests. */
export function canManage(event: EventItem, user: User | undefined): boolean {
  return !!user && user.role === 'organiser' && (event.ownerId === user.id || event.coOrganiserIds.includes(user.id));
}

// ---------- Queries ----------

export function filterEvents(events: EventItem[], query: string, category: Category | 'All'): EventItem[] {
  const q = norm(query);
  return events
    .filter((e) => category === 'All' || e.category === category)
    .filter((e) => q === '' || [e.title, e.description, e.venue].some((f) => f.toLowerCase().includes(q)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function seatsUsed(state: AppState, eventId: string): number {
  return state.registrations
    .filter((r) => r.eventId === eventId)
    .reduce((sum, r) => sum + 1 + r.members.length, 0);
}

export function seatsLeft(state: AppState, eventId: string): number {
  const ev = state.events.find((e) => e.id === eventId);
  return ev ? Math.max(0, ev.capacity - seatsUsed(state, eventId)) : 0;
}

export function registrationsFor(state: AppState, eventId: string): Registration[] {
  return state.registrations.filter((r) => r.eventId === eventId);
}

export function userRegistration(state: AppState, eventId: string, userId: string): Registration | undefined {
  return state.registrations.find((r) => r.eventId === eventId && r.userId === userId);
}

export function userVolunteerRequest(state: AppState, eventId: string, userId: string): VolunteerRequest | undefined {
  return state.volunteerRequests.find((v) => v.eventId === eventId && v.userId === userId);
}

export function coOrganiserRequestFor(state: AppState, eventId: string, organiserId: string): CoOrganiserRequest | undefined {
  return state.coOrganiserRequests.find((r) => r.eventId === eventId && r.organiserId === organiserId);
}

export function approvedVolunteers(state: AppState, eventId: string): number {
  return state.volunteerRequests.filter((v) => v.eventId === eventId && v.status === 'approved').length;
}

export function myEvents(state: AppState, userId: string): EventItem[] {
  const ids = new Set(state.registrations.filter((r) => r.userId === userId).map((r) => r.eventId));
  return filterEvents(state.events.filter((e) => ids.has(e.id)), '', 'All');
}

export function managedEvents(state: AppState, user: User | undefined): EventItem[] {
  return filterEvents(state.events.filter((e) => canManage(e, user)), '', 'All');
}

export function stats(state: AppState) {
  return {
    totalEvents: state.events.length,
    totalRegistrations: state.registrations.length,
    totalParticipants: state.registrations.reduce((s, r) => s + 1 + r.members.length, 0),
    students: state.users.filter((u) => u.role === 'student').length,
    organisers: state.users.filter((u) => u.role === 'organiser').length,
  };
}

export function organiserStats(state: AppState, user: User | undefined) {
  const events = managedEvents(state, user);
  const ids = new Set(events.map((e) => e.id));
  return {
    events: events.length,
    registrations: state.registrations.filter((r) => ids.has(r.eventId)).length,
    participants: state.registrations.filter((r) => ids.has(r.eventId)).reduce((s, r) => s + 1 + r.members.length, 0),
    pendingVolunteers: state.volunteerRequests.filter((v) => ids.has(v.eventId) && v.status === 'pending').length,
    pendingCoOrganisers: state.coOrganiserRequests.filter(
      (r) => r.status === 'pending' && events.some((e) => e.id === r.eventId && isOwner(e, user)),
    ).length,
  };
}

// ---------- Student actions ----------

function requireStudent(user: User | undefined): User {
  if (!user) throw new Error('Please log in first.');
  if (user.role !== 'student') throw new Error('Only students can do this.');
  return user;
}

export function register(state: AppState, eventId: string, user: User | undefined, now = new Date()): AppState {
  const u = requireStudent(user);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  if (ev.isGroupEvent) throw new Error('This is a group event - register as a team.');
  if (userRegistration(state, eventId, u.id)) throw new Error('You are already registered for this event.');
  if (seatsLeft(state, eventId) < 1) throw new Error('This event is full.');
  const reg: Registration = { id: newId('reg'), eventId, userId: u.id, type: 'individual', members: [], registeredAt: now.toISOString() };
  return { ...state, registrations: [...state.registrations, reg] };
}

export function registerGroup(
  state: AppState,
  eventId: string,
  user: User | undefined,
  teamName: string,
  memberNames: string[],
  now = new Date(),
): AppState {
  const u = requireStudent(user);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  if (!ev.isGroupEvent) throw new Error('This event is for individual registration.');
  if (userRegistration(state, eventId, u.id)) throw new Error('You are already registered for this event.');
  const name = teamName.trim();
  if (name.length < 2) throw new Error('Enter a team name.');
  if (state.registrations.some((r) => r.eventId === eventId && norm(r.teamName ?? '') === norm(name))) {
    throw new Error('That team name is already taken for this event.');
  }
  const members = memberNames.map((m) => m.trim()).filter(Boolean);
  const size = members.length + 1; // the leader counts
  if (size < ev.minTeamSize || size > ev.maxTeamSize) {
    throw new Error(`Team size must be ${ev.minTeamSize} to ${ev.maxTeamSize} including you (you entered ${size}).`);
  }
  if (seatsLeft(state, eventId) < size) throw new Error('Not enough seats left for your whole team.');
  const reg: Registration = { id: newId('reg'), eventId, userId: u.id, type: 'group', teamName: name, members, registeredAt: now.toISOString() };
  return { ...state, registrations: [...state.registrations, reg] };
}

export function unregister(state: AppState, eventId: string, user: User | undefined): AppState {
  const u = requireStudent(user);
  return { ...state, registrations: state.registrations.filter((r) => !(r.eventId === eventId && r.userId === u.id)) };
}

export function requestVolunteer(state: AppState, eventId: string, user: User | undefined, message: string, now = new Date()): AppState {
  const u = requireStudent(user);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  const existing = userVolunteerRequest(state, eventId, u.id);
  if (existing && existing.status !== 'rejected') throw new Error('You have already applied to volunteer for this event.');
  if (approvedVolunteers(state, eventId) >= ev.volunteersNeeded) throw new Error('This event has all the volunteers it needs.');
  const req: VolunteerRequest = { id: newId('vol'), eventId, userId: u.id, message: message.trim(), status: 'pending', createdAt: now.toISOString() };
  return { ...state, volunteerRequests: [...state.volunteerRequests.filter((v) => v !== existing), req] };
}

// ---------- Organiser actions ----------

function requireOrganiser(user: User | undefined): User {
  if (!user) throw new Error('Please log in first.');
  if (user.role !== 'organiser') throw new Error('Only organisers can do this.');
  return user;
}

export type EventInput = Pick<
  EventItem,
  'title' | 'category' | 'date' | 'time' | 'venue' | 'description' | 'capacity' | 'isGroupEvent' | 'minTeamSize' | 'maxTeamSize' | 'volunteersNeeded'
>;

export function validateEvent(input: EventInput): string[] {
  const errors: string[] = [];
  if (input.title.trim().length < 3) errors.push('Title must be at least 3 characters.');
  if (!CATEGORIES.includes(input.category)) errors.push('Choose a valid category.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push('Choose a date.');
  if (!/^\d{2}:\d{2}$/.test(input.time)) errors.push('Choose a time.');
  if (input.venue.trim() === '') errors.push('Venue is required.');
  if (!Number.isInteger(input.capacity) || input.capacity < 1) errors.push('Capacity must be a whole number of at least 1.');
  if (!Number.isInteger(input.volunteersNeeded) || input.volunteersNeeded < 0) errors.push('Volunteers needed must be 0 or more.');
  if (input.isGroupEvent) {
    if (!Number.isInteger(input.minTeamSize) || input.minTeamSize < 2) errors.push('Minimum team size must be at least 2.');
    if (!Number.isInteger(input.maxTeamSize) || input.maxTeamSize < input.minTeamSize) errors.push('Maximum team size must be at least the minimum.');
  }
  return errors;
}

function cleanEvent(input: EventInput) {
  return {
    ...input,
    title: input.title.trim(),
    venue: input.venue.trim(),
    description: input.description.trim(),
    minTeamSize: input.isGroupEvent ? input.minTeamSize : 1,
    maxTeamSize: input.isGroupEvent ? input.maxTeamSize : 1,
  };
}

export function addEvent(state: AppState, user: User | undefined, input: EventInput): AppState {
  const u = requireOrganiser(user);
  const errors = validateEvent(input);
  if (errors.length) throw new Error(errors.join(' '));
  const ev: EventItem = { ...cleanEvent(input), id: newId('evt'), ownerId: u.id, coOrganiserIds: [] };
  return { ...state, events: [...state.events, ev] };
}

export function updateEvent(state: AppState, user: User | undefined, eventId: string, input: EventInput): AppState {
  requireOrganiser(user);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  if (!isOwner(ev, user)) throw new Error('You can only edit events you created.');
  const errors = validateEvent(input);
  if (errors.length) throw new Error(errors.join(' '));
  if (input.capacity < seatsUsed(state, eventId)) throw new Error('Capacity cannot be lower than the seats already taken.');
  return { ...state, events: state.events.map((e) => (e.id === eventId ? { ...e, ...cleanEvent(input) } : e)) };
}

export function removeEvent(state: AppState, user: User | undefined, eventId: string): AppState {
  requireOrganiser(user);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  if (!isOwner(ev, user)) throw new Error('You can only delete events you created.');
  return {
    ...state,
    events: state.events.filter((e) => e.id !== eventId),
    registrations: state.registrations.filter((r) => r.eventId !== eventId),
    volunteerRequests: state.volunteerRequests.filter((v) => v.eventId !== eventId),
    coOrganiserRequests: state.coOrganiserRequests.filter((r) => r.eventId !== eventId),
  };
}

export function requestCoOrganise(state: AppState, eventId: string, user: User | undefined, message: string, now = new Date()): AppState {
  const u = requireOrganiser(user);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('This event no longer exists.');
  if (canManage(ev, u)) throw new Error('You already organise this event.');
  const existing = coOrganiserRequestFor(state, eventId, u.id);
  if (existing && existing.status === 'pending') throw new Error('Your request is already waiting for approval.');
  const req: CoOrganiserRequest = { id: newId('cor'), eventId, organiserId: u.id, message: message.trim(), status: 'pending', createdAt: now.toISOString() };
  return { ...state, coOrganiserRequests: [...state.coOrganiserRequests.filter((r) => r !== existing), req] };
}

export function decideVolunteer(state: AppState, user: User | undefined, requestId: string, approve: boolean): AppState {
  requireOrganiser(user);
  const req = state.volunteerRequests.find((v) => v.id === requestId);
  if (!req) throw new Error('Request not found.');
  const ev = state.events.find((e) => e.id === req.eventId);
  if (!ev || !canManage(ev, user)) throw new Error('You do not organise this event.');
  if (approve && approvedVolunteers(state, ev.id) >= ev.volunteersNeeded) throw new Error('All volunteer places are already filled.');
  return {
    ...state,
    volunteerRequests: state.volunteerRequests.map((v) => (v.id === requestId ? { ...v, status: approve ? 'approved' : 'rejected' } : v)),
  };
}

export function decideCoOrganiser(state: AppState, user: User | undefined, requestId: string, approve: boolean): AppState {
  requireOrganiser(user);
  const req = state.coOrganiserRequests.find((r) => r.id === requestId);
  if (!req) throw new Error('Request not found.');
  const ev = state.events.find((e) => e.id === req.eventId);
  if (!ev || !isOwner(ev, user)) throw new Error('Only the event owner can approve co-organisers.');
  return {
    ...state,
    coOrganiserRequests: state.coOrganiserRequests.map((r) => (r.id === requestId ? { ...r, status: approve ? 'approved' : 'rejected' } : r)),
    events: approve
      ? state.events.map((e) => (e.id === ev.id && !e.coOrganiserIds.includes(req.organiserId) ? { ...e, coOrganiserIds: [...e.coOrganiserIds, req.organiserId] } : e))
      : state.events,
  };
}

// ---------- Persistence (browser only) ----------

export function loadState(): AppState {
  if (typeof window === 'undefined') return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    const keys: (keyof AppState)[] = ['users', 'events', 'registrations', 'volunteerRequests', 'coOrganiserRequests'];
    if (!keys.every((k) => Array.isArray(parsed[k]))) return initialState();
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
    // Storage full or blocked: the app keeps working in memory.
  }
}
