// CSV helpers. json2csv v5 is CommonJS-friendly ({ Parser }).
const { Parser } = require('json2csv');

// CSV formula-injection guard: spreadsheet apps execute cells that start with
// =, +, - or @. Prefixing them with ' renders them harmless.
function csvSafe(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function toCsv(fields, rows) {
  return new Parser({ fields }).parse(rows);
}

module.exports = { csvSafe, toCsv };
