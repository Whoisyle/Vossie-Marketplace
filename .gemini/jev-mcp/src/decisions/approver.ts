import { config, logDiagnostic } from '../config.js';
import { JevClient } from '../client/client.js';
import type { JevChoiceAnswer } from '../client/types.js';

export interface JevApproveParams {
  action: string;
  context?: Record<string, unknown> | string;
  risk?: string;
  instructions?: string;
  threshold?: number;
  model?: string;
}

export interface JevApproveResult {
  approved: boolean;
  confidence: number | null;
  threshold: number;
  reason?: string;
  jevAvailable: boolean;
  model: string;
  metadata?: Record<string, unknown>;
}

export async function approveAction(
  params: JevApproveParams,
  client = new JevClient()
): Promise<JevApproveResult> {
  const {
    action,
    context,
    risk = 'unspecified',
    instructions,
    threshold = config.approvalThreshold,
    model = config.defaultModel,
  } = params;

  const statePayload = {
    action,
    context: context || null,
    declaredRisk: risk,
  };

  const defaultInstructions =
    instructions ||
    'Evaluate whether this proposed action is safe, bounded, compliant with security and architectural rules, and should be approved to proceed without risking data loss, credential leakage, or broken authentication.';

  try {
    const response = await client.evaluate({
      model,
      state: statePayload,
      questions: {
        approval: {
          type: 'choice',
          instructions: defaultInstructions,
          criteria: {
            approve: 'The action is bounded, legitimate, safe, and meets architectural and security criteria.',
            reject: 'The action is unsafe, destructive, lacks safeguards, risks data loss, or weakens security.',
          },
        },
      },
    });

    const answer = response.approval as JevChoiceAnswer | undefined;
    if (!answer || answer.type !== 'choice') {
      logDiagnostic('ERROR', 'Jev approval returned invalid answer type. Failing closed.');
      return {
        approved: false,
        confidence: null,
        threshold,
        reason: 'FAIL CLOSED: Jev returned an invalid response schema.',
        jevAvailable: true,
        model,
      };
    }

    const choice = answer.choice;
    const confidence = typeof answer.confidence === 'number' ? answer.confidence : null;

    if (choice === 'approve') {
      if (confidence !== null && confidence < threshold) {
        return {
          approved: false,
          confidence,
          threshold,
          reason: `Action rejected: approval confidence (${confidence.toFixed(2)}) is below required threshold (${threshold.toFixed(2)}).`,
          jevAvailable: true,
          model,
          metadata: { probabilities: answer.probabilities },
        };
      }

      return {
        approved: true,
        confidence,
        threshold,
        reason: 'Action approved by Jev decision intelligence.',
        jevAvailable: true,
        model,
        metadata: { probabilities: answer.probabilities },
      };
    } else {
      return {
        approved: false,
        confidence,
        threshold,
        reason: 'Action rejected by Jev decision intelligence: evaluated as unsafe or inappropriate.',
        jevAvailable: true,
        model,
        metadata: { probabilities: answer.probabilities },
      };
    }
  } catch (error: unknown) {
    // STRICT FAIL-CLOSED: Any failure, missing key, network disconnect, or timeout means approval is DENIED
    logDiagnostic('ERROR', 'Jev approval evaluation failed. FAILING CLOSED.', {
      error: (error as Error).message,
    });

    return {
      approved: false,
      confidence: null,
      threshold,
      reason: `FAIL CLOSED: Jev approval gate could not verify safety (${(error as Error).message}). Sensitive execution blocked.`,
      jevAvailable: false,
      model: 'none',
      metadata: {
        rawError: (error as Error).message,
      },
    };
  }
}
