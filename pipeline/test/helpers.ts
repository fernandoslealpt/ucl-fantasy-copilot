import { HttpError, type Http } from '../lib/http.ts';

export const TEAMS = [
  { id: '52919', name: 'Man City', code: 'MCI', country: 'ENG' },
  { id: '2603790', name: 'Leipzig', code: 'RBL', country: 'GER' },
  { id: '52747', name: 'Paris', code: 'PSG', country: 'FRA' },
  { id: '50147', name: 'Benfica', code: 'BEN', country: 'POR' },
] as const;

/** Jornada 4: Leipzig–Man City (21:00 CET) e Benfica–Paris (18:45 CET). */
export const GD4 = [
  { home: 1, away: 0, date: '11/04/2026 21:00:00', utc: '2026-11-04T20:00:00Z' },
  { home: 3, away: 2, date: '11/04/2026 18:45:00', utc: '2026-11-04T17:45:00Z' },
];

/** Pontos de um jogador numa jornada (determinístico). */
export const ptsFor = (i: number, gd: number) => (i * 3 + gd) % 7;
export const minsFor = (i: number) => (i % 3 === 0 ? 45 : 90);

/**
 * Jogador no formato do feed real. `playedThrough` = última jornada já jogada
 * (por defeito a anterior à atual, i.e. jornada atual ainda por jogar).
 */
export function rawPlayer(
  i: number,
  gameday: number,
  over: Record<string, unknown> = {},
  playedThrough = gameday - 1,
): Record<string, unknown> {
  const team = TEAMS[i % TEAMS.length]!;
  const teamIdx = i % TEAMS.length;
  const fx = GD4.find((f) => f.home === teamIdx || f.away === teamIdx)!;
  const isHome = fx.home === teamIdx;
  const opp = TEAMS[isHome ? fx.away : fx.home]!;
  let tot = 0;
  for (let g = 1; g <= playedThrough; g++) tot += ptsFor(i, g);
  const match = {
    mdId: String(gameday),
    tId: team.id,
    tSCode: team.name,
    cCode: team.code,
    tLoc: isHome ? 'H' : 'A',
    vsTID: opp.id,
    vsTSCode: opp.name,
    vsCCode: opp.code,
    matchDate: gameday === 4 ? fx.date : '11/25/2026 21:00:00',
    vsTLoc: isHome ? 'A' : 'H',
  };
  return {
    id: String(250000000 + i),
    pDName: `P. Jogador${i}`,
    pFName: `Pedro Jogador${i}`,
    tName: team.name,
    tId: team.id,
    teamPlayed: 0,
    minsPlyd: minsFor(i) * playedThrough,
    mTransferIn: 100 + i,
    mTransferOut: 50,
    rating: 5.0,
    cCode: team.code,
    skill: (i % 4) + 1,
    value: 4 + (i % 8),
    isActive: 1,
    selPer: (i % 50) + 0.5,
    mdId: String(gameday),
    totPts: tot,
    gS: i % 2,
    assist: 0,
    cS: 0,
    gC: 1,
    yC: 0,
    rC: 0,
    oG: 0,
    pS: 0,
    pC: 0,
    pE: 0,
    saves: 0,
    pM: 0,
    bR: i % 9,
    gOB: 0,
    mOM: 0,
    mOMPts: 0,
    pStatus: '',
    qStatus: '',
    curGDPts: playedThrough >= gameday ? ptsFor(i, gameday) : 0,
    matchAtd: ' ',
    trained: 'In contention to start next game',
    isPlayed: 0,
    selInPer: 2.0,
    selOutPer: 1.0,
    upcomingMatchesList: [match],
    currentMatchesList: [match],
    avgPlayerPts: 3.3,
    lastGdPoints: gameday > 1 ? ptsFor(i, gameday - 1) : 0,
    ptName: 'Pot 1',
    ...over,
  };
}

export function feedJson(players: unknown[]): string {
  return JSON.stringify({ data: { value: { playerList: players } } });
}

export function fantasyFeed(gameday: number, n = 240, playedThrough = gameday - 1): string {
  return feedJson(Array.from({ length: n }, (_, i) => rawPlayer(i, gameday, {}, playedThrough)));
}

function team(t: (typeof TEAMS)[number]) {
  return {
    id: t.id,
    internationalName: t.name === 'Leipzig' ? 'RB Leipzig' : t.name === 'Paris' ? 'Paris' : t.name,
    teamCode: t.code,
    countryCode: t.country,
    logoUrl: `https://img.uefa.com/imgml/TP/teams/logos/70x70/${t.id}.png`,
  };
}

/** Jogos J1–J3 terminados + J4 por jogar + 1 jogo de qualificação (a ignorar). */
export function uefaMatchesJson(): string {
  const pairs: [number, number][][] = [
    [[0, 1], [2, 3]],
    [[3, 0], [1, 2]],
    [[0, 2], [3, 1]],
  ];
  const matches: unknown[] = [];
  pairs.forEach((md, k) =>
    md.forEach(([h, a], j) =>
      matches.push({
        id: `20491${k}${j}`,
        homeTeam: team(TEAMS[h]!),
        awayTeam: team(TEAMS[a]!),
        status: 'FINISHED',
        competitionPhase: 'TOURNAMENT',
        kickOffTime: { date: '', dateTime: `${['2026-09-16', '2026-09-30', '2026-10-21'][k]}T19:00:00Z`, utcOffsetInHours: 2 },
        matchday: { sequenceNumber: String(k + 1), name: `MD${k + 1}`, phase: 'TOURNAMENT', longName: `Matchday ${k + 1}` },
        score: { total: { home: (h + 1) % 3, away: a % 2 } },
      }),
    ),
  );
  GD4.forEach((f, j) =>
    matches.push({
      id: `20496${j}`,
      homeTeam: team(TEAMS[f.home]!),
      awayTeam: team(TEAMS[f.away]!),
      status: 'UPCOMING',
      competitionPhase: 'TOURNAMENT',
      kickOffTime: { date: '2026-11-04', dateTime: f.utc, utcOffsetInHours: 1 },
      matchday: { sequenceNumber: '4', name: 'MD4', phase: 'TOURNAMENT', longName: 'Matchday 4' },
    }),
  );
  matches.push({
    id: '2048621',
    homeTeam: { id: '2609356', internationalName: 'Sabah', teamCode: 'SAB', countryCode: 'AZE', logoUrl: '' },
    awayTeam: { id: '999', internationalName: 'The New Saints', teamCode: 'TNS', countryCode: 'WAL', logoUrl: '' },
    status: 'FINISHED',
    competitionPhase: 'QUALIFYING',
    kickOffTime: { dateTime: '2026-07-07T16:00:00Z' },
    matchday: { sequenceNumber: '1', name: 'MD1', phase: 'QUALIFYING' },
    score: { total: { home: 2, away: 0 } },
  });
  return JSON.stringify(matches);
}

export function clubEloCsv(): string {
  const rows = [
    'Rank,Club,Country,Level,Elo,From,To',
    '1,Man City,ENG,1,2010.5,2026-10-30,2026-11-03',
    '2,Paris SG,FRA,1,1960.2,2026-10-30,2026-11-03',
    '9,Benfica,POR,1,1850.9,2026-10-30,2026-11-03',
    '12,RB Leipzig,GER,1,1801.0,2026-10-30,2026-11-03',
    '20,Man United,ENG,1,1790.0,2026-10-30,2026-11-03',
    'None,Paris FC,FRA,1,1540.0,2026-10-30,2026-11-03',
    '40,Olympiakos,GRE,1,1700.0,2026-10-30,2026-11-03',
    '41,Brugge,BEL,1,1690.0,2026-10-30,2026-11-03',
    '90,Cercle Brugge,BEL,1,1450.0,2026-10-30,2026-11-03',
    '42,Bayern,GER,1,1990.0,2026-10-30,2026-11-03',
    '43,Bodoe/Glimt,NOR,1,1680.0,2026-10-30,2026-11-03',
    '44,Betis,ESP,1,1700.0,2026-10-30,2026-11-03',
    '45,Real Madrid,ESP,1,1950.0,2026-10-30,2026-11-03',
    '46,Atletico,ESP,1,1850.0,2026-10-30,2026-11-03',
  ];
  for (let i = 0; i < 110; i++) rows.push(`${100 + i},Filler ${i},XXX,2,${1300 + i},2026-10-30,2026-11-03`);
  return rows.join('\n');
}

export type Route = { match: (url: string) => boolean; body?: string | ((url: string) => string); status?: number };

/** HTTP falso: responde por URL e conta pedidos (como o cliente real). */
export function fakeHttp(routes: Route[], calls: string[] = []): Http {
  let requests = 0;
  return {
    async getText(url: string) {
      requests++;
      calls.push(url);
      const r = routes.find((x) => x.match(url));
      if (!r) throw new HttpError(url, 404, `HTTP 404 em ${url}`);
      if (r.status && r.status >= 400) throw new HttpError(url, r.status, `HTTP ${r.status} em ${url}`);
      return typeof r.body === 'function' ? r.body(url) : (r.body ?? '');
    },
    get requests() {
      return requests;
    },
  };
}

/** Resposta real do feed sem jogadores (sem gamedayId, ou jornada ainda não aberta). */
export const EMPTY_FEED = JSON.stringify({
  data: { value: {}, feedTime: { utcTime: '', istTime: '', cestTime: '' } },
  meta: { message: 'OK', retVal: 1, success: true },
});

/**
 * Comportamento real do feed (1 nov 2026): sem gamedayId → vazio; qualquer jornada até à atual →
 * o estado ATUAL (mdId = jornada atual); jornada futura → vazio.
 */
export function fantasyRoutes(currentGameday = 4, playedThrough = currentGameday - 1): Route[] {
  return [
    {
      match: (u: string) => {
        const m = /gamedayId=(\d+)&/.exec(u);
        return u.includes('uclfantasy') && !!m && Number(m[1]) <= currentGameday;
      },
      body: () => fantasyFeed(currentGameday, 240, playedThrough),
    },
    { match: (u) => u.includes('uclfantasy'), body: EMPTY_FEED },
  ];
}

export const matchRoutes: Route[] = [
  { match: (u) => u.includes('match.uefa.com') && u.includes('offset=0&'), body: () => uefaMatchesJson() },
  { match: (u) => u.includes('match.uefa.com'), body: '[]' },
];

export const eloRoutes: Route[] = [{ match: (u) => u.includes('clubelo'), body: () => clubEloCsv() }];

/** Histórico oficial de um jogador no formato real do popupstats (matchdayStats + matchdayPoints). */
export function playerHistoryJson(i: number, playedThrough: number): string {
  const gds = Array.from({ length: playedThrough }, (_, k) => k + 1);
  const matchdayStats = gds.map((g) => ({
    pId: 250000000 + i,
    mId: 0,
    oF: minsFor(i),
    gS: g === 1 ? i % 2 : 0,
    gA: 0,
    cS: 0,
    sS: 0,
    pS: 0,
    pM: 0,
    pE: 0,
    pC: 0,
    gC: 0,
    yC: 0,
    rC: 0,
    oG: 0,
    bR: i % 9,
    gOB: 0,
    saves: 0,
    mdId: g,
    mOM: 0,
  }));
  const matchdayPoints = gds.map((g) => ({ pId: 250000000 + i, mId: 0, oF: 2, gS: 0, bR: 0, mOM: 0, tPoints: ptsFor(i, g), mdId: g }));
  const total = gds.reduce((a, g) => a + ptsFor(i, g), 0);
  return JSON.stringify({
    data: {
      value: { gdPlayed: 0, id: 250000000 + i, fixtures: [], stats: [], points: [], matchdayStats, matchdayPoints, overallPoints: { tPoints: total } },
      feedTime: { utcTime: '11/1/2026 10:29:41 AM' },
    },
    meta: { message: 'OK', success: true },
  });
}

/** Popupstats por jogador (o índice do jogador sai do ID no URL). */
export function playerHistoryRoutes(playedThrough = 3): Route[] {
  return [
    {
      match: (u) => /popupstats_90_\d+\.json$/.test(u),
      body: (u) => playerHistoryJson(Number(/_(\d+)\.json$/.exec(u)![1]) - 250000000, playedThrough),
    },
  ];
}

/** Coeficientes UEFA no formato real (data.members[].member.id / overallRanking). */
export function coefficientsJson(): string {
  const members = [
    ...TEAMS.map((t, k) => ({ member: { id: t.id, displayName: t.name }, overallRanking: { position: k + 1, totalValue: 120 - k * 10 } })),
    ...Array.from({ length: 60 }, (_, k) => ({ member: { id: String(900000 + k) }, overallRanking: { position: 10 + k, totalValue: 50 - k / 2 } })),
  ];
  return JSON.stringify({ data: { lastUpdateDate: '2026-10-22T20:57:27+0000', members }, meta: {} });
}

export const coefficientRoutes: Route[] = [{ match: (u) => u.includes('comp.uefa.com'), body: () => coefficientsJson() }];

/** Época anterior: 24 jogos terminados entre as 4 equipas + popupstats_80 (jogadores pares; ímpares → 403). */
export function prevSeasonMatchesJson(): string {
  const matches: unknown[] = [];
  let k = 0;
  for (let round = 0; round < 4; round++)
    for (let h = 0; h < 4; h++)
      for (let a = 0; a < 4; a++) {
        if (h === a || (h + a + round) % 2 === 1) continue;
        matches.push({
          id: `1990${String(k++).padStart(3, '0')}`,
          homeTeam: team(TEAMS[h]!),
          awayTeam: team(TEAMS[a]!),
          status: 'FINISHED',
          competitionPhase: 'TOURNAMENT',
          kickOffTime: { dateTime: `2025-10-${String(1 + k).padStart(2, '0')}T19:00:00Z` },
          matchday: { sequenceNumber: String(round + 1), name: `MD${round + 1}`, phase: 'TOURNAMENT' },
          score: { total: { home: (3 - h + round) % 4, away: (3 - a) % 3 } },
        });
      }
  return JSON.stringify(matches);
}

export function prevSeasonRoutes(): Route[] {
  return [
    { match: (u) => u.includes('match.uefa.com') && u.includes('seasonYear=2026') && u.includes('offset=0&'), body: () => prevSeasonMatchesJson() },
    { match: (u) => u.includes('match.uefa.com'), body: '[]' },
    {
      match: (u) => /popupstats_80_\d+\.json$/.test(u) && Number(/_(\d+)\.json$/.exec(u)![1]) % 2 === 0,
      body: (u) => playerHistoryJson(Number(/_(\d+)\.json$/.exec(u)![1]) - 250000000, 6),
    },
    { match: (u) => /popupstats_80_/.test(u), status: 403 },
  ];
}

/** RSS do Google News (formato real) para uma equipa. */
export function newsRss(teamName: string, extra: { title: string; minutesAgo: number }[] = []): string {
  const items = [
    { title: `${teamName} defender P. Jogador2 ruled out with hamstring injury`, minutesAgo: 60 },
    { title: `Jogador6 back in training ahead of ${teamName} clash`, minutesAgo: 300 },
    { title: `${teamName} press conference: coach on rotation`, minutesAgo: 600 },
    { title: `Old story about ${teamName}`, minutesAgo: 60 * 24 * 5 },
    ...extra,
  ];
  const base = Date.parse('2026-10-31T12:00:00Z');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>x</title>${items
    .map(
      (it, k) =>
        `<item><title>${it.title.replace(/&/g, '&amp;')} - Sky Sports</title><link>https://news.google.com/rss/articles/${teamName}${k}</link><guid isPermaLink="false">${teamName}${k}</guid><pubDate>${new Date(base - it.minutesAgo * 60_000).toUTCString()}</pubDate><source url="https://www.skysports.com">Sky Sports</source></item>`,
    )
    .join('')}</channel></rss>`;
}

export const newsRoutes: Route[] = [
  {
    match: (u) => u.includes('news.google.com'),
    body: (u) => newsRss(/%22([^%]+(?:%20[^%]+)*)%22/.exec(u)?.[1]?.replace(/%20/g, ' ') ?? 'Team'),
  },
];
