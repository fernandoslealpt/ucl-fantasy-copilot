# UCL Fantasy — atualização de dados

**Gerado:** terça, 03/11, 19:32 (Lisboa) · **Jornada:** 4 (a decorrer) · **Fecho da equipa:** terça, 03/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | terça, 03/11, 19:32 |  |
| uefaFantasy | ✅ ok | 1 | 1173 | terça, 03/11, 19:32 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | terça, 03/11, 19:32 |  |
| uefaPrevSeason | ✅ ok | 0 | 1173 | terça, 03/11, 19:32 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | terça, 03/11, 19:32 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 36 | 273 | terça, 03/11, 19:32 |  |
| rotowire | ✅ ok | 1 | 32 | terça, 03/11, 19:32 |  |

**Totais:** 1173 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 1173/1173 iguais · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1173/1173 jogadores · soma das jornadas = total em 1173/1173 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4 · feed J3 (só pontos)

## Modelo xP v1.2.0 — próximas jornadas J4, J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.9 | 1.97 | 6.65 | 5.05 |
| J2 | 2 | 2.16 | 3.75 | 2.65 |
| J3 | 1.96 | 2.08 | 5.95 | 4.8 |

**Top 20 xP — J4**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | K. Mbappé | Real Madrid | FWD | 11.0 | 7.1 | 18.2 | 1.65 | 88% | @ AEK Athens | alta |
| 2 | R. Ljubičić | LASK | MID | 5.5 | 7.0 | 14.9 | 2.71 | 99% | vs S. Bratislava | média |
| 3 | D. Doué | Paris | MID | 8.5 | 6.8 | 18.0 | 2.12 | 99% | @ Villarreal | alta |
| 4 | S. Adeniran | LASK | FWD | 6.9 | 6.6 | 12.4 | 1.80 | 99% | vs S. Bratislava | média |
| 5 | L. Yamal | Barcelona | MID | 10.2 | 6.4 | 20.6 | 2.02 | 99% | vs Aston Villa | alta |
| 6 | N. Paz | Como | MID | 7.0 | 6.2 | 18.6 | 2.66 | 85% | @ Lens | alta |
| 7 | Z. Tripić | Viking | MID | 5.8 | 6.1 | 14.4 | 2.48 | 83% | vs Sabah | média |
| 8 | Y. Dibango | LASK | DEF | 4.0 | 6.0 | 10.9 | 2.72 | 99% | vs S. Bratislava | média |
| 9 | Carlos Augusto | Inter | DEF | 4.1 | 6.0 | 16.1 | 3.93 | 99% | @ Feyenoord | média |
| 10 | S. Brunstad Fet | Bodø/Glimt | MID | 5.0 | 6.0 | 17.0 | 3.40 | 99% | vs Lille | alta |
| 11 | A. Gordon | Barcelona | MID | 8.0 | 6.0 | 15.3 | 1.92 | 99% | vs Aston Villa | média |
| 12 | H. Kane | Bayern München | FWD | 11.1 | 5.8 | 24.1 | 2.18 | 99% | @ Atleti | alta |
| 13 | P. Christiansen | Viking | FWD | 6.0 | 5.8 | 13.7 | 2.29 | 83% | vs Sabah | média |
| 14 | S. Guirassy | B. Dortmund | FWD | 8.6 | 5.8 | 14.3 | 1.66 | 81% | vs Real Betis | média |
| 15 | M. Usor | LASK | FWD | 5.9 | 5.8 | 10.1 | 1.72 | 99% | vs S. Bratislava | média |
| 16 | D. Malen | Roma | FWD | 6.6 | 5.8 | 13.3 | 2.01 | 99% | @ Man Utd | média |
| 17 | Vitinha | Paris | MID | 7.6 | 5.7 | 16.2 | 2.13 | 99% | @ Villarreal | alta |
| 18 | Raphinha | Barcelona | MID | 9.7 | 5.7 | 17.6 | 1.81 | 99% | vs Aston Villa | alta |
| 19 | Fermín López | Barcelona | MID | 7.0 | 5.7 | 16.4 | 2.35 | 99% | vs Aston Villa | média |
| 20 | S. Diaoune | Lille | MID | 4.9 | 5.6 | 10.9 | 2.23 | 99% | @ Bodø/Glimt | média |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | H. Kane | Bayern München | FWD | 11.1 | 34 | 12 (J3) | 270 | 50 | disponível | J4 @ Atleti · terça, 03/11, 20:00 |
| 2 | L. Yamal | Barcelona | MID | 10.2 | 33 | 7 (J3) | 270 | 49 | disponível | J4 vs Aston Villa · terça, 03/11, 20:00 |
| 3 | N. Paz | Como | MID | 7.0 | 30 | 20 (J3) | 260 | 18 | disponível | J4 @ Lens · quarta, 04/11, 20:00 |
| 4 | R. Barkley | Aston Villa | MID | 5.7 | 30 | 10 (J3) | 175 | 2 | disponível | J4 @ Barcelona · terça, 03/11, 20:00 |
| 5 | N. Tresoldi | Club Brugge | FWD | 7.2 | 28 | 5 (J3) | 255 | 4 | disponível | J4 @ PSV · quarta, 04/11, 20:00 |
| 6 | S. Guirassy | B. Dortmund | FWD | 8.6 | 27 | 13 (J3) | 210 | 13 | disponível | J4 vs Real Betis · quarta, 04/11, 20:00 |
| 7 | L. Suárez | Sporting CP | FWD | 7.3 | 27 | 10 (J3) | 249 | 12 | disponível | J4 @ Shakhtar · terça, 03/11, 17:45 |
| 8 | M. Bartra | Real Betis | DEF | 4.8 | 27 | 7 (J3) | 270 | 6 | disponível | J4 @ B. Dortmund · quarta, 04/11, 20:00 |
| 9 | K. Mbappé | Real Madrid | FWD | 11.0 | 26 | 12 (J3) | 267 | 62 | disponível | J4 @ AEK Athens · quarta, 04/11, 17:45 |
| 10 | O. Dembélé | Paris | FWD | 10.2 | 26 | 1 (J3) | 160 | 12 | fora | J4 @ Villarreal · terça, 03/11, 20:00 |
| 11 | D. Doué | Paris | MID | 8.5 | 26 | 14 (J3) | 144 | 15 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |
| 12 | P. Foden | Man City | MID | 7.0 | 26 | 23 (J3) | 165 | 3 | disponível | J4 @ Leipzig · quarta, 04/11, 20:00 |
| 13 | D. Malen | Roma | FWD | 6.6 | 26 | 11 (J3) | 236 | 12 | disponível | J4 @ Man Utd · terça, 03/11, 20:00 |
| 14 | Isco | Real Betis | MID | 6.6 | 26 | 11 (J3) | 227 | 2 | disponível | J4 @ B. Dortmund · quarta, 04/11, 20:00 |
| 15 | Vitinha | Paris | MID | 7.6 | 25 | 9 (J3) | 270 | 19 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |

## Equipas mais fortes (top 10)

| Equipa | Coef. UEFA (rank) | Elo | V-E-D | Golos | Próximo jogo |
|---|---|---|---|---|---|
| Bayern München | 131.5 (#1) | — | 1-2-0 | 10:5 | J4 @ Atleti |
| Arsenal | 130 (#2) | — | 2-1-0 | 6:2 | J4 @ Slavia Praha |
| Real Madrid | 126.5 (#3) | — | 3-0-0 | 10:5 | J4 @ AEK Athens |
| Paris | 125 (#4) | — | 3-0-0 | 14:5 | J4 @ Villarreal |
| Inter | 117 (#5) | — | 1-0-2 | 5:6 | J4 @ Feyenoord |
| Liverpool | 109 (#6) | — | 3-0-0 | 12:7 | J4 @ Fenerbahçe |
| Man City | 108.5 (#7) | — | 2-0-1 | 9:5 | J4 @ Leipzig |
| Barcelona | 108.25 (#8) | — | 2-0-1 | 11:6 | J4 vs Aston Villa |
| B. Dortmund | 100.75 (#9) | — | 2-0-1 | 5:4 | J4 vs Real Betis |
| Aston Villa | 95 (#11) | — | 3-0-0 | 12:3 | J4 @ Barcelona |

<details><summary>Valores de estado no feed</summary>

- 586 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 146 × pStatus=P · qStatus=∅ · trained=In contention to start next game
- 128 × pStatus=B · qStatus=∅ · trained=In contention to start next game
- 125 × pStatus=NIS · qStatus=∅ · trained=∅
- 89 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 54 × pStatus=∅ · qStatus=∅ · trained=∅
- 21 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 10 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 6 × pStatus=P · qStatus=∅ · trained=Unlikely to start next game
- 3 × pStatus=B · qStatus=∅ · trained=Unlikely to start next game
- 3 × pStatus=S · qStatus=∅ · trained=∅
- 1 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game
- 1 × pStatus=P · qStatus=∅ · trained=∅

</details>
