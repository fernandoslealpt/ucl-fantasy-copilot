# UCL Fantasy — atualização de dados

**Gerado:** domingo, 01/11, 23:52 (Lisboa) · **Jornada:** 4 (por jogar) · **Fecho da equipa:** terça, 03/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | domingo, 01/11, 23:52 |  |
| uefaFantasy | ✅ ok | 1 | 1171 | domingo, 01/11, 23:52 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | domingo, 01/11, 23:52 |  |
| uefaPrevSeason | ✅ ok | 0 | 1171 | domingo, 01/11, 23:52 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | domingo, 01/11, 23:52 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 0 | 264 | domingo, 01/11, 23:40 |  |

**Totais:** 1171 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: nada a comparar ainda · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1171/1171 jogadores · soma das jornadas = total em 1171/1171 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots — · feed J3 (só pontos)

## Modelo xP v1.1.0 — próximas jornadas J4, J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.9 | 1.97 | 6.65 | 5.05 |
| J2 | 2 | 2.16 | 3.75 | 2.65 |
| J3 | 1.96 | 2.09 | 5.95 | 4.8 |

**Top 20 xP — J4**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | K. Mbappé | Real Madrid | FWD | 11.0 | 7.5 | 18.6 | 1.69 | 95% | @ AEK Athens | alta |
| 2 | L. Yamal | Barcelona | MID | 10.2 | 6.3 | 20.5 | 2.01 | 98% | vs Aston Villa | alta |
| 3 | D. Doué | Paris | MID | 8.5 | 6.2 | 17.4 | 2.04 | 85% | @ Villarreal | alta |
| 4 | N. Paz | Como | MID | 7.0 | 6.1 | 18.5 | 2.65 | 84% | @ Lens | alta |
| 5 | Z. Tripić | Viking | MID | 5.8 | 5.8 | 14.2 | 2.44 | 79% | vs Sabah | média |
| 6 | H. Kane | Bayern München | FWD | 11.1 | 5.7 | 24.0 | 2.16 | 95% | @ Atleti | alta |
| 7 | J. Timber | Arsenal | DEF | 5.6 | 5.7 | 15.9 | 2.83 | 86% | @ Slavia Praha | alta |
| 8 | Vitinha | Paris | MID | 7.6 | 5.7 | 16.2 | 2.13 | 98% | @ Villarreal | alta |
| 9 | P. Christiansen | Viking | FWD | 6.0 | 5.6 | 13.5 | 2.25 | 79% | vs Sabah | média |
| 10 | S. Guirassy | B. Dortmund | FWD | 8.6 | 5.6 | 14.1 | 1.64 | 72% | vs Real Betis | média |
| 11 | S. Brunstad Fet | Bodø/Glimt | MID | 5.0 | 5.5 | 16.6 | 3.32 | 91% | vs Lille | alta |
| 12 | F. Valverde | Real Madrid | MID | 7.1 | 5.4 | 14.6 | 2.05 | 98% | @ AEK Athens | alta |
| 13 | P. Foden | Man City | MID | 7.0 | 5.4 | 16.6 | 2.37 | 84% | @ Leipzig | alta |
| 14 | Raphinha | Barcelona | MID | 9.7 | 5.3 | 17.2 | 1.77 | 90% | vs Aston Villa | alta |
| 15 | Gabriel | Arsenal | DEF | 6.0 | 5.3 | 14.7 | 2.44 | 94% | @ Slavia Praha | alta |
| 16 | J. Alvarez | Atleti | FWD | 10.0 | 5.1 | 17.2 | 1.72 | 96% | vs Bayern München | alta |
| 17 | F. Sjøvold | Bodø/Glimt | DEF | 4.7 | 5.0 | 15.5 | 3.31 | 96% | vs Lille | alta |
| 18 | S. McTominay | Napoli | MID | 7.4 | 5.0 | 15.7 | 2.12 | 96% | @ Porto | alta |
| 19 | Carlos Augusto | Inter | DEF | 4.1 | 4.9 | 15.0 | 3.65 | 74% | @ Feyenoord | média |
| 20 | Fermín López | Barcelona | MID | 7.0 | 4.8 | 15.6 | 2.23 | 78% | vs Aston Villa | média |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | H. Kane | Bayern München | FWD | 11.1 | 34 | 12 (J3) | 270 | 51 | disponível | J4 @ Atleti · terça, 03/11, 20:00 |
| 2 | L. Yamal | Barcelona | MID | 10.2 | 33 | 7 (J3) | 270 | 47 | disponível | J4 vs Aston Villa · terça, 03/11, 20:00 |
| 3 | N. Paz | Como | MID | 7.0 | 30 | 20 (J3) | 260 | 13 | disponível | J4 @ Lens · quarta, 04/11, 20:00 |
| 4 | R. Barkley | Aston Villa | MID | 5.7 | 30 | 10 (J3) | 175 | 2 | disponível | J4 @ Barcelona · terça, 03/11, 20:00 |
| 5 | N. Tresoldi | Club Brugge | FWD | 7.2 | 28 | 5 (J3) | 255 | 3 | disponível | J4 @ PSV · quarta, 04/11, 20:00 |
| 6 | S. Guirassy | B. Dortmund | FWD | 8.6 | 27 | 13 (J3) | 210 | 12 | disponível | J4 vs Real Betis · quarta, 04/11, 20:00 |
| 7 | L. Suárez | Sporting CP | FWD | 7.3 | 27 | 10 (J3) | 249 | 11 | disponível | J4 @ Shakhtar · terça, 03/11, 17:45 |
| 8 | M. Bartra | Real Betis | DEF | 4.8 | 27 | 7 (J3) | 270 | 6 | disponível | J4 @ B. Dortmund · quarta, 04/11, 20:00 |
| 9 | K. Mbappé | Real Madrid | FWD | 11.0 | 26 | 12 (J3) | 267 | 59 | disponível | J4 @ AEK Athens · quarta, 04/11, 17:45 |
| 10 | O. Dembélé | Paris | FWD | 10.2 | 26 | 1 (J3) | 160 | 16 | fora | J4 @ Villarreal · terça, 03/11, 20:00 |
| 11 | D. Doué | Paris | MID | 8.5 | 26 | 14 (J3) | 144 | 9 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |
| 12 | P. Foden | Man City | MID | 7.0 | 26 | 23 (J3) | 165 | 2 | disponível | J4 @ Leipzig · quarta, 04/11, 20:00 |
| 13 | D. Malen | Roma | FWD | 6.6 | 26 | 11 (J3) | 236 | 11 | disponível | J4 @ Man Utd · terça, 03/11, 20:00 |
| 14 | Isco | Real Betis | MID | 6.6 | 26 | 11 (J3) | 227 | 2 | disponível | J4 @ B. Dortmund · quarta, 04/11, 20:00 |
| 15 | Vitinha | Paris | MID | 7.6 | 25 | 9 (J3) | 270 | 17 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |

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

- 872 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 125 × pStatus=NIS · qStatus=∅ · trained=∅
- 85 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 54 × pStatus=∅ · qStatus=∅ · trained=∅
- 17 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 10 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 5 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game
- 3 × pStatus=S · qStatus=∅ · trained=∅

</details>
