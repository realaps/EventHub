'use client';

import { type AppState, type User } from '@/lib/store';
import { formatDate, StatusPill } from './ui';

interface Props {
  state: AppState;
  user: User;
  onOpen: (eventId: string) => void;
}

export default function StudentMyEvents({ state, user, onOpen }: Props) {
  const regs = state.registrations.filter((r) => r.userId === user.id);
  const vols = state.volunteerRequests.filter((v) => v.userId === user.id);
  const ev = (id: string) => state.events.find((e) => e.id === id);

  return (
    <div className="dashboard">
      <h2>My Events</h2>
      <section className="panel">
        <h3>Registrations ({regs.length})</h3>
        {regs.length === 0 ? <p className="muted">You have not joined any events yet. Open an event and click Join.</p> : (
          <table>
            <thead><tr><th>Event</th><th>When</th><th>Registered as</th><th></th></tr></thead>
            <tbody>
              {regs.map((r) => {
                const e = ev(r.eventId);
                if (!e) return null;
                return (
                  <tr key={r.id}>
                    <td>{e.title}<br /><small>{e.venue}</small></td>
                    <td>{formatDate(e.date, e.time)}</td>
                    <td>{r.type === 'group' ? <>Team <strong>{r.teamName}</strong><br /><small>You, {r.members.join(', ')}</small></> : 'Individual'}</td>
                    <td><button className="btn ghost small" onClick={() => onOpen(e.id)}>Details</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Volunteer requests ({vols.length})</h3>
        {vols.length === 0 ? <p className="muted">No volunteer requests yet.</p> : (
          <table>
            <thead><tr><th>Event</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {vols.map((v) => {
                const e = ev(v.eventId);
                if (!e) return null;
                return (
                  <tr key={v.id}>
                    <td>{e.title}</td>
                    <td><StatusPill status={v.status} /></td>
                    <td><button className="btn ghost small" onClick={() => onOpen(e.id)}>Details</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
