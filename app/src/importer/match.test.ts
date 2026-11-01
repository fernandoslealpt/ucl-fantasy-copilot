import { describe, expect, it } from 'vitest';
import type { Position, Row } from '../types';
import { matchTeam, nameKeys, parseBank, similarity } from './match';

let n = 0;
const P = (name: string, fullName: string, teamId: string, position: Position, selectedPct = 5): Row =>
  ({
    id: String(++n),
    name,
    fullName,
    teamId,
    teamName: teamId,
    position,
    price: 6,
    selectedPct,
    availability: 'available',
    status: { code: '', quality: '', note: '', active: true },
    xp: { xp3: 10 },
  }) as unknown as Row;

// A equipa real do Fernando (1 nov 2026) + homónimos que baralham
const TEAM = [
  P('D. Malen', 'Donyell Malen', 'ROM', 'FWD', 11),
  P('L. Yamal', 'Lamine Yamal', 'BAR', 'MID', 47),
  P('Raphinha', 'Raphinha', 'BAR', 'MID', 30),
  P('Abde Ezzalzouli', 'Abde Ezzalzouli', 'BET', 'MID', 1),
  P('R. Cherki', 'Rayan Cherki', 'MCI', 'MID', 18),
  P('B. Barcola', 'Bradley Barcola', 'LIV', 'MID', 12),
  P('Sergi Altimira', 'Sergi Altimira', 'SCP', 'DEF', 3),
  P('M. Guéhi', 'Marc Guéhi', 'MCI', 'DEF', 10),
  P('A. Hakimi', 'Achraf Hakimi', 'PSG', 'DEF', 29),
  P('S. Mouriño', 'Santiago Mouriño', 'VIL', 'DEF', 3),
  P('Z. Suzuki', 'Zion Suzuki', 'AVL', 'GK', 14),
  P('D. Raya', 'David Raya', 'ARS', 'GK', 36),
  P('K. Mbappé', 'Kylian Mbappé', 'RMA', 'FWD', 59),
  P('F. Dimarco', 'Federico Dimarco', 'INT', 'DEF', 7),
  P('L. Suárez', 'Luis Suárez', 'SCP', 'FWD', 11),
];
const OTHERS = [
  P('E. Mbappé', 'Ethan Mbappé', 'LIL', 'MID', 0),
  P('R. Aït-Nouri', 'Rayan Aït-Nouri', 'MCI', 'DEF', 1),
  P('R. Fofana', 'Rayan Fofana', 'LEN', 'FWD', 0),
  P('Gabriel', 'Gabriel Magalhães', 'ARS', 'DEF', 20),
  P('Gabriel Jesus', 'Gabriel Jesus', 'ARS', 'FWD', 1),
];
const ROWS = [...TEAM, ...OTHERS];
const name = (id: string) => ROWS.find((r) => r.id === id)!.name;

// Texto como o OCR o devolve da captura (inclui lixo da interface e códigos de adversário)
const OCR = [
  'SL Piornãofica 230 pts',
  'JOR3 JOR4 JOR5',
  '76 pts Fazer transferências 24 nov.',
  'Prazo: 3 nov., 17:45',
  'D. Malen',
  '- MUN (A)',
  'L. Yamal Raphinha Abde Ezzalz... R. Cherki B. Barcola',
  '- AVL (H) - AVL (H) - BVB (A) - RBL (A) - FEN (A)',
  'Sergi Altimira M. Guéhi A. Hakimi S. Mouriño',
  '- SHK (A) - RBL (A) - VIL (A) - PSG (H)',
  'Z. Suzuki',
  '- BAR (A)',
  'D. Raya K. Mbappé F. Dimarco L. Suárez',
  '- SLA (A) - AEK (A) - FEY (A) - SHK (A)',
  'GR 1. AVA 2. DEF 3. AVA',
  'Subs Transferências',
];

describe('importar equipa de uma captura', () => {
  it('reconhece os 15 da captura real, incluindo nome cortado e homónimos', () => {
    const r = matchTeam(OCR, ROWS, { gameday: 4 });
    expect(r.ids.map(name).sort()).toEqual(TEAM.map((t) => t.name).sort());
    expect(r.matches.find((m) => name(m.id) === 'Abde Ezzalzouli')?.read).toBe('abde ezzalz');
  });

  it('tolera erros típicos de OCR (acentos perdidos, letras trocadas)', () => {
    const noisy = OCR.map((l) =>
      l.replace('Guéhi', 'Guehi').replace('Mouriño', 'Mourino').replace('Dimarco', 'Dimarc0').replace('Barcola', 'Barcoia'),
    );
    const r = matchTeam(noisy, ROWS, { gameday: 4 });
    expect(r.ids).toHaveLength(15);
    expect(r.ids.map(name)).toContain('F. Dimarco');
    expect(r.ids.map(name)).toContain('B. Barcola');
  });

  it('desempata homónimos: nome completo, depois quem já está na equipa, depois o mais escolhido', () => {
    const gabrielJesus = OTHERS.find((o) => o.name === 'Gabriel Jesus')!;
    const gabriel = OTHERS.find((o) => o.name === 'Gabriel')!;
    expect(matchTeam(['Gabriel'], ROWS).ids).toEqual([gabriel.id]);
    expect(matchTeam(['Gabriel Jesus'], ROWS).ids).toEqual([gabrielJesus.id]);
    const ethan = OTHERS.find((o) => o.name === 'E. Mbappé')!;
    expect(matchTeam(['Mbappé'], ROWS, { current: [ethan.id] }).ids).toEqual([ethan.id]);
  });

  it('não inventa jogadores com palavras da interface nem nomes curtos aproximados', () => {
    const r = matchTeam(['Captain Bench Transfers Points', 'Raia'], ROWS);
    expect(r.ids).toEqual([]);
    expect(similarity('raia', 'raya')).toBe(0);
  });

  it('chaves de nome e banco', () => {
    expect(nameKeys({ name: 'K. Mbappé', fullName: 'Kylian Mbappé' })).toEqual(
      expect.arrayContaining(['k mbappe', 'mbappe', 'kylian mbappe']),
    );
    expect(parseBank('Banco: 1,5 M')).toBe(1.5);
    expect(parseBank('In the bank €0.5m')).toBe(0.5);
    expect(parseBank('230 pts')).toBeNull();
  });
});
