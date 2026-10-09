import test from 'node:test';
import assert from 'node:assert/strict';
import { processPreToolUseHook } from '../src/gate/hook-interceptor.js';
import { classifyAction } from '../src/gate/sensitive-actions.js';
import { JevClient } from '../src/client/client.js';

test('classifyAction: correctly flags harmless vs destructive operations', () => {
  // Harmless
  assert.equal(classifyAction('git status').isSensitive, false);
  assert.equal(classifyAction('npm test').isSensitive, false);
  assert.equal(classifyAction('npm run lint').isSensitive, false);
  assert.equal(classifyAction('Get-ChildItem -Recurse').isSensitive, false);

  // Destructive / Sensitive
  assert.equal(classifyAction('rm -rf src/auth').isSensitive, true);
  assert.equal(classifyAction('Remove-Item -Recurse node_modules').isSensitive, true);
  assert.equal(classifyAction('git reset --hard HEAD~1').isSensitive, true);
  assert.equal(classifyAction('git push origin main --force').isSensitive, true);
  assert.equal(classifyAction('supabase db reset').isSensitive, true);
  assert.equal(classifyAction('npm publish').isSensitive, true);
});

test('processPreToolUseHook: seamlessly allows harmless commands without blocking', async () => {
  const payload = JSON.stringify({
    toolCall: {
      name: 'run_command',
      args: { CommandLine: 'npm test' },
    },
  });

  const res = await processPreToolUseHook(payload);
  assert.equal(res.decision, 'allow');
});

test('processPreToolUseHook: prompts user confirmation (ask) when sensitive command is approved by Jev', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        approval: {
          type: 'choice',
          choice: 'approve',
          confidence: 0.95,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const payload = JSON.stringify({
    toolCall: {
      name: 'run_command',
      args: { CommandLine: 'Remove-Item -Recurse build-temp' },
    },
  });

  const res = await processPreToolUseHook(payload, client);
  assert.equal(res.decision, 'ask', 'Even approved sensitive actions must require user confirmation');
});

test('processPreToolUseHook: denies (FAIL CLOSED) sensitive command when Jev rejects or fails', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        approval: {
          type: 'choice',
          choice: 'reject',
          confidence: 0.99,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const payload = JSON.stringify({
    toolCall: {
      name: 'run_command',
      args: { CommandLine: 'git reset --hard' },
    },
  });

  const res = await processPreToolUseHook(payload, client);
  assert.equal(res.decision, 'deny');
});
