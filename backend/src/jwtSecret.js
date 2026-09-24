// Tokens are signed and verified with this secret. There is deliberately no fallback:
// a missing JWT_SECRET stops the server instead of accepting tokens anyone could forge.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to backend/.env (or the host environment) before starting the server.');
}

module.exports = { JWT_SECRET };
