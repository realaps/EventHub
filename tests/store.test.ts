// Unit tests for EventHub business rules. Run with: npm test
// Jenkins runs these in the "Validate" stage; a failure stops the pipeline before deployment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addEvent,
  filterEvents,
  initialState,
  isRegistered,
  myEvents,
  register,
  registrationCount,
  removeEvent,
  seatsLeft,
  stats,
  unregister,
  validateEvent,
  type NewEventInput,
} from '../lib/store';

const validInput: NewEventInput = {
  title: 'Robotics Expo',
  category: 'Technical',
  date: '2027-02-01',
  time: '11:00',
  venue: 'Hall A',
  description: 'Robots built by students.',
  capacity: 2,
};

test('FR-01: sample events are available', () => {
  assert.ok(initialState().events.length >= 99);
});

test('FR-02: search narrows the list by keyword', () => {
  const result = filterEvents(initialState().events, 'hackathon', 'All');
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Campus Hackathon');
});

test('FR-03: category filter shows only matching events', () => {
  const result = filterEvents(initialState().events, '', 'Technical');
  assert.ok(result.length > 0);
  assert.ok(result.every((e) => e.category === 'Technical'));
});

test('FR-05/FR-06: registering adds the event to My Events', () => {
  const s = register(initialState(), 'evt-hackathon', 'Demo Student 1');
  assert.equal(isRegistered(s, 'evt-hackathon', 'demo student 1'), true);
  assert.deepEqual(myEvents(s, 'Demo Student 1').map((e) => e.id), ['evt-hackathon']);
  assert.equal(myEvents(s, 'Someone Else').length, 0);
});

test('duplicate registration is rejected', () => {
  const s = register(initialState(), 'evt-hackathon', 'Demo Student 1');
  assert.throws(() => register(s, 'evt-hackathon', ' demo student 1 '), /already registered/);
});

test('registration requires a name', () => {
  assert.throws(() => register(initialState(), 'evt-hackathon', '   '), /Enter your name/);
});

test('cancelling removes the registration', () => {
  let s = register(initialState(), 'evt-hackathon', 'Demo Student 1');
  s = unregister(s, 'evt-hackathon', 'Demo Student 1');
  assert.equal(registrationCount(s, 'evt-hackathon'), 0);
});

test('FR-07: organizer can create an event', () => {
  const s = addEvent(initialState(), validInput);
  assert.ok(s.events.some((e) => e.title === 'Robotics Expo'));
});

test('invalid events are rejected', () => {
  const errors = validateEvent({ ...validInput, title: 'X', venue: '', capacity: 0 });
  assert.equal(errors.length, 3);
  assert.throws(() => addEvent(initialState(), { ...validInput, title: '' }));
});

test('capacity is enforced', () => {
  let s = addEvent(initialState(), validInput);
  const id = s.events.find((e) => e.title === 'Robotics Expo')!.id;
  s = register(s, id, 'A');
  s = register(s, id, 'B');
  assert.equal(seatsLeft(s, id), 0);
  assert.throws(() => register(s, id, 'C'), /full/);
});

test('FR-08/FR-09: removing an event also removes its registrations; counts update', () => {
  let s = register(initialState(), 'evt-hackathon', 'A');
  s = register(s, 'evt-cultural-night', 'A');
  assert.equal(stats(s).totalRegistrations, 2);
  s = removeEvent(s, 'evt-hackathon');
  assert.equal(s.events.some((e) => e.id === 'evt-hackathon'), false);
  assert.equal(stats(s).totalRegistrations, 1);
  assert.equal(stats(s).uniqueStudents, 1);
});
