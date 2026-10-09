import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTask } from '../src/decisions/router.js';
import { approveAction } from '../src/decisions/approver.js';
import { validateWork } from '../src/decisions/validator.js';
import { JevClient } from '../src/client/client.js';

// Standard 9 specialist candidates as required in Phase 5
const VOSSIE_CANDIDATES = {
  supervisor: 'Orchestration, decomposition, routing, escalation, cross-domain coordination',
  architecture: 'Application architecture, dependency boundaries, shared packages, scalability',
  frontend_ui: 'Design system, components, responsive UI (mobile, tablet, desktop), animations, accessibility',
  backend: 'APIs, databases, persistence, business logic, queues, server services, integrations',
  authentication: 'Eduvos/Microsoft authentication, OAuth/OIDC, account verification, sessions, roles, RBAC',
  marketplace: 'Buyer/Seller workflows, courier workflows, listings, orders, payments abstractions, tracking',
  operations: 'Vossie Operations application, campus hub, transfers, incubation, staff workflows, dashboards',
  security: 'Threat modelling, secure architecture, secrets, authorization boundaries, input validation',
  qa: 'Unit tests, integration tests, E2E tests, regression, performance validation, acceptance criteria',
};

test('INTEGRATION TEST A: Route Microsoft/Eduvos SSO to authentication', async () => {
  const task = 'Implement Microsoft/Eduvos SSO with secure student and role verification.';

  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        routing: {
          type: 'choice',
          choice: 'authentication',
          confidence: 0.96,
          probabilities: { authentication: 0.96, security: 0.03, backend: 0.01 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await routeTask({ task, candidates: VOSSIE_CANDIDATES }, client);

  assert.equal(result.selected, 'authentication');
  assert.ok(result.confidence !== null && result.confidence >= 0.8);
  assert.equal(result.lowConfidence, false);
});

test('INTEGRATION TEST B: Route Marketplace mobile product cards to frontend_ui or marketplace', async () => {
  const task = 'Improve Marketplace mobile product cards and interaction animations.';

  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        routing: {
          type: 'choice',
          choice: 'frontend_ui',
          confidence: 0.92,
          probabilities: { frontend_ui: 0.92, marketplace: 0.08 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await routeTask({ task, candidates: VOSSIE_CANDIDATES }, client);

  assert.ok(result.selected === 'frontend_ui' || result.selected === 'marketplace');
  assert.ok(result.confidence !== null && result.confidence >= 0.8);
});

test('INTEGRATION TEST C: Route order persistence API and DB model to backend or architecture', async () => {
  const task = 'Create an order persistence API and database model.';

  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        routing: {
          type: 'choice',
          choice: 'backend',
          confidence: 0.94,
          probabilities: { backend: 0.94, architecture: 0.06 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await routeTask({ task, candidates: VOSSIE_CANDIDATES }, client);

  assert.ok(result.selected === 'backend' || result.selected === 'architecture');
  assert.ok(result.confidence !== null && result.confidence >= 0.8);
});

test('INTEGRATION TEST D: Route authorization review between Buyer/Seller/Courier to security/authentication', async () => {
  const task = 'Review authorization boundaries between Buyer, Seller, Courier and Operations staff.';

  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        routing: {
          type: 'choice',
          choice: 'security',
          confidence: 0.91,
          probabilities: { security: 0.91, authentication: 0.09 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await routeTask({ task, candidates: VOSSIE_CANDIDATES }, client);

  assert.ok(result.selected === 'security' || result.selected === 'authentication');
  assert.ok(result.confidence !== null && result.confidence >= 0.8);
});

test('INTEGRATION TEST E (DESTRUCTIVE): Delete existing auth triggers high-risk gating and fails closed if rejected', async () => {
  const action = 'Delete the existing authentication implementation and replace it entirely.';

  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        approval: {
          type: 'choice',
          choice: 'reject',
          confidence: 0.99,
          probabilities: { approve: 0.01, reject: 0.99 },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });
  const result = await approveAction({ action, risk: 'critical' }, client);

  // Must fail closed and deny deletion
  assert.equal(result.approved, false);
  assert.ok(result.reason?.includes('Action rejected by Jev'));
});

test('VALIDATION & RETRY LOOP: max 2 retries then escalate to supervisor', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({
        overall_validity: {
          type: 'choice',
          choice: 'fail',
          confidence: 0.92,
        },
        req_0: {
          type: 'choice',
          choice: 'unmet',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new JevClient({ apiKey: 'mock-key', fetchFn: mockFetch });

  // Simulate Phase 9 validation loop
  const maxRetries = 2;
  let attempt = 0;
  let validationPassed = false;
  let escalated = false;

  while (attempt <= maxRetries) {
    const val = await validateWork(
      {
        task: 'Implement auth session timeout',
        result: 'attempt ' + attempt,
        requirements: ['Must revoke token on idle for 15 minutes'],
      },
      client
    );

    if (val.valid) {
      validationPassed = true;
      break;
    }

    attempt++;
    if (attempt > maxRetries) {
      escalated = true;
      break;
    }
  }

  assert.equal(validationPassed, false);
  assert.equal(escalated, true, 'Must escalate after exactly 2 failed retries');
  assert.equal(callCount, 3, 'Initial run + 2 retries = 3 calls before escalation');
});
