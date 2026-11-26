# UCL Fantasy — atualização de dados

**Gerado:** quinta, 26/11, 13:58 (Lisboa) · **Jornada:** 6 (por jogar) · **Fecho da equipa:** terça, 08/12, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | quinta, 26/11, 13:58 |  |
| uefaFantasy | ✅ ok | 1 | 1176 | quinta, 26/11, 13:58 |  |
| uefaPlayerHistory | ✅ ok | 0 | 0 | quinta, 26/11, 13:58 |  |
| uefaPrevSeason | ✅ ok | 0 | 1176 | quinta, 26/11, 13:58 |  |
| uefaCoefficients | ✅ ok | 1 | 415 | quinta, 26/11, 13:58 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |
| googleNews | ✅ ok | 36 | 280 | quinta, 26/11, 13:58 |  |
| uefaReads | ✅ ok | 1 | 10 | quinta, 26/11, 13:58 |  |
| rotowire | ✅ ok | 1 | 0 | quinta, 26/11, 13:58 |  |

**Totais:** 1176 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 1888/2348 iguais · jogos do feed fantasy na API UEFA: 18/18
**Histórico por jornada (oficial UEFA):** 1176/1176 jogadores · soma das jornadas = total em 1176/1176 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4, J5 · feed —

## Avisos

- Pontos por jornada: 460/2348 diferem do valor oficial do feed

## Modelo xP v1.4.0 — próximas jornadas J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.92 | 1.98 | 6.65 | 5.05 |
| J2 | 2.01 | 2.19 | 4.25 | 2.6 |
| J3 | 1.95 | 2.09 | 6.75 | 4.8 |
| J4 | 2.04 | 2.19 | 5.75 | 4.35 |
| J5 | 1.93 | 2.03 | 4.9 | 3.55 |

**Top 20 xP — J6**

| # | Jogador | Equipa | Pos | €M | xP J | xP 3J | xP/€M | P(titular) | Adversário | Confiança |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S. Mouriño | Villarreal | DEF | 4.3 | 6.3 | 14.4 | 3.34 | 93% | vs Sabah | alta |
| 2 | Bruno Fernandes | Man Utd | MID | 9.0 | 6.3 | 16.6 | 1.85 | 86% | vs Leipzig | alta |
| 3 | Isco | Real Betis | MID | 6.8 | 6.1 | 13.6 | 2.00 | 70% | vs Como | média |
| 4 | D. Upamecano | Bayern München | DEF | 5.6 | 6.0 | 15.4 | 2.74 | 89% | vs Slavia Praha | alta |
| 5 | K. Laimer | Bayern München | DEF | 5.1 | 5.3 | 13.3 | 2.60 | 91% | vs Slavia Praha | alta |
| 6 | S. McTominay | Napoli | MID | 7.5 | 5.2 | 18.3 | 2.43 | 97% | vs Club Brugge | alta |
| 7 | M. Greenwood | Fenerbahçe | MID | 7.5 | 5.2 | 14.4 | 1.92 | 94% | @ LASK | alta |
| 8 | L. Karl | Bayern München | MID | 5.9 | 5.1 | 13.3 | 2.25 | 66% | vs Slavia Praha | média |
| 9 | N. Tresoldi | Club Brugge | FWD | 7.3 | 5.1 | 15.8 | 2.17 | 89% | @ Napoli | alta |
| 10 | Raphinha | Barcelona | MID | 9.6 | 5.0 | 16.2 | 1.69 | 67% | vs Man City | média |
| 11 | Fermín López | Barcelona | MID | 7.0 | 5.0 | 16.0 | 2.29 | 87% | vs Man City | alta |
| 12 | K. Mbappé | Real Madrid | FWD | 11.1 | 5.0 | 22.0 | 1.98 | 95% | @ Arsenal | alta |
| 13 | S. Brunstad Fet | Bodø/Glimt | MID | 5.3 | 5.0 | 12.7 | 2.39 | 92% | @ Lens | alta |
| 14 | A. Gordon | Barcelona | MID | 8.0 | 4.9 | 15.9 | 1.99 | 74% | vs Man City | média |
| 15 | R. Ljubičić | LASK | MID | 5.7 | 4.9 | 13.5 | 2.36 | 74% | vs Fenerbahçe | média |
| 16 | Z. Tripić | Viking | MID | 5.8 | 4.9 | 13.7 | 2.36 | 82% | vs Feyenoord | alta |
| 17 | Vitinha | Paris | MID | 7.7 | 4.9 | 16.7 | 2.16 | 99% | @ Aston Villa | alta |
| 18 | A. Grimaldo | Atleti | DEF | 5.5 | 4.8 | 15.6 | 2.83 | 92% | @ PSV | alta |
| 19 | F. Sjøvold | Bodø/Glimt | DEF | 4.8 | 4.8 | 12.1 | 2.52 | 97% | @ Lens | alta |
| 20 | Carlos Forbs | Club Brugge | MID | 6.4 | 4.8 | 14.8 | 2.32 | 93% | @ Napoli | alta |

## Top 15 por pontos

| # | Jogador | Equipa | Pos | €M | Pts | Últ. J | Min | % sel. | Estado | Próximo jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | K. Mbappé | Real Madrid | FWD | 11.1 | 48 | 16 (J5) | 447 | 66 | disponível | J6 @ Arsenal · quarta, 09/12, 20:00 |
| 2 | N. Paz | Como | MID | 7.2 | 45 | 2 (J5) | 408 | 29 | disponível | J6 @ Real Betis · quarta, 09/12, 17:45 |
| 3 | Carlos Augusto | Inter | DEF | 4.4 | 42 | 8 (J5) | 353 | 9 | disponível | J6 @ B. Dortmund · quarta, 09/12, 20:00 |
| 4 | L. Yamal | Barcelona | MID | 10.2 | 41 | 8 (J4) | 360 | 36 | fora | J6 vs Man City · terça, 08/12, 20:00 |
| 5 | Bruno Fernandes | Man Utd | MID | 9.0 | 41 | 16 (J5) | 414 | 11 | disponível | J6 vs Leipzig · terça, 08/12, 20:00 |
| 6 | Fabián Ruiz | Paris | MID | 7.0 | 40 | 3 (J5) | 444 | 6 | disponível | J6 @ Aston Villa · terça, 08/12, 20:00 |
| 7 | H. Kane | Bayern München | FWD | 11.2 | 39 | 5 (J4) | 360 | 33 | fora | J6 vs Slavia Praha · terça, 08/12, 20:00 |
| 8 | T. Douvikas | Como | FWD | 6.8 | 39 | 2 (J5) | 336 | 9 | disponível | J6 @ Real Betis · quarta, 09/12, 17:45 |
| 9 | L. Suárez | Sporting CP | FWD | 7.4 | 37 | 8 (J5) | 425 | 12 | disponível | J6 @ Roma · terça, 08/12, 20:00 |
| 10 | N. Tresoldi | Club Brugge | FWD | 7.3 | 37 | 3 (J5) | 426 | 4 | disponível | J6 @ Napoli · terça, 08/12, 20:00 |
| 11 | M. Hermoso | Roma | DEF | 4.7 | 37 | 14 (J5) | 414 | 1 | disponível | J6 vs Sporting CP · terça, 08/12, 20:00 |
| 12 | Vitinha | Paris | MID | 7.7 | 36 | 4 (J5) | 434 | 20 | disponível | J6 @ Aston Villa · terça, 08/12, 20:00 |
| 13 | D. Malen | Roma | FWD | 6.9 | 36 | 5 (J5) | 337 | 12 | disponível | J6 vs Sporting CP · terça, 08/12, 20:00 |
| 14 | K. Jørgensen | LASK | DEF | 4.7 | 36 | 6 (J5) | 365 | 1 | disponível | J6 vs Fenerbahçe · quarta, 09/12, 20:00 |
| 15 | J. Ramón | Como | DEF | 4.3 | 36 | 8 (J5) | 450 | 6 | disponível | J6 @ Real Betis · quarta, 09/12, 17:45 |

## Equipas mais fortes (top 10)

| Equipa | Coef. UEFA (rank) | Elo | V-E-D | Golos | Próximo jogo |
|---|---|---|---|---|---|
| Bayern München | 133.5 (#1) | — | 2-2-1 | 13:7 | J6 vs Slavia Praha |
| Arsenal | 133 (#2) | — | 3-2-0 | 9:4 | J6 vs Real Madrid |
| Real Madrid | 130.5 (#3) | — | 5-0-0 | 18:8 | J6 @ Arsenal |
| Paris | 128 (#4) | — | 4-1-0 | 22:7 | J6 @ Aston Villa |
| Inter | 121 (#5) | — | 3-0-2 | 10:6 | J6 @ B. Dortmund |
| Barcelona | 112.25 (#6) | — | 4-0-1 | 18:7 | J6 vs Man City |
| Man City | 111.5 (#7) | — | 3-1-1 | 14:9 | J6 @ Barcelona |
| Liverpool | 111 (#8) | — | 4-0-1 | 17:10 | J6 vs Porto |
| B. Dortmund | 103.75 (#9) | — | 3-1-1 | 8:6 | J6 vs Inter |
| Atleti | 96.75 (#11) | — | 2-1-2 | 6:5 | J6 @ PSV |

<details><summary>Valores de estado no feed</summary>

- 846 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 126 × pStatus=NIS · qStatus=∅ · trained=∅
- 98 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 55 × pStatus=∅ · qStatus=∅ · trained=∅
- 25 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 15 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 9 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game
- 2 × pStatus=S · qStatus=∅ · trained=∅

</details>
