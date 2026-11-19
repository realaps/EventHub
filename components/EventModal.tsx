'use client';

import { useState } from 'react';
import {
  approvedVolunteers,
  canManage,
  coOrganiserRequestFor,
  findUser,
  isOwner,
  register,
  registerGroup,
  registrationsFor,
  removeEvent,
  requestCoOrganise,
  requestVolunteer,
  seatsLeft,
  unregister,
  userRegistration,
  userVolunteerRequest,
  type AppState,
  type EventItem,
  type User,
} from '@/lib/store';
import { formatDate, StatusPill } from './ui';

interface Props {
  event: EventItem;
  state: AppState;
  user: User;
  act: (fn: () => AppState, success: string) => boolean;
  onEdit: () => void;
  onClose: () => void;
}

export default function EventModal({ event, state, user, act, onEdit, onClose }: Props) {
  const owner = findUser(state, event.ownerId);
  const coOrgs = event.coOrganiserIds.map((id) => findUser(state, id)).filter(Boolean) as User[];
  const left = seatsLeft(state, event.id);
  const volunteersFilled = approvedVolunteers(state, event.id);

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-top">
          <span className={`chip chip-${event.category.toLowerCase()}`}>{event.category}</span>
          {event.isGroupEvent && <span className="chip chip-group">Team event · {event.minTeamSize}-{event.maxTeamSize}</span>}
        </div>
        <h2>{event.title}</h2>
        <p className="meta">{formatDate(event.date, event.time)} · {event.venue}</p>
        <p>{event.description || 'No description provided.'}</p>
        <dl className="facts">
          <div><dt>Organised by</dt><dd>{owner?.organisation ?? owner?.name ?? 'Unknown'}{coOrgs.length > 0 && <> with {coOrgs.map((c) => c.organisation ?? c.name).join(', ')}</>}</dd></div>
          <div><dt>Seats left</dt><dd>{left} of {event.capacity}</dd></div>
          <div><dt>Volunteers</dt><dd>{volunteersFilled} of {event.volunteersNeeded} filled</dd></div>
        </dl>

        {user.role === 'student' ? (
          <StudentActions event={event} state={state} user={user} act={act} left={left} />
        ) : (
          <OrganiserActions event={event} state={state} user={user} act={act} onEdit={onEdit} onClose={onClose} />
        )}

        <div className="actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function StudentActions({ event, state, user, act, left }: { event: EventItem; state: AppState; user: User; act: Props['act']; left: number }) {
  const reg = userRegistration(state, event.id, user.id);
  const vol = userVolunteerRequest(state, event.id, user.id);
  const [team, setTeam] = useState('');
  const [members, setMembers] = useState<string[]>(() => Array(Math.max(0, event.maxTeamSize - 1)).fill(''));
  const [volMsg, setVolMsg] = useState('');
  const volunteersFull = approvedVolunteers(state, event.id) >= event.volunteersNeeded;

  return (
    <>
      <section className="action-box">
        <h3>Participate</h3>
        {reg ? (
          <>
            <p className="ok-text">
              You are registered{reg.type === 'group' && <> as team <strong>{reg.teamName}</strong> ({reg.members.length + 1} members: you, {reg.members.join(', ')})</>}.
            </p>
            <button className="btn danger" onClick={() => act(() => unregister(state, event.id, user), `Registration for ${event.title} cancelled.`)}>
              Cancel registration
            </button>
          </>
        ) : left <= 0 ? (
          <p className="muted">This event is full.</p>
        ) : event.isGroupEvent ? (
          <form
            className="team-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => registerGroup(state, event.id, user, team, members), `Team "${team.trim()}" registered for ${event.title}.`);
            }}
          >
            <label>Team name<input value={team} onChange={(e) => setTeam(e.target.value)} required /></label>
            <p className="muted small">You are the team leader. Add {event.minTeamSize - 1} to {event.maxTeamSize - 1} more members.</p>
            {members.map((m, i) => (
              <input
                key={i}
                aria-label={`Member ${i + 2}`}
                placeholder={`Member ${i + 2} name${i + 2 <= event.minTeamSize ? '' : ' (optional)'}`}
                value={m}
                onChange={(e) => setMembers((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
            <button className="btn primary" type="submit">Register team</button>
          </form>
        ) : (
          <button className="btn primary" onClick={() => act(() => register(state, event.id, user), `Registered for ${event.title}.`)}>
            Join event
          </button>
        )}
      </section>

      <section className="action-box">
        <h3>Volunteer</h3>
        {vol && vol.status !== 'rejected' ? (
          <p>Your volunteer request: <StatusPill status={vol.status} /></p>
        ) : volunteersFull ? (
          <p className="muted">All volunteer places are filled.</p>
        ) : (
          <>
            {vol?.status === 'rejected' && <p>Your earlier request was <StatusPill status="rejected" />. You can apply again.</p>}
            <textarea rows={2} placeholder="Why do you want to help? (optional)" value={volMsg} onChange={(e) => setVolMsg(e.target.value)} aria-label="Volunteer message" />
            <button className="btn secondary" onClick={() => act(() => requestVolunteer(state, event.id, user, volMsg), 'Volunteer request sent to the organiser.')}>
              Request to volunteer
            </button>
          </>
        )}
      </section>
    </>
  );
}

function OrganiserActions({ event, state, user, act, onEdit, onClose }: { event: EventItem; state: AppState; user: User; act: Props['act']; onEdit: () => void; onClose: () => void }) {
  const owner = isOwner(event, user);
  const manages = canManage(event, user);
  const req = coOrganiserRequestFor(state, event.id, user.id);
  const [msg, setMsg] = useState('');
  const regs = registrationsFor(state, event.id);

  return (
    <section className="action-box">
      {owner ? (
        <>
          <h3>You created this event</h3>
          <div className="actions left">
            <button className="btn secondary" onClick={onEdit}>Edit event</button>
            <button
              className="btn danger"
              onClick={() => {
                if (!window.confirm(`Delete "${event.title}" with all its registrations and requests?`)) return;
                if (act(() => removeEvent(state, user, event.id), `Event "${event.title}" deleted.`)) onClose();
              }}
            >
              Delete event
            </button>
          </div>
        </>
      ) : manages ? (
        <h3>You co-organise this event</h3>
      ) : req && req.status === 'pending' ? (
        <p>Co-organiser request: <StatusPill status="pending" /></p>
      ) : (
        <>
          <h3>Want to help run this event?</h3>
          {req?.status === 'rejected' && <p>Your earlier request was <StatusPill status="rejected" />.</p>}
          <textarea rows={2} placeholder="How would your club contribute? (optional)" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Co-organiser message" />
          <button className="btn secondary" onClick={() => act(() => requestCoOrganise(state, event.id, user, msg), 'Co-organiser request sent to the event owner.')}>
            Request to co-organise
          </button>
          <p className="muted small">You can view this event, but only its creator can edit it.</p>
        </>
      )}
      {manages && (
        <p className="muted small">{regs.length} registrations so far - see the Dashboard for details and requests.</p>
      )}
    </section>
  );
}
