import dotenv from 'dotenv';
import path from 'path';

// Load .env if present in current directory, parent .gemini, or project root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export interface JevConfig {
  apiKey: string | null;
  baseUrl: string;
  defaultModel: string;
  defaultTimeoutMs: number;
  approvalThreshold: number;
  validationThreshold: number;
  routingConfidenceThreshold: number;
  maxValidationRetries: number;
}

export const config: JevConfig = {
  apiKey: process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY || null,
  baseUrl: process.env.JEV_BASE_URL || 'https://api.typesafe.ai',
  defaultModel: process.env.JEV_MODEL || 'jev-latest',
  defaultTimeoutMs: parseInt(process.env.JEV_TIMEOUT_MS || '10000', 10),
  approvalThreshold: parseFloat(process.env.JEV_APPROVAL_THRESHOLD || '0.80'),
  validationThreshold: parseFloat(process.env.JEV_VALIDATION_THRESHOLD || '0.85'),
  routingConfidenceThreshold: parseFloat(process.env.JEV_ROUTING_THRESHOLD || '0.65'),
  maxValidationRetries: parseInt(process.env.JEV_MAX_RETRIES || '2', 10),
};

/**
 * Diagnostics logger that strictly writes to stderr to preserve MCP stdio integrity.
 */
export function logDiagnostic(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, meta?: unknown): void {
  const sanitizedMeta = meta ? redactSecrets(meta) : '';
  const timestamp = new Date().toISOString();
  const serialized = sanitizedMeta ? ` ${typeof sanitizedMeta === 'string' ? sanitizedMeta : JSON.stringify(sanitizedMeta)}` : '';
  process.stderr.write(`[${timestamp}] [JEV-MCP] [${level}] ${message}${serialized}\n`);
}

/**
 * Redacts any occurrences of API keys, bearer tokens, or secret strings from output/logs.
 */
export function redactSecrets(data: unknown): unknown {
  if (!data) return data;
  if (typeof data === 'string') {
    let sanitized = data;
    if (config.apiKey && config.apiKey.length > 4) {
      sanitized = sanitized.replaceAll(config.apiKey, '***REDACTED_JEV_API_KEY***');
    }
    sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{10,}/gi, '$1***REDACTED_TOKEN***');
    sanitized = sanitized.replace(/(apiKey["']?\s*:\s*["'])[A-Za-z0-9_\-\.]{10,}(["'])/gi, '$1***REDACTED***$2');
    return sanitized;
  }
  if (Array.isArray(data)) {
    return data.map(item => redactSecrets(item));
  }
  if (typeof data === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (/key|secret|token|password|auth/i.test(key) && typeof value === 'string') {
        copy[key] = '***REDACTED***';
      } else {
        copy[key] = redactSecrets(value);
      }
    }
    return copy;
  }
  return data;
}
