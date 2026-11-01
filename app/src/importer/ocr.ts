/**
 * OCR no próprio dispositivo (Tesseract.js, gratuito). A imagem nunca sai do telemóvel.
 * Os ficheiros do motor e do modelo de inglês são servidos pela própria app (pasta /ocr/).
 */
export type OcrProgress = (fraction: number, stage: string) => void;

const BASE = `${import.meta.env.BASE_URL}ocr/`;

/** Desenha a imagem num canvas à escala pedida. */
function draw(bmp: ImageBitmap, scale: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return { c, ctx, img: ctx.getImageData(0, 0, c.width, c.height) };
}

/** Tons de cinza com mais contraste; `invert` para texto claro sobre fundo escuro. */
function gray(bmp: ImageBitmap, scale: number, invert: boolean) {
  const { c, ctx, img } = draw(bmp, scale);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    g = g < 128 ? Math.max(0, g * 0.8 - 10) : Math.min(255, g * 1.15 + 10);
    if (invert) g = 255 - g;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Isola as etiquetas dos jogadores (texto branco em caixas azuis, como na app da UEFA):
 * fica só o texto claro rodeado de azul, a preto sobre branco. Camisolas, relvado e emblemas desaparecem.
 */
function labels(bmp: ImageBitmap, scale: number) {
  const { c, ctx, img } = draw(bmp, scale);
  const { width: w, height: h } = c;
  const d = img.data;
  // imagem integral da máscara "azul"
  const sum = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
      if (b > 140 && b > r + 70 && b > g + 50) row++;
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1]! + row;
    }
  }
  const rad = Math.max(6, Math.round(w / 90));
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - rad), y1 = Math.min(h, y + rad + 1);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const light = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
      let v = 255;
      if (light > 110) {
        const x0 = Math.max(0, x - rad), x1 = Math.min(w, x + rad + 1);
        const blue = sum[y1 * (w + 1) + x1]! - sum[y0 * (w + 1) + x1]! - sum[y1 * (w + 1) + x0]! + sum[y0 * (w + 1) + x0]!;
        if (blue > 0.35 * (x1 - x0) * (y1 - y0)) v = 255 - Math.min(255, Math.max(0, (light - 110) * 2.2));
      }
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Variantes da imagem: etiquetas isoladas (a melhor para a app da UEFA) + cinza normal e invertido (outros formatos). */
async function variants(file: Blob): Promise<HTMLCanvasElement[]> {
  const bmp = await createImageBitmap(file);
  const scale = bmp.width < 1200 ? 2 : bmp.width > 2400 ? 0.75 : 1;
  return [labels(bmp, scale * 1.5), gray(bmp, scale, false), gray(bmp, scale, true)];
}

/** Lê a captura; devolve as linhas de cada passagem (uma por variante da imagem). */
export async function readScreenshot(file: Blob, onProgress?: OcrProgress): Promise<string[][]> {
  onProgress?.(0.02, 'prepare');
  const [{ createWorker, PSM, OEM }, imgs] = await Promise.all([import('tesseract.js'), variants(file)]);
  let pass = 0;
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${BASE}worker.min.js`,
    corePath: BASE,
    langPath: BASE,
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(0.1 + 0.9 * ((pass + m.progress) / imgs.length), 'read');
      else onProgress?.(0.05, 'load');
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const passes: string[][] = [];
    for (const img of imgs) {
      const { data } = await worker.recognize(img);
      passes.push(data.text.split('\n').map((l) => l.trim()).filter(Boolean));
      pass++;
    }
    onProgress?.(1, 'done');
    return passes;
  } finally {
    await worker.terminate();
  }
}
