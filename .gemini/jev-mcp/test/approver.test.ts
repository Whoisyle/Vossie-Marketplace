import test from 'node:test';
import assert from 'node:assert/strict';
import { approveAction } from '../src/decisions/approver.js';
import { JevClient } from '../src/client/client.js';

test('approveAction: approves when choice is approve and confidence >= threshold (0.80)', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        approval: {
          type: 'choice',
          choice: 'approve',
          confidence: 0.92,
          probabilities: { approve: 0.92, reject: 0.08 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await approveAction(
    {
      action: 'Refactor component styling without changing props',
      threshold: 0.8,
    },
    client
  );

  assert.equal(result.approved, true);
  assert.equal(result.confidence, 0.92);
  assert.equal(result.threshold, 0.8);
  assert.equal(result.jevAvailable, true);
});

test('approveAction: rejects when choice is approve but confidence < threshold (FAIL CLOSED on uncertainty)', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        approval: {
          type: 'choice',
          choice: 'approve',
          confidence: 0.72, // below 0.80 threshold
          probabilities: { approve: 0.72, reject: 0.28 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await approveAction(
    {
      action: 'Modify database migration files',
      threshold: 0.8,
    },
    client
  );

  assert.equal(result.approved, false);
  assert.equal(result.confidence, 0.72);
  assert.ok(result.reason?.includes('below required threshold'));
});

test('approveAction: rejects when choice is reject', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        approval: {
          type: 'choice',
          choice: 'reject',
          confidence: 0.98,
          probabilities: { approve: 0.02, reject: 0.98 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await approveAction(
    {
      action: 'Delete production database tables and skip backups',
    },
    client
  );

  assert.equal(result.approved, false);
  assert.ok(result.reason?.includes('Action rejected by Jev'));
});

test('approveAction: STRICT FAIL-CLOSED on network failure / offline Jev', async () => {
  const mockFetch: typeof fetch = async () => {
    throw new Error('Connection refused');
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch, maxRetries: 0 });
  const result = await approveAction(
    {
      action: 'Remove production authentication endpoints',
    },
    client
  );

  assert.equal(result.approved, false, 'Must fail closed on network error');
  assert.equal(result.confidence, null);
  assert.equal(result.jevAvailable, false);
  assert.ok(result.reason?.includes('FAIL CLOSED'));
});

test('approveAction: STRICT FAIL-CLOSED on missing API key', async () => {
  const client = new JevClient({ apiKey: null });
  const result = await approveAction(
    {
      action: 'Run destructive command',
    },
    client
  );

  assert.equal(result.approved, false, 'Must fail closed on missing API key');
  assert.equal(result.confidence, null);
  assert.equal(result.jevAvailable, false);
  assert.ok(result.reason?.includes('FAIL CLOSED'));
});
