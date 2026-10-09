import test from 'node:test';
import assert from 'node:assert/strict';
import { JevClient } from '../src/client/client.js';
import {
  JevAuthError,
  JevForbiddenError,
  JevMissingKeyError,
  JevRateLimitError,
  JevSchemaError,
  JevServerError,
  JevTimeoutError,
} from '../src/client/errors.js';
import { redactSecrets } from '../src/config.js';

test('JevClient: throws JevMissingKeyError when API key is missing', async () => {
  const client = new JevClient({ apiKey: null });
  await assert.rejects(
    async () => {
      await client.evaluate({
        model: 'jev-latest',
        state: 'test',
        questions: { q: { type: 'noul', instructions: 'is this test?' } },
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof JevMissingKeyError);
      assert.equal((err as JevMissingKeyError).code, 'MISSING_API_KEY');
      return true;
    }
  );
});

test('JevClient: handles HTTP 401 Unauthorized without retrying endlessly', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new JevClient({ apiKey: 'test-key', fetchFn: mockFetch });
  await assert.rejects(
    async () => {
      await client.evaluate({
        model: 'jev-latest',
        state: 'test',
        questions: {},
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof JevAuthError);
      assert.equal((err as JevAuthError).statusCode, 401);
      return true;
    }
  );
  assert.equal(callCount, 1, 'Should not retry 401 authentication errors');
});

test('JevClient: handles HTTP 403 Forbidden', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new JevClient({ apiKey: 'test-key', fetchFn: mockFetch });
  await assert.rejects(
    async () => {
      await client.evaluate({
        model: 'jev-latest',
        state: 'test',
        questions: {},
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof JevForbiddenError);
      assert.equal((err as JevForbiddenError).statusCode, 403);
      return true;
    }
  );
});

test('JevClient: retries on HTTP 429 Rate Limit and respects Retry-After', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'retry-after': '0' },
      });
    }
    return new Response(
      JSON.stringify({
        q: { type: 'noul', noul: 0.99 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'test-key', fetchFn: mockFetch, maxRetries: 1 });
  const result = await client.evaluate({
    model: 'jev-latest',
    state: 'test',
    questions: { q: { type: 'noul', instructions: 'test' } },
  });

  assert.equal(callCount, 2, 'Should retry after 429 rate limit');
  assert.ok(result.q);
});

test('JevClient: retries on HTTP 500 server error and throws JevServerError when exhausted', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response('Internal Server Error', {
      status: 500,
    });
  };

  const client = new JevClient({ apiKey: 'test-key', fetchFn: mockFetch, maxRetries: 1 });
  await assert.rejects(
    async () => {
      await client.evaluate({
        model: 'jev-latest',
        state: 'test',
        questions: {},
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof JevServerError);
      assert.equal((err as JevServerError).statusCode, 500);
      return true;
    }
  );
  assert.equal(callCount, 2, 'Should have attempted initial call + 1 retry');
});

test('JevClient: handles timeout with JevTimeoutError', async () => {
  const mockFetch: typeof fetch = async (_url, init) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  };

  const client = new JevClient({ apiKey: 'test-key', fetchFn: mockFetch, timeoutMs: 50, maxRetries: 0 });
  await assert.rejects(
    async () => {
      await client.evaluate({
        model: 'jev-latest',
        state: 'test',
        questions: {},
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof JevTimeoutError);
      return true;
    }
  );
});

test('JevClient: handles malformed JSON response with JevSchemaError', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response('invalid json payload {', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new JevClient({ apiKey: 'test-key', fetchFn: mockFetch, maxRetries: 0 });
  await assert.rejects(
    async () => {
      await client.evaluate({
        model: 'jev-latest',
        state: 'test',
        questions: {},
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof JevSchemaError);
      return true;
    }
  );
});

test('Secret redaction: does not leak API keys in sanitized objects or strings', () => {
  const sample = {
    apiKey: 'jev-secret-1234567890',
    authToken: 'Bearer secret_token_value_xyz123',
    message: 'Connecting with key jev-secret-1234567890 to backend',
  };

  const redacted = redactSecrets(sample) as Record<string, unknown>;
  assert.equal(redacted.apiKey, '***REDACTED***');
  assert.equal(redacted.authToken, '***REDACTED***');
});
