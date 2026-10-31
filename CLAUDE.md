# CLAUDE.md — guia para o Claude Code

**Produto:** ver `docs/SPEC.md` (fonte de verdade). Decisões: `docs/DECISIONS.md`. Fontes: `docs/DATA-SOURCES.md`.

## Regras do projeto
- Utilizador único: Fernando (PT-PT, não é programador). Mensagens para ele: curtas, PT-PT, passo a passo.
- **Custo zero.** Sem APIs pagas, sem LLM na app, sem login UEFA.
- Trabalhar por fases; no fim de cada fase parar, resumir e esperar aprovação.
- Registar decisões relevantes em `docs/DECISIONS.md`.

## Pipeline de dados (`pipeline/`)
- `run.ts` — orquestrador: fontes → normalização → controlo de qualidade → `latest/*.json` + `meta.json` + `summary.md`.
- `sources/` — `uefaFantasy` (jogadores/estatísticas), `uefaMatches` (calendário/resultados), `clubElo` (força).
- `normalize/` — modelos em `types.ts`. Jogadores sem correspondência nunca desaparecem.
- Degradação elegante: fonte que falha → mantém ficheiro anterior + erro no `meta.json`.
- Este ambiente (Claude Code na cloud) **não alcança** as fontes; só os runners do GitHub. Testar com `npm test` (dados sintéticos em `pipeline/test/helpers.ts`) e validar no GitHub Actions.

## Comandos
```bash
npm test            # vitest
npm run typecheck   # tsc
npm run pipeline -- --out out   # corre o pipeline (precisa de rede)
npm run probe -- --out out      # sonda de fontes (Fase 0)
```

## Publicação
- Workflow `.github/workflows/update-data.yml` → commit no branch `data` (worktree `data-out/`).
- Ler resultados: `git fetch origin data && git show origin/data:latest/summary.md`.
