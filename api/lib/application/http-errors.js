class BaseHttpError extends Error {
  constructor(message) {
    super(message);
    this.title = 'Default Bad Request';
    this.status = 400;
  }
}

class UnprocessableEntityError extends BaseHttpError {
  constructor(message) {
    super(message);
    this.title = 'Unprocessable entity';
    this.status = 422;
  }
}

class PreconditionFailedError extends BaseHttpError {
  constructor(message, title) {
    super(message);
    this.title = title || 'Precondition Failed';
    this.status = 412;
  }
}

class ConflictError extends BaseHttpError {
  constructor(message = 'Conflict between request and server state.', code, meta) {
    super(message);
    this.code = code;
    this.meta = meta;
    this.title = 'Conflict';
    this.status = 409;
  }
}

class MissingQueryParamError extends BaseHttpError {
  constructor(missingParamName) {
    const message = `Missing ${missingParamName} query parameter.`;
    super(message);
    this.title = 'Missing Query Parameter';
    this.status = 400;
  }
}

class NotFoundError extends BaseHttpError {
  constructor(message, title) {
    super(message);
    this.title = title || 'Not Found';
    this.status = 404;
  }
}

class UnauthorizedError extends BaseHttpError {
  constructor(message) {
    super(message);
    this.title = 'Unauthorized';
    this.status = 401;
  }
}

class PasswordShouldChangeError extends BaseHttpError {
  constructor(message) {
    super(message);
    this.title = 'PasswordShouldChange';
    this.status = 401;
  }
}

class ForbiddenError extends BaseHttpError {
  constructor(message) {
    super(message);
    this.title = 'Forbidden';
    this.status = 403;
  }
}

class ImproveCompetenceEvaluationForbiddenError extends BaseHttpError {
  constructor(message) {
    super(message);
    this.title = 'ImproveCompetenceEvaluationForbidden';
    this.status = 403;
  }
}

class BadRequestError extends BaseHttpError {
  constructor(message) {
    super(message);
    this.title = 'Bad Request';
    this.status = 400;
  }
}

module.exports = {
  BadRequestError,
  BaseHttpError,
  ConflictError,
  ForbiddenError,
  ImproveCompetenceEvaluationForbiddenError,
  MissingQueryParamError,
  NotFoundError,
  PasswordShouldChangeError,
  PreconditionFailedError,
  UnauthorizedError,
  UnprocessableEntityError,
};
