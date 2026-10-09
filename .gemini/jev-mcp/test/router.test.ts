import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTask } from '../src/decisions/router.js';
import { JevClient } from '../src/client/client.js';

test('routeTask: correctly parses Jev choice response and returns confidence', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        routing: {
          type: 'choice',
          choice: 'frontend_ui',
          confidence: 0.94,
          probabilities: { frontend_ui: 0.94, backend: 0.06 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await routeTask(
    {
      task: 'Build responsive product cards in Tailwind CSS',
      candidates: {
        frontend_ui: 'Frontend and UI components',
        backend: 'Backend APIs and databases',
      },
    },
    client
  );

  assert.equal(result.selected, 'frontend_ui');
  assert.equal(result.confidence, 0.94);
  assert.equal(result.lowConfidence, false);
  assert.equal(result.jevAvailable, true);
  assert.equal(result.fallback, false);
});

test('routeTask: flags lowConfidence when score is below threshold', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        routing: {
          type: 'choice',
          choice: 'backend',
          confidence: 0.55, // below 0.65 threshold
          probabilities: { backend: 0.55, frontend_ui: 0.45 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await routeTask(
    {
      task: 'Ambiguous sync task across client and server',
      candidates: {
        frontend_ui: 'Frontend components',
        backend: 'Backend API',
      },
    },
    client
  );

  assert.equal(result.selected, 'backend');
  assert.equal(result.confidence, 0.55);
  assert.equal(result.lowConfidence, true);
});

test('routeTask: falls back safely to conservative heuristics when Jev is unavailable', async () => {
  const mockFetch: typeof fetch = async () => {
    throw new Error('Connection refused');
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch, maxRetries: 0 });
  const result = await routeTask(
    {
      task: 'Configure Microsoft SSO authentication and token validation',
      candidates: {
        frontend_ui: 'UI implementation',
        authentication: 'SSO and OAuth login',
        marketplace: 'Catalog listings',
      },
    },
    client
  );

  assert.equal(result.selected, 'authentication');
  assert.equal(result.jevAvailable, false);
  assert.equal(result.fallback, true);
  assert.equal(result.confidence, null);
  assert.ok(result.reason?.includes('Jev decision service unavailable'));
});
