import { config, logDiagnostic } from '../config.js';
import { JevClient } from '../client/client.js';
import type { JevChoiceAnswer } from '../client/types.js';

export interface JevRouteParams {
  task: string;
  context?: Record<string, unknown> | string;
  candidates: Record<string, string>;
  instructions?: string;
  model?: string;
}

export interface JevRouteResult {
  selected: string;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  model: string;
  lowConfidence: boolean;
  threshold: number;
  jevAvailable: boolean;
  fallback: boolean;
  metadata?: Record<string, unknown>;
  reason?: string;
}

export async function routeTask(
  params: JevRouteParams,
  client = new JevClient()
): Promise<JevRouteResult> {
  const { task, context, candidates, instructions, model = config.defaultModel } = params;

  if (!candidates || Object.keys(candidates).length === 0) {
    throw new Error('At least one candidate agent must be provided to jev_route.');
  }

  const candidateKeys = Object.keys(candidates);
  if (candidateKeys.length === 1) {
    return {
      selected: candidateKeys[0],
      confidence: 1.0,
      probabilities: { [candidateKeys[0]]: 1.0 },
      model,
      lowConfidence: false,
      threshold: config.routingConfidenceThreshold,
      jevAvailable: true,
      fallback: false,
      metadata: { note: 'Single candidate provided; routing is deterministic.' },
    };
  }

  const statePayload = {
    task,
    context: context || null,
  };

  const routingInstructions =
    instructions ||
    'Evaluate the task and context carefully. Select the most qualified and appropriate specialist agent capable of completing the task while respecting architectural boundaries.';

  try {
    const response = await client.evaluate({
      model,
      state: statePayload,
      questions: {
        routing: {
          type: 'choice',
          instructions: routingInstructions,
          criteria: candidates,
        },
      },
    });

    const answer = response.routing as JevChoiceAnswer | undefined;
    if (!answer || answer.type !== 'choice' || !answer.choice) {
      throw new Error('Malformed routing answer received from Jev API.');
    }

    const selected = answer.choice;
    const confidence = typeof answer.confidence === 'number' ? answer.confidence : null;
    const probabilities = answer.probabilities || null;
    const lowConfidence = confidence !== null && confidence < config.routingConfidenceThreshold;

    return {
      selected,
      confidence,
      probabilities,
      model,
      lowConfidence,
      threshold: config.routingConfidenceThreshold,
      jevAvailable: true,
      fallback: false,
      metadata: {
        candidatesCount: candidateKeys.length,
      },
    };
  } catch (error: unknown) {
    logDiagnostic('WARN', 'Jev routing API unavailable or failed. Using conservative fallback.', {
      error: (error as Error).message,
    });

    // Conservative heuristic fallback for non-sensitive task routing
    const fallbackAgent = computeConservativeFallback(task, candidates);
    return {
      selected: fallbackAgent,
      confidence: null,
      probabilities: null,
      model: 'fallback-heuristics',
      lowConfidence: true,
      threshold: config.routingConfidenceThreshold,
      jevAvailable: false,
      fallback: true,
      reason: `Jev decision service unavailable (${(error as Error).message}). Applied conservative heuristic routing.`,
      metadata: {
        rawError: (error as Error).message,
      },
    };
  }
}

/**
 * Heuristic routing matcher when Jev service is unreachable.
 * Prioritizes authentication, security, and exact domain keywords.
 */
function computeConservativeFallback(task: string, candidates: Record<string, string>): string {
  const normalized = task.toLowerCase();
  const keys = Object.keys(candidates);

  // High priority security/auth match
  if (/\b(auth|login|sso|microsoft|eduvos|oauth|oidc|jwt|session|token)\b/.test(normalized)) {
    const match = keys.find(k => /auth|security/i.test(k));
    if (match) return match;
  }

  if (/\b(security|vulnerability|rbac|permission|attack|cve|leak)\b/.test(normalized)) {
    const match = keys.find(k => /security|guardian/i.test(k));
    if (match) return match;
  }

  // Database / Schema match
  if (/\b(database|migration|schema|table|sql|prisma|supabase|postgres|entity)\b/.test(normalized)) {
    const match = keys.find(k => /schema|data|backend/i.test(k));
    if (match) return match;
  }

  // UI / Frontend match
  if (/\b(ui|component|css|tailwind|screen|page|responsive|view|mobile|card|dialog|modal)\b/.test(normalized)) {
    const match = keys.find(k => /frontend|ui|pixel/i.test(k));
    if (match) return match;
  }

  // Marketplace domain match
  if (/\b(marketplace|listing|cart|order|buyer|seller|booking|reels|storefront)\b/.test(normalized)) {
    const match = keys.find(k => /market/i.test(k));
    if (match) return match;
  }

  // Logistics / Courier match
  if (/\b(courier|delivery|tracking|logistics|manifest|hub|qr|otp)\b/.test(normalized)) {
    const match = keys.find(k => /relay|courier|logistics/i.test(k));
    if (match) return match;
  }

  // QA / Test match
  if (/\b(test|qa|playwright|jest|vitest|e2e|coverage|regression)\b/.test(normalized)) {
    const match = keys.find(k => /qa|probe|test/i.test(k));
    if (match) return match;
  }

  // Default to supervisor or first candidate
  const supervisor = keys.find(k => /supervisor|atlas/i.test(k));
  return supervisor || keys[0];
}
