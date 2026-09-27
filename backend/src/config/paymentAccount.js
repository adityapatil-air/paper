// Where authors send the article processing charge (single source: the frontend reads it
// from GET /api/payments/key, and the acceptance email includes it). Payments are checked by
// hand: the author uploads proof and an admin verifies it before publishing.
const PAYMENT_ACCOUNT = {
  accountName: 'BUILDSOFTTECH PUBLICATION',
  accountNumber: '018002100000736',
  bankName: 'VISHWESHWAR SAHAKARI BANK',
  ifsc: 'VSBL0000018',
  upiId: '8149844901@ibl',
};

const APC = {
  INR: Number(process.env.APC_INR || 1500),
  USD: Number(process.env.APC_USD || 50),
};

module.exports = { PAYMENT_ACCOUNT, APC };
