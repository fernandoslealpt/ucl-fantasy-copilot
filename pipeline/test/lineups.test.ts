import { describe, expect, it } from 'vitest';
import { findPlayer, matchLineups, startSignals } from '../normalize/lineups.ts';
import { applySignal } from '../model/xp.ts';
import { parseRotowire } from '../sources/rotowire.ts';
import type { Fixture, Player } from '../types.ts';

// Estrutura igual à da página da RotoWire (nomes inventados)
const li = (pos: string, full: string, short: string, tag?: string) => `
            <li class="lineup__player">
            <div class="lineup__pos ">${pos}</div>
            <a title="${full}" href="/soccer/player/x-1">${short}</a>
            ${tag ? `<span class="lineup__inj">${tag}</span>` : ''}        </li>`;
const ul = (cls: string, status: string, xi: string[], inj: string[]) => `
<ul class="lineup__list is-${cls}">
  <li class="lineup__status is-expected"><div class="dot is-medium is-yellow"></div>${status}</li>
  ${xi.join('')}
  ${inj.length ? `<li class="lineup__title is-middle">Injuries</li>${inj.join('')}` : ''}
</ul>`;

const HOME_XI = [
  li('GK', 'Joao Guarda', 'J. Guarda'),
  li('DC', 'Pedro Muro', 'P. Muro'),
  li('DC', 'Rui Pedra', 'R. Pedra'),
  li('DL', 'Ze Lateral', 'Ze Lateral'),
  li('DR', 'Tiago Ala', 'T. Ala'),
  li('MC', 'Andre Motor', 'A. Motor'),
  li('MC', 'Bruno Cerebro', 'B. Cerebro'),
  li('AML', 'Carlos Extremo', 'C. Extremo'),
  li('AMR', 'Diogo Flecha', 'D. Flecha'),
  li('AMC', 'Eduardo Dez', 'E. Dez'),
  li('FW', 'Fabio Golo', 'F. Golo'),
];
const AWAY_XI = [
  li('GK', 'Kaique', 'Kaique'),
  ...['Lars Berg', 'Mats Fjell', 'Nils Dal', 'Ola Strand', 'Per Vik', 'Rune Hav', 'Sven Skog', 'Tor Elv', 'Ulf Is'].map((n) =>
    li('DC', n, `${n[0]}. ${n.split(' ')[1]}`),
  ),
  li('FW', 'Vegard Topp', 'V. Topp'),
];
const HTML = `<html><div class="lineup is-soccer">${ul('home', 'Predicted Lineup', HOME_XI, [
  li('M', 'Gil Lesionado', 'G. Lesionado', 'OUT'),
  li('F', 'Hugo Duvida', 'H. Duvida', 'QUES'),
])}${ul('visit', 'Confirmed Lineup', AWAY_XI, [])}</div></html>`;

let n = 0;
const P = (fullName: string, name: string, teamId: string, position: Player['position'] = 'MID'): Player =>
  ({
    id: `p${++n}`,
    name,
    fullName,
    teamId,
    teamName: teamId,
    teamCode: teamId,
    position,
    availability: 'available',
    status: { code: '', quality: '', note: '', active: true },
  }) as unknown as Player;

const home = [
  P('João Guarda', 'J. Guarda', 'H', 'GK'),
  P('Pedro Muro', 'P. Muro', 'H', 'DEF'),
  P('Rui Pedra', 'R. Pedra', 'H', 'DEF'),
  P('Zé Lateral', 'Zé Lateral', 'H', 'DEF'),
  P('Tiago Ala Silva', 'T. Ala', 'H', 'DEF'),
  P('André Motor', 'A. Motor', 'H'),
  P('Bruno Cérebro', 'B. Cérebro', 'H'),
  P('Carlos Extremo', 'C. Extremo', 'H'),
  P('Diogo Flecha', 'D. Flecha', 'H'),
  P('Eduardo Dez', 'E. Dez', 'H'),
  P('Fábio Golo', 'F. Golo', 'H', 'FWD'),
  P('Gil Lesionado', 'G. Lesionado', 'H'),
  P('Hugo Dúvida', 'H. Dúvida', 'H'),
  P('Ivo Banco', 'I. Banco', 'H', 'FWD'),
];
const away = [
  P('Kaique Rocha', 'Kaique', 'A', 'GK'),
  ...['Lars Berg', 'Mats Fjell', 'Nils Dal', 'Ola Strand', 'Per Vik', 'Rune Hav', 'Sven Skog', 'Tor Elv', 'Ulf Is'].map((x) =>
    P(x, `${x[0]}. ${x.split(' ')[1]}`, 'A', 'DEF'),
  ),
  P('Vegard Topp', 'V. Topp', 'A', 'FWD'),
  P('Will Reserva', 'W. Reserva', 'A', 'FWD'),
];
const players = [...home, ...away];
const fixtures: Fixture[] = [
  { id: 'f1', gameday: 4, phase: '', round: '', homeId: 'H', awayId: 'A', homeName: 'H', awayName: 'A', homeCode: 'H', awayCode: 'A', kickoff: null, status: 'UPCOMING', score: null, source: 'uefa-matches' },
];

describe('onzes prováveis (RotoWire)', () => {
  it('lê os dois onzes, o estado (provável/confirmado) e as lesões', () => {
    const m = parseRotowire(HTML);
    expect(m).toHaveLength(1);
    expect(m[0]!.home.status).toBe('predicted');
    expect(m[0]!.visit.status).toBe('confirmed');
    expect(m[0]!.home.starters).toHaveLength(11);
    expect(m[0]!.home.injuries.map((i) => i.tag)).toEqual(['OUT', 'QUES']);
    expect(m[0]!.home.starters[0]).toMatchObject({ pos: 'GK', full: 'Joao Guarda', name: 'J. Guarda' });
  });

  it('reconhece os nomes sem acentos e com nomes incompletos', () => {
    expect(findPlayer({ full: 'Joao Guarda', name: 'J. Guarda' }, home)?.fullName).toBe('João Guarda');
    expect(findPlayer({ full: 'Tiago Ala', name: 'T. Ala' }, home)?.fullName).toBe('Tiago Ala Silva');
    expect(findPlayer({ full: 'Kaique', name: 'Kaique' }, away)?.fullName).toBe('Kaique Rocha');
    expect(findPlayer({ full: 'Desconhecido Total', name: 'D. Total' }, home)).toBeNull();
  });

  it('liga ao jogo da jornada e dá sinais: titular, fora do onze, lesionado, dúvida', () => {
    const l = matchLineups(parseRotowire(HTML), players, fixtures, '2026-11-02T10:00:00Z');
    expect(l.stats.matched).toBe(l.stats.listed);
    const h = l.teams.find((t) => t.teamId === 'H')!;
    expect(h.gameday).toBe(4);
    expect(h.starters).toHaveLength(11);
    const sig = startSignals(l, [], players, '2026-11-02T10:00:00Z', 4);
    const id = (name: string) => players.find((p) => p.name === name)!.id;
    expect(sig.get(id('F. Golo'))).toMatchObject({ lineup: 'start', confirmed: false });
    expect(sig.get(id('I. Banco'))).toMatchObject({ lineup: 'bench' });
    expect(sig.get(id('G. Lesionado'))).toMatchObject({ lineup: 'bench', tag: 'OUT' });
    expect(sig.get(id('H. Dúvida'))).toMatchObject({ tag: 'QUES' });
    expect(sig.get(id('V. Topp'))).toMatchObject({ lineup: 'start', confirmed: true });
    expect(sig.get(id('W. Reserva'))).toMatchObject({ lineup: 'bench', confirmed: true });
  });

  it('notícias recentes contam só quando não há onze', () => {
    const news = [{ publishedAt: '2026-11-02T08:00:00Z', kind: 'injury' as const, playerIds: ['zz'] }];
    const sig = startSignals(null, news, [{ id: 'zz', teamId: 'Z' }], '2026-11-02T10:00:00Z', 4);
    expect(sig.get('zz')).toMatchObject({ lineup: null, news: 'injury' });
    const old = [{ publishedAt: '2026-10-25T08:00:00Z', kind: 'injury' as const, playerIds: ['yy'] }];
    expect(startSignals(null, old, [], '2026-11-02T10:00:00Z', 4).get('yy')).toBeUndefined();
  });
});

describe('titularidade com sinais', () => {
  const base = { gameday: 4, confirmed: false, tag: null, news: null } as const;
  it('onze provável puxa a titularidade para cima ou para baixo, sem apagar o histórico', () => {
    const up = applySignal(0.5, 0.7, { ...base, lineup: 'start' }, 'MID', false);
    const down = applySignal(0.9, 0.95, { ...base, lineup: 'bench' }, 'MID', false);
    expect(up.start).toBeGreaterThan(0.7);
    expect(down.start).toBeLessThan(0.4);
    expect(down.start).toBeGreaterThan(0.12);
    expect(down.play).toBeGreaterThan(down.start);
  });
  it('onze confirmado manda', () => {
    expect(applySignal(0.3, 0.5, { ...base, lineup: 'start', confirmed: true }, 'FWD', false).start).toBeCloseTo(0.99);
    expect(applySignal(0.95, 0.98, { ...base, lineup: 'bench', confirmed: true }, 'FWD', false).start).toBe(0);
  });
  it('lesionado fora; dúvida e notícias reduzem', () => {
    expect(applySignal(0.9, 0.95, { ...base, lineup: 'bench', tag: 'OUT' }, 'DEF', false)).toEqual({ start: 0, play: 0 });
    expect(applySignal(0.9, 0.95, { ...base, lineup: null, tag: 'QUES' }, 'DEF', false).start).toBeCloseTo(0.54);
    expect(applySignal(0.9, 0.95, { ...base, lineup: null, news: 'injury' }, 'DEF', false).start).toBeCloseTo(0.63);
    expect(applySignal(0.9, 0.95, { ...base, lineup: null, news: 'return' }, 'DEF', false).start).toBe(0.9);
  });
  it('se a UEFA diz que está fora, só um onze confirmado o põe a jogar', () => {
    expect(applySignal(0, 0, { ...base, lineup: 'start' }, 'MID', true).start).toBe(0);
    expect(applySignal(0, 0, { ...base, lineup: 'start', confirmed: true }, 'MID', true).start).toBeCloseTo(0.99);
  });
});
