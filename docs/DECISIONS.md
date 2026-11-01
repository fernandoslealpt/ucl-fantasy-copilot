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

## 1 nov 2026 — Fase 2 (modelo xP v1)
- Fase 1 aprovada pelo Fernando ("avança com o que quiseres").
- **Força das equipas própria** (regressão de Poisson com resultados UCL 2025/26 + 2026/27 e coeficiente UEFA como prior) em vez do Elo. Dificuldade 1–5 por quintis.
- **Época anterior** em cache permanente no branch `data` (`cache/matches-2026.json`, `cache/player-prev-80.json`).
- Defesas do GR lidas do campo `sS` do histórico por jogador (o campo `saves` vem a 0); caches com versão para refazer leituras quando o parser muda.
- O modelo corre a seguir aos dados; se falhar, os dados publicam-se na mesma (aviso no `meta.json`).
- Detalhes em `docs/MODEL.md`.

## 1 nov 2026 — Fase 3 (app)
- Fase 2 aprovada pelo Fernando ("avança").
- App em `app/` (Vite + React + PWA), publicada no GitHub Pages pelo workflow `deploy-app.yml`. Lê os dados diretamente de `raw.githubusercontent.com/…/data/latest/` (sem republicar a app a cada atualização).
- Tabela ordenável própria em vez de TanStack Table (menos dependências; chega para 1200 linhas com limite de linhas mostradas).
- Equipa: guardada no dispositivo e sincronizada em `data/user/team.json` (leitura sem chave; escrita com token fine-grained só neste repo). O workflow de dados ignora `data/user/`.
- Onze mostrado = onze com mais xP com formação válida (antecipa a Fase 4; as recomendações de transferências/capitão continuam na Fase 4).
- Notícias: Google News RSS por equipa, no máximo a cada 3 h; badge só para notícias dos jogadores da equipa.
- Identidade visual: marcador de estádio (contagem decrescente para o fecho), relvado, cores de cartões (amarelo = dúvida, vermelho = fora). Sem marcas UEFA.

## 1 nov 2026 — Importar a equipa por captura de ecrã
- Pedido do Fernando: atualizar a equipa a partir de uma captura de ecrã da app da UEFA.
- **OCR no próprio telemóvel com Tesseract.js** (grátis, sem LLM, a imagem não sai do dispositivo). Motor e modelo de inglês servidos pela app (`app/public/ocr`, copiados de `node_modules` no build; fora da cache offline para não pesar a instalação). ~5 s por captura.
- Pré-processamento próprio: isola o texto branco das etiquetas azuis dos jogadores (camisolas e relvado desaparecem) + variantes em cinza normal/invertido para outros formatos.
- Correspondência de nomes tolerante (acentos, 1–2 erros, nomes cortados com "…") e com as regras da equipa (2 GR, 5 DEF, 5 MED, 3 AV, máx. por clube). Em empate (ex.: dois "Gabriel"), prefere quem já estava na equipa e os mais escolhidos.
- O resultado entra no editor da equipa para confirmar antes de guardar; nada é gravado sozinho. O banco (€) não aparece na captura de campo: mantém-se o valor anterior.
- Teste com a captura real do Fernando: 15/15 jogadores certos. A captura não fica no repositório (é público).
- `app/dist` deixou de estar no repositório (o build é feito pelo workflow).
- **Correção (bug do Mbappé):** o OCR lê a imagem 3 vezes e o mesmo nome aparecia 3 vezes; com uma vaga livre, a segunda leitura de "K. Mbappé" ia para o E. Mbappé (Lille, castigado). Agora cada nome conta uma vez (máximo por passagem) e a inicial lida tem de bater certo com a do jogador.
- **Correção (bug do Neres e do banco):** no ecrã de Transferências o OCR perdeu as reticências de "Abde Ezzalz…" e leu "NERS" no cabeçalho; o lugar vago foi para o D. Neres. Agora: nomes cortados reconhecem-se mesmo sem reticências (2 palavras, 8+ letras), nomes até 5 letras têm de ser exatos, palavras soltas só contam se começarem por maiúscula. O banco lê o primeiro valor em € depois de "Restante" ("2 grátis" eram transferências). Teste de stress: tirando cada um dos 15 da captura, nenhum intruso entra.
- Ecrã recomendado para importar: Transferências (tem os 15 e o dinheiro restante).
- Valor da equipa + banco não é fixo em 100 M: os preços mudam (captura de 1 nov: 99,8 + 1,3 = 101,1 M, igual na app da UEFA).
