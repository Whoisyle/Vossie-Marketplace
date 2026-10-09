export class JevError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(message: string, code: string, statusCode?: number, retryable = false) {
    super(message);
    this.name = 'JevError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

export class JevMissingKeyError extends JevError {
  constructor(message = 'JEV_API_KEY environment variable is missing or empty.') {
    super(message, 'MISSING_API_KEY', undefined, false);
    this.name = 'JevMissingKeyError';
  }
}

export class JevAuthError extends JevError {
  constructor(message = 'Jev authentication failed (HTTP 401). Invalid or revoked API key.', statusCode = 401) {
    super(message, 'AUTHENTICATION_FAILED', statusCode, false);
    this.name = 'JevAuthError';
  }
}

export class JevForbiddenError extends JevError {
  constructor(message = 'Jev access forbidden (HTTP 403). Insufficient permissions or quota expired.', statusCode = 403) {
    super(message, 'FORBIDDEN', statusCode, false);
    this.name = 'JevForbiddenError';
  }
}

export class JevNotFoundError extends JevError {
  constructor(message = 'Requested Jev resource or endpoint not found (HTTP 404).', statusCode = 404) {
    super(message, 'NOT_FOUND', statusCode, false);
    this.name = 'JevNotFoundError';
  }
}

export class JevBadRequestError extends JevError {
  constructor(message: string, statusCode = 400) {
    super(message, 'BAD_REQUEST', statusCode, false);
    this.name = 'JevBadRequestError';
  }
}

export class JevUnprocessableEntityError extends JevError {
  constructor(message: string, statusCode = 422) {
    super(message, 'UNPROCESSABLE_ENTITY', statusCode, false);
    this.name = 'JevUnprocessableEntityError';
  }
}

export class JevRateLimitError extends JevError {
  public readonly retryAfterMs?: number;

  constructor(message = 'Jev API rate limit exceeded (HTTP 429).', retryAfterMs?: number) {
    super(message, 'RATE_LIMITED', 429, true);
    this.name = 'JevRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class JevServerError extends JevError {
  constructor(message: string, statusCode = 500) {
    super(message, 'SERVER_ERROR', statusCode, true);
    this.name = 'JevServerError';
  }
}

export class JevTimeoutError extends JevError {
  constructor(message = 'Jev API request timed out.') {
    super(message, 'TIMEOUT', undefined, true);
    this.name = 'JevTimeoutError';
  }
}

export class JevNetworkError extends JevError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', undefined, true);
    this.name = 'JevNetworkError';
  }
}

export class JevSchemaError extends JevError {
  constructor(message: string) {
    super(message, 'SCHEMA_ERROR', undefined, false);
    this.name = 'JevSchemaError';
  }
}
