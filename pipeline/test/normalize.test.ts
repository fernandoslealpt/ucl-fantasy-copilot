import { describe, expect, it } from 'vitest';
import { parseFantasyDate } from '../lib/time.ts';
import { buildHistory, checkPointsHistory, deriveAvailability, positionFromSkill } from '../normalize/players.ts';
import {
  crossCheckFixtures,
  fixtureFromUefa,
  fixturesFromFantasy,
  matchTeamToElo,
  nameTokens,
  teamRecords,
} from '../normalize/teams.ts';
import { parseClubEloCsv } from '../sources/clubElo.ts';
import { parseFantasyFeed } from '../sources/uefaFantasy.ts';
import { parseUefaMatches } from '../sources/uefaMatches.ts';
import type { GamedayStatsFile } from '../types.ts';
import { clubEloCsv, fantasyFeed, feedJson, rawPlayer, uefaMatchesJson } from './helpers.ts';

const avail = (o: Partial<{ isActive: number; pStatus: string; qStatus: string; trained: string }>) =>
  deriveAvailability({ isActive: 1, pStatus: '', qStatus: '', trained: '', ...o });

describe('jogadores', () => {
  it('mapeia posições', () => {
    expect([1, 2, 3, 4].map(positionFromSkill)).toEqual(['GK', 'DEF', 'MID', 'FWD']);
    expect(() => positionFromSkill(5)).toThrow();
  });

  it('deriva disponibilidade de forma conservadora', () => {
    expect(avail({ trained: 'In contention to start next game' })).toBe('available');
    expect(avail({})).toBe('available');
    expect(avail({ trained: 'Not in contention to start next game' })).toBe('out');
    expect(avail({ pStatus: 'Injured' })).toBe('out');
    expect(avail({ pStatus: 'Suspended' })).toBe('out');
    expect(avail({ trained: 'Doubtful - 50% chance' })).toBe('doubtful');
    expect(avail({ isActive: 0 })).toBe('inactive');
    expect(avail({ qStatus: 'xyz' })).toBe('unknown');
    // Combinações observadas no feed real
    expect(avail({ pStatus: 'I', trained: 'Unlikely to start next game' })).toBe('out');
    expect(avail({ pStatus: 'NIS' })).toBe('out');
    expect(avail({ trained: 'Unlikely to start next game' })).toBe('doubtful');
  });

  it('calcula pontos e minutos por jornada a partir dos acumulados', () => {
    const stats: GamedayStatsFile = {
      season: 2027,
      updatedAt: '',
      gamedays: {
        '1': { fetchedAt: '', players: { a: [6, 89, 6], b: [2, 90, 2] } },
        '2': { fetchedAt: '', players: { a: [1, 89, 7], b: [0, 90, 2] } },
        '3': { fetchedAt: '', players: { a: [12, 179, 19], b: [3, 180, 5] } },
      },
    };
    const h = buildHistory(stats, 3);
    expect(h.get('a')).toEqual([
      { gameday: 1, points: 6, minutes: 89 },
      { gameday: 2, points: 1, minutes: 0 },
      { gameday: 3, points: 12, minutes: 90 },
    ]);
    expect(buildHistory(stats, 2).get('b')).toHaveLength(2);
  });

  it('verifica se a soma por jornada bate com o total', () => {
    const feed = parseFantasyFeed(feedJson([rawPlayer(0, 3), rawPlayer(1, 3)]));
    const stats: GamedayStatsFile = { season: 2027, updatedAt: '', gamedays: {} };
    for (const gd of [1, 2, 3]) {
      const f = parseFantasyFeed(feedJson([rawPlayer(0, gd), rawPlayer(1, gd)]));
      stats.gamedays[String(gd)] = { fetchedAt: '', players: Object.fromEntries(f.players.map((p) => [p.id, [p.curGDPts, p.minsPlyd, p.totPts]])) };
    }
    expect(checkPointsHistory(feed.players, buildHistory(stats, 3))).toEqual({ checked: 2, mismatches: 0 });
    expect(checkPointsHistory(feed.players, buildHistory(stats, 2)).mismatches).toBeGreaterThan(0);
  });
});

describe('jogos', () => {
  it('converte jogos UEFA (jornada, resultado, UTC)', () => {
    const { matches } = parseUefaMatches(uefaMatchesJson());
    const f = fixtureFromUefa(matches[0]!);
    expect(f.gameday).toBe(1);
    expect(f.status).toBe('FINISHED');
    expect(f.score).not.toBeNull();
    const up = fixtureFromUefa(matches.find((m) => m.status === 'UPCOMING')!);
    expect(up.score).toBeNull();
    expect(up.kickoff).toBe('2026-11-04T20:00:00.000Z');
  });

  it('deduz jogos do feed fantasy sem duplicados e com casa/fora certos', () => {
    const feed = parseFantasyFeed(fantasyFeed(4, 40));
    const fx = fixturesFromFantasy(feed.players, (r) => parseFantasyDate(r));
    expect(fx).toHaveLength(2);
    const lm = fx.find((f) => f.homeId === '2603790')!;
    expect(lm.awayId).toBe('52919');
    expect(lm.kickoff).toBe('2026-11-04T20:00:00.000Z');
    expect(fx[0]!.kickoff).toBe('2026-11-04T17:45:00.000Z'); // ordenados por hora
  });

  it('cruza jogos fantasy com a API UEFA', () => {
    const feed = parseFantasyFeed(fantasyFeed(4, 40));
    const fantasy = fixturesFromFantasy(feed.players, (r) => parseFantasyDate(r));
    const uefa = parseUefaMatches(uefaMatchesJson()).matches.map(fixtureFromUefa);
    expect(crossCheckFixtures(fantasy, uefa)).toEqual({ fantasy: 2, matched: 2 });
  });

  it('calcula V-E-D e golos só com jogos terminados', () => {
    const uefa = parseUefaMatches(uefaMatchesJson()).matches.map(fixtureFromUefa);
    const rec = teamRecords(uefa);
    const city = rec.get('52919')!;
    expect(city.played).toBe(3);
    expect(city.won + city.drawn + city.lost).toBe(3);
  });
});

describe('Elo', () => {
  const clubs = parseClubEloCsv(clubEloCsv());
  const m = (id: string, name: string, country: string | null, aliases: Record<string, string> = {}) =>
    matchTeamToElo({ id, name, country }, clubs, aliases);

  it('normaliza nomes', () => {
    expect(nameTokens('Bodø/Glimt')).toEqual(['bodo', 'glimt']);
    expect(nameTokens('FC Bayern München')).toEqual(['bayern', 'munchen']);
    expect(nameTokens('B. Dortmund')).toEqual(['dortmund']);
  });

  it('encontra correspondências exatas e aproximadas', () => {
    expect(m('1', 'Man City', 'ENG')).toMatchObject({ club: { club: 'Man City' }, kind: 'exact' });
    expect(m('2', 'Leipzig', 'GER')).toMatchObject({ club: { club: 'RB Leipzig' }, kind: 'fuzzy' });
    expect(m('3', 'Paris', 'FRA')?.club.club).toBe('Paris SG'); // desempate pelo Elo mais alto
    expect(m('4', 'Bayern München', 'GER')?.club.club).toBe('Bayern');
    expect(m('5', 'Olympiacos', 'GRE')?.club.club).toBe('Olympiakos');
    expect(m('6', 'Club Brugge', 'BEL')).toMatchObject({ club: { club: 'Brugge' }, kind: 'exact' });
    expect(m('7', 'Bodø/Glimt', 'NOR')?.club.club).toBe('Bodoe/Glimt');
    expect(m('8', 'Real Betis', 'ESP')?.club.club).toBe('Betis');
    expect(m('9', 'Atleti', 'ESP')?.club.club).toBe('Atletico');
  });

  it('não força correspondências parciais', () => {
    expect(m('10', 'Manchester United', 'ENG')).toBeNull(); // "man" ≠ "manchester": fica para alias manual
    expect(m('11', 'Kairat Almaty', 'KAZ')).toBeNull();
  });

  it('respeita aliases manuais', () => {
    expect(m('12', 'Qualquer Nome', 'ENG', { '12': 'Man United' })).toMatchObject({
      club: { club: 'Man United' },
      kind: 'alias',
    });
  });
});
