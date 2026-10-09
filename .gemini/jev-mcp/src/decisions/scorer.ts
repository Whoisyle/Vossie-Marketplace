import { config, logDiagnostic } from '../config.js';
import { JevClient } from '../client/client.js';
import type { JevQuestion, JevScoreAnswer } from '../client/types.js';

export interface JevScoreParams {
  subject: Record<string, unknown> | string;
  criteria: string[] | Record<string, string>;
  instructions?: string;
  model?: string;
}

export interface JevScoreResult {
  scores: Record<string, { score: number; confidence?: number; explanation?: string }>;
  overallScore?: number;
  model: string;
  jevAvailable: boolean;
  metadata?: Record<string, unknown>;
  reason?: string;
}

export async function scoreSubject(
  params: JevScoreParams,
  client = new JevClient()
): Promise<JevScoreResult> {
  const { subject, criteria, instructions, model = config.defaultModel } = params;

  const criteriaMap: Record<string, string> = {};
  if (Array.isArray(criteria)) {
    criteria.forEach((c, i) => {
      criteriaMap[`criterion_${i}_${c.replace(/[^a-zA-Z0-9_]/g, '_')}`] = c;
    });
  } else if (typeof criteria === 'object' && criteria !== null) {
    Object.assign(criteriaMap, criteria);
  } else {
    throw new Error('Criteria must be an array of strings or an object mapping names to descriptions.');
  }

  const scoreQuestions: Record<string, JevQuestion> = {};
  for (const [key, desc] of Object.entries(criteriaMap)) {
    scoreQuestions[key] = {
      type: 'score',
      instructions: `${instructions || 'Rate the subject implementation against this criterion on a scale from 0 to 10:'} ${desc}`,
    };
  }

  try {
    const response = await client.evaluate({
      model,
      state: subject,
      questions: scoreQuestions,
    });

    const scores: Record<string, { score: number; confidence?: number; explanation?: string }> = {};
    let totalScore = 0;
    let count = 0;

    for (const [key, desc] of Object.entries(criteriaMap)) {
      const ans = response[key] as JevScoreAnswer | undefined;
      if (ans && ans.type === 'score' && typeof ans.score === 'number') {
        scores[key] = {
          score: ans.score,
          confidence: typeof ans.confidence === 'number' ? ans.confidence : undefined,
          explanation: desc,
        };
        totalScore += ans.score;
        count++;
      }
    }

    const overallScore = count > 0 ? parseFloat((totalScore / count).toFixed(2)) : undefined;

    return {
      scores,
      overallScore,
      model,
      jevAvailable: true,
      metadata: {
        evaluatedCriteriaCount: count,
      },
    };
  } catch (error: unknown) {
    logDiagnostic('WARN', 'Jev scoring service failed or was unavailable.', {
      error: (error as Error).message,
    });

    return {
      scores: {},
      overallScore: undefined,
      model: 'none',
      jevAvailable: false,
      reason: `Jev scoring unavailable: ${(error as Error).message}`,
      metadata: {
        rawError: (error as Error).message,
      },
    };
  }
}
