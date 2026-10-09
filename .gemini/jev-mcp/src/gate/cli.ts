#!/usr/bin/env node
import { processPreToolUseHook } from './hook-interceptor.js';

async function main() {
  let rawInput = '';
  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    rawInput += chunk;
  }

  if (!rawInput.trim()) {
    process.stdout.write(JSON.stringify({ decision: 'allow', reason: 'Empty hook payload' }));
    return;
  }

  const result = await processPreToolUseHook(rawInput);
  process.stdout.write(JSON.stringify(result));
}

main().catch(err => {
  // Always fail closed on uncaught hook exceptions
  process.stdout.write(
    JSON.stringify({
      decision: 'deny',
      reason: `Jev hook fatal error: ${err?.message || 'Unknown error'}`,
    })
  );
  process.exit(0);
});
