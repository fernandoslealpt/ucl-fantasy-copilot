# Modelo de pontos esperados (xP) — v1.3

> Código: `pipeline/model/`. Resultados: branch `data` → `latest/xp.json`, `latest/team-ratings.json`, `latest/model-report.json`.

## Em linguagem simples
Para cada jogador e cada um dos próximos 5 jogos, o modelo estima:
1. **Vai jogar?** Probabilidade de jogar e de fazer 60+ minutos, a partir dos minutos nas últimas jornadas (as mais recentes pesam mais), da época passada, do preço e do estado (lesão, dúvida, castigo, fora da convocatória).
2. **O que costuma fazer por 90 minutos:** golos, assistências, recuperações, defesas, Jogador do Jogo, cartões. Com poucos minutos, o valor é puxado para a média da posição, para não exagerar com 1 ou 2 jogos bons.
3. **Contra quem joga:** golos esperados da equipa e do adversário (força das equipas, abaixo). Mais golos esperados = mais golos/assistências; menos golos sofridos = mais clean sheets.
4. **Converte em pontos** com as regras 2026/27.

## Força das equipas
Regressão de Poisson com os resultados da Champions (época atual peso 1; época 2025/26 peso 0,5):

`golos esperados de A contra B = exp(μ + casa + ataque(A) − defesa(B))`

- ataque/defesa = parte de longo prazo (coeficiente UEFA de clubes, 5 épocas) + ajuste aprendido com os resultados, encolhido para zero (σ = 0,3).
- **Peso no tempo:** cada jogo pesa ½ por cada meia-vida de antiguidade; a época anterior ainda multiplica por um peso próprio.
- **Parâmetros por backtest** (`tuneRatings`): grelha de σ (encolhimento: 0,15–0,45), meia-vida (45, 90, 180, 365 dias ou sem decaimento) e peso da época anterior (0,25 / 0,5 / 1). Para cada jornada já jogada (desta época e da anterior) ajusta-se só com os jogos anteriores e mede-se a log-verosimilhança dos golos. Só se troca o valor por defeito (σ 0,3, sem decaimento, 0,5) com ganho ≥ 0,005 por observação. Escolha e top 10 da grelha em `model-report.json → ratingsTuning` (meia-vida `null` = sem decaimento).
- Probabilidade de clean sheet = `e^(−golos esperados do adversário)`.
- **Dificuldade 1–5** de cada jogo: quintis do saldo esperado (golos sofridos − marcados) em todos os jogos previstos.

Substitui o Elo do ClubElo (inacessível a partir do GitHub).

## Pontos por componente (por jogo)
| Componente | Cálculo |
|---|---|
| Aparição / 60' | P(joga)·1 + P(60+)·1 |
| Golos | golos/90 × minutos esperados/90 × ajuste ofensivo × pontos por posição (6/6/5/4) |
| Assistências | assist./90 × minutos/90 × ajuste ofensivo × 3 |
| Clean sheet | P(60+) × e^(−golos esperados do adversário) × (4/4/1/0) |
| Recuperações | P(joga) × E[⌊R/3⌋], R ~ Poisson(recuperações/90 × minutos) |
| Defesas (GR) | P(joga) × E[⌊D/3⌋], ajustado pela força do adversário |
| Jogador do Jogo | P(joga) × taxa por aparição × 3 |
| Golos sofridos (GR/DEF) | −P(60+) × E[⌊G/2⌋], G ~ Poisson(golos esperados do adversário) |
| Cartões | −(amarelos/90 × 1 + vermelhos/90 × 3) × minutos/90 |

**Ajuste ofensivo** = golos esperados da equipa neste jogo ÷ média da equipa na época.

## Parâmetros
Em `pipeline/model/xp.ts` (`PARAMS`) e no `model-report.json`: peso da época anterior 0,5; decaimento dos minutos 0,7 por jornada; encolhimento das taxas com 360' (golos/assist.), 180' (recuperações/defesas), 450' (cartões); 4 aparições (Jogador do Jogo).

## Confiança
- **alta**: titular (ou suplente) muito previsível, com 2+ jornadas de dados e disponível.
- **baixa**: dúvida/estado desconhecido, ou sem dados nesta época nem na anterior.
- **média**: restantes.

## Avaliação (backtest)
Para cada jornada já jogada, o modelo prevê usando só o que se sabia antes (histórico e resultados anteriores; o estado de lesão não é conhecido retroativamente). Compara com o **baseline ingénuo** (média de pontos por jornada até à data).

Métricas: erro médio absoluto, RMSE, correlação de ordem (Spearman) e **pontos reais médios do top 20/50** segundo cada método, o que mais interessa para escolher jogadores.

Primeiro resultado (1 nov 2026, jornadas 1–3): o modelo tem erro menor em todas as jornadas e o seu top 20 fez **mais pontos reais** (J2: 4,8 vs 2,7; J3: 6,4 vs 4,8). O resultado atualizado está no `summary.md` em cada execução.

## Amostra de um jogo
`sample` em cada jogador do `xp.json`: jogos com minutos, pontos, melhor jogo e a sua quota. `spiky` = só 1 jogo, ou ≥ 50% dos pontos (com ≥ 8) num só jogo. A app avisa e não usa a forma como razão nesses casos.

**Desconto calibrado:** o backtest compara real ÷ previsto destes jogadores (com ≥ 2 jogos, xP ≥ 3) com o dos restantes, nas jornadas jogadas a partir da J3. O fator relativo (0,88 a 13 nov) é aplicado ao xP deles; recalculado em cada execução, só com ≥ 50 casos, limitado a 0,8–1. Fica em `sample.adjusted` e em `model-report.json → spikyCalibration`.

## Limitações conhecidas (v1)
- Penáltis (marcador, defendidos, falhados) e golos de fora da área não são modelados.
- Risco de rotação por calendário do campeonato ainda não entra (precisa de jogos de todas as competições — fase seguinte).
- Fase de eliminatórias: jornadas sem adversário definido ficam sem previsão.
