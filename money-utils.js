'use strict';

// Parse a user-supplied dollar amount into integer cents using string rules,
// never floating-point comparison. "8.20", "8.2", 8.2 and "8" are valid;
// "8.205", "1e3", "-1", "NaN" and "" are not.
function parseCents(value, { allowZero = false, max = 999999999 } = {}) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const text = String(value).trim().replace(/^\$\s*/, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (cents > max || (!allowZero && cents <= 0)) return null;
  return cents;
}

const formatCents = cents => (cents / 100).toFixed(2);

module.exports = { parseCents, formatCents };
