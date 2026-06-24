// In-memory rate limiter to prevent database flooding and brute-force
const rateLimit = {};

function rateLimiter(limitCount = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimit[ip]) {
      rateLimit[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    const record = rateLimit[ip];

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count++;
    if (record.count > limitCount) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}

module.exports = rateLimiter;
