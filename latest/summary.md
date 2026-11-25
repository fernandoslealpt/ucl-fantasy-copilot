# UCL Fantasy — atualização de dados

**Gerado:** quarta, 25/11, 00:49 (Lisboa) · **Jornada:** 5 (a decorrer) · **Fecho da equipa:** terça, 24/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | quarta, 25/11, 00:49 |  |
| uefaFantasy | ✅ ok | 1 | 1175 | quarta, 25/11, 00:49 |  |
| uefaPlayerHistory | ✅ ok | 274 | 274 | quarta, 25/11, 00:49 |  |
| uefaPrevSeason | ✅ ok | 0 | 1175 | quarta, 25/11, 00:49 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | quarta, 25/11, 00:49 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 36 | 279 | quarta, 25/11, 00:49 |  |
| uefaReads | ✅ ok | 1 | 8 | quarta, 25/11, 00:49 |  |
| rotowire | ✅ ok | 1 | 18 | quarta, 25/11, 00:49 |  |

**Totais:** 1175 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 1800/2348 iguais · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1175/1175 jogadores · soma das jornadas = total em 1175/1175 · pedidos nesta execução: 274
**Plano B (sem histórico oficial):** snapshots J4, J5 · feed —

## Avisos

- Pontos por jornada: 548/2348 diferem do valor oficial do feed

## Modelo xP v1.4.0 — próximas jornadas J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.91 | 1.97 | 6.65 | 5.05 |
| J2 | 1.99 | 2.16 | 4.15 | 2.6 |
| J3 | 1.96 | 2.09 | 6.4 | 4.8 |
| J4 | 2.05 | 2.19 | 6 | 4.45 |

**Top 20 xP — J5**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Raphinha | Barcelona | MID | 9.6 | 7.8 | 19.3 | 2.01 | 87% | @ Sabah | alta |
| 2 | K. Mbappé | Real Madrid | FWD | 11.1 | 7.2 | 21.9 | 1.97 | 95% | vs PSV | alta |
| 3 | J. Alvarez | Atleti | FWD | 10.0 | 7.1 | 16.4 | 1.64 | 88% | vs Viking | alta |
| 4 | T. Douvikas | Como | FWD | 6.6 | 7.0 | 16.1 | 2.44 | 73% | vs AEK Athens | média |
| 5 | N. Paz | Como | MID | 7.1 | 6.9 | 16.3 | 2.29 | 60% | vs AEK Athens | média |
| 6 | E. Haaland | Man City | FWD | 11.2 | 6.7 | 18.8 | 1.68 | 90% | vs Napoli | alta |
| 7 | Fermín López | Barcelona | MID | 7.0 | 6.5 | 16.1 | 2.30 | 85% | @ Sabah | alta |
| 8 | A. Grimaldo | Atleti | DEF | 5.5 | 6.4 | 15.2 | 2.76 | 86% | vs Viking | alta |
| 9 | A. Gordon | Barcelona | MID | 8.0 | 6.3 | 14.8 | 1.85 | 80% | @ Sabah | média |
| 10 | M. Llorente | Atleti | MID | 6.7 | 5.5 | 14.0 | 2.09 | 88% | vs Viking | alta |
| 11 | P. Foden | Man City | MID | 7.1 | 5.4 | 15.2 | 2.15 | 87% | vs Napoli | alta |
| 12 | Vitinha | Paris | MID | 7.7 | 5.4 | 16.2 | 2.11 | 89% | vs Roma | alta |
| 13 | Fabián Ruiz | Paris | MID | 6.8 | 5.3 | 15.6 | 2.29 | 87% | vs Roma | alta |
| 14 | S. Brunstad Fet | Bodø/Glimt | MID | 5.1 | 5.2 | 14.1 | 2.76 | 91% | vs LASK | alta |
| 15 | E. Fernández | Man City | MID | 7.5 | 5.2 | 14.8 | 1.98 | 88% | vs Napoli | alta |
| 16 | D. Hancko | Atleti | DEF | 4.5 | 5.2 | 13.0 | 2.89 | 88% | vs Viking | alta |
| 17 | E. Anderson | Man City | MID | 7.0 | 5.1 | 14.8 | 2.11 | 77% | vs Napoli | média |
| 18 | João Cancelo | Barcelona | DEF | 5.0 | 5.0 | 12.6 | 2.52 | 87% | @ Sabah | alta |
| 19 | F. Sjøvold | Bodø/Glimt | DEF | 4.8 | 5.0 | 13.5 | 2.80 | 97% | vs LASK | alta |
| 20 | K. Adeyemi | Barcelona | FWD | 7.2 | 5.0 | 9.4 | 1.31 | 68% | @ Sabah | média |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | K. Mbappé | Real Madrid | FWD | 11.1 | 48 | 16 (J5) | 447 | 66 | disponível | J5 vs PSV · terça, 24/11, 20:00 |
| 2 | N. Paz | Como | MID | 7.1 | 45 | 2 (J5) | 408 | 29 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 3 | L. Yamal | Barcelona | MID | 10.2 | 41 | 8 (J4) | 360 | 35 | fora | J5 @ Sabah · quarta, 25/11, 17:45 |
| 4 | H. Kane | Bayern München | FWD | 11.2 | 39 | 5 (J4) | 360 | 33 | fora | J5 @ Lille · quarta, 25/11, 20:00 |
| 5 | T. Douvikas | Como | FWD | 6.6 | 39 | 2 (J5) | 336 | 10 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 6 | Fabián Ruiz | Paris | MID | 6.8 | 37 | 16 (J4) | 354 | 6 | disponível | J5 vs Roma · quarta, 25/11, 20:00 |
| 7 | K. Jørgensen | LASK | DEF | 4.5 | 36 | 6 (J5) | 365 | 1 | disponível | J5 @ Bodø/Glimt · terça, 24/11, 17:45 |
| 8 | J. Ramón | Como | DEF | 4.1 | 36 | 8 (J5) | 450 | 6 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 9 | D. Doué | Paris | MID | 8.6 | 35 | 9 (J4) | 218 | 8 | fora | J5 vs Roma · quarta, 25/11, 20:00 |
| 10 | N. Tresoldi | Club Brugge | FWD | 7.3 | 34 | 6 (J4) | 336 | 4 | disponível | J5 vs Liverpool · quarta, 25/11, 20:00 |
| 11 | F. Sjøvold | Bodø/Glimt | DEF | 4.8 | 34 | 7 (J5) | 450 | 2 | disponível | J5 vs LASK · terça, 24/11, 17:45 |
| 12 | A. Batrakov | Galatasaray | MID | 4.6 | 34 | 2 (J5) | 358 | 3 | disponível | J5 vs Aston Villa · terça, 24/11, 17:45 |
| 13 | Carlos Augusto | Inter | DEF | 4.2 | 34 | 9 (J4) | 263 | 9 | disponível | J5 vs Stuttgart · quarta, 25/11, 20:00 |
| 14 | Raphinha | Barcelona | MID | 9.6 | 33 | 15 (J4) | 201 | 46 | disponível | J5 @ Sabah · quarta, 25/11, 17:45 |
| 15 | F. Valverde | Real Madrid | MID | 7.1 | 33 | 9 (J5) | 383 | 7 | disponível | J5 vs PSV · terça, 24/11, 20:00 |

## Equipas mais fortes (top 10)

| Equipa | Coef. UEFA (rank) | Elo | V-E-D | Golos | Próximo jogo |
|---|---|---|---|---|---|
| Bayern München | 133.5 (#1) | — | 2-2-0 | 12:5 | J5 @ Lille |
| Arsenal | 133 (#2) | — | 3-2-0 | 9:4 | J6 vs Real Madrid |
| Real Madrid | 130.5 (#3) | — | 5-0-0 | 18:8 | J6 @ Arsenal |
| Paris | 127 (#4) | — | 4-0-0 | 20:5 | J5 vs Roma |
| Inter | 119 (#5) | — | 2-0-2 | 8:6 | J5 vs Stuttgart |
| Man City | 111.5 (#6) | — | 3-1-1 | 14:9 | J6 @ Barcelona |
| Barcelona | 110.25 (#7) | — | 3-0-1 | 14:6 | J5 @ Sabah |
| Liverpool | 109 (#8) | — | 3-0-1 | 14:10 | J5 @ Club Brugge |
| B. Dortmund | 103.75 (#9) | — | 3-1-1 | 8:6 | J6 vs Inter |
| Aston Villa | 95 (#11) | — | 3-0-2 | 12:7 | J6 vs Paris |

<details><summary>Valores de estado no feed</summary>

- 846 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 126 × pStatus=NIS · qStatus=∅ · trained=∅
- 98 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 54 × pStatus=∅ · qStatus=∅ · trained=∅
- 25 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 13 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 10 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game
- 3 × pStatus=S · qStatus=∅ · trained=∅

</details>
