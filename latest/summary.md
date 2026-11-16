# UCL Fantasy — atualização de dados

**Gerado:** segunda, 16/11, 18:38 (Lisboa) · **Jornada:** 5 (por jogar) · **Fecho da equipa:** terça, 24/11, 17:45

| Fonte | Estado | Pedidos | Registos | Último sucesso | Erro |
|---|---|---|---|---|---|
| uefaMatches | ✅ ok | 3 | 144 | segunda, 16/11, 18:38 |  |
| uefaFantasy | ❌ falhou | 2 | — | segunda, 16/11, 06:41 | Feed fantasy desatualizado (J1 quando a jornada atual é a J5): mantêm-se os dados anteriores |
| uefaCoefficients | ✅ ok | 1 | 415 | segunda, 16/11, 18:38 |  |
| clubElo | ❌ falhou | 2 | — | — | fetch failed (Connect Timeout Error (attempted address: api.clubelo.com:443, timeout: 10000ms)) |

**Totais:** 1173 jogadores · 36 equipas (36 com coeficiente UEFA, 0 com Elo) · 144 jogos
**Verificações:** pontos por jornada vs. feed oficial: 899/1173 iguais
**Histórico por jornada (oficial UEFA):** 0/1173 jogadores · soma das jornadas = total em 0/0 · pedidos nesta execução: 0
**Plano B (sem histórico oficial):** snapshots J4 · feed —

## Modelo xP v1.3.0 — próximas jornadas J5, J6, J7, J8

**Teste nas jornadas jogadas** (previsão feita só com dados anteriores):

| Jornada | Erro médio modelo | Erro médio baseline | Pts reais top 20 modelo | Pts reais top 20 baseline |
|---|---|---|---|---|
| J1 | 1.91 | 1.97 | 6.65 | 5.05 |
| J2 | 1.99 | 2.16 | 3.75 | 2.6 |
| J3 | 1.96 | 2.09 | 6.4 | 4.8 |
| J4 | 2.05 | 2.19 | 6 | 4.45 |

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

- 863 × pStatus=∅ · qStatus=∅ · trained=In contention to start next game
- 126 × pStatus=NIS · qStatus=∅ · trained=∅
- 91 × pStatus=I · qStatus=∅ · trained=Unlikely to start next game
- 54 × pStatus=∅ · qStatus=∅ · trained=∅
- 20 × pStatus=D · qStatus=∅ · trained=In contention to start next game
- 16 × pStatus=∅ · qStatus=∅ · trained=Unlikely to start next game
- 2 × pStatus=S · qStatus=∅ · trained=∅
- 1 × pStatus=D · qStatus=∅ · trained=Unlikely to start next game

</details>
