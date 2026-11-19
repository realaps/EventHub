'use client';

import { useState, type FormEvent } from 'react';
import { DEMO_PASSWORD, DEMO_USERS, type Role } from '@/lib/store';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (input: { name: string; email: string; password: string; role: Role; organisation?: string }) => Promise<void>;
}

export default function AuthScreen({ onLogin, onSignup }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [organisation, setOrganisation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onSignup({ name, email, password, role, organisation });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-intro">
        <span className="logo big">EH</span>
        <h1>EventHub</h1>
        <p>Discover, join and organise campus events in one place.</p>
        <ul className="auth-points">
          <li>Students: join events solo or as a team, and volunteer</li>
          <li>Organisers: create events, manage registrations and volunteers</li>
          <li>Clubs can request to co-organise each other&apos;s events</li>
        </ul>
      </div>

      <form className="panel auth-card" onSubmit={submit} aria-label={mode === 'login' ? 'Log in' : 'Sign up'}>
        <div className="seg">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>
            Log in
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>
            Sign up
          </button>
        </div>

        {mode === 'signup' && (
          <>
            <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
            <fieldset className="role-pick">
              <legend>I am a</legend>
              <label className={role === 'student' ? 'on' : ''}>
                <input type="radio" name="role" checked={role === 'student'} onChange={() => setRole('student')} /> Student
                <small>Join events, form teams, volunteer</small>
              </label>
              <label className={role === 'organiser' ? 'on' : ''}>
                <input type="radio" name="role" checked={role === 'organiser'} onChange={() => setRole('organiser')} /> Organiser
                <small>Create and manage events</small>
              </label>
            </fieldset>
            {role === 'organiser' && (
              <label>Club / committee<input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="e.g. Coding Club" required /></label>
            )}
          </>
        )}

        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn primary wide" type="submit" disabled={busy}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        {mode === 'login' && (
          <div className="demo-accounts">
            <p className="demo-hint"><strong>Demo accounts</strong> · password <code>{DEMO_PASSWORD}</code> · click one to fill</p>
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                className="demo-chip"
                onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); }}
              >
                <span className={`role-tag ${u.role}`}>{u.role}</span> {u.email}
              </button>
            ))}
          </div>
        )}
        <p className="fine">Prototype: accounts are stored in this browser only.</p>
      </form>
    </div>
  );
}
