# Decisões

## 29 out 2026 — base (aprovado pelo Fernando no projeto claude.ai)
- Orçamento zero; só fontes grátis; sem LLM na app; sem login UEFA; sem alterações automáticas.
- Arquitetura: GitHub Actions (dados + modelo) + GitHub Pages (app); repo público.
- Desenvolvimento por fases com aprovação no fim de cada uma.

## 31 out 2026 — pipeline de dados (Fase 0/1)
- **Node 22 LTS** em vez de Node 20 (o Node 20 deixou de ter suporte em abril de 2026).
- **API de jogos UEFA** (`match.uefa.com/v5/matches`) adicionada como fonte do calendário e resultados: pública, horas em UTC, IDs de equipa iguais aos do feed fantasy. Reduz a dependência da API-Football.
- Horas do feed fantasy (`MM/DD/YYYY HH:mm:ss`) interpretadas como **hora de Paris (CET/CEST)** — confirmado: 21:00 no feed = 20:00Z na API de jogos.
- Dados gerados ficam no branch **`data`** (`latest/` + `history/gdNN/AAAA-MM-DD.json`, um snapshot por dia); `main` só tem código.
- Pontos e minutos por jornada obtidos com `gamedayId=n`; jornadas fechadas ficam em cache (`gameday-stats.json`) — por execução só se pedem a jornada atual e a anterior.
- **Correspondência Elo**: mesmo país + nome normalizado; entre homónimos ganha o Elo mais alto (ex.: "Paris" → Paris SG). Exceções em `data/team-aliases.json`.
- Disponibilidade (`available/doubtful/out/inactive/unknown`) por heurística dos campos de estado do feed; `meta.statusValues` regista os valores reais para afinar.
## 1 nov 2026 — primeira execução real (GitHub Actions)
- **Feed fantasy:** sem `gamedayId` vem vazio; qualquer `gamedayId` passado devolve o estado **atual** (mesmos totais). A jornada atual vem do `mdId` do feed (pista: API de jogos). **1 pedido ao feed por execução.**
- **Histórico por jornada oficial:** encontrado o ficheiro por jogador que o site usa (`services/feeds/popupstats/popupstats_{tour}_{id}.json`, tour 90 = 2026/27): pontos, minutos, estatísticas e decomposição de pontos de **todas as jornadas**. Pedido só para jogadores cujos totais mudaram (cache em `latest/player-history.json`); verificado: soma das jornadas = total do feed.
- Plano B (se o histórico oficial falhar): snapshots nossos dos totais por jornada e `lastGdPoints`.
- **ClubElo inacessível a partir do GitHub** (502/timeout em todos os endpoints) → força das equipas pelo **coeficiente UEFA de clubes** (`comp.uefa.com/v2/coefficients`, mesmo ID de equipa). O ClubElo continua a ser tentado (20 s, sem repetições) e é usado se voltar.
- Códigos reais de estado: `pStatus` I (lesionado), S (castigado), D (dúvida), NIS (fora da convocatória).
- API-Football e Google News ficam para a fase seguinte (a API-Football grátis pode não cobrir a época atual — a sonda testa-a se existir a chave `API_FOOTBALL_KEY`).
