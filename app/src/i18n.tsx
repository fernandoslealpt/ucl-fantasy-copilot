import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Availability, NewsKind, Position } from './types';

export type Lang = 'pt' | 'en';

const PT = {
  appName: 'Fantasy Copilot',
  tabTeam: 'Equipa',
  tabPlayers: 'Jogadores',
  tabFixtures: 'Calendário',
  tabNews: 'Notícias',
  settings: 'Definições',
  loading: 'A carregar os dados mais recentes…',
  loadError: 'Não foi possível carregar os dados.',
  retry: 'Tentar de novo',
  untilDeadline: 'até ao fecho da J{gd}',
  deadlineAt: 'Fecho da J{gd}: {date}',
  deadlinePassed: 'J{gd} fechada',
  live: 'J{gd} a decorrer',
  finished: 'J{gd} terminada',
  updatedAgo: 'Dados de há {t}',
  sourceFailed: 'Fonte com falhas: {s}. A mostrar os últimos dados válidos.',
  min: 'min',
  h: 'h',
  d: 'd',
  // equipa
  noTeamTitle: 'A tua equipa ainda não está aqui',
  noTeamText: 'Insere os 15 jogadores uma vez. Depois só registas as trocas.',
  addTeam: 'Inserir a minha equipa',
  editTeam: 'Editar equipa',
  bestXi: 'Onze com mais pontos esperados na J{gd}',
  bench: 'Banco',
  xiTotal: 'Pontos esperados do onze',
  bank: 'Banco (€M)',
  teamValue: 'Valor da equipa',
  alerts: 'O que precisa de atenção',
  noAlerts: 'Nada a assinalar: todos disponíveis e com jogo.',
  alertOut: '{p} está fora ({note}).',
  alertInactive: '{p} não está na convocatória da Champions.',
  alertDoubt: '{p} é dúvida ({note}).',
  alertLowStart: '{p} só tem {pct} de probabilidade de ser titular.',
  alertNews: 'Notícia recente sobre {p}: {title}',
  syncedRemote: 'Equipa carregada da sincronização.',
  // construtor
  builderTitle: 'A minha equipa',
  mySelection: 'A tua seleção',
  importShot: 'Atualizar com captura de ecrã',
  importShotShort: 'Atualizar com captura',
  importHelp: 'Na app da UEFA, abre Transferências (mostra os 15 e o dinheiro restante), tira uma captura de ecrã e escolhe-a aqui. A imagem é lida no teu telemóvel e não é enviada para lado nenhum.',
  importLoading: 'A preparar o leitor (na primeira vez demora um pouco mais)…',
  importing: 'A ler a captura… {pct}',
  importResult: 'Reconheci {n} de 15 jogadores. Confirma a lista, completa o que faltar e toca em Guardar equipa.',
  importDoubt: 'Confirma estes:',
  importRead: '(lido como "{r}")',
  importUnknown: 'Não reconheci: {w}',
  importFail: 'Não consegui ler a captura: {e}',
  search: 'Pesquisar jogador ou equipa',
  add: 'Adicionar',
  remove: 'Retirar',
  save: 'Guardar equipa',
  cancel: 'Cancelar',
  slotsLeft: '{n} por escolher',
  ruleCounts: 'Faltam jogadores: precisas de 2 GR, 5 DEF, 5 MED e 3 AV.',
  ruleClub: 'Máximo de {max} jogadores por clube: {clubs}.',
  saved: 'Equipa guardada.',
  savedSynced: 'Equipa guardada e sincronizada.',
  savedNotSynced: 'Equipa guardada neste dispositivo. Para a veres noutro, liga a sincronização em Definições.',
  syncFailed: 'Equipa guardada aqui, mas a sincronização falhou: {e}',
  full: 'Posição completa',
  // jogadores
  all: 'Todos',
  allTeams: 'Todas as equipas',
  maxPrice: 'Até €{p}M',
  anyPrice: 'Qualquer preço',
  onlyAvailable: 'Só disponíveis',
  showMore: 'Mostrar mais',
  colPlayer: 'Jogador',
  colPos: 'Pos',
  colPrice: '€M',
  colXp: 'xP J{gd}',
  colXp3: 'xP 3J',
  colValue: 'xP/€M',
  colStart: 'Titular',
  colPts: 'Pts',
  colMin: 'Min',
  colG90: 'G/90',
  colA90: 'A/90',
  colR90: 'Rec/90',
  colSel: '% sel.',
  colStatus: 'Estado',
  colOpp: 'Adversário',
  tipXp: 'Pontos esperados na próxima jornada',
  tipXp3: 'Pontos esperados nas próximas 3 jornadas',
  tipValue: 'Pontos esperados (3 jornadas) por milhão',
  tipStart: 'Probabilidade de jogar 60 minutos ou mais',
  tipSel: 'Percentagem de equipas que o têm',
  // calendário
  fixturesTitle: 'Dificuldade das próximas jornadas',
  fixturesHelp: 'Ordenado pelas 3 próximas jornadas, das mais fáceis para as mais difíceis.',
  easy: 'fácil',
  hard: 'difícil',
  colTeam: 'Equipa',
  colRecord: 'V-E-D',
  home: 'casa',
  away: 'fora',
  // notícias
  newsTitle: 'Notícias',
  onlyMyTeam: 'Só a minha equipa',
  noNews: 'Sem notícias nas últimas 72 horas.',
  // ficha
  nextGames: 'Próximos jogos',
  whyXp: 'De onde vêm os pontos esperados (J{gd})',
  history: 'Pontos por jornada',
  per90: 'Por 90 minutos',
  confidence: 'Confiança: {c}',
  close: 'Fechar',
  cGoals: 'Golos',
  cAssists: 'Assistências',
  cCleanSheet: 'Clean sheet',
  cAppearance: 'Jogar e 60 min',
  cRecoveries: 'Recuperações',
  cSaves: 'Defesas',
  cMotm: 'Jogador do Jogo',
  cConceded: 'Golos sofridos',
  cCards: 'Cartões',
  // definições
  language: 'Idioma',
  theme: 'Tema',
  themeAuto: 'Automático',
  themeLight: 'Claro',
  themeDark: 'Escuro',
  syncTitle: 'Sincronizar entre telemóvel e PC',
  syncIntro:
    'A equipa fica guardada no teu repositório do GitHub. Qualquer dispositivo a consegue ler. Para gravar, o dispositivo onde editas precisa de uma chave (token) — só uma vez.',
  syncSteps: [
    'Abre github.com/settings/personal-access-tokens/new',
    'Nome: Fantasy Copilot. Expiração: 1 ano.',
    'Repository access: Only select repositories → ucl-fantasy-copilot.',
    'Permissions → Repository permissions → Contents: Read and write.',
    'Clica Generate token, copia a chave e cola aqui.',
  ],
  tokenLabel: 'Chave do GitHub (token)',
  tokenSave: 'Guardar chave',
  tokenRemove: 'Apagar chave deste dispositivo',
  tokenSaved: 'Chave guardada neste dispositivo.',
  tokenTest: 'Testar ligação',
  tokenOk: 'Ligação ao GitHub a funcionar.',
  tokenFail: 'A chave não funciona: {e}',
  syncNow: 'Sincronizar agora',
  syncedAt: 'Última sincronização: há {t}',
  modelTitle: 'Como está o modelo',
  modelText: 'Nas jornadas já jogadas, o top 20 do modelo fez em média {m} pontos reais; o top 20 pela média de pontos fez {b}.',
  pos: { GK: 'GR', DEF: 'DEF', MID: 'MED', FWD: 'AV' } as Record<Position, string>,
  avail: { available: 'Disponível', doubtful: 'Dúvida', out: 'Fora', inactive: 'Não convocado', unknown: 'Por confirmar' } as Record<
    Availability,
    string
  >,
  kind: { injury: 'Lesão', doubt: 'Dúvida', return: 'Regresso', other: 'Notícia' } as Record<NewsKind, string>,
  conf: { alta: 'alta', média: 'média', baixa: 'baixa' } as Record<string, string>,
  notes: {
    'In contention to start next game': 'Em condições de ser titular',
    'Unlikely to start next game': 'Pouco provável que seja titular',
  } as Record<string, string>,
};

type Dict = typeof PT;

const EN: Dict = {
  ...PT,
  tabTeam: 'Team',
  tabPlayers: 'Players',
  tabFixtures: 'Fixtures',
  tabNews: 'News',
  settings: 'Settings',
  loading: 'Loading the latest data…',
  loadError: 'Could not load the data.',
  retry: 'Try again',
  untilDeadline: 'until GD{gd} deadline',
  deadlineAt: 'GD{gd} deadline: {date}',
  deadlinePassed: 'GD{gd} locked',
  live: 'GD{gd} in progress',
  finished: 'GD{gd} finished',
  updatedAgo: 'Data from {t} ago',
  sourceFailed: 'Source failing: {s}. Showing the last valid data.',
  noTeamTitle: 'Your team is not here yet',
  noTeamText: 'Enter your 15 players once. After that, only log your transfers.',
  addTeam: 'Add my team',
  editTeam: 'Edit team',
  bestXi: 'Highest expected points XI for GD{gd}',
  bench: 'Bench',
  xiTotal: 'XI expected points',
  bank: 'Bank (€M)',
  teamValue: 'Team value',
  alerts: 'Needs attention',
  noAlerts: 'All clear: everyone available with a fixture.',
  alertOut: '{p} is out ({note}).',
  alertInactive: '{p} is not in the Champions League squad.',
  alertDoubt: '{p} is a doubt ({note}).',
  alertLowStart: '{p} has only {pct} chance to start.',
  alertNews: 'Recent news about {p}: {title}',
  syncedRemote: 'Team loaded from sync.',
  builderTitle: 'My team',
  mySelection: 'Your selection',
  importShot: 'Update from screenshot',
  importShotShort: 'From screenshot',
  importHelp: 'In the UEFA app, open Transfers (shows all 15 and the money left), take a screenshot and choose it here. The image is read on your phone and is not sent anywhere.',
  importLoading: 'Preparing the reader (the first time takes a little longer)…',
  importing: 'Reading the screenshot… {pct}',
  importResult: 'Recognised {n} of 15 players. Check the list, complete anything missing and tap Save team.',
  importDoubt: 'Double-check these:',
  importRead: '(read as "{r}")',
  importUnknown: 'Not recognised: {w}',
  importFail: 'Could not read the screenshot: {e}',
  search: 'Search player or team',
  add: 'Add',
  remove: 'Remove',
  save: 'Save team',
  cancel: 'Cancel',
  slotsLeft: '{n} to pick',
  ruleCounts: 'Players missing: you need 2 GK, 5 DEF, 5 MID and 3 FWD.',
  ruleClub: 'Maximum {max} players per club: {clubs}.',
  saved: 'Team saved.',
  savedSynced: 'Team saved and synced.',
  savedNotSynced: 'Team saved on this device. To see it on another one, turn on sync in Settings.',
  syncFailed: 'Team saved here, but sync failed: {e}',
  full: 'Position full',
  all: 'All',
  allTeams: 'All teams',
  maxPrice: 'Up to €{p}M',
  anyPrice: 'Any price',
  onlyAvailable: 'Available only',
  showMore: 'Show more',
  colPlayer: 'Player',
  colXp: 'xP GD{gd}',
  colXp3: 'xP 3GD',
  colStart: 'Starts',
  colStatus: 'Status',
  colOpp: 'Opponent',
  colSel: '% sel.',
  tipXp: 'Expected points next gameday',
  tipXp3: 'Expected points over the next 3 gamedays',
  tipValue: 'Expected points (3 gamedays) per million',
  tipStart: 'Chance of playing 60+ minutes',
  tipSel: 'Share of teams that own him',
  fixturesTitle: 'Upcoming fixture difficulty',
  fixturesHelp: 'Sorted by the next 3 gamedays, easiest first.',
  easy: 'easy',
  hard: 'hard',
  colTeam: 'Team',
  colRecord: 'W-D-L',
  home: 'home',
  away: 'away',
  newsTitle: 'News',
  onlyMyTeam: 'My team only',
  noNews: 'No news in the last 72 hours.',
  nextGames: 'Next fixtures',
  whyXp: 'Where the expected points come from (GD{gd})',
  history: 'Points per gameday',
  per90: 'Per 90 minutes',
  confidence: 'Confidence: {c}',
  close: 'Close',
  cGoals: 'Goals',
  cAssists: 'Assists',
  cAppearance: 'Playing and 60 min',
  cRecoveries: 'Recoveries',
  cSaves: 'Saves',
  cMotm: 'Player of the Match',
  cConceded: 'Goals conceded',
  cCards: 'Cards',
  language: 'Language',
  theme: 'Theme',
  themeAuto: 'Automatic',
  themeLight: 'Light',
  themeDark: 'Dark',
  syncTitle: 'Sync between phone and PC',
  syncIntro:
    'Your team is stored in your GitHub repository. Any device can read it. To save, the device where you edit needs a key (token) — only once.',
  syncSteps: [
    'Open github.com/settings/personal-access-tokens/new',
    'Name: Fantasy Copilot. Expiration: 1 year.',
    'Repository access: Only select repositories → ucl-fantasy-copilot.',
    'Permissions → Repository permissions → Contents: Read and write.',
    'Click Generate token, copy the key and paste it here.',
  ],
  tokenLabel: 'GitHub key (token)',
  tokenSave: 'Save key',
  tokenRemove: 'Delete key from this device',
  tokenSaved: 'Key saved on this device.',
  tokenTest: 'Test connection',
  tokenOk: 'GitHub connection working.',
  tokenFail: 'The key does not work: {e}',
  syncNow: 'Sync now',
  syncedAt: 'Last sync: {t} ago',
  modelTitle: 'How the model is doing',
  modelText: 'In past gamedays, the model top 20 scored {m} real points on average; the top 20 by average points scored {b}.',
  pos: { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' },
  avail: { available: 'Available', doubtful: 'Doubt', out: 'Out', inactive: 'Not in squad', unknown: 'Unconfirmed' },
  kind: { injury: 'Injury', doubt: 'Doubt', return: 'Return', other: 'News' },
  conf: { alta: 'high', média: 'medium', baixa: 'low' },
  notes: {},
};

type Key = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];

export interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  d: Dict;
  num: (n: number, digits?: number) => string;
}

const Ctx = createContext<I18n | null>(null);

function readLang(): Lang {
  try {
    return localStorage.getItem('ucl.lang') === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const d = lang === 'en' ? EN : PT;
  const fmt = new Map<number, Intl.NumberFormat>();
  const value: I18n = {
    lang,
    setLang: (l) => {
      setLangState(l);
      try {
        localStorage.setItem('ucl.lang', l);
      } catch {
        /* sem armazenamento */
      }
      document.documentElement.lang = l === 'en' ? 'en' : 'pt-PT';
    },
    t: (key, vars) => (d[key] as string).replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`)),
    d,
    num: (n, digits = 1) => {
      let f = fmt.get(digits);
      if (!f) {
        f = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'pt-PT', { minimumFractionDigits: digits, maximumFractionDigits: digits });
        fmt.set(digits, f);
      }
      return f.format(n);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider em falta');
  return v;
}
