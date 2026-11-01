# UCL Fantasy Copilot

App pessoal para a **UEFA Champions League Fantasy** (equipa *SL Piornaofica*): recomendação → porquê → tabela de apoio.

## Estado

| Fase | Estado |
|---|---|
| 0 · Validação das fontes | ✅ sonda automática em cada execução manual |
| 1 · Pipeline de dados | ✅ aprovada |
| 2 · Modelo xP | 🟡 v1 a correr — à espera da revisão do top 20 |
| 3 · App base + equipa | ⏳ |
| 4 · Recomendações | ⏳ |
| 5 · Polimento | ⏳ |

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
