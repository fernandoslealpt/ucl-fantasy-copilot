# UCL Fantasy Copilot — Especificação v1

> Fonte de verdade do produto. Escrita em PT-PT para o Fernando; identificadores técnicos em inglês.
> Última revisão: 31 out 2026. Alterações relevantes ficam registadas em `docs/DECISIONS.md`.

---

## 1. Objetivo

Webapp pessoal que **analisa a equipa do Fernando e todos os jogadores/equipas da Champions** e mostra, em cada ecrã:

1. **Recomendação** clara (o que fazer)
2. **Porquê** — até 3 razões, sempre com números
3. **Tabela de apoio** — os dados que sustentam a decisão

Meta: máximo de pontos em cada jornada e na época; ganhar as ligas privadas; aprender o jogo.

### Utilizador
- Um só utilizador: Fernando (equipa **SL Piornaofica**). Principiante (1.ª/2.ª época).
- Usa **telemóvel e computador por igual** → mobile-first, mas confortável em desktop.
- Perfil de risco por defeito: **conservador** (jogadores fiáveis, minutos garantidos).
- Faz alterações à última hora → a informação mais fresca tem de estar visível no topo.
- Idioma: **PT-PT por defeito**, com opção EN.
- Não é programador: tudo o que ele tiver de fazer tem de ser explicado passo a passo, em linguagem simples.

---

## 2. Restrições inegociáveis

| Restrição | Implicação |
|---|---|
| **Custo zero** (no máximo um custo único mínimo, e só com aprovação explícita) | Só fontes grátis e planos gratuitos. Sem APIs pagas, sem subscrições, sem domínio próprio. |
| **Sem chamadas a APIs de LLM na app** (custam por uso) | Explicações geradas por regras a partir dos dados (secção 8). Perguntas abertas fazem-se no projeto "UCL Fantasy" do claude.ai. |
| **Sem alterações automáticas na conta UEFA** | A app recomenda; o Fernando executa no site/app oficial. |
| **Sem login com a password UEFA do Fernando** por defeito | Só com aprovação explícita dele e depois de avaliado o risco (termos de utilização, segurança). |
| **Sem raspar conteúdo pago** de sites de fantasy | Apenas páginas públicas, com cache, frequência moderada e respeito por `robots.txt`/termos. |
| Segredos nunca no repositório | Chaves em GitHub Secrets. |

---

## 3. Arquitetura (custo €0)

```
            ┌──────────────────────── GitHub Actions (cron, grátis) ────────────────────────┐
 Fontes ──▶ │ fetch → normalize → join (IDs) → model (xP) → datasets JSON → snapshot        │
            └───────────────────────────────────────────────┬───────────────────────────────┘
                                                            ▼
                                          GitHub Pages (site estático + /data/*.json)
                                                            ▼
                                 Browser (telemóvel/PC): motor de recomendações + UI
                                 (equipa do Fernando, transferências, capitão, what-if)
```

**Princípios**
- **Pesado no pipeline, leve no browser.** O pipeline calcula o xP de todos os jogadores; o browser calcula recomendações para a equipa do Fernando (instantâneo, permite what-if).
- **Tudo versionado e reprodutível.** Cada execução grava um snapshot dos dados e do xP (`history/`) — permite avaliar o modelo e, mais tarde, o histórico de decisões.
- **Degradação elegante.** Se uma fonte falhar, a app mostra os últimos dados válidos com aviso de frescura ("Atualizado há 5 h · Lesões: falhou às 14:00").

### Stack recomendada
- **TypeScript em todo o projeto** (uma só linguagem para manter).
- Pipeline: Node 22 + `tsx`, `zod` para validar respostas das fontes.
- App: Vite + React + TypeScript, TanStack Table (tabelas), `vite-plugin-pwa` (instalável no telemóvel), CSS simples ou Tailwind.
- Otimização: enumeração para 1–3 transferências; `highs` (HiGHS em WASM) quando for preciso otimizar o plantel inteiro.
- Testes: Vitest (obrigatório para modelo e motor de recomendações).
- Hosting: GitHub Pages (repo público — aceite pelo Fernando).

### Estrutura sugerida
```
pipeline/        sources/, normalize/, model/, run.ts
app/             src/screens/, src/engine/ (recomendações), src/i18n/
data/            mapeamentos manuais (ex.: team-aliases.json), equipa do utilizador
docs/            SPEC.md, DATA-SOURCES.md, MODEL.md, DECISIONS.md, RULES.md
.github/workflows/
```
Dados gerados: branch `data` (`latest/` + snapshots em `history/`), para não poluir `main`; publicados com o site quando houver app. Claude Code pode ajustar, registando a decisão.

---

## 4. Fontes de dados (todas grátis — a validar na Fase 0)

| Fonte | Para quê | Acesso | Limites / riscos |
|---|---|---|---|
| **Feed UEFA Fantasy** — `https://gaming.uefa.com/en/uclfantasy/services/api/Feed/players?gamedayId={n}&language=en` | Jogadores, posições, preços, pontos, estado, % seleção, estatísticas UCL (incl. recuperações) | Público, sem login | Não documentado; pode mudar. Descobrir também se existe leitura de equipa por ID sem login. |
| **API de jogos UEFA** — `https://match.uefa.com/v5/matches?competitionId=1&seasonYear={AAAA}` | Calendário completo da UCL, horas em UTC, resultados, país/logótipo das equipas | Público, sem login | Não documentada; pode mudar. IDs de equipa iguais aos do feed fantasy. |
| **API-Football** (plano grátis, `api-sports.io`) | Lesões e castigos, calendário em **todas** as competições, onzes oficiais, odds pré-jogo, estatísticas da época por jogador | Chave grátis (secret `API_FOOTBALL_KEY`) | **100 pedidos/dia**. Confirmar que o plano grátis dá a época 2026/27. |
| **ClubElo** — `http://api.clubelo.com` | Força das equipas (Elo) → dificuldade de jornadas futuras sem odds; possível endpoint de jogos futuros com probabilidades | Público, CSV | Confirmar endpoints e cobertura de todas as 36 equipas. |
| **Google News RSS** (`news.google.com/rss/search?q=…`) | Notícias por equipa/jogador (PT, EN, ES, IT, DE, FR) | Público | Não oficial; usar com moderação. Sem LLM: filtrar por nome + palavras-chave. |
| **Páginas públicas de fantasy** (ex.: onzes prováveis em uclfantasy.com) | Consenso de onzes prováveis | Público | **Opcional.** Só se os termos permitirem; nunca conteúdo Pro/pago. |
| **Regras oficiais UEFA** | Pontuação, limites, transferências | Página pública | Confirmar `docs/RULES.md`. |

### Orçamento de pedidos API-Football (≤ 100/dia)
| Bloco | Pedidos | Frequência |
|---|---|---|
| Jogos UCL da época (`fixtures?league=2&season=2026`) | 1 | Diária |
| Lesões UCL (`injuries?league=2&season=2026`) | 1–3 | A cada 2–3 h nas 48 h antes do deadline; diária no resto |
| Próximos/últimos jogos de cada equipa, todas as competições (`fixtures?team=X&next=5` / `last=5`) | 36–72 | Distribuído por vários dias (rotação de equipas) |
| Odds da próxima jornada UCL | 2–5 | Diária na semana de jogos |
| Estatísticas da época por equipa (`players?team=X&season=2026`) | ~1–2 por equipa | Rotação semanal (ex.: 12 equipas/dia) |
| Onzes oficiais (`fixtures/lineups?fixture=X`) | ~1–2 por jogo | Só em dia de jogo, ~60 e ~40 min antes de cada pontapé de saída |

O pipeline tem de **contar pedidos**, guardar cache e nunca ultrapassar o limite (parar com aviso no `meta.json`).

### Ligação entre fontes
Mapeamento de IDs (UEFA ↔ API-Football ↔ ClubElo) para as 36 equipas e para os jogadores (nome normalizado + equipa + posição; correspondência difusa com revisão manual em `data/`). Jogadores sem correspondência aparecem na app com aviso, nunca desaparecem.

---

## 5. Equipa do Fernando

Ordem de preferência (a decidir com base na Fase 0):
1. **Leitura automática por ID** se existir endpoint público sem login.
2. **Por defeito:** o Fernando escolhe os 15 jogadores uma vez na app (pesquisa por nome, validação das regras) e depois só regista as trocas. Inclui: banco (dinheiro disponível), transferências grátis, chips usados, capitão/vice, ordem do banco.
   - **Sincronização entre telemóvel e PC a custo zero:** a app grava `data/user/team.json` no repo através da API do GitHub, com um *fine-grained token* (só `contents: write` neste repo) introduzido uma vez por dispositivo e guardado localmente. Explicar o processo ao Fernando passo a passo.
3. Login com credenciais UEFA: **só** com aprovação explícita (ver secção 2).

A equipa é a base de todos os ecrãs. Sem equipa, a app mostra o ecrã "Jogadores" e um convite claro para a inserir.

---

## 6. Modelo de pontos esperados (xP)

Documentar em detalhe em `docs/MODEL.md`. Princípio "Moneyball": **valor = pontos esperados por €M, com minutos garantidos** — um grande jogador de futebol nem sempre é uma boa escolha de fantasy.

Para cada jogador `p` e cada jogo `m` da UCL, nas próximas **1, 3 e 5 jornadas**:

```
xP(p,m) = P(joga) × 1                                  # aparição
        + P(60+) × 1                                   # 60 minutos
        + E[golos]   × pontos_golo(posição)            # GR/DEF 6, MED 5, AV 4 (+1 fora da área: ignorar na v1)
        + E[assist.] × 3
        + P(clean sheet) × P(60+) × pontos_CS(posição) # GR/DEF 4, MED 1
        + E[recuperações]/3                            # cada 3 = 1 ponto
        + (GR) E[defesas]/3 + P(penálti defendido)×5
        − (GR/DEF) E[floor(golos sofridos/2)]
        − E[amarelos]×1 − E[vermelhos]×3
        + P(Jogador do Jogo)×3                          # aproximação simples na v1
```

### Componentes
| Componente | Como calcular (v1) |
|---|---|
| **Golos esperados da equipa** (λ) | Odds 1X2 + mais/menos golos da próxima jornada → Poisson. Sem odds: Elo (ClubElo) + casa/fora. |
| **P(clean sheet)** | `exp(−λ_adversário)` (Poisson). |
| **Quota do jogador nos golos/assist.** | Golos/assist. por 90' (UCL + campeonato), com *shrinkage* para a média da posição (amostras pequenas). |
| **P(joga), P(60+), minutos** | Titularidades nos últimos jogos (todas as competições) + lesões/castigos + **risco de rotação** + ajuste manual do Fernando. |
| **Risco de rotação** (índice 0–100) | Dias de descanso, jogo exigente no campeonato logo antes/depois (Elo do adversário), quota de titularidades, profundidade do plantel. v2: histórico de rotação do treinador. |
| **Recuperações, defesas, cartões** | Médias por 90' (UEFA feed / API-Football) com *shrinkage*. |
| **Dificuldade do jogo** | Derivada de λ e P(CS); mostrar também como escala 1–5 com cores. |

**Confiança** de cada previsão (alta/média/baixa): depende da incerteza sobre minutos, do tamanho da amostra e da frescura dos dados.

**Avaliação do modelo:** guardar snapshots desde o primeiro dia; a partir da 2.ª jornada com dados, comparar xP vs pontos reais e contra um baseline ingénuo (média de pontos até à data). Mostrar o resultado num ecrã "Como está o modelo".

---

## 7. Motor de recomendações (no browser)

Todas as recomendações respeitam: orçamento (€100M; €105M após fase de liga), 2 GR/5 DEF/5 MED/3 AV, máx. jogadores por clube (3 na fase de liga; sobe nas eliminatórias), formação válida (1 GR, ≥3 DEF, ≥2 MED, ≥1 AV), transferências grátis disponíveis.

| Decisão | Regra |
|---|---|
| **Transferências** | Enumerar 1, 2 e 3 trocas; ordenar por ΔxP no horizonte (por defeito 3 jornadas, com desconto para jornadas mais distantes). Mostrar as 5 melhores. |
| **Vale a pena o -4?** | Só recomendar se ΔxP(horizonte) > 4 + margem de risco (perfil conservador: margem 2). Mostrar sempre o cálculo; o Fernando decide. |
| **Onze e banco** | Maximizar xP da jornada com formação válida; ordem do banco por xP. |
| **Capitão e vice** | Maior xP com baixa incerteza de minutos (perfil conservador penaliza incerteza). |
| **Plano de troca de capitão a meio da jornada** | Preferir capitão que joga no 1.º dia. Regra: depois do 1.º dia, trocar se `pontos reais do capitão < xP do melhor jogador por jogar` (+ margem). Mostrar o plano antes do deadline. |
| **Substituições entre dias** | Sugerir trocar titular que já jogou por suplente que ainda não jogou se `pontos reais do titular < xP do suplente` (+ margem). Avisar que uma alteração manual desliga as substituições automáticas. |
| **Alertas da equipa** | Lesão/castigo/dúvida, risco de rotação alto, jogo difícil, notícia nova sobre jogador da equipa. |

**What-if:** qualquer troca pode ser simulada e comparada lado a lado (xP por jornada, orçamento restante).

---

## 8. Explicações (sem LLM)

Cada recomendação gera **códigos de razão** com valor numérico, ordenados pela contribuição para o ΔxP. Mostram-se os **3 principais**, em PT-PT (ou EN) por *templates*.

Exemplos de códigos: `FIXTURE_EASY`, `FIXTURE_HARD`, `CS_PROB_HIGH`, `START_PROB_HIGH`, `START_PROB_LOW`, `INJURY_OUT`, `INJURY_DOUBT`, `SUSPENDED`, `ROTATION_RISK`, `CONGESTION`, `PENALTY_TAKER`, `RECOVERIES_HIGH`, `FORM_UP`, `FORM_DOWN`, `VALUE_PER_M`, `BUDGET_UNLOCK`.

Formato:
> **Troca o Jogador A pelo Jogador B** · confiança alta
> · +2,1 pontos esperados nas próximas 3 jornadas
> · B foi titular nos últimos 5 jogos; A falhou 2 por lesão
> · Os adversários de B têm 40% de probabilidade de não marcar

Regras: números sempre arredondados e com unidade; nunca razões sem dados; "Ver detalhe" expande a tabela completa do cálculo.

---

## 9. Ecrãs

Estrutura comum: **Recomendação → Porquê → Tabela**. Topo de cada ecrã: frescura dos dados e próximo deadline (contagem decrescente). Todas as colunas têm explicação curta (tooltip) em linguagem simples.

| Ecrã | Recomendação | Tabela de apoio (colunas principais) |
|---|---|---|
| **A minha equipa** | Jogadores em risco e o que fazer | Campo visual com cartões + tabela: xP (1/3/5 jornadas), P(titular), risco de rotação, forma, estado (lesão/castigo/dúvida), próximo adversário + dificuldade, preço |
| **Transferências** | 5 melhores trocas para o orçamento e transferências disponíveis; se compensa o -4 | Sai/entra, ΔxP 1 e 3 jornadas, preço, banco restante, confiança |
| **Capitão** | Capitão, vice e plano de troca a meio da jornada | Ranking: xP, dia do jogo, P(titular), confiança |
| **Jogadores** | Melhores escolhas por posição e por €M | Todos os jogadores, filtros (posição, equipa, preço, estado): xP, xP/€M, minutos, golos/assist. por 90', recuperações por 90', marcador de penáltis, % seleção, forma |
| **Equipas e calendário** | Equipas a apostar e a evitar nas próximas jornadas | Grelha de dificuldade (cores) para as próximas jornadas UCL; dias de descanso; jogo do campeonato antes/depois e sua exigência |
| **Notícias** | O que mudou desde a última visita que afeta a equipa | Notícias por jogador/equipa, com fonte, hora e sinalização (lesão, dúvida, regresso) |
| **Como está o modelo** (simples) | — | xP previsto vs pontos reais por jornada; comparação com baseline |

Requisitos de UI: mobile-first; tabelas ordenáveis e com scroll horizontal no telemóvel; PT-PT/EN alternável; tema claro/escuro; instalável (PWA); acessível (contraste, tamanhos de toque).

---

## 10. Fases e critérios de aceitação

Em **cada fim de fase**: parar, enviar ao Fernando um resumo curto em PT-PT (o que funciona, link, o que ele tem de fazer, decisões pendentes) e **esperar aprovação** antes de avançar.

### Fase 0 — Validação das fontes (antes de qualquer UI)
- Workflow manual (`workflow_dispatch`) que testa, **a partir dos runners do GitHub**: feed UEFA (jogadores + outros feeds úteis), leitura de equipa por ID sem login, API-Football grátis (época 2026/27: jogos, lesões, odds, jogadores, onzes), ClubElo, Google News RSS.
- Resultado: `docs/DATA-SOURCES.md` com endpoints, campos disponíveis, limites, exemplos pequenos (sem dados pessoais) e **go/no-go por fonte**.
- Confirmar regras em `docs/RULES.md` (incl. preço de venda dos jogadores, transferências nas eliminatórias).
- **Aceite quando:** o Fernando aprova o relatório e as substituições para fontes que falharem.

### Fase 1 — Pipeline de dados
- Datasets normalizados: `players.json`, `teams.json`, `fixtures.json` (UCL + todas as competições das 36 equipas), `injuries.json`, `odds.json`, `news.json`, `meta.json` (frescura por fonte, pedidos usados).
- Workflows agendados (diária + janelas de deadline/dia de jogo), contador de pedidos, cache, snapshots.
- **Aceite quando:** 3 dias seguidos sem falhas; `meta.json` mostra frescura correta; limite de 100 pedidos nunca ultrapassado.

### Fase 2 — Modelo xP
- Implementação de `docs/MODEL.md` com testes unitários.
- Validação nas jornadas já jogadas (com os dados disponíveis) e relatório simples.
- **Aceite quando:** xP coerente com o bom senso (top 20 revisto com o Fernando) e melhor do que o baseline ingénuo nas jornadas disponíveis.

### Fase 3 — App base + equipa do Fernando
- Ecrãs **A minha equipa**, **Jogadores**, **Equipas e calendário**, **Notícias** com tabelas.
- Inserção/sincronização da equipa (secção 5).
- PWA, PT-PT/EN, deploy em GitHub Pages.
- **Aceite quando:** o Fernando consegue inserir a equipa no telemóvel e vê-la no PC.

### Fase 4 — Recomendações e explicações
- Transferências (com regra do -4), capitão/vice, onze/banco, plano de troca a meio da jornada, substituições entre dias, alertas, what-if.
- **Aceite quando:** todas as recomendações respeitam as regras (testes) e cada uma mostra 3 razões com números.

### Fase 5 — Polimento
- Ecrã "Como está o modelo", desempenho no telemóvel, textos revistos em PT-PT, ajuda contextual.

---

## 11. Fora da v1 (candidatos à fase 2)
- Rivais das ligas privadas (*effective ownership*, diferenciais).
- Chips (Wildcard, Limitless): timing e plantel ótimo com `highs`.
- Histórico de decisões e avaliação do que resultou (os snapshots já preparam isto).
- Alertas push grátis (ex.: bot de Telegram ou Web Push a partir do GitHub Actions).
- Histórico de rotação por treinador.
- Fase de eliminatórias: regras próprias de transferências e limites por clube.

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Feed UEFA muda ou bloqueia pedidos automáticos | Validação na Fase 0; cache; aviso de frescura; carregamento manual de um ficheiro como último recurso. |
| Plano grátis da API-Football sem época atual ou com limites apertados | Fase 0 decide; alternativas grátis (ex.: football-data.org para calendário). |
| Correspondência errada de jogadores entre fontes | Mapeamento com revisão manual e testes. |
| Termos de utilização (UEFA e sites de fantasy) | Sem login por defeito, sem conteúdo pago, frequência moderada. |
| Atrasos no cron do GitHub (minutos) | Janelas de execução com folga antes de deadlines e pontapés de saída. |
| GitHub desliga workflows agendados em repos públicos sem atividade durante 60 dias | Os commits no branch `data` mantêm atividade; se acontecer, reativar em Actions. |
| Repo público expõe a equipa | Aceite pelo Fernando; nunca guardar dados pessoais além da equipa. |

---

## 13. Regras 2026/27 (resumo — confirmar na Fase 0)

- Orçamento €100M (€105M após a fase de liga). 15 jogadores: 2 GR, 5 DEF, 5 MED, 3 AV.
- Máx. por clube: 3 (fase de liga), 4 (play-off e oitavos), 5 (quartos), 6 (meias), 8 (final).
- 17 jornadas: 8 fase de liga; play-off (J9–10), oitavos (J11–12), quartos (J13–14), meias (J15–16), final (J17). Equipas bloqueiam no primeiro jogo de cada jornada.
- Transferências na fase de liga: 2 grátis/jornada, acumula no máximo 1. Eliminatórias: ilimitadas antes da J9 e da J11; depois 2–5 por jornada, sem acumular. Cada transferência extra: **-4**.
- Chips (1 uso cada): **Wildcard** (permanente) e **Limitless** (1 jornada, sem limite de orçamento). Não usáveis na J1, J9 e J11.
- Capitão x2; pode passar a braçadeira a quem ainda não jogou (irreversível).
- Substituições manuais dia a dia (até 4, com suplentes que ainda não jogaram); desligam as automáticas. Sem alterações manuais na J8 e J17.

| Ação | Pontos |
|---|---|
| Aparição / 60+ minutos | 1 / 1 |
| Golo GR / DEF / MED / AV | 6 / 6 / 5 / 4 |
| Golo de fora da área | +1 |
| Assistência | 3 |
| Clean sheet GR / DEF / MED (60' mín.) | 4 / 4 / 1 |
| Cada 3 recuperações de bola | 1 |
| Jogador do Jogo (UEFA) | 3 |
| Penálti ganho / cometido / falhado | 2 / -1 / -2 |
| Amarelo / vermelho | -1 / -3 |
| Autogolo | -2 |
| GR: penálti defendido / cada 3 defesas | 5 / 1 |
| GR e DEF: cada 2 golos sofridos | -1 |

Fonte: guia Fantasy Football Scout 2026/27 (31 ago 2026). Confirmar com a página oficial da UEFA.
