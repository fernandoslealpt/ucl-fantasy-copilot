# UCL Fantasy — atualização de dados

**Gerado:** segunda, 02/11, 00:10 (Lisboa) · **Jornada:** 3 (terminada) · **Fecho da equipa:** terça, 20/10, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | segunda, 02/11, 00:10 |  |
| uefaFantasy | ✅ ok | 2 | 1171 | segunda, 02/11, 00:10 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | segunda, 02/11, 00:10 |  |
| uefaPrevSeason | ✅ ok | 0 | 1171 | segunda, 02/11, 00:10 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | segunda, 02/11, 00:10 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 0 | 264 | domingo, 01/11, 23:40 |  |
| rotowire | ✅ ok | 1 | 36 | segunda, 02/11, 00:10 |  |

**Totais:** 1171 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: nada a comparar ainda · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1171/1171 jogadores · soma das jornadas = total em 1171/1171 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots — · feed J2 (só pontos)

## Avisos

- Jornada: API de jogos indica J4, feed fantasy indica J3

## Modelo xP v1.2.0 — próximas jornadas J4, J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.91 | 1.95 | 6.6 | 5.05 |
| J2 | 2.01 | 2.13 | 3.75 | 2.65 |
| J3 | 1.97 | 2.08 | 5.95 | 4.8 |

**Top 20 xP — J4**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | K. Mbappé | Real Madrid | FWD | 11.0 | 7.1 | 18.2 | 1.65 | 88% | @ AEK Athens | alta |
| 2 | N. Paz | Como | MID | 7.0 | 6.2 | 18.4 | 2.62 | 84% | @ Lens | alta |
| 3 | D. Doué | Paris | MID | 8.5 | 6.1 | 17.3 | 2.03 | 85% | @ Villarreal | alta |
| 4 | Z. Tripić | Viking | MID | 5.6 | 6.0 | 14.3 | 2.55 | 83% | vs Sabah | média |
| 5 | L. Yamal | Barcelona | MID | 10.1 | 5.9 | 20.1 | 1.99 | 89% | vs Aston Villa | alta |
| 6 | S. Guirassy | B. Dortmund | FWD | 8.6 | 5.8 | 14.3 | 1.66 | 81% | vs Real Betis | média |
| 7 | P. Christiansen | Viking | FWD | 6.0 | 5.8 | 13.6 | 2.26 | 83% | vs Sabah | média |
| 8 | R. Ljubičić | LASK | MID | 5.5 | 5.7 | 13.6 | 2.46 | 77% | vs S. Bratislava | média |
| 9 | H. Kane | Bayern München | FWD | 11.0 | 5.4 | 23.7 | 2.15 | 88% | @ Atleti | alta |
| 10 | S. Brunstad Fet | Bodø/Glimt | MID | 5.0 | 5.4 | 16.4 | 3.28 | 87% | vs Lille | alta |
| 11 | P. Foden | Man City | MID | 7.0 | 5.3 | 16.5 | 2.35 | 85% | @ Leipzig | alta |
| 12 | E. Demirović | Stuttgart | FWD | 6.1 | 5.2 | 13.4 | 2.20 | 69% | @ Galatasaray | média |
| 13 | Vitinha | Paris | MID | 7.5 | 5.2 | 15.7 | 2.10 | 89% | @ Villarreal | alta |
| 14 | Carlos Augusto | Inter | DEF | 4.1 | 5.2 | 15.2 | 3.71 | 82% | @ Feyenoord | média |
| 15 | Raphinha | Barcelona | MID | 9.6 | 5.2 | 17.0 | 1.77 | 87% | vs Aston Villa | alta |
| 16 | S. Adeniran | LASK | FWD | 7.0 | 5.2 | 10.8 | 1.55 | 72% | vs S. Bratislava | média |
| 17 | Y. Diomande | Real Madrid | MID | 7.5 | 5.1 | 11.0 | 1.47 | 72% | @ AEK Athens | média |
| 18 | T. Douvikas | Como | FWD | 6.5 | 5.1 | 14.0 | 2.16 | 78% | @ Lens | média |
| 19 | E. Botheim | Viking | FWD | 5.0 | 5.1 | 11.1 | 2.22 | 78% | vs Sabah | média |
| 20 | Gabriel | Arsenal | DEF | 6.0 | 5.0 | 14.3 | 2.39 | 88% | @ Slavia Praha | alta |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | H. Kane | Bayern München | FWD | 11.0 | 34 | 12 (J3) | 270 | 48 | disponível | J3 vs Arsenal · quarta, 21/10, 20:00 |
| 2 | L. Yamal | Barcelona | MID | 10.1 | 33 | 7 (J3) | 270 | 47 | disponível | J3 @ Paris · terça, 20/10, 20:00 |
| 3 | N. Paz | Como | MID | 7.0 | 30 | 20 (J3) | 260 | 10 | disponível | J3 vs Man Utd · quarta, 21/10, 17:45 |
| 4 | R. Barkley | Aston Villa | MID | 5.5 | 30 | 10 (J3) | 175 | 2 | disponível | J3 vs Viking · quarta, 21/10, 20:00 |
| 5 | N. Tresoldi | Club Brugge | FWD | 7.0 | 28 | 5 (J3) | 255 | 3 | disponível | J3 vs Lens · quarta, 21/10, 20:00 |
| 6 | S. Guirassy | B. Dortmund | FWD | 8.6 | 27 | 13 (J3) | 210 | 12 | disponível | J3 @ Sabah · terça, 20/10, 17:45 |
| 7 | L. Suárez | Sporting CP | FWD | 7.1 | 27 | 10 (J3) | 249 | 12 | disponível | J3 vs LASK · quarta, 21/10, 20:00 |
| 8 | M. Bartra | Real Betis | DEF | 4.6 | 27 | 7 (J3) | 270 | 6 | disponível | J3 vs Feyenoord · quarta, 21/10, 20:00 |
| 9 | K. Mbappé | Real Madrid | FWD | 11.0 | 26 | 12 (J3) | 267 | 60 | disponível | J3 vs Leipzig · quarta, 21/10, 20:00 |
| 10 | O. Dembélé | Paris | FWD | 10.1 | 26 | 1 (J3) | 160 | 18 | disponível | J3 vs Barcelona · terça, 20/10, 20:00 |
| 11 | D. Doué | Paris | MID | 8.5 | 26 | 14 (J3) | 144 | 7 | disponível | J3 vs Barcelona · terça, 20/10, 20:00 |
| 12 | P. Foden | Man City | MID | 7.0 | 26 | 23 (J3) | 165 | 2 | disponível | J3 vs AEK Athens · terça, 20/10, 20:00 |
| 13 | D. Malen | Roma | FWD | 6.5 | 26 | 11 (J3) | 236 | 12 | disponível | J3 vs S. Bratislava · terça, 20/10, 20:00 |
| 14 | Isco | Real Betis | MID | 6.5 | 26 | 11 (J3) | 227 | 2 | disponível | J3 vs Feyenoord · quarta, 21/10, 20:00 |
| 15 | Vitinha | Paris | MID | 7.5 | 25 | 9 (J3) | 270 | 16 | disponível | J3 vs Barcelona · terça, 20/10, 20:00 |

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
- 87 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 55 × pStatus=∅ · qStatus=∅ · trained=∅
- 17 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 13 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 2 × pStatus=S · qStatus=∅ · trained=∅

</details>
