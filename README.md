# UCL Fantasy Copilot

App pessoal para a **UEFA Champions League Fantasy** (equipa *SL Piornaofica*): recomendação → porquê → tabela de apoio.

## Estado

| Fase | Estado |
|---|---|
| 0 · Validação das fontes | ✅ sonda automática em cada execução manual |
| 1 · Pipeline de dados | ✅ aprovada |
| 2 · Modelo xP | ✅ aprovada |
| 3 · App base + equipa | 🟡 app publicada — à espera do teste no telemóvel e no PC |
| 4 · Recomendações | ⏳ |
| 5 · Polimento | ⏳ |

## A app

**https://fernandoslealpt.github.io/ucl-fantasy-copilot/**

- **Instalar no iPhone:** abrir no Safari → Partilhar → *Adicionar ao ecrã principal*. **Android:** Chrome → menu → *Instalar app*.
- Ecrãs: **Equipa** (o teu onze com mais pontos esperados, banco e alertas), **Jogadores** (todos, com filtros), **Calendário** (dificuldade 1–5 das próximas jornadas) e **Notícias**.
- Toca num jogador para ver a ficha: próximos jogos, de onde vêm os pontos esperados e pontos por jornada.
- **Atualizar a equipa com uma captura de ecrã:** na app da UEFA abre **Transferências** (mostra os 15 e o dinheiro restante) e tira uma captura. Na Copilot: Equipa → Atualizar com captura → escolhe a imagem → confirma → Guardar equipa. A leitura é feita no telemóvel.
- **Sincronizar telemóvel ↔ PC:** Definições (roda dentada) → seguir os 5 passos para criar a chave do GitHub, uma vez, no dispositivo onde editas a equipa. Os outros dispositivos leem a equipa sozinhos.

## Como funciona a atualização de dados

- O **GitHub Actions** corre o pipeline a cada 2 horas (e de hora a hora nas noites de Champions).
- Os dados ficam no branch [`data`](../../tree/data), pasta `latest/`:
  - `players.json` — todos os jogadores: preço, % seleção, estado, estatísticas, pontos por jornada, próximo jogo
  - `teams.json` — equipas: Elo, resultados (V-E-D, golos), próximo jogo
  - `fixtures.json` — calendário completo com horas (UTC) e resultados
  - `meta.json` — frescura de cada fonte, jornada atual, fecho da equipa, avisos
  - `summary.md` — resumo legível da última atualização
- Se uma fonte falhar, ficam os últimos dados válidos e o `meta.json` mostra o aviso.

## O que o Fernando pode fazer

- **Ver a última atualização:** separador **Actions** → *Atualizar dados* → última execução (resumo em português).
- **Forçar uma atualização:** Actions → *Atualizar dados* → **Run workflow**.
- **Se uma equipa aparecer "Sem Elo"** nos avisos: diz ao Claude qual é, e ele acrescenta em `data/team-aliases.json`.

Documentação: [`docs/SPEC.md`](docs/SPEC.md) · [`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md)
