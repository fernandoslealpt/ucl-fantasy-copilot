# UCL Fantasy — atualização de dados

**Gerado:** quarta, 04/11, 02:43 (Lisboa) · **Jornada:** 4 (a decorrer) · **Fecho da equipa:** terça, 03/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | quarta, 04/11, 02:43 |  |
| uefaFantasy | ✅ ok | 1 | 1173 | quarta, 04/11, 02:43 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | quarta, 04/11, 02:43 |  |
| uefaPrevSeason | ✅ ok | 0 | 1173 | quarta, 04/11, 02:43 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | quarta, 04/11, 02:43 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 0 | 271 | quarta, 04/11, 00:39 |  |
| rotowire | ✅ ok | 1 | 18 | quarta, 04/11, 02:43 |  |

**Totais:** 1173 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 1173/1173 iguais · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1173/1173 jogadores · soma das jornadas = total em 1173/1173 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4 · feed J3 (só pontos)

## Modelo xP v1.2.0 — próximas jornadas J4, J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.9 | 1.97 | 6.75 | 5.05 |
| J2 | 2 | 2.16 | 3.75 | 2.65 |
| J3 | 1.96 | 2.09 | 5.95 | 4.8 |

**Top 20 xP — J4**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | K. Mbappé | Real Madrid | FWD | 11.0 | 7.2 | 18.5 | 1.68 | 88% | @ AEK Athens | alta |
| 2 | D. Doué | Paris | MID | 8.5 | 6.5 | 17.9 | 2.10 | 85% | @ Villarreal | alta |
| 3 | L. Yamal | Barcelona | MID | 10.2 | 6.4 | 20.7 | 2.03 | 98% | vs Aston Villa | alta |
| 4 | N. Paz | Como | MID | 7.0 | 6.2 | 18.7 | 2.67 | 85% | @ Lens | alta |
| 5 | Z. Tripić | Viking | MID | 5.8 | 6.0 | 14.5 | 2.50 | 83% | vs Sabah | média |
| 6 | Vitinha | Paris | MID | 7.6 | 5.9 | 16.5 | 2.18 | 98% | @ Villarreal | alta |
| 7 | S. Guirassy | B. Dortmund | FWD | 8.6 | 5.8 | 14.1 | 1.63 | 81% | vs Real Betis | média |
| 8 | P. Christiansen | Viking | FWD | 6.0 | 5.8 | 13.8 | 2.30 | 83% | vs Sabah | média |
| 9 | H. Kane | Bayern München | FWD | 11.1 | 5.7 | 23.5 | 2.12 | 95% | @ Atleti | alta |
| 10 | P. Foden | Man City | MID | 7.0 | 5.4 | 16.6 | 2.37 | 85% | @ Leipzig | alta |
| 11 | Raphinha | Barcelona | MID | 9.7 | 5.4 | 17.4 | 1.79 | 90% | vs Aston Villa | alta |
| 12 | S. Brunstad Fet | Bodø/Glimt | MID | 5.0 | 5.3 | 16.3 | 3.26 | 90% | vs Lille | alta |
| 13 | Y. Diomande | Real Madrid | MID | 7.5 | 5.2 | 11.3 | 1.51 | 72% | @ AEK Athens | média |
| 14 | Carlos Augusto | Inter | DEF | 4.1 | 5.2 | 15.6 | 3.81 | 74% | @ Feyenoord | média |
| 15 | F. Sjøvold | Bodø/Glimt | DEF | 4.7 | 5.2 | 15.7 | 3.33 | 96% | vs Lille | alta |
| 16 | T. Douvikas | Como | FWD | 6.6 | 5.1 | 14.3 | 2.17 | 79% | @ Lens | média |
| 17 | W. Pacho | Paris | DEF | 6.0 | 5.1 | 14.0 | 2.34 | 98% | @ Villarreal | alta |
| 18 | E. Botheim | Viking | FWD | 5.0 | 5.0 | 11.1 | 2.23 | 78% | vs Sabah | média |
| 19 | E. Haaland | Man City | FWD | 11.2 | 5.0 | 13.5 | 1.21 | 79% | @ Leipzig | média |
| 20 | R. Ljubičić | LASK | MID | 5.5 | 5.0 | 12.9 | 2.35 | 60% | vs S. Bratislava | média |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | L. Yamal | Barcelona | MID | 10.2 | 41 | 8 (J4) | 360 | 49 | disponível | J4 vs Aston Villa · terça, 03/11, 20:00 |
| 2 | H. Kane | Bayern München | FWD | 11.1 | 39 | 5 (J4) | 360 | 50 | disponível | J4 @ Atleti · terça, 03/11, 20:00 |
| 3 | Fabián Ruiz | Paris | MID | 6.7 | 37 | 16 (J4) | 354 | 3 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |
| 4 | D. Doué | Paris | MID | 8.5 | 35 | 9 (J4) | 218 | 15 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |
| 5 | Carlos Augusto | Inter | DEF | 4.1 | 34 | 9 (J4) | 263 | 6 | disponível | J4 @ Feyenoord · terça, 03/11, 20:00 |
| 6 | Raphinha | Barcelona | MID | 9.7 | 33 | 15 (J4) | 201 | 35 | disponível | J4 vs Aston Villa · terça, 03/11, 20:00 |
| 7 | Vitinha | Paris | MID | 7.6 | 32 | 7 (J4) | 344 | 19 | disponível | J4 @ Villarreal · terça, 03/11, 20:00 |
| 8 | A. Davies | Bayern München | DEF | 5.2 | 32 | 7 (J4) | 289 | 10 | disponível | J4 @ Atleti · terça, 03/11, 20:00 |
| 9 | A. Batrakov | Galatasaray | MID | 4.5 | 32 | 17 (J4) | 284 | 1 | disponível | J4 vs Stuttgart · terça, 03/11, 17:45 |
| 10 | D. Malen | Roma | FWD | 6.6 | 31 | 5 (J4) | 314 | 12 | disponível | J4 @ Man Utd · terça, 03/11, 20:00 |
| 11 | R. Barkley | Aston Villa | MID | 5.7 | 31 | 1 (J4) | 204 | 2 | disponível | J4 @ Barcelona · terça, 03/11, 20:00 |
| 12 | K. Laimer | Bayern München | DEF | 5.0 | 31 | 17 (J4) | 334 | 4 | disponível | J4 @ Atleti · terça, 03/11, 20:00 |
| 13 | N. Paz | Como | MID | 7.0 | 30 | 20 (J3) | 260 | 18 | disponível | J4 @ Lens · quarta, 04/11, 20:00 |
| 14 | K. Jørgensen | LASK | DEF | 4.5 | 30 | 22 (J4) | 283 | 0 | disponível | J4 vs S. Bratislava · terça, 03/11, 20:00 |
| 15 | L. Suárez | Sporting CP | FWD | 7.3 | 29 | 2 (J4) | 339 | 12 | disponível | J4 @ Shakhtar · terça, 03/11, 17:45 |

## Equipas mais fortes (top 10)

| Equipa | Coef. UEFA (rank) | Elo | V-E-D | Golos | Próximo jogo |
|---|---|---|---|---|---|
| Bayern München | 133.5 (#1) | — | 2-2-0 | 12:5 | J5 @ Lille |
| Arsenal | 130 (#2) | — | 2-1-0 | 6:2 | J4 @ Slavia Praha |
| Paris | 127 (#3) | — | 4-0-0 | 20:5 | J5 vs Roma |
| Real Madrid | 126.5 (#4) | — | 3-0-0 | 10:5 | J4 @ AEK Athens |
| Inter | 119 (#5) | — | 2-0-2 | 8:6 | J5 vs Stuttgart |
| Barcelona | 110.25 (#6) | — | 3-0-1 | 14:6 | J5 @ Sabah |
| Liverpool | 109 (#7) | — | 3-0-0 | 12:7 | J4 @ Fenerbahçe |
| Man City | 108.5 (#8) | — | 2-0-1 | 9:5 | J4 @ Leipzig |
| B. Dortmund | 100.75 (#9) | — | 2-0-1 | 5:4 | J4 vs Real Betis |
| Aston Villa | 95 (#11) | — | 3-0-1 | 12:6 | J5 @ Galatasaray |

<details><summary>Valores de estado no feed</summary>

- 859 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 125 × pStatus=NIS · qStatus=∅ · trained=∅
- 91 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 55 × pStatus=∅ · qStatus=∅ · trained=∅
- 23 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 16 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 2 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game
- 2 × pStatus=S · qStatus=∅ · trained=∅

</details>
