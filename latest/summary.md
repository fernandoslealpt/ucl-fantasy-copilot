# UCL Fantasy — atualização de dados

**Gerado:** sábado, 28/11, 02:44 (Lisboa) · **Jornada:** 6 (por jogar) · **Fecho da equipa:** terça, 08/12, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | sábado, 28/11, 02:44 |  |
| uefaFantasy | ❌ falhou | 2 | — | sexta, 27/11, 19:30 | Feed fantasy desatualizado (J5 quando a jornada atual é a J6): mantêm-se os dados anteriores |
| uefaCoefficients | ✅ ok | 1 | 415 | sábado, 28/11, 02:44 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |

**Totais:** 1176 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 1888/2348 iguais
**Histórico por jornada (oficial UEFA):** 0/1176 jogadores · soma das jornadas = total em 0/0 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4, J5 · feed —

## Modelo xP v1.4.0 — próximas jornadas J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.92 | 1.98 | 6.65 | 5.05 |
| J2 | 2.01 | 2.19 | 3.75 | 2.6 |
| J3 | 1.96 | 2.1 | 6.75 | 4.8 |
| J4 | 2.04 | 2.19 | 5.75 | 4.35 |
| J5 | 1.93 | 2.03 | 4.9 | 3.55 |

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
