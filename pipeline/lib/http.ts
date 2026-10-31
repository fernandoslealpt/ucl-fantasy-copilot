export const USER_AGENT =
  'ucl-fantasy-copilot/0.1 (personal, non-commercial; +https://github.com/fernandoslealpt/ucl-fantasy-copilot)';

export class HttpError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface GetOptions {
  accept?: string;
  headers?: Record<string, string>;
}

/** Cliente HTTP mínimo, com contador de pedidos por fonte (para respeitar limites). */
export interface Http {
  getText(url: string, opts?: GetOptions): Promise<string>;
  readonly requests: number;
}

export interface HttpConfig {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createHttp(config: HttpConfig = {}): Http {
  const timeoutMs = config.timeoutMs ?? 30_000;
  const retries = config.retries ?? 2;
  const backoffMs = config.backoffMs ?? 3_000;
  let requests = 0;

  async function getText(url: string, opts: GetOptions = {}): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(backoffMs * attempt);
      requests++;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: opts.accept ?? 'application/json, text/plain, */*',
            ...opts.headers,
          },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'follow',
        });
        const text = await res.text();
        if (!res.ok) {
          const err = new HttpError(url, res.status, `HTTP ${res.status} em ${url}`);
          if (RETRYABLE.has(res.status)) {
            lastError = err;
            continue;
          }
          throw err;
        }
        return text;
      } catch (e) {
        if (e instanceof HttpError && !RETRYABLE.has(e.status)) throw e;
        lastError = e;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  return {
    getText,
    get requests() {
      return requests;
    },
  };
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    const cause = (e as Error & { cause?: unknown }).cause;
    const causeMsg = cause instanceof Error ? ` (${cause.message})` : '';
    return `${e.message}${causeMsg}`.slice(0, 500);
  }
  return String(e).slice(0, 500);
}
