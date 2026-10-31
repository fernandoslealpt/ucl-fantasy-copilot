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

export function rawPlayer(i: number, gameday: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  const team = TEAMS[i % TEAMS.length]!;
  const teamIdx = i % TEAMS.length;
  const fx = GD4.find((f) => f.home === teamIdx || f.away === teamIdx)!;
  const isHome = fx.home === teamIdx;
  const opp = TEAMS[isHome ? fx.away : fx.home]!;
  let tot = 0;
  for (let g = 1; g <= gameday; g++) tot += g >= 4 ? 0 : ptsFor(i, g); // J4 ainda por jogar
  const match = {
    mdId: '4',
    tId: team.id,
    tSCode: team.name,
    cCode: team.code,
    tLoc: isHome ? 'H' : 'A',
    vsTID: opp.id,
    vsTSCode: opp.name,
    vsCCode: opp.code,
    matchDate: fx.date,
    vsTLoc: isHome ? 'A' : 'H',
  };
  return {
    id: String(250000000 + i),
    pDName: `P. Jogador${i}`,
    pFName: `Pedro Jogador${i}`,
    tName: team.name,
    tId: team.id,
    teamPlayed: 0,
    minsPlyd: minsFor(i) * Math.min(gameday, 3),
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
    curGDPts: gameday >= 4 ? 0 : ptsFor(i, gameday),
    matchAtd: ' ',
    trained: 'In contention to start next game',
    isPlayed: 0,
    selInPer: 2.0,
    selOutPer: 1.0,
    upcomingMatchesList: gameday >= 3 ? [match] : [],
    currentMatchesList: gameday >= 4 ? [match] : [],
    avgPlayerPts: 3.3,
    lastGdPoints: gameday > 1 ? ptsFor(i, gameday - 1) : 0,
    ptName: 'Pot 1',
    ...over,
  };
}

export function feedJson(players: unknown[]): string {
  return JSON.stringify({ data: { value: { playerList: players } } });
}

export function fantasyFeed(gameday: number, n = 240): string {
  return feedJson(Array.from({ length: n }, (_, i) => rawPlayer(i, gameday)));
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

export type Route = { match: (url: string) => boolean; body?: string | (() => string); status?: number };

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
      return typeof r.body === 'function' ? r.body() : (r.body ?? '');
    },
    get requests() {
      return requests;
    },
  };
}

export function fantasyRoutes(currentGameday = 4): Route[] {
  return [
    {
      match: (u) => u.includes('uclfantasy') && !u.includes('gamedayId'),
      body: () => fantasyFeed(currentGameday),
    },
    ...[1, 2, 3, 4].map((gd) => ({
      match: (u: string) => u.includes('uclfantasy') && u.includes(`gamedayId=${gd}&`),
      body: () => fantasyFeed(gd),
    })),
  ];
}

export const matchRoutes: Route[] = [
  { match: (u) => u.includes('match.uefa.com') && u.includes('offset=0&'), body: () => uefaMatchesJson() },
  { match: (u) => u.includes('match.uefa.com'), body: '[]' },
];

export const eloRoutes: Route[] = [{ match: (u) => u.includes('clubelo'), body: () => clubEloCsv() }];
