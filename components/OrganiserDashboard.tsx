'use client';

import {
  approvedVolunteers,
  decideCoOrganiser,
  decideVolunteer,
  findUser,
  isOwner,
  managedEvents,
  organiserStats,
  registrationsFor,
  seatsUsed,
  type AppState,
  type User,
} from '@/lib/store';
import { formatDate } from './ui';

interface Props {
  state: AppState;
  user: User;
  act: (fn: () => AppState, success: string) => boolean;
  onCreate: () => void;
  onOpen: (eventId: string) => void;
}

export default function OrganiserDashboard({ state, user, act, onCreate, onOpen }: Props) {
  const events = managedEvents(state, user);
  const ids = new Set(events.map((e) => e.id));
  const st = organiserStats(state, user);
  const eventTitle = (id: string) => state.events.find((e) => e.id === id)?.title ?? 'Deleted event';
  const userName = (id: string) => findUser(state, id)?.name ?? 'Unknown user';

  const coRequests = state.coOrganiserRequests.filter(
    (r) => r.status === 'pending' && events.some((e) => e.id === r.eventId && isOwner(e, user)),
  );
  const volRequests = state.volunteerRequests.filter((v) => v.status === 'pending' && ids.has(v.eventId));

  return (
    <div className="dashboard">
      <div className="dash-head">
        <div>
          <h2>Organiser dashboard</h2>
          <p className="muted">{user.organisation} · {user.email}</p>
        </div>
        <button className="btn primary" onClick={onCreate}>+ Create event</button>
      </div>

      <div className="stats five">
        <div><strong>{st.events}</strong><span>Events you manage</span></div>
        <div><strong>{st.registrations}</strong><span>Registrations</span></div>
        <div><strong>{st.participants}</strong><span>Participants</span></div>
        <div className={st.pendingVolunteers ? 'attn' : ''}><strong>{st.pendingVolunteers}</strong><span>Volunteer requests</span></div>
        <div className={st.pendingCoOrganisers ? 'attn' : ''}><strong>{st.pendingCoOrganisers}</strong><span>Co-organiser requests</span></div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h3>Co-organiser requests</h3>
          {coRequests.length === 0 ? <p className="muted">No pending requests for your events.</p> : (
            <ul className="req-list">
              {coRequests.map((r) => {
                const org = findUser(state, r.organiserId);
                return (
                  <li key={r.id}>
                    <div>
                      <strong>{org?.organisation ?? org?.name}</strong> wants to co-organise <strong>{eventTitle(r.eventId)}</strong>
                      {r.message && <p className="quote">“{r.message}”</p>}
                    </div>
                    <div className="actions left">
                      <button className="btn primary small" onClick={() => act(() => decideCoOrganiser(state, user, r.id, true), 'Co-organiser approved.')}>Approve</button>
                      <button className="btn danger small" onClick={() => act(() => decideCoOrganiser(state, user, r.id, false), 'Co-organiser request rejected.')}>Reject</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <h3>Volunteer requests</h3>
          {volRequests.length === 0 ? <p className="muted">No pending volunteer requests.</p> : (
            <ul className="req-list">
              {volRequests.map((v) => (
                <li key={v.id}>
                  <div>
                    <strong>{userName(v.userId)}</strong> → <strong>{eventTitle(v.eventId)}</strong>
                    {v.message && <p className="quote">“{v.message}”</p>}
                  </div>
                  <div className="actions left">
                    <button className="btn primary small" onClick={() => act(() => decideVolunteer(state, user, v.id, true), 'Volunteer approved.')}>Approve</button>
                    <button className="btn danger small" onClick={() => act(() => decideVolunteer(state, user, v.id, false), 'Volunteer request rejected.')}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <h3 className="section-title">Your events</h3>
      {events.length === 0 && <p className="muted">You have no events yet. Create one, or request to co-organise an event from the Events tab.</p>}
      {events.map((ev) => {
        const regs = registrationsFor(state, ev.id);
        const vols = state.volunteerRequests.filter((v) => v.eventId === ev.id && v.status === 'approved');
        return (
          <section className="panel event-block" key={ev.id}>
            <div className="dash-head">
              <div>
                <h4>
                  {ev.title} <span className={`role-tag ${isOwner(ev, user) ? 'owner' : 'co'}`}>{isOwner(ev, user) ? 'Owner' : 'Co-organiser'}</span>
                </h4>
                <p className="muted small">{formatDate(ev.date, ev.time)} · {ev.venue}</p>
              </div>
              <button className="btn ghost small" onClick={() => onOpen(ev.id)}>Open</button>
            </div>
            <p className="small">
              Seats {seatsUsed(state, ev.id)}/{ev.capacity} · Volunteers {approvedVolunteers(state, ev.id)}/{ev.volunteersNeeded}
              {ev.isGroupEvent && ` · Team size ${ev.minTeamSize}-${ev.maxTeamSize}`}
            </p>
            {regs.length === 0 ? <p className="muted small">No registrations yet.</p> : (
              <table>
                <thead><tr><th>Registered by</th><th>Type</th><th>Team / members</th><th>Seats</th></tr></thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id}>
                      <td>{userName(r.userId)}<br /><small>{findUser(state, r.userId)?.email}</small></td>
                      <td>{r.type === 'group' ? 'Team' : 'Individual'}</td>
                      <td>{r.type === 'group' ? <><strong>{r.teamName}</strong><br /><small>{r.members.join(', ')}</small></> : '-'}</td>
                      <td>{r.members.length + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {vols.length > 0 && <p className="small">Approved volunteers: {vols.map((v) => userName(v.userId)).join(', ')}</p>}
          </section>
        );
      })}
    </div>
  );
}
