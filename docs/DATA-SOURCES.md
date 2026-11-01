# Fontes de dados

Resultado automático da sonda (Fase 0): branch `data` → `probe/report.md` (atualizado em cada execução manual ou push).

| Fonte | Endpoint | Para quê | Estado |
|---|---|---|---|
| Feed UEFA Fantasy | `gaming.uefa.com/en/uclfantasy/services/api/Feed/players?gamedayId={n}&language=en` | Jogadores, posições, preços, % seleção, estado, estatísticas, pontos | Em uso |
| Histórico UEFA Fantasy por jogador | `gaming.uefa.com/en/uclfantasy/services/feeds/popupstats/popupstats_{tour}_{id}.json` (tour 90 = 2026/27) | Pontos, minutos, estatísticas e decomposição de pontos por jornada | Em uso (só jogadores que mudaram) |
| API de jogos UEFA | `match.uefa.com/v5/matches?competitionId=1&seasonYear={AAAA}&fromDate=…&toDate=…&limit=50&offset={k}` | Calendário, horas UTC, resultados, país e logótipo das equipas | Em uso |
| Coeficientes UEFA | `comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_CLUB&seasonYear={AAAA}` | Força das equipas (5 épocas) | Em uso |
| ClubElo | `api.clubelo.com/{AAAA-MM-DD}` (CSV) | Força das equipas (Elo) | ❌ inacessível a partir do GitHub (1 nov 2026); tentado em cada execução |
| API-Football (grátis) | `v3.football.api-sports.io` | Lesões, onzes, jogos noutras competições | A validar (precisa de chave) |
| Google News RSS | `news.google.com/rss/search?q=…` | Notícias | Fase seguinte |

## Feed UEFA Fantasy — campos usados
Estrutura: `data.value.playerList[]` (~1170 jogadores). **Sem `gamedayId` vem vazio**; com qualquer `gamedayId` ≤ atual devolve o estado **atual** (não há histórico por jornada no feed). Jornada atual = `mdId`.

| Campo | Significado | Notas |
|---|---|---|
| `id`, `pDName`, `pFName` | ID, nome curto, nome completo | |
| `tId`, `tName`, `cCode` | ID UEFA da equipa, nome, código | `tId` = ID da API de jogos |
| `skill` | Posição: 1 GR · 2 DEF · 3 MED · 4 AV | |
| `value` | Preço (€M) | |
| `selPer`, `selInPer`, `selOutPer` | % seleção, % entradas/saídas | |
| `totPts`, `curGDPts`, `lastGdPoints`, `avgPlayerPts` | Pontos total / da jornada / jornada anterior / média | |
| `minsPlyd` | Minutos acumulados | |
| `gS`, `assist`, `cS`, `gC`, `yC`, `rC`, `oG` | Golos, assist., clean sheets, golos sofridos, amarelos, vermelhos, autogolos | |
| `saves`, `bR`, `gOB`, `mOM` | Defesas, recuperações, golos fora da área, Jogador do Jogo | `bR` = recuperações (inferido) |
| `pS`, `pC`, `pE`, `pM` | Penáltis defendidos / cometidos / ganhos / falhados | Significado inferido — confirmar |
| `isActive`, `pStatus`, `qStatus`, `trained` | Estado / disponibilidade | Valores reais em `meta.statusValues` |
| `currentMatchesList`, `upcomingMatchesList` | Jogo da jornada: `mdId`, `vsTID`, `tLoc` (H/A), `matchDate` | Hora CET/CEST |

## Limites e cortesia
- 1 pedido ao feed fantasy por execução; histórico por jogador só para quem mudou (≈600 na 1.ª vez, depois só após jogos), 6 em paralelo; ~3 à API de jogos, 1 aos coeficientes, 1 ao ClubElo.
- User-Agent identificado; sem conteúdo pago; sem login.
