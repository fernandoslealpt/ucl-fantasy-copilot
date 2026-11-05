# UCL Fantasy — atualização de dados

**Gerado:** quinta, 05/11, 23:41 (Lisboa) · **Jornada:** 5 (por jogar) · **Fecho da equipa:** terça, 24/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | quinta, 05/11, 23:41 |  |
| uefaFantasy | ✅ ok | 1 | 1173 | quinta, 05/11, 23:41 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | quinta, 05/11, 23:41 |  |
| uefaPrevSeason | ✅ ok | 0 | 1173 | quinta, 05/11, 23:41 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | quinta, 05/11, 23:41 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 36 | 271 | quinta, 05/11, 23:41 |  |
| rotowire | ✅ ok | 1 | 0 | quinta, 05/11, 23:41 |  |

**Totais:** 1173 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 899/1173 iguais · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1173/1173 jogadores · soma das jornadas = total em 1173/1173 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4 · feed —

## Avisos

- Pontos por jornada: 274/1173 diferem do valor oficial do feed

## Modelo xP v1.2.0 — próximas jornadas J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.91 | 1.98 | 6.65 | 5.05 |
| J2 | 2 | 2.16 | 3.75 | 2.6 |
| J3 | 1.96 | 2.08 | 6.15 | 4.8 |
| J4 | 2.05 | 2.2 | 5.6 | 4.45 |

**Top 20 xP — J5**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | L. Yamal | Barcelona | MID | 10.2 | 8.5 | 20.0 | 1.96 | 98% | @ Sabah | alta |
| 2 | T. Douvikas | Como | FWD | 6.6 | 8.2 | 18.2 | 2.76 | 73% | vs AEK Athens | média |
| 3 | Raphinha | Barcelona | MID | 9.6 | 8.2 | 19.3 | 2.01 | 92% | @ Sabah | alta |
| 4 | J. Alvarez | Atleti | FWD | 10.0 | 7.3 | 16.7 | 1.67 | 96% | vs Viking | alta |
| 5 | H. Kane | Bayern München | FWD | 11.2 | 7.3 | 23.8 | 2.12 | 96% | @ Lille | alta |
| 6 | N. Paz | Como | MID | 7.1 | 7.1 | 16.3 | 2.29 | 60% | vs AEK Athens | média |
| 7 | E. Haaland | Man City | FWD | 11.2 | 7.1 | 19.3 | 1.72 | 90% | vs Napoli | alta |
| 8 | K. Mbappé | Real Madrid | FWD | 11.1 | 6.9 | 21.3 | 1.92 | 95% | vs PSV | alta |
| 9 | D. Doué | Paris | MID | 8.6 | 6.7 | 18.2 | 2.12 | 87% | vs Roma | alta |
| 10 | Fermín López | Barcelona | MID | 7.0 | 6.6 | 15.9 | 2.27 | 84% | @ Sabah | alta |
| 11 | P. Foden | Man City | MID | 7.1 | 6.6 | 17.8 | 2.51 | 87% | vs Napoli | alta |
| 12 | A. Grimaldo | Atleti | DEF | 5.5 | 6.3 | 15.3 | 2.78 | 89% | vs Viking | alta |
| 13 | Carlos Augusto | Inter | DEF | 4.2 | 6.1 | 15.8 | 3.77 | 79% | vs Stuttgart | média |
| 14 | Vitinha | Paris | MID | 7.7 | 5.9 | 16.4 | 2.13 | 98% | vs Roma | alta |
| 15 | A. Gordon | Barcelona | MID | 8.0 | 5.9 | 14.1 | 1.76 | 67% | @ Sabah | média |
| 16 | S. Brunstad Fet | Bodø/Glimt | MID | 5.1 | 5.8 | 15.7 | 3.08 | 91% | vs LASK | alta |
| 17 | M. Llorente | Atleti | MID | 6.7 | 5.8 | 14.3 | 2.14 | 96% | vs Viking | alta |
| 18 | Fabián Ruiz | Paris | MID | 6.8 | 5.7 | 15.5 | 2.28 | 91% | vs Roma | alta |
| 19 | M. Olise | Bayern München | MID | 9.1 | 5.6 | 18.2 | 2.00 | 95% | @ Lille | alta |
| 20 | E. Fernández | Man City | MID | 7.5 | 5.5 | 15.2 | 2.02 | 88% | vs Napoli | alta |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | N. Paz | Como | MID | 7.1 | 43 | 13 (J4) | 318 | 20 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 2 | L. Yamal | Barcelona | MID | 10.2 | 41 | 8 (J4) | 360 | 49 | disponível | J5 @ Sabah · quarta, 25/11, 17:45 |
| 3 | H. Kane | Bayern München | FWD | 11.2 | 39 | 5 (J4) | 360 | 50 | disponível | J5 @ Lille · quarta, 25/11, 20:00 |
| 4 | Fabián Ruiz | Paris | MID | 6.8 | 37 | 16 (J4) | 354 | 3 | disponível | J5 vs Roma · quarta, 25/11, 20:00 |
| 5 | T. Douvikas | Como | FWD | 6.6 | 37 | 20 (J4) | 246 | 2 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 6 | D. Doué | Paris | MID | 8.6 | 35 | 9 (J4) | 218 | 15 | disponível | J5 vs Roma · quarta, 25/11, 20:00 |
| 7 | N. Tresoldi | Club Brugge | FWD | 7.3 | 34 | 6 (J4) | 336 | 4 | disponível | J5 vs Liverpool · quarta, 25/11, 20:00 |
| 8 | Carlos Augusto | Inter | DEF | 4.2 | 34 | 9 (J4) | 263 | 7 | disponível | J5 vs Stuttgart · quarta, 25/11, 20:00 |
| 9 | Raphinha | Barcelona | MID | 9.6 | 33 | 15 (J4) | 201 | 35 | disponível | J5 @ Sabah · quarta, 25/11, 17:45 |
| 10 | K. Mbappé | Real Madrid | FWD | 11.1 | 32 | 6 (J4) | 357 | 62 | disponível | J5 vs PSV · terça, 24/11, 20:00 |
| 11 | Vitinha | Paris | MID | 7.7 | 32 | 7 (J4) | 344 | 19 | disponível | J5 vs Roma · quarta, 25/11, 20:00 |
| 12 | A. Davies | Bayern München | DEF | 5.2 | 32 | 7 (J4) | 289 | 11 | disponível | J5 @ Lille · quarta, 25/11, 20:00 |
| 13 | A. Batrakov | Galatasaray | MID | 4.6 | 32 | 17 (J4) | 284 | 2 | disponível | J5 vs Aston Villa · terça, 24/11, 17:45 |
| 14 | D. Malen | Roma | FWD | 6.8 | 31 | 5 (J4) | 314 | 12 | disponível | J5 @ Paris · quarta, 25/11, 20:00 |
| 15 | Carlos Forbs | Club Brugge | MID | 6.3 | 31 | 6 (J4) | 349 | 2 | disponível | J5 vs Liverpool · quarta, 25/11, 20:00 |

## Equipas mais fortes (top 10)

| Equipa | Coef. UEFA (rank) | Elo | V-E-D | Golos | Próximo jogo |
|---|---|---|---|---|---|
| Bayern München | 133.5 (#1) | — | 2-2-0 | 12:5 | J5 @ Lille |
| Arsenal | 132 (#2) | — | 3-1-0 | 8:3 | J5 vs B. Dortmund |
| Real Madrid | 128.5 (#3) | — | 4-0-0 | 13:7 | J5 vs PSV |
| Paris | 127 (#4) | — | 4-0-0 | 20:5 | J5 vs Roma |
| Inter | 119 (#5) | — | 2-0-2 | 8:6 | J5 vs Stuttgart |
| Man City | 110.5 (#6) | — | 3-0-1 | 12:7 | J5 vs Napoli |
| Barcelona | 110.25 (#7) | — | 3-0-1 | 14:6 | J5 @ Sabah |
| Liverpool | 109 (#8) | — | 3-0-1 | 14:10 | J5 @ Club Brugge |
| B. Dortmund | 102.75 (#9) | — | 3-0-1 | 7:5 | J5 @ Arsenal |
| Aston Villa | 95 (#11) | — | 3-0-1 | 12:6 | J5 @ Galatasaray |

<details><summary>Valores de estado no feed</summary>

- 862 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 126 × pStatus=NIS · qStatus=∅ · trained=∅
- 91 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 55 × pStatus=∅ · qStatus=∅ · trained=∅
- 20 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 16 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 2 × pStatus=S · qStatus=∅ · trained=∅
- 1 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game

</details>
