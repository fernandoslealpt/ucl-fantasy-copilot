import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function readJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text.endsWith('\n') ? text : `${text}\n`);
}

export function writeJson(path: string, value: unknown): void {
  writeText(path, JSON.stringify(value, null, 2));
}

/**
 * Escreve { ...header, [key]: [ ...itens, um por linha ] }.
 * Compacto e com diffs legíveis no git (uma linha por jogador/equipa/jogo).
 */
export function writeJsonLines(path: string, header: Record<string, unknown>, key: string, items: unknown[]): void {
  const head = Object.entries(header)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n');
  const body = items.map((i) => `    ${JSON.stringify(i)}`).join(',\n');
  const text = `{\n${head}${head ? ',\n' : ''}  ${JSON.stringify(key)}: [\n${body}\n  ]\n}\n`;
  writeText(path, text);
}
