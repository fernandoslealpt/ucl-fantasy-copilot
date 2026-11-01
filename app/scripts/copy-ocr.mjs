// Copia o motor OCR (Tesseract.js) e o modelo de inglês para public/ocr, para a app os servir ela própria.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'ocr');
mkdirSync(out, { recursive: true });
const nm = (...p) => join(root, 'node_modules', ...p);
const files = [
  [nm('tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
  [nm('tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'), 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  [nm('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [nm('tesseract.js-core', 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [nm('@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];
for (const [src, name] of files) copyFileSync(src, join(out, name));
console.log(`OCR: ${files.length} ficheiros em public/ocr`);
