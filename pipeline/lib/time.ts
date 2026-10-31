/** Diferença (ms) entre a hora local num fuso e UTC, num dado instante. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converte uma data/hora "de parede" num fuso para ISO UTC. */
export function zonedToUtcIso(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timeZone: string,
): string {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const off1 = tzOffsetMs(new Date(guess), timeZone);
  let utc = guess - off1;
  const off2 = tzOffsetMs(new Date(utc), timeZone);
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc).toISOString();
}

/**
 * Datas do feed fantasy: "MM/DD/YYYY HH:mm:ss" em hora da Europa Central
 * (verificado: 21:00 no feed = 20:00Z na API de jogos UEFA, em novembro).
 */
export function parseFantasyDate(raw: string, timeZone = 'Europe/Paris'): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(raw ?? '');
  if (!m) return null;
  const [, mo, d, y, h, mi, s] = m;
  return zonedToUtcIso(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s ?? 0), timeZone);
}

/** Época UEFA: 2026/27 → 2027 (a época "vira" em julho). */
export function uefaSeasonYear(now: Date): number {
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatLisbon(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
