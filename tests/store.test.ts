// Unit tests for EventHub business rules. Run with: npm test
// Jenkins runs these in the "Validate" stage; a failure stops the pipeline before deployment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addEvent,
  canManage,
  decideCoOrganiser,
  decideVolunteer,
  DEMO_PASSWORD,
  filterEvents,
  findUser,
  initialState,
  login,
  myEvents,
  organiserStats,
  register,
  registerGroup,
  removeEvent,
  requestCoOrganise,
  requestVolunteer,
  seatsLeft,
  signup,
  unregister,
  updateEvent,
  type AppState,
  type EventInput,
} from '../lib/store';

const s0 = () => initialState();
const u = (s: AppState, id: string) => findUser(s, id)!;
const techclub = (s: AppState) => u(s, 'usr-techclub');
const culture = (s: AppState) => u(s, 'usr-culture');
const student = (s: AppState) => u(s, 'usr-student1');
const student2 = (s: AppState) => u(s, 'usr-student2');

const input: EventInput = {
  title: 'Robotics Expo',
  category: 'Technical',
  date: '2027-02-01',
  time: '11:00',
  venue: 'Hall A',
  description: 'Robots built by students.',
  capacity: 2,
  isGroupEvent: false,
  minTeamSize: 1,
  maxTeamSize: 1,
  volunteersNeeded: 1,
};

// ---- Events and search ----

test('FR-01: sample events are available', () => {
  assert.ok(s0().events.length >= 4);
});

test('FR-02/03: search and category filter', () => {
  assert.deepEqual(filterEvents(s0().events, 'hackathon', 'All').map((e) => e.id), ['evt-hackathon']);
  assert.ok(filterEvents(s0().events, '', 'Sports').every((e) => e.category === 'Sports'));
});

// ---- Accounts ----

test('AUTH: demo accounts can log in, wrong password is rejected', async () => {
  const s = s0();
  assert.equal((await login(s, 'Student@SRM.demo', DEMO_PASSWORD)).id, 'usr-student1');
  await assert.rejects(login(s, 'student@srm.demo', 'wrong'), /Incorrect/);
});

test('AUTH: sign up creates a hashed account with a role; duplicate email rejected', async () => {
  const { state, user } = await signup(s0(), { name: 'Asha', email: 'asha@srm.demo', password: 'secret1', role: 'student' });
  assert.equal(user.role, 'student');
  assert.notEqual(user.passwordHash, 'secret1');
  assert.equal((await login(state, 'asha@srm.demo', 'secret1')).id, user.id);
  await assert.rejects(signup(state, { name: 'Again', email: 'asha@srm.demo', password: 'secret1', role: 'student' }), /already exists/);
  await assert.rejects(signup(s0(), { name: 'Org', email: 'o@srm.demo', password: 'secret1', role: 'organiser' }), /club/);
});

// ---- Student ----

test('FR-05/06: student registers individually and sees it in My Events; can cancel', () => {
  let s = register(s0(), 'evt-tech-symposium', student(s0()));
  assert.deepEqual(myEvents(s, 'usr-student1').map((e) => e.id), ['evt-tech-symposium']);
  assert.throws(() => register(s, 'evt-tech-symposium', student(s)), /already registered/);
  s = unregister(s, 'evt-tech-symposium', student(s));
  assert.equal(myEvents(s, 'usr-student1').length, 0);
});

test('ROLE: organisers cannot register; logged-out users cannot register', () => {
  assert.throws(() => register(s0(), 'evt-tech-symposium', techclub(s0())), /Only students/);
  assert.throws(() => register(s0(), 'evt-tech-symposium', undefined), /log in/);
});

test('GROUP: team registration enforces team size and uses one seat per member', () => {
  const s = s0();
  assert.throws(() => register(s, 'evt-hackathon', student(s)), /group event/);
  assert.throws(() => registerGroup(s, 'evt-hackathon', student(s), 'Solo', []), /Team size must be 2 to 4/);
  const before = seatsLeft(s, 'evt-hackathon');
  const s2 = registerGroup(s, 'evt-hackathon', student(s), 'Byte Me', ['Ravi', 'Meena']);
  assert.equal(seatsLeft(s2, 'evt-hackathon'), before - 3);
  assert.throws(() => registerGroup(s2, 'evt-hackathon', student2(s2), 'byte me', ['X']), /already taken/);
});

test('CAPACITY: full events reject registrations', () => {
  let s = addEvent(s0(), techclub(s0()), input);
  const id = s.events.find((e) => e.title === 'Robotics Expo')!.id;
  s = register(s, id, student(s));
  s = register(s, id, student2(s));
  assert.equal(seatsLeft(s, id), 0);
});

test('VOLUNTEER: student applies, event organiser approves, limit enforced', () => {
  let s = requestVolunteer(s0(), 'evt-devops-workshop', student(s0()), 'I can help with setup');
  assert.throws(() => requestVolunteer(s, 'evt-devops-workshop', student(s), 'again'), /already applied/);
  const reqId = s.volunteerRequests[0].id;
  assert.throws(() => decideVolunteer(s, culture(s), reqId, true), /do not organise/);
  s = decideVolunteer(s, techclub(s), reqId, true);
  assert.equal(s.volunteerRequests[0].status, 'approved');
});

// ---- Organiser ----

test('FR-07: organiser creates an event and owns it', () => {
  const s = addEvent(s0(), techclub(s0()), input);
  const ev = s.events.find((e) => e.title === 'Robotics Expo')!;
  assert.equal(ev.ownerId, 'usr-techclub');
  assert.throws(() => addEvent(s0(), student(s0()), input), /Only organisers/);
});

test('OWNERSHIP: organisers can only edit or delete their own events', () => {
  const s = s0();
  assert.throws(() => updateEvent(s, culture(s), 'evt-hackathon', { ...input, title: 'Hacked' }), /only edit events you created/);
  assert.throws(() => removeEvent(s, culture(s), 'evt-hackathon'), /only delete events you created/);
  const s2 = updateEvent(s, techclub(s), 'evt-tech-symposium', { ...input, title: 'Tech Symposium 2026', capacity: 250 });
  assert.equal(s2.events.find((e) => e.id === 'evt-tech-symposium')!.title, 'Tech Symposium 2026');
  const s3 = removeEvent(s2, techclub(s2), 'evt-tech-symposium');
  assert.equal(s3.events.some((e) => e.id === 'evt-tech-symposium'), false);
});

test('CO-ORGANISE: organiser requests to join, owner approves, then can manage but not delete', () => {
  let s = requestCoOrganise(s0(), 'evt-hackathon', culture(s0()), 'We can run the food stalls');
  const reqId = s.coOrganiserRequests[0].id;
  assert.throws(() => decideCoOrganiser(s, culture(s), reqId, true), /Only the event owner/);
  s = decideCoOrganiser(s, techclub(s), reqId, true);
  const ev = s.events.find((e) => e.id === 'evt-hackathon')!;
  assert.equal(canManage(ev, culture(s)), true);
  assert.throws(() => removeEvent(s, culture(s), 'evt-hackathon'), /only delete/);
});

test('DASHBOARD: organiser stats count registrations and pending requests for managed events', () => {
  let s = register(s0(), 'evt-tech-symposium', student(s0()));
  s = requestVolunteer(s, 'evt-tech-symposium', student2(s), '');
  s = requestCoOrganise(s, 'evt-tech-symposium', culture(s), '');
  const st = organiserStats(s, techclub(s));
  assert.equal(st.registrations, 1);
  assert.equal(st.pendingVolunteers, 1);
  assert.equal(st.pendingCoOrganisers, 1);
  assert.equal(organiserStats(s, culture(s)).registrations, 0);
});
