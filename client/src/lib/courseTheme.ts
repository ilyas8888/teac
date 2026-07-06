// Deterministic color theme per matière so each subject keeps a stable identity
// across the courses grid and detail page.

export interface CourseTheme {
  bg: string;      // soft background (icon container, accents)
  text: string;    // strong text/icon color
  ring: string;    // border/ring color
  gradient: string; // header gradient
  dot: string;     // small status/indicator
}

const THEMES: CourseTheme[] = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200', gradient: 'from-indigo-500 to-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200', gradient: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200', gradient: 'from-rose-500 to-pink-600', dot: 'bg-rose-500' },
  { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200', gradient: 'from-sky-500 to-blue-600', dot: 'bg-sky-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200', gradient: 'from-violet-500 to-purple-600', dot: 'bg-violet-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200', gradient: 'from-teal-500 to-cyan-600', dot: 'bg-teal-500' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', ring: 'ring-fuchsia-200', gradient: 'from-fuchsia-500 to-pink-600', dot: 'bg-fuchsia-500' },
];

export function courseTheme(key: string): CourseTheme {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return THEMES[Math.abs(hash) % THEMES.length];
}
