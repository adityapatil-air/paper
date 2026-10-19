const { APC } = require('./config/paymentAccount');

// The article processing charge (INR) the admin sets when accepting a paper, stored in papers.submission_fee.
const parseFee = (value) => {
  const raw = value === undefined || value === null || value === '' ? APC.INR : Number(value);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1000000) return { error: 'Enter a valid fee amount in INR.' };
  return { amount: Math.round(raw * 100) / 100 };
};

const formatFee = (amount) => `INR ${Number(amount).toLocaleString('en-IN')}`;

module.exports = { parseFee, formatFee };
