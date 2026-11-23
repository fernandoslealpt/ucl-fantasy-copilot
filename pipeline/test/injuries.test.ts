import { describe, expect, it } from 'vitest';
import { injuryAbsences, updateInjuries } from '../normalize/injuries.ts';
import { classify, classifyDuration, type NewsItem } from '../sources/news.ts';
import { computeXp } from '../model/xp.ts';
import { fitRatings } from '../model/ratings.ts';
import type { Fixture, Player } from '../types.ts';

describe('duração da lesão lida do título', () => {
  it('ligamento cruzado / cirurgia ao joelho = lesão longa', () => {
    expect(classifyDuration("PSG's Doue to have surgery on ruptured ACL").kind).toBe('long');
    expect(classifyDuration('Paris Saint-Germain’s Desire Doue sustains ACL injury in right knee').kind).toBe('long');
    expect(classifyDuration('Season-ending injury for Kane').kind).toBe('long');
  });
  it('prazos explícitos: semanas, meses, dias', () => {
    expect(classifyDuration('Haaland out for six weeks with foot injury')).toEqual({ kind: 'weeks', weeks: 6 });
    expect(classifyDuration('Saka to miss 3 months after surgery')).toEqual({ kind: 'long', weeks: 13 });
    expect(classifyDuration('Rodri ruled out for a few weeks')).toEqual({ kind: 'weeks', weeks: 3 });
    expect(classifyDuration('Bellingham out for 10 days')).toEqual({ kind: 'days', weeks: 1.4 });
  });
  it('cirurgia sem prazo = semanas; sem pistas = desconhecida', () => {
    expect(classifyDuration('Player to undergo surgery').kind).toBe('weeks');
    expect(classifyDuration('Could David Raya’s Injury Cost Arsenal Everything This Season? – Opinion')).toEqual({ kind: 'unknown', weeks: null });
  });
  it('"regressa" não é lesão', () => {
    expect(classify('Raya returns to training after injury')).toBe('return');
  });
});

const NOW = '2026-11-23T10:00:00.000Z';
const players = [
  { id: 'd', name: 'D. Doué', teamId: 'psg', teamName: 'Paris' },
  { id: 'r', name: 'D. Raya', teamId: 'ars', teamName: 'Arsenal' },
];
const fx = (id: string, gd: number, kickoff: string, h: string, a: string): Fixture =>
  ({ id, gameday: gd, phase: 'T', round: 'League Phase', homeId: h, awayId: a, homeName: h, awayName: a, homeCode: h, awayCode: a, kickoff, status: 'SCHEDULED', score: null, source: 'uefa-matches' }) as Fixture;
const fixtures = [fx('1', 5, '2026-11-25T20:00:00Z', 'psg', 'x'), fx('2', 6, '2026-12-09T20:00:00Z', 'y', 'psg'), fx('3', 7, '2027-01-20T20:00:00Z', 'psg', 'z'), fx('4', 8, '2027-01-27T20:00:00Z', 'w', 'psg')];
const item = (title: string, source: string, ids: string[], at: string, kind: NewsItem['kind'] = 'injury'): NewsItem => ({
  id: title + source, title, source, url: 'https://x/' + source, publishedAt: at, teamId: 'psg', teamName: 'Paris', kind, playerIds: ids,
  ...(kind === 'injury' ? { duration: classifyDuration(title) } : {}),
});

describe('registo de lesões', () => {
  const doue = [
    item("PSG's Doue to have surgery on ruptured ACL", 'Reuters', ['d'], '2026-11-22T15:50:00Z'),
    item('Paris Saint-Germain’s Desire Doue sustains ACL injury in right knee', 'The Athletic', ['d'], '2026-11-22T12:16:00Z'),
  ];
  it('2 fontes + ligamento cruzado = confirmada, fora até ao fim do calendário conhecido', () => {
    const r = updateInjuries(null, doue, players, fixtures, NOW);
    expect(r.injuries).toHaveLength(1);
    const i = r.injuries[0]!;
    expect(i).toMatchObject({ playerId: 'd', severity: 'long', status: 'confirmed', outUntilGameday: 8 });
    expect(i.evidence).toHaveLength(2);
    expect(injuryAbsences(r).get('d')).toEqual({ outUntilGameday: 8, status: 'confirmed' });
  });
  it('1 fonte = suspeita; 1 fonte + RotoWire OUT = confirmada', () => {
    expect(updateInjuries(null, [doue[0]!], players, fixtures, NOW).injuries[0]!.status).toBe('suspected');
    const lineups = { fetchedAt: NOW, source: 'rotowire', stats: { matches: 0, sides: 0, listed: 0, matched: 0 }, teams: [{ teamId: 'psg', teamName: 'Paris', gameday: 5, status: 'predicted', starters: [], injuries: [{ id: 'd', tag: 'OUT' }], unmatched: [] }] } as never;
    expect(updateInjuries(null, [doue[0]!], players, fixtures, NOW, lineups).injuries[0]!.status).toBe('confirmed');
  });
  it('a lesão longa persiste depois de as notícias saírem da janela de 72 h', () => {
    const first = updateInjuries(null, doue, players, fixtures, NOW);
    const later = updateInjuries(first, [], players, fixtures, '2026-11-30T10:00:00.000Z');
    expect(later.injuries).toHaveLength(1);
    expect(later.injuries[0]!.outUntilGameday).toBe(8);
  });
  it('notícia de regresso posterior apaga a entrada', () => {
    const first = updateInjuries(null, doue, players, fixtures, NOW);
    const back = updateInjuries(first, [item('Doue returns to training', 'L’Equipe', ['d'], '2026-12-20T10:00:00Z', 'return')], players, fixtures, '2026-12-20T12:00:00.000Z');
    expect(back.injuries).toHaveLength(0);
  });
  it('prazo ultrapassado: deixa de contar', () => {
    const w = item('Doue out for 3 weeks', 'A', ['d'], '2026-11-01T10:00:00Z');
    const r = updateInjuries(null, [w], players, fixtures, NOW); // 1 nov + 3 semanas = 22 nov < 23 nov
    expect(r.injuries).toHaveLength(0);
  });
  it('lesão de semanas: fora só nas jornadas até ao regresso', () => {
    const w = item('Doue out for 3 weeks', 'A', ['d'], '2026-11-22T10:00:00Z');
    const r = updateInjuries(null, [w, { ...w, id: 'b', title: 'Doue to miss 3 weeks', source: 'B' }], players, fixtures, NOW);
    expect(r.injuries[0]).toMatchObject({ severity: 'weeks', status: 'confirmed', outUntilGameday: 6 });
  });
  it('sem duração nas notícias (Raya): não entra no registo (fica só o sinal de 72 h)', () => {
    const r = updateInjuries(null, [item('Could David Raya’s Injury Cost Arsenal Everything', 'X', ['r'], '2026-11-22T17:00:00Z')], players, fixtures, NOW);
    expect(r.injuries).toHaveLength(0);
    expect(injuryAbsences(r).size).toBe(0);
  });
  it('duração estimada pelo tipo de lesão é marcada como "assumida"; prazo escrito não', () => {
    expect(updateInjuries(null, doue, players, fixtures, NOW).injuries[0]!.assumed).toBe(true);
    const w = item('Doue out for 3 weeks', 'A', ['d'], '2026-11-22T10:00:00Z');
    expect(updateInjuries(null, [w], players, fixtures, NOW).injuries[0]!.assumed).toBe(false);
  });
  it('notícias com 2 jogadores no título são ignoradas (ambíguas)', () => {
    expect(updateInjuries(null, [item('Doue and Raya hit by ACL injuries', 'X', ['d', 'r'], '2026-11-22T17:00:00Z')], players, fixtures, NOW).injuries).toHaveLength(0);
  });
});

describe('modelo: lesão longa vale para todas as jornadas', () => {
  const mkPlayer = (): Player =>
    ({
      id: 'd', name: 'D. Doué', fullName: 'Désiré Doué', teamId: 'psg', teamName: 'Paris', teamCode: 'PSG', position: 'MID', price: 8.6, selectedPct: 15,
      availability: 'available', status: { code: '', quality: '', note: '', active: true },
      stats: { minutes: 300, points: 35 }, form: { lastGameday: 9, avgPoints: 8 },
      history: [1, 2, 3, 4].map((g) => ({ gameday: g, points: 8, minutes: 90, source: 'uefa', stats: { goals: 0, assists: 1, cleanSheets: 0, goalsConceded: 0, saves: 0, recoveries: 3, yellowCards: 0, redCards: 0, ownGoals: 0, penaltiesSaved: 0, penaltiesMissed: 0, penaltiesEarned: 0, penaltiesConceded: 0, goalsOutsideBox: 0, playerOfTheMatch: 0 } })),
    }) as unknown as Player;
  const base = (absences?: Map<string, { outUntilGameday: number; status: 'confirmed' | 'suspected' }>) =>
    computeXp({ players: [mkPlayer()], prev: {}, fixtures, ratings: fitRatings([], new Map()), targets: [5, 6, 7, 8], lastGameday: 4, absences })[0]!;
  it('confirmada: xP 0 até outUntilGameday e normal depois', () => {
    const r = base(new Map([['d', { outUntilGameday: 6, status: 'confirmed' }]]));
    expect(r.fixtures.map((f) => f.xp > 0)).toEqual([false, false, true, true]);
    expect(r.fixtures[0]!.absence).toBe('confirmed');
    expect(r.fixtures[2]!.absence).toBeUndefined();
  });
  it('suspeita: reduz probabilidades mas não zera', () => {
    const normal = base();
    const s = base(new Map([['d', { outUntilGameday: 8, status: 'suspected' }]]));
    expect(s.fixtures[1]!.xp).toBeGreaterThan(0);
    expect(s.fixtures[1]!.xp).toBeLessThan(normal.fixtures[1]!.xp);
    expect(s.fixtures[1]!.pStart).toBeLessThan(normal.fixtures[1]!.pStart);
  });
});
