const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'premium_resize_secret_key_2026';

function verifyToken(req, res, next) {
  const token = req.headers['authorization'] || req.headers['x-access-token'];
  
  if (!token) {
    return res.status(403).json({ error: 'No token provided.' });
  }

  try {
    // Check if format is "Bearer <token>"
    const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    const decoded = jwt.verify(tokenString, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Require Administrator Role.' });
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized! Invalid or expired token.' });
  }
}

module.exports = {
  verifyToken,
  JWT_SECRET
};
