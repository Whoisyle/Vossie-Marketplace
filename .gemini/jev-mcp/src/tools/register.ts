import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { JevClient } from '../client/client.js';
import { routeTask } from '../decisions/router.js';
import { approveAction } from '../decisions/approver.js';
import { validateWork } from '../decisions/validator.js';
import { scoreSubject } from '../decisions/scorer.js';
import { logDiagnostic } from '../config.js';

export function registerJevTools(server: McpServer, client = new JevClient()): void {
  // TOOL 1 — jev_route
  server.tool(
    'jev_route',
    'Choose the most appropriate specialist agent for a task using Jev decision intelligence.',
    {
      task: z.string().describe('The task or user request to route'),
      context: z.any().optional().describe('Contextual information such as repo structure or active files'),
      candidates: z
        .record(z.string())
        .describe('Map of candidate agent names to descriptions of their domain and responsibilities'),
      instructions: z.string().optional().describe('Custom instructions or domain constraints for routing'),
      model: z.string().optional().describe('Optional Jev model override (e.g. jev-latest, jev-router)'),
    },
    async (args) => {
      logDiagnostic('INFO', `Executing tool jev_route for task: "${args.task.slice(0, 80)}..."`);
      try {
        const result = await routeTask(
          {
            task: args.task,
            context: args.context,
            candidates: args.candidates,
            instructions: args.instructions,
            model: args.model,
          },
          client
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        logDiagnostic('ERROR', 'Error in jev_route tool execution', err);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: (err as Error).message,
                selected: Object.keys(args.candidates)[0] || 'supervisor',
                fallback: true,
                jevAvailable: false,
              }),
            },
          ],
        };
      }
    }
  );

  // TOOL 2 — jev_approve
  server.tool(
    'jev_approve',
    'Evaluate whether a proposed high-impact or sensitive action should proceed. Strict FAIL-CLOSED security policy.',
    {
      action: z.string().describe('The proposed action or command to execute'),
      context: z.any().optional().describe('Contextual parameters or details about the operation'),
      risk: z.string().optional().describe('Assessed risk category: low, medium, high, critical'),
      instructions: z.string().optional().describe('Specific safety, security, or architectural constraints'),
      threshold: z.number().optional().describe('Minimum approval confidence required (default: 0.80)'),
      model: z.string().optional().describe('Optional Jev model override'),
    },
    async (args) => {
      logDiagnostic('INFO', `Executing tool jev_approve for action: "${args.action.slice(0, 80)}..."`);
      try {
        const result = await approveAction(
          {
            action: args.action,
            context: args.context,
            risk: args.risk,
            instructions: args.instructions,
            threshold: args.threshold,
            model: args.model,
          },
          client
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        logDiagnostic('ERROR', 'Error in jev_approve tool execution. FAILING CLOSED.', err);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                approved: false,
                confidence: null,
                threshold: args.threshold ?? 0.8,
                reason: `FAIL CLOSED: Approval execution failed: ${(err as Error).message}`,
                jevAvailable: false,
              }),
            },
          ],
        };
      }
    }
  );

  // TOOL 3 — jev_validate
  server.tool(
    'jev_validate',
    'Validate substantial work produced by an agent against acceptance criteria and architectural bounds.',
    {
      task: z.string().describe('The task or objective assigned to the specialist agent'),
      result: z.any().describe('The implementation output, diff, or summary produced'),
      requirements: z.array(z.string()).describe('List of requirements or acceptance criteria to evaluate'),
      threshold: z.number().optional().describe('Minimum confidence threshold required (default: 0.85)'),
      instructions: z.string().optional().describe('Specific architectural rules to verify'),
      model: z.string().optional().describe('Optional Jev model override'),
    },
    async (args) => {
      logDiagnostic('INFO', `Executing tool jev_validate for task: "${args.task.slice(0, 80)}..."`);
      try {
        const result = await validateWork(
          {
            task: args.task,
            result: args.result,
            requirements: args.requirements,
            threshold: args.threshold,
            instructions: args.instructions,
            model: args.model,
          },
          client
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        logDiagnostic('ERROR', 'Error in jev_validate tool execution. FAILING CLOSED.', err);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                valid: false,
                confidence: null,
                threshold: args.threshold ?? 0.85,
                reason: `FAIL CLOSED: Validation execution failed: ${(err as Error).message}`,
                jevAvailable: false,
              }),
            },
          ],
        };
      }
    }
  );

  // TOOL 4 — jev_score
  server.tool(
    'jev_score',
    'Score or compare an implementation against quality, architecture, security, or design criteria.',
    {
      subject: z.any().describe('The implementation, architecture, code, or design to evaluate'),
      criteria: z
        .union([z.array(z.string()), z.record(z.string())])
        .describe('Criteria array or object mapping criteria names to detailed requirements'),
      instructions: z.string().optional().describe('Evaluation guidance'),
      model: z.string().optional().describe('Optional Jev model override'),
    },
    async (args) => {
      logDiagnostic('INFO', 'Executing tool jev_score');
      try {
        const result = await scoreSubject(
          {
            subject: args.subject,
            criteria: args.criteria,
            instructions: args.instructions,
            model: args.model,
          },
          client
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        logDiagnostic('ERROR', 'Error in jev_score tool execution', err);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                scores: {},
                error: (err as Error).message,
                jevAvailable: false,
              }),
            },
          ],
        };
      }
    }
  );

  // TOOL 5 — jev_models
  server.tool(
    'jev_models',
    'Return currently available Jev System One models, capabilities, and aliases.',
    {},
    async () => {
      logDiagnostic('INFO', 'Executing tool jev_models');
      try {
        const models = await client.getModels();
        return {
          content: [{ type: 'text', text: JSON.stringify({ models }, null, 2) }],
        };
      } catch (err: unknown) {
        logDiagnostic('ERROR', 'Error in jev_models tool execution', err);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: (err as Error).message,
                models: [],
              }),
            },
          ],
        };
      }
    }
  );
}
