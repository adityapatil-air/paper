// Fixed-window request limiter kept in memory. It is per process, which suits the single
// Node instance this API runs as; use a shared store (e.g. Redis) if it ever runs on several.
const rateLimit = ({ windowMs, max, key, message }) => {
  const hits = new Map();

  // Drop expired windows so the map does not grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(k);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: message, code: 'RATE_LIMITED' });
    }
    return next();
  };
};

module.exports = { rateLimit };
