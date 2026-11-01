/**
 * Sincronização da equipa entre dispositivos a custo zero (docs/SPEC.md §5):
 * o ficheiro data/user/team.json vive no repositório público.
 * - Ler: API do GitHub sem autenticação (qualquer dispositivo).
 * - Gravar: token fine-grained (só Contents: read/write neste repo), guardado no dispositivo.
 */
import type { MyTeam } from './team';

const REPO = 'fernandoslealpt/ucl-fantasy-copilot';
const PATH = 'data/user/team.json';
const API = `https://api.github.com/repos/${REPO}/contents/${PATH}`;
const TOKEN_KEY = 'ucl.githubToken';

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromB64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem armazenamento */
  }
}

async function getFile(token?: string | null): Promise<{ team: MyTeam; sha: string } | null> {
  const res = await fetch(`${API}?ref=main&t=${Date.now()}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const body = (await res.json()) as { content: string; sha: string };
  return { team: JSON.parse(fromB64(body.content)) as MyTeam, sha: body.sha };
}

/** Lê a equipa sincronizada (sem token). */
export async function readRemoteTeam(): Promise<MyTeam | null> {
  return (await getFile(getToken()))?.team ?? null;
}

/** Grava a equipa no repositório (precisa de token). */
export async function writeRemoteTeam(team: MyTeam, token = getToken()): Promise<void> {
  if (!token) throw new Error('sem chave do GitHub');
  const current = await getFile(token);
  const res = await fetch(API, {
    method: 'PUT',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Equipa atualizada (${new Date(team.updatedAt).toISOString().slice(0, 16)})`,
      content: toB64(`${JSON.stringify(team, null, 2)}\n`),
      branch: 'main',
      ...(current ? { sha: current.sha } : {}),
    }),
  });
  if (!res.ok) {
    const msg = res.status === 401 ? 'chave inválida ou expirada' : res.status === 403 || res.status === 404 ? 'a chave não tem permissão de escrita neste repositório' : `GitHub respondeu ${res.status}`;
    throw new Error(msg);
  }
}

/** Confirma que a chave consegue escrever no repositório. */
export async function testToken(token: string): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}` },
  });
  if (res.status === 401) throw new Error('chave inválida ou expirada');
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const repo = (await res.json()) as { permissions?: { push?: boolean } };
  if (repo.permissions && !repo.permissions.push) throw new Error('a chave não tem permissão de escrita (Contents: Read and write)');
}

/** Escolhe a versão mais recente entre a local e a sincronizada. */
export function newest(a: MyTeam | null, b: MyTeam | null): MyTeam | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a;
}
