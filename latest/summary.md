# UCL Fantasy — atualização de dados

**Gerado:** domingo, 01/11, 23:59 (Lisboa) · **Jornada:** 1 (terminada) · **Fecho da equipa:** terça, 08/09, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | domingo, 01/11, 23:59 |  |
| uefaFantasy | ✅ ok | 1 | 1163 | domingo, 01/11, 23:59 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | domingo, 01/11, 23:59 |  |
| uefaPrevSeason | ✅ ok | 0 | 1171 | domingo, 01/11, 23:59 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | domingo, 01/11, 23:59 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 0 | 264 | domingo, 01/11, 23:40 |  |

**Totais:** 1163 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: nada a comparar ainda · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1163/1163 jogadores · soma das jornadas = total em 1163/1163 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots — · feed —

## Avisos

- Jornada: API de jogos indica J4, feed fantasy indica J1
- J1: 1.º snapshot feito depois do fecho — pontos desta jornada só a partir do feed

## Modelo xP v1.1.0 — próximas jornadas J2, J3, J4, J5, J6

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.91 | 1.96 | 6.6 | 5.05 |

**Top 20 xP — J2**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | H. Kane | Bayern München | FWD | 11.0 | 7.6 | 17.5 | 1.59 | 94% | @ Viking | média |
| 2 | J. Alvarez | Atleti | FWD | 10.0 | 6.2 | 16.4 | 1.64 | 95% | vs Man Utd | média |
| 3 | E. Demirović | Stuttgart | FWD | 6.0 | 6.2 | 16.3 | 2.71 | 69% | @ S. Bratislava | média |
| 4 | L. Yamal | Barcelona | MID | 10.0 | 5.9 | 16.4 | 1.64 | 98% | @ Galatasaray | média |
| 5 | Raphinha | Barcelona | MID | 9.5 | 5.6 | 15.7 | 1.65 | 90% | @ Galatasaray | média |
| 6 | Gabriel | Arsenal | DEF | 6.0 | 5.6 | 14.4 | 2.40 | 91% | vs Lille | média |
| 7 | K. Mbappé | Real Madrid | FWD | 11.0 | 5.6 | 20.6 | 1.87 | 93% | @ Roma | média |
| 8 | S. Guirassy | B. Dortmund | FWD | 8.5 | 5.2 | 17.4 | 2.04 | 88% | @ Bodø/Glimt | média |
| 9 | D. Upamecano | Bayern München | DEF | 5.5 | 5.2 | 13.3 | 2.42 | 96% | @ Viking | média |
| 10 | V. van Dijk | Liverpool | DEF | 6.0 | 5.2 | 15.5 | 2.59 | 96% | @ LASK | média |
| 11 | M. Llorente | Atleti | MID | 6.5 | 5.2 | 14.0 | 2.15 | 93% | vs Man Utd | média |
| 12 | N. Jackson | Aston Villa | FWD | 7.0 | 5.1 | 14.3 | 2.04 | 61% | vs Fenerbahçe | média |
| 13 | D. Šturm | Slavia Praha | FWD | 5.5 | 5.1 | 12.8 | 2.34 | 69% | @ Sabah | média |
| 14 | J. McGinn | Aston Villa | MID | 6.5 | 5.1 | 14.2 | 2.18 | 74% | vs Fenerbahçe | média |
| 15 | M. Bartra | Real Betis | DEF | 4.5 | 5.1 | 14.1 | 3.12 | 62% | vs Porto | média |
| 16 | V. Gyökeres | Arsenal | FWD | 8.5 | 5.0 | 12.5 | 1.47 | 86% | vs Lille | média |
| 17 | Luis Díaz | Bayern München | MID | 8.0 | 5.0 | 12.2 | 1.52 | 89% | @ Viking | média |
| 18 | E. Haaland | Man City | FWD | 11.0 | 5.0 | 17.9 | 1.62 | 88% | vs Paris | média |
| 19 | A. Mac Allister | Liverpool | MID | 6.5 | 4.9 | 14.4 | 2.22 | 83% | @ LASK | média |
| 20 | F. Valverde | Real Madrid | MID | 7.0 | 4.7 | 16.5 | 2.36 | 97% | @ Roma | média |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | H. Kane | Bayern München | FWD | 11.0 | 34 | 12 (J3) | 270 | 54 | disponível | J1 vs Bodø/Glimt · quinta, 10/09, 20:00 |
| 2 | L. Yamal | Barcelona | MID | 10.0 | 33 | 7 (J3) | 270 | 32 | disponível | J1 vs Feyenoord · quarta, 09/09, 17:45 |
| 3 | N. Paz | Como | MID | 7.0 | 30 | 20 (J3) | 260 | 8 | disponível | J1 vs Leipzig · quinta, 10/09, 20:00 |
| 4 | R. Barkley | Aston Villa | MID | 5.5 | 30 | 10 (J3) | 175 | 0 | disponível | J1 @ Club Brugge · terça, 08/09, 17:45 |
| 5 | N. Tresoldi | Club Brugge | FWD | 7.0 | 28 | 5 (J3) | 255 | 1 | disponível | J1 vs Aston Villa · terça, 08/09, 17:45 |
| 6 | S. Guirassy | B. Dortmund | FWD | 8.5 | 27 | 13 (J3) | 210 | 9 | disponível | J1 vs Villarreal · terça, 08/09, 20:00 |
| 7 | L. Suárez | Sporting CP | FWD | 7.0 | 27 | 10 (J3) | 249 | 8 | disponível | J1 vs Galatasaray · quarta, 09/09, 20:00 |
| 8 | M. Bartra | Real Betis | DEF | 4.5 | 27 | 7 (J3) | 270 | 1 | disponível | J1 @ Lille · terça, 08/09, 20:00 |
| 9 | K. Mbappé | Real Madrid | FWD | 11.0 | 26 | 12 (J3) | 267 | 56 | disponível | J1 vs Inter · terça, 08/09, 20:00 |
| 10 | O. Dembélé | Paris | FWD | 10.0 | 26 | 1 (J3) | 160 | 15 | disponível | J1 vs S. Bratislava · quarta, 09/09, 20:00 |
| 11 | D. Doué | Paris | MID | 8.5 | 26 | 14 (J3) | 144 | 4 | disponível | J1 vs S. Bratislava · quarta, 09/09, 20:00 |
| 12 | P. Foden | Man City | MID | 7.0 | 26 | 23 (J3) | 165 | 1 | disponível | J1 @ Porto · terça, 08/09, 20:00 |
| 13 | D. Malen | Roma | FWD | 6.5 | 26 | 11 (J3) | 236 | 7 | disponível | J1 @ Fenerbahçe · quinta, 10/09, 17:45 |
| 14 | Isco | Real Betis | MID | 6.5 | 26 | 11 (J3) | 227 | 1 | disponível | J1 @ Lille · terça, 08/09, 20:00 |
| 15 | Vitinha | Paris | MID | 7.5 | 25 | 9 (J3) | 270 | 18 | disponível | J1 vs S. Bratislava · quarta, 09/09, 20:00 |

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

- 864 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 125 × pStatus=NIS · qStatus=∅ · trained=∅
- 87 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 55 × pStatus=∅ · qStatus=∅ · trained=∅
- 17 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 13 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 2 × pStatus=S · qStatus=∅ · trained=∅

</details>
