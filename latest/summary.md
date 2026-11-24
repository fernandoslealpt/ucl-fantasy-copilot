# UCL Fantasy — atualização de dados

**Gerado:** terça, 24/11, 14:57 (Lisboa) · **Jornada:** 5 (por jogar) · **Fecho da equipa:** terça, 24/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | terça, 24/11, 14:57 |  |
| uefaFantasy | ✅ ok | 2 | 1175 | terça, 24/11, 14:57 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | terça, 24/11, 14:57 |  |
| uefaPrevSeason | ✅ ok | 0 | 1175 | terça, 24/11, 14:57 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | terça, 24/11, 14:57 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 0 | 274 | terça, 24/11, 14:46 |  |
| rotowire | ✅ ok | 1 | 36 | terça, 24/11, 14:57 |  |

**Totais:** 1175 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 899/1173 iguais · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1175/1175 jogadores · soma das jornadas = total em 1175/1175 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4 · feed —

## Avisos

- Pontos por jornada: 274/1173 diferem do valor oficial do feed

## Modelo xP v1.4.0 — próximas jornadas J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.91 | 1.97 | 6.65 | 5.05 |
| J2 | 1.99 | 2.16 | 3.75 | 2.6 |
| J3 | 1.96 | 2.09 | 6.4 | 4.8 |
| J4 | 2.05 | 2.19 | 6 | 4.45 |

**Top 20 xP — J5**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | N. Paz | Como | MID | 7.1 | 8.2 | 17.6 | 2.47 | 78% | vs AEK Athens | média |
| 2 | Raphinha | Barcelona | MID | 9.6 | 7.8 | 19.0 | 1.98 | 87% | @ Sabah | alta |
| 3 | T. Douvikas | Como | FWD | 6.6 | 7.7 | 16.8 | 2.54 | 81% | vs AEK Athens | média |
| 4 | J. Alvarez | Atleti | FWD | 10.0 | 7.1 | 16.4 | 1.64 | 88% | vs Viking | alta |
| 5 | Fermín López | Barcelona | MID | 7.0 | 6.5 | 15.8 | 2.26 | 85% | @ Sabah | alta |
| 6 | E. Haaland | Man City | FWD | 11.2 | 6.5 | 18.5 | 1.65 | 86% | vs Napoli | alta |
| 7 | K. Mbappé | Real Madrid | FWD | 11.1 | 6.4 | 21.4 | 1.93 | 88% | vs PSV | alta |
| 8 | A. Gordon | Barcelona | MID | 8.0 | 6.3 | 14.6 | 1.83 | 80% | @ Sabah | média |
| 9 | A. Grimaldo | Atleti | DEF | 5.5 | 6.3 | 14.9 | 2.71 | 86% | vs Viking | alta |
| 10 | M. Llorente | Atleti | MID | 6.7 | 5.5 | 14.0 | 2.09 | 88% | vs Viking | alta |
| 11 | E. Anderson | Man City | MID | 7.0 | 5.4 | 15.0 | 2.14 | 83% | vs Napoli | média |
| 12 | Vitinha | Paris | MID | 7.7 | 5.3 | 16.3 | 2.11 | 89% | vs Roma | alta |
| 13 | C. Nkunku | Leipzig | FWD | 7.0 | 5.3 | 11.3 | 1.62 | 78% | vs Lens | média |
| 14 | Fabián Ruiz | Paris | MID | 6.8 | 5.3 | 15.6 | 2.30 | 87% | vs Roma | alta |
| 15 | S. Brunstad Fet | Bodø/Glimt | MID | 5.1 | 5.1 | 13.9 | 2.72 | 87% | vs LASK | alta |
| 16 | J. Ramón | Como | DEF | 4.1 | 5.1 | 10.8 | 2.64 | 81% | vs AEK Athens | média |
| 17 | E. Fernández | Man City | MID | 7.5 | 5.1 | 14.6 | 1.95 | 86% | vs Napoli | alta |
| 18 | M. Baturina | Como | MID | 5.7 | 5.1 | 10.9 | 1.91 | 76% | vs AEK Athens | média |
| 19 | D. Hancko | Atleti | DEF | 4.5 | 5.0 | 12.7 | 2.82 | 88% | vs Viking | alta |
| 20 | B. Gruda | Leipzig | MID | 5.2 | 5.0 | 10.9 | 2.10 | 80% | vs Lens | média |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | N. Paz | Como | MID | 7.1 | 43 | 13 (J4) | 318 | 26 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 2 | L. Yamal | Barcelona | MID | 10.2 | 41 | 8 (J4) | 360 | 41 | fora | J5 @ Sabah · quarta, 25/11, 17:45 |
| 3 | H. Kane | Bayern München | FWD | 11.2 | 39 | 5 (J4) | 360 | 40 | fora | J5 @ Lille · quarta, 25/11, 20:00 |
| 4 | Fabián Ruiz | Paris | MID | 6.8 | 37 | 16 (J4) | 354 | 5 | disponível | J5 vs Roma · quarta, 25/11, 20:00 |
| 5 | T. Douvikas | Como | FWD | 6.6 | 37 | 20 (J4) | 246 | 7 | disponível | J5 vs AEK Athens · terça, 24/11, 20:00 |
| 6 | D. Doué | Paris | MID | 8.6 | 35 | 9 (J4) | 218 | 11 | fora | J5 vs Roma · quarta, 25/11, 20:00 |
| 7 | N. Tresoldi | Club Brugge | FWD | 7.3 | 34 | 6 (J4) | 336 | 4 | disponível | J5 vs Liverpool · quarta, 25/11, 20:00 |
| 8 | Carlos Augusto | Inter | DEF | 4.2 | 34 | 9 (J4) | 263 | 8 | disponível | J5 vs Stuttgart · quarta, 25/11, 20:00 |
| 9 | Raphinha | Barcelona | MID | 9.6 | 33 | 15 (J4) | 201 | 42 | disponível | J5 @ Sabah · quarta, 25/11, 17:45 |
| 10 | K. Mbappé | Real Madrid | FWD | 11.1 | 32 | 6 (J4) | 357 | 65 | disponível | J5 vs PSV · terça, 24/11, 20:00 |
| 11 | Vitinha | Paris | MID | 7.7 | 32 | 7 (J4) | 344 | 20 | disponível | J5 vs Roma · quarta, 25/11, 20:00 |
| 12 | A. Davies | Bayern München | DEF | 5.2 | 32 | 7 (J4) | 289 | 9 | fora | J5 @ Lille · quarta, 25/11, 20:00 |
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

- 847 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 126 × pStatus=NIS · qStatus=∅ · trained=∅
- 95 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 56 × pStatus=∅ · qStatus=∅ · trained=∅
- 27 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 12 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 8 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game
- 4 × pStatus=S · qStatus=∅ · trained=∅

</details>
