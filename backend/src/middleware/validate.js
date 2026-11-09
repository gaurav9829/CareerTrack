// Shared express-validator runner. Routes pass an array of rule chains;
// validate(rules) spreads them and appends a checker that converts any
// validation failure into the standard 400 JSON error shape.
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    next(ApiError.badRequest('Validation failed', errors));
  },
];

module.exports = { validate };
