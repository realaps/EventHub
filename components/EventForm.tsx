'use client';

import { useState, type FormEvent } from 'react';
import { CATEGORIES, type Category, type EventInput, type EventItem } from '@/lib/store';

const EMPTY: EventInput = {
  title: '',
  category: 'Technical',
  date: '',
  time: '10:00',
  venue: '',
  description: '',
  capacity: 50,
  isGroupEvent: false,
  minTeamSize: 2,
  maxTeamSize: 4,
  volunteersNeeded: 5,
};

interface Props {
  event?: EventItem; // present when editing
  onSubmit: (input: EventInput) => boolean; // returns true when saved
  onClose: () => void;
}

export default function EventForm({ event, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<EventInput>(() =>
    event
      ? {
          title: event.title,
          category: event.category,
          date: event.date,
          time: event.time,
          venue: event.venue,
          description: event.description,
          capacity: event.capacity,
          isGroupEvent: event.isGroupEvent,
          minTeamSize: event.isGroupEvent ? event.minTeamSize : 2,
          maxTeamSize: event.isGroupEvent ? event.maxTeamSize : 4,
          volunteersNeeded: event.volunteersNeeded,
        }
      : EMPTY,
  );
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (onSubmit(form)) onClose();
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal form-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{event ? 'Edit event' : 'Create event'}</h2>
        <label>Title<input value={form.title} onChange={(e) => set('title', e.target.value)} required /></label>
        <div className="row">
          <label>Category
            <select value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Venue<input value={form.venue} onChange={(e) => set('venue', e.target.value)} required /></label>
        </div>
        <div className="row">
          <label>Date<input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></label>
          <label>Time<input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} required /></label>
        </div>
        <div className="row">
          <label>Capacity (seats)<input type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></label>
          <label>Volunteers needed<input type="number" min={0} value={form.volunteersNeeded} onChange={(e) => set('volunteersNeeded', Number(e.target.value))} /></label>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.isGroupEvent} onChange={(e) => set('isGroupEvent', e.target.checked)} />
          Group event (students register as a team)
        </label>
        {form.isGroupEvent && (
          <div className="row">
            <label>Min team size<input type="number" min={2} value={form.minTeamSize} onChange={(e) => set('minTeamSize', Number(e.target.value))} /></label>
            <label>Max team size<input type="number" min={2} value={form.maxTeamSize} onChange={(e) => set('maxTeamSize', Number(e.target.value))} /></label>
          </div>
        )}
        <label>Description<textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">{event ? 'Save changes' : 'Create event'}</button>
        </div>
      </form>
    </div>
  );
}
