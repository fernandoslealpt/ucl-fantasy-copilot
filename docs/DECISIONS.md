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

## 1 nov 2026 — Fase 4 (recomendações), primeira entrega
- Fernando pediu as sugestões de transferências antes de fechar formalmente a Fase 3 (teste telemóvel → PC ainda por fazer). Avancei porque o fecho da J4 é a 3 nov às 17:45.
- **Novo separador Conselhos**: transferências (recomendação + 5 opções com 1, 2 e 3 trocas), simulação por jornada (what-if), botão "Já fiz esta troca" que atualiza a equipa, transferências grátis editáveis, capitão/vice com plano de troca a meio da jornada.
- **Valor da equipa por jornada** = melhor onze (formação válida) + capitão a dobrar + 10% do banco. Horizonte de 3 jornadas com pesos 1 / 0,85 / 0,7.
- **Pesquisa**: todas as trocas de 1 jogador (30 melhores por posição + 12 de melhor valor por €M); pares de trocas sobre 16 + 6 candidatos; 3 trocas por feixe a partir das 40 melhores de 2. ~0,5 s no PC.
- **Preço de venda = preço atual** (confirmado em uefa.com: quem tem o jogador antes da subida vende-o ao preço novo).
- **Regra do −4 (perfil conservador)**: troca paga só se ganhar > 6 pontos esperados; o ganho das jornadas seguintes conta metade nas trocas pagas (as grátis da próxima jornada podiam fazê-las). Gastar a última grátis (que passaria para a jornada seguinte) exige ≥ 1 ponto. Abaixo de 0,5 pontos: não mexer.
- **Capitão**: xP × (0,75 + 0,25 × P(titular)). Se o melhor joga mais tarde e há outro quase tão bom (≥ 85%) que joga antes, o capitão é o que joga antes e o plano diz quando passar a braçadeira (se fizer menos pontos do que o xP do outro, arredondado para cima).
- **Razões**: até 3 por troca, com números (titularidade, dificuldade dos jogos, golos+assistências/90, baliza a zero, forma, xP na jornada, preço), ordenadas pelo peso.
- Transferências grátis: guardadas na equipa (`freeTransfers`, `ftGameday`), lidas da captura do ecrã de Transferências ("2 grátis"); por defeito 2; passa no máximo 1 para a jornada seguinte.
- Falta na Fase 4: substituições entre dias (precisa de pontos ao vivo), alertas novos além dos atuais, chips (Wildcard/Limitless).
- **Modelo 1.1.0 (caso Raphinha):** o Fernando estranhou a sugestão Raphinha → Brunstad Fet. Causa: o Raphinha falhou a J2 lesionado (confirmado na imprensa: lesão na coxa ao serviço do Brasil) e o modelo contava essa ausência como rotação → 73% de titular. Agora uma ausência isolada (0 minutos entre jogos como titular) não conta para a titularidade; rotação a sério (deixar de jogar e não voltar a ser titular) continua a contar.
- **"Não quero vender X"**: o Fernando pode marcar jogadores a manter; ficam guardados na equipa (`keep`) e o motor nunca os sugere para sair.

## 2 nov 2026 — Titularidade com onzes prováveis e notícias (modelo 1.2.0)
- Pedido do Fernando: a probabilidade de ser titular não pode vir só do histórico; tem de usar notícias e fóruns.
- Sonda feita a partir do GitHub (`probe-lineups.yml`): **RotoWire** (onzes prováveis UCL, 18 jogos, com lesões/dúvidas) responde 200 e tem estrutura estável → **fonte escolhida**. Sofascore e Reddit JSON bloqueados (403); FotMob mudou a API; Fantasy Football Pundit sem página UCL; Sportsgambler sem onzes da UCL.
- **Fóruns: não usados.** O RSS do Reddit funciona, mas sem IA ler texto livre de fóruns dá muito ruído; os onzes prováveis já resumem notícias e conferências de imprensa em formato estruturado.
- Combinação (só para a próxima jornada): onze provável pesa 70% (titular 0,85; fora do onze 0,12) e o histórico 30%; onze confirmado manda (0,99 / 0); lesionado/castigado na RotoWire → 0; dúvida × 0,6 (× 0,85 se estiver no onze); notícia de lesão/dúvida nas últimas 72 h (Google News) × 0,7 / × 0,85 só quando não há onze nem estado. Se a UEFA diz que está fora, só um onze confirmado o põe a jogar.
- 1 pedido à RotoWire por execução (a cada 2 h; de hora a hora nos dias de jogo). Se falhar, usa o ficheiro anterior até 24 h. Publicado em `latest/lineups.json` com os nomes não reconhecidos.
- App: alerta quando um titular da equipa não está no onze provável; ficha do jogador mostra "J4: no onze provável"; razões das trocas indicam o onze provável.
- **Feed da UEFA com cópia antiga (CDN):** na noite de 1→2 nov o feed devolveu às vezes a J1 em vez da J4 e o pipeline publicou-a (os dados alternaram J1/J4). Agora rejeita um feed com jornada abaixo da publicada (ou da indicada pela API de jogos − 1), pede de novo sem cache e, se continuar antigo, falha e mantém os dados anteriores.
- Regra final: se pedir a jornada indicada pela API de jogos devolve jogadores de uma jornada anterior, é cópia antiga → falha e mantém os dados anteriores (o caso legítimo, próxima jornada ainda não aberta, devolve o feed vazio). Os dados da J4 foram repostos à mão no branch `data` a partir da última execução boa.
- **Critério das transferências revisto:** o ganho das jornadas seguintes conta metade em todas as trocas (podem fazer-se na próxima jornada com as grátis dessa jornada) e nunca se recomenda uma troca que perde pontos já na jornada atual. Com os onzes prováveis, a recomendação para a J4 passou a ser Dimarco → Carlos Augusto e Abde → N. Paz (+4,2 na J4; o Raphinha fica).
