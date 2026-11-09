// Rebuilds req.body as plain JSON-safe objects. Needed in two places:
// 1. after express-mongo-sanitize, which leaves null-prototype objects behind;
// 2. after multer (v2 stores multipart bodies as null-prototype objects too).
// Null-prototype objects crash express-validator's string sanitizers
// (String(Object.create(null)) throws), turning a clean 400 into a 500.
module.exports = function normalizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    try {
      req.body = JSON.parse(JSON.stringify(req.body));
    } catch {
      // non-serializable body - leave it untouched
    }
  }
  next();
};
