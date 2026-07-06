export type SessionStatus = 'past' | 'today' | 'upcoming';

export function sessionStatus(dateISO: string): SessionStatus {
  const d = new Date(dateISO);
  const now = new Date();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day.getTime() === today.getTime()) return 'today';
  return day < today ? 'past' : 'upcoming';
}

export const STATUS_META: Record<SessionStatus, { label: string; badge: string; dot: string }> = {
  past: { label: 'Passée', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  today: { label: "Aujourd'hui", badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  upcoming: { label: 'À venir', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
};

export function formatSessionDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatShortDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}
