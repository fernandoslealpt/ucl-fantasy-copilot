import { describe, expect, it } from 'vitest';
import { parseFantasyDate, uefaSeasonYear } from '../lib/time.ts';
import { parseClubEloCsv } from '../sources/clubElo.ts';
import { EmptyFeedError, fantasyPlayersUrl, parseFantasyFeed } from '../sources/uefaFantasy.ts';
import { isQualifying, parseUefaMatches, uefaMatchesUrl } from '../sources/uefaMatches.ts';
import { fantasyTourId, parsePlayerHistory, playerHistoryUrl } from '../sources/uefaPlayerHistory.ts';
import { classify, parseNewsRss, surname } from '../sources/news.ts';
import { clubEloCsv, EMPTY_FEED, feedJson, newsRss, rawPlayer, uefaMatchesJson } from './helpers.ts';

describe('datas', () => {
  it('converte hora CET do feed fantasy para UTC (inverno)', () => {
    expect(parseFantasyDate('11/04/2026 21:00:00')).toBe('2026-11-04T20:00:00.000Z');
    expect(parseFantasyDate('11/04/2026 18:45:00')).toBe('2026-11-04T17:45:00.000Z');
  });
  it('converte hora CEST (verão)', () => {
    expect(parseFantasyDate('10/14/2026 21:00:00')).toBe('2026-10-14T19:00:00.000Z');
  });
  it('devolve null para formatos inválidos', () => {
    expect(parseFantasyDate('')).toBeNull();
    expect(parseFantasyDate('2026-11-04')).toBeNull();
  });
  it('calcula a época UEFA', () => {
    expect(uefaSeasonYear(new Date('2026-10-31T12:00:00Z'))).toBe(2027);
    expect(uefaSeasonYear(new Date('2027-03-10T12:00:00Z'))).toBe(2027);
    expect(uefaSeasonYear(new Date('2027-07-10T12:00:00Z'))).toBe(2028);
  });
});

describe('feed fantasy', () => {
  it('constrói URLs', () => {
    expect(fantasyPlayersUrl()).toMatch(/players\?language=en$/);
    expect(fantasyPlayersUrl(3)).toMatch(/players\?gamedayId=3&language=en$/);
  });

  it('lê o formato real (data.value.playerList) e a jornada atual', () => {
    const feed = parseFantasyFeed(feedJson([rawPlayer(0, 4), rawPlayer(1, 4), rawPlayer(2, 4)]));
    expect(feed.players).toHaveLength(3);
    expect(feed.gameday).toBe(4);
    const p = feed.players[0]!;
    expect(p.id).toBe('250000000');
    expect(p.skill).toBe(1);
    expect(p.upcomingMatchesList[0]?.vsTID).toBe('2603790');
    expect(p.upcomingMatchesList[0]?.mdId).toBe(4);
  });

  it('aceita números como texto e campos opcionais em falta', () => {
    const raw = rawPlayer(5, 4, { value: '7.5', skill: '3', id: 123, gS: '2' });
    delete (raw as Record<string, unknown>).bR;
    delete (raw as Record<string, unknown>).upcomingMatchesList;
    const feed = parseFantasyFeed(feedJson([raw]));
    expect(feed.invalid).toBe(0);
    const p = feed.players[0]!;
    expect(p.value).toBe(7.5);
    expect(p.skill).toBe(3);
    expect(p.id).toBe('123');
    expect(p.gS).toBe(2);
    expect(p.bR).toBe(0);
    expect(p.upcomingMatchesList).toEqual([]);
  });

  it('ignora jogadores inválidos e conta-os', () => {
    const feed = parseFantasyFeed(
      feedJson([rawPlayer(0, 4), rawPlayer(1, 4, { skill: 9 }), rawPlayer(2, 4, { pDName: '' }), { foo: 1 }]),
    );
    expect(feed.players).toHaveLength(1);
    expect(feed.invalid).toBe(3);
    expect(feed.invalidSamples.length).toBeGreaterThan(0);
  });

  it('distingue feed vazio (sem gamedayId) de formato desconhecido', () => {
    expect(() => parseFantasyFeed(EMPTY_FEED)).toThrow(EmptyFeedError);
  });

  it('falha com mensagem clara se o formato mudar', () => {
    expect(() => parseFantasyFeed('{"data":{}}')).toThrow(/playerList/);
    expect(() => parseFantasyFeed('<html>blocked</html>')).toThrow(/JSON/);
  });
});

describe('API de jogos UEFA', () => {
  it('lê jogos e identifica a qualificação', () => {
    const { matches, invalid } = parseUefaMatches(uefaMatchesJson());
    expect(invalid).toBe(0);
    expect(matches).toHaveLength(9);
    expect(matches.filter(isQualifying)).toHaveLength(1);
    const md4 = matches.find((m) => m.matchday?.sequenceNumber === 4)!;
    expect(md4.kickOffTime?.dateTime).toBe('2026-11-04T20:00:00Z');
    expect(md4.score).toBeUndefined();
  });
  it('limita o pedido à época (sem pré-eliminatórias de julho/agosto)', () => {
    expect(uefaMatchesUrl(2027, 50, 50)).toContain('fromDate=2026-09-01&toDate=2027-06-30&limit=50&offset=50');
  });
});

describe('ClubElo', () => {
  it('lê o CSV pelo cabeçalho', () => {
    const clubs = parseClubEloCsv(clubEloCsv());
    expect(clubs.length).toBeGreaterThan(100);
    expect(clubs.find((c) => c.club === 'Paris FC')).toEqual({ club: 'Paris FC', country: 'FRA', level: 1, elo: 1540 });
    expect(clubs.find((c) => c.club === 'Man City')?.elo).toBe(2011);
  });
  it('rejeita CSV sem colunas esperadas', () => {
    expect(() => parseClubEloCsv('a,b\n1,2')).toThrow(/cabeçalho/);
  });
});

describe('histórico oficial por jogador (popupstats)', () => {
  // Estrutura real (Kane, 1 nov 2026), reduzida aos campos usados.
  const KANE = JSON.stringify({
    data: {
      value: {
        id: 250016833,
        matchdayStats: [
          { pId: 250016833, oF: 90, gS: 1, gA: 1, cS: 0, bR: 0, saves: 0, mdId: 1, mOM: 0 },
          { pId: 250016833, oF: 90, gS: 2, gA: 0, cS: 0, bR: 1, saves: 0, mdId: 2, mOM: 1 },
          { pId: 250016833, oF: 90, gS: 1, gA: 1, cS: 0, bR: 2, saves: 0, mdId: 3, mOM: 1 },
        ],
        matchdayPoints: [
          { oF: 2, gS: 4, gA: 3, sS: 0, bR: 0, tPoints: 9, mdId: 1, mOM: 0 },
          { oF: 2, gS: 8, gA: 0, sS: 0, bR: 0, tPoints: 13, mdId: 2, mOM: 3 },
          { oF: 2, gS: 4, gA: 3, sS: 0, bR: 0, tPoints: 12, mdId: 3, mOM: 3 },
        ],
        overallPoints: { tPoints: 34 },
      },
    },
  });

  it('lê pontos, minutos, estatísticas e decomposição por jornada', () => {
    const { lines, totalPoints } = parsePlayerHistory(KANE);
    expect(totalPoints).toBe(34);
    expect(lines.map((l) => [l.gameday, l.points, l.minutes])).toEqual([
      [1, 9, 90],
      [2, 13, 90],
      [3, 12, 90],
    ]);
    expect(lines[1]?.stats).toMatchObject({ goals: 2, recoveries: 1, playerOfTheMatch: 1 });
    expect(lines[1]?.breakdown).toEqual({ appearance: 2, goals: 8, playerOfTheMatch: 3 });
    expect(lines.reduce((a, l) => a + l.points, 0)).toBe(34);
  });

  it('URL e tour ID por época', () => {
    expect(fantasyTourId(2027)).toBe(90);
    expect(fantasyTourId(2026)).toBe(80);
    expect(playerHistoryUrl(90, '250016833')).toBe(
      'https://gaming.uefa.com/en/uclfantasy/services/feeds/popupstats/popupstats_90_250016833.json',
    );
  });
});

describe('notícias', () => {
  const roster = [
    { id: '1', name: 'P. Jogador2' },
    { id: '2', name: 'R. Jogador6' },
    { id: '3', name: 'H. Kane' },
  ];
  it('lê o RSS, tira a fonte do título, classifica e encontra jogadores', () => {
    const items = parseNewsRss(newsRss('Benfica'), { id: '50147', name: 'Benfica' }, roster);
    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ title: 'Benfica defender P. Jogador2 ruled out with hamstring injury', source: 'Sky Sports', kind: 'injury', playerIds: ['1'], teamId: '50147' });
    expect(items[1]).toMatchObject({ kind: 'return', playerIds: ['2'] });
    expect(items[2]?.kind).toBe('other');
  });
  it('classifica por palavras-chave (EN/PT/ES)', () => {
    expect(classify('Star faces late fitness test')).toBe('doubt');
    expect(classify('Avançado lesionado falha jogo')).toBe('injury');
    expect(classify('Delantero regresa a los entrenamientos')).toBe('return');
  });
  it('apelido ignora iniciais', () => {
    expect(surname('H. Kane')).toBe('kane');
    expect(surname('Vitinha')).toBe('vitinha');
    expect(surname('A. Bo')).toBeNull();
  });
});
