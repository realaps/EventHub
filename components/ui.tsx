import type { RequestStatus } from '@/lib/store';

export function formatDate(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return `${date} ${time}`;
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function StatusPill({ status }: { status: RequestStatus }) {
  const label = status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected';
  return <span className={`pill pill-${status}`}>{label}</span>;
}
