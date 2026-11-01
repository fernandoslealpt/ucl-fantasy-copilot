import { useEffect, useState } from 'react';
import type { Dataset, Meta, NewsItem, Player, Row, Team, TeamRating, XpPlayer } from './types';

/** Dados publicados pelo GitHub Actions (branch `data`). `?data=<url>` permite testar com outra origem. */
export const DATA_BASE =
  new URLSearchParams(location.search).get('data') ??
  import.meta.env.VITE_DATA_BASE ??
  'https://raw.githubusercontent.com/fernandoslealpt/ucl-fantasy-copilot/data/latest/';

async function getJson<T>(file: string, optional = false): Promise<T | null> {
  const res = await fetch(`${DATA_BASE}${file}?t=${Math.floor(Date.now() / 60_000)}`, { cache: 'no-store' });
  if (!res.ok) {
    if (optional) return null;
    throw new Error(`${file}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function loadDataset(): Promise<Dataset> {
  const [meta, xp, players, teams, ratings, news] = await Promise.all([
    getJson<Meta>('meta.json'),
    getJson<{ targets: number[]; players: XpPlayer[] }>('xp.json', true),
    getJson<{ players: Player[] }>('players.json'),
    getJson<{ teams: Team[] }>('teams.json'),
    getJson<{ teams: TeamRating[] }>('team-ratings.json', true),
    getJson<{ items: NewsItem[] }>('news.json', true),
  ]);
  const xpById = new Map((xp?.players ?? []).map((x) => [x.id, x]));
  const rows: Row[] = players!.players.map((p) => ({ ...p, xp: xpById.get(p.id) ?? null }));
  return {
    meta: meta!,
    rows,
    byId: new Map(rows.map((r) => [r.id, r])),
    teams: teams!.teams,
    teamById: new Map(teams!.teams.map((t) => [t.id, t])),
    ratings: ratings?.teams ?? [],
    ratingById: new Map((ratings?.teams ?? []).map((t) => [t.id, t])),
    news: news?.items ?? [],
    targets: xp?.targets ?? [],
  };
}

export type LoadState = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: Dataset };

export function useDataset(): [LoadState, () => void] {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    loadDataset()
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((e: unknown) => alive && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [nonce]);
  return [state, () => setNonce((n) => n + 1)];
}

/** Atualiza "agora" periodicamente (contagem decrescente e frescura). */
export function useNow(everyMs = 15_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
