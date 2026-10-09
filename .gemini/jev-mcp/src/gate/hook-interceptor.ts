import { classifyAction } from './sensitive-actions.js';
import { approveAction } from '../decisions/approver.js';
import { logDiagnostic } from '../config.js';
import { JevClient } from '../client/client.js';

export interface PreToolUsePayload {
  toolCall?: {
    name?: string;
    args?: Record<string, unknown>;
  };
  stepIdx?: number;
  conversationId?: string;
}

export interface HookDecisionResult {
  decision: 'allow' | 'deny' | 'ask' | 'force_ask';
  reason?: string;
  permissionOverrides?: string[];
}

export async function processPreToolUseHook(
  rawInput: string,
  client = new JevClient()
): Promise<HookDecisionResult> {
  let payload: PreToolUsePayload;
  try {
    payload = JSON.parse(rawInput);
  } catch (err: unknown) {
    // If input cannot be parsed, fail closed for security
    return {
      decision: 'deny',
      reason: `Malformed hook payload JSON: ${(err as Error).message}`,
    };
  }

  const toolName = payload.toolCall?.name || '';
  const toolArgs = payload.toolCall?.args || {};

  // For run_command or terminal execution
  const commandLine =
    (typeof toolArgs.CommandLine === 'string' && toolArgs.CommandLine) ||
    (typeof toolArgs.command === 'string' && toolArgs.command) ||
    '';

  // For file modification/deletion tools
  const targetFile =
    (typeof toolArgs.TargetFile === 'string' && toolArgs.TargetFile) ||
    (typeof toolArgs.filePath === 'string' && toolArgs.filePath) ||
    '';

  const actionDescription = commandLine
    ? `command: ${commandLine}`
    : targetFile
    ? `${toolName} on file: ${targetFile}`
    : `tool: ${toolName}`;

  const classification = classifyAction(actionDescription);

  if (!classification.isSensitive) {
    // Normal harmless operation: allow smoothly
    return {
      decision: 'allow',
      reason: classification.reason,
    };
  }

  logDiagnostic('INFO', `Sensitive action intercepted by Jev gate: "${actionDescription}"`, {
    category: classification.category,
    risk: classification.riskLevel,
  });

  // Evaluate through Jev approval decision layer
  const approval = await approveAction(
    {
      action: actionDescription,
      risk: classification.riskLevel,
      context: { toolName, args: toolArgs },
    },
    client
  );

  if (!approval.approved) {
    // FAIL CLOSED: Block execution immediately
    return {
      decision: 'deny',
      reason: approval.reason || 'Blocked by Jev decision gate: Action evaluated as unsafe.',
    };
  }

  // Action passed Jev approval, but high-impact actions MUST still prompt user confirmation!
  return {
    decision: 'ask',
    reason: `Jev approved action (${approval.reason || 'Confidence verified'}). Explicit user confirmation required for safety.`,
  };
}
