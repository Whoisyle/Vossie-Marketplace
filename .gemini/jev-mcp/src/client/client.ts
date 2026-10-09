import { config, logDiagnostic, redactSecrets } from '../config.js';
import {
  JevAuthError,
  JevBadRequestError,
  JevError,
  JevForbiddenError,
  JevMissingKeyError,
  JevNetworkError,
  JevNotFoundError,
  JevRateLimitError,
  JevSchemaError,
  JevServerError,
  JevTimeoutError,
  JevUnprocessableEntityError,
} from './errors.js';
import type { JevModelInfo, JevSystemOneRequest, JevSystemOneResponse } from './types.js';

export interface JevClientOptions {
  apiKey?: string | null;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  maxRetries?: number;
}

export class JevClient {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;

  constructor(options: JevClientOptions = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : config.apiKey;
    this.baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? config.defaultTimeoutMs;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.maxRetries = options.maxRetries ?? 2;
  }

  public isConfigured(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.trim().length > 0;
  }

  /**
   * Evaluates questions against unstructured state using TypeSafe AI's System One API.
   */
  public async evaluate(
    request: JevSystemOneRequest,
    options: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<JevSystemOneResponse> {
    if (!this.isConfigured()) {
      throw new JevMissingKeyError();
    }

    const endpoint = `${this.baseUrl}/v1/systemone`;
    const timeout = options.timeoutMs ?? this.timeoutMs;

    let attempt = 0;
    while (true) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Link caller's external signal if provided
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        logDiagnostic('DEBUG', `Calling Jev API at ${endpoint} (attempt ${attempt})`, {
          model: request.model,
          questionsCount: Object.keys(request.questions).length,
        });

        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'vossie-gemini-mcp/1.0',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          let errorBodyText = '';
          try {
            errorBodyText = await response.text();
          } catch {
            // ignore body reading error
          }

          const parsedMessage = this.extractErrorMessage(errorBodyText, status);

          if (status === 401) {
            throw new JevAuthError(parsedMessage, 401);
          } else if (status === 403) {
            throw new JevForbiddenError(parsedMessage, 403);
          } else if (status === 404) {
            throw new JevNotFoundError(parsedMessage, 404);
          } else if (status === 400) {
            throw new JevBadRequestError(parsedMessage, 400);
          } else if (status === 422) {
            throw new JevUnprocessableEntityError(parsedMessage, 422);
          } else if (status === 429) {
            const retryHeader = response.headers.get('retry-after');
            const retryAfterMs = retryHeader ? parseInt(retryHeader, 10) * 1000 : 500;
            const err = new JevRateLimitError(parsedMessage, retryAfterMs);
            if (attempt <= this.maxRetries) {
              logDiagnostic('WARN', `Rate limited by Jev (429). Retrying after ${retryAfterMs}ms...`);
              await this.sleep(retryAfterMs);
              continue;
            }
            throw err;
          } else if (status >= 500) {
            const err = new JevServerError(`Jev server error (HTTP ${status}): ${parsedMessage}`, status);
            if (attempt <= this.maxRetries) {
              const backoff = Math.pow(2, attempt) * 200;
              logDiagnostic('WARN', `Jev server error (${status}). Retrying after ${backoff}ms...`);
              await this.sleep(backoff);
              continue;
            }
            throw err;
          } else {
            throw new JevError(`Unexpected HTTP ${status}: ${parsedMessage}`, 'HTTP_ERROR', status, false);
          }
        }

        let data: unknown;
        try {
          data = await response.json();
        } catch (jsonErr: unknown) {
          throw new JevSchemaError(`Failed to parse Jev response JSON: ${(jsonErr as Error).message}`);
        }

        if (!data || typeof data !== 'object') {
          throw new JevSchemaError('Jev response body was not a valid JSON object.');
        }

        return data as JevSystemOneResponse;
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (err instanceof JevError) {
          throw err;
        }

        const isAbort = (err as Error)?.name === 'AbortError' || controller.signal.aborted;
        if (isAbort) {
          const timeoutErr = new JevTimeoutError(`Jev request timed out after ${timeout}ms.`);
          if (attempt <= this.maxRetries) {
            logDiagnostic('WARN', `Request timed out. Retrying attempt ${attempt + 1}...`);
            await this.sleep(300);
            continue;
          }
          throw timeoutErr;
        }

        const networkErr = new JevNetworkError(
          `Network or DNS failure connecting to Jev at ${this.baseUrl}: ${(err as Error)?.message || 'Unknown network error'}`
        );
        if (attempt <= this.maxRetries) {
          logDiagnostic('WARN', `Network failure. Retrying attempt ${attempt + 1}...`);
          await this.sleep(300);
          continue;
        }
        throw networkErr;
      }
    }
  }

  /**
   * Returns available models. Tries the /v1/models endpoint if supported,
   * falling back to officially registered Jev System One model aliases.
   */
  public async getModels(): Promise<JevModelInfo[]> {
    const defaultModels: JevModelInfo[] = [
      {
        id: 'jev-latest',
        name: 'Jev Latest (System One)',
        description: 'Primary high-speed decision intelligence model for routing, approval gating, and validation.',
        capabilities: ['choice', 'noul', 'score'],
        defaultFor: ['routing', 'approval', 'validation', 'scoring'],
      },
      {
        id: 'jev-router',
        name: 'Jev Router Specialist',
        description: 'Optimized low-latency specialist routing model for agent selection.',
        capabilities: ['choice'],
        defaultFor: ['agent-routing'],
      },
      {
        id: 'jev-1.13',
        name: 'Jev 1.13 Stable',
        description: 'Pin-point deterministic System One evaluation model with strict probability distributions.',
        capabilities: ['choice', 'noul', 'score'],
        defaultFor: ['high-stakes-approval'],
      },
    ];

    if (!this.isConfigured()) {
      return defaultModels;
    }

    try {
      const endpoint = `${this.baseUrl}/v1/models`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await this.fetchFn(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
        if (data && Array.isArray((data as { models?: JevModelInfo[] }).models)) {
          return (data as { models: JevModelInfo[] }).models;
        }
        if (data && Array.isArray((data as { data?: JevModelInfo[] }).data)) {
          return (data as { data: JevModelInfo[] }).data;
        }
      }
    } catch {
      // Endpoint may not be implemented on server; fallback gracefully to standard models
    }

    return defaultModels;
  }

  private extractErrorMessage(bodyText: string, status: number): string {
    if (!bodyText) return `Status ${status}`;
    try {
      const json = JSON.parse(bodyText);
      if (typeof json.error === 'string') return json.error;
      if (typeof json.message === 'string') return json.message;
      if (json.error && typeof json.error.message === 'string') return json.error.message;
    } catch {
      // not json
    }
    return bodyText.slice(0, 300);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
