import { config, logDiagnostic } from '../config.js';
import { JevClient } from '../client/client.js';
import type { JevChoiceAnswer, JevQuestion } from '../client/types.js';

export interface JevValidateParams {
  task: string;
  result: Record<string, unknown> | string;
  requirements: string[];
  threshold?: number;
  model?: string;
  instructions?: string;
}

export interface JevValidateResult {
  valid: boolean;
  confidence: number | null;
  threshold: number;
  failedRequirements?: string[];
  reason?: string;
  jevAvailable: boolean;
  model: string;
  metadata?: Record<string, unknown>;
}

export async function validateWork(
  params: JevValidateParams,
  client = new JevClient()
): Promise<JevValidateResult> {
  const {
    task,
    result,
    requirements,
    threshold = config.validationThreshold,
    model = config.defaultModel,
    instructions,
  } = params;

  const statePayload = {
    task,
    implementationResult: result,
    requirements,
  };

  const validationQuestions: Record<string, JevQuestion> = {
    overall_validity: {
      type: 'choice',
      instructions:
        instructions ||
        'Evaluate whether the implementation thoroughly satisfies the task and all stated requirements with high quality and no obvious defects.',
      criteria: {
        pass: 'All requirements are met, code/output is high quality, and no regressions or broken boundaries exist.',
        fail: 'One or more requirements are missing, incomplete, broken, or violate architectural constraints.',
      },
    },
  };

  // If discrete requirements are provided, evaluate each individually so we can derive failedRequirements legitimately from Jev
  if (Array.isArray(requirements) && requirements.length > 0 && requirements.length <= 10) {
    requirements.forEach((req, idx) => {
      validationQuestions[`req_${idx}`] = {
        type: 'choice',
        instructions: `Does the implementation satisfy the requirement: "${req}"?`,
        criteria: {
          satisfied: `The requirement "${req}" is fully satisfied by the implementation.`,
          unmet: `The requirement "${req}" is not satisfied, partially missing, or defective.`,
        },
      };
    });
  }

  try {
    const response = await client.evaluate({
      model,
      state: statePayload,
      questions: validationQuestions,
    });

    const overall = response.overall_validity as JevChoiceAnswer | undefined;
    if (!overall || overall.type !== 'choice') {
      logDiagnostic('ERROR', 'Malformed overall validity response from Jev. Failing validation.');
      return {
        valid: false,
        confidence: null,
        threshold,
        reason: 'Malformed response from Jev validation endpoint.',
        jevAvailable: true,
        model,
      };
    }

    const choice = overall.choice;
    const confidence = typeof overall.confidence === 'number' ? overall.confidence : null;

    // Collect failed requirements if explicitly flagged by Jev
    const failedRequirements: string[] = [];
    if (Array.isArray(requirements)) {
      requirements.forEach((req, idx) => {
        const itemAns = response[`req_${idx}`] as JevChoiceAnswer | undefined;
        if (itemAns && itemAns.choice === 'unmet') {
          failedRequirements.push(req);
        }
      });
    }

    if (choice === 'pass') {
      if (confidence !== null && confidence < threshold) {
        return {
          valid: false,
          confidence,
          threshold,
          failedRequirements: failedRequirements.length > 0 ? failedRequirements : undefined,
          reason: `Validation failed: confidence (${confidence.toFixed(2)}) is below threshold (${threshold.toFixed(2)}).`,
          jevAvailable: true,
          model,
          metadata: { probabilities: overall.probabilities },
        };
      }

      // If any individual requirement was flagged unmet by Jev, fail even if overall passed
      if (failedRequirements.length > 0) {
        return {
          valid: false,
          confidence,
          threshold,
          failedRequirements,
          reason: `Validation failed: Jev identified ${failedRequirements.length} unmet requirement(s).`,
          jevAvailable: true,
          model,
          metadata: { probabilities: overall.probabilities },
        };
      }

      return {
        valid: true,
        confidence,
        threshold,
        reason: 'All requirements validated and passed by Jev decision intelligence.',
        jevAvailable: true,
        model,
        metadata: { probabilities: overall.probabilities },
      };
    } else {
      return {
        valid: false,
        confidence,
        threshold,
        failedRequirements: failedRequirements.length > 0 ? failedRequirements : undefined,
        reason: 'Validation failed: Jev evaluated implementation as incomplete or defective.',
        jevAvailable: true,
        model,
        metadata: { probabilities: overall.probabilities },
      };
    }
  } catch (error: unknown) {
    // FAIL CLOSED on validation errors
    logDiagnostic('ERROR', 'Jev validation service failed. Failing closed.', {
      error: (error as Error).message,
    });

    return {
      valid: false,
      confidence: null,
      threshold,
      reason: `Validation service unavailable (${(error as Error).message}). Validation rejected until service recovers or manual verification is conducted.`,
      jevAvailable: false,
      model: 'none',
      metadata: {
        rawError: (error as Error).message,
      },
    };
  }
}
