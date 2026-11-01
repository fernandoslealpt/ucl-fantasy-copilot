import { defineConfig } from 'vitest/config';

// Testes do pipeline (a app tem os seus em app/).
export default defineConfig({ test: { include: ['pipeline/**/*.test.ts'] } });
