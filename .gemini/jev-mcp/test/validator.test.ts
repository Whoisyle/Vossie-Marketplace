import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWork } from '../src/decisions/validator.js';
import { JevClient } from '../src/client/client.js';

test('validateWork: returns valid: true when choice is pass and confidence >= threshold (0.85)', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        overall_validity: {
          type: 'choice',
          choice: 'pass',
          confidence: 0.95,
          probabilities: { pass: 0.95, fail: 0.05 },
        },
        req_0: {
          type: 'choice',
          choice: 'satisfied',
          confidence: 0.98,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await validateWork(
    {
      task: 'Create student verification hook',
      result: 'export function useStudentVerification() { ... }',
      requirements: ['Must verify Eduvos credentials', 'Must handle token expiration'],
      threshold: 0.85,
    },
    client
  );

  assert.equal(result.valid, true);
  assert.equal(result.confidence, 0.95);
  assert.equal(result.threshold, 0.85);
  assert.equal(result.failedRequirements, undefined);
});

test('validateWork: fails when confidence is below threshold (0.85)', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        overall_validity: {
          type: 'choice',
          choice: 'pass',
          confidence: 0.8, // below 0.85 threshold
          probabilities: { pass: 0.8, fail: 0.2 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await validateWork(
    {
      task: 'Create payment component',
      result: '<PaymentModal />',
      requirements: ['PayFast adapter integration'],
      threshold: 0.85,
    },
    client
  );

  assert.equal(result.valid, false);
  assert.equal(result.confidence, 0.8);
  assert.ok(result.reason?.includes('below threshold'));
});

test('validateWork: identifies failedRequirements returned from Jev', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        overall_validity: {
          type: 'choice',
          choice: 'fail',
          confidence: 0.91,
          probabilities: { pass: 0.09, fail: 0.91 },
        },
        req_0: {
          type: 'choice',
          choice: 'satisfied',
        },
        req_1: {
          type: 'choice',
          choice: 'unmet',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await validateWork(
    {
      task: 'Implement student profile',
      result: 'function Profile() { ... }',
      requirements: ['Must display campus name', 'Must support photo upload'],
    },
    client
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.failedRequirements, ['Must support photo upload']);
});

test('validateWork: FAIL CLOSED on network error', async () => {
  const mockFetch: typeof fetch = async () => {
    throw new Error('Timeout connecting to Jev');
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch, maxRetries: 0 });
  const result = await validateWork(
    {
      task: 'Implement auth route',
      result: 'route.ts',
      requirements: ['Secure session check'],
    },
    client
  );

  assert.equal(result.valid, false);
  assert.equal(result.jevAvailable, false);
  assert.ok(result.reason?.includes('Validation service unavailable'));
});
