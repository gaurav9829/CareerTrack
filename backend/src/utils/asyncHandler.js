// Wraps async route handlers so rejected promises reach the central error
// handler instead of hanging the request (Express 4 does not catch async errors).
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
