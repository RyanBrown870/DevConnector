const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorisation denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret')); // verify takes the token and the jwtSecret
    req.user = decoded.user; // want to set req.user to decoded value so can use in all our routes
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
