// Application error class with an HTTP status code and optional field errors.
// Thrown anywhere in controllers/services and mapped to a JSON response by the
// central error handler. Never leak stack traces to clients.
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message, errors = []) {
    return new ApiError(409, message, errors);
  }
}

module.exports = ApiError;
