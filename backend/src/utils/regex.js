// Escapes user text before it is turned into a RegExp for Mongo search,
// so inputs like "a.*(" cannot break or abuse the query.
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
