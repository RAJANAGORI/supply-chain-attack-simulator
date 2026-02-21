module.exports = {
  trim: (s) => (typeof s === 'string' ? s.trim() : s),
  normalizeWhitespace: (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s)
};

