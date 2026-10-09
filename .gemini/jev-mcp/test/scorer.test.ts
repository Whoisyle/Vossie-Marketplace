import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSubject } from '../src/decisions/scorer.js';
import { JevClient } from '../src/client/client.js';

test('scoreSubject: calculates multi-criteria scores and overall average', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        criterion_0_a11y: {
          type: 'score',
          score: 9.0,
          confidence: 0.95,
        },
        criterion_1_performance: {
          type: 'score',
          score: 8.0,
          confidence: 0.92,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await scoreSubject(
    {
      subject: '<ProductCard /> component',
      criteria: ['a11y', 'performance'],
    },
    client
  );

  assert.equal(result.jevAvailable, true);
  assert.equal(result.overallScore, 8.5);
  assert.equal(result.scores.criterion_0_a11y.score, 9.0);
  assert.equal(result.scores.criterion_1_performance.score, 8.0);
});

test('scoreSubject: handles failure gracefully with jevAvailable: false', async () => {
  const mockFetch: typeof fetch = async () => {
    throw new Error('Jev API offline');
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch, maxRetries: 0 });
  const result = await scoreSubject(
    {
      subject: 'Architecture spec',
      criteria: ['scalability'],
    },
    client
  );

  assert.equal(result.jevAvailable, false);
  assert.equal(result.overallScore, undefined);
  assert.ok(result.reason?.includes('Jev scoring unavailable'));
});
